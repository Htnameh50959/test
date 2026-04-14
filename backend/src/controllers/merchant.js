// =============================================================================
// MERCHANT CONTROLLER  (backend/src/controllers/merchant.js)
// =============================================================================
// All endpoints are merchant-only (protect + authorize('merchant','admin')
// applied globally on the router).
//
// Dashboard:
//   GET  /api/v1/merchant/dashboard                  — today's stats + active orders
//
// Order management:
//   PUT  /api/v1/merchant/orders/:id/accept           — PENDING → ACCEPTED
//   PUT  /api/v1/merchant/orders/:id/reject           — PENDING → CANCELLED + refund
//   PUT  /api/v1/merchant/orders/:id/status           — advance state machine
//
// Menu management (scoped to merchant's restaurants):
//   GET    /api/v1/merchant/menu                      — full menu
//   POST   /api/v1/merchant/menu                      — add item
//   PUT    /api/v1/merchant/menu/:itemId              — edit item details
//   PUT    /api/v1/merchant/menu/:itemId/availability — toggle isAvailable
//   DELETE /api/v1/merchant/menu/:itemId              — soft-delete item
//
// Analytics:
//   GET  /api/v1/merchant/analytics/sales             — revenue + order time series
//   GET  /api/v1/merchant/analytics/popular-items     — top sellers
//   GET  /api/v1/merchant/analytics/peak-hours        — heatmap: hour × weekday
//
// Review insights:
//   GET  /api/v1/merchant/reviews/sentiment            — sentiment + keywords + recent
// =============================================================================

const mongoose    = require('mongoose');
const Order       = require('../models/Order');
const Restaurant  = require('../models/Restaurant');
const Review      = require('../models/Review');
const User        = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const { initiateRefund } = require('../utils/paymentGateway');
const { invalidateRestaurantCache } = require('../utils/cache');

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/** Broadcast a Socket.IO event to all clients in a room. Safe no-op if io absent. */
const broadcast = (room, event, payload) => {
  if (global.io) global.io.to(room).emit(event, payload);
};

/**
 * Find the single restaurant owned by this merchant.
 * Returns null + calls next(err) if not found or not owned.
 * Merchants with multiple restaurants can pass ?restaurantId= to scope the request.
 */
const resolveRestaurant = async (req, next, opts = {}) => {
  const { requireOwnership = true, select = '' } = opts;
  const restaurantId = req.query.restaurantId || req.body.restaurantId;

  let restaurant;

  if (restaurantId) {
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      next(new ErrorResponse(`'${restaurantId}' is not a valid restaurant ID.`, 400));
      return null;
    }
    restaurant = await Restaurant.findById(restaurantId).select(select || undefined);
  } else {
    // Default to the first active restaurant owned by this merchant.
    restaurant = await Restaurant.findOne(
      { merchantId: req.user._id, isActive: true },
      select || undefined
    );
  }

  if (!restaurant) {
    next(new ErrorResponse('No restaurant found for your account. Please create one first.', 404));
    return null;
  }

  if (requireOwnership && restaurant.merchantId.toString() !== req.user._id.toString()
      && req.user.role !== 'admin') {
    next(new ErrorResponse('You do not own this restaurant.', 403));
    return null;
  }

  return restaurant;
};

/** State machine transitions (mirrors orders controller). */
const STATE_TRANSITIONS = {
  PENDING:          ['ACCEPTED', 'CANCELLED'],
  ACCEPTED:         ['PREPARING', 'CANCELLED'],
  PREPARING:        ['READY_FOR_PICKUP'],
  READY_FOR_PICKUP: ['COURIER_ASSIGNED', 'CANCELLED'],
  COURIER_ASSIGNED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP:        ['IN_TRANSIT'],
  IN_TRANSIT:       ['DELIVERED'],
  DELIVERED:        ['COMPLETED'],
};

