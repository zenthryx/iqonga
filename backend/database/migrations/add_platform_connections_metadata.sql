-- Add metadata column to platform_connections table
-- This column will store rate limit information and other platform-specific metadata

-- Add metadata column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'platform_connections' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE platform_connections 
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        
        -- Create index on metadata for faster queries
        CREATE INDEX IF NOT EXISTS idx_platform_connections_metadata 
        ON platform_connections USING GIN (metadata);
        
        RAISE NOTICE 'Added metadata column to platform_connections table';
    ELSE
        RAISE NOTICE 'metadata column already exists in platform_connections table';
    END IF;
END $$;

