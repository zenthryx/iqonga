-- This table will store the OAuth tokens and connection details for each user and platform.
CREATE TABLE IF NOT EXISTS platform_connections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    platform_user_id VARCHAR(255),
    username VARCHAR(255),
    display_name VARCHAR(255),
    avatar_url TEXT,
    access_token TEXT NOT NULL,
    access_token_secret TEXT, -- For OAuth 1.0a like Twitter
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    scopes TEXT[],
    connection_status VARCHAR(50) DEFAULT 'active', -- e.g., active, expired, revoked
    follower_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_connections_user_id ON platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_connections_platform ON platform_connections(platform); 