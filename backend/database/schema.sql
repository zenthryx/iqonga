-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Social Platform Connections
CREATE TABLE platform_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL, -- 'twitter', 'instagram', 'linkedin'
    username VARCHAR(100) NOT NULL,
    access_token TEXT, -- Encrypted
    refresh_token TEXT, -- Encrypted
    token_expires_at TIMESTAMP,
    connection_status VARCHAR(20) DEFAULT 'active',
    last_sync TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, platform)
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

-- OAuth temporary tokens storage
CREATE TABLE oauth_temp_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    oauth_token VARCHAR(255) NOT NULL,
    oauth_token_secret VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '10 minutes'),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_ai_agents_user_id ON ai_agents(user_id);
CREATE INDEX idx_ai_agents_nft_mint ON ai_agents(nft_mint_address);
CREATE INDEX idx_ai_agents_active ON ai_agents(is_active);
CREATE INDEX idx_platform_connections_user ON platform_connections(user_id, platform);
CREATE INDEX idx_generated_content_agent ON generated_content(agent_id);
CREATE INDEX idx_generated_content_scheduled ON generated_content(scheduled_for);
CREATE INDEX idx_generated_content_published ON generated_content(published_at);
CREATE INDEX idx_token_transactions_user ON token_transactions(user_id);
CREATE INDEX idx_daily_analytics_agent_date ON daily_analytics(agent_id, date);
CREATE INDEX idx_oauth_temp_tokens_expires ON oauth_temp_tokens(expires_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Clean up expired OAuth tokens
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM oauth_temp_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup every hour
SELECT cron.schedule('cleanup-oauth-tokens', '0 * * * *', 'SELECT cleanup_expired_oauth_tokens();'); 