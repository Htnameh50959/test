// =============================================================================
// WEBSOCKET EVENT DEFINITIONS  (backend/src/config/events.js)
// =============================================================================
// Single source of truth for all WebSocket event names, payload shapes,
// and metadata used across the platform.
//
// Import on both server and any Socket.io client to eliminate magic strings.
// TypeScript-equivalent payload interfaces are defined as JSDoc @typedef blocks.
// =============================================================================

// ---------------------------------------------------------------------------
// CLIENT → SERVER EVENTS
// ---------------------------------------------------------------------------

/**
 * Events that the client EMITS and the server LISTENS FOR.
 * Each value is the exact string used in socket.emit() / socket.on().
 * @enum {string}
 */
const CLIENT_EVENTS = {
  // --- Subscription ----------------------------------------------------------
  /** Subscribe to all real-time updates for a specific order. */
  SUBSCRIBE_ORDER: 'subscribe:order',
  /** Stop receiving updates for a specific order. */
  UNSUBSCRIBE_ORDER: 'unsubscribe:order',

  // --- Order Management (Merchant / Admin) ----------------------------------
  /** Generic order status transition (flexible; enforces role guard). */
  UPDATE_ORDER_STATUS: 'update:order-status',
  /** Merchant explicitly accepts an incoming order (requires future ETA). */
  ACCEPT_ORDER: 'accept:order',
  /** Merchant explicitly rejects an incoming order (reason required). */
  REJECT_ORDER: 'reject:order',

  // --- Courier --------------------------------------------------------------
  /** Courier marks themselves available for deliveries. */
  COURIER_GO_ONLINE: 'courier:go-online',
  /** Courier marks themselves unavailable. */
  COURIER_GO_OFFLINE: 'courier:go-offline',
  /** Courier broadcasts their current GPS coordinates (every 3–5 s). */
  COURIER_LOCATION_UPDATE: 'courier:location-update',
  /** Courier accepts an assigned delivery task. */
  COURIER_ACCEPT_DELIVERY: 'courier:accept-delivery',
  /** Courier rejects an assigned delivery task (reason required). */
  COURIER_REJECT_DELIVERY: 'courier:reject-delivery',

  // --- Merchant -------------------------------------------------------------
  /** Restaurant goes online — ready to accept orders. */
  MERCHANT_GO_ONLINE: 'merchant:go-online',
  /** Restaurant goes offline — stops accepting orders. */
  MERCHANT_GO_OFFLINE: 'merchant:go-offline',

  // --- Heartbeat ------------------------------------------------------------
  /** Client response to server PING; confirms connection is alive. */
  PONG: 'pong',
};

// ---------------------------------------------------------------------------
// SERVER → CLIENT EVENTS
// ---------------------------------------------------------------------------

/**
 * Events that the server EMITS and the client LISTENS FOR.
 * @enum {string}
 */
const SERVER_EVENTS = {
  // --- Order Updates --------------------------------------------------------
  /** Broadcast when an order's status changes. Room: order:<orderId> */
  ORDER_STATUS: 'order:status',
  /** Sent to merchant when a new order arrives. Room: merchant:<restaurantId> */
  ORDER_NEW: 'order:new',
  /** Broadcast when an order is cancelled. Room: order:<orderId> */
  ORDER_CANCELLED: 'order:cancelled',
  /** Sent with an updated estimated delivery time. Room: order:<orderId> */
  ORDER_ETA: 'order:eta',

  // --- Courier --------------------------------------------------------------
  /** Real-time courier GPS position for map tracking. Room: order:<orderId> */
  COURIER_LOCATION: 'courier:location',
  /** Sent to customer when a courier accepts their delivery. Room: order:<orderId> */
  COURIER_ASSIGNED: 'courier:assigned',
  /** Sent to a courier when a delivery task is assigned to them. Room: user:<courierId> */
  DELIVERY_ASSIGNED: 'delivery:assigned',
  /** Sent when courier rejects and delivery must be reassigned. Room: order:<orderId> */
  DELIVERY_REASSIGNED: 'delivery:reassigned',

  // --- Subscription Acknowledgements ----------------------------------------
  /** Confirms successful join of an order room. */
  SUBSCRIBED: 'subscribed',
  /** Confirms successful leave of an order room. */
  UNSUBSCRIBED: 'unsubscribed',

  // --- Status ---------------------------------------------------------------
  /** Sent globally when a merchant restaurant opens. */
  MERCHANT_ONLINE: 'merchant:online',
  /** Sent to role:admin when a courier comes online. */
  COURIER_ONLINE: 'courier:online',

  // --- Notifications --------------------------------------------------------
  /** Instructs client to play a notification sound (e.g. "new-order-alert"). */
  PLAY_SOUND: 'play-sound',
  /** General-purpose push notification from server. */
  NOTIFICATION: 'notification',

  // --- System ---------------------------------------------------------------
  /** Structured error report — validation failure, access denied, or server error. */
  ERROR: 'error',
  /** Server heartbeat, sent every 30 s. Client must respond with CLIENT_EVENTS.PONG. */
  PING: 'ping',
};

