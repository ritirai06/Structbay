const User = require('../models/User');
const RefreshToken = require('../models/tokens/RefreshToken');
const VerificationToken = require('../models/tokens/VerificationToken');
const Session = require('../models/Session');
const AppError = require('../utils/AppError');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  buildTokenPayload,
} = require('../utils/tokenUtils');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendVendorApplicationEmail,
  sendWelcomeEmail,
} = require('./email.service');
const { USER_STATUS, VENDOR_STATUS, ROLES } = require('../config/constants');
const { generateRefNumber } = require('./refNumber.service');

// ─── Helpers ────────────────────────────────────────────────────────────────

const getClientMeta = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress || null,
  userAgent: req.headers['user-agent'] || null,
});

const issueTokenPair = async (user, req) => {
  const payload = buildTokenPayload(user);
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const { ipAddress, userAgent } = getClientMeta(req);
  const parsedUA = Session.parseUserAgent(userAgent);

  // Persist refresh token
  const expiresAt = new Date(
    Date.now() +
      parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || 30) * 24 * 60 * 60 * 1000
  );
  const storedToken = await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    expiresAt,
    ipAddress,
    userAgent,
  });

  // Create session record
  await Session.create({
    user: user._id,
    refreshTokenId: storedToken._id,
    ipAddress,
    userAgent,
    ...parsedUA,
    loginAt: new Date(),
    lastActivityAt: new Date(),
  });

  return { accessToken, refreshToken };
};

// ─── Register Customer ────────────────────────────────────────────────────────
const registerCustomer = async ({ name, email, phone, password }, req) => {
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('An account with this email already exists.', 409);

  const referenceNumber = await generateRefNumber('CUSTOMER');

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: ROLES.CUSTOMER,
    status: USER_STATUS.PENDING,
    isEmailVerified: false,
    referenceNumber,
  });

  // Email verification token
  const verToken = await VerificationToken.createEmailToken(user._id);
  await sendVerificationEmail({ to: user.email, name: user.name, token: verToken.token });

  return user;
};

// ─── Register Vendor ──────────────────────────────────────────────────────────
const registerVendor = async (
  { name, email, phone, password, companyName, contactPerson, gstNumber, businessRegNumber },
  req
) => {
  const allowPublic = String(process.env.ALLOW_PUBLIC_VENDOR_REGISTRATION || '')
    .toLowerCase()
    .trim() === 'true';
  if (!allowPublic) {
    throw new AppError(
      'Vendor self-registration is disabled. New vendor accounts are created by the administrator.',
      403
    );
  }

  const existing = await User.findOne({ email });
  if (existing) throw new AppError('An account with this email already exists.', 409);

  const referenceNumber = await generateRefNumber('VENDOR');

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: ROLES.VENDOR,
    status: USER_STATUS.PENDING,
    isEmailVerified: false,
    vendorStatus: VENDOR_STATUS.PENDING_APPROVAL,
    companyName,
    contactPerson,
    gstNumber,
    businessRegNumber,
    referenceNumber,
  });

  // Verification email
  const verToken = await VerificationToken.createEmailToken(user._id);
  await sendVerificationEmail({ to: user.email, name: user.name, token: verToken.token });
  await sendVendorApplicationEmail({ to: user.email, name: user.name, companyName });

  return user;
};

/**
 * Admin-only vendor onboarding: ACTIVE + APPROVED, email treated as verified.
 * Does not send vendor application email (account is trusted).
 */
const createVendorByAdmin = async (
  { name, email, phone, password, companyName, contactPerson, gstNumber, businessRegNumber },
  adminUser
) => {
  const existing = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (existing) throw new AppError('An account with this email already exists.', 409);

  const referenceNumber = await generateRefNumber('VENDOR');

  const doc = {
    name,
    email,
    phone,
    password,
    role: ROLES.VENDOR,
    status: USER_STATUS.ACTIVE,
    isEmailVerified: true,
    vendorStatus: VENDOR_STATUS.APPROVED,
    companyName,
    contactPerson: contactPerson || name,
    businessRegNumber: businessRegNumber || undefined,
    referenceNumber,
    vendorApprovedBy: adminUser._id,
    vendorApprovedAt: new Date(),
  };
  if (gstNumber && String(gstNumber).trim()) doc.gstNumber = String(gstNumber).trim().toUpperCase();

  const user = await User.create(doc);
  return user;
};

