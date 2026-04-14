// =============================================================================
// JOI VALIDATION SCHEMAS  (backend/src/middleware/validate.js)
// =============================================================================
// Central place for all request-body validation schemas.
// The `validate(schema)` factory wraps any Joi schema into an Express
// middleware that:
//   1. Strips unknown top-level fields (prevents mass-assignment)
//   2. Collects ALL errors in one pass (abortEarly: false)
//   3. Returns a structured 400 response with a flat errors array
//
// Usage:
//   const { validate, schemas } = require('../middleware/validate');
//   router.post('/register', validate(schemas.auth.register), registerController);
// =============================================================================

const Joi = require('joi');

// ---------------------------------------------------------------------------
// CORE FACTORY
// ---------------------------------------------------------------------------

/**
 * Creates an Express middleware that validates req.body against `schema`.
 * @param {Joi.ObjectSchema} schema
 * @param {'body'|'query'|'params'} [target='body'] - which part of the request to validate
 */
/**
 * Creates an Express middleware that validates req[target] against `schema`.
 * @param {Joi.ObjectSchema} schema
 * @param {'body'|'query'|'params'} [target='body']
 */
const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly:      false,  // collect every error, not just the first
      allowUnknown:    true,   // allow but ignore unknown keys
      stripUnknown:    true,   // silently remove keys not in schema after validation
      convert:         true,   // cast strings to numbers/dates automatically
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field:   detail.context?.label || detail.context?.key || 'unknown',
        message: detail.message.replace(/['"]/g, ''), // strip Joi's quotes for cleaner output
      }));

      return res.status(400).json({
        success: false,
        code:    'VALIDATION_ERROR',
        message: 'Request validation failed.',
        errors,
        debug: { target, received: req[target] }
      });
    }

    // Replace the original body with the sanitized, coerced value from Joi.
    req[target] = value;
    next();
  };
};

// ---------------------------------------------------------------------------
// REUSABLE FIELD DEFINITIONS
// ---------------------------------------------------------------------------

// Standard MongoDB ObjectId string
const objectId = () =>
  Joi.string()
    .pattern(/^[a-f\d]{24}$/i)
    .messages({ 'string.pattern.base': '{{#label}} must be a valid MongoDB ObjectId' });

// Password: min 8 chars, at least one uppercase, one number, one special char
const passwordRule = () =>
  Joi.string()
    .min(8)
    .max(72) // bcrypt silently truncates beyond 72 bytes
    .pattern(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/)
    .messages({
      'string.min':          'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one number, and one special character',
    });

// GeoJSON coordinate pair — [longitude, latitude]
const coordinatesPair = () =>
  Joi.array()
    .items(Joi.number())
    .length(2)
    .custom((val, helpers) => {
      const [lng, lat] = val;
      if (lng < -180 || lng > 180) return helpers.error('any.invalid');
      if (lat < -90  || lat > 90)  return helpers.error('any.invalid');
      return val;
    })
    .messages({ 'any.invalid': 'Coordinates must be [longitude(-180–180), latitude(-90–90)]' });

// Shared address sub-schema (reused in register, updateProfile, addAddress)
const addressBody = () =>
  Joi.object({
    label:        Joi.string().trim().max(50).default('Home'),
    street:       Joi.string().trim().max(200).required(),
    city:         Joi.string().trim().max(100).required(),
    state:        Joi.string().trim().max(100).required(),
    zipCode:      Joi.string().trim().max(20).required(),
    country:      Joi.string().trim().max(100).default('India'),
    coordinates:  coordinatesPair().required(),  // [lng, lat]
    instructions: Joi.string().trim().max(300).allow('', null),
    isDefault:    Joi.boolean().default(false),
  });

// ---------------------------------------------------------------------------
// VALIDATION SCHEMAS — grouped by domain
// ---------------------------------------------------------------------------

