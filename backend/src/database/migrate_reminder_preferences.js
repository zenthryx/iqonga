const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const database = require('./connection');

async function runMigration() {
  try {
    console.log('⏰ Starting Meeting Reminder Preferences migration...');
    
    // Connect to database
    await database.connect();
    console.log('✅ Database connected');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'migrations', 'create_reminder_preferences.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute SQL
    await database.query(sql);

    console.log('✅ Meeting Reminder Preferences tables created successfully!');
    console.log('');
    console.log('📋 Tables created:');
    console.log('  - meeting_reminder_preferences');
    console.log('  - meeting_reminders_sent');
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

