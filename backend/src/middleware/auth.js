// =============================================================================
// AUTH MIDDLEWARE  (backend/src/middleware/auth.js)
// =============================================================================
// Two middleware functions used together on every protected route:
//
//   protect         — verifies the JWT and attaches req.user
//   authorize(...roles) — gates a route to specific roles
//
// Usage in a route file:
//   const { protect, authorize } = require('../middleware/auth');
//
//   router.get('/secret',  protect, myController);
//   router.post('/admin',  protect, authorize('admin'), myController);
//   router.post('/orders', protect, authorize('consumer'), myController);
// =============================================================================

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ---------------------------------------------------------------------------
// HELPER: extract raw token string from the Authorization header
// ---------------------------------------------------------------------------
// Accepts: "Bearer <token>"   (standard OAuth2 Bearer scheme)
// Returns: the raw token string, or null if header is absent/malformed.
const extractTokenFromHeader = (req) => {
  const { authorization } = req.headers;
  if (authorization && authorization.startsWith('Bearer ')) {
    // "Bearer eyJ..." → split on the space, take index [1]
    const token = authorization.split(' ')[1];
    return token && token.trim() ? token.trim() : null;
  }
  return null;
};

// ---------------------------------------------------------------------------
// MIDDLEWARE 1: protect
// ---------------------------------------------------------------------------
// Verifies the JWT, looks up the user, and attaches them to req.user.
// Responds with distinct error messages for missing / expired / invalid tokens
// so the client can decide whether to silently refresh or redirect to login.
exports.protect = async (req, res, next) => {
  try {
    // ── 1. Pull the token ──────────────────────────────────────────────────
    const token = extractTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        code:    'NO_TOKEN',
        message: 'Access denied. No authentication token was provided. Please log in.',
      });
    }

    // ── 2. Verify signature and expiry ────────────────────────────────────
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      // Distinguish between an expired token and a bad/tampered one.
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success:   false,
          code:      'TOKEN_EXPIRED',
          message:   'Your session has expired. Please log in again.',
          expiredAt: jwtErr.expiredAt,
        });
      }
      // JsonWebTokenError, NotBeforeError, or anything else
      return res.status(401).json({
        success: false,
        code:    'TOKEN_INVALID',
        message: 'Invalid authentication token. Please log in again.',
      });
    }

    // ── 3. Ensure payload has the expected shape ──────────────────────────
    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        code:    'TOKEN_MALFORMED',
        message: 'Token payload is malformed. Please log in again.',
      });
    }

    // ── 4. Look up the user in the database ───────────────────────────────
    // Do NOT use req.user from a previous middleware — always hit the DB so we
    // get the latest role, isActive, isBlocked flags.
    const user = await User.findById(decoded.id).select('-__v');

    if (!user) {
      // User was deleted after the token was issued.
      return res.status(401).json({
        success: false,
        code:    'USER_NOT_FOUND',
        message: 'The account associated with this token no longer exists.',
      });
    }

    // ── 5. Guard against blocked / deactivated accounts ──────────────────
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        code:    'ACCOUNT_INACTIVE',
        message: 'Your account has been deactivated. Contact support.',
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        code:    'ACCOUNT_BLOCKED',
        message: 'Your account has been suspended. Contact support.',
      });
    }

    // ── 6. Attach user and token metadata to the request ─────────────────
    req.user      = user;
    req.tokenData = decoded; // iat, exp, etc. available downstream if needed

    next();
  } catch (err) {
    // Unexpected server-side error (DB down, etc.)
    console.error('[protect middleware] Unexpected error:', err.message);
    return res.status(500).json({
      success: false,
      code:    'AUTH_ERROR',
      message: 'An error occurred while verifying your credentials.',
    });
  }
};

// ---------------------------------------------------------------------------
// MIDDLEWARE 2: authorize(...roles)
// ---------------------------------------------------------------------------
// Factory function that returns a middleware closing over the allowed roles.
// Must be used AFTER protect (requires req.user to be populated).
//
// Examples:
//   authorize('admin')                       — only admins
//   authorize('merchant', 'admin')           — merchants or admins
//   authorize('consumer', 'merchant')        — consumers or merchants
exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // protect() must run first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code:    'NOT_AUTHENTICATED',
        message: 'You must be logged in before role authorization can run.',
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        code:    'FORBIDDEN',
        message: `Access denied. This action requires one of the following roles: [${allowedRoles.join(', ')}]. Your role is '${userRole}'.`,
      });
    }

    next();
  };
};

// ---------------------------------------------------------------------------
// MIDDLEWARE 3: optionalAuth
// ---------------------------------------------------------------------------
// Like protect, but does NOT reject the request if no token is supplied.
// Useful for public endpoints that behave differently for logged-in users
// (e.g., restaurant listing shows "Favorite" button only when logged in).
exports.optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req);
    if (!token) return next(); // anonymous request — that's fine

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-__v');

    if (user && user.isActive && !user.isBlocked) {
      req.user = user;
    }
  } catch (_) {
    // Token present but invalid — ignore silently; treat as anonymous.
  }
  next();
};
