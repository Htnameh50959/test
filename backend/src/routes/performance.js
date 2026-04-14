// =============================================================================
// QUERY PERFORMANCE ADMIN ROUTES  (backend/src/routes/performance.js)
// =============================================================================
// Admin-only endpoints to inspect query plans and run benchmarks live.
//
// Base: /api/v1/admin/performance
//
// GET  /explain/restaurant-search        — explain the geoNear search pipeline
// GET  /explain/order-history            — explain order history query
// GET  /explain/active-orders            — explain merchant active orders query
// GET  /explain/review-aggregation       — explain the review stats aggregation
// GET  /benchmark                        — run all 4 queries 5× and return stats
// GET  /indexes                          — list all indexes with usage stats
// =============================================================================

const express    = require('express');
const router     = express.Router();
const mongoose   = require('mongoose');

const { protect, authorize } = require('../middleware/auth');
const {
  explainQuery,
  benchmark,
  buildRestaurantSearchPipeline,
  buildOrderHistoryQuery,
  buildActiveOrdersQuery,
  buildReviewAggregationPipeline,
  runWithTiming,
} = require('../utils/queryOptimizer');

const Order      = require('../models/Order');
const Review     = require('../models/Review');
const Restaurant = require('../models/Restaurant');

// All performance routes are admin-only.
router.use(protect, authorize('admin'));

// ---------------------------------------------------------------------------
// Helper: require a valid :restaurantId or return dummy ObjectId
// ---------------------------------------------------------------------------
const getSampleRestaurantId = async () => {
  const r = await Restaurant.findOne({ isActive: true }).select('_id').lean();
  return r ? r._id : new mongoose.Types.ObjectId();
};

const getSampleCustomerId = async () => {
  const o = await Order.findOne({}).select('customerId').lean();
  return o ? o.customerId : new mongoose.Types.ObjectId();
};

// ===========================================================================
// GET /api/v1/admin/performance/explain/restaurant-search
// ===========================================================================
router.get('/explain/restaurant-search', async (req, res, next) => {
  try {
    const { lat = '12.9716', lng = '77.5946', radius = '5000' } = req.query;
    const pipeline = buildRestaurantSearchPipeline({
      lat, lng, radius, limit: 5, skip: 0,
    });

    // $facet doesn't support explain() directly — remove it and explain stages.
    const explainablePipeline = pipeline.filter((s) => !s.$facet);
    const plan = await Restaurant.aggregate(explainablePipeline).explain('executionStats');

    res.json({ success: true, query: 'restaurant-search', plan });
  } catch (err) { next(err); }
});

// ===========================================================================
// GET /api/v1/admin/performance/explain/order-history
// ===========================================================================
router.get('/explain/order-history', async (req, res, next) => {
  try {
    const customerId = await getSampleCustomerId();
    const { filter, projection, sort, skip, limit } = buildOrderHistoryQuery(
      customerId.toString(), { limit: 20, skip: 0 }
    );

    const plan = await Order.find(filter, projection)
      .sort(sort).skip(skip).limit(limit)
      .explain('executionStats');

    res.json({ success: true, query: 'order-history', plan });
  } catch (err) { next(err); }
});

// ===========================================================================
// GET /api/v1/admin/performance/explain/active-orders
// ===========================================================================
router.get('/explain/active-orders', async (req, res, next) => {
  try {
    const restaurantId = await getSampleRestaurantId();
    const { filter, projection, sort, limit } = buildActiveOrdersQuery(
      restaurantId.toString()
    );

    const plan = await Order.find(filter, projection)
      .sort(sort).limit(limit)
      .explain('executionStats');

    res.json({ success: true, query: 'active-orders', plan });
  } catch (err) { next(err); }
});

// ===========================================================================
// GET /api/v1/admin/performance/explain/review-aggregation
// ===========================================================================
router.get('/explain/review-aggregation', async (req, res, next) => {
  try {
    const restaurantId = await getSampleRestaurantId();
    const pipeline     = buildReviewAggregationPipeline(restaurantId.toString());
    const plan         = await Review.aggregate(pipeline).explain('executionStats');

    res.json({ success: true, query: 'review-aggregation', plan });
  } catch (err) { next(err); }
});

// ===========================================================================
// GET /api/v1/admin/performance/benchmark
// ===========================================================================
// Runs each critical query 5 times and reports min/avg/max.
router.get('/benchmark', async (req, res, next) => {
  try {
    const restaurantId = await getSampleRestaurantId();
    const customerId   = await getSampleCustomerId();

    const [restaurantSearch, orderHistory, activeOrders, reviewAgg] = await Promise.all([

      benchmark('restaurant-search', async () => {
        const pipeline = buildRestaurantSearchPipeline({
          lat: 12.9716, lng: 77.5946, radius: 5000, limit: 20, skip: 0
        });
        await Restaurant.aggregate(pipeline);
      }),

      benchmark('order-history', async () => {
        const q = buildOrderHistoryQuery(customerId.toString(), { limit: 20, skip: 0 });
        await Order.find(q.filter, q.projection).sort(q.sort).limit(q.limit).lean();
      }),

      benchmark('active-orders', async () => {
        const q = buildActiveOrdersQuery(restaurantId.toString());
        await Order.find(q.filter, q.projection).sort(q.sort).limit(q.limit).lean();
      }),

      benchmark('review-aggregation', async () => {
        const pipeline = buildReviewAggregationPipeline(restaurantId.toString());
        await Review.aggregate(pipeline);
      }),
    ]);

    const targets = {
      'restaurant-search': 200,
      'order-history':     100,
      'active-orders':      50,
      'review-aggregation':150,
    };

    const report = { restaurantSearch, orderHistory, activeOrders, reviewAgg };
    const pass   = Object.entries({
      'restaurant-search': restaurantSearch.avg,
      'order-history':     orderHistory.avg,
      'active-orders':     activeOrders.avg,
      'review-aggregation':reviewAgg.avg,
    }).map(([key, avg]) => ({
      query:     key,
      avgMs:     avg,
      targetMs:  targets[key],
      status:    avg <= targets[key] ? '✅ PASS' : '❌ OVER TARGET',
    }));

    res.json({ success: true, summary: pass, raw: report });
  } catch (err) { next(err); }
});

// ===========================================================================
// GET /api/v1/admin/performance/indexes
// ===========================================================================
// Returns all indexes across the three core collections with their access stats.
router.get('/indexes', async (req, res, next) => {
  try {
    const db = mongoose.connection.db;
    const collections = ['orders', 'reviews', 'restaurants'];

    const results = await Promise.all(
      collections.map(async (col) => {
        const coll   = db.collection(col);
        const [indexes, stats] = await Promise.all([
          coll.indexes(),
          coll.aggregate([{ $indexStats: {} }]).toArray().catch(() => []),
        ]);
        const statsMap = Object.fromEntries(stats.map((s) => [s.name, s]));

        return {
          collection: col,
          indexes: indexes.map((idx) => ({
            name:          idx.name,
            keys:          idx.key,
            unique:        idx.unique || false,
            sparse:        idx.sparse || false,
            accessCount:   statsMap[idx.name]?.accesses?.ops || 'n/a',
            lastUsed:      statsMap[idx.name]?.accesses?.since || 'n/a',
          })),
        };
      })
    );

    res.json({ success: true, data: results });
  } catch (err) { next(err); }
});

module.exports = router;
