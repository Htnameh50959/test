// =============================================================================
// RESTAURANTS CONTROLLER  (backend/src/controllers/restaurants.js)
// =============================================================================
// Handles every restaurant-related HTTP request.
//
// Public endpoints:
//   GET /api/v1/restaurants/search    — geospatial search (MongoDB $geoNear)
//   GET /api/v1/restaurants/:id       — full restaurant details + menu
//
// Protected endpoints (merchant / admin only):
//   POST   /api/v1/restaurants        — create restaurant
//   PUT    /api/v1/restaurants/:id    — update restaurant
//   DELETE /api/v1/restaurants/:id    — delete restaurant
//
// =============================================================================

const mongoose    = require('mongoose');
const Restaurant  = require('../models/Restaurant');
const ErrorResponse = require('../utils/errorResponse');
const {
  getCacheKey,
  getCachedResults,
  setCachedResults,
  invalidateRestaurantCache,
  cacheRestaurantDetail,
  getRestaurantDetailCache,
  getCacheMetrics,
  DEFAULT_TTL,
} = require('../utils/cache');

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

// Earth's radius in kilometres — used to convert metres → km in responses.
const EARTH_RADIUS_KM = 6371;

// Relevance score weights (must sum to 1.0).
// rating_weight × normalised_rating  +  proximity_weight × normalised_proximity
const WEIGHT_RATING    = 0.4;
const WEIGHT_PROXIMITY = 0.6;

// Maximum documents we will ever return in one page (prevents abuse).
const MAX_LIMIT = 50;

// ---------------------------------------------------------------------------
// HELPER: build the $match stage from optional filters
// ---------------------------------------------------------------------------
// We build match conditions AFTER $geoNear in the pipeline. $geoNear must
// always be the very first stage and handles coordinate + radius filtering.
// Everything else (cuisine, rating, price, features) goes into a second $match.
const buildFilterStage = ({ cuisineTypes, minRating, priceRange, features, isOpen }) => {
  const conditions = {};

  // Always require the restaurant to be active and not blocked by admin.
  conditions.isActive = true;

  // Optional: show only currently open restaurants.
  if (isOpen === 'true' || isOpen === true) {
    conditions.isOpen = true;
  }

  // Filter by one or more cuisine types (case-insensitive partial match).
  if (cuisineTypes && cuisineTypes.length > 0) {
    // Convert to regex so "indian" matches "Indian", "South Indian", etc.
    const cuisineRegexes = cuisineTypes.map(
      (c) => new RegExp(c.trim(), 'i')
    );
    conditions.cuisineTypes = { $elemMatch: { $in: cuisineRegexes } };
  }

  // Minimum average rating filter.
  if (minRating !== undefined && !isNaN(minRating)) {
    conditions['rating.average'] = { $gte: Number(minRating) };
  }

  // Price range filter (array of tier symbols: '$', '$$', '$$$', '$$$$').
  if (priceRange && priceRange.length > 0) {
    conditions.priceRange = { $in: priceRange };
  }

  // Amenity / feature flags (e.g. "parking", "outdoor_seating").
  if (features && features.length > 0) {
    // Each feature is compared against the 'badges' array on the restaurant.
    const featureRegexes = features.map(f => new RegExp(f.trim(), 'i'));
    conditions.badges = { $all: featureRegexes };
  }

  return conditions;
};

