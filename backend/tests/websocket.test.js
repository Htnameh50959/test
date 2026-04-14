// =============================================================================
// WEBSOCKET INTEGRATION TESTS  (backend/tests/websocket.test.js)
// =============================================================================
// End-to-end integration tests for all Socket.io events.
// Tests run against a real HTTP + Socket.io server booted in-process.
//
// Run with:  npm test
// =============================================================================

const http = require('http');
const { Server } = require('socket.io');
const { io: ClientIO } = require('socket.io-client');
const jwt = require('jsonwebtoken');

// ---------------------------------------------------------------------------
// TEST CONFIG
// ---------------------------------------------------------------------------
const TEST_JWT_SECRET = 'test_secret_for_jest_only';
const TEST_PORT = 5099; // separate port so tests never conflict with dev server

// ---------------------------------------------------------------------------
// TEST HELPERS
// ---------------------------------------------------------------------------

/**
 * Generate a signed JWT identical in shape to the production token.
 * @param {{ userId?: string, role?: string }} overrides
 */
const generateTestToken = (overrides = {}) => {
  const payload = {
    userId: overrides.userId || '507f1f77bcf86cd799439011',
    role: overrides.role || 'customer',
  };
  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '1h' });
};

/**
 * Build a Socket.io client connected to the test server.
 * @param {string} token - JWT auth token
 * @param {object} [opts]  - Extra socket options
 */
const buildClient = (token, opts = {}) =>
  ClientIO(`http://localhost:${TEST_PORT}`, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: false,
    ...opts,
  });

/**
 * Promisified wrapper: wait for a single event from a socket.
 * Rejects after `timeout` ms.
 */
const waitForEvent = (socket, event, timeout = 3000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeout);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

// ---------------------------------------------------------------------------
// TEST SERVER SETUP
// ---------------------------------------------------------------------------

let httpServer;
let ioServer;

/**
 * Lightweight in-process Socket.io server that mirrors the auth + events
 * from src/services/socket.js but uses a mock User lookup so no DB is needed.
 */
