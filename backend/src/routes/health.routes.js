const router = require('express').Router();
const mongoose = require('mongoose');

/**
 * GET /api/v1/health
 * Public health check — used by load balancers, monitoring tools, and Docker healthcheck.
 */
router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'CONNECTED' : dbState === 2 ? 'CONNECTING' : 'DISCONNECTED';

  res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? 'UP' : 'DEGRADED',
    database: dbStatus,
    serverTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
});

module.exports = router;
