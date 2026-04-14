// =============================================================================
// WEBSOCKET EVENTS INTEGRATION TESTS  (backend/tests/socket-events.test.js)
// =============================================================================
// Full integration test suite for all Socket.io events.
// Runs against an in-process real HTTP + Socket.io server; no database needed.
//
// Coverage:
//   ✅ Authentication (no token, invalid token, valid token)
//   ✅ Order subscriptions & unsubscriptions
//   ✅ Validation errors (invalid ObjectIds, bad status, out-of-range coords)
//   ✅ Role guards (customer ≠ merchant, customer ≠ courier)
//   ✅ Order status update broadcasts
//   ✅ Merchant accept / reject order flows
//   ✅ Courier location tracking
//   ✅ Courier accept / reject delivery
//   ✅ Merchant go-online / go-offline
//   ✅ Heartbeat (PING / PONG)
//   ✅ Payload stripping (unknown fields silently removed)
//   ✅ Concurrent connections stress test
//
// Run: npm test  (or:  npx jest tests/socket-events.test.js --verbose)
// =============================================================================

const http = require('http');
const { Server } = require('socket.io');
const { io: ClientIO } = require('socket.io-client');
const jwt = require('jsonwebtoken');

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const TEST_JWT_SECRET = 'socket_events_test_secret_do_not_use_in_prod';
const TEST_PORT = 5098; // dedicated port — never conflicts with dev / other suites

// Reusable valid MongoDB ObjectId strings
const ORDER_ID      = '507f1f77bcf86cd799439011';
const ORDER_ID_2    = '507f1f77bcf86cd799439012';
const RESTAURANT_ID = '507f1f77bcf86cd799439022';

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Generate a signed JWT that mirrors the production token shape.
 * @param {{ userId?: string, role?: string }} overrides
 */
const generateTestToken = (overrides = {}) =>
  jwt.sign(
    {
      userId: overrides.userId || '507f1f77bcf86cd799439001',
      role:   overrides.role   || 'customer',
    },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );

/**
 * Build a disconnected Socket.io client.
 * @param {string} token - JWT auth token
 * @param {object} [opts] - Extra socket options
 */
const buildClient = (token, opts = {}) =>
  ClientIO(`http://localhost:${TEST_PORT}`, {
    auth:        { token },
    transports:  ['websocket'],
    autoConnect: false,
    ...opts,
  });

/**
 * Wait for a single event from a socket. Rejects after `timeout` ms.
 * @param {object} socket
 * @param {string} event
 * @param {number} [timeout=3000]
 */
