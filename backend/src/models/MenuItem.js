// =============================================================================
// MENU ITEM MODEL (backend/src/models/MenuItem.js)
// =============================================================================
// Extracted from Restaurant model for better scalability and cleaner management.
// =============================================================================

const mongoose = require('mongoose');

const modifierOptionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  priceAdjust: { type: Number, default: 0 },
  isDefault: { type: Boolean, default: false }
});

const modifierGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  minSelect: { type: Number, default: 0 },
  maxSelect: { type: Number, default: 1 },
  options: [modifierOptionSchema]
});

const menuItemSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Price is required']
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    image: { type: String },
    modifiers: [modifierGroupSchema],
    isAvailable: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    dietaryTags: [String], // Vegan, Gluten Free, etc.
    sortOrder: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

menuItemSchema.index({ restaurant: 1, category: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
module.exports = MenuItem;
