const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lms_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // Start keep-alive after 10 seconds
  connectTimeout: 20000, // 20 seconds to establish connection
  acquireTimeout: 20000, // 20 seconds to acquire connection from pool
  timeout: 60000, // 60 seconds query timeout
  maxIdle: 10, // Maximum idle connections
  idleTimeout: 60000, // Close idle connections after 60 seconds
  // Reconnect on connection errors
  reconnect: true,
  // Additional options for stability
  multipleStatements: false,
  dateStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: true
});

// Test connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Handle pool errors
pool.on('connection', (connection) => {
  console.log('New database connection established');
  
  // Set session variables for better stability
  connection.query("SET SESSION wait_timeout = 28800"); // 8 hours
  connection.query("SET SESSION interactive_timeout = 28800"); // 8 hours
});

pool.on('acquire', (connection) => {
  console.log('Connection %d acquired', connection.threadId);
});

pool.on('release', (connection) => {
  console.log('Connection %d released', connection.threadId);
});

pool.on('enqueue', () => {
  console.log('Waiting for available connection slot');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connection pool...');
  await pool.end();
  process.exit(0);
});

module.exports = pool;
module.exports.testConnection = testConnection;
