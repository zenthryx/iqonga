-- Add Telegram engagement features
-- This migration adds tables and columns for Telegram message monitoring and agent engagement

-- Table to store Telegram messages for analysis
CREATE TABLE IF NOT EXISTS telegram_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chat_id BIGINT NOT NULL,
    message_id INTEGER NOT NULL,
    text TEXT,
    from_user JSONB, -- Store user info who sent the message
    reply_to_message_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chat_id, message_id)
);

CREATE INDEX idx_telegram_messages_user_id ON telegram_messages(user_id);
CREATE INDEX idx_telegram_messages_chat_id ON telegram_messages(chat_id);
CREATE INDEX idx_telegram_messages_created_at ON telegram_messages(created_at);

-- Table for keyword triggers
CREATE TABLE IF NOT EXISTS telegram_keyword_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    response_type VARCHAR(50) DEFAULT 'auto', -- 'auto', 'manual', 'scheduled'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_telegram_keyword_triggers_user_id ON telegram_keyword_triggers(user_id);
CREATE INDEX idx_telegram_keyword_triggers_agent_id ON telegram_keyword_triggers(agent_id);
CREATE INDEX idx_telegram_keyword_triggers_keyword ON telegram_keyword_triggers(keyword);

-- Table for engagement settings per agent
CREATE TABLE IF NOT EXISTS telegram_engagement_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    mention_settings JSONB DEFAULT '{"enabled": true, "maxResponsesPerHour": 5}',
    reply_settings JSONB DEFAULT '{"enabled": true, "maxResponsesPerHour": 10}',
    keyword_settings JSONB DEFAULT '{"enabled": false, "maxResponsesPerHour": 3}',
    auto_reply_enabled BOOLEAN DEFAULT TRUE,
    response_delay_seconds INTEGER DEFAULT 30, -- Delay before responding
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id)
);

CREATE INDEX idx_telegram_engagement_settings_agent_id ON telegram_engagement_settings(agent_id);

-- Table for tracking agent responses to avoid spam
CREATE TABLE IF NOT EXISTS telegram_response_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    chat_id BIGINT NOT NULL,
    trigger_type VARCHAR(50) NOT NULL, -- 'mention', 'reply', 'keyword'
    response_count INTEGER DEFAULT 1,
    last_response_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hour_bucket TIMESTAMP WITH TIME ZONE NOT NULL, -- Hour bucket for rate limiting
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, chat_id, trigger_type, hour_bucket)
);

CREATE INDEX idx_telegram_response_tracking_agent_id ON telegram_response_tracking(agent_id);
CREATE INDEX idx_telegram_response_tracking_hour_bucket ON telegram_response_tracking(hour_bucket);

-- Add engagement settings column to ai_agents table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_agents' AND column_name = 'engagement_settings') THEN
        ALTER TABLE ai_agents ADD COLUMN engagement_settings JSONB DEFAULT '{}';
    END IF;
END $$;

-- Insert default engagement settings for existing agents
INSERT INTO telegram_engagement_settings (agent_id, created_at, updated_at)
SELECT id, NOW(), NOW()
FROM ai_agents 
WHERE id NOT IN (SELECT agent_id FROM telegram_engagement_settings);

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE telegram_messages TO socialai;
GRANT ALL PRIVILEGES ON TABLE telegram_keyword_triggers TO socialai;
GRANT ALL PRIVILEGES ON TABLE telegram_engagement_settings TO socialai;
GRANT ALL PRIVILEGES ON TABLE telegram_response_tracking TO socialai;

GRANT SELECT, INSERT, UPDATE, DELETE ON telegram_messages TO socialai;
GRANT SELECT, INSERT, UPDATE, DELETE ON telegram_keyword_triggers TO socialai;
GRANT SELECT, INSERT, UPDATE, DELETE ON telegram_engagement_settings TO socialai;
GRANT SELECT, INSERT, UPDATE, DELETE ON telegram_response_tracking TO socialai;

ALTER TABLE telegram_messages OWNER TO socialai;
ALTER TABLE telegram_keyword_triggers OWNER TO socialai;
ALTER TABLE telegram_engagement_settings OWNER TO socialai;
ALTER TABLE telegram_response_tracking OWNER TO socialai;
