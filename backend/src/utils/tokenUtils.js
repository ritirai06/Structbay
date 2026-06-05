const jwt = require('jsonwebtoken');

/**
 * Generate a short-lived access token (15m default)
 */
const generateAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });

/**
 * Generate a long-lived refresh token (30d default)
 */
const generateRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

/**
 * Generate a medium-lived reset/verification token (1h default)
 */
const generateResetToken = (payload) =>
  jwt.sign(payload, process.env.JWT_RESET_SECRET, {
    expiresIn: process.env.JWT_RESET_EXPIRES_IN || '1h',
  });

const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_ACCESS_SECRET);

const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);

const verifyResetToken = (token) => jwt.verify(token, process.env.JWT_RESET_SECRET);

/**
 * Build standard JWT payload from user document.
 * Keep minimal — only what's needed for auth checks.
 */
const buildTokenPayload = (user) => ({
  id: user._id,
  email: user.email,
  role: user.role,
});

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyResetToken,
  buildTokenPayload,
};
