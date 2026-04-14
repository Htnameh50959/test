// =============================================================================
// USER MODEL  (backend/src/models/User.js)
// =============================================================================
// Stores every person who interacts with the platform.
//
// Roles:
//   consumer  – places orders, writes reviews
//   merchant  – owns / manages restaurants
//   courier   – delivers orders
//
// Key design decisions:
//   • Passwords are hashed with bcryptjs BEFORE save (pre-hook).
//   • Addresses carry GeoJSON Points so we can run $near queries.
//   • Loyalty points are awarded via the Orders / Reviews pipeline;
//     the field here is just the running total.
//   • `select: false` on sensitive fields keeps them out of normal queries.
// =============================================================================

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ---------------------------------------------------------------------------
// SUB-SCHEMA: a single saved address
// ---------------------------------------------------------------------------
// We embed a GeoJSON Point so the platform can suggest nearby restaurants or
// pre-fill the delivery location without an extra database round-trip.
const addressSchema = new mongoose.Schema(
  {
    // Human-readable label the customer gives: "Home", "Office", etc.
    label: {
      type:    String,
      trim:    true,
      default: 'Home',
    },

    // Full postal address
    street:  { type: String, trim: true },
    city:    { type: String, trim: true },
    state:   { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },

    // GeoJSON Point — [longitude, latitude]
    // MongoDB requires this exact shape for 2dsphere geospatial queries.
    location: {
      type: {
        type:    String,
        enum:    ['Point'],
        default: 'Point',
      },
      coordinates: {
        type:     [Number], // [lng, lat]
        required: true,
        validate: {
          validator(coords) {
            // lng: -180 to 180 | lat: -90 to 90
            return (
              coords.length === 2 &&
              coords[0] >= -180 && coords[0] <= 180 &&
              coords[1] >= -90  && coords[1] <= 90
            );
          },
          message: 'Coordinates must be [longitude, latitude] within valid ranges.',
        },
      },
    },

    // Only one address can be the default delivery destination.
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

// ---------------------------------------------------------------------------
// SUB-SCHEMA: loyalty / gamification
// ---------------------------------------------------------------------------
const loyaltySchema = new mongoose.Schema(
  {
    points:       { type: Number, default: 0, min: 0 },
    tier:         { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
    totalEarned:  { type: Number, default: 0, min: 0 }, // lifetime points earned
    totalRedeemed:{ type: Number, default: 0, min: 0 }, // lifetime points used
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// MAIN USER SCHEMA
// ---------------------------------------------------------------------------
const userSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------------------
    // Authentication
    // ------------------------------------------------------------------
    email: {
      type:     String,
      required: [true, 'Email address is required'],
      unique:   true, 
      lowercase: true,
      trim:     true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address',
      ],
    },

    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      // NEVER return password in query results unless explicitly selected.
      select: false,
    },

    // Stored during password-reset flows; not returned by default.
    passwordResetToken:   { type: String, select: false },
    passwordResetExpires: { type: Date,   select: false },

    // ------------------------------------------------------------------
    // Profile
    // ------------------------------------------------------------------
    profile: {
      firstName: {
        type:     String,
        required: [true, 'First name is required'],
        trim:     true,
        maxlength: [50, 'First name cannot exceed 50 characters'],
      },
      lastName: {
        type:    String,
        trim:    true,
        maxlength: [50, 'Last name cannot exceed 50 characters'],
      },
      // URL pointing to avatar stored in cloud storage (S3 / Cloudinary).
      avatar:       { type: String, default: null },
      phone: {
        type:  String,
        match: [/^\+?[1-9]\d{7,14}$/, 'Please provide a valid phone number'],
      },
      dateOfBirth:  { type: Date },
      gender: {
        type: String,
        enum: ['male', 'female', 'non-binary', 'prefer_not_to_say'],
      },
    },

    // ------------------------------------------------------------------
    // Access control
    // ------------------------------------------------------------------
    role: {
      type:    String,
      enum:    ['consumer', 'merchant', 'courier', 'admin'],
      default: 'consumer',
    },

    isActive:   { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },    // email verified?
    isBlocked:  { type: Boolean, default: false },    // admin can block accounts

    // ------------------------------------------------------------------
    // Saved locations
    // ------------------------------------------------------------------
    // Customers save multiple delivery addresses; only one can be default.
    addresses: [addressSchema],

    // ------------------------------------------------------------------
    // Gamification / Loyalty
    // ------------------------------------------------------------------
    loyalty: loyaltySchema,

    // ------------------------------------------------------------------
    // Courier-specific fields (ignored for other roles)
    // ------------------------------------------------------------------
    courierProfile: {
      vehicleType:     { type: String, enum: ['bicycle', 'motorcycle', 'car', 'scooter'] },
      vehicleNumber:   { type: String, trim: true },
      licenseNumber:   { type: String, trim: true },
      isAvailable:     { type: Boolean, default: false },
      
      // Tracking status
      isOnline:        { type: Boolean, default: false },
      lastOnline:      { type: Date },

      // Real-time location (updated by courier app)
      currentLocation: {
        type: {
          type:    String,
          enum:    ['Point'],
        },
        coordinates: { type: [Number], default: undefined }, // [lng, lat]
      },
      totalDeliveries: { type: Number, default: 0 },
      rating:          { type: Number, default: 0, min: 0, max: 5 },
    },

    // ------------------------------------------------------------------
    // Push-notification / device tokens
    // ------------------------------------------------------------------
    deviceTokens: [{ type: String }], // FCM tokens for push notifications

    // ------------------------------------------------------------------
    // Soft-delete / audit trail
    // ------------------------------------------------------------------
    deletedAt: { type: Date, default: null, select: false },
  },
  {
    timestamps: true, // Adds `createdAt` and `updatedAt` automatically.
    autoIndex:  false, // Disable autoIndex to prevent conflicts with manual db.js sync
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ===========================================================================
// INDEXES moved to db.js for centralized naming and management.
// ===========================================================================

// ===========================================================================
// VIRTUAL FIELDS  (computed at read time, not stored in DB)
// ===========================================================================

// Full display name without extra DB storage.
userSchema.virtual('fullName').get(function () {
  const { firstName, lastName } = this.profile;
  return lastName ? `${firstName} ${lastName}` : firstName;
});

// Default address helper — returns the address marked isDefault, or first one.
userSchema.virtual('defaultAddress').get(function () {
  if (!this.addresses || this.addresses.length === 0) return null;
  return this.addresses.find((a) => a.isDefault) || this.addresses[0];
});

// ===========================================================================
// PRE-SAVE HOOK: hash password
// ===========================================================================
userSchema.pre('save', async function () {
  // Only hash if the password field has been modified (includes new accounts).
  if (!this.isModified('password')) return;

  // Cost factor 12 is a good balance between security and login speed.
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ===========================================================================
// PRE-SAVE HOOK: enforce single default address
// ===========================================================================
userSchema.pre('save', async function () {
  if (this.isModified('addresses')) {
    const defaultAddresses = this.addresses.filter((a) => a.isDefault);
    // If someone accidentally marks more than one as default, keep only last.
    if (defaultAddresses.length > 1) {
      this.addresses.forEach((a, i) => {
        a.isDefault = i === this.addresses.length - 1;
      });
    }
    // If none is default, mark the first one.
    if (this.addresses.length > 0 && defaultAddresses.length === 0) {
      this.addresses[0].isDefault = true;
    }
  }
});

// ===========================================================================
// PRE-SAVE HOOK: auto-update loyalty tier
// ===========================================================================
userSchema.pre('save', async function () {
  if (this.isModified('loyalty.points') || this.isModified('loyalty.totalEarned')) {
    const pts = this.loyalty.totalEarned;
    if      (pts >= 10000) this.loyalty.tier = 'platinum';
    else if (pts >= 5000)  this.loyalty.tier = 'gold';
    else if (pts >= 1000)  this.loyalty.tier = 'silver';
    else                   this.loyalty.tier = 'bronze';
  }
});

// ===========================================================================
// PRE-SAVE HOOK: GeoJSON cleanup
// ===========================================================================
// Prevents "Can't extract geo keys" errors by removing the currentLocation 
// object if it's incomplete (missing type or coordinates).
userSchema.pre('save', async function () {
  const loc = this.courierProfile?.currentLocation;
  if (loc) {
    // If we have an object but it's missing the actual coordinates array, remove it.
    if (!loc.type || !loc.coordinates || loc.coordinates.length === 0) {
      this.courierProfile.currentLocation = undefined;
    }
  }
});

// ===========================================================================
// INSTANCE METHODS
// ===========================================================================

/**
 * Compare a plain-text password with the stored hash.
 * Always use this method — never compare passwords directly.
 */
userSchema.methods.matchPassword = async function (candidatePassword) {
  // `this.password` is excluded by default; callers must `.select('+password')`.
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Award loyalty points and keep running totals in sync.
 * Call this from the order/review service after business logic runs.
 *
 * @param {number} points – positive to add, negative to redeem
 */
userSchema.methods.awardLoyaltyPoints = function (points) {
  this.loyalty.points += points;
  if (points > 0) this.loyalty.totalEarned  += points;
  else            this.loyalty.totalRedeemed += Math.abs(points);
  // Make sure the balance never goes negative.
  if (this.loyalty.points < 0) this.loyalty.points = 0;
  return this; // chainable
};

// ===========================================================================
// MODEL EXPORT
// ===========================================================================
const User = mongoose.model('User', userSchema);
module.exports = User;
