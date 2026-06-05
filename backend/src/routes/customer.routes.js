const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const customerAuth = [protect, requireRole('CUSTOMER', 'ADMIN')];

// ─── GET /api/v1/customer/profile ────────────────────────────────────────
router.get(
  '/profile',
  ...customerAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    return ApiResponse.success(res, 200, 'Customer profile retrieved.', user);
  })
);

// ─── PATCH /api/v1/customer/profile ──────────────────────────────────────
router.patch(
  '/profile',
  ...customerAuth,
  asyncHandler(async (req, res) => {
    const allowed = ['name', 'phone', 'profileImage'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });
    return ApiResponse.success(res, 200, 'Profile updated.', user);
  })
);

// ─── GET /api/v1/customer/dashboard ──────────────────────────────────────
router.get(
  '/dashboard',
  ...customerAuth,
  asyncHandler(async (req, res) => {
    return ApiResponse.success(res, 200, 'Customer dashboard — Phase 3.', { customerId: req.user._id });
  })
);

module.exports = router;
