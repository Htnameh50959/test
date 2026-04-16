// =============================================================================
// ORDERS CONTROLLER  (backend/src/controllers/orders.js)
// =============================================================================
// Handles the complete order lifecycle:
//
//   POST /api/v1/orders               — create order (consumer)
//   GET  /api/v1/orders               — list orders (role-aware)
//   GET  /api/v1/orders/:id           — order detail
//   PUT  /api/v1/orders/:id/status    — advance state machine
//   POST /api/v1/orders/:id/cancel    — customer cancellation
//
// State machine (all valid transitions defined in STATE_TRANSITIONS):
//   PENDING → ACCEPTED | CANCELLED
//   ACCEPTED → PREPARING | CANCELLED
//   PREPARING → READY_FOR_PICKUP
//   READY_FOR_PICKUP → COURIER_ASSIGNED
//   COURIER_ASSIGNED → PICKED_UP
//   PICKED_UP → IN_TRANSIT
//   IN_TRANSIT → DELIVERED
//   DELIVERED → COMPLETED  (auto-scheduled 30 min after delivery)
//   Any → CANCELLED        (with actor + reason restrictions)
//
// =============================================================================

const mongoose    = require('mongoose');
const Order       = require('../models/Order');
const Restaurant  = require('../models/Restaurant');
const Cart        = require('../models/Cart');
const User        = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const { processPayment, initiateRefund } = require('../utils/paymentGateway');
const { broadcastOrderUpdate, sendToUser } = require('../services/socket');
const { sendPushNotification, sendReviewPrompt } = require('../utils/notifications');
const { calculateETA, formatStatus, validateStatusTransition, STATUS_FLOW } = require('../utils/orderHelpers');

// ---------------------------------------------------------------------------
// STATE MACHINE
// ---------------------------------------------------------------------------

/**
 * Maps each current status → array of statuses it may transition to.
 * Any transition not listed here is illegal and will be rejected with a 422.
 */
const STATE_TRANSITIONS = STATUS_FLOW;

/**
 * Which roles are allowed to trigger each target status.
 * 'system' is used for auto-transitions (COMPLETED after 30 min).
 */
const TRANSITION_ACTORS = {
  ACCEPTED:        ['merchant', 'admin'],
  REJECTED:        ['merchant', 'admin'],
  PREPARING:       ['merchant', 'admin'],
  READY_FOR_PICKUP:['merchant', 'admin'],
  COURIER_ASSIGNED:['merchant', 'courier', 'admin'],
  PICKED_UP:       ['courier', 'admin'],
  IN_TRANSIT:      ['courier', 'admin'],
  DELIVERED:       ['courier', 'admin'],
  COMPLETED:       ['system', 'admin'],
  CANCELLED:       ['consumer', 'merchant', 'courier', 'admin', 'system'],
  REFUND_REQUESTED:['consumer', 'admin'],
  REFUNDED:        ['admin', 'system'],
};

// ---------------------------------------------------------------------------
// PRICING CONSTANTS
// ---------------------------------------------------------------------------
const SERVICE_FEE_RATE = 0.05;  // 5% of subtotal
const TAX_RATE         = 0.08;  // 8% of (subtotal + delivery + service)

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Calculate all monetary components of an order.
 * All amounts in rupees (2 decimal places).
 *
 * @param {number} subtotal     - sum of (unitPrice + modifierDelta) × qty
 * @param {number} deliveryFee  - from restaurant document
 * @param {number} discount     - coupon discount applied (≥ 0)
 * @param {number} loyaltyUsed  - loyalty points redeemed as cash (≥ 0)
 * @returns {{ subtotal, deliveryFee, serviceFee, tax, discount, loyaltyUsed, total }}
 */
