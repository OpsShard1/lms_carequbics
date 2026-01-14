import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
  let connection;
  
  try {
    // Connect without database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('🔌 Connected to MySQL server');

    // Create database if not exists
    const dbName = process.env.DB_NAME || 'lms_db';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);
    console.log(`📁 Using database: ${dbName}`);

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = schema.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.query(statement);
        } catch (err) {
          // Ignore certain errors like "table doesn't exist" for DROP statements
          if (!err.message.includes('Unknown table')) {
            console.warn('⚠️ Statement warning:', err.message.substring(0, 100));
          }
        }
      }
    }

    console.log('📋 Schema executed successfully');

    // Create default admin user with proper hashed password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await connection.query(`
      UPDATE users SET password = ? WHERE email = 'admin@lms.com'
    `, [hashedPassword]);

    console.log('👤 Default admin user created/updated');
    console.log('   Email: admin@lms.com');
    console.log('   Password: admin123');

    console.log('\n✅ Database initialization complete!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initializeDatabase();
