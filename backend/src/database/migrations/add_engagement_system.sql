-- Migration: Add Agent Engagement System
-- Date: 2024-01-XX
-- Description: Adds comprehensive engagement tracking and management capabilities

-- Add new columns to ai_agents table
ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS auto_reply_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reply_frequency VARCHAR(20) DEFAULT 'moderate',
ADD COLUMN IF NOT EXISTS min_engagement_threshold INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS max_replies_per_day INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS reply_to_mentions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reply_to_replies BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS engagement_paused_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS engagement_pause_reason TEXT;

-- Create agent_engagements table
CREATE TABLE IF NOT EXISTS agent_engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    tweet_id VARCHAR(100) NOT NULL,
    reply_content TEXT,
    engagement_type VARCHAR(50) NOT NULL,
    engagement_score DECIMAL(3,2) DEFAULT 0,
    engagement_metrics JSONB DEFAULT '{}',
    conversation_context JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create conversation_threads table
CREATE TABLE IF NOT EXISTS conversation_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    root_tweet_id VARCHAR(100) NOT NULL,
    conversation_tone VARCHAR(20) DEFAULT 'casual',
    user_sentiment VARCHAR(20) DEFAULT 'neutral',
    conversation_length INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create conversation_messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversation_threads(id) ON DELETE CASCADE,
    tweet_id VARCHAR(100) NOT NULL,
    author_id VARCHAR(100) NOT NULL,
    author_username VARCHAR(100) NOT NULL,
    message_text TEXT NOT NULL,
    message_order INTEGER NOT NULL,
    is_from_agent BOOLEAN NOT NULL,
    engagement_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create engagement_analytics table
CREATE TABLE IF NOT EXISTS engagement_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    topic_replies INTEGER DEFAULT 0,
    mention_replies INTEGER DEFAULT 0,
    reply_to_replies INTEGER DEFAULT 0,
    avg_engagement_score DECIMAL(3,2) DEFAULT 0,
    high_priority_engagements INTEGER DEFAULT 0,
    successful_conversations INTEGER DEFAULT 0,
    avg_response_time_minutes INTEGER DEFAULT 0,
    response_time_distribution JSONB DEFAULT '{}',
    conversations_started INTEGER DEFAULT 0,
    conversations_continued INTEGER DEFAULT 0,
    avg_conversation_length INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(agent_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_engagements_agent_id ON agent_engagements(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_engagements_tweet_id ON agent_engagements(tweet_id);
CREATE INDEX IF NOT EXISTS idx_agent_engagements_type ON agent_engagements(engagement_type);
CREATE INDEX IF NOT EXISTS idx_agent_engagements_created ON agent_engagements(created_at);

CREATE INDEX IF NOT EXISTS idx_conversation_threads_agent ON conversation_threads(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_root ON conversation_threads(root_tweet_id);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_active ON conversation_threads(is_active);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_tweet ON conversation_messages(tweet_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_order ON conversation_messages(conversation_id, message_order);

CREATE INDEX IF NOT EXISTS idx_engagement_analytics_agent_date ON engagement_analytics(agent_id, date);

-- Create views for easier querying
CREATE OR REPLACE VIEW agent_engagement_summary AS
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

CREATE OR REPLACE VIEW conversation_insights AS
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

-- Insert default engagement settings for existing agents
UPDATE ai_agents 
SET 
    auto_reply_enabled = false,
    reply_frequency = 'moderate',
    min_engagement_threshold = 50,
    max_replies_per_day = 20,
    reply_to_mentions = true,
    reply_to_replies = true
WHERE auto_reply_enabled IS NULL;

-- Create function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
    p_priority VARCHAR(20),
    p_relevance_score DECIMAL,
    p_engagement_metrics JSONB
) RETURNS DECIMAL AS $$
DECLARE
    base_score DECIMAL;
    engagement_bonus DECIMAL;
BEGIN
    -- Base score from priority
    CASE p_priority
        WHEN 'high' THEN base_score := 0.9;
        WHEN 'medium' THEN base_score := 0.7;
        WHEN 'low' THEN base_score := 0.5;
        ELSE base_score := 0.5;
    END CASE;
    
    -- Relevance bonus
    base_score := base_score + (p_relevance_score * 0.2);
    
    -- Engagement metrics bonus
    IF p_engagement_metrics IS NOT NULL THEN
        engagement_bonus := COALESCE((p_engagement_metrics->>'like_count')::INTEGER, 0) * 0.001 +
                           COALESCE((p_engagement_metrics->>'retweet_count')::INTEGER, 0) * 0.002 +
                           COALESCE((p_engagement_metrics->>'reply_count')::INTEGER, 0) * 0.003;
        base_score := base_score + LEAST(engagement_bonus, 0.3);
    END IF;
    
    -- Ensure score is between 0 and 1
    RETURN GREATEST(0.0, LEAST(1.0, base_score));
END;
$$ LANGUAGE plpgsql;

-- Create function to update daily engagement analytics
CREATE OR REPLACE FUNCTION update_daily_engagement_analytics(p_agent_id UUID, p_date DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO engagement_analytics (
        agent_id, date, topic_replies, mention_replies, reply_to_replies,
        avg_engagement_score, high_priority_engagements, successful_conversations
    )
    SELECT 
        p_agent_id,
        p_date,
        COUNT(CASE WHEN engagement_type = 'topic_reply' THEN 1 END),
        COUNT(CASE WHEN engagement_type = 'mention_reply' THEN 1 END),
        COUNT(CASE WHEN engagement_type = 'reply_to_reply' THEN 1 END),
        AVG(engagement_score),
        COUNT(CASE WHEN engagement_score > 0.7 THEN 1 END),
        COUNT(CASE WHEN engagement_score > 0.8 THEN 1 END)
    FROM agent_engagements 
    WHERE agent_id = p_agent_id 
    AND DATE(created_at) = p_date
    ON CONFLICT (agent_id, date) DO UPDATE SET
        topic_replies = EXCLUDED.topic_replies,
        mention_replies = EXCLUDED.mention_replies,
        reply_to_replies = EXCLUDED.reply_to_replies,
        avg_engagement_score = EXCLUDED.avg_engagement_score,
        high_priority_engagements = EXCLUDED.high_priority_engagements,
        successful_conversations = EXCLUDED.successful_conversations;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update analytics when engagements are added
CREATE OR REPLACE FUNCTION trigger_update_engagement_analytics()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_daily_engagement_analytics(NEW.agent_id, DATE(NEW.created_at));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER engagement_analytics_trigger
    AFTER INSERT OR UPDATE ON agent_engagements
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_engagement_analytics();

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMENT ON TABLE agent_engagements IS 'Tracks all agent interactions and engagements on social platforms';
COMMENT ON TABLE conversation_threads IS 'Manages conversation flows and context for agent interactions';
COMMENT ON TABLE conversation_messages IS 'Individual messages within conversation threads';
COMMENT ON TABLE engagement_analytics IS 'Daily aggregated engagement metrics for agents';
COMMENT ON FUNCTION calculate_engagement_score IS 'Calculates engagement score based on priority, relevance, and metrics';
COMMENT ON FUNCTION update_daily_engagement_analytics IS 'Updates daily engagement analytics for a specific agent and date';
