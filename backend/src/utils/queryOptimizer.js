// =============================================================================
// QUERY OPTIMIZER  (backend/src/utils/queryOptimizer.js)
// =============================================================================
// Production utilities for:
//   1. Explaining query plans (EXECUTIONSTATS / ALLPLANSEXECUTION)
//   2. Logging slow aggregation pipelines
//   3. Lean query helpers — pre-built optimised queries for the 4 critical paths
//   4. Analytics result caching (wraps Redis cache)
//   5. Performance benchmarking (before/after comparison)
//
// Usage:
//   const { explainQuery, runWithTiming, cachedAggregation } =
//     require('../utils/queryOptimizer');
// =============================================================================

const mongoose  = require('mongoose');

// Try to import the cache utility; gracefully skip if unavailable.
let cacheUtil = null;
try {
  cacheUtil = require('./cache');
} catch (_) {
  console.warn('[QueryOptimizer] Cache utility not found — caching disabled.');
}

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------
const SLOW_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS, 10) || 100;

// Cache TTLs (seconds) — volatility-driven.
const TTL = {
  restaurantDetail:   10 * 60,   // 10 min — changes infrequently
  restaurantMenu:      5 * 60,   //  5 min — merchant may toggle availability
  searchResults:       5 * 60,   //  5 min — standard search window
  popularItems:       15 * 60,   // 15 min — aggregation is expensive
  salesAnalytics:     15 * 60,   // 15 min — tolerate slight staleness
  peakHours:          30 * 60,   // 30 min — historical data changes slowly
  reviewStats:        10 * 60,   // 10 min — updates on new review
  orderHistory:        2 * 60,   //  2 min — active orders change fast
};

// ---------------------------------------------------------------------------
// 1. EXPLAIN QUERY
// ---------------------------------------------------------------------------

/**
 * Run a Mongoose Query or Aggregate through explain() and return the plan.
 *
 * @param {mongoose.Query | mongoose.Aggregate} queryOrAgg
 * @param {'queryPlanner'|'executionStats'|'allPlansExecution'} verbosity
 * @returns {Promise<object>}  the raw explain document
 */
const explainQuery = async (queryOrAgg, verbosity = 'executionStats') => {
  const plan = await queryOrAgg.explain(verbosity);
  return parseExplainPlan(plan, verbosity);
};

/**
 * Parse an explain plan into an actionable summary.
 * Returns a flat object with the fields most useful for performance tuning.
 *
 * Handles both find() and aggregate() explain shapes.
 */
const parseExplainPlan = (plan, verbosity) => {
  const summary = {
    verbosity,
    rawPlan: plan,
  };

  try {
    // ── find() plan shape ────────────────────────────────────────────────
    if (plan.queryPlanner) {
      const qp = plan.queryPlanner;
      summary.namespace     = qp.namespace;
      summary.winningPlan   = qp.winningPlan?.inputStage?.stage || qp.winningPlan?.stage;
      summary.indexUsed     = extractIndexName(qp.winningPlan);
      summary.rejectedPlans = (qp.rejectedPlans || []).length;
    }

    // ── executionStats ───────────────────────────────────────────────────
    if (plan.executionStats) {
      const es = plan.executionStats;
      summary.executionTimeMs    = es.executionTimeMillis;
      summary.totalDocsExamined  = es.totalDocsExamined;
      summary.totalKeysExamined  = es.totalKeysExamined;
      summary.nReturned          = es.nReturned;

      // Efficiency ratio: docs examined vs docs returned.
      // 1.0 = perfect. > 10 = consider a better index or query rewrite.
      summary.examineRatio = es.nReturned > 0
        ? Math.round((es.totalDocsExamined / es.nReturned) * 10) / 10
        : null;

      summary.isSlowQuery = es.executionTimeMillis >= SLOW_THRESHOLD_MS;
      summary.recommendation = deriveRecommendation(summary);
    }

    // ── aggregate() explain shape ────────────────────────────────────────
    if (plan.stages || plan.queryPlanner?.winningPlan) {
      summary.type = 'aggregate';
    } else {
      summary.type = 'find';
    }

  } catch (_) {
    // Return raw plan if parsing fails.
  }

  return summary;
};

const extractIndexName = (winningPlan) => {
  if (!winningPlan) return 'COLLSCAN (no index)';
  if (winningPlan.stage === 'COLLSCAN') return 'COLLSCAN (no index — add index!)';
  if (winningPlan.indexName) return winningPlan.indexName;
  if (winningPlan.inputStage) return extractIndexName(winningPlan.inputStage);
  return 'unknown';
};

