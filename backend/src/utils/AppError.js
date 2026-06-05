/**
 * AppError — Custom operational error class.
 * Extends native Error with statusCode and isOperational flag.
 * Used throughout controllers/services to trigger the global error handler.
 *
 * Usage:
 *   throw new AppError('Category not found', 404);
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = true; // Distinguish from unexpected programmer errors
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
