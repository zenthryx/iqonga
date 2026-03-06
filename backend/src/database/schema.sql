-- SocialAI Suite Database Schema
-- Complete schema including Telegram integration and Agent Engagement System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users table with Web3 integration
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(44) UNIQUE, -- Solana wallet
    email VARCHAR(255), -- Optional for Web2 migration
    username VARCHAR(50) UNIQUE,
    subscription_tier VARCHAR(20) DEFAULT 'basic',
    token_balance BIGINT DEFAULT 0,
    reputation_score INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- AI Agents (NFT-backed personalities)
CREATE TABLE ai_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    nft_mint_address VARCHAR(44) UNIQUE, -- Solana NFT mint
    name VARCHAR(100) NOT NULL,
    description TEXT, -- Agent description
    avatar_url TEXT, -- Agent avatar image URL
    
    -- Personality Configuration
    personality_type VARCHAR(50) NOT NULL, -- 'witty_troll', 'tech_sage', etc.
    voice_tone VARCHAR(50) NOT NULL,
    humor_style VARCHAR(50),
    intelligence_level VARCHAR(50),
    controversy_comfort INTEGER DEFAULT 30, -- 0-100 scale
    
    -- Platform Settings
    platforms TEXT[] DEFAULT '{"twitter"}',
    target_topics TEXT[] DEFAULT '{}',
    avoid_topics TEXT[] DEFAULT '{}',
    behavioral_guidelines TEXT[],
    
    -- Engagement Settings (NEW)
    auto_reply_enabled BOOLEAN DEFAULT false,
    reply_frequency VARCHAR(20) DEFAULT 'moderate', -- 'conservative', 'moderate', 'aggressive'
    min_engagement_threshold INTEGER DEFAULT 50, -- Minimum likes to engage with
    max_replies_per_day INTEGER DEFAULT 20,
    reply_to_mentions BOOLEAN DEFAULT true,
    reply_to_replies BOOLEAN DEFAULT true,
    
    -- Performance Metrics
    total_posts_generated INTEGER DEFAULT 0,
    total_replies_sent INTEGER DEFAULT 0,
    average_engagement_rate DECIMAL(5,2) DEFAULT 0,
    viral_posts_count INTEGER DEFAULT 0,
    
    -- NFT Evolution
    evolution_stage VARCHAR(20) DEFAULT 'novice',
    achievements TEXT[] DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent Engagements (NEW) - Track all agent interactions
CREATE TABLE agent_engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    tweet_id VARCHAR(100) NOT NULL, -- Twitter tweet ID
    reply_content TEXT, -- Content of the reply
    engagement_type VARCHAR(50) NOT NULL, -- 'topic_reply', 'mention_reply', 'reply_to_reply'
    engagement_score DECIMAL(3,2) DEFAULT 0, -- 0.0 to 1.0 based on priority
    engagement_metrics JSONB DEFAULT '{}', -- Store likes, retweets, etc.
    conversation_context JSONB DEFAULT '{}', -- Store conversation flow
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_agent_engagements_agent_id (agent_id),
    INDEX idx_agent_engagements_tweet_id (tweet_id),
    INDEX idx_agent_engagements_type (engagement_type),
    INDEX idx_agent_engagements_created (created_at)
);

-- OAuth Temporary Tokens (for authentication flows)
CREATE TABLE oauth_temp_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL, -- 'twitter', 'telegram'
    oauth_token TEXT NOT NULL,
    oauth_token_secret TEXT, -- For OAuth 1.0a compatibility
    code_verifier TEXT, -- For OAuth 2.0 PKCE
    state TEXT, -- For OAuth 2.0 CSRF protection
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- Social Platform Connections
CREATE TABLE platform_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL, -- 'twitter', 'telegram'
    platform_user_id VARCHAR(100), -- Platform-specific user ID
    username VARCHAR(100) NOT NULL,
    display_name VARCHAR(200), -- User display name on platform
    profile_image_url TEXT, -- URL to user profile image
    access_token TEXT, -- Encrypted
    refresh_token TEXT, -- Encrypted
    token_expires_at TIMESTAMP,
    connection_status VARCHAR(20) DEFAULT 'active',
    follower_count INTEGER DEFAULT 0, -- Number of followers on platform
    last_sync TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- Telegram Groups and Chats