const schemas = {
  // ──────────────────────────────────────────────────────────────────────────
  // AUTH
  // ──────────────────────────────────────────────────────────────────────────
  auth: {
    register: Joi.object({
      firstName: Joi.string().trim().min(2).max(50).required()
        .messages({ 'string.min': 'First name must be at least 2 characters' }),

      lastName: Joi.string().trim().max(50).allow('', null),

      email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required(),

      password: passwordRule().required(),

      phone: Joi.string()
        .pattern(/^\+?[1-9]\d{7,14}$/)
        .allow('', null)
        .messages({ 'string.pattern.base': 'Phone must be a valid international number (e.g. +919876543210)' }),

      role: Joi.string()
        .valid('consumer', 'merchant', 'courier')
        .default('consumer'),

      merchantDetails: Joi.object({
        businessName: Joi.string().required(),
        address:      Joi.string().required(),
        location: Joi.object({
          type:        Joi.string().valid('Point').default('Point'),
          coordinates: coordinatesPair().required(),
        }).required(),
        restaurantName: Joi.string().optional(), // allow both aliases for backwards compatibility
      }).optional(),

      courierProfile: Joi.object({
        vehicleType:   Joi.string().valid('bicycle', 'motorcycle', 'car', 'scooter').required(),
        vehicleNumber: Joi.string().required(),
        licenseNumber: Joi.string().required(),
      }).optional(),
    }),

    login: Joi.object({
      email:    Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required(),
      password: Joi.string().required()
        .messages({ 'any.required': 'Password is required' }),
    }),

    changePassword: Joi.object({
      currentPassword: Joi.string().required(),
      newPassword:     passwordRule().required(),
      confirmPassword: Joi.any()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({ 'any.only': 'Confirm password must match the new password' }),
    }),

    forgotPassword: Joi.object({
      email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required(),
    }),

    resetPassword: Joi.object({
      token:           Joi.string().required(),
      newPassword:     passwordRule().required(),
      confirmPassword: Joi.any()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({ 'any.only': 'Confirm password must match the new password' }),
    }),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // USER PROFILE
  // ──────────────────────────────────────────────────────────────────────────
  users: {
    updateProfile: Joi.object({
      firstName:   Joi.string().trim().min(2).max(50),
      lastName:    Joi.string().trim().max(50).allow('', null),
      phone: Joi.string()
        .pattern(/^\+?[1-9]\d{7,14}$/)
        .allow('', null)
        .messages({ 'string.pattern.base': 'Phone must be a valid international number' }),
      dateOfBirth: Joi.date().iso().max('now')
        .messages({ 'date.max': 'Date of birth cannot be in the future' }),
      gender:      Joi.string().valid('male', 'female', 'non-binary', 'prefer_not_to_say'),
      avatar:      Joi.string().uri().allow('', null),
    }).min(1).messages({ 'object.min': 'Provide at least one field to update' }),

    addAddress:    addressBody(),

    updateAddress: addressBody().fork(
      // When updating, all address fields are optional
      ['street', 'city', 'state', 'zipCode', 'coordinates'],
      (field) => field.optional()
    ),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // RESTAURANTS
  // ──────────────────────────────────────────────────────────────────────────
  restaurants: {
    // Validates GET /api/v1/restaurants/search query string.
    search: Joi.object({
      // ── Required: user's current location ──
      lat: Joi.number()
        .min(-90).max(90)
        .required()
        .messages({
          'number.base': 'lat must be a number',
          'number.min':  'lat must be between -90 and 90',
          'number.max':  'lat must be between -90 and 90',
          'any.required':'lat (latitude) is required',
        }),
      lng: Joi.number()
        .min(-180).max(180)
        .required()
        .messages({
          'number.base': 'lng must be a number',
          'number.min':  'lng must be between -180 and 180',
          'number.max':  'lng must be between -180 and 180',
          'any.required':'lng (longitude) is required',
        }),

      // ── Search radius in metres (default 5000, max 3000 km) ──
      radius: Joi.number().min(100).max(3000000).default(5000),

      // ── Filters ──
      q: Joi.string().trim().allow('', null).max(100).optional(),
      sort: Joi.string().valid('relevance', 'rating', 'distance', 'delivery').default('relevance').optional(),
      
      // cuisineTypes accepts a comma-separated string or an array.
      cuisineTypes: Joi.alternatives().try(
        Joi.string().trim().max(200),
        Joi.array().items(Joi.string().trim())
      ).optional(),

      minRating: Joi.number().min(0).max(5).optional()
        .messages({ 'number.min': 'minRating must be between 0 and 5' }),

      // Price range tiers: $, $$, $$$, $$$$
      priceRange: Joi.alternatives().try(
        Joi.string().valid('$', '$$', '$$$', '$$$$').trim(),
        Joi.array().items(Joi.string().valid('$', '$$', '$$$', '$$$$'))
      ).optional(),

      features: Joi.alternatives().try(
        Joi.string().trim().max(200),
        Joi.array().items(Joi.string().trim())
      ).optional(),

      isOpen: Joi.boolean().optional(),

      // ── Pagination ──
      limit: Joi.number().integer().min(1).max(50).default(20),
      skip:  Joi.number().integer().min(0).default(0),
    }),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ORDERS (kept here so validation is co-located for the whole app)
  // ──────────────────────────────────────────────────────────────────────────
  orders: {
    create: Joi.object({
      restaurantId: objectId().required(),

      items: Joi.array()
        .items(
          Joi.object({
            menuItemId:  objectId().required(),
            quantity:    Joi.number().integer().min(1).max(50).required(),
            modifiers: Joi.array().items(
              Joi.object({
                groupName:  Joi.string().required(),
                optionName: Joi.string().required(),
              })
            ).default([]),
            itemNote: Joi.string().trim().max(250).allow('', null),
          })
        )
        .min(1)
        .required()
        .messages({ 'array.min': 'An order must contain at least one item' }),

      deliveryAddress: addressBody().required(),

      orderType: Joi.string()
        .valid('DELIVERY', 'PICKUP', 'DINE_IN')
        .default('DELIVERY'),

      tableNumber:         Joi.when('orderType', {
        is:        'DINE_IN',
        then:      Joi.string().required(),
        otherwise: Joi.forbidden(),
      }),

      paymentMethod: Joi.string()
        .valid('COD', 'ONLINE', 'WALLET', 'UPI', 'CARD')
        .required(),

      couponCode:          Joi.string().trim().uppercase().allow('', null),
      specialInstructions: Joi.string().trim().max(500).allow('', null),
    }),
  },
};

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------
module.exports = { validate, schemas };
