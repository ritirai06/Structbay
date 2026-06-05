const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
};

const MESSAGES = {
  SERVER_ERROR:    'Something went wrong. Please try again later.',
  NOT_FOUND:       'Resource not found.',
  UNAUTHORIZED:    'Unauthorized. Please log in.',
  FORBIDDEN:       'Access denied. Insufficient permissions.',
  VALIDATION_FAIL: 'Validation failed.',
  CREATED:         'Resource created successfully.',
  UPDATED:         'Resource updated successfully.',
  DELETED:         'Resource deleted successfully.',
};

module.exports = { HTTP_STATUS, MESSAGES };