// ---------------------------------------------------------------------------
// ORDER STATUS ENUM
// ---------------------------------------------------------------------------

/**
 * Valid order lifecycle states. Used in event payloads and DB schema.
 * @enum {string}
 */
const ORDER_STATUS = {
  PENDING:          'PENDING',
  ACCEPTED:         'ACCEPTED',
  REJECTED:         'REJECTED',
  PREPARING:        'PREPARING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED:        'DELIVERED',
  CANCELLED:        'CANCELLED',
};

// ---------------------------------------------------------------------------
// VALID STATUS TRANSITIONS  (role-aware state machine)
// ---------------------------------------------------------------------------

/**
 * Maps each role to its allowed transitions (from → [to, ...]).
 * Enforced in the UPDATE_ORDER_STATUS handler.
 */
const VALID_STATUS_TRANSITIONS = {
  merchant: {
    [ORDER_STATUS.PENDING]:   [ORDER_STATUS.ACCEPTED, ORDER_STATUS.REJECTED],
    [ORDER_STATUS.ACCEPTED]:  [ORDER_STATUS.PREPARING],
    [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY_FOR_PICKUP],
  },
  courier: {
    [ORDER_STATUS.READY_FOR_PICKUP]: [ORDER_STATUS.OUT_FOR_DELIVERY],
    [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED],
  },
  admin: {
    // Admin can transition to any status from any status
    ...Object.fromEntries(
      Object.values(ORDER_STATUS).map((s) => [s, Object.values(ORDER_STATUS)])
    ),
  },
};

// ---------------------------------------------------------------------------
// PAYLOAD SHAPE CATALOG  (TypeScript-equivalent JSDoc interfaces)
// ---------------------------------------------------------------------------
// These @typedef blocks serve as the single reference for payload contracts.
// Server-side Joi schemas in utils/socketSchemas.js enforce these shapes.
// ---------------------------------------------------------------------------

// ---- CLIENT → SERVER -------------------------------------------------------

/**
 * @typedef {Object} SubscribeOrderPayload
 * @property {string} orderId - MongoDB ObjectId (24-char hex) of the target order
 */

/**
 * @typedef {Object} UnsubscribeOrderPayload
 * @property {string} orderId - MongoDB ObjectId of the order to unsubscribe from
 */

/**
 * @typedef {Object} UpdateOrderStatusPayload
 * @property {string}  orderId                 - Target order (MongoDB ObjectId)
 * @property {string}  status                  - New OrderStatus enum value
 * @property {string}  [reason]                - Optional reason (max 250 chars)
 * @property {Date}    [estimatedDeliveryTime] - Updated ETA (ISO 8601)
 */

/**
 * @typedef {Object} AcceptOrderPayload
 * @property {string} orderId               - Target order
 * @property {Date}   estimatedDeliveryTime - Promise ETA; MUST be in the future
 */

/**
 * @typedef {Object} RejectOrderPayload
 * @property {string} orderId - Target order
 * @property {string} reason  - Rejection reason (5–250 chars, required)
 */

