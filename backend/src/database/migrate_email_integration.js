const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const fs = require('fs');
const database = require('./connection');
const logger = require('../utils/logger');

async function migrateEmailIntegration() {
    try {
        logger.info('Starting email integration database migration...');

        // Connect to database
        await database.connect();
        logger.info('Database connected successfully');

        // Read the SQL file
        const sqlPath = path.join(__dirname, 'migrations', 'create_email_integration_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute the SQL
        await database.query(sql);
        logger.info('✅ Email integration tables created successfully');

        // Verify tables were created
        const tables = [
            'user_email_accounts',
            'email_messages',
            'email_attachments',
            'email_draft_replies',
            'email_contacts',
            'email_rules',
            'email_analytics',
            'email_oauth_states'
        ];

        for (const table of tables) {
            const result = await database.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                )
            `, [table]);
            
            if (result.rows[0].exists) {
                logger.info(`✅ Table '${table}' exists`);
            } else {
                logger.error(`❌ Table '${table}' was not created`);
            }
        }

        logger.info('✅ Email integration migration completed successfully');

    } catch (error) {
        logger.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await database.disconnect();
        logger.info('Database connection closed');
    }
}

// Run migration
if (require.main === module) {
    migrateEmailIntegration()
        .then(() => {
            console.log('Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = migrateEmailIntegration;

