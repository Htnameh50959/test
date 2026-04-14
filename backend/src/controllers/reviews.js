// =============================================================================
// REVIEWS CONTROLLER  (backend/src/controllers/reviews.js)
// =============================================================================
// Handles the full review lifecycle with gamification:
//
//   POST /api/v1/reviews                  — submit a review
//   GET  /api/v1/reviews                  — reviews for a restaurant
//   GET  /api/v1/reviews/:id              — single review detail
//   PUT  /api/v1/reviews/:id              — update own review
//   DELETE /api/v1/reviews/:id            — delete own review
//   POST /api/v1/reviews/suggestions      — get keyword suggestions
//   POST /api/v1/reviews/:id/helpful      — mark review as helpful
//   POST /api/v1/reviews/:id/respond      — merchant response
//
// Gamification pipeline (on submission):
//   1. Validate order ownership + DELIVERED status
//   2. Check duplicate (one review per order)
//   3. Run NLP (sentiment + keyword extraction)
//   4. Calculate quality score
//   5. Save review
//   6. Update restaurant aggregate rating (atomic)
//   7. Award loyalty points to customer
//   8. Return full result with points breakdown
// =============================================================================

const mongoose   = require('mongoose');
const path       = require('path');
const fs         = require('fs');

const Review      = require('../models/Review');
const Order       = require('../models/Order');
const Restaurant  = require('../models/Restaurant');
const User        = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const {
  analyseSentiment,
  extractKeywords,
  calculateQualityScore,
  generateKeywordSuggestions,
  detectSpam,
} = require('../services/reviewAnalysis');

// ---------------------------------------------------------------------------
// ANTI-SPAM CONSTANTS
// ---------------------------------------------------------------------------
const MIN_REVIEW_TEXT_LENGTH    = 20;   // chars
const MAX_REVIEW_TEXT_LENGTH    = 2000; // chars
const MAX_PHOTOS_PER_REVIEW     = 10;
const MIN_HOURS_BEFORE_RESUBMIT = 48;   // after update, can't update again for 48 h

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Simulate local photo storage (swap this section for S3 SDK in production).
 * Accepts an array of base64 strings and writes them to /uploads/reviews/.
 *
 * Real S3 usage:
 *   const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
 *   ...upload each file and return the public URL.
 *
 * @param {string[]} base64Photos  — array of data:image/jpeg;base64,... strings
 * @param {string}   reviewId      — used to namespace the files
 * @returns {string[]}             — array of URL paths
 */
const storePhotos = async (base64Photos = [], reviewId) => {
  if (!base64Photos || base64Photos.length === 0) return [];

  const reviewDir = path.join(process.cwd(), 'uploads', 'reviews', reviewId.toString());
  fs.mkdirSync(reviewDir, { recursive: true });

  const urls = [];
  for (let i = 0; i < base64Photos.length; i++) {
    const rawData = base64Photos[i];

    // Validate it looks like a base64 image.
    const match = rawData.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) continue;  // skip malformed entries

    const [, mimeType, b64] = match;
    const ext      = mimeType.split('/')[1] || 'jpg';
    const filename = `photo_${i + 1}.${ext}`;
    const filepath = path.join(reviewDir, filename);

    fs.writeFileSync(filepath, Buffer.from(b64, 'base64'));

    // In production this would be an S3 URL; here it's a local path.
    urls.push(`/uploads/reviews/${reviewId}/${filename}`);
  }

  return urls;
};

/**
 * Run the full NLP + gamification pipeline on review data.
 * Returns all computed fields ready to be stored on the Review document.
 */
const runAnalysisPipeline = async ({
  text,
  photos,
  hasVideo,
  orderDeliveredAt,
  reviewId,
}) => {
  // 1. Sentiment analysis
  const sentiment = analyseSentiment(text);

  // 2. Keyword extraction
  const rawKeywords = extractKeywords(text, 15);
  const keywordObjs = rawKeywords.map(({ term, score }) => ({ term, score }));

  // 3. Quality score
  const { score: qualityScore, breakdown } = calculateQualityScore({
    text,
    photos,
    hasVideo,
    orderDeliveredAt,
    keywordCount: rawKeywords.length,
  });

  // Convert quality score to loyalty points (1 pt per 5 quality pts, max 20)
  const pointsAwarded = Math.min(Math.floor(qualityScore / 5), 20);

  return { sentiment, keywordObjs, qualityScore, breakdown, pointsAwarded };
};

// ===========================================================================
// CONTROLLER 1: submitReview
// POST /api/v1/reviews
// ===========================================================================
exports.submitReview = async (req, res, next) => {
  try {
    const {
      orderId,
      rating,           // { overall, categories: { food, service, ambiance, value, delivery, packaging } }
      text,
      photos,           // array of base64 strings or URLs
      tags,
      hasVideo = false,
    } = req.body;

    // ── 1. Validate order exists and belongs to this customer ────────────────
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return next(new ErrorResponse(`'${orderId}' is not a valid order ID.`, 400));
    }

    const order = await Order.findById(orderId)
      .populate('restaurantId', 'name');

    if (!order) {
      return next(new ErrorResponse('Order not found.', 404));
    }
    if (order.customerId.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('You can only review your own orders.', 403));
    }
    if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED') {
      return next(new ErrorResponse(
        `Reviews can only be submitted for delivered orders. Current order status: '${order.status}'.`, 400
      ));
    }

    // ── 2. Prevent duplicate reviews (one per order) ──────────────────────
    const existing = await Review.findOne({ orderId });
    if (existing) {
      return next(new ErrorResponse(
        'You have already submitted a review for this order. ' +
        'Use the update endpoint to edit it.',
        409 // Conflict
      ));
    }

    // ── 3a. Daily rate limit: max 10 reviews per user per day ────────────────
    const REVIEWS_PER_DAY_LIMIT = 10;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayCount = await Review.countDocuments({
      customerId: req.user._id,
      createdAt:  { $gte: startOfDay },
    });
    if (todayCount >= REVIEWS_PER_DAY_LIMIT) {
      return next(new ErrorResponse(
        `Daily review limit reached (${REVIEWS_PER_DAY_LIMIT} reviews per day). ` +
        `You have submitted ${todayCount} reviews today. Please try again tomorrow.`,
        429 // Too Many Requests
      ));
    }

    // ── 3b. Text validation (anti-spam) ──────────────────────────────────
    const trimmedText = (text || '').trim();
    if (trimmedText.length < MIN_REVIEW_TEXT_LENGTH) {
      return next(new ErrorResponse(
        `Review text must be at least ${MIN_REVIEW_TEXT_LENGTH} characters. ` +
        `You wrote ${trimmedText.length} characters.`, 400
      ));
    }
    if (trimmedText.length > MAX_REVIEW_TEXT_LENGTH) {
      return next(new ErrorResponse(
        `Review text cannot exceed ${MAX_REVIEW_TEXT_LENGTH} characters.`, 400
      ));
    }

    // ── 3c. Spam / duplicate detection ─────────────────────────────────────
    // Fetch the user's 20 most recent review texts for similarity check.
    const recentReviews = await Review.find(
      { customerId: req.user._id, isHidden: false },
      'text'
    ).sort({ createdAt: -1 }).limit(20);
    const recentTexts = recentReviews.map((r) => r.text);

    const spamResult = detectSpam({
      text:              trimmedText,
      previousReviews:   recentTexts,
      similarityThreshold: 0.80,
    });

    // Hard-block exact/near-duplicate content.
    if (spamResult.isDuplicate) {
      return next(new ErrorResponse(
        `This review is too similar to one you previously submitted ` +
        `(${Math.round(spamResult.similarityScore * 100)}% identical). ` +
        `Please write a unique, original review.`,
        409
      ));
    }

    // Soft-flag generic or very-short reviews rather than blocking them
    // (the quality score multiplier already penalises short text).
    const isFlagged  = spamResult.isGeneric;
    const spamFlags  = spamResult.flags;

    // ── 4. Photo limit enforcement ────────────────────────────────────────
    const photoInput = photos || [];
    if (photoInput.length > MAX_PHOTOS_PER_REVIEW) {
      return next(new ErrorResponse(
        `Maximum ${MAX_PHOTOS_PER_REVIEW} photos allowed per review.`, 400
      ));
    }

    // ── 5. Validate overall rating ────────────────────────────────────────
    const overallRating = typeof rating === 'object' ? rating.overall : rating;
    if (!overallRating || overallRating < 1 || overallRating > 5) {
      return next(new ErrorResponse('Overall rating must be between 1 and 5.', 400));
    }

    // ── 6. Create a placeholder review document for the storage helper ────
    //       We need the _id before storing photos so they can be namespaced.
    const tempId = new mongoose.Types.ObjectId();

    // ── 7. Store photos (local simulation of S3 upload) ───────────────────
    let storedPhotoUrls = [];
    if (photoInput.length > 0) {
      // Filter out any entries that don't look like base64 (already-uploaded URLs pass through)
      const base64Photos = photoInput.filter((p) => p.startsWith('data:'));
      const existingUrls = photoInput.filter((p) => !p.startsWith('data:'));
      storedPhotoUrls = [...existingUrls, ...(await storePhotos(base64Photos, tempId))];
    }

    // ── 8. Run NLP + gamification pipeline ───────────────────────────────
    const { sentiment, keywordObjs, qualityScore, breakdown, pointsAwarded } =
      await runAnalysisPipeline({
        text:             trimmedText,
        photos:           storedPhotoUrls,
        hasVideo,
        orderDeliveredAt: order.deliveredAt || order.updatedAt,
        reviewId:         tempId,
      });

    // ── 9. Persist the review  ────────────────────────────────────────────
    const review = await Review.create({
      _id: tempId,    // use the pre-generated id (photos are already stored under it)
      orderId,
      restaurantId: order.restaurantId._id,
      customerId:   req.user._id,

      rating: {
        overall:    overallRating,
        categories: typeof rating === 'object' ? (rating.categories || {}) : {},
      },

      text:   trimmedText,
      photos: storedPhotoUrls,
      tags:   tags || [],

      sentiment: {
        label:       sentiment.label,
        score:       sentiment.score,
        keyPhrases:  sentiment.positiveTerms.concat(sentiment.negativeTerms),
        aspects: keywordObjs.slice(0, 5).map(({ term }) => ({
          aspect:    term,
          sentiment: sentiment.label,
        })),
        provider:    'keyword_lexicon',
        processedAt: new Date(),
      },

      qualityScore,
      pointsAwarded,

      isVerified: false,
      isFlagged,              // flagged if review text is generic/low-effort
      spamFlags,              // array of triggered spam rule names
    });

    // ── 10. Update restaurant aggregate rating (atomic) ───────────────────
    // Uses the static method we defined on the Restaurant model.
    await Restaurant.recalculateRating(order.restaurantId._id);

    // Also invalidate Redis search cache for this restaurant.
    try {
      const { invalidateRestaurantCache } = require('../utils/cache');
      invalidateRestaurantCache(order.restaurantId._id.toString());
    } catch (_) { /* cache not critical */ }

    // ── 11. Award loyalty points ──────────────────────────────────────────
    if (pointsAwarded > 0) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: {
          'loyalty.points':      pointsAwarded,
          'loyalty.totalEarned': pointsAwarded,
        },
      });
    }

    // ── 12. Mark the order as reviewed ───────────────────────────────────
    await Order.findByIdAndUpdate(orderId, { reviewId: review._id });

    res.status(201).json({
      success: true,
      message: `Review submitted! You earned ${pointsAwarded} loyalty points.`,
      data: {
        review: {
          id:           review._id,
          restaurantId: review.restaurantId,
          overallRating,
          text:         review.text,
          photos:       review.photos,
          qualityScore,
          sentiment:    { label: sentiment.label, score: sentiment.score },
          createdAt:    review.createdAt,
        },
        gamification: {
          pointsAwarded,
          scoreBreakdown: breakdown,
          totalLoyaltyPoints: (await User.findById(req.user._id).select('loyalty.points'))?.loyalty?.points,
        },
      },
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// CONTROLLER 2: getReviews
// GET /api/v1/reviews?restaurantId=…
// GET /api/v1/restaurants/:restaurantId/reviews  (merged params)
// ===========================================================================
exports.getReviews = async (req, res, next) => {
  try {
    // Support both route styles.
    const restaurantId = req.params.restaurantId || req.query.restaurantId;
    const {
      sort   = 'recent',   // 'recent' | 'quality' | 'rating_high' | 'rating_low' | 'helpful'
      rating,              // filter by exact star count
      limit  = 20,
      skip   = 0,
    } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const parsedSkip  = Math.max(parseInt(skip, 10) || 0, 0);

    // Build filter.
    const filter = { isHidden: false };
    if (restaurantId) {
      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        return next(new ErrorResponse(`'${restaurantId}' is not a valid restaurant ID.`, 400));
      }
      filter.restaurantId = restaurantId;
    }
    if (rating) {
      filter['rating.overall'] = parseInt(rating, 10);
    }

    // Sort options.
    const sortMap = {
      recent:      { createdAt: -1 },
      quality:     { qualityScore: -1 },
      rating_high: { 'rating.overall': -1, createdAt: -1 },
      rating_low:  { 'rating.overall':  1, createdAt: -1 },
      helpful:     { 'helpfulVotes.count': -1, createdAt: -1 },
    };
    const sortOrder = sortMap[sort] || sortMap.recent;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort(sortOrder)
        .skip(parsedSkip)
        .limit(parsedLimit)
        .populate('customerId', 'profile.firstName profile.lastName profile.avatar')
        .select('-sentiment.aspects -__v'),
      Review.countDocuments(filter),
    ]);

    // Include aggregate stats if querying for a specific restaurant.
    let stats = null;
    if (restaurantId) {
      stats = await Review.getRestaurantStats(restaurantId);
    }

    res.status(200).json({
      success: true,
      pagination: {
        total,
        limit:   parsedLimit,
        skip:    parsedSkip,
        pages:   Math.ceil(total / parsedLimit),
        hasMore: parsedSkip + reviews.length < total,
      },
      stats,
      count: reviews.length,
      data:  reviews,
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// CONTROLLER 3: getReview
// GET /api/v1/reviews/:id
// ===========================================================================
exports.getReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`'${id}' is not a valid review ID.`, 400));
    }

    const review = await Review.findById(id)
      .populate('customerId',   'profile.firstName profile.lastName profile.avatar')
      .populate('restaurantId', 'name coverImage');

    if (!review || review.isHidden) {
      return next(new ErrorResponse('Review not found.', 404));
    }

    res.status(200).json({ success: true, data: review });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// CONTROLLER 4: updateReview
