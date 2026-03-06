-- Create oauth_temp_tokens table for temporary OAuth tokens
-- This table is used to store temporary tokens during the OAuth flow (e.g., Twitter)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS oauth_temp_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Changed from UUID to INTEGER to match users table
    platform VARCHAR(20) NOT NULL, -- 'twitter', 'telegram'
    oauth_token TEXT NOT NULL,
    oauth_token_secret TEXT, -- For OAuth 1.0a, not strictly needed for OAuth 2.0 PKCE but kept for flexibility
    code_verifier TEXT, -- For OAuth 2.0 PKCE
    state TEXT, -- For OAuth 2.0 PKCE
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- Add comments for documentation
COMMENT ON TABLE oauth_temp_tokens IS 'Stores temporary OAuth tokens during authentication flows.';
COMMENT ON COLUMN oauth_temp_tokens.user_id IS 'ID of the user initiating the OAuth flow.';
COMMENT ON COLUMN oauth_temp_tokens.platform IS 'Social media platform (e.g., twitter).';
COMMENT ON COLUMN oauth_temp_tokens.oauth_token IS 'Temporary OAuth token or authorization code.';
COMMENT ON COLUMN oauth_temp_tokens.oauth_token_secret IS 'Temporary OAuth token secret (for OAuth 1.0a).';
COMMENT ON COLUMN oauth_temp_tokens.code_verifier IS 'PKCE code verifier for OAuth 2.0.';
COMMENT ON COLUMN oauth_temp_tokens.state IS 'OAuth state parameter for CSRF protection.';
COMMENT ON COLUMN oauth_temp_tokens.expires_at IS 'Timestamp when the temporary token expires.';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_oauth_temp_tokens_user_platform ON oauth_temp_tokens(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_oauth_temp_tokens_expires ON oauth_temp_tokens(expires_at);
