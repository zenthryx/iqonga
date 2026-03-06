-- Audit Existing Privy Users (SAFE VERSION)
-- Works with any database schema - checks column existence first

-- ==========================================
-- 1. CHECK WHAT COLUMNS EXIST
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'COLUMN EXISTENCE CHECK';
    RAISE NOTICE '==========================================';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='privy_user_id') THEN
        RAISE NOTICE '✅ privy_user_id column EXISTS';
    ELSE
        RAISE NOTICE '❌ privy_user_id column MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='auth_method') THEN
        RAISE NOTICE '✅ auth_method column EXISTS';
    ELSE
        RAISE NOTICE '❌ auth_method column MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified') THEN
        RAISE NOTICE '✅ email_verified column EXISTS';
    ELSE
        RAISE NOTICE '❌ email_verified column MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='user_tier') THEN
        RAISE NOTICE '✅ user_tier column EXISTS';
    ELSE
        RAISE NOTICE '❌ user_tier column MISSING (will be added during migration)';
    END IF;
    
    RAISE NOTICE '==========================================';
END $$;

-- ==========================================
-- 2. BASIC USER STATISTICS
-- ==========================================

SELECT 
    'Total Users' as metric,
    COUNT(*) as count
FROM users

UNION ALL

SELECT 
    'Users with Email' as metric,
    COUNT(*) as count
FROM users
WHERE email IS NOT NULL

UNION ALL

SELECT 
    'Users with Wallet' as metric,
    COUNT(*) as count
FROM users
WHERE wallet_address IS NOT NULL;

-- ==========================================
-- 3. CHECK FOR PRIVY USERS (IF COLUMN EXISTS)
-- ==========================================

DO $$
DECLARE
    has_privy_column BOOLEAN;
    privy_count INTEGER := 0;
BEGIN
    -- Check if privy_user_id column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='privy_user_id'
    ) INTO has_privy_column;
    
    IF has_privy_column THEN
        -- Count Privy users
        EXECUTE 'SELECT COUNT(*) FROM users WHERE privy_user_id IS NOT NULL' INTO privy_count;
        
        RAISE NOTICE '==========================================';
        RAISE NOTICE 'PRIVY USERS FOUND: %', privy_count;
        RAISE NOTICE '==========================================';
        
        IF privy_count > 0 THEN
            RAISE NOTICE '⚠️  You have % Privy users that need migration!', privy_count;
        ELSE
            RAISE NOTICE '✅ No Privy users found - you may not have used Privy yet';
        END IF;
    ELSE
        RAISE NOTICE '==========================================';
        RAISE NOTICE 'NO PRIVY COLUMN FOUND';
        RAISE NOTICE '==========================================';
        RAISE NOTICE '✅ You have not added Privy support yet';
        RAISE NOTICE 'This means you can skip the Privy migration!';
    END IF;
END $$;

-- ==========================================
-- 4. LIST ALL USERS (Basic Info)
-- ==========================================

SELECT 
    id,
    email,
    username,
    wallet_address,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 20;

-- ==========================================
-- 5. DETAILED PRIVY USER LIST (IF PRIVY EXISTS)
-- ==========================================

DO $$
DECLARE
    has_privy_column BOOLEAN;
    has_auth_method BOOLEAN;
    has_email_verified BOOLEAN;
    query_text TEXT;
BEGIN
    -- Check which columns exist
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='privy_user_id') INTO has_privy_column;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='auth_method') INTO has_auth_method;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified') INTO has_email_verified;
    
    IF has_privy_column THEN
        RAISE NOTICE '==========================================';
        RAISE NOTICE 'PRIVY USER DETAILS';
        RAISE NOTICE '==========================================';
        
        -- Build dynamic query
        query_text := 'SELECT id, email, username, wallet_address';
        
        IF has_auth_method THEN
            query_text := query_text || ', auth_method';
        END IF;
        
        IF has_email_verified THEN
            query_text := query_text || ', email_verified';
        END IF;
        
        query_text := query_text || ', created_at FROM users WHERE privy_user_id IS NOT NULL ORDER BY created_at DESC';
        
        -- Execute query
        RAISE NOTICE 'Executing: %', query_text;
        EXECUTE query_text;
    END IF;
