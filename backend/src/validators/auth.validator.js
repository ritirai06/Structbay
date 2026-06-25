const { body } = require('express-validator');

// ─── Password rule (reusable) ─────────────────────────────────────────────────
const strongPassword = (field = 'password') =>
  body(field)
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage('Password must contain at least one special character');

// ─── Customer Registration ─────────────────────────────────────────────────────
const registerCustomerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('phone')
    .optional({ nullable: true })
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian phone number'),

  strongPassword('password'),

  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),

  body('companyName').optional({ nullable: true }).trim().isLength({ max: 200 }),
  body('billingAddress').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('gstNumber')
    .optional({ nullable: true })
    .trim()
    .custom((v) => {
      if (!v) return true;
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(String(v).toUpperCase())) {
        throw new Error('Please enter a valid GST number');
      }
      return true;
    }),
];

// ─── Vendor Registration ──────────────────────────────────────────────────────
const registerVendorValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Contact name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian phone number'),

  body('companyName')
    .trim()
    .notEmpty().withMessage('Company name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Company name must be 2–200 characters'),

  body('contactPerson')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Contact person name must be 2–100 characters'),

  body('gstNumber')
    .optional({ nullable: true })
    .trim()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Please enter a valid GST number'),

  body('businessRegNumber')
    .optional()
    .trim()
    .notEmpty().withMessage('Business registration number cannot be empty if provided'),

  strongPassword('password'),

  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
];

// ─── Admin: create vendor (no self-service confirm password) ─────────────────
const adminCreateVendorValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Contact name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian phone number'),

  body('companyName')
    .trim()
    .notEmpty().withMessage('Company name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Company name must be 2–200 characters'),

  body('contactPerson')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Contact person name must be 2–100 characters'),

  body('gstNumber')
    .optional({ nullable: true })
    .trim()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Please enter a valid GST number'),

  body('businessRegNumber')
    .optional()
    .trim()
    .notEmpty().withMessage('Business registration number cannot be empty if provided'),

  strongPassword('password'),
];

// ─── Login ────────────────────────────────────────────────────────────────────
const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('password').notEmpty().withMessage('Password is required'),
];

// ─── Forgot Password ──────────────────────────────────────────────────────────
const forgotPasswordValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
];

// ─── Reset Password ───────────────────────────────────────────────────────────
const resetPasswordValidator = [
  body('token').notEmpty().withMessage('Reset token is required'),
  strongPassword('password'),
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
];

// ─── Change Password ──────────────────────────────────────────────────────────
const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  strongPassword('newPassword'),
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) throw new Error('Passwords do not match');
      return true;
    }),
];

// ─── Update User Status (Admin) ───────────────────────────────────────────────
const updateUserStatusValidator = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'DELETED'])
    .withMessage('Invalid status value'),
];

// ─── Refresh Token ────────────────────────────────────────────────────────────
const refreshTokenValidator = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

// ─── Admin: update vendor ─────────────────────────────────────────────────────
const adminUpdateVendorValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Contact name cannot be empty')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('email')
    .optional()
    .trim()
    .notEmpty().withMessage('Email cannot be empty')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('phone')
    .optional()
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian phone number'),

  body('companyName')
    .optional()
    .trim()
    .notEmpty().withMessage('Company name cannot be empty')
    .isLength({ min: 2, max: 200 }).withMessage('Company name must be 2–200 characters'),

  body('contactPerson')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Contact person name must be 2–100 characters'),

  body('gstNumber')
    .optional({ nullable: true })
    .trim()
    .custom((v) => {
      if (!v || String(v).trim() === '') return true;
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(String(v).trim().toUpperCase())) {
        throw new Error('Please enter a valid GST number');
      }
      return true;
    }),

  body('businessRegNumber')
    .optional({ nullable: true })
    .trim(),

  body('companyAddress')
    .optional({ nullable: true })
    .trim(),

  body('warehouseAddress')
    .optional({ nullable: true })
    .trim(),

  body('contactPersonName')
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Contact person name must be 2–100 characters'),

  body('contactPersonPhone')
    .optional({ nullable: true })
    .trim()
    .custom((v) => {
      if (!v || String(v).trim() === '') return true;
      if (!/^[6-9]\d{9}$/.test(String(v).trim())) {
        throw new Error('Enter a valid 10-digit Indian phone number');
      }
      return true;
    }),

  body('bankDetails.accountHolderName')
    .optional({ nullable: true })
    .trim(),

  body('bankDetails.bankName')
    .optional({ nullable: true })
    .trim(),

  body('bankDetails.accountNumber')
    .optional({ nullable: true })
    .trim(),

  body('bankDetails.ifscCode')
    .optional({ nullable: true })
    .trim()
    .custom((v) => {
      if (!v || String(v).trim() === '') return true;
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(String(v).trim().toUpperCase())) {
        throw new Error('Please enter a valid IFSC code (e.g. SBIN0001234)');
      }
      return true;
    }),

  body('bankDetails.branchName')
    .optional({ nullable: true })
    .trim(),

  body('vendorStatus')
    .optional()
    .isIn(['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED'])
    .withMessage('Invalid vendor approval status'),

  body('status')
    .optional()
    .isIn(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'DELETED'])
    .withMessage('Invalid user status'),
];

module.exports = {
  registerCustomerValidator,
  registerVendorValidator,
  adminCreateVendorValidator,
  adminUpdateVendorValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  updateUserStatusValidator,
  refreshTokenValidator,
};
