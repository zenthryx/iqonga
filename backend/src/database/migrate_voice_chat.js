const database = require('./connection');
const fs = require('fs');
const path = require('path');

async function migrateVoiceChatTables() {
  try {
    console.log('🔄 Starting voice chat tables migration...');
    
    // Read the migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'create_voice_chat_tables_v2.sql'), 
      'utf8'
    );
    
    // Execute the migration
    await database.query(migrationSQL);
    
    console.log('✅ Voice chat tables migration completed successfully');
    
    // Verify tables were created
    const tables = await database.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('conversations', 'conversation_messages', 'voice_settings')
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:', tables.rows.map(row => row.table_name));
    
    return true;
  } catch (error) {
    console.error('❌ Voice chat migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateVoiceChatTables()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateVoiceChatTables };
