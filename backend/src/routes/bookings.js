// =============================================================================
// BOOKINGS ROUTES  (backend/src/routes/bookings.js)
// =============================================================================
const express = require('express');
const router = express.Router();

const {
  createBooking,
  getMyBookings
} = require('../controllers/bookings');

const { protect } = require('../middleware/auth');

// All routes here are protected as they require a customer identity
router.use(protect);

router.post('/', createBooking);
router.get('/my-bookings', getMyBookings);

module.exports = router;