// PUT /api/v1/reviews/:id
// ===========================================================================
exports.updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, text, photos, tags } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`'${id}' is not a valid review ID.`, 400));
    }

    const review = await Review.findById(id);
    if (!review) {
      return next(new ErrorResponse('Review not found.', 404));
    }

    // Only the author can update.
    if (review.customerId.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('You can only edit your own reviews.', 403));
    }

    // Anti-spam: only allow updating each field once within MIN_HOURS_BEFORE_RESUBMIT.
    const hoursSinceUpdate = (Date.now() - review.updatedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceUpdate < MIN_HOURS_BEFORE_RESUBMIT && !req.user.role === 'admin') {
      return next(new ErrorResponse(
        `You can update this review again after ${Math.ceil(MIN_HOURS_BEFORE_RESUBMIT - hoursSinceUpdate)} hour(s).`, 429
      ));
    }

    // Apply changes.
    if (rating) {
      if (typeof rating === 'object') {
        review.rating.overall    = rating.overall   ?? review.rating.overall;
        review.rating.categories = { ...review.rating.categories.toObject?.() || {}, ...rating.categories };
      } else {
        review.rating.overall = rating;
      }
    }
    if (text) {
      const trimmed = text.trim();
      if (trimmed.length < MIN_REVIEW_TEXT_LENGTH || trimmed.length > MAX_REVIEW_TEXT_LENGTH) {
        return next(new ErrorResponse(
          `Review text must be between ${MIN_REVIEW_TEXT_LENGTH} and ${MAX_REVIEW_TEXT_LENGTH} characters.`, 400
        ));
      }
      review.text = trimmed;

      // Re-run NLP on updated text.
      const newSentiment = analyseSentiment(trimmed);
      review.sentiment.label       = newSentiment.label;
      review.sentiment.score       = newSentiment.score;
      review.sentiment.processedAt = new Date();
    }
    if (photos !== undefined) review.photos = photos.slice(0, MAX_PHOTOS_PER_REVIEW);
    if (tags   !== undefined) review.tags   = tags;

    // Recalculate quality score.
    const { score: newQuality, breakdown } = calculateQualityScore({
      text:         review.text,
      photos:       review.photos,
      keywordCount: extractKeywords(review.text).length,
    });
    review.qualityScore = newQuality;

    await review.save();

    // Update restaurant aggregate.
    await Restaurant.recalculateRating(review.restaurantId);

    res.status(200).json({
      success: true,
      message: 'Review updated.',
      data: { review, qualityScore: newQuality, scoreBreakdown: breakdown },
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// CONTROLLER 5: deleteReview
// DELETE /api/v1/reviews/:id
// ===========================================================================
exports.deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`'${id}' is not a valid review ID.`, 400));
    }

    const review = await Review.findById(id);
    if (!review) {
      return next(new ErrorResponse('Review not found.', 404));
    }

    const isOwner = review.customerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return next(new ErrorResponse('You can only delete your own reviews.', 403));
    }

    // Soft-delete: hide instead of destroying (preserves audit trail).
    review.isHidden  = true;
    review.isFlagged = false;
    await review.save();

    // Reclaim loyalty points awarded for this review.
    if (review.pointsAwarded > 0) {
      await User.findByIdAndUpdate(review.customerId, {
        $inc: {
          'loyalty.points':       -review.pointsAwarded,
          'loyalty.totalRedeemed': review.pointsAwarded,
        },
      });
    }

    // Update restaurant aggregate.
    await Restaurant.recalculateRating(review.restaurantId);

    res.status(200).json({ success: true, message: 'Review removed.' });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// CONTROLLER 6: getKeywordSuggestions
