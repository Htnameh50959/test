// =============================================================================
// BOOKINGS CONTROLLER  (backend/src/controllers/bookings.js)
// =============================================================================
// Handles customer-side table reservation lifecycle.
// =============================================================================

const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Restaurant = require('../models/Restaurant');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create a new table reservation
// @route   POST /api/v1/bookings
// @access  Private (Customer)
exports.createBooking = async (req, res, next) => {
  try {
    const {
      restaurant: restaurantId,
      partySize,
      date,
      timeSlot,
      tableNumber,
      specialRequests,
      occasion
    } = req.body;

    // 1. Basic validation
    if (!restaurantId || !partySize || !date || !timeSlot) {
      return next(new ErrorResponse('Please provide restaurant, party size, date and time slot.', 400));
    }

    // 2. Ensure restaurant exists and accepts reservations
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return next(new ErrorResponse(`No restaurant found with ID ${restaurantId}`, 404));
    }

    if (!restaurant.isReservationsEnabled) {
      return next(new ErrorResponse('This restaurant is not currently accepting reservations.', 403));
    }

    // 3. Create the booking
    const booking = await Booking.create({
      restaurant: restaurantId,
      customer: req.user._id,
      partySize,
      date,
      timeSlot,
      tableNumber: tableNumber || null,
      specialRequests,
      occasion,
      status: 'pending' // Default
    });

    res.status(201).json({
      success: true,
      message: 'Reservation request sent successfully.',
      data: booking
    });

  } catch (err) {
    next(err);
  }
};

// @desc    Get current user's reservations
// @route   GET /api/v1/bookings/my-bookings
// @access  Private (Customer)
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate('restaurant', 'name coverImage address')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });

  } catch (err) {
    next(err);
  }
};
