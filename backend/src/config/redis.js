const Redis = require('ioredis');
const fs = require('fs');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Redis client singleton
//
// Transport security:
//   • When REDIS_TLS=true the connection is wrapped in TLS.
//   • The server certificate is verified against REDIS_TLS_CA (the CA that
//     signed the Redis server cert). Set REDIS_TLS_REJECT_UNAUTHORIZED=false
//     only in local development with self-signed certs — never in production.
//
// Authentication:
//   • REDIS_PASSWORD is passed via the `password` option (AUTH command).
//   • No password is sent when the variable is absent (local dev without AUTH).
//
// Read-only container compatibility:
//   • ioredis does not write to the filesystem, so read_only: true on the
//     backend container is unaffected by this module.
// ---------------------------------------------------------------------------

let client = null;

/**
 * Build the ioredis options object from environment variables.
 * @returns {import('ioredis').RedisOptions}
 */
const buildOptions = () => {
  const opts = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,

    // Reconnection strategy: exponential back-off capped at 30 s
    retryStrategy(times) {
      const delay = Math.min(times * 200, 30_000);
      logger.warn(`[Redis] reconnect attempt #${times} in ${delay}ms`);
      return delay;
    },

    // Surface connection errors as log warnings rather than unhandled rejections
    lazyConnect: false,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  };

  // ── TLS ────────────────────────────────────────────────────────────────────
  if (process.env.REDIS_TLS === 'true') {
    opts.tls = {
      // Reject self-signed / unverified certs in production (default: true)
      rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
    };

    // CA certificate — required when using a private CA (e.g. self-signed in dev)
    if (process.env.REDIS_TLS_CA) {
      opts.tls.ca = fs.readFileSync(process.env.REDIS_TLS_CA);
    }

    // Mutual TLS (mTLS) — optional, only needed if Redis requires client certs
    if (process.env.REDIS_TLS_CERT && process.env.REDIS_TLS_KEY) {
      opts.tls.cert = fs.readFileSync(process.env.REDIS_TLS_CERT);
      opts.tls.key  = fs.readFileSync(process.env.REDIS_TLS_KEY);
    }
  }

  return opts;
};

/**
 * Return the shared Redis client, creating it on first call.
 * @returns {import('ioredis').Redis}
 */
const getRedisClient = () => {
  if (client) return client;

  client = new Redis(buildOptions());

  client.on('connect', () =>
    logger.info('[Redis] connection established')
  );
  client.on('ready', () =>
    logger.info('[Redis] client ready')
  );
  client.on('error', (err) =>
    logger.error(`[Redis] error: ${err.message}`)
  );
  client.on('close', () =>
    logger.warn('[Redis] connection closed')
  );
  client.on('reconnecting', (ms) =>
    logger.warn(`[Redis] reconnecting in ${ms}ms`)
  );

  return client;
};

/**
 * Ping Redis and log the result. Called from server.js alongside testConnection().
 * Throws if the ping fails so the process will not start with a broken cache layer.
 */
const testRedisConnection = async () => {
  const redis = getRedisClient();
  const pong = await redis.ping();
  if (pong !== 'PONG') throw new Error(`Unexpected PING response: ${pong}`);
  logger.info('[Redis] connection verified (PING → PONG)');
};

/**
 * Gracefully close the Redis connection.
 * Call this inside the SIGTERM / SIGINT handler in server.js.
 */
const closeRedisConnection = async () => {
  if (client) {
    await client.quit();
    client = null;
    logger.info('[Redis] connection closed gracefully');
  }
};

module.exports = { getRedisClient, testRedisConnection, closeRedisConnection };