function createTestServer() {
  httpServer = http.createServer();
  ioServer = new Server(httpServer, { transports: ['websocket'] });

  // Mock Auth Middleware — validates JWT, no DB call
  ioServer.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication token required'));

      const decoded = jwt.verify(token, TEST_JWT_SECRET);
      socket.userId   = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Authentication failed: ' + err.message));
    }
  });

  // Import schemas and validation (real code, no mocks)
  const { CLIENT_EVENTS, SERVER_EVENTS } = require('../src/config/events');
  const socketSchemas = require('../src/utils/socketSchemas');
  const { validateEvent, requireRole } = require('../src/middleware/socketValidation');

  ioServer.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    socket.join(`role:${socket.userRole}`);

    // Heartbeat
    socket.on(CLIENT_EVENTS.PONG, () => { socket.lastPong = Date.now(); });

    // subscribe:order
    socket.on(
      CLIENT_EVENTS.SUBSCRIBE_ORDER,
      validateEvent(CLIENT_EVENTS.SUBSCRIBE_ORDER, socketSchemas.subscribeOrder)(
        (payload, callback) => {
          socket.join(`order:${payload.orderId}`);
          callback({ success: true, data: { orderId: payload.orderId } });
          socket.emit(SERVER_EVENTS.SUBSCRIBED, { orderId: payload.orderId });
        }
      )
    );

    // unsubscribe:order
    socket.on(
      CLIENT_EVENTS.UNSUBSCRIBE_ORDER,
      validateEvent(CLIENT_EVENTS.UNSUBSCRIBE_ORDER, socketSchemas.unsubscribeOrder)(
        (payload, callback) => {
          socket.leave(`order:${payload.orderId}`);
          callback({ success: true, data: { orderId: payload.orderId } });
          socket.emit(SERVER_EVENTS.UNSUBSCRIBED, { orderId: payload.orderId });
        }
      )
    );

    // update:order-status
    socket.on(
      CLIENT_EVENTS.UPDATE_ORDER_STATUS,
      requireRole('merchant', 'admin')(
        validateEvent(CLIENT_EVENTS.UPDATE_ORDER_STATUS, socketSchemas.updateOrderStatus)(
          (payload, callback) => {
            ioServer.to(`order:${payload.orderId}`).emit(SERVER_EVENTS.ORDER_STATUS, {
              orderId: payload.orderId,
              status: payload.status,
              timestamp: new Date(),
              metadata: { updatedBy: socket.userId },
            });
            callback({ success: true });
          }
        )
      )
    );

    // courier:location-update
    socket.on(
      CLIENT_EVENTS.COURIER_LOCATION_UPDATE,
      requireRole('courier')(
        validateEvent(CLIENT_EVENTS.COURIER_LOCATION_UPDATE, socketSchemas.courierLocationUpdate)(
          (payload, callback) => {
            if (payload.orderId) {
              ioServer.to(`order:${payload.orderId}`).emit(SERVER_EVENTS.COURIER_LOCATION, {
                ...payload,
                timestamp: payload.timestamp || new Date(),
              });
            }
            callback({ success: true });
          }
        )
      )
    );

    // accept:order  
    socket.on(
      CLIENT_EVENTS.ACCEPT_ORDER,
      requireRole('merchant', 'admin')(
        validateEvent(CLIENT_EVENTS.ACCEPT_ORDER, socketSchemas.acceptOrder)(
          (payload, callback) => {
            ioServer.to(`order:${payload.orderId}`).emit(SERVER_EVENTS.ORDER_STATUS, {
              orderId: payload.orderId,
              status: 'ACCEPTED',
              estimatedDeliveryTime: payload.estimatedDeliveryTime,
              timestamp: new Date(),
            });
            callback({ success: true });
          }
        )
      )
    );

    // reject:order
    socket.on(
      CLIENT_EVENTS.REJECT_ORDER,
      requireRole('merchant', 'admin')(
        validateEvent(CLIENT_EVENTS.REJECT_ORDER, socketSchemas.rejectOrder)(
          (payload, callback) => {
            ioServer.to(`order:${payload.orderId}`).emit(SERVER_EVENTS.ORDER_CANCELLED, {
              orderId: payload.orderId,
              reason: payload.reason,
              timestamp: new Date(),
            });
            callback({ success: true });
          }
        )
      )
    );
  });

  return new Promise((resolve) => httpServer.listen(TEST_PORT, resolve));
}

// ---------------------------------------------------------------------------
// JEST LIFECYCLE
// ---------------------------------------------------------------------------

beforeAll(() => createTestServer());

afterAll(() =>
  new Promise((resolve) => {
    ioServer.close();
    httpServer.close(resolve);
  })
);

// ---------------------------------------------------------------------------
// HELPER: connect a client and wait for the 'connect' event
// ---------------------------------------------------------------------------
const connectClient = (token) =>
  new Promise((resolve, reject) => {
    const client = buildClient(token);
    client.connect();
    client.once('connect', () => resolve(client));
    client.once('connect_error', (err) => reject(err));
  });

// ===========================================================================
// TEST SUITES
// ===========================================================================

// ---------------------------------------------------------------------------
// 1. AUTHENTICATION
// ---------------------------------------------------------------------------
describe('Authentication', () => {
  test('rejects connection without a token', (done) => {
    const client = buildClient('');
    client.connect();
    client.on('connect_error', (err) => {
      expect(err.message).toMatch(/Authentication/i);
      client.disconnect();
      done();
    });
  });

  test('rejects connection with an invalid token', (done) => {
    const client = buildClient('not.a.real.token');
    client.connect();
    client.on('connect_error', (err) => {
      expect(err.message).toMatch(/Authentication failed/i);
      client.disconnect();
      done();
    });
  });

  test('accepts connection with a valid token', async () => {
    const token = generateTestToken({ role: 'customer' });
    const client = await connectClient(token);
    expect(client.connected).toBe(true);
    client.disconnect();
  });
});

