// =============================================================================
// SOCKET SCHEMAS  (backend/src/utils/socketSchemas.js)
// =============================================================================
// Joi validation schemas for every CLIENT → SERVER WebSocket event payload.
// Each schema enforces the TypeScript-equivalent interface defined in
// src/config/events.js. The validateEvent() middleware in
// src/middleware/socketValidation.js consumes these schemas automatically.
//
// Validation options applied globally by validateEvent():
//   abortEarly: false   → collect ALL errors, not just the first
//   stripUnknown: true  → silently remove extra fields (prevents injection)
//   convert: true       → coerce types (ISO string → Date, "3" → 3, etc.)
// =============================================================================

const Joi = require('joi');

// ---------------------------------------------------------------------------
// SHARED HELPERS
// ---------------------------------------------------------------------------

/**
 * Validates a standard 24-character MongoDB ObjectId hex string.
 * @returns {Joi.StringSchema}
 */
const objectId = () =>
  Joi.string()
    .pattern(/^[a-f\d]{24}$/i)
    .message('Must be a valid MongoDB ObjectId (24-character hex string)');

/**
 * Valid order status values — mirrors ORDER_STATUS in config/events.js.
 * Inlined here to avoid a circular import at validation time.
 */
const ORDER_STATUS_VALUES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

// ---------------------------------------------------------------------------
// SCHEMAS — CLIENT → SERVER
// ---------------------------------------------------------------------------

const socketSchemas = {

  // ── SUBSCRIPTION ──────────────────────────────────────────────────────────

  /**
   * @implements {SubscribeOrderPayload}
   * @example { orderId: "507f1f77bcf86cd799439011" }
   */
  subscribeOrder: Joi.object({
    orderId: objectId().required(),
  }),

  /**
   * @implements {UnsubscribeOrderPayload}
   * @example { orderId: "507f1f77bcf86cd799439011" }
   */
  unsubscribeOrder: Joi.object({
    orderId: objectId().required(),
  }),

  // ── ORDER MANAGEMENT (MERCHANT / ADMIN) ───────────────────────────────────

  /**
   * @implements {UpdateOrderStatusPayload}
   *
   * @example
   * {
   *   orderId: "507f1f77bcf86cd799439011",
   *   status: "PREPARING",
   *   reason: "Ingredients ready",
   *   estimatedDeliveryTime: "2024-01-15T14:30:00Z"
   * }
   */
  updateOrderStatus: Joi.object({
    orderId: objectId().required(),
    status: Joi.string()
      .valid(...ORDER_STATUS_VALUES)
      .required()
      .messages({
        'any.only': `status must be one of: ${ORDER_STATUS_VALUES.join(', ')}`,
        'any.required': 'status is required',
      }),
    reason: Joi.string().max(250).allow('', null).optional(),
    estimatedDeliveryTime: Joi.date().iso().allow(null).optional(),
  }),

  /**
   * @implements {AcceptOrderPayload}
   * estimatedDeliveryTime MUST be a future ISO 8601 timestamp.
   *
   * @example
   * {
   *   orderId: "507f1f77bcf86cd799439011",
   *   estimatedDeliveryTime: "2024-01-15T14:30:00Z"
   * }
   */
  acceptOrder: Joi.object({
    orderId: objectId().required(),
    estimatedDeliveryTime: Joi.date()
      .iso()
      .greater('now')
      .required()
      .messages({
        'date.greater': 'estimatedDeliveryTime must be a future date/time',
        'any.required': 'estimatedDeliveryTime is required when accepting an order',
      }),
  }),

  /**
   * @implements {RejectOrderPayload}
   * reason is mandatory (min 5 chars) so merchant cannot reject silently.
   *
   * @example
   * {
   *   orderId: "507f1f77bcf86cd799439011",
   *   reason: "Restaurant is too busy right now"
   * }
   */
  rejectOrder: Joi.object({
    orderId: objectId().required(),
    reason: Joi.string()
      .min(5)
      .max(250)
      .required()
      .messages({
        'string.min': 'A rejection reason must be at least 5 characters',
        'any.required': 'reason is required when rejecting an order',
      }),
  }),

  // ── COURIER ───────────────────────────────────────────────────────────────

  /**
   * @implements {CourierLocationPayload}
   * Recommended emit frequency: every 3–5 seconds while on an active delivery.
   *
   * @example
   * {
   *   orderId: "507f1f77bcf86cd799439011",
   *   lat: 12.9716,
   *   lng: 77.5946,
   *   heading: 90,
   *   speed: 35.5,
   *   timestamp: "2024-01-15T14:15:00Z"
   * }
   */
  courierLocationUpdate: Joi.object({
    orderId: objectId().allow(null, '').optional(),
    lat: Joi.number()
      .min(-90)
      .max(90)
      .required()
      .messages({
        'number.min': 'lat must be between -90 and 90',
        'number.max': 'lat must be between -90 and 90',
        'any.required': 'lat is required',
      }),
    lng: Joi.number()
      .min(-180)
      .max(180)
      .required()
      .messages({
        'number.min': 'lng must be between -180 and 180',
        'number.max': 'lng must be between -180 and 180',
        'any.required': 'lng is required',
      }),
    heading: Joi.number().min(0).max(360).optional().messages({
      'number.min': 'heading must be between 0 and 360 degrees',
      'number.max': 'heading must be between 0 and 360 degrees',
    }),
    speed: Joi.number().min(0).optional().messages({
      'number.min': 'speed cannot be negative',
    }),
    timestamp: Joi.date().iso().default(() => new Date()),
  }),

  /**
   * @implements {CourierAcceptDeliveryPayload}
   * @example { orderId: "507f1f77bcf86cd799439011" }
   */
  courierAcceptDelivery: Joi.object({
    orderId: objectId().required(),
  }),

  /**
   * @implements {CourierRejectDeliveryPayload}
   * reason is mandatory so the system can log why and re-route.
   *
   * @example
   * {
   *   orderId: "507f1f77bcf86cd799439011",
   *   reason: "Vehicle breakdown"
   * }
   */
  courierRejectDelivery: Joi.object({
    orderId: objectId().required(),
    reason: Joi.string()
      .min(5)
      .max(250)
      .required()
      .messages({
        'string.min': 'Rejection reason must be at least 5 characters',
        'any.required': 'reason is required when rejecting a delivery',
      }),
  }),

  // ── MERCHANT STATUS ───────────────────────────────────────────────────────

  /**
   * @implements {MerchantGoOnlinePayload}
   * @example { restaurantId: "507f1f77bcf86cd799439022" }
   */
  merchantGoOnline: Joi.object({
    restaurantId: objectId().required(),
  }),

  /**
   * @implements {MerchantGoOfflinePayload}
   * @example { restaurantId: "507f1f77bcf86cd799439022" }
   */
  merchantGoOffline: Joi.object({
    restaurantId: objectId().required(),
  }),

  /**
   * @implements {CourierGoOnlinePayload}
   */
  courierGoOnline: Joi.object({}).optional(),

  /**
   * @implements {CourierGoOfflinePayload}
   */
  courierGoOffline: Joi.object({}).optional(),

  // ── HEARTBEAT ─────────────────────────────────────────────────────────────

  /** PONG can carry any payload or be empty — we accept anything. */
  pong: Joi.any(),
};

// ---------------------------------------------------------------------------
// SERVER → CLIENT  PAYLOAD DOCUMENTATION  (JSDoc only — not runtime-validated)
// ---------------------------------------------------------------------------
// These @typedef blocks document the shape of data the SERVER sends.
// They are not validated by Joi (no schema needed for outgoing events) but
// are useful for IDE autocomplete and as an API contract for frontend devs.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ServerOrderStatusPayload
 * Emitted to room: order:<orderId>
 * @property {string}  orderId
 * @property {string}  status                  - OrderStatus enum value
 * @property {Date}    timestamp
 * @property {Date}    [estimatedDeliveryTime]
 * @property {Object}  [metadata]
 * @property {string}  metadata.updatedBy      - userId
 * @property {string}  [metadata.reason]
 */

/**
 * @typedef {Object} ServerNewOrderPayload
 * Emitted to room: merchant:<restaurantId>
 * @property {string}   orderId
 * @property {string}   orderNumber
 * @property {{ name: string, phone: string }} customer
 * @property {Array<{ name: string, quantity: number, price: number }>} items
 * @property {number}   total           - Total in INR (rupees)
 * @property {Object}   deliveryAddress
 * @property {Date}     timestamp
 */

/**
 * @typedef {Object} ServerCourierLocationPayload
 * Emitted to room: order:<orderId>
 * @property {string}  orderId
 * @property {number}  lat
 * @property {number}  lng
 * @property {number}  [heading]
 * @property {number}  [speed]
 * @property {Date}    timestamp
 */

/**
 * @typedef {Object} ServerErrorPayload
 * Emitted directly to the offending socket
 * @property {string}    event    - Event name that caused the error
 * @property {string}    message  - Human-readable message
 * @property {string}    [code]   - VALIDATION_ERROR | ACCESS_DENIED | INTERNAL_ERROR
 * @property {string[]}  [details] - Individual Joi validation messages
 */

/**
 * @typedef {Object} ServerNotificationPayload
 * Emitted to room: user:<userId>
 * @property {string}  title
 * @property {string}  message
 * @property {string}  type    - "success" | "error" | "info" | "warning"
 * @property {string}  [orderId]
 */

/**
 * @typedef {Object} ServerPlaySoundPayload
 * Emitted to room: merchant:<restaurantId>
 * @property {string} sound   - Sound identifier ("new-order-alert", "delivery-complete", ...)
 * @property {number} [repeat] - How many times to play (default: 1)
 */

module.exports = socketSchemas;
