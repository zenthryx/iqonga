-- Company Knowledge Base Database Schema Extensions
-- This extends the existing schema with company-specific tables

-- Company/Brand profiles
CREATE TABLE IF NOT EXISTS company_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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

-- Product/Service information
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

-- Knowledge base documents
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'faq', 'whitepaper', 'case_study', 'press_release', etc.
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    tags TEXT[],
    file_path VARCHAR(500), -- Server file path for MVP, S3 URL later
    file_size BIGINT, -- File size in bytes
    file_type VARCHAR(50), -- MIME type
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agent-specific knowledge assignments
CREATE TABLE IF NOT EXISTS agent_knowledge_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
    knowledge_scope JSONB DEFAULT '{}', -- What aspects of company info to use
    custom_instructions TEXT,
    priority_level INTEGER DEFAULT 1, -- 1-10, higher = more emphasis
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(agent_id, company_profile_id)
);

-- Content templates for specific scenarios
CREATE TABLE IF NOT EXISTS content_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
    template_type VARCHAR(50), -- 'product_announcement', 'feature_highlight', 'customer_testimonial'
    template_content TEXT NOT NULL,
    variables JSONB DEFAULT '{}', -- Placeholder variables
    usage_scenarios TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance tracking for company-specific content
CREATE TABLE IF NOT EXISTS company_content_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
    content_id UUID REFERENCES generated_content(id) ON DELETE CASCADE,
    mentioned_products TEXT[],
    brand_alignment_score DECIMAL(3,2), -- How well content aligns with brand
    customer_engagement_type VARCHAR(50), -- 'inquiry', 'support', 'sales_interest'
    conversion_tracked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_company ON knowledge_documents(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_type ON knowledge_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_active ON agent_knowledge_assignments(agent_id, is_active);
CREATE INDEX IF NOT EXISTS idx_company_content_performance ON company_content_performance(agent_id, company_profile_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_user ON company_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_company_products_profile ON company_products(company_profile_id);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON company_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
-- INSERT INTO company_profiles (user_id, company_name, industry, company_description) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'Sample Company', 'Technology', 'A sample company for testing purposes');
