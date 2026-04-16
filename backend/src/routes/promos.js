const express = require('express');
const router = express.Router();
const { validatePromo, getPromos } = require('../controllers/promos');
const { protect } = require('../middleware/auth');

router.get('/', getPromos);
router.post('/validate', protect, validatePromo);

module.exports = router;
