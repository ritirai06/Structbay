const ApiResponse = require('../utils/apiResponse');

/**
 * RBAC — restrict access to specific roles.
 *
 * Usage:
 *   router.delete('/categories/:id', protect, requireRole('ADMIN'), handler)
 *   router.get('/vendor-only', protect, requireRole('VENDOR', 'ADMIN'), handler)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.forbidden(
        res,
        `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}.`
      );
    }

    next();
  };
};

/**
 * Vendor guard — also checks vendorStatus === APPROVED
 */
const requireApprovedVendor = (req, res, next) => {
  if (!req.user) return ApiResponse.unauthorized(res);

  if (req.user.role !== 'VENDOR') {
    return ApiResponse.forbidden(res, 'Vendor access only.');
  }

  if (req.user.vendorStatus !== 'APPROVED') {
    return ApiResponse.forbidden(
      res,
      'Your vendor account is pending approval. Contact the admin.'
    );
  }

  next();
};

module.exports = { requireRole, requireApprovedVendor };
