-- Fix oauth_temp_tokens table structure for OAuth 2.0 PKCE
-- This migration updates the table to properly support OAuth 2.0 flow

-- Make old OAuth 1.0a columns nullable since we're using OAuth 2.0 PKCE
ALTER TABLE oauth_temp_tokens 
ALTER COLUMN oauth_token DROP NOT NULL,
ALTER COLUMN oauth_token_secret DROP NOT NULL;

-- Ensure the new OAuth 2.0 PKCE columns exist and are properly configured
ALTER TABLE oauth_temp_tokens 
ADD COLUMN IF NOT EXISTS code_verifier TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

-- Add comments for the new columns
COMMENT ON COLUMN oauth_temp_tokens.code_verifier IS 'PKCE code verifier for OAuth 2.0';
COMMENT ON COLUMN oauth_temp_tokens.state IS 'OAuth state parameter for CSRF protection';

-- Update existing rows to have NULL values for old columns
UPDATE oauth_temp_tokens 
SET oauth_token = NULL, oauth_token_secret = NULL 
WHERE oauth_token IS NOT NULL OR oauth_token_secret IS NOT NULL;
