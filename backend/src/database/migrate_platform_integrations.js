#!/usr/bin/env node

/**
 * Migration script to create Shopify and HubSpot integration tables
 * Run this script to add e-commerce and CRM platform support
 */

require('dotenv').config({ path: '../../.env' });
const fs = require('fs');
const path = require('path');
const database = require('./connection');
const logger = require('../utils/logger');

async function runMigration() {
  try {
    console.log('🚀 Starting Shopify and HubSpot integration tables migration...\n');
    
    await database.connect();
    console.log('✅ Database connected successfully\n');

    // Read and execute Shopify migration
    const shopifyMigrationPath = path.join(__dirname, 'migrations', 'create_shopify_tables.sql');
    const shopifyMigrationSQL = fs.readFileSync(shopifyMigrationPath, 'utf8');
    
    console.log('🛍️ Creating Shopify integration tables...');
    await database.query(shopifyMigrationSQL);
    console.log('✅ Shopify tables created successfully\n');

    // Read and execute HubSpot migration
    const hubspotMigrationPath = path.join(__dirname, 'migrations', 'create_hubspot_tables.sql');
    const hubspotMigrationSQL = fs.readFileSync(hubspotMigrationPath, 'utf8');
    
    console.log('📊 Creating HubSpot integration tables...');
    await database.query(hubspotMigrationSQL);
    console.log('✅ HubSpot tables created successfully\n');

    // Verify tables were created
    const tablesCheck = await database.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE 'shopify_%' OR table_name LIKE 'hubspot_%')
      ORDER BY table_name
    `);

    console.log('🔍 Verification - Integration tables created:');
    const shopifyTables = tablesCheck.rows.filter(row => row.table_name.startsWith('shopify_'));
    const hubspotTables = tablesCheck.rows.filter(row => row.table_name.startsWith('hubspot_'));
    
    console.log('\n🛍️ Shopify Tables:');
    shopifyTables.forEach(row => {
      console.log(`✅ ${row.table_name}`);
    });
    
    console.log('\n📊 HubSpot Tables:');
    hubspotTables.forEach(row => {
      console.log(`✅ ${row.table_name}`);
    });

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. Create backend services for Shopify API integration');
    console.log('2. Create backend services for HubSpot API integration');
    console.log('3. Enhance AIContentService to leverage e-commerce and CRM data');
    console.log('4. Create frontend components for platform management');
    console.log('5. Test integrations with AI content generation');

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
  runMigration();
}

module.exports = { runMigration };
