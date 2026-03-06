-- Add OAuth temporary tokens table for Twitter authentication flow
CREATE TABLE IF NOT EXISTS oauth_temp_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    oauth_token VARCHAR(500) NOT NULL,
    oauth_token_secret VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- Add missing columns to platform_connections table
ALTER TABLE platform_connections 
ADD COLUMN IF NOT EXISTS platform_user_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;

-- Add avatar_url column to ai_agents table if not exists
ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_oauth_temp_tokens_user_platform ON oauth_temp_tokens(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_platform_connections_user_platform ON platform_connections(user_id, platform); 