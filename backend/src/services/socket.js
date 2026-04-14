// =============================================================================
// WEBSOCKET SERVER  (backend/src/services/socket.js)
// =============================================================================
// Modular Socket.io configuration, authentication middleware, and event
// handling. All events are defined in config/events.js and validated via
// middleware/socketValidation.js before reaching their handlers.
// =============================================================================

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');

// Models
const User = require('../models/User');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');

// Config & Utils
const { CLIENT_EVENTS, SERVER_EVENTS } = require('../config/events');
const socketSchemas = require('../utils/socketSchemas');
const { validateEvent, requireRole } = require('../middleware/socketValidation');
const { getClient, isReady: isRedisReady } = require('../config/redis');
const { isValidCoordinate, calculateDistance, calculateETA } = require('../utils/geo');

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------

/** @type {import('socket.io').Server | null} */
let io = null;

/**
 * Tracks userId → socketId mappings for the local server instance.
 * In a multi-server deployment, use the Redis adapter for cross-server lookups.
 * @type {Map<string, string>}
 */
const connectedUsers = new Map();

// ---------------------------------------------------------------------------
// INIT
// ---------------------------------------------------------------------------

/**
 * Initializes the Socket.io server and attaches it to the HTTP server.
 * Call this once during application startup, AFTER the HTTP server is created.
 *
 * @param {import('http').Server} httpServer - The underlying Node.js HTTP server
 * @returns {import('socket.io').Server}
 */
