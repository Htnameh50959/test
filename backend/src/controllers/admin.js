// =============================================================================
// ADMIN CONTROLLER (backend/src/controllers/admin.js)
// =============================================================================

const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get Admin Dashboard Stats
// @route   GET /api/v1/admin/stats
// @access  Private/Admin
exports.getAdminStats = async (req, res, next) => {
  try {
    const [userCount, merchantCount, totalRestaurants, pendingVerification] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'merchant' }),
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ isVerified: false })
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: userCount,
        merchants: merchantCount,
        restaurants: totalRestaurants,
        pending: pendingVerification,
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all users
// @route   GET /api/v1/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort('-createdAt');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all merchants/restaurants
// @route   GET /api/v1/admin/merchants
// @access  Private/Admin
exports.getAllMerchants = async (req, res, next) => {
  try {
    const restaurants = await Restaurant.find()
      .populate('merchantId', 'email profile.firstName profile.lastName')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify or deactivate restaurant
// @route   PUT /api/v1/admin/merchants/:id/verify
// @access  Private/Admin
exports.verifyMerchant = async (req, res, next) => {
  try {
    const { isVerified, isActive } = req.body;
    
    let restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return next(new ErrorResponse('Restaurant not found', 404));
    }

    if (isVerified !== undefined) restaurant.isVerified = isVerified;
    if (isActive !== undefined) restaurant.isActive = isActive;

    await restaurant.save();

    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user status (activate/deactivate)
// @route   PUT /api/v1/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    let user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    user.isActive = isActive; // Assuming User model has isActive or similar
    // Note: If User model doesn't have isActive, we might need a different flag or role based restriction.
    // Based on Common patterns, isActive is usually there.
    
    await user.save();

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};
