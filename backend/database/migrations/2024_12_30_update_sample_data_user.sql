-- Update Sample Data to Current User
-- This script updates the sample data to use your actual user ID

-- First, let's see what users exist
\echo 'Current users in database:'
SELECT id, username, email, wallet_address FROM users ORDER BY id;

-- Prompt: Replace YOUR_USER_ID below with your actual user ID from the list above
-- For example, if your ID is 1, change all occurrences of YOUR_USER_ID to 1

-- BEGIN TRANSACTION;

-- Update leads to your user ID
UPDATE leads 
SET user_id = YOUR_USER_ID,
    created_by = YOUR_USER_ID
WHERE user_id = 18;

-- Update deals to your user ID
UPDATE deals 
SET user_id = YOUR_USER_ID,
    created_by = YOUR_USER_ID
WHERE user_id = 18;

-- Update activities to your user ID
UPDATE activities 
SET user_id = YOUR_USER_ID
WHERE user_id = 18;

-- Verify the updates
\echo 'Updated leads count:'
SELECT COUNT(*) as lead_count FROM leads WHERE user_id = YOUR_USER_ID;

\echo 'Updated deals count:'
SELECT COUNT(*) as deal_count FROM deals WHERE user_id = YOUR_USER_ID;

\echo 'Updated activities count:'
SELECT COUNT(*) as activity_count FROM activities WHERE user_id = YOUR_USER_ID;

-- COMMIT;

\echo '✅ Sample data updated successfully!'
\echo '🔄 Please refresh your browser to see the data'