// POST /api/v1/reviews/suggestions
// ===========================================================================
// Body: { orderId, rating }
// Returns 8-10 context-aware keyword suggestions before the user writes.
exports.getKeywordSuggestions = async (req, res, next) => {
  try {
    const { orderId, rating = 3 } = req.body;

    let orderItems = [];
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      const order = await Order.findById(orderId).select('items');
      if (order) {
        orderItems = order.items.map((i) => i.name);
      }
    }

    const suggestions = generateKeywordSuggestions({
      rating: Number(rating),
      orderItems,
    });

    res.status(200).json({
      success: true,
      data: { suggestions, count: suggestions.length },
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// CONTROLLER 7: markHelpful
// POST /api/v1/reviews/:id/helpful
// ===========================================================================
// Toggles a "helpful" vote — calling again removes the vote.
exports.markHelpful = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`'${id}' is not a valid review ID.`, 400));
    }

    const review = await Review.findById(id).select('+helpfulVotes.voters');
    if (!review || review.isHidden) {
      return next(new ErrorResponse('Review not found.', 404));
    }

    // Prevent self-voting.
    if (review.customerId.toString() === req.user._id.toString()) {
      return next(new ErrorResponse('You cannot vote on your own review.', 400));
    }

    const voterId    = req.user._id.toString();
    const voterIndex = review.helpfulVotes.voters.findIndex((v) => v.toString() === voterId);

    let action;
    if (voterIndex === -1) {
      // Add vote.
      review.helpfulVotes.voters.push(req.user._id);
      review.helpfulVotes.count++;
      action = 'added';
    } else {
      // Remove vote (toggle).
      review.helpfulVotes.voters.splice(voterIndex, 1);
      review.helpfulVotes.count = Math.max(0, review.helpfulVotes.count - 1);
      action = 'removed';
    }

    await review.save();

    res.status(200).json({
      success: true,
      message: `Helpful vote ${action}.`,
      data: { helpfulVotes: review.helpfulVotes.count },
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// CONTROLLER 8: addMerchantResponse
// POST /api/v1/reviews/:id/respond
// ===========================================================================
// Body: { text }  — merchant publicly responds to a review.
exports.addMerchantResponse = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const { text } = req.body;

    if (!text || text.trim().length < 10) {
      return next(new ErrorResponse('Response text must be at least 10 characters.', 400));
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`'${id}' is not a valid review ID.`, 400));
    }

    const review = await Review.findById(id).populate('restaurantId', 'merchantId');
    if (!review || review.isHidden) {
      return next(new ErrorResponse('Review not found.', 404));
    }

    // Only the owning merchant or an admin can respond.
    const isOwningMerchant =
      req.user.role === 'merchant' &&
      review.restaurantId?.merchantId?.toString() === req.user._id.toString();

    if (!isOwningMerchant && req.user.role !== 'admin') {
      return next(new ErrorResponse('Only the restaurant owner can respond to this review.', 403));
    }

    if (review.merchantResponse?.text) {
      return next(new ErrorResponse('A response has already been added to this review.', 409));
    }

    review.merchantResponse = {
      text:        text.trim(),
      respondedAt: new Date(),
      respondedBy: req.user._id,
    };
    await review.save();

    res.status(201).json({
      success: true,
      message: 'Response added successfully.',
      data: { merchantResponse: review.merchantResponse },
    });

  } catch (err) {
    next(err);
  }
};
// ===========================================================================
// CONTROLLER 9: getAnalytics
// GET /api/v1/restaurants/:restaurantId/reviews/analytics
// ===========================================================================
// Returns rich analytics for a restaurant's reviews:
//   - Sentiment distribution (positive / neutral / negative counts)
//   - Rating distribution (1–5 star breakdown)
//   - Category rating averages (food, service, ambiance, value, delivery)
//   - Trending keywords (word cloud data — top 30 terms with frequency)
//   - Sentiment trend over time (weekly buckets for the last 12 weeks)
//   - Total reviews, average rating, response rate
exports.getAnalytics = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return next(new ErrorResponse(`'${restaurantId}' is not a valid restaurant ID.`, 400));
    }

    const restaurantObjId = new mongoose.Types.ObjectId(restaurantId);
    const baseMatch = {
      $match: { restaurantId: restaurantObjId, isHidden: false },
    };

    // Run all aggregation pipelines in parallel for performance.
    const [
      overviewResult,
      ratingDistResult,
      categoryAvgsResult,
      sentimentDistResult,
      sentimentTrendResult,
      keywordFreqResult,
    ] = await Promise.all([

      // ── 1. Overview ───────────────────────────────────────────────────────────────
      Review.aggregate([
        baseMatch,
        {
          $group: {
            _id:            null,
            totalReviews:   { $sum: 1 },
            averageRating:  { $avg: '$rating.overall' },
            avgQuality:     { $avg: '$qualityScore' },
            withResponse:   { $sum: { $cond: [{ $ifNull: ['$merchantResponse.text', false] }, 1, 0] } },
            withPhotos:     { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$photos', []] } }, 0] }, 1, 0] } },
            totalHelpful:   { $sum: '$helpfulVotes.count' },
          },
        },
      ]),

      // ── 2. Rating distribution (1-5 star counts) ──────────────────────────────────
      Review.aggregate([
        baseMatch,
        {
          $group: {
            _id:   { $round: ['$rating.overall', 0] },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // ── 3. Category rating averages ─────────────────────────────────────────────
      Review.aggregate([
        baseMatch,
        {
          $group: {
            _id:              null,
            avgFood:          { $avg: '$rating.categories.food' },
            avgService:       { $avg: '$rating.categories.service' },
            avgAmbiance:      { $avg: '$rating.categories.ambiance' },
            avgValue:         { $avg: '$rating.categories.value' },
            avgDelivery:      { $avg: '$rating.categories.delivery' },
            avgPackaging:     { $avg: '$rating.categories.packaging' },
          },
        },
      ]),

      // ── 4. Sentiment distribution ────────────────────────────────────────────────
      Review.aggregate([
        baseMatch,
        {
          $group: {
            _id:   '$sentiment.label',
            count: { $sum: 1 },
            avgScore: { $avg: '$sentiment.score' },
          },
        },
      ]),

      // ── 5. Sentiment trend (weekly, last 12 weeks) ───────────────────────────
      Review.aggregate([
        {
          $match: {
            restaurantId: restaurantObjId,
            isHidden:     false,
            createdAt:    { $gte: new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              // Group by ISO week — truncate date to Monday of each week.
              year: { $isoWeekYear: '$createdAt' },
              week: { $isoWeek:     '$createdAt' },
            },
            avgSentiment:  { $avg: '$sentiment.score' },
            avgRating:     { $avg: '$rating.overall' },
            reviewCount:   { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } },
      ]),

      // ── 6. Keyword frequency for word cloud ──────────────────────────────────
      // We use a two-stage pipeline:
      //   a) $project to extract all texts
      //   b) In-JS: run extractKeywords on the corpus
      // This is simpler than a full $unwind + $group on tokenised terms
      // and avoids storing keywords on the review document itself.
      (async () => {
        const docs = await Review.find(
          { restaurantId: restaurantObjId, isHidden: false },
          'text'
        ).lean();

        // Concatenate all review texts into one corpus.
        const corpus = docs.map((d) => d.text).join(' ');

        // Re-use extractKeywords with a higher topN for word cloud.
        const { extractKeywords: extract } = require('../services/reviewAnalysis');
        return extract(corpus, 30);
      })(),
    ]);

    // ── Shape the response ──────────────────────────────────────────────────────────────

    const overview = overviewResult[0] || {
      totalReviews: 0, averageRating: 0, avgQuality: 0,
      withResponse: 0, withPhotos: 0, totalHelpful: 0,
    };
  []
    // Build a full 1-5 rating distribution map (fill missing stars with 0).
    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const { _id, count } of ratingDistResult) {
      if (_id >= 1 && _id <= 5) ratingDist[_id] = count;
    }

    // Category averages (round to 1 dp).
    const catRaw = categoryAvgsResult[0] || {};
    const categoryAverages = {};
    for (const [key, val] of Object.entries(catRaw)) {
      if (key !== '_id' && val !== null) {
        categoryAverages[key.replace('avg', '').toLowerCase()] =
          Math.round((val || 0) * 10) / 10;
      }
    }

    // Sentiment distribution.
    const sentimentDist = { positive: 0, neutral: 0, negative: 0 };
    let   avgSentimentScore = 0;
    for (const { _id, count, avgScore } of sentimentDistResult) {
      if (_id) sentimentDist[_id] = count;
      avgSentimentScore += (avgScore || 0) * count;
    }
    if (overview.totalReviews > 0) {
      avgSentimentScore = Math.round((avgSentimentScore / overview.totalReviews) * 100) / 100;
    }

    // Sentiment trend — label each week bucket.
    const sentimentTrend = sentimentTrendResult.map(({ _id, avgSentiment, avgRating, reviewCount }) => ({
      year:         _id.year,
      week:         _id.week,
      avgSentiment: Math.round((avgSentiment || 0) * 100) / 100,
      avgRating:    Math.round((avgRating    || 0) * 10)  / 10,
      reviewCount,
    }));

    res.status(200).json({
      success: true,
      restaurantId,
      data: {
        overview: {
          totalReviews:   overview.totalReviews,
          averageRating:  Math.round((overview.averageRating  || 0) * 10) / 10,
          avgQualityScore:Math.round((overview.avgQuality     || 0) * 10) / 10,
          responseRate:   overview.totalReviews > 0
            ? `${Math.round((overview.withResponse / overview.totalReviews) * 100)}%`
            : '0%',
          reviewsWithPhotos: overview.withPhotos,
          totalHelpfulVotes: overview.totalHelpful,
        },
        ratingDistribution: ratingDist,
        categoryAverages,
        sentiment: {
          distribution:      sentimentDist,
          averageScore:      avgSentimentScore,
          overallLabel:
            avgSentimentScore >= 0.2  ? 'positive' :
            avgSentimentScore <= -0.2 ? 'negative' : 'neutral',
        },
        sentimentTrend,
        // Word cloud data — sorted by score descending.
        trendingKeywords: (keywordFreqResult || [])
          .sort((a, b) => b.score - a.score)
          .map(({ term, score }) => ({ term, weight: Math.round(score * 100) / 100 })),
      },
    });

  } catch (err) {
    next(err);
  }
};
