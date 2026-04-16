// =============================================================================
// USERS CONTROLLER  (backend/src/controllers/users.js)
// =============================================================================
// Handles all profile and address management for the currently logged-in user.
//
// All routes here are protected — req.user is guaranteed to exist.
//
// Endpoints:
//   GET  /api/v1/users/profile              — fetch own profile
//   PUT  /api/v1/users/profile              — update name / phone / etc.
//   GET  /api/v1/users/addresses            — list saved addresses
//   POST /api/v1/users/addresses            — add a new address
//   PUT  /api/v1/users/addresses/:addressId — update an address
//   DELETE /api/v1/users/addresses/:addressId — delete an address
//   PATCH /api/v1/users/addresses/:addressId/default — set as default
// =============================================================================

const mongoose    = require('mongoose');
const User        = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Find a subdocument address by its _id within a user's addresses array.
 * Returns the address document, or throws a 404 ErrorResponse.
 */
const findAddressOrFail = (user, addressId) => {
  // Validate the ID shape before querying to avoid Mongoose CastError noise.
  if (!mongoose.Types.ObjectId.isValid(addressId)) {
    throw new ErrorResponse(`'${addressId}' is not a valid address ID.`, 400);
  }

  const address = user.addresses.id(addressId);
  if (!address) {
    throw new ErrorResponse(
      `No address found with ID '${addressId}' on your account.`,
      404
    );
  }
  return address;
};

/**
 * Build a GeoJSON location object from a coordinates array.
 * Coordinates arrive from the validated body as [longitude, latitude].
 */
const buildLocation = (coordinates) => ({
  type:        'Point',
  coordinates, // [lng, lat]
});

