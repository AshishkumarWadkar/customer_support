require('dotenv').config();

const http = require('http');
const app = require('./app');
const { testConnection } = require('./config/database');
const { testRedisConnection, closeRedisConnection } = require('./config/redis');
const { initSocket } = require('./config/socket');
const { startSlaPoller } = require('./jobs/slaPoller');
const logger = require('./utils/logger');
const fs = require('fs');

const PORT = process.env.PORT || 5000;

// Ensure required directories exist
['./uploads', './logs'].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const start = async () => {
  // Test DB and Redis connections before accepting traffic
  await testConnection();
  await testRedisConnection();

  // Create HTTP server from Express app so Socket.IO can share the same port
  const server = http.createServer(app);

  // Attach Socket.IO to the HTTP server
  initSocket(server);

  // Start SLA breach-polling job (runs every 60 s)
  startSlaPoller();

  server.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Health: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      logger.info('HTTP server closed');
      await closeRedisConnection();
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
