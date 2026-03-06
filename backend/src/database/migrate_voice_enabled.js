require('dotenv').config();
const database = require('./connection');
const fs = require('fs');
const path = require('path');

async function addVoiceEnabledColumn() {
  try {
    console.log('🔄 Connecting to database...');
    await database.connect();
    console.log('✅ Database connected');

    console.log('🔄 Adding voice_enabled column to widget_settings...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_voice_enabled_to_widget_settings.sql'),
      'utf8'
    );

    await database.query(migrationSQL);

    console.log('✅ Voice enabled column added successfully');

    // Check the results
    const result = await database.query(`
      SELECT agent_id, voice_enabled 
      FROM widget_settings 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log('📋 Sample widget settings with voice_enabled:');
    result.rows.forEach(row => {
      console.log(`  Agent ${row.agent_id}: voice_enabled = ${row.voice_enabled}`);
    });

    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await database.disconnect();
  }
}

if (require.main === module) {
  addVoiceEnabledColumn().catch(error => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = addVoiceEnabledColumn;