// ---------------------------------------------------------------------------
// CONTROLLER 1: getProfile
// GET /api/v1/users/profile
// ---------------------------------------------------------------------------
exports.getProfile = async (req, res, next) => {
  try {
    // Re-fetch from DB to guarantee freshness; populate nothing (no refs needed).
    const user = await User.findById(req.user._id);
    if (!user) return next(new ErrorResponse('User not found.', 404));

    res.status(200).json({
      success: true,
      data: {
        id:          user._id,
        email:       user.email,
        firstName:   user.profile.firstName,
        lastName:    user.profile.lastName  || null,
        fullName:    user.fullName,           // virtual
        phone:       user.profile.phone      || null,
        avatar:      user.profile.avatar     || null,
        dateOfBirth: user.profile.dateOfBirth || null,
        gender:      user.profile.gender     || null,
        role:        user.role,
        isVerified:  user.isVerified,
        loyalty:     user.loyalty,
        addresses:   user.addresses,
        createdAt:   user.createdAt,
        updatedAt:   user.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// CONTROLLER 2: updateProfile
// PUT /api/v1/users/profile
// ---------------------------------------------------------------------------
// Request body (validated by Joi — all fields optional, min 1 required):
//   { firstName?, lastName?, phone?, dateOfBirth?, gender?, avatar? }
//
// Design: we only update the fields that were actually sent (undefined fields
// are NOT written to DB), preventing accidental data loss.
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, dateOfBirth, gender, avatar } = req.body;

    // Fetch first so Mongoose subdocument dot-notation updates work correctly.
    const user = await User.findById(req.user._id);
    if (!user) return next(new ErrorResponse('User not found.', 404));

    // Selectively apply only the provided fields.
    if (firstName   !== undefined) user.profile.firstName   = firstName;
    if (lastName    !== undefined) user.profile.lastName    = lastName;
    if (phone       !== undefined) user.profile.phone       = phone;
    if (dateOfBirth !== undefined) user.profile.dateOfBirth = dateOfBirth;
    if (gender      !== undefined) user.profile.gender      = gender;
    if (avatar      !== undefined) user.profile.avatar      = avatar;

    // save() runs schema validators + all pre-save hooks.
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        id:          user._id,
        email:       user.email,
        firstName:   user.profile.firstName,
        lastName:    user.profile.lastName  || null,
        fullName:    user.fullName,
        phone:       user.profile.phone     || null,
        avatar:      user.profile.avatar    || null,
        dateOfBirth: user.profile.dateOfBirth || null,
        gender:      user.profile.gender    || null,
        role:        user.role,
        updatedAt:   user.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// CONTROLLER 3: getAddresses
// GET /api/v1/users/addresses
// ---------------------------------------------------------------------------
exports.getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new ErrorResponse('User not found.', 404));

    res.status(200).json({
      success: true,
      count:   user.addresses.length,
      data:    user.addresses,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// CONTROLLER 4: addAddress
// POST /api/v1/users/addresses
// ---------------------------------------------------------------------------
// Request body (validated by Joi schemas.users.addAddress):
//   { label?, street, city, state, zipCode, country?, coordinates[lng,lat],
//     instructions?, isDefault? }
exports.addAddress = async (req, res, next) => {
  try {
    const {
      label, street, city, state, zipCode, country,
      coordinates, instructions, isDefault,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return next(new ErrorResponse('User not found.', 404));

    // Enforce a sensible cap on saved addresses.
    if (user.addresses.length >= 10) {
      return next(new ErrorResponse(
        'You can save a maximum of 10 addresses. Please delete one before adding another.',
        400
      ));
    }

    // If the new address is flagged as default, unset all others first.
    if (isDefault) {
      user.addresses.forEach((addr) => { addr.isDefault = false; });
    }

    // Push the new address subdocument.
    user.addresses.push({
      label:       label        || 'Home',
      street,
      city,
      state,
      zipCode,
      country:     country      || 'India',
      location:    buildLocation(coordinates),
      instructions: instructions || undefined,
      // If this is the very first address, make it default automatically.
      isDefault: isDefault || user.addresses.length === 0,
    });

    // save() triggers the pre-save hook that enforces single-default invariant.
    await user.save();

    const newAddress = user.addresses[user.addresses.length - 1];

    res.status(201).json({
      success: true,
      message: 'Address added successfully.',
      data:    newAddress,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// CONTROLLER 5: updateAddress
// PUT /api/v1/users/addresses/:addressId
// ---------------------------------------------------------------------------
// All body fields are optional — only sent fields are updated.
exports.updateAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const {
      label, street, city, state, zipCode, country,
      coordinates, instructions, isDefault,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return next(new ErrorResponse('User not found.', 404));

    // Will throw a 400/404 ErrorResponse if invalid/not found.
    const address = findAddressOrFail(user, addressId);

    // Apply patch — only update fields that were actually provided.
    if (label        !== undefined) address.label        = label;
    if (street       !== undefined) address.street       = street;
    if (city         !== undefined) address.city         = city;
    if (state        !== undefined) address.state        = state;
    if (zipCode      !== undefined) address.zipCode      = zipCode;
    if (country      !== undefined) address.country      = country;
    if (instructions !== undefined) address.instructions = instructions;
    if (coordinates  !== undefined) address.location     = buildLocation(coordinates);

    // Handle default flag: if set to true, clear all others.
    if (isDefault === true) {
      user.addresses.forEach((addr) => { addr.isDefault = false; });
      address.isDefault = true;
    } else if (isDefault === false && address.isDefault) {
      // Cannot unset default without assigning another — would leave no default.
      return next(new ErrorResponse(
        'Cannot unset the default address without setting another address as default first.',
        400
      ));
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully.',
      data:    address,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// CONTROLLER 6: deleteAddress
// DELETE /api/v1/users/addresses/:addressId
// ---------------------------------------------------------------------------
exports.deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) return next(new ErrorResponse('User not found.', 404));

    const address = findAddressOrFail(user, addressId);

    const wasDefault = address.isDefault;

    // Remove the subdocument from the array.
    address.deleteOne(); // Mongoose subdocument method

    // If the deleted address was the default and others remain, promote first.
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully.',
      data:    { deletedId: addressId },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// CONTROLLER 7: setDefaultAddress
// PATCH /api/v1/users/addresses/:addressId/default
// ---------------------------------------------------------------------------
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) return next(new ErrorResponse('User not found.', 404));

    const address = findAddressOrFail(user, addressId);

    // Unset all, then set the target.
    user.addresses.forEach((addr) => { addr.isDefault = false; });
    address.isDefault = true;

    await user.save();

    res.status(200).json({
      success: true,
      message: `'${address.label}' is now your default delivery address.`,
      data:    address,
    });
  } catch (err) {
    next(err);
  }
};

const Restaurant = require('../models/Restaurant');

// ---------------------------------------------------------------------------
// FAVORITES
// ---------------------------------------------------------------------------

exports.getFavorites = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites', 'name cuisine rating deliveryTime priceRange images address isVerified');
    if (!user) return next(new ErrorResponse('User not found.', 404));
    res.status(200).json({ success: true, count: user.favorites.length, data: user.favorites });
  } catch (err) { next(err); }
};

exports.addFavorite = async (req, res, next) => {
  try {
    const { restaurantId } = req.body;
    if (!restaurantId) return next(new ErrorResponse('restaurantId is required.', 400));
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return next(new ErrorResponse('Restaurant not found.', 404));
    const user = await User.findById(req.user._id);
    if (!user.favorites.map(String).includes(String(restaurantId))) {
      user.favorites.push(restaurantId);
      await user.save();
    }
    res.status(200).json({ success: true, message: 'Added to favorites.' });
  } catch (err) { next(err); }
};

exports.removeFavorite = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new ErrorResponse('User not found.', 404));
    user.favorites = user.favorites.filter((id) => String(id) !== req.params.restaurantId);
    await user.save();
    res.status(200).json({ success: true, message: 'Removed from favorites.' });
  } catch (err) { next(err); }
};

// ---------------------------------------------------------------------------
// LOYALTY
// ---------------------------------------------------------------------------

exports.getLoyalty = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new ErrorResponse('User not found.', 404));
    const tierThresholds = { bronze: 0, silver: 1000, gold: 5000, platinum: 10000 };
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tiers.indexOf(user.loyalty.tier);
    const nextTier = tiers[currentIndex + 1] || null;
    const pointsToNext = nextTier ? tierThresholds[nextTier] - user.loyalty.totalEarned : null;
    res.status(200).json({
      success: true,
      data: {
        ...user.loyalty.toObject(),
        nextTier,
        pointsToNext,
        tierThresholds,
      }
    });
  } catch (err) { next(err); }
};

