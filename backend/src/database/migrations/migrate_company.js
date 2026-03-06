// Load environment variables
console.log('🔍 Loading environment variables...');
console.log('Current working directory:', process.cwd());
const envPath = require('path').join(__dirname, '../../../.env');
console.log('Attempting to load .env from:', envPath);

const result = require('dotenv').config({ path: envPath });
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

async function migrateCompanyTables() {
  try {
    console.log('🚀 Starting company knowledge base migration...');
    
    // Connect to database first
    console.log('🔌 Connecting to database...');
    await database.connect();
    console.log('✅ Database connected successfully');

    // Create company_profiles table
    await database.query(`
      CREATE TABLE IF NOT EXISTS company_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        company_name VARCHAR(200) NOT NULL,
        industry VARCHAR(100),
        target_audience TEXT,
        brand_voice TEXT,
        key_messages TEXT[],
        company_description TEXT,
        website_url VARCHAR(500),
        social_media_handles JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ company_profiles table created/verified');

    // Create company_products table
    await database.query(`
      CREATE TABLE IF NOT EXISTS company_products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100),
        description TEXT NOT NULL,
        key_features TEXT[],
        benefits TEXT[],
        pricing_info TEXT,
        target_customers TEXT,
        use_cases TEXT[],
        competitive_advantages TEXT[],
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ company_products table created/verified');

    // Create knowledge_documents table
    await database.query(`
      CREATE TABLE IF NOT EXISTS knowledge_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL,
        title VARCHAR(300) NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        tags TEXT[],
        file_path VARCHAR(500),
        file_size BIGINT,
        file_type VARCHAR(50),
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ knowledge_documents table created/verified');

    // Create agent_knowledge_assignments table
    await database.query(`
      CREATE TABLE IF NOT EXISTS agent_knowledge_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
        company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
        knowledge_scope JSONB DEFAULT '{}',
        custom_instructions TEXT,
        priority_level INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(agent_id, company_profile_id)
      );
    `);
    console.log('✅ agent_knowledge_assignments table created/verified');

    // Create agent_document_assignments table
    await database.query(`
      CREATE TABLE IF NOT EXISTS agent_document_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
        document_id UUID REFERENCES knowledge_documents(id) ON DELETE CASCADE,
        priority_level INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(agent_id, document_id)
      );
    `);
    console.log('✅ agent_document_assignments table created/verified');

    // Create content_templates table
    await database.query(`
      CREATE TABLE IF NOT EXISTS content_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
        template_type VARCHAR(50),
        template_content TEXT NOT NULL,
        variables JSONB DEFAULT '{}',
        usage_scenarios TEXT[],
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ content_templates table created/verified');

    // Create company_content_performance table
    await database.query(`
      CREATE TABLE IF NOT EXISTS company_content_performance (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
        company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
        content_id UUID REFERENCES generated_content(id) ON DELETE CASCADE,
        mentioned_products TEXT[],
        brand_alignment_score DECIMAL(3,2),
        customer_engagement_type VARCHAR(50),
        conversion_tracked BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ company_content_performance table created/verified');

    // Create indexes for performance
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_documents_company ON knowledge_documents(company_profile_id);
    `);
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_documents_type ON knowledge_documents(document_type);
    `);
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_knowledge_active ON agent_knowledge_assignments(agent_id, is_active);
    `);
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_document_assignments_agent ON agent_document_assignments(agent_id);
    `);
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_document_assignments_document ON agent_document_assignments(document_id);
    `);
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_company_content_performance ON company_content_performance(agent_id, company_profile_id);
    `);
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_company_profiles_user ON company_profiles(user_id);
    `);
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_company_products_profile ON company_products(company_profile_id);
    `);
    console.log('✅ Database indexes created/verified');

    // Create uploads directory if it doesn't exist
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '../uploads/company-documents');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Company documents upload directory created');
    }

    console.log('🎉 Company knowledge base migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Always disconnect from database
    try {
      await database.disconnect();
      console.log('🔌 Database connection closed');
    } catch (disconnectError) {
      console.error('Warning: Failed to close database connection:', disconnectError.message);
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateCompanyTables()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateCompanyTables };
