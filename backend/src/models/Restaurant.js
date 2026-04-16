// =============================================================================
// RESTAURANT MODEL  (backend/src/models/Restaurant.js)
// =============================================================================
// The central catalog entity. One merchant (User with role=merchant) can own
// multiple restaurants.
//
// Key design decisions:
//   • Location is a top-level GeoJSON Point (not nested under `address`) so
//     MongoDB's 2dsphere index works without a dotted-path.
//   • Menu items are embedded as a sub-array. For very large menus consider
//     extracting to a separate collection, but embedded gives one-query reads.
//   • Operating hours use a per-day map with open/close times, enabling
//     server-side "is open right now?" checks.
//   • Rating stores both average AND count so the restaurant card can render
//     "4.3 ★ (128 reviews)" without a JOIN.
//   • A post-save hook keeps the Merchant's restaurant count in sync.
// =============================================================================

const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// SUB-SCHEMA: modifier option (e.g. "Large +₹50")
// ---------------------------------------------------------------------------
const modifierOptionSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    priceAdjust:  { type: Number, default: 0 }, // can be negative (discount)
    isDefault:    { type: Boolean, default: false },
  },
  { _id: true }
);

// ---------------------------------------------------------------------------
// SUB-SCHEMA: modifier group (e.g. "Choose size", "Extras")
// ---------------------------------------------------------------------------
const modifierGroupSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true }, // "Choose a size"
    required: { type: Boolean, default: false },            // must pick one?
    // min / max number of options the customer can pick
    minSelect: { type: Number, default: 0 },
    maxSelect: { type: Number, default: 1 },
    options:   [modifierOptionSchema],
  },
  { _id: true }
);

// ---------------------------------------------------------------------------
// SUB-SCHEMA: single menu item
// ---------------------------------------------------------------------------
const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type:    String,
      required:[true, 'Menu item name is required'],
      trim:    true,
      maxlength:[100, 'Item name cannot exceed 100 characters'],
    },
    description: {
      type:    String,
      trim:    true,
      maxlength:[500, 'Item description cannot exceed 500 characters'],
    },
    price: {
      type:    Number,
      required:[true, 'Item price is required'],
      min:     [0, 'Price cannot be negative'],
    },
    // Category groups items on the menu page: "Starters", "Main Course", etc.
    category: {
      type:    String,
      required:[true, 'Item category is required'],
      trim:    true,
    },
    // Dietary tags help customers filter: vegan, gluten-free, etc.
    tags: [{ type: String, trim: true }],

    // Cloud URL (Cloudinary / S3) for the dish photo.
    image:        { type: String, default: null },

    // Modifier groups (size, toppings, sides…)
    modifiers:    [modifierGroupSchema],

    // Calories / nutritional info (optional but helps with health-conscious users)
    nutrition: {
      calories:     Number,
      protein:      Number, // grams
      carbs:        Number,
      fat:          Number,
    },

    // Toggle to hide an item temporarily (out of stock, seasonal, etc.)
    isAvailable: { type: Boolean, default: true },

    // Display order on the menu page (lower number = appears first)
    sortOrder:   { type: Number, default: 0 },

    // Soft-delete: mark as deleted without removing from order history
    isDeleted:   { type: Boolean, default: false, select: false },
  },
  { _id: true, timestamps: true }
);

