-- Create scheduled_posts table for scheduling agent posts
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL DEFAULT 'twitter',
    content_type VARCHAR(100) NOT NULL DEFAULT 'tweet',
    content_text TEXT,
    content_config JSONB, -- For storing generation parameters
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    frequency VARCHAR(50) DEFAULT 'once', -- once, daily, weekly, monthly
    frequency_config JSONB, -- For storing recurrence rules
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, running, completed, failed, cancelled
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    max_runs INTEGER DEFAULT 1, -- 0 means unlimited
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_agent_id ON scheduled_posts(agent_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_next_run ON scheduled_posts(next_run);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_platform ON scheduled_posts(platform);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_scheduled_posts_updated_at 
    BEFORE UPDATE ON scheduled_posts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE scheduled_posts IS 'Stores scheduled posts for AI agents across different platforms';
COMMENT ON COLUMN scheduled_posts.content_config IS 'JSON configuration for content generation (topic, style, length, etc.)';
COMMENT ON COLUMN scheduled_posts.frequency_config IS 'JSON configuration for recurrence (days of week, months, etc.)';