CREATE TABLE telegram_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    chat_id BIGINT NOT NULL, -- Telegram chat ID
    chat_type VARCHAR(20) NOT NULL, -- 'group', 'supergroup', 'channel'
    chat_title VARCHAR(255),
    chat_description TEXT,
    member_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    auto_reply_enabled BOOLEAN DEFAULT false,
    reply_frequency VARCHAR(20) DEFAULT 'moderate',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Generated Content
CREATE TABLE generated_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    content_type VARCHAR(20) NOT NULL, -- 'post', 'reply', 'thread'
    content_text TEXT NOT NULL,
    media_urls TEXT[] DEFAULT '{}',
    hashtags TEXT[] DEFAULT '{}',
    
    -- Parent content (for replies)
    parent_post_id VARCHAR(100), -- Platform-specific ID
    parent_author VARCHAR(100),
    
    -- Publishing
    scheduled_for TIMESTAMP,
    published_at TIMESTAMP,
    platform_post_id VARCHAR(100), -- ID from platform
    
    -- Performance
    likes_count INTEGER DEFAULT 0,
    retweets_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    is_viral BOOLEAN DEFAULT false, -- >1000 engagements
    
    -- Metadata
    ai_model_used VARCHAR(50),
    generation_prompt TEXT,
    ipfs_hash VARCHAR(100), -- Decentralized storage
    
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Company/Brand profiles
CREATE TABLE company_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    legal_name VARCHAR(200),
    company_name VARCHAR(200) NOT NULL,
    business_type VARCHAR(100),
    registration_number VARCHAR(100),
    industry VARCHAR(100),
    time_zone VARCHAR(100),
    target_audience TEXT,
    brand_voice TEXT,
    key_messages TEXT[],
    company_description TEXT,
    website_url VARCHAR(500),
    headquarters_address JSONB DEFAULT '{}'::jsonb,
    support_email VARCHAR(200),
    support_phone VARCHAR(50),
    whatsapp_number VARCHAR(50),
    support_hours TEXT,
    primary_currency_code VARCHAR(10),
    primary_currency_symbol VARCHAR(10),
    accepted_currencies TEXT[] DEFAULT '{}'::text[],
    preferred_languages TEXT[] DEFAULT '{}'::text[],
    shipping_regions TEXT[] DEFAULT '{}'::text[],
    operating_countries TEXT[] DEFAULT '{}'::text[],
    tax_policy TEXT,
    vat_number VARCHAR(100),
    return_policy TEXT,
    refund_policy TEXT,
    warranty_policy TEXT,
    business_hours JSONB DEFAULT '{}'::jsonb,
    preferred_music_genre VARCHAR(100),
    preferred_voice_type VARCHAR(100),
    preferred_music_language VARCHAR(20),
    social_media_handles JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE company_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
    location_name VARCHAR(200) NOT NULL,
    location_type VARCHAR(50),
    address JSONB DEFAULT '{}'::jsonb,
    contact_email VARCHAR(200),
    contact_phone VARCHAR(50),
    timezone VARCHAR(100),
    hours JSONB DEFAULT '{}'::jsonb,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE company_faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}'::text[],
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Product/Service information
CREATE TABLE company_products (
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
CREATE TABLE knowledge_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'faq', 'whitepaper', 'case_study', etc.
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    tags TEXT[],
    embedding_vector VECTOR(1536), -- For semantic search
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agent-specific knowledge assignments
CREATE TABLE agent_knowledge_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
    knowledge_scope JSONB DEFAULT '{}', -- What aspects of company info to use
    custom_instructions TEXT,
    priority_level INTEGER DEFAULT 1, -- 1-10, higher = more emphasis
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- NFT Metadata (synced from blockchain)
CREATE TABLE nft_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mint_address VARCHAR(44) UNIQUE NOT NULL,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    
    -- Standard NFT metadata
    name VARCHAR(200),
    description TEXT,
    image_url TEXT,
    animation_url TEXT,
    external_url TEXT,
    
    -- Traits and attributes
    traits JSONB DEFAULT '{}',
    rarity_score DECIMAL(8,2),
    rarity_rank INTEGER,
    
    -- Dynamic metadata
    performance_traits JSONB DEFAULT '{}',
    evolution_history JSONB DEFAULT '[]',
    
    -- Blockchain data
    owner_address VARCHAR(44),
    creator_royalty INTEGER DEFAULT 500, -- 5%
    is_mutable BOOLEAN DEFAULT true,
    
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Token Transactions
CREATE TABLE token_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    transaction_type VARCHAR(30) NOT NULL, -- 'earn', 'spend', 'stake', 'transfer'
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    
    -- Context
    related_agent_id UUID REFERENCES ai_agents(id),
    related_content_id UUID REFERENCES generated_content(id),
    platform VARCHAR(20),
    
    -- Transaction details
    transaction_hash VARCHAR(128), -- Solana transaction signature
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance Analytics
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    platform VARCHAR(20) NOT NULL,
    
    -- Content metrics
    posts_generated INTEGER DEFAULT 0,
    replies_sent INTEGER DEFAULT 0,
    total_engagements INTEGER DEFAULT 0,
    average_engagement_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Token metrics
    tokens_earned INTEGER DEFAULT 0,
    tokens_spent INTEGER DEFAULT 0,
    
    -- Performance scores
    content_quality_score DECIMAL(3,2) DEFAULT 0,
    audience_growth INTEGER DEFAULT 0,
    viral_coefficient DECIMAL(4,3) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(agent_id, date, platform)
);

