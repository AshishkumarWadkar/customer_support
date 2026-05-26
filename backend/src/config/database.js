const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

let pool;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'support_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: 'Z',
      charset: 'utf8mb4',
    });
  }
  return pool;
};

const testConnection = async () => {
  try {
    const conn = await getPool().getConnection();
    await conn.ping();
    conn.release();
    logger.info('Database connection established successfully');
    return true;
  } catch (err) {
    logger.error('Database connection failed:', err.message);
    throw err;
  }
};

module.exports = { getPool, testConnection };
