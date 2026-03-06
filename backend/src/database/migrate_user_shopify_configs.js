#!/usr/bin/env node

/**
 * Migration script to create user Shopify OAuth configuration tables
 * Run this script to add per-user Shopify integration support
 */

const path = require('path');
require('dotenv').config({ path: '../../.env' });

// Debug: Check if environment variables are loaded
console.log('🔍 Debug - Environment check:');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL value:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('Current working directory:', process.cwd());
console.log('Script location:', __dirname);
console.log('Looking for .env at:', path.resolve(__dirname, '../../.env'));
console.log('');

const fs = require('fs');
const database = require('./connection');
const logger = require('../utils/logger');

async function migrateUserShopifyConfigs() {
    try {
        console.log('🔄 Starting user Shopify configs migration...\n');
        
        await database.connect();
        console.log('✅ Database connected successfully\n');

        // Read and execute the migration file
        const migrationPath = path.join(__dirname, 'migrations', 'create_user_shopify_configs.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('🔐 Creating user Shopify OAuth configuration tables...');
        await database.query(migrationSQL);
        console.log('✅ User Shopify configs tables created successfully\n');
        
        // Verify tables were created
        const tablesCheck = await database.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'user_shopify_%'
            ORDER BY table_name
        `);

        console.log('🔍 Verification - User Shopify tables created:');
        tablesCheck.rows.forEach(row => {
            console.log(`✅ ${row.table_name}`);
        });
        
        console.log('\n🎉 User Shopify OAuth migration completed successfully!');
        console.log('\n📝 Next Steps:');
        console.log('1. Update Shopify app configuration with OAuth URLs');
        console.log('2. Test OAuth flow with Shopify test store');
        console.log('3. Verify user-specific data isolation');
        console.log('4. Test AI agent integration with user Shopify data');

    } catch (error) {
        logger.error('Migration failed:', error);
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await database.disconnect();
        console.log('\n✅ Database disconnected');
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    migrateUserShopifyConfigs();
}

module.exports = { migrateUserShopifyConfigs };
