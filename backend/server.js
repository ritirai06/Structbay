require('dotenv').config();

const app = require('./app');
const connectDB = require('./src/config/db');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ─── Unhandled Promise Rejections ─────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

// ─── Uncaught Exceptions ──────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(`🚀 Structbay API started`);
    logger.info(`   Mode        : ${NODE_ENV}`);
    logger.info(`   Port        : ${PORT}`);
    logger.info(`   Health      : http://localhost:${PORT}/api/v1/health`);
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────
  const shutdown = (signal) => {
    logger.info(`${signal} received. Closing server gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
};

startServer();