/**
 * @typedef {Object} CourierLocationPayload
 * @property {string} [orderId]   - Associated order (null for general broadcast)
 * @property {number} lat         - Latitude [-90, 90]
 * @property {number} lng         - Longitude [-180, 180]
 * @property {number} [heading]   - Direction of travel in degrees [0, 360]
 * @property {number} [speed]     - Speed in km/h (min 0)
 * @property {Date}   [timestamp] - Client-side timestamp (defaults to server time)
 */

/**
 * @typedef {Object} CourierAcceptDeliveryPayload
 * @property {string} orderId - Order the courier is accepting
 */

/**
 * @typedef {Object} CourierRejectDeliveryPayload
 * @property {string} orderId - Order being rejected
 * @property {string} reason  - Rejection reason (5–250 chars, required)
 */

/**
 * @typedef {Object} MerchantGoOnlinePayload
 * @property {string} restaurantId - The merchant's restaurant ObjectId
 */

/**
 * @typedef {Object} MerchantGoOfflinePayload
 * @property {string} restaurantId - The merchant's restaurant ObjectId
 */

// ---- SERVER → CLIENT -------------------------------------------------------

/**
 * @typedef {Object} OrderStatusPayload
 * @property {string}  orderId                 - The order that changed
 * @property {string}  status                  - New OrderStatus value
 * @property {Date}    timestamp               - When the change occurred
 * @property {Date}    [estimatedDeliveryTime] - Updated ETA
 * @property {Object}  [metadata]
 * @property {string}  metadata.updatedBy      - userId of the actor
 * @property {string}  [metadata.reason]       - Reason for the change
 */

/**
 * @typedef {Object} NewOrderPayload
 * @property {string}  orderId         - New order ObjectId
 * @property {string}  orderNumber     - Human-readable order number (e.g. "ORD-20240115-0042")
 * @property {{ name: string, phone: string }} customer
 * @property {Array<{ name: string, quantity: number, price: number }>} items
 * @property {number}  total           - Order total in INR (paise or rupees)
 * @property {Object}  deliveryAddress - Full address object
 * @property {Date}    timestamp       - When the order was placed
 */

/**
 * @typedef {Object} CourierLocationServerPayload
 * @property {string}  orderId   - Associated order
 * @property {number}  lat       - Latitude [-90, 90]
 * @property {number}  lng       - Longitude [-180, 180]
 * @property {number}  [heading] - Direction [0, 360]
 * @property {number}  [speed]   - Speed km/h
 * @property {Date}    timestamp - Server-stamped time
 */

/**
 * @typedef {Object} CourierAssignedPayload
 * @property {string} orderId   - Associated order
 * @property {string} courierId - Courier's userId
 * @property {Date}   timestamp - Assignment time
 */

/**
 * @typedef {Object} DeliveryAssignedPayload
 * @property {string} orderId              - Associated order
 * @property {Object} restaurantAddress    - Pick-up address
 * @property {Object} deliveryAddress      - Drop-off address
 * @property {Date}   estimatedPickupTime  - When food should be ready
 */

/**
 * @typedef {Object} DeliveryReassignedPayload
 * @property {string} orderId            - Associated order
 * @property {string} previousCourierId  - Courier who rejected
 * @property {string} reason             - Why they rejected
 * @property {Date}   timestamp
 */

/**
 * @typedef {Object} ErrorPayload
 * @property {string}   event    - The event name that caused the error
 * @property {string}   message  - Human-readable error description
 * @property {string}   [code]   - Machine-readable code: VALIDATION_ERROR | ACCESS_DENIED | INTERNAL_ERROR
 * @property {string[]} [details] - Array of individual validation messages
 */

/**
 * @typedef {Object} NotificationPayload
 * @property {string}  title   - Notification title
 * @property {string}  message - Notification body
 * @property {string}  type    - "success" | "error" | "info" | "warning"
 * @property {string}  [orderId] - Relevant order if applicable
 */

