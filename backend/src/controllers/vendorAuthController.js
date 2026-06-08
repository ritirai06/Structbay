const bcrypt = require('bcryptjs');
const User = require('../models/User');
const VendorActivityLog = require('../models/VendorActivityLog');
const ApiResponse = require('../utils/apiResponse');
const { generateAccessToken } = require('../utils/tokenUtils');

// @desc    Vendor Login
// @route   POST /api/v1/vendor/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return ApiResponse.badRequest(res, 'Email and password are required.');

  const user = await User.findOne({ email: email.toLowerCase(), role: 'VENDOR' }).select('+password +failedLoginAttempts +lockUntil');
  if (!user)
    return ApiResponse.unauthorized(res, 'Invalid credentials.');

  if (user.isLocked)
    return ApiResponse.forbidden(res, 'Account locked due to too many failed attempts. Try again in 30 minutes.');

  if (user.status === 'SUSPENDED' || user.status === 'DELETED')
    return ApiResponse.forbidden(res, 'Account is suspended. Contact StructBay support.');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incFailedLogin();
    return ApiResponse.unauthorized(res, 'Invalid credentials.');
  }

  if (user.vendorStatus !== 'APPROVED')
    return ApiResponse.forbidden(res, 'Your vendor account is pending approval. Contact admin.');

  await user.resetFailedLogin();
  user.lastLogin = new Date();
  user.lastLoginIP = req.ip;
  await user.save({ validateBeforeSave: false });

  const token = generateAccessToken({ id: user._id, role: user.role });

  await VendorActivityLog.create({
    vendor: user._id,
    action: 'login',
    description: 'Vendor logged in',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return ApiResponse.success(res, 200, 'Login successful.', { token, vendor: user });
};

// @desc    Vendor Logout
// @route   POST /api/v1/vendor/auth/logout
exports.logout = async (req, res) => {
  await VendorActivityLog.create({
    vendor: req.user._id,
    action: 'logout',
    description: 'Vendor logged out',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  return ApiResponse.success(res, 200, 'Logged out successfully.');
};

// @desc    Get Current Vendor (Me)
// @route   GET /api/v1/vendor/auth/me
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  return ApiResponse.success(res, 200, 'Vendor profile retrieved.', user);
};

// @desc    Change Password
// @route   PUT /api/v1/vendor/auth/change-password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return ApiResponse.badRequest(res, 'currentPassword and newPassword are required.');

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch)
    return ApiResponse.unauthorized(res, 'Current password is incorrect.');

  user.password = newPassword;
  await user.save();

  await VendorActivityLog.create({
    vendor: user._id,
    action: 'password_change',
    description: 'Password changed',
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Password changed successfully.');
};
