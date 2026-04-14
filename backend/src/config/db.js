// =============================================================================
// DATABASE CONFIG  (backend/src/config/db.js)
// =============================================================================
// Handles the MongoDB connection with:
//   - Optimised Mongoose connection options for production
//   - Query profiling (slow-query threshold configurable via env)
//   - Slow-query logging to console (swap for Winston/Datadog in production)
//   - Connection pool sizing
//   - Graceful shutdown on SIGINT/SIGTERM
// =============================================================================

const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------
const SLOW_QUERY_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS, 10) || 500;
const LOG_ALL_QUERIES = process.env.MONGO_LOG_ALL === 'true';

// ---------------------------------------------------------------------------
// SLOW QUERY LOGGER
// ---------------------------------------------------------------------------
// Mongoose emits a 'command' event on every outgoing query, including its
// execution time in milliseconds. We use this to flag anything over the
// SLOW_QUERY_MS threshold without requiring mongostat access in dev.
//
// In production: pipe output to a structured logger (Winston, Pino) or a
// monitoring system (Datadog, New Relic).

const attachQueryProfiler = () => {
  const conn = mongoose.connection;

  // Mongoose 6+ exposes the raw driver Command Monitoring. 
  // We subscribe to the underlying driver's command events.

  // Track in-flight commands: commandName+requestId → startTime.
  const inFlight = new Map();

  conn.on('commandStarted', (event) => {
    inFlight.set(event.requestId, {
      name:    event.commandName,
      db:      event.databaseName,
      startMs: Date.now(),
    });
  });

  conn.on('commandSucceeded', (event) => {
    const entry = inFlight.get(event.requestId);
    if (!entry) return;
    inFlight.delete(event.requestId);

    const durationMs = Date.now() - entry.startMs;

    if (durationMs >= SLOW_QUERY_MS) {
      console.warn(
        `[SlowQuery] ${entry.name} on ${entry.db} took ${durationMs}ms` +
        ` (threshold: ${SLOW_QUERY_MS}ms)`
      );
    } else if (LOG_ALL_QUERIES) {
      console.log(`[Query] ${entry.name} on ${entry.db} → ${durationMs}ms`);
    }
  });

  conn.on('commandFailed', (event) => {
    const entry = inFlight.get(event.requestId);
    inFlight.delete(event.requestId);
    const durationMs = entry ? Date.now() - entry.startMs : -1;
    console.error(
      `[QueryError] ${event.commandName} failed after ${durationMs}ms:`,
      event.failure?.message || event.failure
    );
  });
};

// ---------------------------------------------------------------------------
// CONNECT
// ---------------------------------------------------------------------------
const connectToDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not set.');
    }

    await mongoose.connect(mongoUri, {
      // ── Connection pool ────────────────────────────────────────────────────
      // maxPoolSize: how many simultaneous connections to MongoDB.
      // At 10 req/s per replica, 10 is fine; scale up for > 1000 concurrent users.
      maxPoolSize:  parseInt(process.env.MONGO_POOL_SIZE, 10) || 10,
      minPoolSize:  2,            // always keep 2 warm connections

      // ── Timeouts ───────────────────────────────────────────────────────────
      serverSelectionTimeoutMS: 5000,   // fail fast if no mongod responds
      socketTimeoutMS:          45000,  // close idle sockets after 45 s
      connectTimeoutMS:         10000,  // give up on initial connect after 10 s

      // ── Heartbeat ─────────────────────────────────────────────────────────
      heartbeatFrequencyMS: 10000,      // check replica set health every 10 s

      // ── Command monitoring (needed for slow-query logger) ─────────────────
      monitorCommands: true,
    });

    console.log(`[DB] Connected to MongoDB: ${mongoose.connection.host}`);
    console.log(`[DB] Slow-query threshold: ${SLOW_QUERY_MS}ms`);

    // Attach the profiler after the connection is established.
    attachQueryProfiler();

    // ── Ensure all model indexes are created (idempotent) ────────────────────
    // Delay slightly so all models are registered before syncIndexes runs.
    setTimeout(() => {
      ensureIndexes().catch((err) =>
        console.error('[DB] Index sync failed:', err.message)
      );
    }, 1000);

  } catch (error) {
    console.error('[DB] Connection failed:', error.message);
    process.exit(1);
  }
};

