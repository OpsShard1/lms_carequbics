require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    console.log('✅ Connected to database successfully!\n');

    // Read the migration SQL file
    const sqlFile = path.join(__dirname, 'timetable-migration.sql');
    console.log('📄 Reading migration file...');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Remove comments and split by semicolons
    const statements = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.includes('DROP TABLE')) {
        const tableName = statement.match(/DROP TABLE IF EXISTS (\w+)/)?.[1];
        console.log(`🗑️  Dropping table: ${tableName}...`);
      } else if (statement.includes('CREATE TABLE')) {
        const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/)?.[1];
        console.log(`✨ Creating table: ${tableName}...`);
      }

      try {
        await connection.query(statement);
        console.log('   ✅ Success\n');
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
        throw error;
      }
    }

    console.log('🎉 Migration completed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying new tables...');
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'school_timetables'
    `);
    const [tables2] = await connection.query(`
      SHOW TABLES LIKE 'timetable_periods'
    `);
    const [tables3] = await connection.query(`
      SHOW TABLES LIKE 'timetable_days'
    `);
    const [tables4] = await connection.query(`
      SHOW TABLES LIKE 'timetable_class_schedule'
    `);

    const allTables = [...tables, ...tables2, ...tables3, ...tables4];
    console.log(`✅ Found ${allTables.length} new tables:`);
    allTables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });

    console.log('\n✨ All done! You can now:');
    console.log('   1. Run: npm run seed:timetable (to add sample data)');
    console.log('   2. Test the new timetable system in your browser');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the migration
console.log('🚀 Starting Timetable Migration...\n');
console.log('=' .repeat(50));
console.log('\n');

runMigration()
  .then(() => {
    console.log('\n' + '='.repeat(50));
    console.log('✅ MIGRATION SUCCESSFUL!');
    console.log('='.repeat(50) + '\n');
    process.exit(0);
  })
  .catch((error) => {
    console.log('\n' + '='.repeat(50));
    console.log('❌ MIGRATION FAILED!');
    console.log('='.repeat(50) + '\n');
    process.exit(1);
  });