const calculateOrder = (subtotal, deliveryFee, discount = 0, loyaltyUsed = 0) => {
  const serviceFee  = round2(subtotal * SERVICE_FEE_RATE);
  const taxBase     = subtotal + deliveryFee + serviceFee - discount;
  const tax         = round2(Math.max(taxBase, 0) * TAX_RATE);
  const total       = round2(
    Math.max(subtotal + deliveryFee + serviceFee + tax - discount - loyaltyUsed, 0)
  );
  return { subtotal: round2(subtotal), deliveryFee: round2(deliveryFee), serviceFee, tax, discount, loyaltyUsed, total };
};

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Check whether a delivery coordinate is within the restaurant's service area.
 * Uses the Haversine formula (same formula MongoDB uses for $geoNear).
 *
 * @param {[number,number]} restaurantCoords  - [lng, lat]
 * @param {[number,number]} deliveryCoords    - [lng, lat]
 * @param {number}          maxRadiusMetres   - e.g. 10000
 * @returns {boolean}
 */
const isWithinServiceArea = (restaurantCoords, deliveryCoords, maxRadiusMetres = 10000) => {
  const [rLng, rLat] = restaurantCoords;
  const [dLng, dLat] = deliveryCoords;

  const R  = 6371000; // Earth radius in metres
  const φ1 = (rLat * Math.PI) / 180;
  const φ2 = (dLat * Math.PI) / 180;
  const Δφ = ((dLat - rLat) * Math.PI) / 180;
  const Δλ = ((dLng - rLng) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c <= maxRadiusMetres;
};



/**
 * Schedule the PENDING → COMPLETED auto-transition 30 minutes after DELIVERED.
 * Uses a simple setTimeout — in production use a job queue (Bull, Agenda).
 */
/**
 * Automatic Status Transitions: Cron-like behavior
 * Auto-completes delivered orders after 30 minutes.
 */
const autoCompleteDeliveredOrders = async () => {
    try {
        const Order = require('../models/Order');
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        
        const deliveredOrders = await Order.find({
            status: 'DELIVERED',
            'statusHistory': {
                $elemMatch: {
                    status: 'DELIVERED',
                    timestamp: {$lte: thirtyMinutesAgo}
                }
            }
        });
        
        for (const order of deliveredOrders) {
            order.status = 'COMPLETED';
            order.statusHistory.push({
                status: 'COMPLETED',
                timestamp: new Date(),
                changedByRole: 'system',
                note: 'Auto-completed 30 minutes after delivery.'
            });
            
            await order.save();
            
            // Broadcast via WebSocket
            const { broadcastOrderUpdate } = require('../services/socket');
            const { sendReviewPrompt } = require('../utils/notifications');

            broadcastOrderUpdate(order._id.toString(), {
                status: 'COMPLETED',
                metadata: { auto: true }
            });
            
            
            // Trigger review prompt
            await sendReviewPrompt(order.customerId, order._id).catch(e => {
                // Silently fail review prompts in background
            });
        }

    } catch (error) {
        console.error('Auto-complete delivered orders error:', error);
    }
};

exports.autoCompleteDeliveredOrders = autoCompleteDeliveredOrders;

// ===========================================================================
// CONTROLLER 1: createOrder
// POST /api/v1/orders
// ===========================================================================
exports.createOrder = async (req, res, next) => {
  try {
    const {
      restaurantId,
      items,             // [{ menuItemId, quantity, modifiers[], itemNote }]
      deliveryAddress,   // { street, city, state, zipCode, coordinates:[lng,lat], instructions? }
      orderType  = 'DELIVERY',
      tableNumber,
      paymentMethod,
      couponCode,
      specialInstructions,
    } = req.body;

    // ── 1. Fetch and validate restaurant ────────────────────────────────────
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return next(new ErrorResponse(`Restaurant not found.`, 404));
    }
    if (!restaurant.isActive) {
      return next(new ErrorResponse(`This restaurant is currently unavailable.`, 400));
    }
    if (!restaurant.isOpen) {
      return next(new ErrorResponse(`This restaurant is currently closed.`, 400));
    }

    // ── 2. Validate delivery address is within service area ─────────────────
    if (orderType === 'DELIVERY') {
      if (!deliveryAddress?.coordinates || deliveryAddress.coordinates.length !== 2) {
        return next(new ErrorResponse('Delivery coordinates are required for delivery orders.', 400));
      }
      const inArea = isWithinServiceArea(
        restaurant.location.coordinates,
        deliveryAddress.coordinates,
        10000 // 10 km default service radius
      );
      if (!inArea) {
        return next(new ErrorResponse(
          `Sorry, this restaurant does not deliver to your location. Maximum delivery radius is 10 km.`, 400
        ));
      }
    }

    // ── 3. Validate & price each item from the official menu ─────────────────
    // NEVER trust prices from the client — always recalculate server-side.
    const orderItems = [];
    let subtotal = 0;

    for (const requestedItem of items) {
      const menuItem = restaurant.menu.id(requestedItem.menuItemId);

      if (!menuItem) {
        return next(new ErrorResponse(
          `Menu item '${requestedItem.menuItemId}' does not exist in this restaurant's menu.`, 400
        ));
      }
      if (!menuItem.isAvailable || menuItem.isDeleted) {
        return next(new ErrorResponse(
          `'${menuItem.name}' is currently unavailable. Please remove it from your order.`, 400
        ));
      }

      // ── Resolve modifiers ─────────────────────────────────────────────────
      let modifierTotal = 0;
      const selectedModifiers = [];

      for (const requestedMod of (requestedItem.modifiers || [])) {
        // Find the modifier group by name.
        const group = menuItem.modifiers?.find(
          (g) => g.name === requestedMod.groupName
        );
        if (!group) {
          return next(new ErrorResponse(
            `Modifier group '${requestedMod.groupName}' not found on '${menuItem.name}'.`, 400
          ));
        }
        const option = group.options.find((o) => o.name === requestedMod.optionName);
        if (!option) {
          return next(new ErrorResponse(
            `Option '${requestedMod.optionName}' not found in group '${requestedMod.groupName}'.`, 400
          ));
        }

        modifierTotal += option.priceAdjust || 0;
        selectedModifiers.push({
          groupName:   group.name,
          optionName:  option.name,
          priceAdjust: option.priceAdjust || 0,
        });
      }

      const unitPrice  = menuItem.price;
      const lineTotal  = round2((unitPrice + modifierTotal) * requestedItem.quantity);
      subtotal        += lineTotal;

      orderItems.push({
        menuItemId:         menuItem._id,
        name:               menuItem.name,
        description:        menuItem.description || '',
        image:              menuItem.image || null,
        quantity:           requestedItem.quantity,
        unitPrice,
        modifiers:          selectedModifiers,
        modifierTotalPrice: round2(modifierTotal),
        lineTotal,
        itemNote:           requestedItem.itemNote || '',
      });
    }

    // ── 4. Check minimum order amount ─────────────────────────────────────
    const minimumOrder = restaurant.minimumOrder || 0;
    if (subtotal < minimumOrder) {
      return next(new ErrorResponse(
        `Minimum order amount is ₹${minimumOrder.toFixed(2)}. Your subtotal is ₹${subtotal.toFixed(2)}.`, 400
      ));
    }

    // ── 5. Calculate full price breakdown ────────────────────────────────────
    const deliveryFee = orderType === 'DELIVERY' ? (restaurant.deliveryFee || 0) : 0;
    const breakdown   = calculateOrder(subtotal, deliveryFee);

    // ── 6. Process payment ───────────────────────────────────────────────────
    const paymentResult = await processPayment(
      breakdown.total,
      paymentMethod,
      {
        customerEmail:   req.user.email,
        customerName:    req.user.fullName,
        internalOrderId: `pre-${Date.now()}`, // placeholder before DB insert
      }
    );

    if (!paymentResult.success) {
      return next(new ErrorResponse(
        `Payment failed. Please try again or use a different payment method.`, 402
      ));
    }

    // ── 7. Build the delivery address document ────────────────────────────────
    const deliveryAddressDoc = orderType === 'DELIVERY'
      ? {
          label:        deliveryAddress.label || 'Delivery',
          street:       deliveryAddress.street,
          city:         deliveryAddress.city,
          state:        deliveryAddress.state,
          zipCode:      deliveryAddress.zipCode,
          country:      deliveryAddress.country || 'India',
          location: {
            type:        'Point',
            coordinates: deliveryAddress.coordinates,
          },
          instructions: deliveryAddress.instructions || '',
        }
      : {
          label:  'Pickup / Dine-in',
          street: restaurant.address.street,
          city:   restaurant.address.city,
          state:  restaurant.address.state,
          zipCode:restaurant.address.zipCode,
          location: {
            type:        'Point',
            coordinates: restaurant.location.coordinates,
          },
        };

    // ── 8. Create the order document ─────────────────────────────────────────
    const order = await Order.create({
      customerId:    req.user._id,
      restaurantId,
      orderType,
      tableNumber:   orderType === 'DINE_IN' ? tableNumber : undefined,
      items:         orderItems,
      deliveryAddress: deliveryAddressDoc,

      status: 'PENDING',
      statusHistory: [{
        status:        'PENDING',
        changedByRole: 'system',
        note:          'Order placed by customer.',
        timestamp:     new Date(),
      }],

      payment: {
        method:          paymentMethod,
        status:          paymentResult.status === 'captured' ? 'captured' : 'pending',
        gatewayOrderId:  paymentResult.gatewayOrderId,
        transactionId:   paymentResult.transactionId,
        gatewayResponse: paymentResult.gatewayResponse,
        breakdown,
        couponCode:      couponCode || undefined,
      },

      specialInstructions: specialInstructions || '',
      estimatedDeliveryAt: new Date(
        Date.now() + (restaurant.estimatedDeliveryTime?.max || 45) * 60 * 1000
      ),
    });

    // ── 9. Clear the user's cart (fire-and-forget) ────────────────────────────
    Cart.deleteOne({ userId: req.user._id }).catch((err) => {});


    // ── 10. Broadcast new-order event to the merchant ─────────────────────────
    broadcastOrderEvent(restaurantId, 'newOrder', {
      orderNumber: order.orderNumber,
      itemCount:   orderItems.length,
      total:       breakdown.total,
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: {
        orderId:         order._id,
        orderNumber:     order.orderNumber,
        status:          order.status,
        breakdown,
        estimatedDeliveryAt: order.estimatedDeliveryAt,
        // Surface the gateway order ID so the frontend can call the payment SDK.
        gatewayOrderId:  paymentResult.gatewayOrderId,
      },
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// CONTROLLER 2: getOrders
// GET /api/v1/orders
// ===========================================================================
// Query params:
//   status   — filter by single status or comma-separated list
//   limit    — page size (default 20)
//   skip     — offset (default 0)
exports.getOrders = async (req, res, next) => {
  try {
    const { status, limit = 20, skip = 0 } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const parsedSkip  = Math.max(parseInt(skip,  10) || 0, 0);

    // Build role-aware base filter.
    let baseFilter = {};

    if (req.user.role === 'consumer') {
      baseFilter.customerId = req.user._id;

    } else if (req.user.role === 'merchant') {
      // Show orders for ALL restaurants owned by this merchant.
      const myRestaurants = await Restaurant.find(
        { merchantId: req.user._id, isActive: true },
        '_id'
      );
      baseFilter.restaurantId = { $in: myRestaurants.map((r) => r._id) };

    } else if (req.user.role === 'courier') {
      baseFilter.courierId = req.user._id;

    }
    // Admin: no base filter — sees all orders.

    // Optional status filter (supports "PENDING,ACCEPTED" comma list).
    if (status) {
      const statuses = status.split(',').map((s) => s.trim().toUpperCase());
      baseFilter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }

    const [orders, total] = await Promise.all([
      Order.find(baseFilter)
        .sort({ createdAt: -1 }) // newest first
        .skip(parsedSkip)
        .limit(parsedLimit)
        .populate('restaurantId', 'name coverImage address.city')
        .populate('courierId', 'profile.firstName profile.lastName')
        .select('-statusHistory -__v'), // omit heavy fields from list view

      Order.countDocuments(baseFilter),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        total,
        limit:   parsedLimit,
        skip:    parsedSkip,
        pages:   Math.ceil(total / parsedLimit),
        hasMore: parsedSkip + orders.length < total,
      },
      count: orders.length,
      data:  orders,
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// CONTROLLER 3: getOrder
// GET /api/v1/orders/:id
// ===========================================================================
exports.getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`'${id}' is not a valid order ID.`, 400));
    }

    const order = await Order.findById(id)
      .populate('restaurantId', 'name coverImage address phone')
      .populate('customerId',   'profile.firstName profile.lastName email profile.phone')
      .populate('courierId',    'profile.firstName profile.lastName courierProfile.vehicleType courierProfile.vehicleNumber');

    if (!order) {
      return next(new ErrorResponse(`No order found with ID '${id}'.`, 404));
    }

    // ── Authorization ─────────────────────────────────────────────────────
    const userId = req.user._id.toString();
    const isOwner    = order.customerId?._id?.toString() === userId;
    const isCourier  = order.courierId?._id?.toString()  === userId;

    // For merchant: verify they own the restaurant.
    let isMerchant = false;
    if (req.user.role === 'merchant') {
      const rest = await Restaurant.findById(order.restaurantId).select('merchantId');
      isMerchant = rest?.merchantId?.toString() === userId;
    }

    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isCourier && !isMerchant && !isAdmin) {
      return next(new ErrorResponse('You are not authorised to view this order.', 403));
    }

    res.status(200).json({ success: true, data: order });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// CONTROLLER 4: updateStatus
// PUT /api/v1/orders/:id/status
// ===========================================================================
// Body: { status, note?, estimatedMinutes? }
exports.updateStatus = async (req, res, next) => {
  try {
    const { id }  = req.params;
    const { status: newStatus, note, estimatedMinutes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`'${id}' is not a valid order ID.`, 400));
    }

    const targetStatus = newStatus?.toUpperCase();
    if (!targetStatus) {
      return next(new ErrorResponse('Please provide the new status in the request body.', 400));
    }

    const order = await Order.findById(id);
    if (!order) {
      return next(new ErrorResponse(`No order found with ID '${id}'.`, 404));
    }

    // ── 1. Validate state transition ─────────────────────────────────────────
    const allowedNext = STATE_TRANSITIONS[order.status] || [];
    if (!allowedNext.includes(targetStatus)) {
      return next(new ErrorResponse(
        `Invalid status transition: '${order.status}' → '${targetStatus}'. ` +
        `Allowed next states: [${allowedNext.join(', ') || 'none (terminal state)'}].`,
        422
      ));
    }

    // ── 2. Validate actor role ────────────────────────────────────────────────
    const allowedActors = TRANSITION_ACTORS[targetStatus] || [];
    if (!allowedActors.includes(req.user.role)) {
      return next(new ErrorResponse(
        `Your role ('${req.user.role}') cannot set an order to '${targetStatus}'. ` +
        `Allowed roles: [${allowedActors.join(', ')}].`,
        403
      ));
    }

    // ── 3. Update the order ───────────────────────────────────────────────────
    order.status = targetStatus;
    order.statusHistory.push({
      status:        targetStatus,
      changedBy:     req.user._id,
      changedByRole: req.user.role,
      note:          note || undefined,
      timestamp:     new Date(),
    });

    // Update estimated delivery time if provided.
    if (estimatedMinutes && !isNaN(estimatedMinutes)) {
      order.estimatedDeliveryAt = new Date(Date.now() + estimatedMinutes * 60 * 1000);
    }

    await order.save(); // pre-save hook stamps timing fields (acceptedAt, etc.)
 
    // ── 4. Post-transition side effects ──────────────────────────────────────
 
    // Broadcast via WebSocket
    broadcastOrderUpdate(id, {
        status: targetStatus,
        estimatedDeliveryTime: order.estimatedDeliveryAt,
        metadata: {
            updatedBy: req.user.profile?.firstName || req.user.role,
            timestamp: new Date(),
            note: note || undefined
        }
    });

    // Send push notification
    sendPushNotification(order.customerId, {
        title: 'Order Update',
        body: `Your order is now ${formatStatus(targetStatus)}`
    }).catch(err => {});


    res.status(200).json({
      success: true,
      message: `Order status updated to '${targetStatus}'.`,
      data: {
        orderId:      order._id,
        orderNumber:  order.orderNumber,
        status:       order.status,
        estimatedDeliveryAt: order.estimatedDeliveryAt,
        statusHistory: order.statusHistory,
      },
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// CONTROLLER 5: cancelOrder
// POST /api/v1/orders/:id/cancel
// ===========================================================================
// Body: { reason }
// Customers can cancel only while PENDING.
// Merchants/admins can cancel up to COURIER_ASSIGNED.
exports.cancelOrder = async (req, res, next) => {
  try {
    const { id }     = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`'${id}' is not a valid order ID.`, 400));
    }

    const order = await Order.findById(id);
    if (!order) {
      return next(new ErrorResponse(`No order found with ID '${id}'.`, 404));
    }

    // ── Authorization check ───────────────────────────────────────────────
    const isCustomer = order.customerId.toString() === req.user._id.toString();
    if (!isCustomer && req.user.role !== 'merchant' && req.user.role !== 'admin') {
      return next(new ErrorResponse('You are not authorised to cancel this order.', 403));
    }

    // ── State check ───────────────────────────────────────────────────────
    const cancellableStates = isCustomer
      ? ['PENDING']                                           // customers: PENDING only
      : ['PENDING', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'COURIER_ASSIGNED']; // merchants

    if (!cancellableStates.includes(order.status)) {
      return next(new ErrorResponse(
        `Cannot cancel an order in '${order.status}' state. Orders can only be cancelled` +
        ` while in: [${cancellableStates.join(', ')}].`,
        422
      ));
    }

    order.status           = 'CANCELLED';
    order.cancellationReason = reason || 'No reason provided.';
    order.cancelledBy        = req.user.role;
    order.statusHistory.push({
      status:        'CANCELLED',
      changedBy:     req.user._id,
      changedByRole: req.user.role,
      note:          reason || 'Order cancelled.',
      timestamp:     new Date(),
    });

    await order.save();

    // ── Initiate refund if payment was already captured ───────────────────
    const txnId = order.payment?.transactionId;
    if (txnId && order.payment?.status === 'captured') {
      const refundResult = await initiateRefund(
        txnId,
        order.payment.breakdown.total,
        reason || 'Order cancelled'
      );

      if (refundResult.success) {
        order.payment.status        = 'refunded';
        order.payment.refundAmount  = order.payment.breakdown.total;
        order.payment.refundedAt    = new Date();
        order.payment.refundReason  = reason;
        await order.save();
      }
    }

    broadcastOrderEvent(order._id, 'orderStatusUpdate', {
      orderNumber: order.orderNumber,
      status:      'CANCELLED',
      actor:       req.user.role,
      reason,
    });

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully.',
      data: {
        orderId:     order._id,
        orderNumber: order.orderNumber,
        status:      'CANCELLED',
        refundInitiated: !!(txnId && order.payment?.status === 'refunded'),
      },
    });

  } catch (err) {
    next(err);
  }
};
// ===========================================================================
// CONTROLLER 6: acceptOrder (Merchant)
// POST /api/v1/orders/:id/accept
// ===========================================================================
exports.acceptOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { estimatedPrepTime } = req.body; // in minutes

        const order = await Order.findById(id).populate('restaurantId');
        if (!order) {
            return next(new ErrorResponse('Order not found', 404));
        }

        // Verify merchant owns this restaurant
        if (!order.restaurantId.merchantId.equals(req.user._id)) {
            return next(new ErrorResponse('Unauthorized: You do not own this restaurant', 403));
        }

        // Validate transition
        if (!validateStatusTransition(order.status, 'ACCEPTED')) {
            return next(new ErrorResponse(`Invalid transition from ${order.status} to ACCEPTED`, 400));
        }

        // Update order
        order.status = 'ACCEPTED';
        order.estimatedPrepTime = estimatedPrepTime || 30;
        order.estimatedDeliveryAt = new Date(
            Date.now() + (order.estimatedPrepTime + 30) * 60 * 1000
        );

        order.statusHistory.push({
            status: 'ACCEPTED',
            timestamp: new Date(),
            changedBy: req.user._id,
            changedByRole: 'merchant'
        });

        await order.save();

        // Broadcast to customer
        broadcastOrderUpdate(id, {
            status: 'ACCEPTED',
            estimatedDeliveryTime: order.estimatedDeliveryAt
        });

        // Send notification
        sendToUser(order.customerId, 'notification', {
            type: 'order-accepted',
            title: 'Order Accepted!',
            message: `${order.restaurantId.name} is preparing your order`,
            orderId: id
        });
        
        // Push notification
        sendPushNotification(order.customerId, {
            title: 'Order Accepted',
            body: `${order.restaurantId.name} has started preparing your food!`
        }).catch(err => console.error('Push notification failed:', err));

        res.json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
};

