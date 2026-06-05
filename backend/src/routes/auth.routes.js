const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  registerCustomerValidator,
  registerVendorValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  refreshTokenValidator,
} = require('../validators/auth.validator');

// ─── Public Routes ─────────────────────────────────────────────────────────

// Registration
router.post('/register/customer', registerCustomerValidator, validate, authController.registerCustomer);
router.post('/register/vendor', registerVendorValidator, validate, authController.registerVendor);

// Login / Token
router.post('/login', loginValidator, validate, authController.login);
router.post('/refresh-token', refreshTokenValidator, validate, authController.refreshToken);

// Email Verification
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

// Password Management
router.post('/forgot-password', forgotPasswordValidator, validate, authController.forgotPassword);
router.patch('/reset-password', resetPasswordValidator, validate, authController.resetPassword);

// ─── Protected Routes ──────────────────────────────────────────────────────

router.get('/me', protect, authController.getMe);
router.post('/logout', protect, authController.logout);
router.post('/logout-all', protect, authController.logoutAll);

module.exports = router;
