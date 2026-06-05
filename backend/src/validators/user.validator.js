const { body } = require('express-validator');

const updateProfileValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2–100 characters'),

  body('phone')
    .optional({ nullable: true })
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit Indian phone number'),

  body('companyName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Company name must be 2–200 characters'),

  body('contactPerson')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact person must be 2–100 characters'),
];

const rejectVendorValidator = [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Rejection reason cannot exceed 500 characters'),
];

module.exports = { updateProfileValidator, rejectVendorValidator };