// ---------------------------------------------------------------------------
// 2. ORDER SUBSCRIPTIONS
// ---------------------------------------------------------------------------
describe('Order Subscriptions', () => {
  const orderId = '507f1f77bcf86cd799439011';
  let client;

  beforeAll(async () => {
    client = await connectClient(generateTestToken({ role: 'customer' }));
  });

  afterAll(() => client.disconnect());

  test('should subscribe to an order and receive acknowledgement', (done) => {
    client.emit('subscribe:order', { orderId }, (response) => {
      expect(response.success).toBe(true);
      expect(response.data.orderId).toBe(orderId);
      done();
    });
  });

  test('should receive the subscribed event after subscription', async () => {
    const client2 = await connectClient(generateTestToken({ role: 'customer' }));
    const promise = waitForEvent(client2, 'subscribed');
    client2.emit('subscribe:order', { orderId }, () => {});
    const data = await promise;
    expect(data.orderId).toBe(orderId);
    client2.disconnect();
  });

  test('should unsubscribe from an order', (done) => {
    client.emit('unsubscribe:order', { orderId }, (response) => {
      expect(response.success).toBe(true);
      expect(response.data.orderId).toBe(orderId);
      done();
    });
  });

  test('rejects subscribe:order with invalid orderId', (done) => {
    client.emit('subscribe:order', { orderId: 'not-an-object-id' }, (response) => {
      expect(response.success).toBe(false);
      expect(response.error).toBe('Validation failed');
      done();
    });
  });

  test('rejects subscribe:order with missing orderId', (done) => {
    client.emit('subscribe:order', {}, (response) => {
      expect(response.success).toBe(false);
      done();
    });
  });
});

// ---------------------------------------------------------------------------
// 3. ORDER STATUS UPDATES (Merchant)
// ---------------------------------------------------------------------------
describe('Order Status Updates', () => {
  const orderId = '507f1f77bcf86cd799439011';
  let customerClient;
  let merchantClient;

  beforeAll(async () => {
    [customerClient, merchantClient] = await Promise.all([
      connectClient(generateTestToken({ role: 'customer', userId: '507f1f77bcf86cd799439001' })),
      connectClient(generateTestToken({ role: 'merchant', userId: '507f1f77bcf86cd799439002' })),
    ]);

    // Customer subscribes to the order room
    await new Promise((res) =>
      customerClient.emit('subscribe:order', { orderId }, res)
    );
  });

  afterAll(() => {
    customerClient.disconnect();
    merchantClient.disconnect();
  });

  test('merchant can broadcast an order status update', async () => {
    const statusUpdatePromise = waitForEvent(customerClient, 'order:status');

    merchantClient.emit('update:order-status', {
      orderId,
      status: 'PREPARING',
    }, (res) => {
      expect(res.success).toBe(true);
    });

    const update = await statusUpdatePromise;
    expect(update.orderId).toBe(orderId);
    expect(update.status).toBe('PREPARING');
    expect(update.timestamp).toBeDefined();
  });

  test('customer cannot broadcast an order status update (role guard)', (done) => {
    let finished = false;
    const finish = (check) => { if (!finished) { finished = true; check(); done(); } };

    customerClient.once('error', (err) =>
      finish(() => expect(err.code).toBe('ACCESS_DENIED'))
    );

    customerClient.emit('update:order-status', {
      orderId,
      status: 'PREPARING',
    }, (res) => {
      if (res && !res.success) finish(() => expect(res.success).toBe(false));
    });
  });

  test('merchant can accept an order', async () => {
    const statusPromise = waitForEvent(customerClient, 'order:status');
    const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // +30 min

    merchantClient.emit('accept:order', {
      orderId,
      estimatedDeliveryTime: futureDate,
    }, (res) => {
      expect(res.success).toBe(true);
    });

    const update = await statusPromise;
    expect(update.status).toBe('ACCEPTED');
    expect(update.estimatedDeliveryTime).toBeDefined();
  });

  test('merchant can reject an order', async () => {
    const cancelledPromise = waitForEvent(customerClient, 'order:cancelled');

    merchantClient.emit('reject:order', {
      orderId,
      reason: 'Too many orders right now',
    }, (res) => {
      expect(res.success).toBe(true);
    });

    const update = await cancelledPromise;
    expect(update.orderId).toBe(orderId);
    expect(update.reason).toBe('Too many orders right now');
  });

  test('rejects update:order-status with invalid status', (done) => {
    merchantClient.emit('update:order-status', {
      orderId,
      status: 'FLYING_AWAY', // invalid
    }, (res) => {
      expect(res.success).toBe(false);
      expect(res.error).toBe('Validation failed');
      done();
    });
  });
});

