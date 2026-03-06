-- Migration: Add Telegram support for AI Agents
-- Created: 2025-09-16

-- Add Telegram platform support to existing platform_connections table
-- The table should already exist, we're just documenting the structure needed

-- Platform connections should support:
-- platform = 'telegram'
-- connection_id = chat_id (group/channel ID)
-- access_token = bot_token (encrypted)
-- additional_data = JSON with group info (title, type, etc.)

-- Add Telegram groups table for better management
CREATE TABLE IF NOT EXISTS telegram_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chat_id BIGINT NOT NULL, -- Telegram chat ID (can be negative for groups)
    chat_type VARCHAR(50) NOT NULL, -- 'group', 'supergroup', 'channel'
    title VARCHAR(255),
    username VARCHAR(255), -- For public groups/channels
    description TEXT,
    member_count INTEGER,
    bot_token_encrypted TEXT NOT NULL, -- Encrypted bot token
    bot_username VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    permissions JSON, -- Bot permissions in the group
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chat_id)
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_telegram_groups_user_active ON telegram_groups(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_telegram_groups_chat_id ON telegram_groups(chat_id);

-- Add Telegram rate limits (Telegram has different limits than Twitter)
-- Telegram Bot API limits: 30 messages per second, 20 messages per minute to same chat
INSERT INTO rate_limit_tracking (user_id, platform, limit_type, current_count, limit_max, reset_time)
SELECT 
    u.id as user_id,
    'telegram' as platform,
    'per_minute' as limit_type,
    0 as current_count,
    20 as limit_max,
    NOW() + INTERVAL '1 minute' as reset_time
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM rate_limit_tracking 
    WHERE user_id = u.id AND platform = 'telegram' AND limit_type = 'per_minute'
);

-- Update post_queue to support Telegram
-- The table already exists, just ensure it can handle telegram platform
-- platform column should accept 'telegram' values
