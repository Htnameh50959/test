# WebSocket API Documentation

This document describes the WebSocket API for the Integrated Food Delivery and Hospitality Platform.

## Connection

**URL:** `ws://localhost:5000` (development)  
**URL:** `wss://api.yourdomain.com` (production)

**Transports:** `websocket` (primary), `polling` (fallback)  
**Protocol:** Socket.io v4

### Authentication
Authentication is required for all connections. Pass a valid JWT token in the `auth` handshake object.

```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

The user context (ID, role, profile) is automatically attached to the socket on the server.

---

## Client → Server Events

### subscribe:order
Subscribe to real-time updates for a specific order.
- **Payload**: `{ "orderId": "string" }`
- **Response**: Acknowledgement with `success: true`.

### update:order-status
Update the status of an order (Merchants/Admins only).
- **Payload**: 
  ```json
  {
    "orderId": "string",
    "status": "ACCEPTED | PREPARING | READY_FOR_PICKUP | OUT_FOR_DELIVERY | DELIVERED | CANCELLED",
    "reason": "string (optional)",
    "estimatedDeliveryTime": "ISO Date (optional)"
  }
  ```

### courier:location-update
Update current GPS coordinates (Couriers only).
- **Payload**:
  ```json
  {
    "orderId": "string (optional)",
    "lat": number,
    "lng": number,
    "heading": number (optional),
    "speed": number (optional)
  }
  ```

### pong
Response to the server's heartbeat ping.

---

## Server → Client Events

### order:status
Received when an order you are subscribed to changes status.
- **Payload**:
  ```json
  {
    "orderId": "string",
    "status": "string",
    "timestamp": "ISO Date",
    "updatedBy": "userId"
  }
  ```

### courier:location
Received for real-time tracking of a delivery.
- **Payload**:
  ```json
  {
    "orderId": "string",
    "lat": number,
    "lng": number,
    "heading": number,
    "timestamp": "ISO Date"
  }
  ```

### ping
Server heartbeat event. The client should respond with `pong`.

### error
General error event for validation failures or server errors.
- **Payload**:
  ```json
  {
    "event": "origin-event-name",
    "message": "Error description",
    "details": ["Validation error message 1", "..."]
  }
  ```

---

## Rooms

The server automatically places sockets into specific rooms upon connection:
- `user:{userId}`: Direct messages to this specific user.
- `role:{role}`: Boardcasts to all users with a specific role (e.g., all `couriers`).
- `order:{orderId}`: Created when a user calls `subscribe:order`.

---

## Error Handling

The server uses Joi for payload validation. If an event is sent with an invalid payload:
1. The acknowledgement callback (if provided) will return `{ success: false, error: 'Validation failed', details: [...] }`.
2. An `error` event will be emitted to the client.
