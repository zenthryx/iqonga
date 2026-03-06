-- Check Existing Tables Before Running Migration
-- Run these queries in pgAdmin to understand current database state

-- ==========================================
-- 1. CHECK IF TABLES EXIST
-- ==========================================

SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'payment_transactions', 
    'user_payment_methods', 
    'credit_packages'
)
ORDER BY table_name;

-- ==========================================
-- 2. CHECK USERS TABLE STRUCTURE
-- ==========================================

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users'
AND column_name IN (
    'id',
    'user_tier',
    'pricing_multiplier',
    'preferred_payment_method',
    'country_code',
    'irembo_pay_customer_id',
    'irembo_pay_phone',
    'stripe_customer_id',
    'ztr_balance'
)
ORDER BY ordinal_position;

-- ==========================================
-- 3. CHECK CREDIT_PACKAGES TABLE STRUCTURE (if exists)
-- ==========================================

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'credit_packages'
ORDER BY ordinal_position;

-- ==========================================
-- 4. CHECK EXISTING DATA IN CREDIT_PACKAGES (if exists)
-- ==========================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'credit_packages') THEN
        RAISE NOTICE '✅ credit_packages table EXISTS';
        PERFORM COUNT(*) FROM credit_packages;
        RAISE NOTICE 'Run: SELECT * FROM credit_packages; to view data';
    ELSE
        RAISE NOTICE '❌ credit_packages table does NOT exist - safe to create';
    END IF;
END $$;

-- ==========================================
-- 5. CHECK PAYMENT_TRANSACTIONS TABLE (if exists)
-- ==========================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN
        RAISE NOTICE '✅ payment_transactions table EXISTS';
        RAISE NOTICE 'Run: SELECT * FROM payment_transactions; to view data';
    ELSE
        RAISE NOTICE '❌ payment_transactions table does NOT exist - safe to create';
    END IF;
END $$;

-- ==========================================
-- 6. CHECK USER_PAYMENT_METHODS TABLE (if exists)
-- ==========================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_payment_methods') THEN
        RAISE NOTICE '✅ user_payment_methods table EXISTS';
        RAISE NOTICE 'Run: SELECT * FROM user_payment_methods; to view data';
    ELSE
        RAISE NOTICE '❌ user_payment_methods table does NOT exist - safe to create';
    END IF;
END $$;

-- ==========================================
-- 7. CHECK USERS DATA TYPE FOR ID
-- ==========================================

SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name = 'users'
AND column_name = 'id';

-- ==========================================
-- RESULTS INTERPRETATION:
-- ==========================================

/*
WHAT TO LOOK FOR:

1. If credit_packages EXISTS with DATA:
   - Note the column names (especially check if it's 'name' vs 'package_name')
   - Count how many packages exist
   - We'll need to BACKUP data before dropping

2. If payment_transactions EXISTS with DATA:
   - Check user_id data type (should match users.id type)
   - Count transactions
   - BACKUP before modifying

3. If user_payment_methods EXISTS with DATA:
   - Check user_id data type
   - Count saved methods
   - BACKUP before modifying

4. Users table:
   - Confirm 'id' is INTEGER (not UUID)
   - Check if new columns already exist

NEXT STEPS BASED ON RESULTS:
- If tables DON'T exist: Safe to run migration as-is
- If tables exist with NO data: Safe to drop and recreate
- If tables exist WITH data: We'll create backup first!
*/

