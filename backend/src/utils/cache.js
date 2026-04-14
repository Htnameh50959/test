// =============================================================================
// CACHE UTILITY  (backend/src/utils/cache.js)
// =============================================================================
// All Redis cache operations go through this module.
//
// Exported helpers:
//   getCacheKey(lat, lng, filters)          → deterministic string key
//   getCachedResults(cacheKey)              → parsed object or null
//   setCachedResults(cacheKey, data, ttl)   → stores JSON string
//   invalidateRestaurantCache(restaurantId) → deletes all related keys
//   getCacheMetrics()                       → hit/miss/error counters
//
// Resilience contract:
//   EVERY function catches its own errors and returns a safe fallback value
//   (null / false). The calling controller NEVER needs a try/catch for  
//   cache operations — a Redis outage is transparent to the user.
//
// Cache key anatomy:
//   search:{lat_4dp}:{lng_4dp}:{filterHash}
//   restaurant:{restaurantId}
//
//   lat/lng are rounded to 4 decimal places (~11 m precision) so nearby
//   requests share the same cache entry instead of generating a new key
//   for every GPS coordinate.
//   filterHash is a stable SHA-256 of the sorted filter object.
// =============================================================================

const crypto   = require('crypto');
const { getClient, isReady, metrics } = require('../config/redis');

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

// Key prefixes — changing these effectively invalidates all existing keys.
const PREFIX_SEARCH     = 'search';
const PREFIX_RESTAURANT = 'restaurant';

// Default TTL in seconds.
const DEFAULT_TTL = 300; // 5 minutes

// How many decimal places to round lat/lng to for key generation.
// 4 dp ≈ 11 m resolution — good enough for restaurant search cells.
const COORD_PRECISION = 4;

// ---------------------------------------------------------------------------
// INTERNAL HELPERS
// ---------------------------------------------------------------------------

/**
 * Round a coordinate to COORD_PRECISION decimal places.
 * Ensures nearby GPS jitter doesn't produce unique cache keys.
 */
const roundCoord = (n) => parseFloat(parseFloat(n).toFixed(COORD_PRECISION));

/**
 * Produce a compact, stable SHA-256 hash of an arbitrary filter object.
 * Keys are sorted so { a:1, b:2 } and { b:2, a:1 } produce the same hash.
 *
 * Returns an 8-character hex prefix — short enough for a Redis key,
 * long enough to avoid accidental collisions for different filter combos.
 */
const hashFilters = (filters) => {
  if (!filters || Object.keys(filters).length === 0) return 'nofilter';

  // Recursively sort keys so object serialisation is deterministic.
  const sortObjectKeys = (obj) => {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;
    return Object.keys(obj)
      .sort()
      .reduce((acc, k) => { acc[k] = sortObjectKeys(obj[k]); return acc; }, {});
  };

  const sorted     = sortObjectKeys(filters);
  const serialised = JSON.stringify(sorted);
  return crypto.createHash('sha256').update(serialised).digest('hex').slice(0, 8);
};

// ---------------------------------------------------------------------------
// EXPORTED HELPER 1: getCacheKey
// ---------------------------------------------------------------------------
/**
 * Generate a deterministic cache key for a restaurant search.
 *
 * @param {number|string} lat     - latitude
 * @param {number|string} lng     - longitude
 * @param {object}        filters - any combination of search filter params
 * @returns {string}              - e.g. "search:12.9716:77.5946:a3f1c2d4"
 *
 * @example
 * getCacheKey(12.97159, 77.59460, { cuisineTypes: ['Indian'], minRating: 4 })
 * // → "search:12.9716:77.5946:9e3a1b2c"
 */
const getCacheKey = (lat, lng, filters = {}) => {
  const rLat = roundCoord(lat);
  const rLng = roundCoord(lng);
  const hash = hashFilters(filters);
  return `${PREFIX_SEARCH}:${rLat}:${rLng}:${hash}`;
};

// ---------------------------------------------------------------------------
// EXPORTED HELPER 2: getCachedResults
// ---------------------------------------------------------------------------
/**
 * Retrieve and parse a cached search result from Redis.
 *
 * Returns null on cache miss, Redis error, or when Redis is unavailable.
 * Updates hit/miss/bypass metrics.
 *
 * @param   {string}        cacheKey
 * @returns {object|null}   the parsed result, or null
 */
const getCachedResults = async (cacheKey) => {
  // Fast path: if Redis isn't connected, bypass immediately.
  if (!isReady()) {
    metrics.bypasses++;
    return null;
  }

  try {
    const client = getClient();
    const raw    = await client.get(cacheKey);

    if (raw === null) {
      metrics.misses++;
      return null;
    }

    metrics.hits++;
    return JSON.parse(raw);

  } catch (err) {
    metrics.errors++;
    console.error(`[Cache] getCachedResults error for key "${cacheKey}": ${err.message}`);
    return null; // graceful fallback — caller will hit the DB
  }
};

// ---------------------------------------------------------------------------
// EXPORTED HELPER 3: setCachedResults
// ---------------------------------------------------------------------------
/**
 * Serialise and store a search result in Redis with a TTL.
 *
 * Silent no-op if Redis is unavailable — never throws.
 *
 * @param {string}  cacheKey
 * @param {object}  data      - the result object to cache
 * @param {number}  [ttl]     - seconds until expiry (default 300)
 */