// ---------------------------------------------------------------------------
// SUB-SCHEMA: single day's operating hours
// ---------------------------------------------------------------------------
const dayHoursSchema = new mongoose.Schema(
  {
    isOpen:    { type: Boolean, default: true },
    openTime:  { type: String, match: [/^\d{2}:\d{2}$/, 'Use HH:MM format'], default: '09:00' },
    closeTime: { type: String, match: [/^\d{2}:\d{2}$/, 'Use HH:MM format'], default: '22:00' },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// MAIN RESTAURANT SCHEMA
// ---------------------------------------------------------------------------
const restaurantSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------------------
    // Ownership
    // ------------------------------------------------------------------
    merchantId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'A restaurant must belong to a merchant'],
      // index:    true, // Removed: covered by manual index in db.js
    },

    // ------------------------------------------------------------------
    // Identity
    // ------------------------------------------------------------------
    name: {
      type:      String,
      required:  [true, 'Restaurant name is required'],
      trim:      true,
      maxlength: [100, 'Restaurant name cannot exceed 100 characters'],
    },
    slug: {
      type:   String,
      lowercase: true,
      // Populated by a pre-save hook (see below).
    },
    description: {
      type:    String,
      trim:    true,
      maxlength:[1000, 'Description cannot exceed 1000 characters'],
    },
    // e.g. ["Indian", "Chinese", "Biryani"]
    cuisineTypes: {
      type:     [String],
      required: [true, 'At least one cuisine type is required'],
      validate: {
        validator: (arr) => arr.length > 0,
        message:   'Please add at least one cuisine type',
      },
    },
    // Cover / banner image URL
    coverImage:  { type: String, default: null },
    photos:      [{ type: String }], // gallery of up to ~10 images

    // ------------------------------------------------------------------
    // Location  (GeoJSON Point — MUST be at top level for 2dsphere index)
    // ------------------------------------------------------------------
    location: {
      type: {
        type:    String,
        enum:    ['Point'],
        default: 'Point',
      },
      coordinates: {
        type:    [Number], // [longitude, latitude]
        required:[true, 'Restaurant coordinates are required'],
        validate: {
          validator(coords) {
            return (
              coords.length === 2 &&
              coords[0] >= -180 && coords[0] <= 180 &&
              coords[1] >= -90  && coords[1] <= 90
            );
          },
          message: 'Coordinates must be [longitude, latitude]',
        },
      },
    },

    // Human-readable address (for display, not geospatial queries)
    address: {
      street:  { type: String, trim: true },
      city:    { type: String, trim: true },
      state:   { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true, default: 'India' },
    },

    // ------------------------------------------------------------------
    // Menu catalog
    // ------------------------------------------------------------------
    menu: [menuItemSchema],

    // ------------------------------------------------------------------
    // Aggregate rating  (updated by Review post-save hook)
    // ------------------------------------------------------------------
    rating: {
      average: {
        type:    Number,
        default: 0,
        min:     0,
        max:     5,
        set:   (v) => Math.round(v * 10) / 10, // always store 1 decimal
      },
      count:  { type: Number, default: 0, min: 0 },
    },

    // ------------------------------------------------------------------
    // Ordering logistics
    // ------------------------------------------------------------------
    deliveryFee: {
      type:    Number,
      default: 0,
      min:     [0, 'Delivery fee cannot be negative'],
    },
    minimumOrder: {
      type:    Number,
      default: 0,
      min:     [0, 'Minimum order cannot be negative'],
    },
    // Estimated delivery window in minutes, e.g. { min: 25, max: 40 }
    estimatedDeliveryTime: {
      min: { type: Number, default: 20, min: 0 },
      max: { type: Number, default: 45, min: 0 },
    },

    // ------------------------------------------------------------------
    // Operating hours  (7-day map)
    // ------------------------------------------------------------------
    operatingHours: {
      monday:    { type: dayHoursSchema, default: () => ({}) },
      tuesday:   { type: dayHoursSchema, default: () => ({}) },
      wednesday: { type: dayHoursSchema, default: () => ({}) },
      thursday:  { type: dayHoursSchema, default: () => ({}) },
      friday:    { type: dayHoursSchema, default: () => ({}) },
      saturday:  { type: dayHoursSchema, default: () => ({}) },
      sunday:    { type: dayHoursSchema, default: () => ({}) },
    },

    // ------------------------------------------------------------------
    // Status flags
    // ------------------------------------------------------------------
    isOpen:                 { type: Boolean, default: true },   // real-time open/closed toggle
    isActive:               { type: Boolean, default: true },   // admin can deactivate
    isVerified:             { type: Boolean, default: false },  // admin verified the listing
    isFeatured:             { type: Boolean, default: false },  // show in promoted slots
    isReservationsEnabled:  { type: Boolean, default: true },   // merchant can disable dine-in bookings

    // Tags for special badges: "New", "Top Rated", "Fast Delivery", etc.
    badges: [{ type: String, trim: true }],

    // FSSAI license or similar regulatory reference number
    licenseNumber: { type: String, trim: true },
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

/** Returns only available (non-deleted, in-stock) menu items. */
restaurantSchema.virtual('availableMenu').get(function () {
  return (this.menu || []).filter((item) => item.isAvailable && !item.isDeleted);
});

/** Checks whether the restaurant is currently open based on operating hours. */
restaurantSchema.virtual('isCurrentlyOpen').get(function () {
  if (!this.isOpen || !this.isActive) return false;

  const days   = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const now    = new Date();
  const dayKey = days[now.getDay()];
  const hours  = this.operatingHours[dayKey];

  if (!hours || !hours.isOpen) return false;

  const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= toMinutes(hours.openTime) &&
         currentMinutes <= toMinutes(hours.closeTime);
});

// ===========================================================================
// PRE-SAVE HOOK: generate slug from name
// ===========================================================================
restaurantSchema.pre('save', async function () {
  if (this.isModified('name') || this.isNew) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')   // remove special chars
      .trim()
      .replace(/\s+/g, '-')           // spaces → hyphens
      + '-' + this._id.toString().slice(-6); // append part of ObjectId for uniqueness
  }
});

// ===========================================================================
// STATIC METHODS
// ===========================================================================

/**
 * Update the restaurant's rating fields after a review is saved/removed.
 * Called by the Review model's post-save and post-remove hooks.
 *
 * @param {ObjectId} restaurantId
 */
restaurantSchema.statics.recalculateRating = async function (restaurantId) {
  const Review = mongoose.model('Review');

  const result = await Review.aggregate([
    { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId.toString()) } },
    {
      $group: {
        _id:     '$restaurantId',
        average: { $avg: '$rating.overall' },
        count:   { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    await this.findByIdAndUpdate(restaurantId, {
      'rating.average': Math.round(result[0].average * 10) / 10,
      'rating.count':   result[0].count,
    });
  } else {
    await this.findByIdAndUpdate(restaurantId, {
      'rating.average': 0,
      'rating.count':   0,
    });
  }
};

// ===========================================================================
// MODEL EXPORT
// ===========================================================================
const Restaurant = mongoose.model('Restaurant', restaurantSchema);
module.exports = Restaurant;
