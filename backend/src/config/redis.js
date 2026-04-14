// =============================================================================
// REDIS CLIENT  (backend/src/config/redis.js)
// =============================================================================
// Creates and exports a single shared ioredis client instance.
//
// Design decisions:
//   • ioredis is used instead of the deprecated `redis` npm package because it
//     has built-in reconnect logic, Promises by default, and Cluster support.
//   • The client is created lazily but kept as a module-level singleton —
//     all parts of the app share one TCP connection to Redis.
//   • `enableOfflineQueue: false` means commands issued while Redis is down
//     fail immediately (rejected Promise) rather than queuing up forever.
//     This is what allows the graceful fallback in cache.js to work correctly.
//   • We track `isReady` explicitly so callers can skip Redis calls entirely
//     when the connection is known to be down, avoiding unnecessary latency.
//   • `lazyConnect: true` means the TCP connection is not opened until
//     client.connect() is called — we control exactly when to connect.
// =============================================================================

const Redis = require('ioredis');

// ---------------------------------------------------------------------------
// State flags (module-level so all importers share the same state)
// ---------------------------------------------------------------------------
let client = null;
let isReady = false;

// ---------------------------------------------------------------------------
// Metrics counters — exported so cache.js can increment them
// ---------------------------------------------------------------------------
const metrics = {
  hits:        0,  // cache hits
  misses:      0,  // cache misses
  errors:      0,  // Redis errors
  bypasses:    0,  // times Redis was down and we skipped it
  invalidations: 0,// cache invalidation calls
};

// ---------------------------------------------------------------------------
// createClient — initialise and connect the singleton
// ---------------------------------------------------------------------------
const createClient = () => {
  if (client) return client; // already created

  const redisUrl = 'redis://default:Rm4WMUgpWGvACeyz5VbWrLGlBCHJJVVY@redis-10735.crce182.ap-south-1-1.ec2.cloud.redislabs.com:10735'; // e.g. redis://localhost:6379

  const options = {
    // Connection
    host:               process.env.REDIS_HOST     || 'localhost',
    port:               parseInt(process.env.REDIS_PORT || '6379', 10),
    password:           process.env.REDIS_PASSWORD || undefined,
    db:                 parseInt(process.env.REDIS_DB   || '0',    10),

    // If REDIS_URL is set it overrides host/port/password above.
    ...(redisUrl ? { lazyConnect: false } : { lazyConnect: true }),

    // Behaviour when Redis is unreachable:
    //   • Don't queue commands — fail fast so the app falls back to DB.
    enableOfflineQueue: false,

    // Reconnect strategy: exponential backoff capped at 10 s.
    // Returning null stops retrying (after ~30 attempts here).
    retryStrategy(attempt) {
      if (attempt > 30) {
        console.error('[Redis] Too many reconnect attempts — giving up.');
        return null; // stop retrying
      }
      const delay = Math.min(attempt * 200, 10_000);
      console.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${attempt})…`);
      return delay;
    },

    // Don't spam the console with "Max retries reached" errors.
    maxRetriesPerRequest: null,
  };

  // If a full REDIS_URL is provided (e.g. from Railway / Render), use it.
  client = redisUrl ? new Redis(redisUrl, options) : new Redis(options);

  // ── Event handlers ──────────────────────────────────────────────────────
  client.on('connect', () => {
    console.log('[Redis] Connection established.');
  });

  client.on('ready', () => {
    isReady = true;
    console.log('[Redis] Client ready — commands will now be sent.');
  });

  client.on('error', (err) => {
    // Don't mark as not-ready for every transient error; only on close/end.
    metrics.errors++;
    // Log only the message to avoid flooding logs with stack traces.
    console.error(`[Redis] Error: ${err.message}`);
  });

  client.on('close', () => {
    isReady = false;
    console.warn('[Redis] Connection closed.');
  });

  client.on('reconnecting', () => {
    isReady = false;
  });

  client.on('end', () => {
    isReady = false;
    console.warn('[Redis] Connection ended permanently.');
  });

  // If lazyConnect, explicitly open the connection.
  if (!redisUrl) {
    client.connect().catch((err) => {
      // connect() rejects if Redis is unreachable at startup.
      // We don't crash the server — the app works without Redis.
      console.warn(`[Redis] Initial connection failed (${err.message}). Running without cache.`);
    });
  }

  return client;
};

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------

module.exports = {
  /** Call once at server startup to open the Redis connection. */
  connectRedis: createClient,

  /** The ioredis client instance (may be null before connectRedis is called). */
  getClient: () => client,

  /** True when Redis is fully connected and accepting commands. */
  isReady: () => isReady,

  /** Shared metrics object — mutated by cache.js */
  metrics,
};
