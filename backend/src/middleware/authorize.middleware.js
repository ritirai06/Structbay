const ApiResponse = require('../utils/apiResponse');
const { roleHasPermission } = require('../config/permissions');

/**
 * authorize(permission)
 * Use AFTER protect middleware.
 * Checks the user's role against the permission map in config/permissions.js
 *
 * Usage:
 *   router.get('/orders', protect, authorize(PERMISSIONS.PLACE_ORDER), handler)
 */
const authorize = (permission) => (req, res, next) => {
  if (!req.user) return ApiResponse.unauthorized(res);

  if (!roleHasPermission(req.user.role, permission)) {
    return ApiResponse.forbidden(
      res,
      `Access denied. Your role (${req.user.role}) does not have permission: ${permission}`
    );
  }
  next();
};

module.exports = { authorize };
