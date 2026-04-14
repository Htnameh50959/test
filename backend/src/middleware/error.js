// =============================================================================
// GLOBAL ERROR HANDLER  (backend/src/middleware/error.js)
// =============================================================================
// This is the LAST middleware registered in server.js.
// Express calls it whenever any route/middleware calls next(err).
//
// It normalises every possible error type into a consistent JSON shape:
//   { success: false, code: string, message: string, [errors]: array }
//
// Error types handled:
//   • ErrorResponse (our custom class)      — use its statusCode + message
//   • Mongoose CastError                    — invalid ObjectId → 400
//   • Mongoose ValidationError              — schema validation → 422
//   • Mongoose duplicate key (code 11000)   — unique constraint → 409
//   • JWT TokenExpiredError                 — expired token → 401
//   • JWT JsonWebTokenError                 — bad token → 401
//   • Joi ValidationError (name match)      — schema validation → 400
//   • Generic / unknown errors              — 500 Internal Server Error
//
// Never leaks stack traces or internal error messages in production.
// =============================================================================

const ErrorResponse = require('../utils/errorResponse');

// ---------------------------------------------------------------------------
// HELPER: determine if we are running outside production mode
// ---------------------------------------------------------------------------
const isDev = process.env.NODE_ENV !== 'production';

// ---------------------------------------------------------------------------
// GLOBAL ERROR HANDLER
// ---------------------------------------------------------------------------
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Always log the full error in development; just the message in production.
  if (isDev) {
    console.error('━━━━ ERROR ━━━━');
    console.error(err);
    console.error('━━━━━━━━━━━━━━━');
  } else {
    console.error(`[ERROR] ${err.name}: ${err.message}`);
  }

  // Start with a copy so we don't mutate the original error object.
  let statusCode = err.statusCode || 500;
  let code       = err.code       || 'SERVER_ERROR';
  let message    = err.message    || 'An unexpected error occurred. Please try again later.';
  let errors     = null; // populated for multi-field validation failures

  // ── 1. Mongoose CastError ────────────────────────────────────────────────
  // Happens when an invalid ObjectId string is passed to a findById() call.
  // e.g. GET /api/v1/restaurants/not-a-real-id
  if (err.name === 'CastError') {
    statusCode = 400;
    code       = 'INVALID_ID';
    message    = `The value '${err.value}' is not a valid ID.`;
  }

  // ── 2. Mongoose ValidationError ──────────────────────────────────────────
  // Schema-level validators failed: required fields, enum values, custom validators.
  if (err.name === 'ValidationError') {
    statusCode = 422;
    code       = 'SCHEMA_VALIDATION_ERROR';
    errors     = Object.values(err.errors).map((field) => ({
      field:   field.path,
      message: field.message,
    }));
    message    = 'The data provided failed database schema validation.';
  }

  // ── 3. MongoDB duplicate key (unique index violation) ─────────────────────
  // e.g. registering with an email that's already in the users collection.
  if (err.code === 11000) {
    statusCode = 409;
    code       = 'DUPLICATE_VALUE';

    // Extract the field name from the error's keyValue map.
    const duplicatedFields = Object.keys(err.keyValue || {});
    const fieldList        = duplicatedFields.join(', ');
    message = duplicatedFields.length
      ? `An account with this ${fieldList} already exists.`
      : 'A duplicate value was detected. Please use a different value.';
  }

  // ── 4. JWT: expired token ─────────────────────────────────────────────────
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code       = 'TOKEN_EXPIRED';
    message    = 'Your session has expired. Please log in again.';
  }

  // ── 5. JWT: invalid/malformed token ──────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code       = 'TOKEN_INVALID';
    message    = 'Invalid authentication token. Please log in again.';
  }

  // ── 6. JWT: token used before its nbf claim ────────────────────────────
  if (err.name === 'NotBeforeError') {
    statusCode = 401;
    code       = 'TOKEN_NOT_ACTIVE';
    message    = 'This token is not active yet.';
  }

  // ── 7. Joi ValidationError (when used outside the validate() middleware) ──
  // Joi errors have err.isJoi === true or err.name === 'ValidationError'
  // but err._original !== undefined distinguishes them from Mongoose.
  if (err.isJoi || (err.name === 'ValidationError' && err._original !== undefined)) {
    statusCode = 400;
    code       = 'VALIDATION_ERROR';
    errors     = (err.details || []).map((d) => ({
      field:   d.context?.label || d.context?.key || 'unknown',
      message: d.message.replace(/['"]/g, ''),
    }));
    message    = 'Request validation failed.';
  }

  // ── 8. Our custom ErrorResponse ───────────────────────────────────────────
  // Explicit statusCode set by controllers — trust it as-is.
  // (Already handled by the initial let statusCode = err.statusCode fallback,
  //  but we re-read here in case a type-check above overwrote statusCode)
  if (err instanceof ErrorResponse) {
    statusCode = err.statusCode;
    code       = err.code || code;
    message    = err.message;
  }

  // ── Build the final response ───────────────────────────────────────────────
  const body = {
    success: false,
    code,
    message,
  };

  // Include field-level error details for validation failures.
  if (errors)    body.errors   = errors;

  // In development, include the stack trace in the response for easy debugging.
  if (isDev)     body.stack    = err.stack;

  res.status(statusCode).json(body);
};

module.exports = errorHandler;
