const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const fs = require('fs').promises;
const database = require('./connection');
const logger = require('../utils/logger');

async function runMigration() {
  try {
    logger.info('Starting AI email columns migration...');

    // Connect to database
    await database.connect();
    logger.info('Database connected');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'migrations', 'add_ai_email_columns.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');

    // Execute migration
    await database.query(sql);

    logger.info('✅ AI email columns migration completed successfully');
    
    // Verify columns
    const result = await database.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'email_messages' 
      AND column_name LIKE 'ai_%'
      ORDER BY column_name;
    `);

    console.log('\n📊 AI Columns Added:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await database.disconnect();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  });

