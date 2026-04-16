// =============================================================================
// ADMIN ROUTES (backend/src/routes/admin.js)
// =============================================================================

const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getAllUsers,
  getAllMerchants,
  verifyMerchant,
  updateUserStatus,
  getAllOrders,
  getAllEvents,
} = require('../controllers/admin');

// Middleware
const { protect, authorize } = require('../middleware/auth');

// Apply auth to all routes
router.use(protect);
router.use(authorize('admin'));

// Stats
router.get('/stats', getAdminStats);

// User Management
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);

// Merchant Management
router.get('/merchants', getAllMerchants);
router.put('/merchants/:id/verify', verifyMerchant);

// Orders
router.get('/orders', getAllOrders);

// Events
router.get('/events', getAllEvents);

module.exports = router;
