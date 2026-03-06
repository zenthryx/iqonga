-- Quick check script to see what columns exist in content_templates table
-- Run this to diagnose the migration issue

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'content_templates'
ORDER BY ordinal_position;

