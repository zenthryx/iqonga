-- Add auth_token column to oauth_temp_tokens table
-- This migration adds the auth_token column to store JWT tokens during OAuth flow
-- This allows the callback handler to authenticate users without relying on session state

ALTER TABLE oauth_temp_tokens 
ADD COLUMN IF NOT EXISTS auth_token TEXT;

-- Add comment for documentation
COMMENT ON COLUMN oauth_temp_tokens.auth_token IS 'JWT token for user authentication during OAuth callback';

-- Update existing rows to have NULL values for auth_token
UPDATE oauth_temp_tokens 
SET auth_token = NULL 
WHERE auth_token IS NULL;
