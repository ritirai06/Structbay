const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

/**
 * Validate middleware — runs after express-validator chains.
 * Collects validation errors and returns a 422 if any exist.
 *
 * Usage:
 *   router.post('/register', [...validatorRules], validate, registerHandler)
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extracted = errors.array().map(({ path, msg }) => ({ field: path, message: msg }));
    return ApiResponse.error(res, 422, 'Validation failed', extracted);
  }
  next();
};

module.exports = { validate };