const deriveRecommendation = (summary) => {
  const { winningPlan, examineRatio, executionTimeMs } = summary;

  if (winningPlan?.includes('COLLSCAN')) {
    return '⚠️  COLLSCAN detected — add an index on the query fields immediately.';
  }
  if (examineRatio > 100) {
    return `⚠️  High examine ratio (${examineRatio}×) — the current index is low-selectivity. Consider a more specific compound index.`;
  }
  if (examineRatio > 10) {
    return `ℹ️  Moderate examine ratio (${examineRatio}×) — adding a covered index may help.`;
  }
  if (executionTimeMs >= SLOW_THRESHOLD_MS) {
    return `⏱  Query is slow (${executionTimeMs}ms ≥ ${SLOW_THRESHOLD_MS}ms threshold) but the index is being used. Consider $projection or result caching.`;
  }
  return `✅  Query plan looks healthy (${executionTimeMs}ms, ratio ${examineRatio}×).`;
};

// ---------------------------------------------------------------------------
// 2. RUN WITH TIMING
// ---------------------------------------------------------------------------

/**
 * Execute any async function and measure its wall-clock time.
 * Logs a warning if it exceeds SLOW_THRESHOLD_MS.
 *
 * @param {string}   label   — human-readable identifier for the log
 * @param {Function} fn      — async function to time
 * @returns {Promise<{ result: any, durationMs: number }>}
 */
const runWithTiming = async (label, fn) => {
  const start  = Date.now();
  const result = await fn();
  const durationMs = Date.now() - start;

  if (durationMs >= SLOW_THRESHOLD_MS) {
    console.warn(`[SlowOperation] "${label}" took ${durationMs}ms (threshold: ${SLOW_THRESHOLD_MS}ms)`);
  } else {
    console.log(`[Timing] "${label}" → ${durationMs}ms`);
  }

  return { result, durationMs };
};

// ---------------------------------------------------------------------------
// 3. CACHED AGGREGATION
// ---------------------------------------------------------------------------

/**
 * Run a MongoDB aggregation pipeline with Redis caching.
 *
 * If a cached result exists it is returned immediately (bypassing Mongo).
 * Otherwise runs the pipeline, stores the result, and returns it.
 *
 * @param {string}   cacheKey   — unique Redis key for this query
 * @param {number}   ttl        — seconds to cache the result
 * @param {Function} fn         — async function returning the aggregation result
 * @returns {Promise<{ data: any, fromCache: boolean, durationMs: number }>}
 */
const cachedAggregation = async (cacheKey, ttl, fn) => {
  // Try cache first.
  if (cacheUtil) {
    const cached = await cacheUtil.getCachedResults(cacheKey);
    if (cached) {
      return { data: cached, fromCache: true, durationMs: 0 };
    }
  }

  // Run aggregation.
  const { result, durationMs } = await runWithTiming(cacheKey, fn);

  // Store result in cache (fire-and-forget).
  if (cacheUtil && result !== null && result !== undefined) {
    cacheUtil.setCachedResults(cacheKey, result, ttl).catch(() => {});
  }

  return { data: result, fromCache: false, durationMs };
};

// ---------------------------------------------------------------------------
// 4. OPTIMISED QUERY BUILDERS
// ---------------------------------------------------------------------------
// These helpers encapsulate the best-practice query construction for the 4
// critical hot-path queries identified in the spec.

/**
 * (a) RESTAURANT SEARCH — Target: < 200 ms
 *
 * Optimisation rationale:
 *   • $geoNear MUST be the first stage to use the 2dsphere index.
 *   • $match after $geoNear filters by cuisine/price/rating using
 *     the compound (cuisineTypes, rating.average, isActive, isOpen) index.
 *   • $project immediately limits the document payload — avoids transferring
 *     the full `menu` array (can be hundreds of KB) over the network.
 *   • $facet runs count and paginated results in ONE round-trip.
 *
 * @param {{ lat, lng, radius, cuisineTypes, minRating, priceRange, features, isOpen, limit, skip }} params
 * @returns {Promise<{results:object[], total:number, queryMs:number}>}
 */
