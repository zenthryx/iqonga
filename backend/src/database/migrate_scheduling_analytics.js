const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const database = require('./connection');

async function runMigration() {
  try {
    console.log('🧠 Starting Scheduling Analytics migration...');
    
    // Connect to database
    await database.connect();
    console.log('✅ Database connected');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'migrations', 'create_scheduling_analytics.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute SQL
    await database.query(sql);

    console.log('✅ Scheduling Analytics tables created successfully!');
    console.log('');
    console.log('📋 Tables created:');
    console.log('  - user_scheduling_patterns');
    console.log('  - scheduling_conflicts');
    console.log('  - scheduling_suggestions');
    console.log('  - calendar_health_metrics');
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

