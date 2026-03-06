const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const database = require('./connection');

async function runMigration() {
  try {
    console.log('🤖 Starting AI Meeting Prep table migration...');
    
    // Connect to database
    await database.connect();
    console.log('✅ Database connected');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'migrations', 'create_ai_meeting_prep_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute SQL
    await database.query(sql);

    console.log('✅ AI Meeting Prep table created successfully!');
    console.log('');
    console.log('📋 Table created:');
    console.log('  - ai_meeting_prep');
    console.log('');
    console.log('🎉 Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await database.disconnect();
    console.log('info: ✅ PostgreSQL disconnected');
  }
}

runMigration();

