-- Quick Fix: Update Sample Data to Your User ID
-- 
-- INSTRUCTIONS:
-- 1. Find your user ID by running: SELECT id, username, email FROM users;
-- 2. Replace YOUR_USER_ID below with your actual ID
-- 3. Run this script: psql -U your_db_user -d your_database -f fix_sample_data_user_id.sql
--
-- Example: If your user ID is 1, change YOUR_USER_ID to 1

-- START: Replace YOUR_USER_ID with your actual user ID (e.g., 1, 2, 3, etc.)
\set target_user_id 1
-- END

-- Update leads
UPDATE leads 
SET user_id = :target_user_id,
    created_by = :target_user_id
WHERE user_id = 18;

-- Update deals  
UPDATE deals 
SET user_id = :target_user_id,
    created_by = :target_user_id
WHERE user_id = 18;

-- Update activities
UPDATE activities 
SET user_id = :target_user_id
WHERE user_id = 18;

-- Show results
SELECT 'Leads updated:' as status, COUNT(*) as count FROM leads WHERE user_id = :target_user_id
UNION ALL
SELECT 'Deals updated:', COUNT(*) FROM deals WHERE user_id = :target_user_id
UNION ALL  
SELECT 'Activities updated:', COUNT(*) FROM activities WHERE user_id = :target_user_id;

\echo '✅ Sample data updated successfully!'
\echo '🔄 Refresh your browser to see the data'