// ===========================================================================
// SEARCH ENDPOINT — geospatial + relevance ranking
// GET /api/v1/restaurants/search
// ===========================================================================
// Query params (all validated by Joi middleware before this runs):
//   lat, lng       — decimal degrees (required)
//   radius         — metres, default 5000
//   cuisineTypes   — comma-separated or array
//   minRating      — 0–5
//   priceRange     — comma-separated (₹, ₹₹, ₹₹₹, ₹₹₹₹)
//   features       — comma-separated strings
//   isOpen         — boolean string
//   limit          — max results per page, default 20, max 50
//   skip           — pagination offset, default 0
//
// Pipeline overview:
//   1. $geoNear   — distance filter using 2dsphere index (fast, uses index)
//   2. $match     — cuisine, rating, price, feature filters
//   3. $addFields — compute relevance score & human-friendly distance
//   4. $sort      — descending relevance score
//   5. $facet     — parallel: paginatedResults + totalCount
//   6. $project   — shape final response
// ===========================================================================
exports.searchRestaurants = async (req, res, next) => {
  try {
    const {
      lat, lng,
      radius      = 5000,    // metres
      cuisineTypes,
      minRating,
      priceRange,
      features,
      isOpen,
      limit       = 20,
      skip        = 0,
    } = req.query;

    // Parse & clamp pagination values.
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), MAX_LIMIT);
    const parsedSkip  = Math.max(parseInt(skip, 10) || 0, 0);
    const parsedRadius = Math.max(parseFloat(radius) || 5000, 100); // at least 100 m

    // Parse coordinates. Joi validation ensures they are numbers if present.
    const userLng = parseFloat(lng);
    const userLat = parseFloat(lat);
    const isGeo   = !isNaN(userLng) && !isNaN(userLat);

    // Parse array params that may arrive as comma-separated strings.
    const parseCsvArray = (val) => {
      if (!val) return [];
      return (Array.isArray(val) ? val : val.split(',')).map((s) => s.trim()).filter(Boolean);
    };
    const cuisineArr  = parseCsvArray(cuisineTypes);
    let priceArr      = parseCsvArray(priceRange);
    const featureArr  = parseCsvArray(features);

    // Map numeric price levels (1-4) from frontend to symbols ($, $$, etc)
    const priceMap = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };
    priceArr = priceArr.map(p => priceMap[p] || p);

    // ── CACHE CHECK ──────────────────────────────────────────────────────────
    // Build a canonical filter object (only include defined values) so the
    // cache key is the same regardless of param ordering in the query string.
    const filterSnapshot = {
      ...(parsedRadius !== 5000 && { radius: parsedRadius }),
      ...(cuisineArr.length   && { cuisineTypes: cuisineArr.sort() }),
      ...(minRating           && { minRating: Number(minRating) }),
      ...(priceArr.length     && { priceRange: priceArr.sort() }),
      ...(featureArr.length   && { features: featureArr.sort() }),
      ...(isOpen              && { isOpen }),
      // Include pagination so page 2 doesn't serve page 1's cache.
      limit: parsedLimit,
      skip:  parsedSkip,
    };

    const cacheKey = getCacheKey(userLat, userLng, filterSnapshot);
    const cached   = await getCachedResults(cacheKey);

    if (cached) {
      // Cache HIT — return immediately with a header so the client knows.
      return res.status(200).set('X-Cache', 'HIT').json(cached);
    }
    // Cache MISS — fall through to the aggregation pipeline.

    // Build the optional filter conditions for stage 2.
    const filterConditions = buildFilterStage({
      cuisineTypes: cuisineArr,
      minRating,
      priceRange:   priceArr,
      features:     featureArr,
      isOpen,
    });

    // ── AGGREGATION PIPELINE ─────────────────────────────────────────────────
    const pipeline = [];

    if (isGeo) {
      // ── STAGE 1: $geoNear ─────────────────────────────────────────────────
      pipeline.push({
        $geoNear: {
          near: {
            type:        'Point',
            coordinates: [userLng, userLat],
          },
          distanceField: 'distanceMetres',
          maxDistance:   parsedRadius,
          spherical:     true,
        },
      });
    }

    // ── STAGE 2: $match — apply all optional filters ──────────────────────
    pipeline.push({ $match: filterConditions });

    // ── STAGE 3: $addFields — computed fields ─────────────────────────────
    pipeline.push({
      $addFields: {
        // Convert metres → kilometres if distance exists.
        distanceKm: isGeo ? {
          $round: [{ $divide: ['$distanceMetres', 1000] }, 2],
        } : null,

        // ── RELEVANCE SCORE ──────────────────────────────────────────────
        relevanceScore: {
          $add: [
            {
              $multiply: [
                WEIGHT_RATING,
                {
                  $cond: {
                    if:   { $gt: ['$rating.count', 0] },
                    then: { $divide: ['$rating.average', 5] },
                    else: 0.5,
                  },
                },
              ],
            },
            {
              $multiply: [
                WEIGHT_PROXIMITY,
                isGeo ? {
                  $divide: [
                    1,
                    {
                      $add: [
                        1,
                        { $divide: [{ $ifNull: ['$distanceMetres', 0] }, 1000] }, 
                      ],
                    },
                  ],
                } : 0.5,
              ],
            },
          ],
        },
        isCurrentlyOpen: '$isOpen',
      },
    });

    // ── STAGE 4: $sort, $facet, $project... ────────────────────────────
    pipeline.push(
      { $sort: { relevanceScore: -1 } },
      {
        $facet: {
          results: [
            { $skip:  parsedSkip  },
            { $limit: parsedLimit },
            {
              $project: {
                _id:          1,
                name:         1,
                slug:         1,
                description:  1,
                cuisineTypes: 1,
                coverImage:   1,
                photos:       { $slice: ['$photos', 3] },
                location:    1,
                distanceKm:  1,
                address: {
                  street:  1,
                  city:    1,
                  state:   1,
                  zipCode: 1,
                },
                rating: 1,
                deliveryFee:          1,
                minimumOrder:         1,
                estimatedDeliveryTime:1,
                priceRange:           1,

                // Status
                isOpen:          1,
                isCurrentlyOpen: 1,
                isVerified:      1,
                isFeatured:      1,
                badges:          1,

                // Computed
                relevanceScore: { $round: ['$relevanceScore', 4] },
              },
            },
          ],

          // Branch B: total count (for pagination metadata).
          totalCount: [{ $count: 'count' }],
        },
      },
    );

    // ── EXECUTE ───────────────────────────────────────────────────────────────
    const startTime = Date.now();
    const [facetResult] = await Restaurant.aggregate(pipeline);
    const queryMs = Date.now() - startTime;

    const results = facetResult?.results    || [];
    const total   = facetResult?.totalCount[0]?.count || 0;

    const responseBody = {
      success: true,
      searchContext: {
        coordinates: isGeo ? { lat: userLat, lng: userLng } : null,
        radiusMetres: isGeo ? parsedRadius : null,
        radiusKm:     isGeo ? Math.round((parsedRadius / 1000) * 10) / 10 : null,
        filters: {
          cuisineTypes: cuisineArr.length  ? cuisineArr  : null,
          minRating:    minRating          ? Number(minRating) : null,
          priceRange:   priceArr.length    ? priceArr    : null,
          features:     featureArr.length  ? featureArr  : null,
          isOpen:       isOpen             || null,
        },
      },
      pagination: {
        total,
        limit:   parsedLimit,
        skip:    parsedSkip,
        page:    Math.floor(parsedSkip / parsedLimit) + 1,
        pages:   Math.ceil(total / parsedLimit),
        hasMore: parsedSkip + results.length < total,
      },
      meta: { queryMs, cache: 'MISS' },
      count: results.length,
      data:  results,
    };

    // ── CACHE STORE ───────────────────────────────────────────────────────────
    // Store the full response body so a cache hit can be served byte-for-byte.
    // Fire-and-forget: don't await — the response goes out immediately.
    setCachedResults(cacheKey, { ...responseBody, meta: { queryMs, cache: 'HIT' } }, DEFAULT_TTL);

    res.status(200).set('X-Cache', 'MISS').json(responseBody);

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// GET RESTAURANT DETAILS
// GET /api/v1/restaurants/:id
// ===========================================================================
// Returns full restaurant data including the complete menu.
// Populates the merchantId reference so the frontend can display owner info.
exports.getRestaurant = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId shape before query to avoid Mongoose CastError noise.
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`'${id}' is not a valid restaurant ID.`, 400));
    }

    // ── CACHE CHECK (detail cache, 10 min TTL) ────────────────────────────
    const cachedDetail = await getRestaurantDetailCache(id);
    if (cachedDetail) {
      return res.status(200).set('X-Cache', 'HIT').json(cachedDetail);
    }

    const restaurant = await Restaurant
      .findById(id)
      .populate('merchantId', 'profile.firstName profile.lastName email profile.phone');

    if (!restaurant) {
      return next(new ErrorResponse(`No restaurant found with ID '${id}'.`, 404));
    }

    // Filter the menu to remove soft-deleted items before sending.
    // (isDeleted is stored but excluded by `select: false` in the schema —
    //  we still guard here since some code paths might include it.)
    const menuVisible = restaurant.menu.filter((item) => !item.isDeleted);

    // Group menu by category for easy rendering on the frontend.
    const menuByCategory = menuVisible.reduce((acc, item) => {
      const cat = item.category || 'Uncategorised';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    // Sort each category by sortOrder.
    Object.keys(menuByCategory).forEach((cat) => {
      menuByCategory[cat].sort((a, b) => a.sortOrder - b.sortOrder);
    });

    const responseBody = {
      success: true,
      data: {
        ...restaurant.toObject({ virtuals: true }),
        menu:          menuVisible,
        menuByCategory,
        availableMenuCount: menuVisible.filter((i) => i.isAvailable).length,
      },
    };

    // Store in detail cache — fire-and-forget.
    cacheRestaurantDetail(id, { ...responseBody, meta: { cache: 'HIT' } });

    res.status(200).set('X-Cache', 'MISS').json(responseBody);

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// GET ALL RESTAURANTS (simple browse — no geo filter)
// GET /api/v1/restaurants
// ===========================================================================
// Used as a fallback list when the user hasn't granted location permission.
// Supports basic text search, pagination, and city-level filtering.
exports.getRestaurants = async (req, res, next) => {
  try {
    const {
      q,         // text search query
      city,
      isOpen,
      isFeatured,
      limit  = 20,
      skip   = 0,
      sortBy = 'rating',  // 'rating' | 'createdAt'
    } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), MAX_LIMIT);
    const parsedSkip  = Math.max(parseInt(skip,  10) || 0, 0);

    // Build query filter.
    const filter = { isActive: true };

    if (isOpen === 'true')     filter.isOpen    = true;
    if (isFeatured === 'true') filter.isFeatured = true;
    if (city)                  filter['address.city'] = new RegExp(city.trim(), 'i');

    if (q && q.trim()) {
      // Full-text index search on name, description, cuisineTypes.
      filter.$text = { $search: q.trim() };
    }

    // Sort options.
    const sortMap = {
      rating:    { 'rating.average': -1 },
      createdAt: { createdAt: -1 },
      name:      { name:  1 },
    };
    const sort = sortMap[sortBy] || sortMap.rating;

    const [restaurants, total] = await Promise.all([
      Restaurant.find(filter)
        .sort(sort)
        .skip(parsedSkip)
        .limit(parsedLimit)
        .select('name slug cuisineTypes coverImage rating deliveryFee minimumOrder estimatedDeliveryTime priceRange isOpen isVerified isFeatured badges address location'),
      Restaurant.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        total,
        limit:   parsedLimit,
        skip:    parsedSkip,
        pages:   Math.ceil(total / parsedLimit),
        hasMore: parsedSkip + restaurants.length < total,
      },
      count: restaurants.length,
      data:  restaurants,
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// CREATE RESTAURANT
// POST /api/v1/restaurants
// Protected: merchant, admin
// ===========================================================================
exports.createRestaurant = async (req, res, next) => {
  try {
    // Force the merchant to be whoever is currently authenticated.
    req.body.merchantId = req.user._id;

    const restaurant = await Restaurant.create(req.body);

    res.status(201).json({
      success: true,
      message: `Restaurant '${restaurant.name}' created successfully.`,
      data:    restaurant,
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// UPDATE RESTAURANT
// PUT /api/v1/restaurants/:id
// Protected: merchant (own), admin
// ===========================================================================
exports.updateRestaurant = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`'${id}' is not a valid restaurant ID.`, 400));
    }

    const restaurant = await Restaurant.findById(id);

    if (!restaurant) {
      return next(new ErrorResponse(`No restaurant found with ID '${id}'.`, 404));
    }

    // Ownership check — merchants can only edit their own restaurants.
    if (
      restaurant.merchantId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return next(new ErrorResponse('You are not authorised to update this restaurant.', 403));
    }

    // Prevent merchantId from being changed via the update body.
    delete req.body.merchantId;

    const updated = await Restaurant.findByIdAndUpdate(id, req.body, {
      new:           true,
      runValidators: true,
    });

    // Invalidate all search caches + this restaurant's detail cache
    // because menu, price, rating, or hours may have changed.
    // Fire-and-forget — cache miss is safe, stale data is not.
    invalidateRestaurantCache(id);

    res.status(200).json({
      success: true,
      message: 'Restaurant updated successfully.',
      data:    updated,
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// DELETE RESTAURANT
// DELETE /api/v1/restaurants/:id
// Protected: merchant (own), admin
// ===========================================================================
exports.deleteRestaurant = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`'${id}' is not a valid restaurant ID.`, 400));
    }

    const restaurant = await Restaurant.findById(id);

    if (!restaurant) {
      return next(new ErrorResponse(`No restaurant found with ID '${id}'.`, 404));
    }

    // Ownership check.
    if (
      restaurant.merchantId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return next(new ErrorResponse('You are not authorised to delete this restaurant.', 403));
    }

    // Soft-delete: mark inactive rather than destroying the record.
    await Restaurant.findByIdAndUpdate(id, { isActive: false });

    // Purge caches so this restaurant no longer appears in search results.
    invalidateRestaurantCache(id);

    res.status(200).json({
      success: true,
      message: `Restaurant '${restaurant.name}' has been deactivated.`,
    });

  } catch (err) {
    next(err);
  }
};
