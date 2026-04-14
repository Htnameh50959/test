// =============================================================================
// CART CONTROLLER  (backend/src/controllers/cart.js)
// =============================================================================
// All cart state is kept in Redis (via cartService) with a 24-hour TTL.
// The MongoDB Cart model is only written at order checkout time.
//
// Endpoints:
//   GET    /api/v1/cart              — get current cart (with live menu validation)
//   POST   /api/v1/cart/items        — add item (single-restaurant constraint)
//   PUT    /api/v1/cart/items/:id    — update item quantity
//   DELETE /api/v1/cart/items/:id    — remove item
//   DELETE /api/v1/cart              — clear entire cart
//
// All endpoints require an authenticated user (protect middleware applied
// globally on the router).
// =============================================================================

const mongoose   = require('mongoose');
const Restaurant = require('../models/Restaurant');
const ErrorResponse = require('../utils/errorResponse');
const {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  validateCartAgainstRestaurant,
  recalculateTotals,
  emptyCart,
} = require('../services/cartService');

// ---------------------------------------------------------------------------
// HELPER: fetch restaurant or 404
// ---------------------------------------------------------------------------
const fetchRestaurant = async (restaurantId, next) => {
  if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
    next(new ErrorResponse(`'${restaurantId}' is not a valid restaurant ID.`, 400));
    return null;
  }
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    next(new ErrorResponse('Restaurant not found.', 404));
    return null;
  }
  return restaurant;
};