-- Engagement Analytics (NEW) - Track engagement performance over time
CREATE TABLE engagement_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Engagement counts by type
    topic_replies INTEGER DEFAULT 0,
    mention_replies INTEGER DEFAULT 0,
    reply_to_replies INTEGER DEFAULT 0,
    
    -- Engagement quality metrics
    avg_engagement_score DECIMAL(3,2) DEFAULT 0,
    high_priority_engagements INTEGER DEFAULT 0,
    successful_conversations INTEGER DEFAULT 0,
    
    -- Response time metrics
    avg_response_time_minutes INTEGER DEFAULT 0,
    response_time_distribution JSONB DEFAULT '{}',
    
    -- Conversation metrics
    conversations_started INTEGER DEFAULT 0,
    conversations_continued INTEGER DEFAULT 0,
    avg_conversation_length INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(agent_id, date)
);

-- Conversation Threads (NEW) - Track multi-turn conversations
CREATE TABLE conversation_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    root_tweet_id VARCHAR(100) NOT NULL, -- Original tweet that started conversation
    conversation_tone VARCHAR(20) DEFAULT 'casual', -- 'friendly', 'debate', 'casual', 'professional'
    user_sentiment VARCHAR(20) DEFAULT 'neutral', -- 'positive', 'neutral', 'negative'
    conversation_length INTEGER DEFAULT 1, -- Number of exchanges
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_conversation_threads_agent (agent_id),
    INDEX idx_conversation_threads_root (root_tweet_id),
    INDEX idx_conversation_threads_active (is_active)
);

-- Conversation Messages (NEW) - Track individual messages in conversations
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversation_threads(id) ON DELETE CASCADE,
    tweet_id VARCHAR(100) NOT NULL,
    author_id VARCHAR(100) NOT NULL,
    author_username VARCHAR(100) NOT NULL,
    message_text TEXT NOT NULL,
    message_order INTEGER NOT NULL, -- Order in conversation
    is_from_agent BOOLEAN NOT NULL,
    engagement_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_conversation_messages_conversation (conversation_id),
    INDEX idx_conversation_messages_tweet (tweet_id),
    INDEX idx_conversation_messages_order (conversation_id, message_order)
);

