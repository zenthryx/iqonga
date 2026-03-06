-- Enable pgvector Extension
-- Run this script FIRST if you get "type vector does not exist" error
-- 
-- IMPORTANT: This requires superuser privileges or the extension must be pre-installed
-- 
-- For Aiven PostgreSQL:
--   1. Go to Aiven Console
--   2. Select your PostgreSQL service
--   3. Go to "Extensions" tab
--   4. Enable "vector" extension
--
-- For standard PostgreSQL:
--   1. Install pgvector on your server first
--   2. Then run this script as superuser

-- Check if pgvector is available
DO $$
BEGIN
    -- Try to create the extension
    CREATE EXTENSION IF NOT EXISTS vector;
    RAISE NOTICE '✅ pgvector extension enabled successfully!';
    RAISE NOTICE 'You can now run the create_custom_business_data.sql migration.';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE EXCEPTION '❌ Insufficient privileges. You need superuser access or the extension must be enabled by a database administrator.';
    WHEN undefined_file THEN
        RAISE EXCEPTION '❌ pgvector extension files not found. Please install pgvector first:
        
        Ubuntu/Debian: sudo apt-get install postgresql-XX-vector
        macOS: brew install pgvector
        Or compile from source: https://github.com/pgvector/pgvector';
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Error enabling pgvector: %', SQLERRM;
END $$;

-- Verify installation
SELECT 
    extname as extension_name,
    extversion as version
FROM pg_extension 
WHERE extname = 'vector';