exports.redeemLoyalty = async (req, res, next) => {
  try {
    const { points } = req.body;
    if (!points || points < 100) return next(new ErrorResponse('Minimum redemption is 100 points.', 400));
    const user = await User.findById(req.user._id);
    if (!user) return next(new ErrorResponse('User not found.', 404));
    if (user.loyalty.points < points) return next(new ErrorResponse('Insufficient points.', 400));
    const discount = Math.floor(points / 10); // 10 points = ₹1
    await user.awardPoints(-points);
    await user.save();
    res.status(200).json({ success: true, message: `Redeemed ${points} points for ₹${discount} discount.`, discount, remainingPoints: user.loyalty.points });
  } catch (err) { next(err); }
};

// ---------------------------------------------------------------------------
// NOTIFICATIONS
// ---------------------------------------------------------------------------

exports.getNotifications = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new ErrorResponse('User not found.', 404));
    const sorted = [...user.notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.status(200).json({ success: true, count: sorted.length, unreadCount: sorted.filter(n => !n.isRead).length, data: sorted });
  } catch (err) { next(err); }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new ErrorResponse('User not found.', 404));
    const notif = user.notifications.id(req.params.id);
    if (!notif) return next(new ErrorResponse('Notification not found.', 404));
    notif.isRead = true;
    await user.save();
    res.status(200).json({ success: true, message: 'Marked as read.' });
  } catch (err) { next(err); }
};

exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new ErrorResponse('User not found.', 404));
    user.notifications.forEach(n => { n.isRead = true; });
    await user.save();
    res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) { next(err); }
};

exports.addNotification = async (req, res, next) => {
  try {
    const { userId, type, title, message, link } = req.body;
    const targetId = userId || req.user._id;
    const user = await User.findById(targetId);
    if (!user) return next(new ErrorResponse('User not found.', 404));
    user.notifications.unshift({ type: type || 'system', title, message, link: link || null });
    if (user.notifications.length > 50) user.notifications = user.notifications.slice(0, 50);
    await user.save();
    res.status(201).json({ success: true, message: 'Notification added.' });
  } catch (err) { next(err); }
};
