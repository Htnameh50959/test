// =============================================================================
// AUTH ROUTES  (backend/src/routes/auth.js)
// =============================================================================
// Base path (registered in server.js): /api/v1/auth
//
// Public routes  (no token required):
//   POST /api/v1/auth/register        — create account
//   POST /api/v1/auth/login           — sign in
//
// Protected routes  (valid JWT required):
//   GET  /api/v1/auth/me              — return current user
//   POST /api/v1/auth/logout          — logout hint (client drops token)
//   POST /api/v1/auth/change-password — update password
// =============================================================================

const express = require('express');

const router = express.Router();

// ── Controllers ──────────────────────────────────────────────────────────────
const {
  register,
  login,
  getMe,
  logout,
  changePassword,
  checkEmail,
  forgotPassword,
  resetPassword,
} = require('../controllers/auth');

// ── Middleware ────────────────────────────────────────────────────────────────
const { protect }  = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

/**
 * POST /api/v1/auth/register
 * Body: { firstName, lastName?, email, password, phone?, role? }
 *
 * validate() runs Joi against req.body BEFORE the controller fires.
 * If validation fails, the controller is never called — a 400 is returned.
 */
router.post(
  '/register',
  validate(schemas.auth.register),
  register
);

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 */
router.post(
  '/login',
  validate(schemas.auth.login),
  login
);

/**
 * POST /api/v1/auth/check-email
 * Body: { email }
 */
router.post('/check-email', checkEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// =============================================================================
// PROTECTED ROUTES  (JWT required)
// =============================================================================

// Attach protect to all routes defined after this line.
router.use(protect);

/**
 * GET /api/v1/auth/me
 * Returns the full profile of the currently authenticated user.
 */
router.get('/me', getMe);

/**
 * POST /api/v1/auth/logout
 * Stateless logout — instructs the client to discard its token.
 */
router.post('/logout', logout);

/**
 * POST /api/v1/auth/change-password
 * Body: { currentPassword, newPassword, confirmPassword }
 */
router.post(
  '/change-password',
  validate(schemas.auth.changePassword),
  changePassword
);

module.exports = router;
