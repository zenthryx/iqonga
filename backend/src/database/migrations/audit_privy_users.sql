-- Audit Existing Privy Users
-- Run this to understand your user base before migration

-- ==========================================
-- 1. OVERVIEW: User Authentication Methods
-- ==========================================

SELECT 
    CASE 
        WHEN privy_user_id IS NOT NULL THEN 'Privy'
        WHEN wallet_address IS NOT NULL THEN 'Wallet'
        ELSE 'Other'
    END as auth_type,
    COUNT(*) as user_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM users
GROUP BY auth_type
ORDER BY user_count DESC;

-- ==========================================
-- 2. PRIVY USERS BREAKDOWN
-- ==========================================

-- How many Privy users do we have?
SELECT 
    'Total Privy Users' as metric,
    COUNT(*) as count
FROM users
WHERE privy_user_id IS NOT NULL

UNION ALL

SELECT 
    'Privy with Email' as metric,
    COUNT(*) as count
FROM users
WHERE privy_user_id IS NOT NULL AND email IS NOT NULL

UNION ALL

SELECT 
    'Privy with Wallet' as metric,
    COUNT(*) as count
FROM users
WHERE privy_user_id IS NOT NULL AND wallet_address IS NOT NULL

UNION ALL

SELECT 
    'Privy Email-Only (need migration)' as metric,
    COUNT(*) as count
FROM users
WHERE privy_user_id IS NOT NULL 
AND email IS NOT NULL 
AND wallet_address IS NULL;

-- ==========================================
-- 3. LIST ALL PRIVY USERS (for migration)
-- ==========================================

SELECT 
    id,
    email,
    username,
    privy_user_id,
    wallet_address,
    auth_method,
    email_verified,
    created_at
FROM users
WHERE privy_user_id IS NOT NULL
ORDER BY created_at DESC;

-- ==========================================
-- 4. CHECK FOR GOOGLE OAUTH USERS
-- ==========================================

-- Users who logged in via Google (through Privy or direct)
SELECT 
    COUNT(*) as google_users
FROM users
WHERE email LIKE '%gmail.com'
   OR auth_method = 'google'
   OR privy_user_id IS NOT NULL;

-- ==========================================
-- 5. USER TYPE DISTRIBUTION
-- ==========================================

SELECT 
    CASE 
        WHEN privy_user_id IS NOT NULL THEN 'Privy User'
        WHEN wallet_address IS NOT NULL THEN 'Wallet User'
        ELSE 'Other'
    END as user_type,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM users
GROUP BY user_type
ORDER BY count DESC;

-- ==========================================
-- 6. EMAILS FOR MIGRATION NOTIFICATION
-- ==========================================

-- Export this list to send migration emails
SELECT 
    email,
    username,
    created_at,
    'Migration Required' as status
FROM users
WHERE privy_user_id IS NOT NULL 
AND email IS NOT NULL
ORDER BY email;

-- ==========================================
-- 7. USERS WITH BOTH PRIVY AND WALLET
-- ==========================================

-- These users are easiest - they can just use wallet
SELECT 
    id,
    email,
    username,
    wallet_address,
    'Can use wallet login' as migration_note
FROM users
WHERE privy_user_id IS NOT NULL 
AND wallet_address IS NOT NULL;

-- ==========================================
-- 8. HIGH-PRIORITY MIGRATIONS
-- ==========================================

-- Email-only Privy users (need password migration)
SELECT 
    id,
    email,
    username,
    created_at,
    'Priority: Email-only user' as note
FROM users
WHERE privy_user_id IS NOT NULL 
AND wallet_address IS NULL
AND email IS NOT NULL
ORDER BY created_at DESC;

-- ==========================================
-- MIGRATION SUMMARY
-- ==========================================

DO $$
DECLARE
    total_users INTEGER;
    privy_users INTEGER;
    privy_email_only INTEGER;
    privy_with_wallet INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM users;
    SELECT COUNT(*) INTO privy_users FROM users WHERE privy_user_id IS NOT NULL;
    SELECT COUNT(*) INTO privy_email_only FROM users WHERE privy_user_id IS NOT NULL AND wallet_address IS NULL;
    SELECT COUNT(*) INTO privy_with_wallet FROM users WHERE privy_user_id IS NOT NULL AND wallet_address IS NOT NULL;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'PRIVY MIGRATION AUDIT SUMMARY';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Total Users: %', total_users;
    RAISE NOTICE 'Privy Users: % (%% of total)', privy_users, ROUND(privy_users * 100.0 / NULLIF(total_users, 0), 2);
    RAISE NOTICE 'Privy Email-Only (NEED MIGRATION): %', privy_email_only;
    RAISE NOTICE 'Privy with Wallet (CAN USE WALLET): %', privy_with_wallet;
    RAISE NOTICE '==========================================';
    
    IF privy_email_only > 0 THEN
        RAISE NOTICE '⚠️  ACTION REQUIRED: % users need email/password migration', privy_email_only;
    ELSE
        RAISE NOTICE '✅ All Privy users have wallets - can switch to wallet auth';
    END IF;
END $$;

