const express = require('express');
const router = express.Router();
const { 
    getAvailableDeliveries, 
    acceptDelivery, 
    getEarnings, 
    updateStatus 
} = require('../controllers/courier');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected and restricted to couriers
router.use(protect);
router.use(authorize('courier'));

router.get('/available', getAvailableDeliveries);
router.post('/accept/:orderId', acceptDelivery);
router.get('/earnings', getEarnings);
router.put('/status/:orderId', updateStatus);

module.exports = router;
