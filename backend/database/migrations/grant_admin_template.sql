-- ============================================================
-- TEMPLATE: Grant Admin Rights to a User
-- ============================================================
-- This is a reusable template for granting admin privileges to users
-- 
-- INSTRUCTIONS:
-- 1. Replace 'USERNAME_HERE' with the actual username
-- 2. Optionally customize the admin_permissions JSON object
-- 3. Run this script in your database
--
-- USAGE EXAMPLES:
-- - By username: Replace 'USERNAME_HERE' with the username
-- - By email: Change WHERE clause to: WHERE email = 'user@example.com'
-- - By wallet_address: Change WHERE clause to: WHERE wallet_address = 'wallet_address_here'
-- - By user ID: Change WHERE clause to: WHERE id = 123
-- ============================================================

-- Grant Admin Rights to User
DO $$
DECLARE
    user_exists BOOLEAN;
    user_id_val INTEGER;
    target_username VARCHAR(100) := 'USERNAME_HERE'; -- CHANGE THIS to the actual username
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE username = target_username) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'User with username "%" not found. Please verify the username.', target_username;
    END IF;
    
    -- Get the user ID
    SELECT id INTO user_id_val FROM users WHERE username = target_username;
    
    -- Grant admin role and permissions
    UPDATE users 
    SET 
        role = 'admin',
        is_admin = true,
        admin_permissions = '{
            "user_management": true,
            "credit_management": true,
            "system_monitoring": true,
            "support_tickets": true,
            "analytics": true,
            "content_moderation": true
        }'::jsonb
    WHERE username = target_username;
    
    RAISE NOTICE 'Successfully granted admin rights to user: % (ID: %)', target_username, user_id_val;
    
END $$;

-- Verify the update
SELECT 
    id,
    username,
    email,
    wallet_address,
    role,
    is_admin,
    admin_permissions,
    created_at
FROM users 
WHERE username = 'USERNAME_HERE'; -- CHANGE THIS to match the username above

-- ============================================================
-- ALTERNATIVE: Grant Admin by Email
-- ============================================================
-- Uncomment and modify the following if you want to grant admin by email:
/*
DO $$
DECLARE
    user_exists BOOLEAN;
    user_id_val INTEGER;
    target_email VARCHAR(255) := 'user@example.com'; -- CHANGE THIS
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE email = target_email) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'User with email "%" not found.', target_email;
    END IF;
    
    SELECT id INTO user_id_val FROM users WHERE email = target_email;
    
    UPDATE users 
    SET 
        role = 'admin',
        is_admin = true,
        admin_permissions = '{
            "user_management": true,
            "credit_management": true,
            "system_monitoring": true,
            "support_tickets": true,
            "analytics": true,
            "content_moderation": true
        }'::jsonb
    WHERE email = target_email;
    
    RAISE NOTICE 'Successfully granted admin rights to user: % (ID: %)', target_email, user_id_val;
END $$;
*/

-- ============================================================
-- ALTERNATIVE: Grant Admin by Wallet Address
-- ============================================================
-- Uncomment and modify the following if you want to grant admin by wallet:
/*
DO $$
DECLARE
    user_exists BOOLEAN;
    user_id_val INTEGER;
    target_wallet VARCHAR(255) := 'wallet_address_here'; -- CHANGE THIS
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE wallet_address = target_wallet) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'User with wallet "%" not found.', target_wallet;
    END IF;
    
    SELECT id INTO user_id_val FROM users WHERE wallet_address = target_wallet;
    
    UPDATE users 
    SET 
        role = 'admin',
        is_admin = true,
        admin_permissions = '{
            "user_management": true,
            "credit_management": true,
            "system_monitoring": true,
            "support_tickets": true,
            "analytics": true,
            "content_moderation": true
        }'::jsonb
    WHERE wallet_address = target_wallet;
    
    RAISE NOTICE 'Successfully granted admin rights to user: % (ID: %)', target_wallet, user_id_val;
END $$;
*/

-- ============================================================
-- ALTERNATIVE: Grant Admin by User ID
-- ============================================================
-- Uncomment and modify the following if you want to grant admin by ID:
/*
DO $$
DECLARE
    user_exists BOOLEAN;
    user_id_val INTEGER := 123; -- CHANGE THIS to the user ID
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE id = user_id_val) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'User with ID % not found.', user_id_val;
    END IF;
    
    UPDATE users 
    SET 
        role = 'admin',
        is_admin = true,
        admin_permissions = '{
            "user_management": true,
            "credit_management": true,
            "system_monitoring": true,
            "support_tickets": true,
            "analytics": true,
            "content_moderation": true
        }'::jsonb
    WHERE id = user_id_val;
    
    RAISE NOTICE 'Successfully granted admin rights to user ID: %', user_id_val;
END $$;
*/

-- ============================================================
-- LIST ALL CURRENT ADMINS
-- ============================================================
-- Run this query to see all current admin users:
/*
SELECT 
    id,
    username,
    email,
    wallet_address,
    role,
    is_admin,
    admin_permissions,
    created_at
FROM users 
WHERE is_admin = true OR role = 'admin'
ORDER BY created_at DESC;
*/

-- ============================================================
-- REMOVE ADMIN RIGHTS (if needed)
-- ============================================================
-- To remove admin rights from a user, run:
/*
UPDATE users 
SET 
    role = 'user',
    is_admin = false,
    admin_permissions = '{}'::jsonb
WHERE username = 'USERNAME_HERE'; -- CHANGE THIS
*/