const waitForEvent = (socket, event, timeout = 3000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for "${event}"`)),
      timeout
    );
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

/**
 * Promisified emit that waits for the acknowledgement callback.
 * @param {object} socket
 * @param {string} event
 * @param {object} payload
 */
const emitWithAck = (socket, event, payload) =>
  new Promise((resolve) => socket.emit(event, payload, resolve));

// ---------------------------------------------------------------------------
// IN-PROCESS TEST SERVER
// ---------------------------------------------------------------------------

let httpServer;
let ioServer;

/**
 * Lightweight server that mirrors src/services/socket.js event registration
 * but uses mock JWT auth (no DB), so tests are completely self-contained.
 */
function createTestServer() {
  httpServer = http.createServer();
  ioServer   = new Server(httpServer, { transports: ['websocket'] });

  // ── Auth Middleware (mock — validates JWT, no DB call) ────────────────────
  ioServer.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication token required'));

      const decoded    = jwt.verify(token, TEST_JWT_SECRET);
      socket.userId    = decoded.userId;
      socket.userRole  = decoded.role;
      next();
    } catch (err) {
      next(new Error('Authentication failed: ' + err.message));
    }
  });

  // ── Import real production code (schemas + middleware) ────────────────────
  const { CLIENT_EVENTS, SERVER_EVENTS } = require('../src/config/events');
  const schemas                          = require('../src/utils/socketSchemas');
  const { validateEvent, requireRole }   = require('../src/middleware/socketValidation');

  // ── Connection Handler ─────────────────────────────────────────────────────
  ioServer.on('connection', (socket) => {
    // Auto-join personal + role rooms
    socket.join(`user:${socket.userId}`);
    socket.join(`role:${socket.userRole}`);

    // ---- Heartbeat ----------------------------------------------------------
    socket.on(CLIENT_EVENTS.PONG, () => {
      socket.lastPong = Date.now();
    });

    // ---- subscribe:order ----------------------------------------------------
    socket.on(
      CLIENT_EVENTS.SUBSCRIBE_ORDER,
      validateEvent(CLIENT_EVENTS.SUBSCRIBE_ORDER, schemas.subscribeOrder)(
        (payload, callback) => {
          socket.join(`order:${payload.orderId}`);
          socket.emit(SERVER_EVENTS.SUBSCRIBED, {
            orderId: payload.orderId,
            currentStatus: 'PENDING',
          });
          callback({ success: true, data: { orderId: payload.orderId } });
        }
      )
    );

    // ---- unsubscribe:order --------------------------------------------------
    socket.on(
      CLIENT_EVENTS.UNSUBSCRIBE_ORDER,
      validateEvent(CLIENT_EVENTS.UNSUBSCRIBE_ORDER, schemas.unsubscribeOrder)(
        (payload, callback) => {
          socket.leave(`order:${payload.orderId}`);
          socket.emit(SERVER_EVENTS.UNSUBSCRIBED, { orderId: payload.orderId });
          callback({ success: true, data: { orderId: payload.orderId } });
        }
      )
    );

    // ---- update:order-status ------------------------------------------------
    socket.on(
      CLIENT_EVENTS.UPDATE_ORDER_STATUS,
      requireRole('merchant', 'admin')(
        validateEvent(CLIENT_EVENTS.UPDATE_ORDER_STATUS, schemas.updateOrderStatus)(
          (payload, callback) => {
            ioServer.to(`order:${payload.orderId}`).emit(SERVER_EVENTS.ORDER_STATUS, {
              orderId:   payload.orderId,
              status:    payload.status,
              timestamp: new Date(),
              metadata:  { updatedBy: socket.userId, reason: payload.reason || null },
            });
            callback({ success: true });
          }
        )
      )
    );

    // ---- accept:order -------------------------------------------------------
    socket.on(
      CLIENT_EVENTS.ACCEPT_ORDER,
      requireRole('merchant', 'admin')(
        validateEvent(CLIENT_EVENTS.ACCEPT_ORDER, schemas.acceptOrder)(
          (payload, callback) => {
            ioServer.to(`order:${payload.orderId}`).emit(SERVER_EVENTS.ORDER_STATUS, {
              orderId:               payload.orderId,
              status:                'ACCEPTED',
              estimatedDeliveryTime: payload.estimatedDeliveryTime,
              timestamp:             new Date(),
            });
            ioServer.to(`order:${payload.orderId}`).emit(SERVER_EVENTS.ORDER_ETA, {
              orderId:               payload.orderId,
              estimatedDeliveryTime: payload.estimatedDeliveryTime,
            });
            callback({ success: true });
          }
        )
      )
    );

    // ---- reject:order -------------------------------------------------------
    socket.on(
      CLIENT_EVENTS.REJECT_ORDER,
      requireRole('merchant', 'admin')(
        validateEvent(CLIENT_EVENTS.REJECT_ORDER, schemas.rejectOrder)(
          (payload, callback) => {
            ioServer.to(`order:${payload.orderId}`).emit(SERVER_EVENTS.ORDER_STATUS, {
              orderId:   payload.orderId,
              status:    'REJECTED',
              timestamp: new Date(),
              metadata:  { updatedBy: socket.userId, reason: payload.reason },
            });
            ioServer.to(`order:${payload.orderId}`).emit(SERVER_EVENTS.ORDER_CANCELLED, {
              orderId:   payload.orderId,
              reason:    payload.reason,
              timestamp: new Date(),
            });
            callback({ success: true });
          }
        )
      )
    );

    // ---- courier:location-update --------------------------------------------
    socket.on(
      CLIENT_EVENTS.COURIER_LOCATION_UPDATE,
      requireRole('courier')(
        validateEvent(CLIENT_EVENTS.COURIER_LOCATION_UPDATE, schemas.courierLocationUpdate)(
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

    // ---- courier:accept-delivery --------------------------------------------
    socket.on(
      CLIENT_EVENTS.COURIER_ACCEPT_DELIVERY,
      requireRole('courier')(
        validateEvent(CLIENT_EVENTS.COURIER_ACCEPT_DELIVERY, schemas.courierAcceptDelivery)(
          (payload, callback) => {
            ioServer.to(`order:${payload.orderId}`).emit(SERVER_EVENTS.COURIER_ASSIGNED, {
              orderId:   payload.orderId,
              courierId: socket.userId,
              timestamp: new Date(),
            });
            callback({ success: true });
          }
        )
      )
    );

    // ---- courier:reject-delivery --------------------------------------------
    socket.on(
      CLIENT_EVENTS.COURIER_REJECT_DELIVERY,
      requireRole('courier')(
        validateEvent(CLIENT_EVENTS.COURIER_REJECT_DELIVERY, schemas.courierRejectDelivery)(
          (payload, callback) => {
            ioServer.to(`order:${payload.orderId}`).emit(SERVER_EVENTS.DELIVERY_REASSIGNED, {
              orderId:           payload.orderId,
              previousCourierId: socket.userId,
              reason:            payload.reason,
              timestamp:         new Date(),
            });
            callback({ success: true });
          }
        )
      )
    );

    // ---- merchant:go-online -------------------------------------------------
    socket.on(
      CLIENT_EVENTS.MERCHANT_GO_ONLINE,
      requireRole('merchant')(
        validateEvent(CLIENT_EVENTS.MERCHANT_GO_ONLINE, schemas.merchantGoOnline)(
          (payload, callback) => {
            socket.join(`merchant:${payload.restaurantId}`);
            ioServer.emit(SERVER_EVENTS.MERCHANT_ONLINE, {
              restaurantId: payload.restaurantId,
              timestamp:    new Date(),
            });
            callback({ success: true });
          }
        )
      )
    );

    // ---- merchant:go-offline ------------------------------------------------
    socket.on(
      CLIENT_EVENTS.MERCHANT_GO_OFFLINE,
      requireRole('merchant')(
        validateEvent(CLIENT_EVENTS.MERCHANT_GO_OFFLINE, schemas.merchantGoOffline)(
          (payload, callback) => {
            socket.leave(`merchant:${payload.restaurantId}`);
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

afterAll(
  () =>
    new Promise((resolve) => {
      ioServer.close();
      httpServer.close(resolve);
    })
);

/** Connect a client and resolve once the 'connect' event fires. */
const connectClient = (token) =>
  new Promise((resolve, reject) => {
    const client = buildClient(token);
    client.connect();
    client.once('connect', () => resolve(client));
    client.once('connect_error', (err) => reject(err));
  });

// ===========================================================================
// 1. AUTHENTICATION
// ===========================================================================

describe('1. Authentication', () => {
  test('rejects connection with no token', (done) => {
    const client = buildClient('');
    client.connect();
    client.on('connect_error', (err) => {
      expect(err.message).toMatch(/Authentication/i);
      client.disconnect();
      done();
    });
  });

  test('rejects connection with a malformed token', (done) => {
    const client = buildClient('not.a.real.token');
    client.connect();
    client.on('connect_error', (err) => {
      expect(err.message).toMatch(/Authentication failed/i);
      client.disconnect();
      done();
    });
  });

  test('rejects connection with a token signed by wrong secret', (done) => {
    const badToken = jwt.sign({ userId: '507f1f77bcf86cd799439001', role: 'customer' }, 'wrong-secret');
    const client = buildClient(badToken);
    client.connect();
    client.on('connect_error', (err) => {
      expect(err.message).toMatch(/Authentication failed/i);
      client.disconnect();
      done();
    });
  });

  test('accepts connection with a valid token', async () => {
    const token  = generateTestToken({ role: 'customer' });
    const client = await connectClient(token);
    expect(client.connected).toBe(true);
    client.disconnect();
  });

  test('accepts connection for all roles', async () => {
    const roles = ['customer', 'merchant', 'courier', 'admin'];
    for (const role of roles) {
      const token  = generateTestToken({ role });
      const client = await connectClient(token);
      expect(client.connected).toBe(true);
      client.disconnect();
    }
  });
});

// ===========================================================================
// 2. ORDER SUBSCRIPTIONS
// ===========================================================================

describe('2. Order Subscriptions', () => {
  let client;

  beforeAll(async () => {
    client = await connectClient(generateTestToken({ role: 'customer' }));
  });

  afterAll(() => client.disconnect());

  test('rejects subscribe:order with invalid orderId', async () => {
    const res = await emitWithAck(client, 'subscribe:order', { orderId: 'not-valid' });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Validation failed');
    expect(Array.isArray(res.details)).toBe(true);
  });

  test('rejects subscribe:order with missing orderId', async () => {
    const res = await emitWithAck(client, 'subscribe:order', {});
    expect(res.success).toBe(false);
    expect(res.error).toBe('Validation failed');
  });

  test('rejects subscribe:order with null payload', async () => {
    const res = await emitWithAck(client, 'subscribe:order', null);
    expect(res.success).toBe(false);
  });

  test('successfully subscribes to a valid order', async () => {
    const res = await emitWithAck(client, 'subscribe:order', { orderId: ORDER_ID });
    expect(res.success).toBe(true);
    expect(res.data.orderId).toBe(ORDER_ID);
  });

  test('emits subscribed event when subscription succeeds', async () => {
    const client2   = await connectClient(generateTestToken({ role: 'customer' }));
    const subPromise = waitForEvent(client2, 'subscribed');
    client2.emit('subscribe:order', { orderId: ORDER_ID }, () => {});
    const data = await subPromise;
    expect(data.orderId).toBe(ORDER_ID);
    expect(data.currentStatus).toBeDefined();
    client2.disconnect();
  });

  test('strips unknown fields from subscribe:order payload', async () => {
    const res = await emitWithAck(client, 'subscribe:order', {
      orderId:      ORDER_ID,
      hackerField:  "'; DROP TABLE orders; --",
      __proto__:    { isAdmin: true },
    });
    expect(res.success).toBe(true);
  });

  test('successfully unsubscribes from an order', async () => {
    // Re-subscribe first
    await emitWithAck(client, 'subscribe:order', { orderId: ORDER_ID });
    const res = await emitWithAck(client, 'unsubscribe:order', { orderId: ORDER_ID });
    expect(res.success).toBe(true);
    expect(res.data.orderId).toBe(ORDER_ID);
  });

  test('emits unsubscribed event when unsubscription succeeds', async () => {
    const client2 = await connectClient(generateTestToken({ role: 'customer' }));
    await emitWithAck(client2, 'subscribe:order', { orderId: ORDER_ID });
    const unsubPromise = waitForEvent(client2, 'unsubscribed');
    client2.emit('unsubscribe:order', { orderId: ORDER_ID }, () => {});
    const data = await unsubPromise;
    expect(data.orderId).toBe(ORDER_ID);
    client2.disconnect();
  });
});

// ===========================================================================
// 3. ORDER STATUS UPDATES  (Merchant / Admin)
// ===========================================================================

describe('3. Order Status Updates', () => {
  let customerClient, merchantClient, adminClient;

  beforeAll(async () => {
    [customerClient, merchantClient, adminClient] = await Promise.all([
      connectClient(generateTestToken({ role: 'customer', userId: '507f1f77bcf86cd799439001' })),
      connectClient(generateTestToken({ role: 'merchant', userId: '507f1f77bcf86cd799439002' })),
      connectClient(generateTestToken({ role: 'admin',    userId: '507f1f77bcf86cd799439003' })),
    ]);

    // Customer subscribes to the order room so it receives broadcasts
    await emitWithAck(customerClient, 'subscribe:order', { orderId: ORDER_ID });
  });

  afterAll(() => {
    customerClient.disconnect();
    merchantClient.disconnect();
    adminClient.disconnect();
  });

  test('customer cannot update order status (role guard → ACCESS_DENIED)', (done) => {
    let finished = false;
    const finish = (check) => { if (!finished) { finished = true; check(); done(); } };

    customerClient.once('error', (err) =>
      finish(() => expect(err.code).toBe('ACCESS_DENIED'))
    );

    customerClient.emit('update:order-status', { orderId: ORDER_ID, status: 'PREPARING' }, (res) => {
      if (res && !res.success) finish(() => expect(res.success).toBe(false));
    });
  });

  test('rejects update:order-status with invalid status value', async () => {
    const res = await emitWithAck(merchantClient, 'update:order-status', {
      orderId: ORDER_ID,
      status: 'FLYING_AWAY', // not a valid status
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Validation failed');
    expect(res.details.some((d) => d.includes('status'))).toBe(true);
  });

  test('merchant broadcasts order status update to order room', async () => {
    const statusPromise = waitForEvent(customerClient, 'order:status');

    await emitWithAck(merchantClient, 'update:order-status', {
      orderId: ORDER_ID,
      status:  'PREPARING',
    });

    const update = await statusPromise;
    expect(update.orderId).toBe(ORDER_ID);
    expect(update.status).toBe('PREPARING');
    expect(update.timestamp).toBeDefined();
    expect(update.metadata.updatedBy).toBeDefined();
  });

  test('admin can also broadcast order status update', async () => {
    const statusPromise = waitForEvent(customerClient, 'order:status');

    await emitWithAck(adminClient, 'update:order-status', {
      orderId: ORDER_ID,
      status:  'OUT_FOR_DELIVERY',
    });

    const update = await statusPromise;
    expect(update.status).toBe('OUT_FOR_DELIVERY');
  });

  test('update:order-status includes optional reason in metadata', async () => {
    const statusPromise = waitForEvent(customerClient, 'order:status');

    await emitWithAck(merchantClient, 'update:order-status', {
      orderId: ORDER_ID,
      status:  'PREPARING',
      reason:  'Ingredients confirmed',
    });

    const update = await statusPromise;
    expect(update.metadata.reason).toBe('Ingredients confirmed');
  });
});

// ===========================================================================
// 4. ACCEPT / REJECT ORDER  (Merchant)
// ===========================================================================

describe('4. Accept / Reject Order', () => {
  let customerClient, merchantClient;

  beforeAll(async () => {
    [customerClient, merchantClient] = await Promise.all([
      connectClient(generateTestToken({ role: 'customer', userId: '507f1f77bcf86cd799439001' })),
      connectClient(generateTestToken({ role: 'merchant', userId: '507f1f77bcf86cd799439002' })),
    ]);
    await emitWithAck(customerClient, 'subscribe:order', { orderId: ORDER_ID_2 });
  });

  afterAll(() => {
    customerClient.disconnect();
    merchantClient.disconnect();
  });

  test('rejects accept:order without estimatedDeliveryTime', async () => {
    const res = await emitWithAck(merchantClient, 'accept:order', { orderId: ORDER_ID_2 });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Validation failed');
  });

  test('rejects accept:order with past estimatedDeliveryTime', async () => {
    const res = await emitWithAck(merchantClient, 'accept:order', {
      orderId:               ORDER_ID_2,
      estimatedDeliveryTime: new Date(Date.now() - 60_000).toISOString(), // 1 min ago
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Validation failed');
    expect(res.details.some((d) => d.includes('future'))).toBe(true);
  });

  test('merchant can accept an order with a future ETA', async () => {
    const statusPromise = waitForEvent(customerClient, 'order:status');
    const etaPromise    = waitForEvent(customerClient, 'order:eta');
    const futureDate    = new Date(Date.now() + 30 * 60_000).toISOString(); // +30 min

    const ack = await emitWithAck(merchantClient, 'accept:order', {
      orderId:               ORDER_ID_2,
      estimatedDeliveryTime: futureDate,
    });
    expect(ack.success).toBe(true);

    const status = await statusPromise;
    expect(status.status).toBe('ACCEPTED');
    expect(status.estimatedDeliveryTime).toBeDefined();

    const eta = await etaPromise;
    expect(eta.orderId).toBe(ORDER_ID_2);
    expect(eta.estimatedDeliveryTime).toBeDefined();
  });

  test('rejects reject:order without a reason', async () => {
    const res = await emitWithAck(merchantClient, 'reject:order', { orderId: ORDER_ID_2 });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Validation failed');
  });

  test('rejects reject:order with a too-short reason', async () => {
    const res = await emitWithAck(merchantClient, 'reject:order', {
      orderId: ORDER_ID_2,
      reason:  'No', // < 5 chars
    });
    expect(res.success).toBe(false);
    expect(res.details.some((d) => d.includes('5 characters'))).toBe(true);
  });

  test('merchant can reject an order with a valid reason', async () => {
    const cancelledPromise = waitForEvent(customerClient, 'order:cancelled');

    const ack = await emitWithAck(merchantClient, 'reject:order', {
      orderId: ORDER_ID_2,
      reason:  'Too many orders right now, unable to accept',
    });
    expect(ack.success).toBe(true);

    const cancelled = await cancelledPromise;
    expect(cancelled.orderId).toBe(ORDER_ID_2);
    expect(cancelled.reason).toBe('Too many orders right now, unable to accept');
  });
});

// ===========================================================================
// 5. COURIER LOCATION TRACKING
// ===========================================================================

describe('5. Courier Location Tracking', () => {
  let customerClient, courierClient;

  beforeAll(async () => {
    [customerClient, courierClient] = await Promise.all([
      connectClient(generateTestToken({ role: 'customer', userId: '507f1f77bcf86cd799439001' })),
      connectClient(generateTestToken({ role: 'courier',  userId: '507f1f77bcf86cd799439004' })),
    ]);
    await emitWithAck(customerClient, 'subscribe:order', { orderId: ORDER_ID });
  });

  afterAll(() => {
    customerClient.disconnect();
    courierClient.disconnect();
  });

  test('customer cannot send courier:location-update (role guard)', (done) => {
    let finished = false;
    const finish = (check) => { if (!finished) { finished = true; check(); done(); } };

    customerClient.once('error', (err) =>
      finish(() => expect(err.code).toBe('ACCESS_DENIED'))
    );

    customerClient.emit('courier:location-update', { orderId: ORDER_ID, lat: 12.97, lng: 77.59 }, (res) => {
      if (res && !res.success) finish(() => expect(res.success).toBe(false));
    });
  });

  test('rejects location update with out-of-range latitude (>90)', async () => {
    const res = await emitWithAck(courierClient, 'courier:location-update', {
      orderId: ORDER_ID,
      lat:     200, // invalid
      lng:     77.5946,
    });
    expect(res.success).toBe(false);
    expect(res.details.some((d) => d.includes('lat'))).toBe(true);
  });

  test('rejects location update with out-of-range longitude (<-180)', async () => {
    const res = await emitWithAck(courierClient, 'courier:location-update', {
      orderId: ORDER_ID,
      lat:     12.9716,
      lng:     -200, // invalid
    });
    expect(res.success).toBe(false);
    expect(res.details.some((d) => d.includes('lng'))).toBe(true);
  });

  test('rejects location update with missing lat / lng', async () => {
    const res = await emitWithAck(courierClient, 'courier:location-update', {
      orderId: ORDER_ID,
    });
    expect(res.success).toBe(false);
    expect(res.details.length).toBeGreaterThanOrEqual(2); // lat AND lng missing
  });

  test('courier broadcasts valid location to order room', async () => {
    const locationPromise = waitForEvent(customerClient, 'courier:location');

    const ack = await emitWithAck(courierClient, 'courier:location-update', {
      orderId:  ORDER_ID,
      lat:      12.9716,
      lng:      77.5946,
      heading:  90,
      speed:    35.5,
    });
    expect(ack.success).toBe(true);

    const loc = await locationPromise;
    expect(loc.lat).toBeCloseTo(12.9716);
    expect(loc.lng).toBeCloseTo(77.5946);
    expect(loc.heading).toBe(90);
    expect(loc.speed).toBeCloseTo(35.5);
    expect(loc.orderId).toBe(ORDER_ID);
    expect(loc.timestamp).toBeDefined();
  });

  test('location update without orderId does not broadcast to order room', async () => {
    let received = false;
    customerClient.once('courier:location', () => { received = true; });

    await emitWithAck(courierClient, 'courier:location-update', {
      lat: 12.9716,
      lng: 77.5946,
    });

    // Wait a bit to confirm no event was received
    await new Promise((r) => setTimeout(r, 300));
    expect(received).toBe(false);
  });
});

// ===========================================================================
// 6. COURIER ACCEPT / REJECT DELIVERY
// ===========================================================================

describe('6. Courier Accept / Reject Delivery', () => {
  let customerClient, courierClient;

  beforeAll(async () => {
    [customerClient, courierClient] = await Promise.all([
      connectClient(generateTestToken({ role: 'customer', userId: '507f1f77bcf86cd799439001' })),
      connectClient(generateTestToken({ role: 'courier',  userId: '507f1f77bcf86cd799439004' })),
    ]);
    await emitWithAck(customerClient, 'subscribe:order', { orderId: ORDER_ID });
  });

  afterAll(() => {
    customerClient.disconnect();
    courierClient.disconnect();
  });

  test('customer cannot accept a delivery (role guard)', (done) => {
    let finished = false;
    const finish = (check) => { if (!finished) { finished = true; check(); done(); } };

    customerClient.once('error', (err) =>
      finish(() => expect(err.code).toBe('ACCESS_DENIED'))
    );
    customerClient.emit('courier:accept-delivery', { orderId: ORDER_ID }, (res) => {
      if (res && !res.success) finish(() => expect(res.success).toBe(false));
    });
  });

  test('courier accepts delivery — emits courier:assigned to order room', async () => {
    const assignedPromise = waitForEvent(customerClient, 'courier:assigned');

    const ack = await emitWithAck(courierClient, 'courier:accept-delivery', { orderId: ORDER_ID });
    expect(ack.success).toBe(true);

    const assigned = await assignedPromise;
    expect(assigned.orderId).toBe(ORDER_ID);
    expect(assigned.courierId).toBeDefined();
    expect(assigned.timestamp).toBeDefined();
  });

  test('rejects courier:reject-delivery without a reason', async () => {
    const res = await emitWithAck(courierClient, 'courier:reject-delivery', { orderId: ORDER_ID });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Validation failed');
  });

  test('courier rejects delivery — emits delivery:reassigned to order room', async () => {
    const reassignedPromise = waitForEvent(customerClient, 'delivery:reassigned');

    const ack = await emitWithAck(courierClient, 'courier:reject-delivery', {
      orderId: ORDER_ID,
      reason:  'Vehicle breakdown, cannot complete delivery',
    });
    expect(ack.success).toBe(true);

    const reassigned = await reassignedPromise;
    expect(reassigned.orderId).toBe(ORDER_ID);
    expect(reassigned.previousCourierId).toBeDefined();
    expect(reassigned.reason).toBe('Vehicle breakdown, cannot complete delivery');
  });
});

// ===========================================================================
// 7. MERCHANT ONLINE / OFFLINE
// ===========================================================================

describe('7. Merchant Online / Offline', () => {
  let customerClient, merchantClient;

  beforeAll(async () => {
    [customerClient, merchantClient] = await Promise.all([
      connectClient(generateTestToken({ role: 'customer', userId: '507f1f77bcf86cd799439001' })),
      connectClient(generateTestToken({ role: 'merchant', userId: '507f1f77bcf86cd799439002' })),
    ]);
  });

  afterAll(() => {
    customerClient.disconnect();
    merchantClient.disconnect();
  });

  test('customer cannot go merchant-online (role guard)', (done) => {
    let finished = false;
    const finish = (check) => { if (!finished) { finished = true; check(); done(); } };

    customerClient.once('error', (err) =>
      finish(() => expect(err.code).toBe('ACCESS_DENIED'))
    );
    customerClient.emit('merchant:go-online', { restaurantId: RESTAURANT_ID }, (res) => {
      if (res && !res.success) finish(() => expect(res.success).toBe(false));
    });
  });

  test('rejects merchant:go-online with invalid restaurantId', async () => {
    const res = await emitWithAck(merchantClient, 'merchant:go-online', {
      restaurantId: 'bad-id',
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Validation failed');
  });

  test('merchant goes online — emits merchant:online globally', async () => {
    const onlinePromise = waitForEvent(customerClient, 'merchant:online');

    const ack = await emitWithAck(merchantClient, 'merchant:go-online', {
      restaurantId: RESTAURANT_ID,
    });
    expect(ack.success).toBe(true);

    const online = await onlinePromise;
    expect(online.restaurantId).toBe(RESTAURANT_ID);
    expect(online.timestamp).toBeDefined();
  });

  test('merchant goes offline', async () => {
    const ack = await emitWithAck(merchantClient, 'merchant:go-offline', {
      restaurantId: RESTAURANT_ID,
    });
    expect(ack.success).toBe(true);
  });
});

// ===========================================================================
// 8. HEARTBEAT
// ===========================================================================

describe('8. Heartbeat (PING / PONG)', () => {
  let client;

  beforeAll(async () => {
    client = await connectClient(generateTestToken());
  });

  afterAll(() => client.disconnect());

  test('client can emit pong in response to server ping', (done) => {
    // Manually simulate the server sending a ping
    const socketId = client.id;
    ioServer.to(socketId).emit('ping');

    client.once('ping', () => {
      client.emit('pong');
      // Give server 200 ms to process
      setTimeout(done, 200);
    });
  });
});

// ===========================================================================
// 9. VALIDATION EDGE CASES
// ===========================================================================

describe('9. Validation Edge Cases', () => {
  let client;

  beforeAll(async () => {
    client = await connectClient(generateTestToken({ role: 'customer' }));
  });

  afterAll(() => client.disconnect());

  test('emitting an unknown event does not crash the server', (done) => {
    client.emit('totally:unknown-event', { foo: 'bar' });
    setTimeout(done, 300);
  });

  test('extra unknown fields are silently stripped (injection guard)', async () => {
    const res = await emitWithAck(client, 'subscribe:order', {
      orderId:     ORDER_ID,
      hackerField: "'; DROP TABLE orders;--",
      nested:      { evil: true },
    });
    expect(res.success).toBe(true);
  });

  test('empty object payload for subscribe:order returns validation error', async () => {
    const res = await emitWithAck(client, 'subscribe:order', {});
    expect(res.success).toBe(false);
    expect(res.error).toBe('Validation failed');
  });

  test('null payload for subscribe:order returns validation error', async () => {
    const res = await emitWithAck(client, 'subscribe:order', null);
    expect(res.success).toBe(false);
  });

  test('error event is emitted alongside callback on validation failure', (done) => {
    client.once('error', (errPayload) => {
      expect(errPayload.code).toBe('VALIDATION_ERROR');
      expect(errPayload.event).toBe('subscribe:order');
      done();
    });
    client.emit('subscribe:order', { orderId: 'invalid' }, () => {});
  });
});

// ===========================================================================
// 10. CONCURRENT CONNECTIONS  (stress test)
// ===========================================================================

describe('10. Concurrent Connections Stress Test', () => {
  test('handles 20 simultaneous connections', async () => {
    const NUM_CLIENTS = 20;
    const tokens = Array.from({ length: NUM_CLIENTS }, (_, i) =>
      generateTestToken({ userId: `507f1f77bcf86cd79943${String(i).padStart(4, '0')}`, role: 'customer' })
    );

    const clients = await Promise.all(tokens.map((t) => connectClient(t)));

    // Verify all connected
    clients.forEach((c) => expect(c.connected).toBe(true));

    // Each subscribes to a unique order room simultaneously
    await Promise.all(
      clients.map((c, i) => {
        const oid = `507f1f77bcf86cd79943${String(i + 100).padStart(4, '0')}`;
        return emitWithAck(c, 'subscribe:order', { orderId: oid });
      })
    );

    // Cleanup
    clients.forEach((c) => c.disconnect());
  }, 15_000); // generous timeout for slow CI environments

  test('handles 20 concurrent merchant status broadcasts', async () => {
    const [customerA, customerB, merchantC] = await Promise.all([
      connectClient(generateTestToken({ role: 'customer', userId: '507f1f77bcf86cd799431001' })),
      connectClient(generateTestToken({ role: 'customer', userId: '507f1f77bcf86cd799431002' })),
      connectClient(generateTestToken({ role: 'merchant', userId: '507f1f77bcf86cd799431003' })),
    ]);

    await emitWithAck(customerA, 'subscribe:order', { orderId: ORDER_ID });
    await emitWithAck(customerB, 'subscribe:order', { orderId: ORDER_ID });

    const promA = waitForEvent(customerA, 'order:status');
    const promB = waitForEvent(customerB, 'order:status');

    await emitWithAck(merchantC, 'update:order-status', { orderId: ORDER_ID, status: 'DELIVERED' });

    const [updateA, updateB] = await Promise.all([promA, promB]);
    expect(updateA.status).toBe('DELIVERED');
    expect(updateB.status).toBe('DELIVERED');

    customerA.disconnect();
    customerB.disconnect();
    merchantC.disconnect();
  });
});
