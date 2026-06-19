const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const authService = require('../services/auth.service');
const RefreshToken = require('../models/tokens/RefreshToken');
const Session = require('../models/Session');

// ─── GET /api/v1/users/me ─────────────────────────────────────────────────────
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new AppError('User not found.', 404);
  return ApiResponse.success(res, 200, 'Profile retrieved.', user);
});

// ─── PUT /api/v1/users/me ─────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'profileImage'];
  // Vendors can also update these
  if (req.user.role === 'VENDOR') {
    allowed.push('companyName', 'contactPerson');
  }

  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
  });

  return ApiResponse.success(res, 200, 'Profile updated.', user);
});

// ─── PUT /api/v1/users/change-password ───────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new AppError('Current password and new password are required.', 400);
  }
  await authService.changePassword(req.user._id, currentPassword, newPassword);
  return ApiResponse.success(res, 200, 'Password changed. Please log in again.');
});

// ─── DELETE /api/v1/users/deactivate ─────────────────────────────────────────
const deactivateAccount = asyncHandler(async (req, res) => {
  await RefreshToken.revokeAllForUser(req.user._id);
  await Promise.all([
    Session.deleteMany({ user: req.user._id }),
    RefreshToken.deleteMany({ user: req.user._id }),
    User.deleteOne({ _id: req.user._id }),
  ]);
  return ApiResponse.success(res, 200, 'Account deleted successfully.');
});

module.exports = { getProfile, updateProfile, changePassword, deactivateAccount };
