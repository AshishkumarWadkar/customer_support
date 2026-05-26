require('dotenv').config();

const app = require('./app');
const { testConnection } = require('./config/database');
const logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;

// Ensure required directories exist
['./uploads', './logs'].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const start = async () => {
  // Test DB connection before accepting traffic
  await testConnection();

  const server = app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Health: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((err) => {
  logger.error('Failed to start server:', err.message);
  process.exit(1);
});
