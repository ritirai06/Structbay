const logger = require('../config/logger');

/**
 * HTTP request logger middleware.
 * Logs method, URL, status, response time, and IP on each response.
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - ${req.ip}`
    );
  });

  next();
};

module.exports = { requestLogger };
