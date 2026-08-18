/**
 * Automated MySQL Database Migration Runner
 * OceanForge / Blox Fruits Account Manager CI/CD Pipeline
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigrations() {
  console.log('🚀 Starting DevOps Automated Database Migration...');

  const dbConfig = {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    multipleStatements: true,
  };

  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log(`✅ Connected to MySQL Database Server at ${dbConfig.host}:${dbConfig.port}`);

    const sqlFilePath = path.join(__dirname, 'init_mysql.sql');
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`Migration SQL file not found at ${sqlFilePath}`);
    }

    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('📄 Executing init_mysql.sql migration script...');

    await connection.query(sqlScript);
    console.log('🎉 Database Schema & Tables initialized successfully!');

    // Verify tables created
    const [rows] = await connection.query('SHOW TABLES FROM `bloxfruits_db`');
    console.log('📊 Active Tables in `bloxfruits_db`:');
    rows.forEach((row) => console.log(`   - ${Object.values(row)[0]}`));

    await connection.end();
    console.log('🔒 Connection closed safely.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database Migration Failed:', err.message);
    process.exit(1);
  }
}

runMigrations();
