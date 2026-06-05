const ApiResponse = require('../utils/apiResponse');
const { verifyAccessToken } = require('../utils/tokenUtils');
const User = require('../models/User');
const Session = require('../models/Session');
const asyncHandler = require('../utils/asyncHandler');

/**
 * protect — verify JWT Bearer token, attach user to req.
 * Also updates lastActivityAt on the session.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return ApiResponse.unauthorized(res, 'No token provided. Please log in.');
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, 'Session expired. Please refresh your token.');
    }
    return ApiResponse.unauthorized(res, 'Invalid token. Please log in again.');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return ApiResponse.unauthorized(res, 'User no longer exists.');
  }

  if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
    return ApiResponse.forbidden(res, 'Your account has been suspended or deactivated. Contact support.');
  }

  // Non-blocking session activity update
  Session.findOneAndUpdate(
    { user: user._id, isActive: true },
    { lastActivityAt: new Date() },
    { sort: { loginAt: -1 } }
  ).catch(() => {}); // silent

  req.user = user;
  next();
});

/**
 * optionalAuth — attaches user if token present, continues if not.
 * Use on public routes that have optional auth-aware behavior.
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return next();

  try {
    const decoded = verifyAccessToken(auth.split(' ')[1]);
    const user = await User.findById(decoded.id);
    if (user && user.status === 'ACTIVE') req.user = user;
  } catch {
    // Ignore token errors for optional auth
  }
  next();
});

module.exports = { protect, optionalAuth };
