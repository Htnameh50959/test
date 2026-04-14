// =============================================================================
// AUTH CONTROLLER  (backend/src/controllers/auth.js)
// =============================================================================
// Handles:
//   POST /api/v1/auth/register       — create account + issue JWT
//   POST /api/v1/auth/login          — verify credentials + issue JWT
//   POST /api/v1/auth/change-password — update password (authenticated)
//   GET  /api/v1/auth/me             — return the currently logged-in user
//   POST /api/v1/auth/logout         — client-side token invalidation hint
//
// Design notes:
//   • Passwords are hashed inside the User pre-save hook (bcrypt, 12 rounds).
//     We pass the plaintext here and let the model handle hashing.
//   • Tokens are signed with HS256. The payload carries only `id` to keep
//     tokens small and avoid stale role/email data in the payload.
//   • The helper `issueToken` is the single place where token generation
//     and the response shape are defined — change it once, affects everywhere.
//   • We use `next(err)` to delegate to the global error handler in error.js
//     rather than crafting per-catch JSON responses (DRY principle).
// =============================================================================

const jwt          = require('jsonwebtoken');
const User         = require('../models/User');
const Restaurant   = require('../models/Restaurant'); // Added for merchant sync
const ErrorResponse = require('../utils/errorResponse');

const issueToken = (user, statusCode, res) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set. Server cannot issue tokens.');
  }

  const token = jwt.sign(
    { id: user._id },
    secret,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

  const safeUser = {
    id:        user._id,
    email:     user.email,
    firstName: user.profile.firstName,
    lastName:  user.profile.lastName  || null,
    fullName:  user.fullName,
    role:      user.role,
    isVerified:user.isVerified,
    loyalty:   user.loyalty,
    avatar:    user.profile.avatar || null,
    phone:     user.profile.phone  || null,
    createdAt: user.createdAt,
  };

  res.status(statusCode).json({
    success: true,
    token,
    expiresIn: process.env.JWT_EXPIRE || '7d',
    user: safeUser,
  });
};

// ---------------------------------------------------------------------------
// CONTROLLER 1: register
// POST /api/v1/auth/register
// ---------------------------------------------------------------------------
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phone, role, merchantDetails } = req.body;

    // ── 1. Check email uniqueness ─────
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return next(new ErrorResponse(
        `An account with the email '${email}' already exists.`,
        409
      ));
    }

    // ── 2. Build the user document ─────────────────────────────────────────
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.create({
      email: normalizedEmail,
      password,
      role: role || 'consumer',
      profile: {
        firstName,
        lastName: lastName || undefined,
        phone:    phone    || undefined,
      },
    });

    // ── 3. Handle Merchant/Restaurant automatic provisioning ───────────────
    if (role === 'merchant' && merchantDetails) {
       await Restaurant.create({
          merchantId: user._id,
          name: merchantDetails.businessName,
          cuisineTypes: ['New Venue'],
          location: merchantDetails.location,
          address: {
             street: merchantDetails.address,
             city: 'Pending Update',
             country: 'India'
          },
          isActive: true,
          isOpen: true
       });
    }

    // ── 4. Issue token ─────────────────────────────────────────────────────
    issueToken(user, 201, res);

  } catch (err) {
    console.error('[RegisterError]', err);
    next(err);
  }
};

// ---------------------------------------------------------------------------
// CONTROLLER 2: login
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------
// Request body (validated by Joi middleware):
//   { email, password }
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ── 1. Look up the user, explicitly selecting the password hash ────────
    // `select: false` on the password field means normal queries never return
    // it. We must opt-in here for the comparison.
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    // Use the same error for "not found" and "wrong password" to prevent
    // user-enumeration attacks (attacker cannot tell which condition failed).
    const credentialsError = new ErrorResponse(
      'Invalid email or password. Please check your credentials and try again.',
      401
    );

    if (!user) return next(credentialsError);

    // ── 2. Compare the plaintext password against the stored hash ──────────
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return next(credentialsError);

    // ── 3. Guard against deactivated / blocked accounts ───────────────────
    if (!user.isActive) {
      return next(new ErrorResponse('Your account has been deactivated. Please contact support.', 403));
    }
    if (user.isBlocked) {
      return next(new ErrorResponse('Your account has been suspended. Please contact support.', 403));
    }

    // ── 4. Issue token ─────────────────────────────────────────────────────
    issueToken(user, 200, res);

  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// CONTROLLER 3: getMe
// GET /api/v1/auth/me   — protected route
// ---------------------------------------------------------------------------
// req.user is already populated by the protect middleware.
exports.getMe = async (req, res, next) => {
  try {
    // Re-fetch so we always return the freshest data (protect may have cached
    // the document from earlier in the request cycle).
    const user = await User.findById(req.user._id);
    if (!user) return next(new ErrorResponse('User not found.', 404));

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// CONTROLLER 4: changePassword
// POST /api/v1/auth/change-password   — protected route
// ---------------------------------------------------------------------------
// Request body (validated by Joi middleware):
//   { currentPassword, newPassword, confirmPassword }
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Fetch user with password hash included.
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return next(new ErrorResponse('User not found.', 404));

    // Verify current password first.
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return next(new ErrorResponse('Current password is incorrect.', 400));
    }

    // Prevent re-using the same password.
    const isSame = await user.matchPassword(newPassword);
    if (isSame) {
      return next(new ErrorResponse('New password must be different from the current password.', 400));
    }

    // Assign and save — this triggers the pre-save hashing hook.
    user.password = newPassword;
    await user.save();

    // Issue a fresh token so the client doesn't need to log in again.
    issueToken(user, 200, res);

  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// CONTROLLER 5: logout
// POST /api/v1/auth/logout  — protected route
// ---------------------------------------------------------------------------
// JWTs are stateless — the server cannot truly revoke them without a denylist.
// We return a 200 so the client knows to discard its local token.
// For true revocation, implement a Redis token denylist and check it in protect().
exports.logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please delete your local token.',
  });
};

// ---------------------------------------------------------------------------
// CONTROLLER 6: checkEmail
// POST /api/v1/auth/check-email
// ---------------------------------------------------------------------------
exports.checkEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(new ErrorResponse('Email is required', 400));
    
    const searchEmail = email.trim().toLowerCase();
    console.log(`[CheckEmail] Searching for: "${searchEmail}"`);

    // Use a standard exact match first, then a case-insensitive check if it fails
    // This is more robust than a single regex for debugging.
    let existing = await User.findOne({ email: searchEmail });
    
    if (!existing) {
       // Backup: try case-insensitive regex in case there's mixed-case legacy data
       existing = await User.findOne({ 
         email: { $regex: new RegExp(`^${searchEmail}$`, 'i') } 
       });
    }
    
    if (existing) {
      console.log(`[CheckEmail] Found existing user: ${existing._id} (${existing.email})`);
    } else {
      console.log(`[CheckEmail] No user found for: "${searchEmail}"`);
    }

    res.status(200).json({
      success: true,
      exists: !!existing,
      message: existing ? 'This email is already registered.' : 'Email is available!'
    });
  } catch (err) {
    console.error('[CheckEmailError]', err);
    next(err);
  }
};
