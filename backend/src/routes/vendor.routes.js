const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole, requireApprovedVendor } = require('../middleware/role.middleware');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ─── GET /api/v1/vendor/profile ───────────────────────────────────────────
router.get(
  '/profile',
  protect,
  requireRole('VENDOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    return ApiResponse.success(res, 200, 'Vendor profile retrieved.', user);
  })
);

// ─── PATCH /api/v1/vendor/profile ────────────────────────────────────────
router.patch(
  '/profile',
  protect,
  requireRole('VENDOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const allowed = ['name', 'phone', 'companyName', 'contactPerson', 'profileImage'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });
    return ApiResponse.success(res, 200, 'Vendor profile updated.', user);
  })
);

// ─── GET /api/v1/vendor/dashboard ─────────────────────────────────────────
router.get(
  '/dashboard',
  protect,
  requireApprovedVendor,
  asyncHandler(async (req, res) => {
    return ApiResponse.success(res, 200, 'Vendor dashboard — Phase 3.', { vendorId: req.user._id });
  })
);

module.exports = router;