// ===========================================================================
// CONTROLLER 1: getCart
// GET /api/v1/cart
// ===========================================================================
// Returns the user's current cart enriched with:
//   - Live availability check (flags changed/unavailable items)
//   - Up-to-date pricing if the restaurant's delivery fee changed
//   - Restaurant metadata for the UI
exports.getCart = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const cart   = await getCart(userId);

    // If the cart is empty, return it immediately — nothing to validate.
    if (!cart.restaurantId || cart.items.length === 0) {
      return res.status(200).json({
        success: true,
        data:    cart,
        warnings:[],
      });
    }

    // Fetch live restaurant data for validation.
    const restaurant = await Restaurant.findById(cart.restaurantId);

    let warnings = [];
    let updatedCart = cart;

    if (restaurant) {
      const validation = validateCartAgainstRestaurant(cart, restaurant);
      warnings = validation.errors;

      // If the restaurant's delivery fee changed, recalculate totals.
      const currentFee = restaurant.deliveryFee || 0;
      if (currentFee !== cart.totals.deliveryFee) {
        updatedCart = {
          ...cart,
          totals: recalculateTotals(cart.items, currentFee),
        };
        // Persist the corrected totals.
        const { saveCart } = require('../services/cartService');
        saveCart(userId, updatedCart).catch(() => {}); // fire-and-forget
      }
    } else {
      warnings.push('The restaurant for this cart no longer exists. Please clear your cart.');
    }

    res.status(200).json({
      success:  true,
      data:     updatedCart,
      warnings,                             // non-blocking: UI shows these as banners
      restaurantOpen: restaurant?.isOpen ?? false,
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// CONTROLLER 2: addItem
// POST /api/v1/cart/items
// ===========================================================================
// Body: {
//   restaurantId, menuItemId, quantity,
//   modifiers: [{ name, priceAdjust }]   (optional)
// }
exports.addItem = async (req, res, next) => {
  try {
    const {
      restaurantId,
      menuItemId,
      quantity    = 1,
      modifiers   = [],
    } = req.body;

    // Basic input checks.
    if (!restaurantId || !menuItemId) {
      return next(new ErrorResponse('restaurantId and menuItemId are required.', 400));
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return next(new ErrorResponse('quantity must be a positive integer.', 400));
    }
    if (qty > 50) {
      return next(new ErrorResponse('Maximum quantity per item is 50.', 400));
    }

    // Fetch and validate restaurant.
    const restaurant = await fetchRestaurant(restaurantId, next);
    if (!restaurant) return; // fetchRestaurant already called next(err)

    if (!restaurant.isActive) {
      return next(new ErrorResponse(`${restaurant.name} is currently unavailable.`, 400));
    }
    if (!restaurant.isOpen) {
      return next(new ErrorResponse(`${restaurant.name} is currently closed.`, 400));
    }

    // Find menu item.
    if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
      return next(new ErrorResponse(`'${menuItemId}' is not a valid menu item ID.`, 400));
    }
    const menuItem = restaurant.menu.id(menuItemId);
    if (!menuItem || menuItem.isDeleted) {
      return next(new ErrorResponse('Menu item not found.', 404));
    }
    if (!menuItem.isAvailable) {
      return next(new ErrorResponse(`'${menuItem.name}' is currently out of stock.`, 400));
    }

    // Validate modifiers against the menu item's modifier groups.
    const resolvedModifiers = [];
    for (const mod of modifiers) {
      const group = menuItem.modifiers?.find((g) => g.name === mod.groupName);
      if (!group) {
        return next(new ErrorResponse(`Modifier group '${mod.groupName}' not found.`, 400));
      }
      const option = group.options.find((o) => o.name === mod.optionName);
      if (!option) {
        return next(new ErrorResponse(
          `Option '${mod.optionName}' not found in '${mod.groupName}'.`, 400
        ));
      }
      resolvedModifiers.push({
        name:        `${mod.groupName}: ${mod.optionName}`,
        priceAdjust: option.priceAdjust || 0,
      });
    }

    const userId = req.user._id.toString();

    const result = await addItem(
      userId,
      {
        menuItemId: menuItemId.toString(),
        name:       menuItem.name,
        description:menuItem.description || '',
        image:      menuItem.image       || null,
        quantity:   qty,
        unitPrice:  menuItem.price,
        modifiers:  resolvedModifiers,
      },
      {
        restaurantId:   restaurantId.toString(),
        restaurantName: restaurant.name,
        deliveryFee:    restaurant.deliveryFee || 0,
      }
    );

    // Single-restaurant conflict.
    if (result.conflict) {
      return next(new ErrorResponse(
        `Your cart already has items from "${result.conflictRestaurantName}". ` +
        `Clear your cart before adding items from a different restaurant.`,
        409 // Conflict
      ));
    }

    res.status(200).json({
      success: true,
      message: `${qty}× '${menuItem.name}' added to cart.`,
      data:    result.cart,
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// CONTROLLER 3: updateItem
// PUT /api/v1/cart/items/:id
// ===========================================================================
// :id is the menuItemId.
// Body: { quantity }   — must be > 0 (use DELETE to remove)
exports.updateItem = async (req, res, next) => {
  try {
    const menuItemId = req.params.id;
    const quantity   = parseInt(req.body.quantity, 10);

    if (isNaN(quantity) || quantity < 1) {
      return next(new ErrorResponse(
        'quantity must be a positive integer. To remove an item, use the DELETE endpoint.', 400
      ));
    }
    if (quantity > 50) {
      return next(new ErrorResponse('Maximum quantity per item is 50.', 400));
    }

    const userId = req.user._id.toString();
    const cart   = await getCart(userId);

    if (!cart.restaurantId) {
      return next(new ErrorResponse('Your cart is empty.', 400));
    }

    // Get the current delivery fee from the live restaurant doc.
    const restaurant = await Restaurant.findById(cart.restaurantId).select('deliveryFee isOpen');
    const deliveryFee = restaurant?.deliveryFee || 0;

    const result = await updateItemQuantity(userId, menuItemId, quantity, deliveryFee);

    if (result.notFound) {
      return next(new ErrorResponse('Item not found in your cart.', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Cart item updated.',
      data:    result.cart,
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// CONTROLLER 4: removeItem
// DELETE /api/v1/cart/items/:id
// ===========================================================================
// :id is the menuItemId.
exports.removeItem = async (req, res, next) => {
  try {
    const menuItemId = req.params.id;
    const userId     = req.user._id.toString();
    const cart       = await getCart(userId);

    if (!cart.restaurantId || cart.items.length === 0) {
      return next(new ErrorResponse('Your cart is already empty.', 400));
    }

    const restaurant  = await Restaurant.findById(cart.restaurantId).select('deliveryFee');
    const deliveryFee = restaurant?.deliveryFee || 0;

    const result = await removeItem(userId, menuItemId, deliveryFee);

    if (result.notFound) {
      return next(new ErrorResponse('Item not found in your cart.', 404));
    }

    const itemCount = result.cart.items.length;
    res.status(200).json({
      success: true,
      message: itemCount > 0 ? 'Item removed from cart.' : 'Cart is now empty.',
      data:    result.cart,
    });

  } catch (err) {
    next(err);
  }
};

// ===========================================================================
// CONTROLLER 5: clearCart
// DELETE /api/v1/cart
// ===========================================================================
exports.clearCart = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    await clearCart(userId);

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully.',
      data:    emptyCart(userId),
    });

  } catch (err) {
    next(err);
  }
};
