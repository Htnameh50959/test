// =============================================================================
// SOCKET VALIDATION MIDDLEWARE  (backend/src/middleware/socketValidation.js)
// =============================================================================
// Provides two composable higher-order functions for Socket.io event handlers:
//
//   validateEvent(eventName, schema)(handler)
//     → Validates payload against a Joi schema before invoking the handler.
//       Returns structured errors via acknowledgement callback AND error event.
//
//   requireRole(...roles)(handler)
//     → Guards the handler so only sockets with an allowed role may execute it.
//       Returns ACCESS_DENIED via callback AND error event to all other roles.
//
// COMPOSITION PATTERN (outer = role guard, inner = validator):
//
//   socket.on(
//     CLIENT_EVENTS.UPDATE_ORDER_STATUS,
//     requireRole('merchant', 'admin')(
//       validateEvent(CLIENT_EVENTS.UPDATE_ORDER_STATUS, schemas.updateOrderStatus)(
//         async (payload, callback) => {
//           // payload is validated, sanitised, role-checked
//         }
//       )
//     )
//   );
//
// SIMPLIFIED PATTERN (single wrapper):
//
//   socket.on(
//     CLIENT_EVENTS.SUBSCRIBE_ORDER,
//     withValidation({ event: CLIENT_EVENTS.SUBSCRIBE_ORDER,
//                      schema: schemas.subscribeOrder })(
//       async (payload, callback) => { ... }
//     )
//   );
// =============================================================================

const { SERVER_EVENTS, ERROR_CODES } = require('../config/events');

// ---------------------------------------------------------------------------
// validateEvent
// ---------------------------------------------------------------------------

/**
 * Returns a wrapped Socket.io event listener that validates the incoming
 * payload against a Joi schema before calling the provided handler.
 *
 * The function is CURRIED so it integrates cleanly with requireRole():
 *   socket.on(event, requireRole('merchant')(validateEvent(name, schema)(handler)))
 *
 * On validation failure:
 *   1. The acknowledgement callback (if any) receives { success: false, error, details }
 *   2. An ERROR event is emitted to the socket with code VALIDATION_ERROR
 *   3. The handler is NOT called
 *
 * On handler error:
 *   1. An ERROR event is emitted with code INTERNAL_ERROR
 *   2. The callback (if any) receives { success: false, error: 'Internal server error' }
 *
 * @param {string}              eventName - Event name (used in logs and error payloads)
 * @param {import('joi').Schema} schema   - Joi schema to validate the payload against
 * @returns {(handler: Function) => Function}
 */
const validateEvent = (eventName, schema) => {
  return (handler) => {
    return async function (payload, callback) {
      const socket = this; // 'this' is bound to the socket inside socket.on()

      // ── 1. VALIDATE ────────────────────────────────────────────────────────
      const { error, value } = schema.validate(payload || {}, {
        abortEarly:   false,  // collect ALL validation errors
        stripUnknown: true,   // silently remove extra / unexpected fields
        convert:      true,   // coerce types (ISO string → Date, "3" → 3)
      });

      if (error) {
        const details = error.details.map((d) =>
          d.message.replace(/['"]/g, '') // strip Joi's surrounding quotes for cleaner UX
        );

        console.warn(
          `[Socket:Validation] FAILED | event="${eventName}" | userId=${socket.userId} | ${details.join(' | ')}`
        );

        if (typeof callback === 'function') {
          callback({
            success: false,
            error:   'Validation failed',
            details,
          });
        }

        socket.emit(SERVER_EVENTS.ERROR, {
          event:   eventName,
          message: 'Validation failed',
          code:    ERROR_CODES.VALIDATION_ERROR,
          details,
        });

        return; // Short-circuit — do NOT invoke handler
      }

      // ── 2. EXECUTE HANDLER with validated, type-coerced payload ───────────
      try {
        const safeCallback =
          typeof callback === 'function' ? callback : () => {};
        await handler.call(socket, value, safeCallback);
      } catch (err) {
        console.error(
          `[Socket:Handler] ERROR | event="${eventName}" | userId=${socket.userId}`,
          err
        );

        socket.emit(SERVER_EVENTS.ERROR, {
          event:   eventName,
          message: 'Internal server error while processing event',
          code:    ERROR_CODES.INTERNAL_ERROR,
        });

        if (typeof callback === 'function') {
          callback({ success: false, error: 'Internal server error' });
        }
      }
    };
  };
};

// ---------------------------------------------------------------------------
// requireRole
// ---------------------------------------------------------------------------

/**
 * Middleware factory that checks the authenticated socket's role against an
 * allowlist before passing control to the next handler.
 *
 * On denial:
 *   1. The callback (if any) receives { success: false, error: '...' }
 *   2. An ERROR event is emitted with code ACCESS_DENIED
 *   3. The wrapped handler is NOT called
 *
 * @param {...string} roles - Allowlisted roles (e.g. 'merchant', 'admin')
 * @returns {(handler: Function) => Function}
 *
 * @example
 * socket.on(
 *   CLIENT_EVENTS.UPDATE_ORDER_STATUS,
 *   requireRole('merchant', 'admin')(
 *     validateEvent(CLIENT_EVENTS.UPDATE_ORDER_STATUS, schemas.updateOrderStatus)(handler)
 *   )
 * );
 */
const requireRole = (...roles) => {
  return (handler) => {
    return async function (payload, callback) {
      const socket = this;

      if (!roles.includes(socket.userRole)) {
        console.warn(
          `[Socket:RoleGuard] DENIED | role="${socket.userRole}" | required=[${roles.join(', ')}] | userId=${socket.userId}`
        );

        if (typeof callback === 'function') {
          callback({
            success: false,
            error:   `Access denied: requires role ${roles.join(' or ')}`,
          });
        }

        socket.emit(SERVER_EVENTS.ERROR, {
          event:   'role-guard',
          message: `Access denied. Required role: ${roles.join(' or ')}`,
          code:    ERROR_CODES.ACCESS_DENIED,
        });

        return;
      }

      await handler.call(socket, payload, callback);
    };
  };
};

// ---------------------------------------------------------------------------
// withValidation  (convenience single-call wrapper)
// ---------------------------------------------------------------------------

/**
 * Convenience wrapper that combines validateEvent into a single fluent call.
 * Useful when you don't need requireRole() but still want validation.
 *
 * @param {{ event: string, schema: import('joi').Schema }} options
 * @returns {(handler: Function) => Function}
 *
 * @example
 * socket.on(
 *   CLIENT_EVENTS.SUBSCRIBE_ORDER,
 *   withValidation({
 *     event:  CLIENT_EVENTS.SUBSCRIBE_ORDER,
 *     schema: schemas.subscribeOrder,
 *   })(async (payload, callback) => {
 *     // payload is already validated
 *   })
 * );
 */
const withValidation = ({ event, schema }) => validateEvent(event, schema);

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------

module.exports = { validateEvent, requireRole, withValidation };