const setCachedResults = async (cacheKey, data, ttl = DEFAULT_TTL) => {
  if (!isReady()) return; // Redis down — skip silently

  try {
    const client     = getClient();
    const serialised = JSON.stringify(data);

    // SET key value EX ttl  — atomic set-with-expiry in one round-trip.
    await client.set(cacheKey, serialised, 'EX', ttl);

  } catch (err) {
    metrics.errors++;
    console.error(`[Cache] setCachedResults error for key "${cacheKey}": ${err.message}`);
    // Don't re-throw — a write failure is non-critical.
  }
};

// ---------------------------------------------------------------------------
// EXPORTED HELPER 4: invalidateRestaurantCache
// ---------------------------------------------------------------------------
/**
 * Delete all search cache entries that might contain data from a specific
 * restaurant, plus the restaurant's own detail cache key.
 *
 * Strategy:
 *   We cannot know exactly which search-result pages a restaurant appears in
 *   (it depends on every caller's lat/lng + filters). The safest approach is
 *   to flush ALL `search:*` keys using SCAN + DEL.
 *
 *   This is acceptable because:
 *     a) Cache invalidation is infrequent (only on menu/rating/status changes)
 *     b) Keys are cheap to regenerate (DB queries are fast)
 *     c) Redis SCAN is non-blocking and cursor-based (safe on large keyspaces)
 *
 *   If your keyspace grows very large, consider prefixing keys by city/area
 *   and only flushing keys in the relevant geographic bucket instead.
 *
 * @param {string} restaurantId - MongoDB ObjectId string
 */
const invalidateRestaurantCache = async (restaurantId) => {
  if (!isReady()) return; // Redis down — skip silently

  try {
    const client = getClient();
    let totalDeleted = 0;

    // ── 1. Delete the restaurant's own detail cache ───────────────────────
    const detailKey = `${PREFIX_RESTAURANT}:${restaurantId}`;
    const detailDel = await client.del(detailKey);
    totalDeleted += detailDel;

    // ── 2. Scan and delete all search:* keys ─────────────────────────────
    // SCAN uses a cursor so it doesn't block Redis even with millions of keys.
    let cursor = '0';
    do {
      // SCAN cursor MATCH pattern COUNT batch-size
      const [nextCursor, keys] = await client.scan(
        cursor,
        'MATCH', `${PREFIX_SEARCH}:*`,
        'COUNT', 100            // scan up to 100 keys per iteration
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        // DEL accepts multiple keys in one command for efficiency.
        const deleted = await client.del(...keys);
        totalDeleted += deleted;
      }
    } while (cursor !== '0'); // cursor returns to '0' when full scan is done

    metrics.invalidations++;
    console.log(
      `[Cache] Invalidated ${totalDeleted} key(s) for restaurant ${restaurantId}.`
    );

  } catch (err) {
    metrics.errors++;
    console.error(`[Cache] invalidateRestaurantCache error: ${err.message}`);
    // Don't re-throw — stale cache is better than a crashed request.
  }
};

// ---------------------------------------------------------------------------
// EXPORTED HELPER 5: cacheRestaurantDetail / getRestaurantDetailCache
// ---------------------------------------------------------------------------
// Separate detail-level cache (shorter TTL: 10 min) for the GET /:id endpoint.

const DETAIL_TTL = 600; // 10 minutes

/**
 * Store a single restaurant's full detail response.
 * @param {string} restaurantId
 * @param {object} data
 */
const cacheRestaurantDetail = async (restaurantId, data) => {
  const key = `${PREFIX_RESTAURANT}:${restaurantId}`;
  await setCachedResults(key, data, DETAIL_TTL);
};

/**
 * Retrieve a single restaurant's cached detail response.
 * @param   {string}        restaurantId
 * @returns {object|null}
 */
const getRestaurantDetailCache = async (restaurantId) => {
  const key = `${PREFIX_RESTAURANT}:${restaurantId}`;
  return getCachedResults(key);
};

// ---------------------------------------------------------------------------
// EXPORTED HELPER 6: getCacheMetrics
// ---------------------------------------------------------------------------
/**
 * Returns a snapshot of cache performance counters.
 * Expose this via an admin/health endpoint to monitor cache efficiency.
 *
 * @returns {{
 *   hits: number, misses: number, errors: number,
 *   bypasses: number, invalidations: number,
 *   hitRate: string, redisReady: boolean
 * }}
 */
const getCacheMetrics = () => {
  const total    = metrics.hits + metrics.misses;
  const hitRate  = total > 0 ? ((metrics.hits / total) * 100).toFixed(1) + '%' : 'N/A';

  return {
    hits:          metrics.hits,
    misses:        metrics.misses,
    errors:        metrics.errors,
    bypasses:      metrics.bypasses,
    invalidations: metrics.invalidations,
    hitRate,
    redisReady:    isReady(),
  };
};

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------
module.exports = {
  getCacheKey,
  getCachedResults,
  setCachedResults,
  invalidateRestaurantCache,
  cacheRestaurantDetail,
  getRestaurantDetailCache,
  getCacheMetrics,
  // Constants exposed for use in tests / other modules.
  DEFAULT_TTL,
  DETAIL_TTL,
};
