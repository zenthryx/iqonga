-- Add token access columns to users table
-- This migration adds ZTR token access tracking to the users table

-- Add columns for token access tracking
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ztr_balance DECIMAL(20,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ztr_threshold DECIMAL(20,8) DEFAULT 1000000,
ADD COLUMN IF NOT EXISTS token_access_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_token_check TIMESTAMP WITH TIME ZONE;

-- Create index for token access queries
CREATE INDEX IF NOT EXISTS idx_users_token_access ON users(token_access_enabled);
CREATE INDEX IF NOT EXISTS idx_users_ztr_balance ON users(ztr_balance);

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE users TO socialai;

-- Update existing users to have token access disabled by default
-- (They'll need to re-login to verify their token balance)
UPDATE users 
SET token_access_enabled = FALSE 
WHERE token_access_enabled IS NULL;
