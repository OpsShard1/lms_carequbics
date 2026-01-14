import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testDB() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Connected to:', process.env.DB_HOST, '/', process.env.DB_NAME);

    // Test query
    const [schools] = await connection.query('SELECT * FROM schools');
    console.log('Schools in database:', schools);

    const [students] = await connection.query('SELECT * FROM students');
    console.log('Students in database:', students);

    const [users] = await connection.query('SELECT id, email, first_name, role_id FROM users');
    console.log('Users in database:', users);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDB();
