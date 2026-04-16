const mongoose = require('mongoose');

const promoSchema = new mongoose.Schema(
  {
    code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    type:        { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
    value:       { type: Number, required: true },
    minOrder:    { type: Number, default: 0 },
    maxDiscount: { type: Number, default: null },
    usageLimit:  { type: Number, default: null },
    usedCount:   { type: Number, default: 0 },
    expiresAt:   { type: Date, default: null },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Promo', promoSchema);
