-- Add last_login_at column to users table
-- This is optional but useful for tracking user activity

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);

-- Comment for documentation
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of user last login';

