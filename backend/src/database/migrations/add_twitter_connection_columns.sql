-- Add missing columns to platform_connections table for Twitter integration
-- This migration adds columns needed for storing Twitter user information

ALTER TABLE platform_connections 
ADD COLUMN IF NOT EXISTS platform_user_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS display_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN platform_connections.platform_user_id IS 'Platform-specific user ID (e.g., Twitter user ID)';
COMMENT ON COLUMN platform_connections.display_name IS 'User display name on the platform';
COMMENT ON COLUMN platform_connections.profile_image_url IS 'URL to user profile image on platform';
COMMENT ON COLUMN platform_connections.follower_count IS 'Number of followers on the platform';

-- Update any existing records with default values
UPDATE platform_connections 
SET follower_count = 0 
WHERE follower_count IS NULL;