-- Create indexes for performance
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_ai_agents_user_id ON ai_agents(user_id);
CREATE INDEX idx_ai_agents_nft_mint ON ai_agents(nft_mint_address);
CREATE INDEX idx_ai_agents_active ON ai_agents(is_active);
CREATE INDEX idx_ai_agents_auto_reply ON ai_agents(auto_reply_enabled);
CREATE INDEX idx_oauth_temp_tokens_user_platform ON oauth_temp_tokens(user_id, platform);
CREATE INDEX idx_oauth_temp_tokens_expires ON oauth_temp_tokens(expires_at);
CREATE INDEX idx_platform_connections_user ON platform_connections(user_id, platform);
CREATE INDEX idx_telegram_groups_agent ON telegram_groups(agent_id);
CREATE INDEX idx_telegram_groups_chat ON telegram_groups(chat_id);
CREATE INDEX idx_generated_content_agent ON generated_content(agent_id);
CREATE INDEX idx_generated_content_scheduled ON generated_content(scheduled_for);
CREATE INDEX idx_generated_content_published ON generated_content(published_at);
CREATE INDEX idx_generated_content_platform ON generated_content(platform);
CREATE INDEX idx_token_transactions_user ON token_transactions(user_id);
CREATE INDEX idx_daily_analytics_agent_date ON daily_analytics(agent_id, date);
CREATE INDEX idx_engagement_analytics_agent_date ON engagement_analytics(agent_id, date);
CREATE INDEX idx_knowledge_documents_company ON knowledge_documents(company_profile_id);
CREATE INDEX idx_knowledge_documents_type ON knowledge_documents(document_type);
CREATE INDEX idx_agent_knowledge_active ON agent_knowledge_assignments(agent_id, is_active);
CREATE INDEX idx_company_content_performance ON company_content_performance(agent_id, company_profile_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);

-- Add vector similarity search function for embeddings
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    company_id UUID,
    match_threshold FLOAT,
    match_count INT
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    content TEXT,
    similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
    SELECT
        kd.id,
        kd.title,
        kd.content,
        1 - (kd.embedding_vector <=> query_embedding) AS similarity
    FROM knowledge_documents kd
    WHERE kd.company_profile_id = company_id
    AND 1 - (kd.embedding_vector <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
$$;

-- Insert default system configuration
INSERT INTO system_config (config_key, config_value, description) VALUES
('token_economy', '{"initial_supply": 1000000000, "deflation_rate": 0.02, "reward_multipliers": {"viral_post": 500, "daily_activity": 50, "quality_bonus": 2.0}}', 'Token economy configuration'),
('ai_models', '{"default_model": "gpt-4", "fallback_model": "gpt-3.5-turbo", "image_model": "dall-e-3"}', 'AI model configuration'),
('rate_limits', '{"posts_per_day": 50, "replies_per_day": 200, "api_calls_per_minute": 60}', 'Platform rate limits'),
('content_safety', '{"toxicity_threshold": 0.7, "spam_threshold": 0.8, "minimum_quality_score": 0.6}', 'Content safety thresholds');

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON company_profiles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_company_locations_updated_at BEFORE UPDATE ON company_locations
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_company_faqs_updated_at BEFORE UPDATE ON company_faqs
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column(); 

-- Create views for easier querying
CREATE VIEW agent_engagement_summary AS
SELECT 
    a.id as agent_id,
    a.name as agent_name,
    a.personality_type,
    a.auto_reply_enabled,
    COUNT(ae.id) as total_engagements,
    COUNT(CASE WHEN ae.engagement_type = 'topic_reply' THEN 1 END) as topic_replies,
    COUNT(CASE WHEN ae.engagement_type = 'mention_reply' THEN 1 END) as mention_replies,
    COUNT(CASE WHEN ae.engagement_type = 'reply_to_reply' THEN 1 END) as reply_to_replies,
    AVG(ae.engagement_score) as avg_engagement_score,
    MAX(ae.created_at) as last_engagement
FROM ai_agents a
LEFT JOIN agent_engagements ae ON a.id = ae.agent_id
WHERE a.is_active = true
GROUP BY a.id, a.name, a.personality_type, a.auto_reply_enabled;

-- Create view for conversation insights
CREATE VIEW conversation_insights AS
SELECT 
    ct.agent_id,
    a.name as agent_name,
    ct.conversation_tone,
    ct.user_sentiment,
    ct.conversation_length,
    COUNT(cm.id) as total_messages,
    AVG(ct.conversation_length) as avg_conversation_length,
    MAX(ct.last_activity) as last_conversation
FROM conversation_threads ct
JOIN ai_agents a ON ct.agent_id = a.id
LEFT JOIN conversation_messages cm ON ct.id = cm.conversation_id
WHERE ct.is_active = true
GROUP BY ct.agent_id, a.name, ct.conversation_tone, ct.user_sentiment, ct.conversation_length; 