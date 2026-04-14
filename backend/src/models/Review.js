// =============================================================================
// REVIEW MODEL  (backend/src/models/Review.js)
// =============================================================================
// Stores customer reviews for completed orders.
//
// Key design decisions:
//   • A review is anchored to an ORDER (not just a restaurant) to prove the
//     reviewer actually ate there. The restaurantId is denormalized for query
//     speed but is always derivable from the order.
//   • Category ratings (food, service, ambiance, value) allow granular
//     analysis in the merchant dashboard.
//   • Sentiment analysis fields are populated asynchronously by a background
//     job (e.g., calling OpenAI / AWS Comprehend); the schema is ready to
//     receive results without a migration.
//   • `qualityScore` is a composite metric (0-100) computed from rating,
//     text length, sentiment, and photo count. The merchant dashboard sorts
//     by this to surface the most useful reviews.
//   • Post-save / post-remove hooks keep the Restaurant's rating in sync.
//   • One review per order is enforced by a unique compound index.
// =============================================================================

const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// SUB-SCHEMA: category breakdown ratings
// ---------------------------------------------------------------------------
const categoryRatingSchema = new mongoose.Schema(
  {
    // Each sub-rating is optional; null means customer didn't rate that category.
    food: {
      type: Number,
      min:  [1, 'Food rating must be between 1 and 5'],
      max:  [5, 'Food rating must be between 1 and 5'],
      default: null,
    },
    service: {
      type: Number,
      min:  [1, 'Service rating must be between 1 and 5'],
      max:  [5, 'Service rating must be between 1 and 5'],
      default: null,
    },
    ambiance: {
      type: Number,
      min:  [1, 'Ambiance rating must be between 1 and 5'],
      max:  [5, 'Ambiance rating must be between 1 and 5'],
      default: null,
    },
    value: {
      type: Number,
      min:  [1, 'Value rating must be between 1 and 5'],
      max:  [5, 'Value rating must be between 1 and 5'],
      default: null,
    },
    delivery: {
      type: Number,
      min:  [1, 'Delivery rating must be between 1 and 5'],
      max:  [5, 'Delivery rating must be between 1 and 5'],
      default: null,
    },
    packaging: {
      type: Number,
      min:  [1, 'Packaging rating must be between 1 and 5'],
      max:  [5, 'Packaging rating must be between 1 and 5'],
      default: null,
    },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// SUB-SCHEMA: NLP / sentiment analysis
// ---------------------------------------------------------------------------
// Populated asynchronously by the sentiment analysis service. If the service
// hasn't run yet, all fields will be null.
const sentimentSchema = new mongoose.Schema(
  {
    // "positive" | "neutral" | "negative"
    label: {
      type: String,
      enum: ['positive', 'neutral', 'negative', null],
      default: null,
    },
    // Confidence score returned by the NLP provider (0–1).
    score: { type: Number, min: 0, max: 1, default: null },

    // Key phrases / topics extracted from the review text.
    keyPhrases: [{ type: String }],

    // Aspect-level: what the reviewer praised or criticized.
    aspects: [
      {
        aspect:    { type: String },  // "spice level", "delivery speed", etc.
        sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
        _id:       false,
      },
    ],

    // Which NLP provider ran the analysis: "aws_comprehend", "openai", etc.
    provider:    { type: String, default: null },
    processedAt: { type: Date,   default: null },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// SUB-SCHEMA: merchant response to a review
// ---------------------------------------------------------------------------
const merchantResponseSchema = new mongoose.Schema(
  {
    text: {
      type:    String,
      required:true,
      trim:    true,
      maxlength:[1000, 'Merchant response cannot exceed 1000 characters'],
    },
    respondedAt: { type: Date, default: Date.now },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// MAIN REVIEW SCHEMA
// ---------------------------------------------------------------------------
const reviewSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------------------
    // Anchors — the review is tied to a specific order
    // ------------------------------------------------------------------
    orderId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Order',
      required: [true, 'A review must be linked to a completed order'],
    },
    // Denormalized from order for fast restaurant-level aggregation.
    restaurantId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Restaurant',
      required: [true, 'Restaurant reference is required'],
      // index:    true, // Removed: covered by manual index in db.js
    },
    // The customer who placed the order.
    customerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Customer reference is required'],
      // index:    true, // Removed: covered by manual index in db.js
    },

    // ------------------------------------------------------------------
    // Core review content
    // ------------------------------------------------------------------
    rating: {
      // Single overall score displayed publicly.
      overall: {
        type:     Number,
        required: [true, 'Overall rating is required'],
        min:      [1, 'Rating must be at least 1'],
        max:      [5, 'Rating must be at most 5'],
      },
      // Granular breakdown (optional per-category).
      categories: { type: categoryRatingSchema, default: () => ({}) },
    },

    // Written review body.
    text: {
      type:    String,
      trim:    true,
      maxlength:[2000, 'Review text cannot exceed 2000 characters'],
    },

    // Photo URLs uploaded by the customer (stored in Cloudinary / S3).
    photos: {
      type:     [String],
      validate: {
        validator: (arr) => arr.length <= 10,
        message:   'You can attach a maximum of 10 photos per review',
      },
    },

    // Tags / keywords the customer explicitly selects: "Delicious", "Fast", "Too salty"
    tags: [{ type: String, trim: true }],

    // ------------------------------------------------------------------
    // Sentiment analysis (async, populated by a background worker)
    // ------------------------------------------------------------------
    sentiment: { type: sentimentSchema, default: () => ({}) },

    // ------------------------------------------------------------------
    // Quality score  (0–100, computed by pre-save hook)
    // ------------------------------------------------------------------
    // Used to rank reviews in the merchant dashboard and decide points awarded.
    qualityScore: {
      type:    Number,
      default: 0,
      min:     0,
      max:     100,
    },

    // Loyalty points awarded to the customer for submitting this review.
    pointsAwarded: { type: Number, default: 0, min: 0 },

    // ------------------------------------------------------------------
    // Merchant response
    // ------------------------------------------------------------------
    merchantResponse: { type: merchantResponseSchema, default: null },

    // ------------------------------------------------------------------
    // Moderation
    // ------------------------------------------------------------------
    isVerified:  { type: Boolean, default: false }, // admin-verified genuine review
    isHidden:    { type: Boolean, default: false }, // hidden by admin (policy violation)
    isFlagged:   { type: Boolean, default: false }, // flagged for moderator review
    flagReason:  { type: String },

    // Helpful votes ("X people found this review helpful")
    helpfulVotes: {
      count: { type: Number, default: 0, min: 0 },
      // Store voter IDs to prevent duplicate votes (capped at 1000 to avoid unbounded growth).
      voters: {
        type:     [mongoose.Schema.Types.ObjectId],
        default:  [],
        select:   false,
      },
    },
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

/** Average of all non-null category ratings. Returns null if none are set. */
reviewSchema.virtual('averageCategoryRating').get(function () {
  const cats = this.rating.categories;
  if (!cats) return null;

  const values = ['food', 'service', 'ambiance', 'value', 'delivery', 'packaging']
    .map((k) => cats[k])
    .filter((v) => v !== null && v !== undefined);

  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
});

/** Convenience flag: has the merchant replied? */
reviewSchema.virtual('hasResponse').get(function () {
  return !!this.merchantResponse && !!this.merchantResponse.text;
});

// ===========================================================================
// PRE-SAVE HOOK: compute qualityScore and pointsAwarded
// ===========================================================================
// Quality score formula (0-100):
//   40 pts  – overall rating (8 pts per star)
//   20 pts  – text length (1 pt per 10 chars, max 20)
//   15 pts  – category ratings filled in (2.5 pts each, max 6 categories)
//   15 pts  – photos attached (5 pts each, max 3)
//   10 pts  – sentiment bonus (positive → 10, neutral → 5, negative → 0)
// Points awarded to customer = floor(qualityScore / 5)   → max 20 pts
reviewSchema.pre('save', async function () {
  if (this.isNew || this.isModified('rating') || this.isModified('text') ||
      this.isModified('photos') || this.isModified('sentiment'))
  {
    let score = 0;

    // 1. Overall rating contribution (max 40)
    score += (this.rating.overall || 0) * 8;

    // 2. Text length (max 20)
    const textLength = (this.text || '').length;
    score += Math.min(Math.floor(textLength / 10), 20);

    // 3. Category ratings (max 15)
    const cats = this.rating.categories || {};
    const filledCats = ['food', 'service', 'ambiance', 'value', 'delivery', 'packaging']
      .filter((k) => cats[k] !== null && cats[k] !== undefined).length;
    score += Math.min(filledCats * 2.5, 15);

    // 4. Photos (max 15)
    score += Math.min((this.photos || []).length * 5, 15);

    // 5. Sentiment bonus (max 10)
    const sentimentBonus = { positive: 10, neutral: 5, negative: 0 };
    score += sentimentBonus[this.sentiment?.label] || 0;

    this.qualityScore = Math.min(Math.round(score), 100);

    // Points earned for submitting this review (max 20 loyalty points).
    this.pointsAwarded = Math.floor(this.qualityScore / 5);
  }
});

// ===========================================================================
// POST-SAVE HOOK: update restaurant's aggregate rating
// ===========================================================================
reviewSchema.post('save', async function () {
  try {
    const Restaurant = mongoose.model('Restaurant');
    await Restaurant.recalculateRating(this.restaurantId);
  } catch (err) {
    console.error('[Review post-save] Rating recalculation failed:', err.message);
  }
});

// ===========================================================================
// POST-SAVE HOOK: award loyalty points to customer
// ===========================================================================
reviewSchema.post('save', async function () {
  // Only award points once (when the review is first created).
  if (this.isNew || this.pointsAwarded === 0) return;
  try {
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(this.customerId, {
      $inc: {
        'loyalty.points':      this.pointsAwarded,
        'loyalty.totalEarned': this.pointsAwarded,
      },
    });
  } catch (err) {
    console.error('[Review post-save] Failed to award loyalty points:', err.message);
  }
});

// ===========================================================================
// POST-REMOVE HOOK: update restaurant rating after review deletion
// ===========================================================================
reviewSchema.post('remove', async function () {
  try {
    const Restaurant = mongoose.model('Restaurant');
    await Restaurant.recalculateRating(this.restaurantId);
  } catch (err) {
    console.error('[Review post-remove] Rating recalculation failed:', err.message);
  }
});

// ===========================================================================
// STATIC METHODS
// ===========================================================================

/**
 * Returns pre-aggregated stats for a restaurant's review panel.
 * Used by the merchant analytics dashboard.
 *
 * @param {ObjectId} restaurantId
 * @returns {{ overall, byCategory, distribution, total }}
 */
reviewSchema.statics.getRestaurantStats = async function (restaurantId) {
  const result = await this.aggregate([
    { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId.toString()), isHidden: false } },
    {
      $group: {
        _id:               '$restaurantId',
        total:             { $sum: 1 },
        overallAvg:        { $avg: '$rating.overall' },
        foodAvg:           { $avg: '$rating.categories.food' },
        serviceAvg:        { $avg: '$rating.categories.service' },
        ambianceAvg:       { $avg: '$rating.categories.ambiance' },
        valueAvg:          { $avg: '$rating.categories.value' },
        deliveryAvg:       { $avg: '$rating.categories.delivery' },
        packagingAvg:      { $avg: '$rating.categories.packaging' },
        // Rating distribution buckets (how many 1★, 2★, … 5★).
        star5: { $sum: { $cond: [{ $gte: ['$rating.overall', 4.5] }, 1, 0] } },
        star4: { $sum: { $cond: [{ $and: [{ $gte: ['$rating.overall', 3.5] }, { $lt: ['$rating.overall', 4.5] }] }, 1, 0] } },
        star3: { $sum: { $cond: [{ $and: [{ $gte: ['$rating.overall', 2.5] }, { $lt: ['$rating.overall', 3.5] }] }, 1, 0] } },
        star2: { $sum: { $cond: [{ $and: [{ $gte: ['$rating.overall', 1.5] }, { $lt: ['$rating.overall', 2.5] }] }, 1, 0] } },
        star1: { $sum: { $cond: [{ $lt: ['$rating.overall', 1.5] }, 1, 0] } },
      },
    },
  ]);

  if (result.length === 0) return null;

  const r = result[0];
  const round = (v) => (v ? Math.round(v * 10) / 10 : null);

  return {
    total:   r.total,
    overall: round(r.overallAvg),
    byCategory: {
      food:      round(r.foodAvg),
      service:   round(r.serviceAvg),
      ambiance:  round(r.ambianceAvg),
      value:     round(r.valueAvg),
      delivery:  round(r.deliveryAvg),
      packaging: round(r.packagingAvg),
    },
    distribution: { 5: r.star5, 4: r.star4, 3: r.star3, 2: r.star2, 1: r.star1 },
  };
};

// ===========================================================================
// MODEL EXPORT
// ===========================================================================
const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