const initSocket = (httpServer) => {
  // -------------------------------------------------------------------------
  // 1. Initialize Socket.io
  // -------------------------------------------------------------------------
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1 MB
  });

  // -------------------------------------------------------------------------
  // 2. Setup Redis Adapter for horizontal scalability
  // -------------------------------------------------------------------------
  const redisUrl =
    process.env.REDIS_URL ||
    'redis://default:Rm4WMUgpWGvACeyz5VbWrLGlBCHJJVVY@redis-10735.crce182.ap-south-1-1.ec2.cloud.redislabs.com:10735';

  const pubClient = new Redis(redisUrl, { lazyConnect: false });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('[Socket:Redis:Pub] Error:', err.message));
  subClient.on('error', (err) => console.error('[Socket:Redis:Sub] Error:', err.message));

  io.adapter(createAdapter(pubClient, subClient));

  // -------------------------------------------------------------------------
  // 3. Authentication Middleware
  // -------------------------------------------------------------------------
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select(
        'profile email role isActive'
      );

      if (!user) {
        return next(new Error('User not found'));
      }

      if (!user.isActive) {
        return next(new Error('User account is inactive'));
      }

      // Attach user info to the socket for use in event handlers
      socket.userId   = user._id.toString();
      socket.userRole = user.role;
      socket.userData = {
        name:  user.profile.firstName,
        email: user.email,
      };

      next();
    } catch (error) {
      next(new Error('Authentication failed: ' + error.message));
    }
  });

  // -------------------------------------------------------------------------
  // 4. Connection Lifecycle
  // -------------------------------------------------------------------------
  io.on('connection', (socket) => {
    console.log(`[Socket:Connect] User: ${socket.userId} (${socket.userRole}) | Socket: ${socket.id}`);

    // Track connection locally
    connectedUsers.set(socket.userId, socket.id);

    // Each user automatically joins their personal room and role-based room
    socket.join(`user:${socket.userId}`);
    socket.join(`role:${socket.userRole}`);

    // ------------------------------------------------------------------
    // HEARTBEAT
    // ------------------------------------------------------------------
    socket.on(CLIENT_EVENTS.PONG, () => {
      socket.lastPong = Date.now();
    });

    // ------------------------------------------------------------------
    // SUBSCRIPTIONS
    // ------------------------------------------------------------------

    socket.on(
      CLIENT_EVENTS.SUBSCRIBE_ORDER,
      validateEvent(CLIENT_EVENTS.SUBSCRIBE_ORDER, socketSchemas.subscribeOrder)(
        async (payload, callback) => {
          try {
            const { orderId } = payload;
            
            // Fetch order from database
            const order = await Order.findById(orderId).populate('restaurantId');
            
            if (!order) {
              socket.emit('error', {
                event: CLIENT_EVENTS.SUBSCRIBE_ORDER,
                message: 'Order not found'
              });
              if (callback) callback({ success: false, message: 'Order not found' });
              return;
            }
            
            // Check if user has permission to view this order
            const hasAccess = (
              order.customerId.equals(socket.userId) || // Customer
              (order.restaurantId && order.restaurantId.merchantId.equals(socket.userId)) || // Merchant
              (order.courierId && order.courierId.equals(socket.userId)) || // Courier
              socket.userRole === 'admin' // Admin
            );
            
            if (!hasAccess) {
              socket.emit('error', {
                event: CLIENT_EVENTS.SUBSCRIBE_ORDER,
                message: 'Access denied'
              });
              if (callback) callback({ success: false, message: 'Access denied' });
              return;
            }
            
            // Join order room
            socket.join(`order:${orderId}`);

            logSocketEvent('subscribe:order', { userId: socket.userId, socketId: socket.id, metadata: { orderId } });

            socket.emit(SERVER_EVENTS.SUBSCRIBED, {
              orderId,
              currentStatus: order.status,
              estimatedDeliveryTime: order.estimatedDeliveryTime || order.estimatedDeliveryAt
            });

            if (callback) {
              callback({
                success: true,
                message: `Subscribed to order ${orderId}`,
                event: SERVER_EVENTS.SUBSCRIBED,
                data: { orderId },
              });
            }
          } catch (error) {
            socket.emit('error', {
              event: CLIENT_EVENTS.SUBSCRIBE_ORDER,
              message: 'Subscription failed'
            });
            if (callback) callback({ success: false, message: 'Subscription failed' });
          }
        }
      )
    );

    socket.on(
      CLIENT_EVENTS.UNSUBSCRIBE_ORDER,
      validateEvent(CLIENT_EVENTS.UNSUBSCRIBE_ORDER, socketSchemas.unsubscribeOrder)(
        (payload, callback) => {
          const { orderId } = payload;
          socket.leave(`order:${orderId}`);

          logSocketEvent('unsubscribe:order', { userId: socket.userId, socketId: socket.id, metadata: { orderId } });

          socket.emit(SERVER_EVENTS.UNSUBSCRIBED, { orderId });

          if (callback) {
            callback({
              success: true,
              message: `Unsubscribed from order ${orderId}`,
              event: SERVER_EVENTS.UNSUBSCRIBED,
              data: { orderId },
            });
          }
        }
      )
    );

    // ------------------------------------------------------------------
    // ORDER MANAGEMENT (MERCHANT / ADMIN)
    // ------------------------------------------------------------------

    socket.on(
      CLIENT_EVENTS.UPDATE_ORDER_STATUS,
      requireRole('merchant', 'admin')(
        validateEvent(CLIENT_EVENTS.UPDATE_ORDER_STATUS, socketSchemas.updateOrderStatus)(
          async (payload, callback) => {
            const { orderId, status, reason, estimatedDeliveryTime } = payload;

            logSocketEvent('update_order_status', {
              userId: socket.userId,
              socketId: socket.id,
              metadata: { orderId, status },
            });

            // Broadcast the status change to everyone tracking this order
            io.to(`order:${orderId}`).emit(SERVER_EVENTS.ORDER_STATUS, {
              orderId,
              status,
              timestamp: new Date(),
              estimatedDeliveryTime: estimatedDeliveryTime || null,
              metadata: {
                updatedBy: socket.userId,
                reason: reason || null,
              },
            });

            callback({ success: true, message: `Order ${orderId} updated to ${status}` });
          }
        )
      )
    );

    socket.on(
      CLIENT_EVENTS.ACCEPT_ORDER,
      requireRole('merchant', 'admin')(
        validateEvent(CLIENT_EVENTS.ACCEPT_ORDER, socketSchemas.acceptOrder)(
          async (payload, callback) => {
            const { orderId, estimatedDeliveryTime } = payload;

            io.to(`order:${orderId}`).emit(SERVER_EVENTS.ORDER_STATUS, {
              orderId,
              status: 'ACCEPTED',
              timestamp: new Date(),
              estimatedDeliveryTime,
              metadata: { updatedBy: socket.userId },
            });

            io.to(`order:${orderId}`).emit(SERVER_EVENTS.ORDER_ETA, {
              orderId,
              estimatedDeliveryTime,
            });

            callback({ success: true, message: `Order ${orderId} accepted` });
          }
        )
      )
    );

    socket.on(
      CLIENT_EVENTS.REJECT_ORDER,
      requireRole('merchant', 'admin')(
        validateEvent(CLIENT_EVENTS.REJECT_ORDER, socketSchemas.rejectOrder)(
          async (payload, callback) => {
            const { orderId, reason } = payload;

            io.to(`order:${orderId}`).emit(SERVER_EVENTS.ORDER_STATUS, {
              orderId,
              status: 'REJECTED',
              timestamp: new Date(),
              metadata: { updatedBy: socket.userId, reason },
            });

            io.to(`order:${orderId}`).emit(SERVER_EVENTS.ORDER_CANCELLED, {
              orderId,
              reason,
              timestamp: new Date(),
            });

            callback({ success: true, message: `Order ${orderId} rejected` });
          }
        )
      )
    );

    // ------------------------------------------------------------------
    // COURIER
    // ------------------------------------------------------------------

    socket.on(
      CLIENT_EVENTS.COURIER_LOCATION_UPDATE,
      requireRole('courier')(
        validateEvent(CLIENT_EVENTS.COURIER_LOCATION_UPDATE, socketSchemas.courierLocationUpdate)(
          async (payload, callback) => {
            try {
              const { orderId, lat, lng, heading, speed } = payload;
              const redisClient = getClient();

              // 1. Basic validation
              if (!isValidCoordinate(lat, lng)) {
                return callback({ success: false, message: 'Invalid coordinates' });
              }

              // 2. Cache location in Redis (fast access for tracking maps)
              if (isRedisReady()) {
                await redisClient.setex(
                  `courier:location:${socket.userId}`,
                  300, // 5 min TTL
                  JSON.stringify({ lat, lng, heading, speed, timestamp: new Date() })
                );
              }

              // 3. If on an active delivery, update order and broadcast to customer
              if (orderId) {
                const order = await Order.findById(orderId);
                // Verify courier is assigned to this order
                if (order && order.courierId && order.courierId.equals(socket.userId)) {
                  
                  // Calculate new ETA based on distance
                  const destination = {
                    lat: order.deliveryAddress.location.coordinates[1],
                    lng: order.deliveryAddress.location.coordinates[0]
                  };
                  
                  const { eta, distance } = calculateETA({ lat, lng }, destination, speed || 30);
                  
                  // Update order in DB
                  order.estimatedDeliveryAt = eta;
                  await order.save();

                  // Broadcast location to all order-room subscribers (e.g. customer)
                  io.to(`order:${orderId}`).emit(SERVER_EVENTS.COURIER_LOCATION, {
                    orderId,
                    lat,
                    lng,
                    heading: heading || null,
                    speed: speed || null,
                    timestamp: new Date()
                  });

                  // Broadcast updated ETA and distance
                  io.to(`order:${orderId}`).emit(SERVER_EVENTS.ORDER_ETA, {
                    orderId,
                    estimatedDeliveryTime: eta,
                    distanceRemaining: Math.round(distance) // in meters
                  });
                }
              }

              logSocketEvent('courier:location-update', {
                userId: socket.userId,
                socketId: socket.id,
                metadata: { orderId, lat, lng }
              });

              if (callback) callback({ success: true });
            } catch (err) {
              console.error('[Socket:Courier:Location] Error:', err.message);
              if (callback) callback({ success: false, message: 'Server error during location update' });
            }
          }
        )
      )
    );

    socket.on(
      CLIENT_EVENTS.COURIER_ACCEPT_DELIVERY,
      requireRole('courier')(
        validateEvent(CLIENT_EVENTS.COURIER_ACCEPT_DELIVERY, socketSchemas.courierAcceptDelivery)(
          async (payload, callback) => {
            const { orderId } = payload;

            logSocketEvent('courier_accept_delivery', {
              userId: socket.userId,
              socketId: socket.id,
              metadata: { orderId },
            });

            io.to(`order:${orderId}`).emit(SERVER_EVENTS.COURIER_ASSIGNED, {
              orderId,
              courierId: socket.userId,
              timestamp: new Date(),
            });

            callback({ success: true, message: `Delivery for order ${orderId} accepted` });
          }
        )
      )
    );

    socket.on(
      CLIENT_EVENTS.COURIER_REJECT_DELIVERY,
      requireRole('courier')(
        validateEvent(CLIENT_EVENTS.COURIER_REJECT_DELIVERY, socketSchemas.courierRejectDelivery)(
          async (payload, callback) => {
            const { orderId, reason } = payload;

            io.to(`order:${orderId}`).emit(SERVER_EVENTS.DELIVERY_REASSIGNED, {
              orderId,
              previousCourierId: socket.userId,
              reason,
              timestamp: new Date(),
            });

            callback({ success: true, message: `Delivery rejected, reassigning` });
          }
        )
      )
    );

    socket.on(
      CLIENT_EVENTS.COURIER_GO_ONLINE,
      requireRole('courier')(
        validateEvent(CLIENT_EVENTS.COURIER_GO_ONLINE, socketSchemas.courierGoOnline)(
          async (payload, callback) => {
            try {
              socket.join(`courier:${socket.userId}`);
              
              // Update status in database
              await User.findByIdAndUpdate(socket.userId, {
                'courierProfile.isOnline': true,
                'courierProfile.lastOnline': new Date()
              });
              
              // Notify admins
              io.to('role:admin').emit(SERVER_EVENTS.COURIER_ONLINE, {
                courierId: socket.userId,
                timestamp: new Date(),
              });
              
              // Acknowledge to courier
              socket.emit(SERVER_EVENTS.COURIER_ONLINE, {
                courierId: socket.userId,
                status: 'online'
              });
              
              console.log(`[Socket:Courier] ${socket.userId} went ONLINE`);
              if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
              socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to go online' });
              if (typeof callback === 'function') callback({ success: false });
            }
          }
        )
      )
    );

    socket.on(
      CLIENT_EVENTS.COURIER_GO_OFFLINE,
      requireRole('courier')(
        validateEvent(CLIENT_EVENTS.COURIER_GO_OFFLINE, socketSchemas.courierGoOffline)(
          async (payload, callback) => {
            try {
              await User.findByIdAndUpdate(socket.userId, {
                'courierProfile.isOnline': false
              });
              
              socket.leave(`courier:${socket.userId}`);
              
              console.log(`[Socket:Courier] ${socket.userId} went OFFLINE`);
              if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
              if (typeof callback === 'function') callback({ success: false });
            }
          }
        )
      )
    );

    // ------------------------------------------------------------------
    // MERCHANT STATUS
    // ------------------------------------------------------------------

    socket.on(
      CLIENT_EVENTS.MERCHANT_GO_ONLINE,
      requireRole('merchant')(
        async (payload, callback) => {
          try {
            const restaurant = await Restaurant.findOne({ merchantId: socket.userId });
            
            if (!restaurant) {
              return socket.emit('error', { message: 'Restaurant not found' });
            }
            
            socket.join(`merchant:${restaurant._id}`);
            
            io.emit(SERVER_EVENTS.MERCHANT_ONLINE, {
              restaurantId: restaurant._id
            });
            
            if (typeof callback === 'function') callback({ success: true });
          } catch (error) {
            socket.emit('error', { message: 'Failed to go online' });
            if (typeof callback === 'function') callback({ success: false });
          }
        }
      )
    );

    socket.on(
      CLIENT_EVENTS.MERCHANT_GO_OFFLINE,
      requireRole('merchant')(
        validateEvent(CLIENT_EVENTS.MERCHANT_GO_OFFLINE, socketSchemas.merchantGoOffline)(
          (payload, callback) => {
            const { restaurantId } = payload;
            socket.leave(`restaurant:${restaurantId}`);
            callback({ success: true });
          }
        )
      )
    );

    // ------------------------------------------------------------------
    // DISCONNECT & ERROR
    // ------------------------------------------------------------------

    socket.on('error', (error) => {
      console.error(`[Socket:Error] User: ${socket.userId} | ${error.message}`);
    });

    socket.on('disconnecting', () => {
      // Automatic Room Cleanup from user requirement
      const rooms = Array.from(socket.rooms);
      
      rooms.forEach(room => {
        if (room !== socket.id) {
          logSocketEvent('leave-room', {
            userId: socket.userId,
            socketId: socket.id,
            metadata: { room }
          });
        }
      });
    });

    socket.on('disconnect', async (reason) => {
      console.log(`[Socket:Disconnect] User: ${socket.userId} | Reason: ${reason}`);
      connectedUsers.delete(socket.userId);

      // Automatic Offline for couriers
      if (socket.userRole === 'courier') {
        try {
          await User.findByIdAndUpdate(socket.userId, {
            'courierProfile.isOnline': false,
            'courierProfile.lastOnline': new Date()
          });
          console.log(`[Socket:Disconnect] Set courier ${socket.userId} to offline`);
        } catch (err) {
          console.error(`[Socket:Disconnect] Failed to set courier ${socket.userId} offline:`, err.message);
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // 5. Server-side Heartbeat (PING every 30s)
  // -------------------------------------------------------------------------
  setInterval(() => {
    io.emit(SERVER_EVENTS.PING);
  }, 30_000);

  console.log('[Socket.io] Server initialized ✅  — events, validation, and role guards active.');
  return io;
};

// ---------------------------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------------------------

/**
 * Structured event logger for audit trails.
 * @param {string} event
 * @param {{ userId: string, socketId: string, metadata?: object }} data
 */
const logSocketEvent = (event, data) => {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    userId:   data.userId,
    socketId: data.socketId,
    metadata: data.metadata || {},
  };
  console.log('[Socket:Event]', JSON.stringify(entry));
};

/**
 * Returns the initialized Socket.io server. Throws if called before initSocket().
 * @returns {import('socket.io').Server}
 */
const getIO = () => {
  if (!io) throw new Error('Socket.io has not been initialized. Call initSocket() first.');
  return io;
};

/**
 * Returns a snapshot of connected userId → socketId mappings.
 * @returns {Map<string, string>}
 */
const getConnectedUsers = () => connectedUsers;

/**
 * Broadcast order status update.
 * @param {string} orderId
 * @param {object} data
 */
const broadcastOrderUpdate = (orderId, data) => {
  getIO().to(`order:${orderId}`).emit(SERVER_EVENTS.ORDER_STATUS, {
    orderId,
    status: data.status,
    timestamp: new Date(),
    estimatedDeliveryTime: data.estimatedDeliveryTime,
    metadata: data.metadata
  });
  
  logSocketEvent('order:status', { metadata: { orderId, ...data } });
};

/**
 * Broadcast new order to merchant
 * @param {string} restaurantId
 * @param {object} orderData
 */
const notifyMerchantNewOrder = (restaurantId, orderData) => {
  getIO().to(`merchant:${restaurantId}`).emit(SERVER_EVENTS.ORDER_NEW, {
    orderId: orderData._id,
    orderNumber: orderData.orderNumber,
    customer: orderData.customerInfo || orderData.customerId,
    items: orderData.items,
    total: orderData.payment?.amount?.total || orderData.payment?.breakdown?.total,
    deliveryAddress: orderData.deliveryAddress,
    timestamp: new Date()
  });
  
  // Also emit sound alert
  getIO().to(`merchant:${restaurantId}`).emit(SERVER_EVENTS.PLAY_SOUND, {
    sound: 'new-order-alert'
  });
};

/**
 * Broadcast courier location
 * @param {string} orderId
 * @param {object} locationData
 */
const broadcastCourierLocation = (orderId, locationData) => {
  getIO().to(`order:${orderId}`).emit(SERVER_EVENTS.COURIER_LOCATION, {
    orderId,
    lat: locationData.lat,
    lng: locationData.lng,
    heading: locationData.heading,
    speed: locationData.speed,
    timestamp: new Date()
  });
};

/**
 * Broadcast to specific user
 * @param {string} userId
 * @param {string} event
 * @param {object} data
 */
const sendToUser = (userId, event, data) => {
  getIO().to(`user:${userId}`).emit(event, {
    ...data,
    timestamp: new Date()
  });
};

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------

module.exports = {
  initSocket,
  getIO,
  getConnectedUsers,
  broadcastOrderUpdate,
  notifyMerchantNewOrder,
  broadcastCourierLocation,
  sendToUser
};