// ===========================================================================
// 1. DASHBOARD
// GET /api/v1/merchant/dashboard
// ===========================================================================
exports.getDashboard = async (req, res, next) => {
  try {
    const merchant = await resolveRestaurant(req, next);
    if (!merchant) return;

    const restaurantId = merchant._id;

    // ── Date helpers ─────────────────────────────────────────────────────────
    const now        = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(now); endOfDay.setHours(23, 59, 59, 999);

    // ── Run aggregations in parallel ─────────────────────────────────────────
    const [todayStats, pendingOrders, activeOrders, avgRating] = await Promise.all([

      // Today's revenue + order count.
      Order.aggregate([
        {
          $match: {
            restaurantId,
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            status:    { $in: ['DELIVERED', 'COMPLETED'] },
          },
        },
        {
          $group: {
            _id:        null,
            totalOrders:{ $sum: 1 },
            revenue:    { $sum: '$payment.breakdown.total' },
          },
        },
      ]),

      // Orders requiring merchant action.
      Order.find({
        restaurantId,
        status: { $in: ['PENDING'] },
      })
        .sort({ createdAt: 1 }) // oldest first — most urgent
        .limit(50)
        .populate('customerId', 'profile.firstName profile.lastName profile.phone')
        .lean(),

      // All in-flight orders (visible on the kitchen display).
      Order.find({
        restaurantId,
        status: { $in: ['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'COURIER_ASSIGNED'] },
      })
        .sort({ createdAt: 1 })
        .limit(100)
        .populate('customerId', 'profile.firstName profile.lastName profile.phone')
        .lean(),

      // Current average rating.
      Review.aggregate([
        { $match: { restaurantId, isHidden: false } },
        { $group: { _id: null, avg: { $avg: '$rating.overall' }, count: { $sum: 1 } } },
      ]),
    ]);

    // ── Shape response ───────────────────────────────────────────────────────
    const todayData  = todayStats[0] || { totalOrders: 0, revenue: 0 };
    const ratingData = avgRating[0]  || { avg: 0, count: 0 };

    // Enrich orders with time-since-placed for urgency display.
    const enrichOrder = (o) => ({
      ...o,
      minutesElapsed: Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000),
    });

    res.status(200).json({
      success: true,
      data: {
        restaurant: {
          id:     merchant._id,
          name:   merchant.name,
          isOpen: merchant.isOpen,
        },
        today: {
          orders:        todayData.totalOrders,
          revenue:       Math.round(todayData.revenue * 100) / 100,
          pendingCount:  pendingOrders.length,
          avgRating:     Math.round((ratingData.avg || 0) * 10) / 10,
          totalReviews:  ratingData.count,
        },
        pendingOrders: pendingOrders.map(enrichOrder),
        activeOrders:  activeOrders.map(enrichOrder),
      },
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// 2. ACCEPT ORDER
// PUT /api/v1/merchant/orders/:id/accept
// Body: { estimatedMinutes? }
// ===========================================================================
exports.acceptOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estimatedMinutes = 30 } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`'${id}' is not a valid order ID.`, 400));
    }

    const order = await Order.findById(id);
    if (!order) return next(new ErrorResponse('Order not found.', 404));

    // Ownership check.
    const restaurant = await Restaurant.findById(order.restaurantId).select('merchantId name');
    if (!restaurant || (restaurant.merchantId.toString() !== req.user._id.toString()
                        && req.user.role !== 'admin')) {
      return next(new ErrorResponse('You do not own this restaurant.', 403));
    }

    if (order.status !== 'PENDING') {
      return next(new ErrorResponse(
        `Cannot accept an order in '${order.status}' state. Only PENDING orders can be accepted.`, 422
      ));
    }

    order.status = 'ACCEPTED';
    order.estimatedDeliveryAt = new Date(Date.now() + estimatedMinutes * 60 * 1000);
    order.statusHistory.push({
      status:        'ACCEPTED',
      changedBy:     req.user._id,
      changedByRole: 'merchant',
      note:          `Prep time: ${estimatedMinutes} min.`,
      timestamp:     new Date(),
    });
    await order.save();

    // Notify customer.
    broadcast(id, 'orderStatusUpdate', {
      orderId:             id,
      orderNumber:         order.orderNumber,
      status:              'ACCEPTED',
      estimatedDeliveryAt: order.estimatedDeliveryAt,
      restaurantName:      restaurant.name,
    });

    res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} accepted. Estimated ready in ${estimatedMinutes} minutes.`,
      data: { orderId: id, status: 'ACCEPTED', estimatedDeliveryAt: order.estimatedDeliveryAt },
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// 3. REJECT ORDER
// PUT /api/v1/merchant/orders/:id/reject
// Body: { reason } (required)
// ===========================================================================
exports.rejectOrder = async (req, res, next) => {
  try {
    const { id }     = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 5) {
      return next(new ErrorResponse('A rejection reason (min 5 characters) is required.', 400));
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`'${id}' is not a valid order ID.`, 400));
    }

    const order = await Order.findById(id);
    if (!order) return next(new ErrorResponse('Order not found.', 404));

    const restaurant = await Restaurant.findById(order.restaurantId).select('merchantId name');
    if (!restaurant || (restaurant.merchantId.toString() !== req.user._id.toString()
                        && req.user.role !== 'admin')) {
      return next(new ErrorResponse('You do not own this restaurant.', 403));
    }

    if (order.status !== 'PENDING') {
      return next(new ErrorResponse(
        `Only PENDING orders can be rejected. Current status: '${order.status}'.`, 422
      ));
    }

    order.status             = 'CANCELLED';
    order.cancellationReason = reason.trim();
    order.cancelledBy        = 'merchant';
    order.statusHistory.push({
      status:        'CANCELLED',
      changedBy:     req.user._id,
      changedByRole: 'merchant',
      note:          reason.trim(),
      timestamp:     new Date(),
    });
    await order.save();

    // Initiate refund if payment was captured.
    let refundInitiated = false;
    const txnId = order.payment?.transactionId;
    if (txnId && order.payment?.status === 'captured') {
      const refund = await initiateRefund(txnId, order.payment.breakdown.total, reason);
      if (refund.success) {
        order.payment.status       = 'refunded';
        order.payment.refundedAt   = new Date();
        order.payment.refundReason = reason;
        await order.save();
        refundInitiated = true;
      }
    }

    broadcast(id, 'orderStatusUpdate', {
      orderId:    id,
      orderNumber:order.orderNumber,
      status:     'CANCELLED',
      reason:     reason.trim(),
      refund:     refundInitiated,
    });

    res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} rejected.`,
      data: { orderId: id, status: 'CANCELLED', refundInitiated },
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// 4. UPDATE ORDER STATUS (general state advancement)
// PUT /api/v1/merchant/orders/:id/status
// Body: { status, note?, estimatedMinutes? }
// ===========================================================================
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status: newStatus, note, estimatedMinutes } = req.body;

    if (!newStatus) return next(new ErrorResponse('status is required.', 400));
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`'${id}' is not a valid order ID.`, 400));
    }

    const targetStatus = newStatus.toUpperCase();
    const order        = await Order.findById(id);
    if (!order) return next(new ErrorResponse('Order not found.', 404));

    const restaurant = await Restaurant.findById(order.restaurantId).select('merchantId');
    if (!restaurant || (restaurant.merchantId.toString() !== req.user._id.toString()
                        && req.user.role !== 'admin')) {
      return next(new ErrorResponse('You do not own this restaurant.', 403));
    }

    const allowed = STATE_TRANSITIONS[order.status] || [];
    if (!allowed.includes(targetStatus)) {
      return next(new ErrorResponse(
        `Invalid transition: '${order.status}' → '${targetStatus}'. ` +
        `Allowed: [${allowed.join(', ') || 'none'}].`, 422
      ));
    }

    order.status = targetStatus;
    order.statusHistory.push({
      status:        targetStatus,
      changedBy:     req.user._id,
      changedByRole: 'merchant',
      note:          note || undefined,
      timestamp:     new Date(),
    });

    if (estimatedMinutes) {
      order.estimatedDeliveryAt = new Date(Date.now() + estimatedMinutes * 60 * 1000);
    }

    await order.save();

    broadcast(id, 'orderStatusUpdate', {
      orderId:     id,
      orderNumber: order.orderNumber,
      status:      targetStatus,
      note:        note || null,
      estimatedDeliveryAt: order.estimatedDeliveryAt,
    });

    res.status(200).json({
      success: true,
      message: `Order status updated to '${targetStatus}'.`,
      data: { orderId: id, status: targetStatus, estimatedDeliveryAt: order.estimatedDeliveryAt },
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// 5. GET FULL MENU
// GET /api/v1/merchant/menu
// ===========================================================================
exports.getMenu = async (req, res, next) => {
  try {
    const restaurant = await resolveRestaurant(req, next, { select: 'name menu isActive' });
    if (!restaurant) return;

    const allItems     = restaurant.menu.filter((i) => !i.isDeleted);
    const byCategory   = allItems.reduce((acc, item) => {
      const cat = item.category || 'Uncategorised';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        restaurantId:   restaurant._id,
        restaurantName: restaurant.name,
        totalItems:     allItems.length,
        availableItems: allItems.filter((i) => i.isAvailable).length,
        byCategory,
        items:          allItems,
      },
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// 6. ADD MENU ITEM
// POST /api/v1/merchant/menu
// Body: { name, description, price, category, image?, modifiers?, isAvailable? }
// ===========================================================================
exports.addMenuItem = async (req, res, next) => {
  try {
    const restaurant = await resolveRestaurant(req, next);
    if (!restaurant) return;

    const { name, description, price, category, image, modifiers, isAvailable = true } = req.body;

    if (!name || price === undefined) {
      return next(new ErrorResponse('name and price are required.', 400));
    }
    if (price < 0) {
      return next(new ErrorResponse('price must be non-negative.', 400));
    }

    restaurant.menu.push({
      name,
      description:  description || '',
      price:        Math.round(price * 100) / 100,
      category:     category || 'Main',
      image:        image    || null,
      modifiers:    modifiers || [],
      isAvailable,
      isDeleted:    false,
      sortOrder:    restaurant.menu.filter((i) => !i.isDeleted).length + 1,
    });

    await restaurant.save();
    invalidateRestaurantCache(restaurant._id.toString());

    const newItem = restaurant.menu[restaurant.menu.length - 1];

    res.status(201).json({
      success: true,
      message: `'${name}' added to menu.`,
      data:    newItem,
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// 7. UPDATE MENU ITEM
// PUT /api/v1/merchant/menu/:itemId
// Body: partial menu item fields to update
// ===========================================================================
exports.updateMenuItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const restaurant  = await resolveRestaurant(req, next);
    if (!restaurant) return;

    const item = restaurant.menu.id(itemId);
    if (!item || item.isDeleted) {
      return next(new ErrorResponse('Menu item not found.', 404));
    }

    const allowed = ['name', 'description', 'price', 'category', 'image', 'modifiers', 'sortOrder', 'preparationTime'];
    for (const field of allowed) {
      if (req.body[field] !== undefined) item[field] = req.body[field];
    }

    await restaurant.save();
    invalidateRestaurantCache(restaurant._id.toString());

    res.status(200).json({
      success: true,
      message: `'${item.name}' updated.`,
      data:    item,
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// 8. TOGGLE ITEM AVAILABILITY
// PUT /api/v1/merchant/menu/:itemId/availability
// Body: { isAvailable: boolean }
// ===========================================================================
exports.toggleAvailability = async (req, res, next) => {
  try {
    const { itemId }     = req.params;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return next(new ErrorResponse('isAvailable must be a boolean (true or false).', 400));
    }

    const restaurant = await resolveRestaurant(req, next);
    if (!restaurant) return;

    const item = restaurant.menu.id(itemId);
    if (!item || item.isDeleted) {
      return next(new ErrorResponse('Menu item not found.', 404));
    }

    item.isAvailable = isAvailable;
    await restaurant.save();

    invalidateRestaurantCache(restaurant._id.toString());

    res.status(200).json({
      success: true,
      message: `'${item.name}' is now ${isAvailable ? 'available' : 'unavailable'}.`,
      data:    { itemId, name: item.name, isAvailable },
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// 9. DELETE MENU ITEM (soft-delete)
// DELETE /api/v1/merchant/menu/:itemId
// ===========================================================================
exports.deleteMenuItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const restaurant = await resolveRestaurant(req, next);
    if (!restaurant) return;

    const item = restaurant.menu.id(itemId);
    if (!item || item.isDeleted) {
      return next(new ErrorResponse('Menu item not found.', 404));
    }

    item.isDeleted   = true;
    item.isAvailable = false;
    await restaurant.save();

    invalidateRestaurantCache(restaurant._id.toString());

    res.status(200).json({
      success: true,
      message: `'${item.name}' removed from menu.`,
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// 10. SALES ANALYTICS
// GET /api/v1/merchant/analytics/sales
// Query: period=daily|weekly|monthly (default: daily), days=30
// ===========================================================================
exports.getSalesAnalytics = async (req, res, next) => {
  try {
    const restaurant = await resolveRestaurant(req, next, { select: '_id name' });
    if (!restaurant) return;

    const period     = req.query.period || 'daily';
    const days       = Math.min(parseInt(req.query.days, 10) || 30, 365);
    const since      = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // MongoDB $dateToString format by period.
    const dateFormats = {
      daily:   '%Y-%m-%d',
      weekly:  '%Y-W%V',
      monthly: '%Y-%m',
    };
    const fmt = dateFormats[period] || dateFormats.daily;

    const [timeSeries, totals, orderStatusDist] = await Promise.all([

      // Revenue + order count time series.
      Order.aggregate([
        {
          $match: {
            restaurantId: restaurant._id,
            status:       { $in: ['DELIVERED', 'COMPLETED'] },
            createdAt:    { $gte: since },
          },
        },
        {
          $group: {
            _id:        { $dateToString: { format: fmt, date: '$createdAt' } },
            revenue:    { $sum: '$payment.breakdown.total' },
            orders:     { $sum: 1 },
            avgOrderVal:{ $avg: '$payment.breakdown.total' },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // All-time totals.
      Order.aggregate([
        {
          $match: {
            restaurantId: restaurant._id,
            status:       { $in: ['DELIVERED', 'COMPLETED'] },
          },
        },
        {
          $group: {
            _id:          null,
            totalRevenue: { $sum: '$payment.breakdown.total' },
            totalOrders:  { $sum: 1 },
            avgOrderVal:  { $avg: '$payment.breakdown.total' },
          },
        },
      ]),

      // Order status distribution (for funnel).
      Order.aggregate([
        { $match: { restaurantId: restaurant._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const totalsData = totals[0] || { totalRevenue: 0, totalOrders: 0, avgOrderVal: 0 };

    res.status(200).json({
      success: true,
      data: {
        period,
        days,
        totals: {
          revenue:   Math.round(totalsData.totalRevenue  * 100) / 100,
          orders:    totalsData.totalOrders,
          avgOrder:  Math.round((totalsData.avgOrderVal || 0) * 100) / 100,
        },
        timeSeries: timeSeries.map((d) => ({
          period:    d._id,
          revenue:   Math.round(d.revenue    * 100) / 100,
          orders:    d.orders,
          avgOrder:  Math.round(d.avgOrderVal * 100) / 100,
        })),
        statusDistribution: orderStatusDist,
      },
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// 11. POPULAR ITEMS ANALYTICS
// GET /api/v1/merchant/analytics/popular-items
// ===========================================================================
exports.getPopularItems = async (req, res, next) => {
  try {
    const restaurant = await resolveRestaurant(req, next, { select: '_id name' });
    if (!restaurant) return;

    const days  = Math.min(parseInt(req.query.days, 10) || 30, 365);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const popularItems = await Order.aggregate([
      {
        $match: {
          restaurantId: restaurant._id,
          status:       { $in: ['DELIVERED', 'COMPLETED'] },
          createdAt:    { $gte: since },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id:         '$items.menuItemId',
          name:        { $first: '$items.name' },
          totalSold:   { $sum: '$items.quantity' },
          totalRevenue:{ $sum: '$items.lineTotal' },
          avgUnitPrice:{ $avg: '$items.unitPrice' },
          orderCount:  { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit },
      {
        $project: {
          _id:         0,
          menuItemId:  '$_id',
          name:        1,
          totalSold:   1,
          totalRevenue:{ $round: ['$totalRevenue', 2] },
          avgUnitPrice:{ $round: ['$avgUnitPrice', 2] },
          orderCount:  1,
          revenueShare:{ $literal: 0 }, // calculated in JS below
        },
      },
    ]);

    // Calculate each item's share of total revenue.
    const grandTotal = popularItems.reduce((s, i) => s + i.totalRevenue, 0) || 1;
    popularItems.forEach((item) => {
      item.revenueShare = `${Math.round((item.totalRevenue / grandTotal) * 100)}%`;
    });

    res.status(200).json({
      success: true,
      data: { days, limit, items: popularItems },
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// 12. PEAK HOURS ANALYTICS
// GET /api/v1/merchant/analytics/peak-hours
// Returns a heatmap: hour (0-23) × weekday (0=Sun … 6=Sat) → order count
// ===========================================================================
exports.getPeakHours = async (req, res, next) => {
  try {
    const restaurant = await resolveRestaurant(req, next, { select: '_id name' });
    if (!restaurant) return;

    const days  = Math.min(parseInt(req.query.days, 10) || 90, 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const heatmapRaw = await Order.aggregate([
      {
        $match: {
          restaurantId: restaurant._id,
          status:       { $in: ['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP',
                                'COURIER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT',
                                'DELIVERED', 'COMPLETED'] },
          createdAt:    { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            hour:    { $hour:       '$createdAt' },
            weekday: { $dayOfWeek:  '$createdAt' }, // 1=Sun … 7=Sat (MongoDB)
          },
          orders:  { $sum: 1 },
          revenue: { $sum: '$payment.breakdown.total' },
        },
      },
      { $sort: { '_id.weekday': 1, '_id.hour': 1 } },
    ]);

    // Build a full 24×7 grid with zeros for missing slots.
    const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const grid = {};
    for (let w = 1; w <= 7; w++) {
      const day = WEEKDAY_NAMES[w - 1];
      grid[day] = {};
      for (let h = 0; h < 24; h++) grid[day][h] = { orders: 0, revenue: 0 };
    }

    for (const { _id, orders, revenue } of heatmapRaw) {
      const day  = WEEKDAY_NAMES[_id.weekday - 1];
      const hour = _id.hour;
      if (grid[day] && grid[day][hour] !== undefined) {
        grid[day][hour] = {
          orders,
          revenue: Math.round(revenue * 100) / 100,
        };
      }
    }

    // Find the busiest slot for front-end highlighting.
    let maxOrders = 0;
    let peakSlot  = { weekday: null, hour: null };
    for (const [day, hours] of Object.entries(grid)) {
      for (const [hour, data] of Object.entries(hours)) {
        if (data.orders > maxOrders) {
          maxOrders = data.orders;
          peakSlot  = { weekday: day, hour: parseInt(hour, 10) };
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        days,
        heatmap:  grid,               // grid[weekday][hour] = { orders, revenue }
        raw:      heatmapRaw,         // flat array for custom chart rendering
        peakSlot: { ...peakSlot, orders: maxOrders },
      },
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// 13. REVIEW SENTIMENT INSIGHTS
// GET /api/v1/merchant/reviews/sentiment
// ===========================================================================
exports.getReviewSentiment = async (req, res, next) => {
  try {
    const restaurant = await resolveRestaurant(req, next, { select: '_id name' });
    if (!restaurant) return;

    const restaurantId = restaurant._id;
    const days         = Math.min(parseInt(req.query.days, 10) || 30, 365);
    const since        = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [overview, sentimentDist, categoryAvgs, trendRaw, recentReviews] = await Promise.all([

      // Overall sentiment score + counts.
      Review.aggregate([
        { $match: { restaurantId, isHidden: false } },
        {
          $group: {
            _id:            null,
            totalReviews:   { $sum: 1 },
            avgRating:      { $avg: '$rating.overall' },
            avgSentiment:   { $avg: '$sentiment.score' },
          },
        },
      ]),

      // Sentiment distribution.
      Review.aggregate([
        { $match: { restaurantId, isHidden: false, createdAt: { $gte: since } } },
        { $group: { _id: '$sentiment.label', count: { $sum: 1 } } },
      ]),

      // Category rating averages.
      Review.aggregate([
        { $match: { restaurantId, isHidden: false } },
        {
          $group: {
            _id: null,
            food:      { $avg: '$rating.categories.food' },
            service:   { $avg: '$rating.categories.service' },
            ambiance:  { $avg: '$rating.categories.ambiance' },
            value:     { $avg: '$rating.categories.value' },
            delivery:  { $avg: '$rating.categories.delivery' },
            packaging: { $avg: '$rating.categories.packaging' },
          },
        },
      ]),

      // Daily sentiment trend (last N days).
      Review.aggregate([
        {
          $match: { restaurantId, isHidden: false, createdAt: { $gte: since } },
        },
        {
          $group: {
            _id:         { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            avgSentiment:{ $avg: '$sentiment.score' },
            avgRating:   { $avg: '$rating.overall' },
            count:       { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 10 most recent reviews (for merchant to read and respond).
      Review.find({ restaurantId, isHidden: false })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('customerId', 'profile.firstName profile.lastName profile.avatar')
        .select('rating text sentiment qualityScore merchantResponse helpfulVotes createdAt'),
    ]);

    // Keyword word-cloud — built in-JS from all review texts.
    const corpus = await Review.find(
      { restaurantId, isHidden: false },
      'text'
    ).lean();
    const fullText = corpus.map((r) => r.text).join(' ');
    const { extractKeywords } = require('../services/reviewAnalysis');
    const trendingKeywords    = extractKeywords(fullText, 20);

    const ov  = overview[0]    || { totalReviews: 0, avgRating: 0, avgSentiment: 0 };
    const cat = categoryAvgs[0]|| {};

    const dist = { positive: 0, neutral: 0, negative: 0 };
    for (const { _id, count } of sentimentDist) if (_id) dist[_id] = count;

    const round1 = (v) => Math.round((v || 0) * 10) / 10;
    const round2 = (v) => Math.round((v || 0) * 100) / 100;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalReviews:   ov.totalReviews,
          avgRating:      round1(ov.avgRating),
          avgSentiment:   round2(ov.avgSentiment),
          sentimentLabel: ov.avgSentiment >= 0.2 ? 'positive'
                         : ov.avgSentiment <= -0.2 ? 'negative' : 'neutral',
        },
        sentimentDistribution: dist,
        categoryAverages: {
          food:      round1(cat.food),
          service:   round1(cat.service),
          ambiance:  round1(cat.ambiance),
          value:     round1(cat.value),
          delivery:  round1(cat.delivery),
          packaging: round1(cat.packaging),
        },
        sentimentTrend: trendRaw.map((d) => ({
          date:        d._id,
          avgSentiment:round2(d.avgSentiment),
          avgRating:   round1(d.avgRating),
          reviewCount: d.count,
        })),
        trendingKeywords: trendingKeywords.map(({ term, score }) => ({
          term,
          weight: Math.round(score * 100) / 100,
        })),
        recentReviews,
      },
    });

  } catch (err) {
    next(err);
  }
};
