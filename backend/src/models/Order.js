// =============================================================================
// ORDER MODEL  (backend/src/models/Order.js)
// =============================================================================
// Captures the full lifecycle of a customer's food order.
//
// State machine:
//   PENDING → ACCEPTED → PREPARING → READY_FOR_PICKUP
//     → OUT_FOR_DELIVERY → DELIVERED
//   Any state → CANCELLED (with a reason recorded)
//   DELIVERED → REFUND_REQUESTED → REFUNDED
//
// Key design decisions:
//   • Items embed a snapshot of name, price, and modifiers at order time.
//     This prevents stale data if the merchant later changes the menu.
//   • `deliveryAddress` embeds a GeoJSON Point copied from the user's address
//     at checkout — geospatial queries can find orders near a courier.
//   • `statusHistory` provides a full audit trail sorted by timestamp.
//   • `payment` stores all gateway response fields so refunds are easy.
//   • Pre-save hook generates a human-readable `orderNumber` (ORD-YYYYMMDD-XXXX).
// =============================================================================

const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// SUB-SCHEMA: selected modifier (snapshot at order time)
// ---------------------------------------------------------------------------
const selectedModifierSchema = new mongoose.Schema(
  {
    groupName:   { type: String, required: true }, // "Choose a size"
    optionName:  { type: String, required: true }, // "Large"
    priceAdjust: { type: Number, default: 0 },     // +50 / -10 / 0
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// SUB-SCHEMA: single order line item
// ---------------------------------------------------------------------------
const orderItemSchema = new mongoose.Schema(
  {
    // Keep references to the original catalog for reporting.
    menuItemId:  {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Restaurant',
    },

    // Snapshot of the item at the time of ordering.
    name:        { type: String, required: true },
    description: { type: String },
    image:       { type: String },

    quantity: {
      type:    Number,
      required:true,
      min:     [1, 'Quantity must be at least 1'],
    },
    // Base unit price (before modifiers).
    unitPrice: {
      type:    Number,
      required:true,
      min:     [0, 'Unit price cannot be negative'],
    },
    // Modifier selections and their combined price delta.
    modifiers:         [selectedModifierSchema],
    modifierTotalPrice:{ type: Number, default: 0 },

    // Total for this line: (unitPrice + modifierTotalPrice) × quantity
    lineTotal: {
      type:    Number,
      required:true,
      min:     0,
    },
    // Special note for this item: "no onions", "extra spicy", etc.
    itemNote: { type: String, trim: true, maxlength: 250 },
  },
  { _id: true }
);

// ---------------------------------------------------------------------------
// SUB-SCHEMA: delivery address (GeoJSON snapshot from checkout)
// ---------------------------------------------------------------------------
const deliveryAddressSchema = new mongoose.Schema(
  {
    label:   { type: String },
    street:  { type: String },
    city:    { type: String },
    state:   { type: String },
    zipCode: { type: String },
    country: { type: String, default: 'India' },

    // GeoJSON Point — copied from user's saved address at checkout time.
    // Enables spatial queries: "find all active deliveries within 5 km of me".
    location: {
      type: {
        type:    String,
        enum:    ['Point'],
        default: 'Point',
      },
      coordinates: {
        type:    [Number], // [longitude, latitude]
        required:[true, 'Delivery coordinates are required'],
      },
    },

    // Delivery instructions: "Ring bell twice", "Gate code 1234", etc.
    instructions: { type: String, trim: true, maxlength: 300 },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// SUB-SCHEMA: one entry in the status timeline
// ---------------------------------------------------------------------------
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type:     String,
      required: true,
      enum:     [
        'PENDING', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP',
        'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
        'REFUND_REQUESTED', 'REFUNDED', 'REJECTED',
      ],
    },
    // Who triggered this transition: could be system, merchant, courier, or customer.
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
    changedByRole: {
      type: String,
      enum: ['system', 'consumer', 'merchant', 'courier', 'admin'],
    },
    note:      { type: String, trim: true },    // optional human note
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ---------------------------------------------------------------------------
// SUB-SCHEMA: payment details
// ---------------------------------------------------------------------------
const paymentSchema = new mongoose.Schema(
  {
    method: {
      type:     String,
      required: [true, 'Payment method is required'],
      enum:     ['COD', 'ONLINE', 'WALLET', 'UPI', 'CARD'],
      default:  'ONLINE',
    },
    status: {
      type:    String,
      enum:    ['pending', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
    },

    // Gateway references (Razorpay / Stripe / etc.)
    gatewayOrderId:   { type: String },  // ID created by the gateway before payment
    transactionId:    { type: String },  // ID returned after successful payment
    gatewayResponse:  { type: mongoose.Schema.Types.Mixed }, // raw gateway payload

    // Breakdown stored so receipts can be generated without recalculation.
    breakdown: {
      subtotal:     { type: Number, required: true, min: 0 },
      deliveryFee:  { type: Number, default: 0,     min: 0 },
      tax:          { type: Number, default: 0,     min: 0 },
      discount:     { type: Number, default: 0,     min: 0 }, // coupon/promo savings
      loyaltyUsed:  { type: Number, default: 0,     min: 0 }, // points redeemed as cash
      total:        { type: Number, required: true, min: 0 },
    },

    // Loyalty points earned from this order (awarded on DELIVERED).
    loyaltyPointsEarned: { type: Number, default: 0 },

    // Promo / coupon code applied, if any.
    couponCode:      { type: String },
    couponDiscount:  { type: Number, default: 0 },

    // Refund tracking
    refundAmount:    { type: Number, default: 0 },
    refundedAt:      { type: Date },
    refundReason:    { type: String },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// MAIN ORDER SCHEMA
// ---------------------------------------------------------------------------
const orderSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------------------
    // Auto-generated human-readable reference, e.g. ORD-20240413-00042
    // ------------------------------------------------------------------
    orderNumber: {
      type:   String,
      // unique: true // Removed: covered by manual index in db.js to avoid naming conflicts
    },

    // ------------------------------------------------------------------
    // Participants
    // ------------------------------------------------------------------
    customerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Customer reference is required'],
      // index:    true, // Removed: covered by manual index in db.js
    },
    restaurantId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Restaurant',
      required: [true, 'Restaurant reference is required'],
      // index:    true, // Removed: covered by manual index in db.js
    },
    // Assigned after merchant accepts and a courier is matched.
    courierId: {
      type:  mongoose.Schema.Types.ObjectId,
      ref:   'User',
      default: null,
      // index: true, // Removed: covered by manual index in db.js
    },

    // ------------------------------------------------------------------
    // Order contents
    // ------------------------------------------------------------------
    items: {
      type:     [orderItemSchema],
      required: true,
      validate: {
        validator: (arr) => arr.length > 0,
        message:   'An order must have at least one item',
      },
    },

    // ------------------------------------------------------------------
    // Delivery details
    // ------------------------------------------------------------------
    deliveryAddress: {
      type:     deliveryAddressSchema,
      required: true,
    },
    orderType: {
      type:    String,
      enum:    ['DELIVERY', 'PICKUP', 'DINE_IN'],
      default: 'DELIVERY',
    },
    // Table number for DINE_IN orders.
    tableNumber: { type: String },
    specialInstructions: {
      type:    String,
      trim:    true,
      maxlength:[500, 'Special instructions cannot exceed 500 characters'],
    },

    // ------------------------------------------------------------------
    // State machine
    // ------------------------------------------------------------------
    status: {
      type:    String,
      enum:    [
        'PENDING', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP',
        'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
        'REFUND_REQUESTED', 'REFUNDED', 'REJECTED',
      ],
      default: 'PENDING',
      // index:   true, // Removed: covered by manual index in db.js
    },
    // Full ordered timeline of every status transition.
    statusHistory: [statusHistorySchema],

    // Reason provided when status = CANCELLED.
    cancellationReason: { type: String, trim: true },
    cancelledBy: {
      type: String,
      enum: ['consumer', 'merchant', 'courier', 'admin', 'system'],
    },

    // ------------------------------------------------------------------
    // Key timestamps (populated as status progresses)
    // ------------------------------------------------------------------
    acceptedAt:        { type: Date },
    preparingAt:       { type: Date },
    readyAt:           { type: Date },
    pickedUpAt:        { type: Date },  // courier picked up from restaurant
    deliveredAt:       { type: Date },
    cancelledAt:       { type: Date },

    // Estimated delivery time communicated to the customer (UTC).
    estimatedDeliveryAt: { type: Date },

    // ------------------------------------------------------------------
    // Payment
    // ------------------------------------------------------------------
    payment: {
      type:     paymentSchema,
      required: true,
    },

    // review link (set after customer submits review)
    reviewId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Review',
      default: null,
    },

    // estimated prep time for merchants (minutes)
    estimatedPrepTime: { type: Number, default: 0 },

    // Soft-delete / archival
    isArchived: { type: Boolean, default: false, select: false },
  },
  {
    timestamps: true, // createdAt + updatedAt
    autoIndex:  false, // Disable autoIndex to prevent conflicts with manual db.js sync
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ===========================================================================
// INDEXES moved to db.js for centralized naming and management.
// ===========================================================================

// ===========================================================================
// VIRTUAL FIELDS
// ===========================================================================

/** The number of distinct item types in this order. */
orderSchema.virtual('itemCount').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

/** True if the customer can still cancel (only in PENDING state). */
orderSchema.virtual('isCancellable').get(function () {
  return this.status === 'PENDING';
});

/** True if a review can be submitted (order delivered and no review yet). */
orderSchema.virtual('isReviewable').get(function () {
  return this.status === 'DELIVERED' && !this.reviewId;
});

// ===========================================================================
// PRE-VALIDATE HOOK: generate orderNumber
// ===========================================================================
orderSchema.pre('validate', async function () {
  if (this.isNew && !this.orderNumber) {
    // Use a daily counter padded to 5 digits: ORD-20240413-00001
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, ''); // "20240413"

    // Count today's orders to build the sequence number.
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay   = new Date(startOfDay.getTime() + 86400000);

    const count = await this.constructor.countDocuments({
      createdAt: { $gte: startOfDay, $lt: endOfDay },
    });

    this.orderNumber = `ORD-${datePart}-${String(count + 1).padStart(5, '0')}`;
  }
});

// ===========================================================================
// PRE-SAVE HOOK: push status transitions into history
// ===========================================================================
orderSchema.pre('save', async function () {
  if (this.isModified('status')) {
    // Record every status change in the immutable audit trail.
    this.statusHistory.push({ status: this.status, timestamp: new Date() });

    // Stamp the specific timing fields for common transitions.
    const now = new Date();
    switch (this.status) {
      case 'ACCEPTED':          this.acceptedAt        = now; break;
      case 'PREPARING':         this.preparingAt       = now; break;
      case 'READY_FOR_PICKUP':  this.readyAt           = now; break;
      case 'OUT_FOR_DELIVERY':  this.pickedUpAt        = now; break;
      case 'DELIVERED':         this.deliveredAt       = now; break;
      case 'CANCELLED':         this.cancelledAt       = now; break;
    }
  }
});

// ===========================================================================
// POST-SAVE HOOK: award loyalty points on delivery
// ===========================================================================
orderSchema.post('save', async function (doc) {
  // Only trigger when an order transitions to DELIVERED.
  if (doc.status === 'DELIVERED' && doc.payment.loyaltyPointsEarned === 0) {
    try {
      const User = mongoose.model('User');
      const pointsEarned = Math.floor(doc.payment.breakdown.total / 10); // 1 pt per ₹10

      if (pointsEarned > 0) {
        // Use atomic $inc to avoid race conditions.
        await User.findByIdAndUpdate(doc.customerId, {
          $inc: {
            'loyalty.points':      pointsEarned,
            'loyalty.totalEarned': pointsEarned,
          },
        });
        // Record on the order itself so the receipt can display "You earned X pts".
        await doc.constructor.findByIdAndUpdate(doc._id, {
          'payment.loyaltyPointsEarned': pointsEarned,
        });
      }
    } catch (err) {
      // Non-critical: log but don't fail the save.
      console.error('[Order post-save] Failed to award loyalty points:', err.message);
    }
  }
});

// ===========================================================================
// MODEL EXPORT
// ===========================================================================
const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
