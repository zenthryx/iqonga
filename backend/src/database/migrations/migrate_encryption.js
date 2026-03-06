// Load environment variables
console.log('🔍 Loading environment variables...');
console.log('Current working directory:', process.cwd());
console.log('Attempting to load .env from:', require('path').resolve('../../.env'));

const result = require('dotenv').config({ path: '../../.env' });
if (result.error) {
  console.error('❌ Failed to load .env file:', result.error);
} else {
  console.log('✅ .env file loaded successfully');
  console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
  if (process.env.DATABASE_URL) {
    console.log('DATABASE_URL preview:', process.env.DATABASE_URL.substring(0, 20) + '...');
  }
}

const database = require('../connection');
const { encrypt, decrypt } = require('../../utils/encryption');

async function migrateEncryption() {
  try {
    console.log('🔐 Starting encryption migration...');
    
    // Connect to database
    console.log('⏳ Connecting to database...');
    await database.connect();
    console.log('✅ Database connected successfully');
    
    // Get all platform connections with tokens
    const result = await database.query(`
      SELECT id, user_id, platform, access_token, refresh_token, connection_status
      FROM platform_connections 
      WHERE (access_token IS NOT NULL OR refresh_token IS NOT NULL)
        AND connection_status = 'active'
    `);
    
    console.log(`Found ${result.rows.length} platform connections to migrate`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const connection of result.rows) {
      try {
        console.log(`\n📱 Migrating ${connection.platform} connection for user ${connection.user_id}`);
        
        let newAccessToken = null;
        let newRefreshToken = null;
        
        // Migrate access token if it exists
        if (connection.access_token) {
          try {
            const decryptedAccessToken = decrypt(connection.access_token);
            newAccessToken = encrypt(decryptedAccessToken);
            console.log(`  ✅ Access token migrated (${connection.access_token.length} → ${newAccessToken.length} chars)`);
          } catch (error) {
            console.log(`  ❌ Access token decryption failed: ${error.message}`);
            // Keep the original if decryption fails
            newAccessToken = connection.access_token;
          }
        }
        
        // Migrate refresh token if it exists
        if (connection.refresh_token) {
          try {
            const decryptedRefreshToken = decrypt(connection.refresh_token);
            newRefreshToken = encrypt(decryptedRefreshToken);
            console.log(`  ✅ Refresh token migrated (${connection.refresh_token.length} → ${newRefreshToken.length} chars)`);
          } catch (error) {
            console.log(`  ❌ Refresh token decryption failed: ${error.message}`);
            // Keep the original if decryption fails
            newRefreshToken = connection.refresh_token;
          }
        }
        
        // Update the database with new encrypted tokens
        await database.query(`
          UPDATE platform_connections 
          SET access_token = $1, refresh_token = $2, updated_at = NOW()
          WHERE id = $3
        `, [newAccessToken, newRefreshToken, connection.id]);
        
        migratedCount++;
        console.log(`  ✅ Connection ${connection.id} updated successfully`);
        
      } catch (error) {
        console.error(`  ❌ Failed to migrate connection ${connection.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Successfully migrated: ${migratedCount} connections`);
    if (errorCount > 0) {
      console.log(`❌ Errors encountered: ${errorCount} connections`);
    }
    
    // Verify the migration
    const verifyResult = await database.query(`
      SELECT 
        platform,
        COUNT(*) as total_connections,
        COUNT(CASE WHEN access_token LIKE '%:%' THEN 1 END) as new_format_access,
        COUNT(CASE WHEN refresh_token LIKE '%:%' THEN 1 END) as new_format_refresh
      FROM platform_connections 
      WHERE connection_status = 'active'
      GROUP BY platform
    `);
    
    console.log('\n📊 Migration verification:');
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.platform}: ${row.total_connections} connections`);
      console.log(`    Access tokens: ${row.new_format_access}/${row.total_connections} in new format`);
      console.log(`    Refresh tokens: ${row.new_format_refresh}/${row.total_connections} in new format`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateEncryption()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateEncryption };
