const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const database = require('./connection');

async function runCalendarMigration() {
  try {
    console.log('🗓️ Starting Calendar tables migration...');
    
    // Connect to database
    await database.connect();
    console.log('✅ Database connected');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'migrations', 'create_calendar_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute SQL
    await database.query(sql);

    console.log('✅ Calendar tables created successfully!');
    console.log('');
    console.log('📋 Tables created:');
    console.log('  - user_calendar_accounts');
    console.log('  - calendar_events');
    console.log('  - calendar_oauth_states');
    console.log('  - ai_meeting_prep');
    console.log('  - calendar_analytics');
    console.log('');
    console.log('🎉 Migration complete!');

    await database.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await database.disconnect();
    process.exit(1);
  }
}

runCalendarMigration();

