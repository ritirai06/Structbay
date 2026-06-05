/**
 * Standard API Response Formatter
 * All API responses follow the same shape:
 * { success, message, data, pagination? }
 */

class ApiResponse {
  /**
   * Send a success response
   * @param {object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Human-readable message
   * @param {any} data - Response payload
   * @param {object} pagination - Optional pagination metadata
   */
  static success(res, statusCode = 200, message = 'Success', data = null, pagination = null) {
    const response = { success: true, message };
    if (data !== null) response.data = data;
    if (pagination) response.pagination = pagination;
    return res.status(statusCode).json(response);
  }

  /**
   * Send an error response
   */
  static error(res, statusCode = 500, message = 'Internal Server Error', errors = null) {
    const response = { success: false, message };
    if (errors) response.errors = errors;
    return res.status(statusCode).json(response);
  }

  // Convenience shorthands
  static created(res, message, data) {
    return ApiResponse.success(res, 201, message, data);
  }

  static badRequest(res, message, errors = null) {
    return ApiResponse.error(res, 400, message, errors);
  }

  static unauthorized(res, message = 'Unauthorized. Please log in.') {
    return ApiResponse.error(res, 401, message);
  }

  static forbidden(res, message = 'Access denied. Insufficient permissions.') {
    return ApiResponse.error(res, 403, message);
  }

  static notFound(res, message = 'Resource not found.') {
    return ApiResponse.error(res, 404, message);
  }

  static conflict(res, message = 'Resource already exists.') {
    return ApiResponse.error(res, 409, message);
  }
}

module.exports = ApiResponse;
