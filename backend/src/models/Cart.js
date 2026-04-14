// --- THE SHOPPING CART MODEL ---
// This file defines how a "Shopping Cart" is saved in our database.

const mongoose = require('mongoose');

// This is the "Blueprint" for a Cart.
const cartSchemaBlueprint = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User', // The user who owns this cart.
    required: true,
    unique: true // Each user can only have one shopping cart at a time.
  },
  restaurantId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Restaurant' // Which restaurant are they currently ordering from?
  },
  items: [{
    productId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Restaurant' // This technically refers to an item inside the restaurant's menu.
    },
    quantity: {
      type: Number,
      required: true,
      default: 1
    }
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the 'updatedAt' time whenever the cart is saved.
cartSchemaBlueprint.pre('save', async function() {
  this.updatedAt = Date.now();
});

// Create the model.
const Cart = mongoose.model('Cart', cartSchemaBlueprint);

// Export it!
module.exports = Cart;
