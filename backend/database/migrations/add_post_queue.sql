-- Migration: Add post queue system for rate limit management
-- Created: 2025-09-16

-- Table to store queued posts when rate limited
CREATE TABLE IF NOT EXISTS post_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    content_text TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'tweet',
    platform VARCHAR(50) DEFAULT 'twitter',
    scheduled_for TIMESTAMP WITH TIME ZONE,
    priority INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status VARCHAR(50) DEFAULT 'queued', -- queued, processing, posted, failed, cancelled
    rate_limit_reset TIMESTAMP WITH TIME ZONE,
    original_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    posted_at TIMESTAMP WITH TIME ZONE
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_post_queue_status_scheduled ON post_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_post_queue_user_platform ON post_queue(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_post_queue_rate_limit_reset ON post_queue(rate_limit_reset);

-- Table to track rate limits per user per platform
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    limit_type VARCHAR(50) NOT NULL, -- daily, hourly, per_15min
    current_count INTEGER DEFAULT 0,
    limit_max INTEGER NOT NULL,
    reset_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform, limit_type)
);

-- Index for rate limit tracking
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_user_platform ON rate_limit_tracking(user_id, platform, limit_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_reset_time ON rate_limit_tracking(reset_time);
