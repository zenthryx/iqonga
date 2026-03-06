#!/usr/bin/env node

/**
 * Migration script to create company_team and company_achievements tables
 * Run this script to add the missing tables for enhanced AI content generation
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const database = require('./connection');
const logger = require('../utils/logger');

async function runMigration() {
  try {
    console.log('🚀 Starting company team and achievements tables migration...\n');
    
    await database.connect();
    console.log('✅ Database connected successfully\n');

    // Read and execute company_team migration
    const teamMigrationPath = path.join(__dirname, 'migrations', 'create_company_team_table.sql');
    const teamMigrationSQL = fs.readFileSync(teamMigrationPath, 'utf8');
    
    console.log('📋 Creating company_team table...');
    await database.query(teamMigrationSQL);
    console.log('✅ company_team table created successfully\n');

    // Read and execute company_achievements migration
    const achievementsMigrationPath = path.join(__dirname, 'migrations', 'create_company_achievements_table.sql');
    const achievementsMigrationSQL = fs.readFileSync(achievementsMigrationPath, 'utf8');
    
    console.log('📋 Creating company_achievements table...');
    await database.query(achievementsMigrationSQL);
    console.log('✅ company_achievements table created successfully\n');

    // Verify tables were created
    const tablesCheck = await database.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('company_team', 'company_achievements')
      ORDER BY table_name
    `);

    console.log('🔍 Verification - Tables created:');
    tablesCheck.rows.forEach(row => {
      console.log(`✅ ${row.table_name}`);
    });

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. Add team members to company_team table for each company');
    console.log('2. Add achievements to company_achievements table for each company');
    console.log('3. Test AI content generation with the new data');
    console.log('4. Run the test script: node scripts/test_universal_agent_content.js');

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
