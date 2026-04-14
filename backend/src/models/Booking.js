// =============================================================================
// BOOKING MODEL (backend/src/models/Booking.js)
// =============================================================================
// Handles dine-in table reservations and event seatings.
// =============================================================================

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Booking must be linked to a restaurant']
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booking must be linked to a customer']
    },
    partySize: {
      type: Number,
      required: [true, 'Please specify the number of guests'],
      min: [1, 'Party size must be at least 1']
    },
    date: {
      type: Date,
      required: [true, 'Please specify the reservation date']
    },
    timeSlot: {
      type: String,
      required: [true, 'Please specify the reservation time']
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
      default: 'pending'
    },
    tableNumber: {
      type: String,
      default: null
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: [500, 'Special requests cannot exceed 500 characters']
    },
    occasion: {
      type: String,
      enum: ['Birthday', 'Anniversary', 'Business', 'Date', 'Other', null],
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexing for fast lookups
bookingSchema.index({ restaurant: 1, date: 1 });
bookingSchema.index({ customer: 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