END $$;

-- ==========================================
-- 6. MIGRATION ACTION REQUIRED SUMMARY
-- ==========================================

DO $$
DECLARE
    total_users INTEGER := 0;
    privy_users INTEGER := 0;
    privy_email_only INTEGER := 0;
    privy_with_wallet INTEGER := 0;
    has_privy_column BOOLEAN;
BEGIN
    -- Check if privy column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='privy_user_id'
    ) INTO has_privy_column;
    
    SELECT COUNT(*) INTO total_users FROM users;
    
    IF has_privy_column THEN
        EXECUTE 'SELECT COUNT(*) FROM users WHERE privy_user_id IS NOT NULL' INTO privy_users;
        EXECUTE 'SELECT COUNT(*) FROM users WHERE privy_user_id IS NOT NULL AND wallet_address IS NULL' INTO privy_email_only;
        EXECUTE 'SELECT COUNT(*) FROM users WHERE privy_user_id IS NOT NULL AND wallet_address IS NOT NULL' INTO privy_with_wallet;
    END IF;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'MIGRATION ACTION REQUIRED SUMMARY';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Total Users: %', total_users;
    
    IF has_privy_column THEN
        RAISE NOTICE 'Privy Users: % (% of total)', privy_users, ROUND(privy_users * 100.0 / NULLIF(total_users, 0), 2) || '%';
        RAISE NOTICE 'Privy Email-Only (NEED MIGRATION): %', privy_email_only;
        RAISE NOTICE 'Privy with Wallet (CAN USE WALLET): %', privy_with_wallet;
        RAISE NOTICE '==========================================';
        
        IF privy_email_only > 0 THEN
            RAISE NOTICE '⚠️  ACTION REQUIRED: % users need email/password migration', privy_email_only;
            RAISE NOTICE 'Next steps:';
            RAISE NOTICE '1. Add password fields to users table';
            RAISE NOTICE '2. Install bcrypt: npm install bcrypt';
            RAISE NOTICE '3. Add AuthService.js and auth-email.js routes';
            RAISE NOTICE '4. Send migration emails to users';
        ELSIF privy_users > 0 AND privy_with_wallet > 0 THEN
            RAISE NOTICE '✅ All % Privy users have wallets - can switch to wallet auth', privy_users;
            RAISE NOTICE 'These users can continue using wallet login!';
        ELSE
            RAISE NOTICE '✅ No Privy email-only users - migration is simple!';
        END IF;
    ELSE
        RAISE NOTICE '✅ No Privy integration detected';
        RAISE NOTICE 'You can skip the Privy migration entirely!';
        RAISE NOTICE 'Just implement email/password auth for new users.';
    END IF;
    
    RAISE NOTICE '==========================================';
END $$;

-- ==========================================
-- 7. EMAILS FOR MIGRATION (IF NEEDED)
-- ==========================================

DO $$
DECLARE
    has_privy_column BOOLEAN;
    privy_email_only INTEGER := 0;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='privy_user_id'
    ) INTO has_privy_column;
    
    IF has_privy_column THEN
        EXECUTE 'SELECT COUNT(*) FROM users WHERE privy_user_id IS NOT NULL AND wallet_address IS NULL AND email IS NOT NULL' INTO privy_email_only;
        
        IF privy_email_only > 0 THEN
            RAISE NOTICE '==========================================';
            RAISE NOTICE 'EMAILS TO NOTIFY (% users)', privy_email_only;
            RAISE NOTICE '==========================================';
            
            -- List emails that need migration notification
            EXECUTE 'SELECT email, username FROM users WHERE privy_user_id IS NOT NULL AND wallet_address IS NULL AND email IS NOT NULL ORDER BY email';
        END IF;
    END IF;
END $$;

