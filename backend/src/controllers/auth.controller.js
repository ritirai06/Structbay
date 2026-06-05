const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const authService = require('../services/auth.service');

// ─── POST /api/v1/auth/register/customer ─────────────────────────────────────
const registerCustomer = asyncHandler(async (req, res) => {
  const user = await authService.registerCustomer(req.body, req);
  return ApiResponse.created(res, 'Registration successful. Please check your email to verify your account.', {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  });
});

// ─── POST /api/v1/auth/register/vendor ───────────────────────────────────────
const registerVendor = asyncHandler(async (req, res) => {
  const user = await authService.registerVendor(req.body, req);
  return ApiResponse.created(res, 'Vendor application submitted. Await admin approval before logging in.', {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    vendorStatus: user.vendorStatus,
    companyName: user.companyName,
  });
});

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body, req);
  return ApiResponse.success(res, 200, 'Login successful.', {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      vendorStatus: user.vendorStatus || undefined,
      profileImage: user.profileImage,
      lastLogin: user.lastLogin,
    },
    accessToken,
    refreshToken,
  });
});

// ─── POST /api/v1/auth/refresh-token ─────────────────────────────────────────
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  const { accessToken, refreshToken: newRefreshToken } = await authService.refreshAccessToken(token, req);
  return ApiResponse.success(res, 200, 'Token refreshed.', { accessToken, refreshToken: newRefreshToken });
});

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  await authService.logout(req.user._id, token);
  return ApiResponse.success(res, 200, 'Logged out successfully.');
});

// ─── POST /api/v1/auth/logout-all ────────────────────────────────────────────
const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user._id);
  return ApiResponse.success(res, 200, 'Logged out from all devices.');
});

// ─── GET /api/v1/auth/verify-email?token=xxx ─────────────────────────────────
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) return ApiResponse.badRequest(res, 'Verification token is required.');
  await authService.verifyEmail(token);
  return ApiResponse.success(res, 200, 'Email verified successfully. You can now log in.');
});

// ─── POST /api/v1/auth/resend-verification ────────────────────────────────────
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return ApiResponse.badRequest(res, 'Email is required.');
  await authService.resendVerification(email);
  return ApiResponse.success(res, 200, 'Verification email sent. Please check your inbox.');
});

// ─── POST /api/v1/auth/forgot-password ───────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  // Always 200 to prevent email enumeration
  return ApiResponse.success(res, 200, 'If an account exists with that email, a reset link has been sent.');
});

// ─── PATCH /api/v1/auth/reset-password ────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return ApiResponse.badRequest(res, 'Token and new password are required.');
  await authService.resetPassword(token, password);
  return ApiResponse.success(res, 200, 'Password reset successful. Please log in with your new password.');
});

// ─── GET /api/v1/auth/me ─────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, 200, 'User profile retrieved.', req.user);
});

module.exports = {
  registerCustomer,
  registerVendor,
  login,
  refreshToken,
  logout,
  logoutAll,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getMe,
};