// ---------------------------------------------------------------------------
// 4. COURIER LOCATION TRACKING
// ---------------------------------------------------------------------------
describe('Courier Location Tracking', () => {
  const orderId = '507f1f77bcf86cd799439011';
  let customerClient;
  let courierClient;

  beforeAll(async () => {
    [customerClient, courierClient] = await Promise.all([
      connectClient(generateTestToken({ role: 'customer', userId: '507f1f77bcf86cd799439001' })),
      connectClient(generateTestToken({ role: 'courier',  userId: '507f1f77bcf86cd799439003' })),
    ]);

    // Customer subscribes to watch the order
    await new Promise((res) =>
      customerClient.emit('subscribe:order', { orderId }, res)
    );
  });

  afterAll(() => {
    customerClient.disconnect();
    courierClient.disconnect();
  });

  test('courier can broadcast location to order room', async () => {
    const locationPromise = waitForEvent(customerClient, 'courier:location');

    courierClient.emit('courier:location-update', {
      orderId,
      lat: 12.9716,
      lng: 77.5946,
      heading: 90,
      speed: 35,
    }, (res) => {
      expect(res.success).toBe(true);
    });

    const location = await locationPromise;
    expect(location.lat).toBe(12.9716);
    expect(location.lng).toBe(77.5946);
    expect(location.heading).toBe(90);
    expect(location.orderId).toBe(orderId);
  });

  test('customer cannot send courier:location-update (role guard)', (done) => {
    let finished = false;
    const finish = (check) => { if (!finished) { finished = true; check(); done(); } };

    customerClient.once('error', (err) =>
      finish(() => expect(err.code).toBe('ACCESS_DENIED'))
    );

    customerClient.emit('courier:location-update', {
      orderId,
      lat: 12.9716,
      lng: 77.5946,
    }, (res) => {
      if (res && !res.success) finish(() => expect(res.success).toBe(false));
    });
  });

  test('rejects location update with out-of-range lat', (done) => {
    courierClient.emit('courier:location-update', {
      orderId,
      lat: 200,   // invalid — max is 90
      lng: 77.5946,
    }, (res) => {
      expect(res.success).toBe(false);
      expect(res.error).toBe('Validation failed');
      done();
    });
  });

  test('rejects location update with missing lat/lng', (done) => {
    courierClient.emit('courier:location-update', { orderId }, (res) => {
      expect(res.success).toBe(false);
      done();
    });
  });
});

// ---------------------------------------------------------------------------
// 5. VALIDATION EDGE CASES
// ---------------------------------------------------------------------------
describe('Validation Edge Cases', () => {
  let client;

  beforeAll(async () => {
    client = await connectClient(generateTestToken({ role: 'customer' }));
  });

  afterAll(() => client.disconnect());

  test('emitting an unknown event does nothing (no crash)', (done) => {
    // Just confirm the server doesn't crash
    client.emit('some:unknown-event', { foo: 'bar' });
    setTimeout(done, 200);
  });

  test('sending extra unknown fields strips them (stripUnknown)', (done) => {
    const orderId = '507f1f77bcf86cd799439011';
    client.emit(
      'subscribe:order',
      { orderId, hackerField: 'DROP TABLE users;' },
      (res) => {
        // Validation should pass (extra field is silently stripped)
        expect(res.success).toBe(true);
        done();
      }
    );
  });

  test('sending empty payload returns validation error', (done) => {
    client.emit('subscribe:order', null, (res) => {
      expect(res.success).toBe(false);
      done();
    });
  });
});