/**
 * @typedef {Object} PlaySoundPayload
 * @property {string}  sound   - Sound identifier ("new-order-alert", "delivery-complete", etc.)
 * @property {number}  [repeat] - How many times to play (default: 1)
 */

// ---------------------------------------------------------------------------
// EVENT METADATA  (direction, roles, description, room)
// ---------------------------------------------------------------------------
// A machine-readable catalog useful for code-generation, docs, and introspection.

const EVENT_METADATA = {
  // CLIENT → SERVER
  [CLIENT_EVENTS.SUBSCRIBE_ORDER]: {
    direction: 'client→server',
    roles: ['customer', 'merchant', 'courier', 'admin'],
    description: 'Subscribe to real-time updates for a specific order.',
    payloadType: 'SubscribeOrderPayload',
  },
  [CLIENT_EVENTS.UNSUBSCRIBE_ORDER]: {
    direction: 'client→server',
    roles: ['customer', 'merchant', 'courier', 'admin'],
    description: 'Unsubscribe from a specific order room.',
    payloadType: 'UnsubscribeOrderPayload',
  },
  [CLIENT_EVENTS.UPDATE_ORDER_STATUS]: {
    direction: 'client→server',
    roles: ['merchant', 'admin'],
    description: 'Transition an order to a new status.',
    payloadType: 'UpdateOrderStatusPayload',
  },
  [CLIENT_EVENTS.ACCEPT_ORDER]: {
    direction: 'client→server',
    roles: ['merchant', 'admin'],
    description: 'Merchant accepts an incoming order.',
    payloadType: 'AcceptOrderPayload',
  },
  [CLIENT_EVENTS.REJECT_ORDER]: {
    direction: 'client→server',
    roles: ['merchant', 'admin'],
    description: 'Merchant rejects an incoming order.',
    payloadType: 'RejectOrderPayload',
  },
  [CLIENT_EVENTS.COURIER_GO_ONLINE]: {
    direction: 'client→server',
    roles: ['courier'],
    description: 'Courier marks themselves available for deliveries.',
    payloadType: null,
  },
  [CLIENT_EVENTS.COURIER_GO_OFFLINE]: {
    direction: 'client→server',
    roles: ['courier'],
    description: 'Courier marks themselves unavailable.',
    payloadType: null,
  },
  [CLIENT_EVENTS.COURIER_LOCATION_UPDATE]: {
    direction: 'client→server',
    roles: ['courier'],
    description: 'Courier broadcasts current GPS coordinates.',
    payloadType: 'CourierLocationPayload',
  },
  [CLIENT_EVENTS.COURIER_ACCEPT_DELIVERY]: {
    direction: 'client→server',
    roles: ['courier'],
    description: 'Courier accepts an assigned delivery task.',
    payloadType: 'CourierAcceptDeliveryPayload',
  },
  [CLIENT_EVENTS.COURIER_REJECT_DELIVERY]: {
    direction: 'client→server',
    roles: ['courier'],
    description: 'Courier rejects a delivery task.',
    payloadType: 'CourierRejectDeliveryPayload',
  },
  [CLIENT_EVENTS.MERCHANT_GO_ONLINE]: {
    direction: 'client→server',
    roles: ['merchant'],
    description: 'Restaurant opens and is ready to accept orders.',
    payloadType: 'MerchantGoOnlinePayload',
  },
  [CLIENT_EVENTS.MERCHANT_GO_OFFLINE]: {
    direction: 'client→server',
    roles: ['merchant'],
    description: 'Restaurant closes and stops accepting orders.',
    payloadType: 'MerchantGoOfflinePayload',
  },
  [CLIENT_EVENTS.PONG]: {
    direction: 'client→server',
    roles: ['*'],
    description: 'Heartbeat response to server PING.',
    payloadType: null,
  },

  // SERVER → CLIENT
  [SERVER_EVENTS.ORDER_STATUS]: {
    direction: 'server→client',
    room: 'order:<orderId>',
    description: 'Order status changed.',
    payloadType: 'OrderStatusPayload',
  },
  [SERVER_EVENTS.ORDER_NEW]: {
    direction: 'server→client',
    room: 'merchant:<restaurantId>',
    description: 'New order arrived at a restaurant.',
    payloadType: 'NewOrderPayload',
  },
  [SERVER_EVENTS.ORDER_CANCELLED]: {
    direction: 'server→client',
    room: 'order:<orderId>',
    description: 'Order was cancelled.',
    payloadType: '{ orderId, reason, timestamp }',
  },
  [SERVER_EVENTS.ORDER_ETA]: {
    direction: 'server→client',
    room: 'order:<orderId>',
    description: 'Estimated delivery time updated.',
    payloadType: '{ orderId, estimatedDeliveryTime }',
  },
  [SERVER_EVENTS.COURIER_LOCATION]: {
    direction: 'server→client',
    room: 'order:<orderId>',
    description: 'Real-time courier GPS coordinates.',
    payloadType: 'CourierLocationServerPayload',
  },
  [SERVER_EVENTS.COURIER_ASSIGNED]: {
    direction: 'server→client',
    room: 'order:<orderId>',
    description: 'A courier has accepted the delivery.',
    payloadType: 'CourierAssignedPayload',
  },
  [SERVER_EVENTS.DELIVERY_ASSIGNED]: {
    direction: 'server→client',
    room: 'user:<courierId>',
    description: 'A delivery task was assigned to this courier.',
    payloadType: 'DeliveryAssignedPayload',
  },
  [SERVER_EVENTS.DELIVERY_REASSIGNED]: {
    direction: 'server→client',
    room: 'order:<orderId>',
    description: 'Delivery was rejected and needs to be reassigned.',
    payloadType: 'DeliveryReassignedPayload',
  },
  [SERVER_EVENTS.SUBSCRIBED]: {
    direction: 'server→client',
    room: 'socket',
    description: 'Confirms successful order room subscription.',
    payloadType: '{ orderId, currentStatus, estimatedDeliveryTime }',
  },
  [SERVER_EVENTS.UNSUBSCRIBED]: {
    direction: 'server→client',
    room: 'socket',
    description: 'Confirms successful order room unsubscription.',
    payloadType: '{ orderId }',
  },
  [SERVER_EVENTS.MERCHANT_ONLINE]: {
    direction: 'server→client',
    room: 'broadcast',
    description: 'A merchant restaurant has opened.',
    payloadType: '{ restaurantId, timestamp }',
  },
  [SERVER_EVENTS.COURIER_ONLINE]: {
    direction: 'server→client',
    room: 'role:admin',
    description: 'A courier went online.',
    payloadType: '{ courierId, timestamp }',
  },
  [SERVER_EVENTS.PLAY_SOUND]: {
    direction: 'server→client',
    room: 'socket',
    description: 'Instructs client to play a UI notification sound.',
    payloadType: 'PlaySoundPayload',
  },
  [SERVER_EVENTS.NOTIFICATION]: {
    direction: 'server→client',
    room: 'user:<userId>',
    description: 'General-purpose push notification.',
    payloadType: 'NotificationPayload',
  },
  [SERVER_EVENTS.ERROR]: {
    direction: 'server→client',
    room: 'socket',
    description: 'Structured error from validation failure, role guard, or server error.',
    payloadType: 'ErrorPayload',
  },
  [SERVER_EVENTS.PING]: {
    direction: 'server→client',
    room: 'broadcast',
    description: 'Server heartbeat. Client must respond with CLIENT_EVENTS.PONG.',
    payloadType: null,
  },
};

// ---------------------------------------------------------------------------
// ERROR CODES
// ---------------------------------------------------------------------------

/**
 * Machine-readable codes sent in ErrorPayload.code.
 * @enum {string}
 */
const ERROR_CODES = {
  /** Event payload failed Joi schema validation. */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** Authenticated user's role is not permitted for this event. */
  ACCESS_DENIED: 'ACCESS_DENIED',
  /** Unhandled server-side error during event processing. */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------

module.exports = {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  ORDER_STATUS,
  VALID_STATUS_TRANSITIONS,
  EVENT_METADATA,
  ERROR_CODES,
};
