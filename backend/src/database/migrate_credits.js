const fs = require('fs');
const path = require('path');
const database = require('../database/connection');

async function migrateCredits() {
  try {
    console.log('🚀 Starting credit system migration...');
    
    // Connect to database
    await database.connect();
    console.log('✅ Database connected');

    // Read SQL migration file
    const sqlPath = path.join(__dirname, 'migrations', 'create_user_credits_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute migration
    await database.query(sqlContent);
    console.log('✅ Credit system tables created successfully');

    // Create credit accounts for existing users
    console.log('🔄 Creating credit accounts for existing users...');
    const usersResult = await database.query('SELECT id FROM users');
    
    for (const user of usersResult.rows) {
      try {
        // Check if credit account already exists
        const existingAccount = await database.query(
          'SELECT id FROM user_credits WHERE user_id = $1',
          [user.id]
        );

        if (existingAccount.rows.length === 0) {
          // Create credit account
          await database.query(`
            INSERT INTO user_credits (user_id, credit_balance, total_purchased, total_used)
            VALUES ($1, 0, 0, 0)
          `, [user.id]);
          console.log(`✅ Created credit account for user ${user.id}`);
        } else {
          console.log(`ℹ️  Credit account already exists for user ${user.id}`);
        }
      } catch (error) {
        console.error(`❌ Error creating credit account for user ${user.id}:`, error.message);
      }
    }

    console.log('🎉 Credit system migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await database.disconnect();
    console.log('🔌 Database disconnected');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateCredits()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateCredits;
