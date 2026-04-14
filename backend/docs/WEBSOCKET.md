# WebSocket API Documentation

> **Platform:** Integrated Food Delivery & Dine-Out Hospitality Platform  
> **Protocol:** Socket.io v4 (WebSocket with HTTP long-polling fallback)  
> **Version:** 2.0.0  
> **Last Updated:** 2026-04-14

---

## Table of Contents

1. [Connection](#1-connection)
2. [Authentication](#2-authentication)
3. [Event Naming Convention](#3-event-naming-convention)
4. [Room Architecture](#4-room-architecture)
5. [Client → Server Events](#5-client--server-events)
   - [subscribe:order](#subscribeorder)
   - [unsubscribe:order](#unsubscribeorder)
   - [update:order-status](#updateorder-status)
   - [accept:order](#acceptorder)
   - [reject:order](#rejectorder)
   - [courier:go-online](#couriergo-online)
   - [courier:go-offline](#couriergo-offline)
   - [courier:location-update](#courierlocation-update)
   - [courier:accept-delivery](#courieraccept-delivery)
   - [courier:reject-delivery](#courierreject-delivery)
   - [merchant:go-online](#merchantgo-online)
   - [merchant:go-offline](#merchantgo-offline)
   - [pong](#pong)
6. [Server → Client Events](#6-server--client-events)
   - [order:status](#orderstatus)
   - [order:new](#ordernew)
   - [order:cancelled](#ordercancelled)
   - [order:eta](#ordereta)
   - [courier:location](#courierlocation)
   - [courier:assigned](#courierassigned)
   - [delivery:assigned](#deliveryassigned)
   - [delivery:reassigned](#deliveryreassigned)
   - [subscribed](#subscribed)
   - [unsubscribed](#unsubscribed)
   - [merchant:online](#merchantonline)
   - [courier:online](#courieronline)
   - [play-sound](#play-sound)
   - [notification](#notification)
   - [error](#error)
   - [ping](#ping)
7. [Order Status Lifecycle](#7-order-status-lifecycle)
8. [Validation & Error Handling](#8-validation--error-handling)
9. [Error Codes Reference](#9-error-codes-reference)
10. [Integration Examples](#10-integration-examples)

---

## 1. Connection

| Environment | URL |
|-------------|-----|
| Development | `ws://localhost:5000` |
| Production  | `wss://api.yourdomain.com` |

**Install the client library:**
```bash
npm install socket.io-client
```

**Transports:** `websocket` (primary), `polling` (fallback)  
**Max buffer size:** 1 MB per message

---

## 2. Authentication

Every connection **must** provide a valid JWT token via the `auth` handshake object. The server verifies the token, looks up the user, and attaches the user context to the socket before any events can be processed.

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'   // obtained from POST /api/auth/login
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('connect_error', (err) => {
  // err.message contains the rejection reason
  console.error('Connection refused:', err.message);
});
```

### Authentication Errors

| Condition | `err.message` |
|-----------|---------------|
| No token provided | `Authentication token required` |
| Invalid / expired JWT | `Authentication failed: <jwt error>` |
| User not found in DB | `User not found` |
| Account deactivated | `User account is inactive` |

---

## 3. Event Naming Convention

All event names follow the `namespace:action` pattern:

| Prefix | Meaning |
|--------|---------|
| `subscribe:` / `unsubscribe:` | Room membership management |
| `update:` | Mutation actions sent by privileged roles |
| `accept:` / `reject:` | Explicit decision actions |
| `courier:` | Courier-specific client→server events |
| `merchant:` | Merchant-specific client→server events |
| `order:` | Order state events broadcast by the server |
| `delivery:` | Delivery assignment events from the server |

---

## 4. Room Architecture

The server uses Socket.io rooms to route events efficiently. Sockets are joined to rooms automatically on connection or via subscription events.

| Room Name | Auto-Joined | Subscribers | Events Broadcast |
|-----------|-------------|-------------|-----------------|
| `user:<userId>` | ✅ On connect | Individual user | Personal notifications, `delivery:assigned` |
| `role:<role>` | ✅ On connect | All users of a role | `order:new` → all merchants, `courier:online` → all admins |
| `order:<orderId>` | Via `subscribe:order` | Anyone tracking an order | `order:status`, `courier:location`, `order:eta`, `order:cancelled` |
| `merchant:<restaurantId>` | Via `merchant:go-online` | Merchant & staff | `order:new`, `play-sound` |

---

## 5. Client → Server Events

### `subscribe:order`

**Direction:** Client → Server  
**Roles:** `customer`, `merchant`, `courier`, `admin`  
**Description:** Subscribe to all real-time updates for a specific order. The socket joins the `order:<orderId>` Socket.io room and immediately receives current order state.

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `orderId` | string | ✅ | Valid MongoDB ObjectId (24-char hex) |

**Acknowledgement (Success):**
```json
{
  "success": true,
  "message": "Subscribed to order 507f1f77bcf86cd799439011",
  "event": "subscribed",
  "data": { "orderId": "507f1f77bcf86cd799439011" }
}
```

**Acknowledgement (Error):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": ["orderId Must be a valid MongoDB ObjectId (24-character hex string)"]
}
```

**Also emits:** [`subscribed`](#subscribed) event to the socket.

**Error Responses:**
- `Order not found` — orderId does not exist
- `Access denied` — user has no permission to view this order
- `Validation failed` — payload schema invalid

**Example:**
```javascript
socket.emit('subscribe:order', { orderId: '507f1f77bcf86cd799439011' }, (response) => {
  if (response.success) {
    console.log('Now tracking order!');
  } else {
    console.error(response.error, response.details);
  }
});
```

---

### `unsubscribe:order`

**Direction:** Client → Server  
**Roles:** Any authenticated user  
**Description:** Leave the order room and stop receiving updates for that order.

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011"
}
```

**Acknowledgement:**
```json
{
  "success": true,
  "message": "Unsubscribed from order 507f1f77bcf86cd799439011",
  "data": { "orderId": "507f1f77bcf86cd799439011" }
}
```

**Also emits:** [`unsubscribed`](#unsubscribed) event to the socket.

---

### `update:order-status`

**Direction:** Client → Server  
**Roles:** `merchant`, `admin`  
**Description:** Transitions an order to a new status. Broadcasts [`order:status`](#orderstatus) to the entire order room.

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "status": "PREPARING",
  "reason": "Ingredients ready",
  "estimatedDeliveryTime": "2024-01-15T14:30:00Z"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `orderId` | string | ✅ | Valid MongoDB ObjectId |
| `status` | string (OrderStatus) | ✅ | See [Order Status Lifecycle](#7-order-status-lifecycle) |
| `reason` | string | ❌ | Max 250 characters |
| `estimatedDeliveryTime` | ISO 8601 date | ❌ | Updated ETA |

**Valid `status` values:**  
`PENDING`, `ACCEPTED`, `REJECTED`, `PREPARING`, `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`

---

### `accept:order`

**Direction:** Client → Server  
**Roles:** `merchant`, `admin`  
**Description:** Merchant explicitly accepts an incoming order. Emits [`order:status`](#orderstatus) (ACCEPTED) and [`order:eta`](#ordereta) to the order room.

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "estimatedDeliveryTime": "2024-01-15T14:30:00Z"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `orderId` | string | ✅ | Valid MongoDB ObjectId |
| `estimatedDeliveryTime` | ISO 8601 date | ✅ | **Must be in the future** |

**Validation Error Examples:**
- `estimatedDeliveryTime must be a future date/time` — past date passed
- `estimatedDeliveryTime is required when accepting an order` — field missing

---

### `reject:order`

**Direction:** Client → Server  
**Roles:** `merchant`, `admin`  
**Description:** Merchant explicitly rejects an incoming order. Emits `order:status` (REJECTED) and [`order:cancelled`](#ordercancelled) to the order room.

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "reason": "Restaurant is too busy to take this order right now"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `orderId` | string | ✅ | Valid MongoDB ObjectId |
| `reason` | string | ✅ | **5 – 250 characters** |

---

### `courier:go-online`

**Direction:** Client → Server  
**Roles:** `courier`  
**Description:** Marks the courier as available for delivery assignments. Updates `courierProfile.isOnline` in the database and notifies admins via [`courier:online`](#courieronline).

**Payload:** *(none required)*

**Acknowledgement:**
```json
{ "success": true }
```

---

### `courier:go-offline`

**Direction:** Client → Server  
**Roles:** `courier`  
**Description:** Marks the courier as unavailable for new assignments.

**Payload:** *(none required)*

---

### `courier:location-update`

**Direction:** Client → Server  
**Roles:** `courier`  
**Description:** Broadcasts the courier's current GPS position to all clients tracking the associated order. Emits [`courier:location`](#courierlocation) to the `order:<orderId>` room.

**Recommended emit frequency:** Every **3 – 5 seconds** during an active delivery.

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "lat": 12.9716,
  "lng": 77.5946,
  "heading": 90,
  "speed": 35.5,
  "timestamp": "2024-01-15T14:15:00Z"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `orderId` | string | ❌ | ObjectId or null (null = general broadcast only) |
| `lat` | number | ✅ | Range: **-90 to 90** |
| `lng` | number | ✅ | Range: **-180 to 180** |
| `heading` | number | ❌ | Range: 0 – 360 (degrees) |
| `speed` | number | ❌ | km/h (min 0) |
| `timestamp` | ISO 8601 date | ❌ | Defaults to server time if omitted |

---

### `courier:accept-delivery`

**Direction:** Client → Server  
**Roles:** `courier`  
**Description:** Courier accepts a delivery assignment. Emits [`courier:assigned`](#courierassigned) to the order room so the customer knows their courier.

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011"
}
```

---

### `courier:reject-delivery`

**Direction:** Client → Server  
**Roles:** `courier`  
**Description:** Courier rejects a delivery they cannot complete. Emits [`delivery:reassigned`](#deliveryreassigned) to the order room so the system can route to another courier.

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "reason": "Vehicle breakdown"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `orderId` | string | ✅ | Valid MongoDB ObjectId |
| `reason` | string | ✅ | 5 – 250 characters |

---

### `merchant:go-online`

**Direction:** Client → Server  
**Roles:** `merchant`  
**Description:** Marks the restaurant as open and ready to accept orders. The socket joins the `merchant:<restaurantId>` room to receive new order notifications. Emits [`merchant:online`](#merchantonline) globally.

**Payload:**
```json
{
  "restaurantId": "507f1f77bcf86cd799439022"
}
```

---

### `merchant:go-offline`

**Direction:** Client → Server  
**Roles:** `merchant`  
**Description:** Marks the restaurant as closed. The socket leaves the `merchant:<restaurantId>` room.

**Payload:**
```json
{
  "restaurantId": "507f1f77bcf86cd799439022"
}
```

---

### `pong`

**Direction:** Client → Server  
**Roles:** Any  
**Description:** Heartbeat response to the server's [`ping`](#ping) event. The server uses this to confirm the connection is alive. Failure to respond may result in the connection being closed.

**Payload:** *(any or empty)*

**Example:**
```javascript
socket.on('ping', () => {
  socket.emit('pong');
});
```

---

## 6. Server → Client Events

### `order:status`

**Direction:** Server → Client  
**Room:** `order:<orderId>`  
**Description:** Emitted whenever an order's status changes (by any actor — merchant, courier, or system).

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "status": "PREPARING",
  "timestamp": "2024-01-15T14:15:00Z",
  "estimatedDeliveryTime": "2024-01-15T14:30:00Z",
  "metadata": {
    "updatedBy": "60d0fe4f5311236168a109ca",
    "reason": null
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `orderId` | string | The order that changed |
| `status` | string | New OrderStatus value |
| `timestamp` | ISO 8601 | When the change occurred |
| `estimatedDeliveryTime` | ISO 8601 | Optional updated ETA |
| `metadata.updatedBy` | string | userId of the actor |
| `metadata.reason` | string | Optional reason for change |

**Example:**
```javascript
socket.on('order:status', ({ orderId, status, estimatedDeliveryTime }) => {
  updateOrderUI(orderId, status);
  if (estimatedDeliveryTime) setETA(estimatedDeliveryTime);
});
```

---

### `order:new`

**Direction:** Server → Client  
**Room:** `merchant:<restaurantId>`  
**Description:** Sent to the merchant dashboard when a new customer order arrives. Always accompanied by a [`play-sound`](#play-sound) event.

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "orderNumber": "ORD-20240115-0042",
  "customer": {
    "name": "Rahul Sharma",
    "phone": "+91 98765 43210"
  },
  "items": [
    { "name": "Chicken Biryani", "quantity": 2, "price": 280 },
    { "name": "Raita", "quantity": 1, "price": 40 }
  ],
  "total": 600,
  "deliveryAddress": {
    "street": "42 MG Road",
    "city": "Bengaluru",
    "state": "Karnataka",
    "pincode": "560001"
  },
  "timestamp": "2024-01-15T13:55:00Z"
}
```

---

### `order:cancelled`

**Direction:** Server → Client  
**Room:** `order:<orderId>`  
**Description:** Sent when an order is cancelled (by merchant, customer, or system).

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "reason": "Restaurant is too busy",
  "timestamp": "2024-01-15T14:00:00Z"
}
```

---

### `order:eta`

**Direction:** Server → Client  
**Room:** `order:<orderId>`  
**Description:** Sent when the estimated delivery time is updated (e.g. on order acceptance or kitchen delay).

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "estimatedDeliveryTime": "2024-01-15T14:45:00Z"
}
```

---

### `courier:location`

**Direction:** Server → Client  
**Room:** `order:<orderId>`  
**Description:** Real-time courier GPS coordinates for map tracking.

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "lat": 12.9716,
  "lng": 77.5946,
  "heading": 270,
  "speed": 28.0,
  "timestamp": "2024-01-15T14:20:00Z"
}
```

**Example (Live Map):**
```javascript
socket.on('courier:location', ({ lat, lng, heading }) => {
  mapRef.current.updateMarker(lat, lng, heading);
});
```

---

### `courier:assigned`

**Direction:** Server → Client  
**Room:** `order:<orderId>`  
**Description:** Sent to the customer when a courier accepts their delivery.

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "courierId": "60d0fe4f5311236168a109cb",
  "timestamp": "2024-01-15T14:10:00Z"
}
```

---

### `delivery:assigned`

**Direction:** Server → Client  
**Room:** `user:<courierId>`  
**Description:** Sent privately to a specific courier when a delivery job is assigned to them.

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "restaurantAddress": {
    "street": "100 Brigade Road",
    "city": "Bengaluru"
  },
  "deliveryAddress": {
    "street": "42 MG Road",
    "city": "Bengaluru"
  },
  "estimatedPickupTime": "2024-01-15T14:15:00Z"
}
```

---

### `delivery:reassigned`

**Direction:** Server → Client  
**Room:** `order:<orderId>`  
**Description:** When a courier rejects a delivery, this event notifies all subscribers so the system can route to another courier.

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "previousCourierId": "60d0fe4f5311236168a109cb",
  "reason": "Vehicle breakdown",
  "timestamp": "2024-01-15T14:12:00Z"
}
```

---

### `subscribed`

**Direction:** Server → Client  
**Room:** socket (direct)  
**Description:** Emitted to the socket immediately after a successful `subscribe:order` to confirm room membership and provide the current order state.

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "currentStatus": "PREPARING",
  "estimatedDeliveryTime": "2024-01-15T14:30:00Z"
}
```

---

### `unsubscribed`

**Direction:** Server → Client  
**Room:** socket (direct)  
**Description:** Confirms successful leave of an order room.

**Payload:**
```json
{
  "orderId": "507f1f77bcf86cd799439011"
}
```

---

### `merchant:online`

**Direction:** Server → Client  
**Room:** global broadcast  
**Description:** Sent when a merchant restaurant opens for orders. Useful for refreshing restaurant availability states in browsing UIs.

**Payload:**
```json
{
  "restaurantId": "507f1f77bcf86cd799439022",
  "timestamp": "2024-01-15T09:00:00Z"
}
```

---

### `courier:online`

**Direction:** Server → Client  
**Room:** `role:admin`  
**Description:** Sent to all admins when a courier goes online. Used for fleet management dashboards.

**Payload:**
```json
{
  "courierId": "60d0fe4f5311236168a109cb",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

---

### `play-sound`

**Direction:** Server → Client  
**Description:** Instructs the client UI to play a notification sound. Typically sent alongside `order:new`.

**Payload:**
```json
{
  "sound": "new-order-alert",
  "repeat": 3
}
```

| Sound ID | When Played |
|----------|-------------|
| `new-order-alert` | New order arrives at merchant |
| `delivery-complete` | Order marked as delivered |
| `courier-assigned` | Courier confirmed for customer |

**Example:**
```javascript
socket.on('play-sound', ({ sound, repeat = 1 }) => {
  for (let i = 0; i < repeat; i++) {
    new Audio(`/sounds/${sound}.mp3`).play();
  }
});
```

---

### `notification`

**Direction:** Server → Client  
**Room:** `user:<userId>`  
**Description:** General-purpose push notification. Can be triggered by any server-side business event.

**Payload:**
```json
{
  "title": "Order Accepted",
  "message": "Your order has been accepted by the restaurant!",
  "type": "success",
  "orderId": "507f1f77bcf86cd799439011"
}
```

| `type` | Meaning |
|--------|---------|
| `success` | Positive event (order accepted, delivered) |
| `error` | Something went wrong |
| `info` | Neutral informational update |
| `warning` | Action recommended (e.g. order delayed) |

---

### `error`

**Direction:** Server → Client  
**Room:** socket (direct to offending client)  
**Description:** Structured error report emitted when an event fails validation, the role check is denied, or an unexpected server error occurs.

**Payload:**
```json
{
  "event": "subscribe:order",
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    "orderId Must be a valid MongoDB ObjectId (24-character hex string)"
  ]
}
```

| Field | Type | Notes |
|-------|------|-------|
| `event` | string | The event name that caused the error |
| `message` | string | Human-readable summary |
| `code` | string | See [Error Codes](#9-error-codes-reference) |
| `details` | string[] | Individual validation messages (VALIDATION_ERROR only) |

---

### `ping`

**Direction:** Server → Client  
**Room:** broadcast (all sockets)  
**Description:** Heartbeat sent every **30 seconds**. Client **must** respond with [`pong`](#pong) to keep the connection alive.

**Payload:** *(none)*

---

## 7. Order Status Lifecycle

```
PENDING
  ├── ACCEPTED  → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED
  └── REJECTED
  └── CANCELLED  (possible at any stage by admin / customer)
```

### Status Transition Table

| Status | Description | Allowed By |
|--------|-------------|------------|
| `PENDING` | Order placed, awaiting merchant action | System |
| `ACCEPTED` | Merchant accepted; kitchen being prepared | Merchant / Admin |
| `REJECTED` | Merchant rejected the order | Merchant / Admin |
| `PREPARING` | Kitchen is actively preparing | Merchant / Admin |
| `READY_FOR_PICKUP` | Food ready — awaiting courier collection | Merchant / Admin |
| `OUT_FOR_DELIVERY` | Courier picked up and is en route | Courier / Admin |
| `DELIVERED` | Order confirmed delivered | Courier / Admin |
| `CANCELLED` | Order cancelled at any point | Customer / Admin |

### Role-Based Transition Matrix

| Role | Allowed Transitions |
|------|---------------------|
| `merchant` | PENDING → ACCEPTED / REJECTED, ACCEPTED → PREPARING, PREPARING → READY_FOR_PICKUP |
| `courier` | READY_FOR_PICKUP → OUT_FOR_DELIVERY, OUT_FOR_DELIVERY → DELIVERED |
| `admin` | Any → Any |

---

## 8. Validation & Error Handling

All incoming client events are validated against [Joi](https://joi.dev) schemas before the handler runs.

### Validation Behaviour

| Setting | Value | Effect |
|---------|-------|--------|
| `abortEarly` | `false` | Collects **all** errors, not just the first |
| `stripUnknown` | `true` | Unknown fields silently removed (injection guard) |
| `convert` | `true` | Type coercion (ISO string → Date, "3" → 3) |

### Failure Response (via acknowledgement callback)

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "orderId Must be a valid MongoDB ObjectId (24-character hex string)",
    "status must be one of: PENDING, ACCEPTED, ..."
  ]
}
```

### Simultaneous Error Event

On any failure, in addition to the callback response, an `error` event is **also** emitted directly to the socket:

```javascript
socket.on('error', (err) => {
  switch (err.code) {
    case 'VALIDATION_ERROR':
      showValidationErrors(err.details);
      break;
    case 'ACCESS_DENIED':
      showPermissionDenied();
      break;
    case 'INTERNAL_ERROR':
      showServerError();
      break;
  }
});
```

---

## 9. Error Codes Reference

| Code | HTTP Equivalent | Meaning |
|------|-----------------|---------|
| `VALIDATION_ERROR` | 400 Bad Request | Event payload failed Joi schema validation |
| `ACCESS_DENIED` | 403 Forbidden | Authenticated user's role is not permitted for this event |
| `INTERNAL_ERROR` | 500 Internal Server Error | Unhandled exception in the event handler |

---

## 10. Integration Examples

### Customer: Full Order Tracking Flow

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: localStorage.getItem('jwt_token') },
  transports: ['websocket', 'polling'],
});

const orderId = '507f1f77bcf86cd799439011';

// ── Connect ───────────────────────────────────────────────────────────────
socket.on('connect', () => {
  // Subscribe to order after connecting
  socket.emit('subscribe:order', { orderId }, (res) => {
    if (res.success) {
      console.log('Tracking order:', orderId);
      setOrderStatus(res.data?.currentStatus);
    }
  });
});

// ── Initial state after subscription ─────────────────────────────────────
socket.on('subscribed', ({ orderId, currentStatus, estimatedDeliveryTime }) => {
  setOrderStatus(currentStatus);
  setETA(estimatedDeliveryTime);
});

// ── Live status changes ───────────────────────────────────────────────────
socket.on('order:status', ({ status, estimatedDeliveryTime, metadata }) => {
  setOrderStatus(status);
  if (estimatedDeliveryTime) setETA(estimatedDeliveryTime);
  console.log(`Status → ${status} (by ${metadata?.updatedBy})`);
});

// ── ETA updates ───────────────────────────────────────────────────────────
socket.on('order:eta', ({ estimatedDeliveryTime }) => {
  setETA(estimatedDeliveryTime);
});

// ── Live courier tracking on map ──────────────────────────────────────────
socket.on('courier:location', ({ lat, lng, heading }) => {
  mapRef.current.updateCourierMarker(lat, lng, heading);
});

// ── Courier assigned ─────────────────────────────────────────────────────
socket.on('courier:assigned', ({ courierId }) => {
  showToast(`Your courier is on the way! (ID: ${courierId})`);
});

// ── Order cancelled ───────────────────────────────────────────────────────
socket.on('order:cancelled', ({ reason }) => {
  showCancellationDialog(reason);
  socket.emit('unsubscribe:order', { orderId });
});

// ── Heartbeat ─────────────────────────────────────────────────────────────
socket.on('ping', () => socket.emit('pong'));

// ── Global error handling ─────────────────────────────────────────────────
socket.on('error', (err) => {
  console.error(`[WS Error] ${err.code}: ${err.message}`, err.details);
});

// ── Cleanup on page unmount ───────────────────────────────────────────────
// React example:
// useEffect(() => () => socket.disconnect(), []);
```

---

### Merchant: Order Management Dashboard

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: merchantToken },
});

const restaurantId = '507f1f77bcf86cd799439022';

// ── Go online when restaurant opens ──────────────────────────────────────
function openRestaurant() {
  socket.emit('merchant:go-online', { restaurantId }, (res) => {
    if (res.success) setRestaurantStatus('OPEN');
  });
}

// ── Go offline when restaurant closes ────────────────────────────────────
function closeRestaurant() {
  socket.emit('merchant:go-offline', { restaurantId }, (res) => {
    if (res.success) setRestaurantStatus('CLOSED');
  });
}

// ── New order arrives ─────────────────────────────────────────────────────
socket.on('order:new', (order) => {
  addOrderToQueue(order);
  // Sound is triggered automatically by server via play-sound event
});

socket.on('play-sound', ({ sound }) => {
  new Audio(`/sounds/${sound}.mp3`).play().catch(() => {});
});

// ── Accept an order ───────────────────────────────────────────────────────
function acceptOrder(orderId) {
  const estimatedDeliveryTime = new Date(Date.now() + 45 * 60_000).toISOString(); // +45 min
  socket.emit('accept:order', { orderId, estimatedDeliveryTime }, (res) => {
    if (res.success) moveOrderToKitchen(orderId);
  });
}

// ── Reject an order ───────────────────────────────────────────────────────
function rejectOrder(orderId, reason) {
  socket.emit('reject:order', { orderId, reason }, (res) => {
    if (res.success) removeOrderFromQueue(orderId);
    else console.error('Reject failed:', res.error, res.details);
  });
}

// ── Update kitchen progress ───────────────────────────────────────────────
function markPreparing(orderId) {
  socket.emit('update:order-status', { orderId, status: 'PREPARING' }, (res) => {
    if (res.success) updateOrderCard(orderId, 'PREPARING');
  });
}

function markReadyForPickup(orderId) {
  socket.emit('update:order-status', { orderId, status: 'READY_FOR_PICKUP' });
}

socket.on('ping', () => socket.emit('pong'));
```

---

### Courier: Delivery Management

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: courierToken },
});

let locationInterval = null;

// ── Go online ─────────────────────────────────────────────────────────────
function goOnline() {
  socket.emit('courier:go-online', {}, (res) => {
    if (res.success) startLocationBroadcast();
  });
}

// ── Go offline ────────────────────────────────────────────────────────────
function goOffline() {
  socket.emit('courier:go-offline');
  stopLocationBroadcast();
}

// ── Accept a delivery assignment ──────────────────────────────────────────
socket.on('delivery:assigned', (delivery) => {
  showDeliveryAlert(delivery);
});

function acceptDelivery(orderId) {
  socket.emit('courier:accept-delivery', { orderId }, (res) => {
    if (res.success) navigateTo('DELIVERY_ACTIVE', orderId);
  });
}

function rejectDelivery(orderId, reason) {
  socket.emit('courier:reject-delivery', { orderId, reason }, (res) => {
    if (res.success) showToast('Delivery reassigned');
  });
}

// ── Broadcast location every 4 seconds during active delivery ─────────────
function startLocationBroadcast(orderId) {
  locationInterval = setInterval(() => {
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      socket.emit('courier:location-update', {
        orderId,
        lat:     coords.latitude,
        lng:     coords.longitude,
        heading: coords.heading  ?? undefined,
        speed:   coords.speed   ?? undefined,
      });
    });
  }, 4_000);
}

function stopLocationBroadcast() {
  clearInterval(locationInterval);
}

socket.on('ping', () => socket.emit('pong'));
socket.on('error', (err) => console.error('[WS]', err.code, err.message));
```

---

### server-side: Programmatic Broadcast (from REST controllers)

The socket service exports utility functions for broadcasting events directly from HTTP request handlers.

```javascript
const {
  broadcastOrderUpdate,
  notifyMerchantNewOrder,
  broadcastCourierLocation,
  sendToUser,
} = require('./services/socket');

// After saving a new order to DB:
await notifyMerchantNewOrder(restaurantId, savedOrder);

// After a payment webhook updates an order:
broadcastOrderUpdate(orderId, {
  status: 'ACCEPTED',
  estimatedDeliveryTime: new Date(Date.now() + 45 * 60_000),
  metadata: { updatedBy: 'system', reason: 'Payment confirmed' },
});

// Send a private notification to a specific user:
sendToUser(userId, 'notification', {
  title:   'Order Delivered',
  message: 'Your order has been delivered. Enjoy your meal!',
  type:    'success',
  orderId,
});
```

---

*For implementation details, see:*
- `src/config/events.js` — event name constants, payload types, metadata catalog
- `src/utils/socketSchemas.js` — Joi validation schemas for every event
- `src/middleware/socketValidation.js` — `validateEvent()` and `requireRole()` HOFs
- `src/services/socket.js` — full server implementation
- `tests/socket-events.test.js` — integration tests (run with `npm test`)