// ─── Login ────────────────────────────────────────────────────────────────────
const login = async ({ email, password }, req) => {
  // Fetch user with password + security fields
  const user = await User.findOne({ email }).select(
    '+password +failedLoginAttempts +lockUntil +lastLoginIP'
  );

  if (!user) throw new AppError('Invalid email or password.', 401);

  // Check account lock
  if (user.isLocked) {
    throw new AppError(
      'Account temporarily locked due to multiple failed attempts. Try again in 30 minutes.',
      423
    );
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incFailedLogin();
    throw new AppError('Invalid email or password.', 401);
  }

  // Check account status
  if (user.status === USER_STATUS.SUSPENDED) {
    throw new AppError('Your account has been suspended. Please contact support.', 403);
  }
  if (user.status === USER_STATUS.DELETED) {
    throw new AppError('Account not found.', 404);
  }

  // Vendor-specific: must be approved
  if (user.role === ROLES.VENDOR && user.vendorStatus !== VENDOR_STATUS.APPROVED) {
    const messages = {
      [VENDOR_STATUS.PENDING_APPROVAL]: 'Your vendor account is pending admin approval.',
      [VENDOR_STATUS.REJECTED]: 'Your vendor application was rejected. Contact support.',
      [VENDOR_STATUS.SUSPENDED]: 'Your vendor account has been suspended.',
    };
    throw new AppError(messages[user.vendorStatus] || 'Vendor access denied.', 403);
  }

  // Activate account on first successful login if email verified
  if (user.status === USER_STATUS.PENDING && user.isEmailVerified) {
    user.status = USER_STATUS.ACTIVE;
  }

  // Reset failed attempts, update lastLogin
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLogin = new Date();
  user.lastLoginIP = getClientMeta(req).ipAddress;
  await user.save({ validateBeforeSave: false });

  const { accessToken, refreshToken } = await issueTokenPair(user, req);

  return { user, accessToken, refreshToken };
};

// ─── Refresh Access Token ─────────────────────────────────────────────────────
const refreshAccessToken = async (token, req) => {
  if (!token) throw new AppError('Refresh token is required.', 400);

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new AppError('Invalid or expired refresh token. Please log in again.', 401);
  }

  // Check DB record
  const stored = await RefreshToken.findOne({ token, isRevoked: false });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError('Refresh token expired or revoked. Please log in again.', 401);
  }

  const user = await User.findById(decoded.id);
  if (!user || user.status === USER_STATUS.SUSPENDED || user.status === USER_STATUS.DELETED) {
    throw new AppError('User no longer has access.', 403);
  }

  // Rotate: revoke old, issue new pair
  await RefreshToken.revokeToken(token);
  const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(user, req);

  return { accessToken, refreshToken: newRefreshToken };
};

// ─── Logout ───────────────────────────────────────────────────────────────────
const logout = async (userId, refreshToken) => {
  if (refreshToken) {
    await RefreshToken.revokeToken(refreshToken);
  }
  // Mark active session as logged out
  await Session.findOneAndUpdate(
    { user: userId, isActive: true },
    { isActive: false, logoutAt: new Date() },
    { sort: { loginAt: -1 } }
  );
};

// ─── Logout All Devices ───────────────────────────────────────────────────────
const logoutAll = async (userId) => {
  await RefreshToken.revokeAllForUser(userId);
  await Session.updateMany({ user: userId, isActive: true }, { isActive: false, logoutAt: new Date() });
};

// ─── Verify Email ─────────────────────────────────────────────────────────────
const verifyEmail = async (token) => {
  const record = await VerificationToken.findOne({
    token,
    type: 'EMAIL_VERIFICATION',
    isUsed: false,
  });

  if (!record || record.expiresAt < new Date()) {
    throw new AppError('Verification link is invalid or has expired.', 400);
  }

  const user = await User.findById(record.user);
  if (!user) throw new AppError('User not found.', 404);

  user.isEmailVerified = true;
  if (user.status === USER_STATUS.PENDING) user.status = USER_STATUS.ACTIVE;
  await user.save({ validateBeforeSave: false });

  record.isUsed = true;
  await record.save();

  // Send welcome email only to customers
  if (user.role === ROLES.CUSTOMER) {
    await sendWelcomeEmail({ to: user.email, name: user.name });
  }

  return user;
};

// ─── Resend Verification Email ────────────────────────────────────────────────
const resendVerification = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError('No account found with that email.', 404);
  if (user.isEmailVerified) throw new AppError('Email is already verified.', 400);

  const verToken = await VerificationToken.createEmailToken(user._id);
  await sendVerificationEmail({ to: user.email, name: user.name, token: verToken.token });
};

// ─── Forgot Password ──────────────────────────────────────────────────────────
const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  // Always respond success to prevent email enumeration
  if (!user) return;

  const resetToken = await VerificationToken.createResetToken(user._id);
  await sendPasswordResetEmail({ to: user.email, name: user.name, token: resetToken.token });
};

// ─── Reset Password ───────────────────────────────────────────────────────────
const resetPassword = async (token, newPassword) => {
  const record = await VerificationToken.findOne({
    token,
    type: 'PASSWORD_RESET',
    isUsed: false,
  });

  if (!record || record.expiresAt < new Date()) {
    throw new AppError('Password reset link is invalid or has expired.', 400);
  }

  const user = await User.findById(record.user).select('+password');
  if (!user) throw new AppError('User not found.', 404);

  user.password = newPassword;
  await user.save();

  // Mark token used
  record.isUsed = true;
  await record.save();

  // Revoke all refresh tokens (force re-login everywhere)
  await RefreshToken.revokeAllForUser(user._id);
};

// ─── Change Password ──────────────────────────────────────────────────────────
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new AppError('User not found.', 404);

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new AppError('Current password is incorrect.', 400);

  user.password = newPassword;
  await user.save();

  await RefreshToken.revokeAllForUser(userId);
};

module.exports = {
  registerCustomer,
  registerVendor,
  createVendorByAdmin,
  login,
  refreshAccessToken,
  logout,
  logoutAll,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
};
