-- Add missing columns to users table
-- This migration adds the profile_image column that is needed by the users API

ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- Update existing rows with default values
UPDATE users
SET profile_image = NULL
WHERE profile_image IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.profile_image IS 'URL to user profile image';
