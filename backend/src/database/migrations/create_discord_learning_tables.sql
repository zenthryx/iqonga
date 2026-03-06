-- Discord Knowledge Storage Tables
-- Stores learned knowledge from Discord channels for AI agent enhancement

-- Main knowledge storage table
CREATE TABLE IF NOT EXISTS discord_knowledge (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL,
    channel_id VARCHAR(255),
    knowledge_type VARCHAR(50) NOT NULL, -- 'conversation', 'qa_pair', 'support_issue'
    content JSONB NOT NULL,
    metadata JSONB,
    content_hash VARCHAR(64) GENERATED ALWAYS AS (md5(content::text)) STORED,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure unique knowledge entries
    UNIQUE(guild_id, channel_id, knowledge_type, content_hash)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_discord_knowledge_guild_channel ON discord_knowledge(guild_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_discord_knowledge_type ON discord_knowledge(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_discord_knowledge_created_at ON discord_knowledge(created_at);
CREATE INDEX IF NOT EXISTS idx_discord_knowledge_content_search ON discord_knowledge USING GIN(content);

-- Support issue tracking table
CREATE TABLE IF NOT EXISTS discord_support_issues (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL,
    channel_id VARCHAR(255),
    user_id VARCHAR(255) NOT NULL,
    issue_content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'technical', 'account', 'billing', 'feature', 'general'
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    resolution TEXT,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for support issues
CREATE INDEX IF NOT EXISTS idx_discord_support_guild ON discord_support_issues(guild_id);
CREATE INDEX IF NOT EXISTS idx_discord_support_status ON discord_support_issues(status);
CREATE INDEX IF NOT EXISTS idx_discord_support_category ON discord_support_issues(category);
CREATE INDEX IF NOT EXISTS idx_discord_support_severity ON discord_support_issues(severity);

-- Channel learning statistics
CREATE TABLE IF NOT EXISTS discord_learning_stats (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    total_messages_learned INTEGER DEFAULT 0,
    total_conversations INTEGER DEFAULT 0,
    total_qa_pairs INTEGER DEFAULT 0,
    total_support_issues INTEGER DEFAULT 0,
    last_learning_session TIMESTAMP,
    learning_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(guild_id, channel_id)
);

-- Update triggers for timestamps
CREATE OR REPLACE FUNCTION update_discord_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_discord_knowledge_updated_at
    BEFORE UPDATE ON discord_knowledge
    FOR EACH ROW
    EXECUTE FUNCTION update_discord_knowledge_updated_at();

CREATE TRIGGER trigger_update_discord_support_issues_updated_at
    BEFORE UPDATE ON discord_support_issues
    FOR EACH ROW
    EXECUTE FUNCTION update_discord_knowledge_updated_at();

CREATE TRIGGER trigger_update_discord_learning_stats_updated_at
    BEFORE UPDATE ON discord_learning_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_discord_knowledge_updated_at();

-- Comments for documentation
COMMENT ON TABLE discord_knowledge IS 'Stores learned knowledge from Discord channels for AI agent enhancement';
COMMENT ON TABLE discord_support_issues IS 'Tracks support issues identified in Discord channels';
COMMENT ON TABLE discord_learning_stats IS 'Statistics about learning progress per Discord channel';