// ---------------------------------------------------------------------------
// ENSURE INDEXES
// ---------------------------------------------------------------------------
// Called once at startup to create any indexes that don't yet exist on the
// live collection. All indexes are idempotent — safe to call repeatedly.
//
// This is where the required compound indexes from the spec are registered
// in case the Mongoose schema definitions were added after first deployment.
const ensureIndexes = async () => {
  const db = mongoose.connection.db;
  if (!db) return;

  // ── orders collection ───────────────────────────────────────────────────
  const orders = db.collection('orders');
  await Promise.all([
    // Powers: merchant dashboard active orders
    orders.createIndex(
      { restaurantId: 1, status: 1, createdAt: -1 },
      { background: true }
    ),
    // Powers: customer order history
    orders.createIndex(
      { customerId: 1, createdAt: -1 },
      { background: true }
    ),
    // Powers: courier's active deliveries
    orders.createIndex(
      { courierId: 1, status: 1 },
      { background: true }
    ),
    // Powers: daily revenue aggregation (createdAt range over restaurant)
    orders.createIndex(
      { restaurantId: 1, createdAt: -1, 'payment.breakdown.total': 1 },
      { background: true }
    ),
    // Delivery-location spatial index for courier proximity queries.
    orders.createIndex(
      { 'deliveryAddress.location': '2dsphere' },
      { background: true }
    ),
  ]);

  // ── reviews collection ──────────────────────────────────────────────────
  const reviews = db.collection('reviews');
  await Promise.all([
    // Powers: GET /restaurants/:id/reviews (newest first)
    reviews.createIndex(
      { restaurantId: 1, createdAt: -1 },
      { background: true }
    ),
    // Powers: GET /users/me/reviews
    reviews.createIndex(
      { customerId: 1, createdAt: -1 },
      { background: true }
    ),
    // Powers: merchant dashboard sorted by quality
    reviews.createIndex(
      { restaurantId: 1, qualityScore: -1 },
      { background: true }
    ),
    // Powers: review analytics (isHidden filter is applied first)
    reviews.createIndex(
      { restaurantId: 1, isHidden: 1, 'sentiment.label': 1 },
      { background: true }
    ),
    // Unique constraint: one review per order
    reviews.createIndex(
      { orderId: 1 },
      { unique: true, background: true }
    ),
    // Daily rate-limit check: how many reviews did this user submit today?
    reviews.createIndex(
      { customerId: 1, createdAt: 1 },
      { background: true }
    ),
  ]);

  // ── restaurants collection ──────────────────────────────────────────────
  const restaurants = db.collection('restaurants');
  await Promise.all([
    // Primary geospatial index for $geoNear discovery
    restaurants.createIndex(
      { location: '2dsphere' },
      { background: true }
    ),
    // Powers: cuisine filter + rating sort
    restaurants.createIndex(
      { cuisineTypes: 1, 'rating.average': -1, isActive: 1, isOpen: 1 },
      { background: true }
    ),
    // Powers: city browsing page
    restaurants.createIndex(
      { 'address.city': 1, 'address.state': 1, isActive: 1 },
      { background: true }
    ),
    // Powers: featured/top-rated slot
    restaurants.createIndex(
      { isFeatured: 1, isActive: 1, 'rating.average': -1 },
      { background: true }
    ),
    // Full-text search
    restaurants.createIndex(
      { name: 'text', description: 'text', cuisineTypes: 'text' },
      {
        name:    'idx_restaurants_text_search',
        weights: { name: 10, cuisineTypes: 5, description: 1 },
        background: true,
      }
    ),
  ]);

  // ── users collection ───────────────────────────────────────────────────
  const users = db.collection('users');
  await Promise.all([
    // Unique email index
    users.createIndex({ email: 1 }, { name: 'idx_users_email_unique', unique: true, background: true }),
    // Spatial index for courier location
    users.createIndex({ 'courierProfile.currentLocation': '2dsphere' }, { name: 'idx_users_courier_loc_2dsphere', background: true }),
    // Spatial index for saved addresses
    users.createIndex({ 'addresses.location': '2dsphere' }, { name: 'idx_users_addresses_2dsphere', background: true }),
    // Role + active lookup
    users.createIndex({ role: 1, isActive: 1 }, { name: 'idx_users_role_active', background: true }),
    // Courier availability lookup
    users.createIndex({ role: 1, 'courierProfile.isAvailable': 1 }, { name: 'idx_users_courier_available', background: true }),
  ]);

  console.log('[DB] All indexes verified ✓');
};

// ---------------------------------------------------------------------------
// GRACEFUL SHUTDOWN
// ---------------------------------------------------------------------------
const shutdown = async (signal) => {
  console.log(`\n[DB] ${signal} received — closing MongoDB connection…`);
  await mongoose.connection.close();
  console.log('[DB] Connection closed. Exiting.');
  process.exit(0);
};

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------
module.exports = connectToDatabase;
