const Promo = require('../models/Promo');
const ErrorResponse = require('../utils/errorResponse');

// POST /api/v1/promos/validate
exports.validatePromo = async (req, res, next) => {
  try {
    const { code, orderTotal = 0 } = req.body;
    if (!code) return next(new ErrorResponse('Promo code is required.', 400));

    const promo = await Promo.findOne({ code: code.trim().toUpperCase(), isActive: true });
    if (!promo) return next(new ErrorResponse('Invalid or expired promo code.', 404));

    if (promo.expiresAt && promo.expiresAt < Date.now()) {
      return next(new ErrorResponse('This promo code has expired.', 400));
    }
    if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
      return next(new ErrorResponse('This promo code has reached its usage limit.', 400));
    }
    if (orderTotal < promo.minOrder) {
      return next(new ErrorResponse(`Minimum order of ₹${promo.minOrder} required for this code.`, 400));
    }

    let discount = 0;
    if (promo.type === 'percentage') {
      discount = (orderTotal * promo.value) / 100;
      if (promo.maxDiscount !== null) discount = Math.min(discount, promo.maxDiscount);
    } else {
      discount = promo.value;
    }
    discount = Math.min(discount, orderTotal);

    res.status(200).json({
      success: true,
      data: {
        code: promo.code,
        description: promo.description,
        type: promo.type,
        value: promo.value,
        discount: Math.round(discount * 100) / 100,
        finalTotal: Math.round((orderTotal - discount) * 100) / 100,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/promos (public — list active promos for display)
exports.getPromos = async (req, res, next) => {
  try {
    const promos = await Promo.find({
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: Date.now() } }],
    }).select('-usedCount -usageLimit -__v');

    res.status(200).json({ success: true, count: promos.length, data: promos });
  } catch (err) {
    next(err);
  }
};
