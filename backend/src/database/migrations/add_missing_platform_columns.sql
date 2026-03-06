-- Add missing columns to platform_connections table
-- This migration adds the last_sync column that is needed by the Twitter API

ALTER TABLE platform_connections 
ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP DEFAULT NOW();

-- Update existing rows with default values
UPDATE platform_connections 
SET last_sync = NOW()
WHERE last_sync IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN platform_connections.last_sync IS 'Timestamp of last synchronization with the platform';
