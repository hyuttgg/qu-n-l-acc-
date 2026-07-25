const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'bloxfruits_db',
  port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

async function checkMySQLConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database Connected successfully.');
    connection.release();
    return true;
  } catch (error) {
    console.warn(`⚠️ MySQL Connection Warning: ${error.message}. (Server will proceed with fallback/Mongo)`);
    return false;
  }
}

module.exports = {
  pool,
  checkMySQLConnection,
};
