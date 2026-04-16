const ErrorResponse = require('../utils/errorResponse');
const Order = require('../models/Order');
const User = require('../models/User');
const { getIO, sendToUser } = require('../services/socket');
const { SERVER_EVENTS } = require('../config/events');

/**
 * @desc    Get orders waiting for a courier
 * @route   GET /api/v1/courier/available
 * @access  Private (Courier)
 */
exports.getAvailableDeliveries = async (req, res, next) => {
  try {
    const orders = await Order.find({
      status: 'READY_FOR_PICKUP',
      courierId: null,
      orderType: 'DELIVERY'
    }).populate('restaurantId', 'name profile.address location');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Accept a delivery request
 * @route   POST /api/v1/courier/accept/:orderId
 * @access  Private (Courier)
 */
exports.acceptDelivery = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    if (order.status !== 'READY_FOR_PICKUP') {
      return next(new ErrorResponse('Order is no longer available for pickup', 400));
    }

    if (order.courierId) {
      return next(new ErrorResponse('Order already assigned to another courier', 400));
    }

    // Assign courier and update status
    order.courierId = req.user._id;
    order.status = 'OUT_FOR_DELIVERY'; // Using model enum or status history logic
    // In our STATUS_FLOW it was READY_FOR_PICKUP -> COURIER_ASSIGNED -> PICKED_UP
    // Let's stick to the flow: READY_FOR_PICKUP -> OUT_FOR_DELIVERY (picked up)
    
    // Actually, let's use the UI flow provided by user:
    // READY_FOR_PICKUP (Waiting) 
    // -> COURIER_ASSIGNED (Accepted, heading to restaurant)
    // -> PICKED_UP (Got the food)
    // -> IN_TRANSIT (Heading to customer)
    // -> DELIVERED (Done)
    
    // Update: Order model has [READY_FOR_PICKUP, OUT_FOR_DELIVERY, DELIVERED]
    // I will use OUT_FOR_DELIVERY as the "active" state.
    order.status = 'OUT_FOR_DELIVERY';
    order.pickedUpAt = new Date();
    
    await order.save();

    // Notify customer and merchant
    const io = getIO();
    io.to(`order:${order._id}`).emit(SERVER_EVENTS.COURIER_ASSIGNED, {
      orderId: order._id,
      courierId: req.user._id,
      timestamp: new Date()
    });

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update delivery status
 * @route   PUT /api/v1/courier/status/:orderId
 * @access  Private (Courier)
 */
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) return next(new ErrorResponse('Order not found', 404));
    if (!order.courierId || order.courierId.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Access denied: You are not assigned to this order', 403));
    }

    order.status = status;
    if (status === 'DELIVERED') order.deliveredAt = new Date();
    
    await order.save();

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get courier earnings summary
 * @route   GET /api/v1/courier/earnings
 * @access  Private (Courier)
 */
exports.getEarnings = async (req, res, next) => {
  try {
    const courierId = req.user._id;
    
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0,0,0,0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfToday.setHours(0,0,0,0);

    const [today, week, month] = await Promise.all([
      Order.aggregate([
        { $match: { courierId, status: 'DELIVERED', deliveredAt: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$payment.breakdown.deliveryFee' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { courierId, status: 'DELIVERED', deliveredAt: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$payment.breakdown.deliveryFee' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { courierId, status: 'DELIVERED', deliveredAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$payment.breakdown.deliveryFee' }, count: { $sum: 1 } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        today: today[0]?.total || 0,
        todayCount: today[0]?.count || 0,
        week: week[0]?.total || 0,
        month: month[0]?.total || 0
      }
    });
  } catch (err) {
    next(err);
  }
};
