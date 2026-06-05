/**
 * Async Handler Wrapper
 * Wraps async route handlers to avoid repetitive try/catch blocks.
 * Passes errors to Express global error handler automatically.
 *
 * Usage:
 *   router.get('/route', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