// ===========================================================================
// CONTROLLER 7: rejectOrder (Merchant)
// POST /api/v1/orders/:id/reject
// ===========================================================================
exports.rejectOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const order = await Order.findById(id).populate('restaurantId');
        if (!order) {
            return next(new ErrorResponse('Order not found', 404));
        }

        // Verify merchant owns this restaurant
        if (!order.restaurantId.merchantId.equals(req.user._id)) {
            return next(new ErrorResponse('Unauthorized', 403));
        }

        // Validate transition
        if (!validateStatusTransition(order.status, 'REJECTED')) {
            return next(new ErrorResponse(`Invalid transition from ${order.status} to REJECTED`, 400));
        }

        order.status = 'REJECTED';
        order.statusHistory.push({
            status: 'REJECTED',
            timestamp: new Date(),
            changedBy: req.user._id,
            changedByRole: 'merchant',
            note: reason
        });

        await order.save();

        // Initiate refund if online payment
        if (order.payment.method !== 'COD' && order.payment.transactionId) {
            await initiateRefund(order.payment.transactionId, order.payment.breakdown.total, reason);
            order.payment.status = 'refunded';
            await order.save();
        }

        // Broadcast rejection
        broadcastOrderUpdate(id, {
            status: 'REJECTED',
            metadata: { reason }
        });

        // Notify customer
        sendToUser(order.customerId, 'notification', {
            type: 'order-rejected',
            title: 'Order Cancelled',
            message: `Unfortunately, the restaurant can't fulfill your order. Refund initiated if applicable.`,
            orderId: id,
            reason
        });
        
        // Push notification
        sendPushNotification(order.customerId, {
            title: 'Order Rejected',
            body: `Sorry, ${order.restaurantId.name} cannot fulfill your order at this time.`
        }).catch(err => console.error('Push notification failed:', err));

        res.json({ success: true, message: 'Order rejected and customer notified' });
    } catch (error) {
        next(error);
    }
};