const buildRestaurantSearchPipeline = ({
  lat, lng,
  radius       = 5000,
  cuisineTypes = [],
  minRating    = 0,
  priceRange   = [],
  features     = [],
  isOpen,
  limit        = 20,
  skip         = 0,
}) => {
  const pipeline = [];

  // Stage 1: $geoNear — MUST be first. Uses 2dsphere index.
  pipeline.push({
    $geoNear: {
      near:           { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      distanceField:  'distanceMetres',
      maxDistance:    parseFloat(radius),
      spherical:      true,
      query:          { isActive: true },     // pre-filter before distance calc
    },
  });

  // Stage 2: $match — further filters (uses compound index after $geoNear).
  const matchFilter = {};
  if (cuisineTypes.length) matchFilter.cuisineTypes  = { $in: cuisineTypes };
  if (minRating)           matchFilter['rating.average'] = { $gte: parseFloat(minRating) };
  if (priceRange.length)   matchFilter.priceRange    = { $in: priceRange };
  if (features.length)     matchFilter.features      = { $all: features };
  if (isOpen !== undefined) matchFilter.isOpen        = isOpen;

  if (Object.keys(matchFilter).length > 0) {
    pipeline.push({ $match: matchFilter });
  }

  // Stage 3: $addFields — compute relevance score. distanceKm avoids /1000 later.
  pipeline.push({
    $addFields: {
      distanceKm:     { $divide: ['$distanceMetres', 1000] },
      relevanceScore: {
        $add: [
          // 40% weight: normalised rating (0–1 scale)
          { $multiply: [{ $divide: [{ $ifNull: ['$rating.average', 0] }, 5] }, 0.4] },
          // 60% weight: proximity (closer = higher score)
          { $multiply: [{ $divide: [1, { $add: [1, { $divide: ['$distanceMetres', 1000] }] }] }, 0.6] },
        ],
      },
    },
  });

  // Stage 4: $sort by relevance score descending.
  pipeline.push({ $sort: { relevanceScore: -1, 'rating.average': -1 } });

  // Stage 5: $project — send only what the card UI needs. Drop the huge `menu` array.
  pipeline.push({
    $project: {
      name:                  1,
      slug:                  1,
      cuisineTypes:          1,
      coverImage:            1,
      rating:                1,
      'address.city':        1,
      'address.state':       1,
      deliveryFee:           1,
      minimumOrder:          1,
      estimatedDeliveryTime: 1,
      isOpen:                1,
      isVerified:            1,
      isFeatured:            1,
      badges:                1,
      distanceKm:            { $round: ['$distanceKm', 2] },
      relevanceScore:        { $round: ['$relevanceScore', 4] },
    },
  });

  // Stage 6: $facet — get paginated results AND total count in one DB pass.
  pipeline.push({
    $facet: {
      results: [{ $skip: skip }, { $limit: limit }],
      count:   [{ $count: 'total' }],
    },
  });

  return pipeline;
};

/**
 * (b) USER ORDER HISTORY — Target: < 100 ms
 *
 * Optimisation rationale:
 *   • Filter uses (customerId, createdAt) compound index — index covers the sort.
 *   • $project drops statusHistory and gatewayResponse (heavy nested arrays).
 *   • .lean() returns plain JS objects (skips Mongoose document hydration).
 *   • No $lookup — restaurant name is populated by Mongoose with a separate
 *     single-document query per restaurant, but results are already indexed.
 *
 * @param {string} customerId
 * @param {{ status?, limit, skip }} opts
 */
const buildOrderHistoryQuery = (customerId, { status, limit = 20, skip = 0 } = {}) => {
  const filter = { customerId: new mongoose.Types.ObjectId(customerId) };
  if (status) {
    const statuses = status.split(',').map((s) => s.trim().toUpperCase());
    filter.status  = statuses.length === 1 ? statuses[0] : { $in: statuses };
  }

  return {
    filter,
    projection: {
      orderNumber:    1,
      status:         1,
      orderType:      1,
      restaurantId:   1,
      items:          1,
      'payment.breakdown': 1,
      'payment.method':    1,
      estimatedDeliveryAt: 1,
      createdAt:      1,
      // Exclude heavyweight fields from list view.
      statusHistory:  0,
      'payment.gatewayResponse': 0,
    },
    sort:  { createdAt: -1 },
    skip,
    limit,
  };
};

/**
 * (c) MERCHANT ACTIVE ORDERS — Target: < 50 ms
 *
 * Optimisation rationale:
 *   • Uses (restaurantId, status, createdAt) compound index.
 *   • $in on a small enum set of active statuses hits the index efficiently.
 *   • Projection removes statusHistory per-order (each can be dozens of entries).
 *   • .lean() — no virtuals needed; the dashboard renders raw data.
 *
 * @param {string} restaurantId
 * @param {{ statuses?, limit }} opts
 */
const buildActiveOrdersQuery = (restaurantId, {
  statuses = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP'],
  limit    = 100,
} = {}) => ({
  filter: {
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
    status:       { $in: statuses },
  },
  projection: {
    orderNumber:    1,
    status:         1,
    orderType:      1,
    customerId:     1,
    items:          1,
    'payment.breakdown.total': 1,
    estimatedDeliveryAt:       1,
    createdAt:                 1,
    tableNumber:               1,
    specialInstructions:       1,
    statusHistory:             0,
    'payment.gatewayResponse': 0,
  },
  sort:  { createdAt: 1 },  // oldest first — most urgent at top
  limit,
});

/**
 * (d) REVIEW AGGREGATION FOR RESTAURANT — Target: < 150 ms
 *
 * Optimisation rationale:
 *   • $match first with (restaurantId, isHidden) — hits the compound index.
 *   • Aggregates directly on the index key fields (restaurantId, rating, sentiment.label).
 *   • No $lookup — all needed fields are on the Review document itself.
 *   • Results are cached for 10 minutes (TTL.reviewStats).
 *
 * Builds the aggregation pipeline only — caller runs it.
 */
const buildReviewAggregationPipeline = (restaurantId) => [
  // Stage 1: $match — uses (restaurantId, isHidden) index.
  {
    $match: {
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      isHidden:     false,
    },
  },
  // Stage 2: $group — single pass over all matching documents.
  {
    $group: {
      _id:          '$restaurantId',
      totalReviews: { $sum: 1 },
      avgRating:    { $avg: '$rating.overall' },
      avgQuality:   { $avg: '$qualityScore' },
      avgSentiment: { $avg: '$sentiment.score' },
      // Star distribution.
      star5: { $sum: { $cond: [{ $gte: ['$rating.overall', 4.5] }, 1, 0] } },
      star4: { $sum: { $cond: [{ $and: [{ $gte: ['$rating.overall', 3.5] }, { $lt: ['$rating.overall', 4.5] }] }, 1, 0] } },
      star3: { $sum: { $cond: [{ $and: [{ $gte: ['$rating.overall', 2.5] }, { $lt: ['$rating.overall', 3.5] }] }, 1, 0] } },
      star2: { $sum: { $cond: [{ $and: [{ $gte: ['$rating.overall', 1.5] }, { $lt: ['$rating.overall', 2.5] }] }, 1, 0] } },
      star1: { $sum: { $cond: [{ $lt: ['$rating.overall', 1.5] }, 1, 0] } },
      // Sentiment distribution.
      sentimentPos: { $sum: { $cond: [{ $eq: ['$sentiment.label', 'positive'] }, 1, 0] } },
      sentimentNeu: { $sum: { $cond: [{ $eq: ['$sentiment.label', 'neutral']  }, 1, 0] } },
      sentimentNeg: { $sum: { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, 1, 0] } },
      // Category averages.
      foodAvg:     { $avg: '$rating.categories.food' },
      serviceAvg:  { $avg: '$rating.categories.service' },
      valueAvg:    { $avg: '$rating.categories.value' },
      deliveryAvg: { $avg: '$rating.categories.delivery' },
    },
  },
  // Stage 3: $project — round numbers, remove internal _id.
  {
    $project: {
      _id:          0,
      totalReviews: 1,
      avgRating:    { $round: ['$avgRating', 1] },
      avgQuality:   { $round: ['$avgQuality', 1] },
      avgSentiment: { $round: ['$avgSentiment', 2] },
      starDistribution: { 5: '$star5', 4: '$star4', 3: '$star3', 2: '$star2', 1: '$star1' },
      sentimentDistribution: {
        positive: '$sentimentPos',
        neutral:  '$sentimentNeu',
        negative: '$sentimentNeg',
      },
      categoryAverages: {
        food:     { $round: ['$foodAvg',     1] },
        service:  { $round: ['$serviceAvg',  1] },
        value:    { $round: ['$valueAvg',    1] },
        delivery: { $round: ['$deliveryAvg', 1] },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// 5. PERFORMANCE BENCHMARK HELPER
// ---------------------------------------------------------------------------

/**
 * Run the same function N times and return min/max/avg stats.
 * Useful for local before/after comparison.
 *
 * @param {string}   label
 * @param {Function} fn
 * @param {number}   runs
 */
const benchmark = async (label, fn, runs = 5) => {
  const times = [];
  for (let i = 0; i < runs; i++) {
    const start = Date.now();
    await fn();
    times.push(Date.now() - start);
  }
  const min = Math.min(...times);
  const max = Math.max(...times);
  const avg = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
  console.log(`[Benchmark] "${label}" over ${runs} runs → min:${min}ms avg:${avg}ms max:${max}ms`);
  return { min, avg, max, times };
};

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------
module.exports = {
  // Core utilities
  explainQuery,
  runWithTiming,
  cachedAggregation,
  benchmark,

  // Query builders
  buildRestaurantSearchPipeline,
  buildOrderHistoryQuery,
  buildActiveOrdersQuery,
  buildReviewAggregationPipeline,

  // TTL constants (import these in controllers for consistent caching)
  TTL,
};
