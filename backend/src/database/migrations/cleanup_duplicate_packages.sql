-- Clean up duplicate credit packages (Optional)
-- Run this AFTER update_credit_packages.sql

-- ==========================================
-- STEP 1: VIEW DUPLICATES
-- ==========================================

-- See which packages are duplicated
SELECT 
    name,
    credits,
    price_usdc,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id::text) as package_ids
FROM credit_packages
GROUP BY name, credits, price_usdc
HAVING COUNT(*) > 1
ORDER BY name;

-- ==========================================
-- STEP 2: KEEP ONLY UNIQUE PACKAGES
-- ==========================================

-- This will delete duplicates, keeping only the FIRST occurrence of each package
-- (based on created_at timestamp - keeps the oldest)

DELETE FROM credit_packages 
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY name, credits, price_usdc 
                   ORDER BY created_at ASC
               ) AS row_num
        FROM credit_packages
    ) t
    WHERE t.row_num > 1
);

-- ==========================================
-- STEP 3: VERIFY CLEANUP
-- ==========================================

-- Should now see only unique packages
SELECT 
    name,
    credits,
    bonus_credits,
    total_credits,
    base_price_usd,
    base_price_rwf,
    is_popular,
    display_order
FROM credit_packages
ORDER BY display_order;

-- Count total packages (should be 5 unique ones)
SELECT COUNT(*) as total_unique_packages FROM credit_packages;

-- ==========================================
-- EXPECTED RESULT: 5 PACKAGES
-- ==========================================

/*
1. Starter Pack: 100 credits, 1,300 RWF
2. Basic Pack: 500 credits (+ 50 bonus = 550), 6,500 RWF
3. Pro Pack: 1000 credits (+ 150 bonus = 1,150), 13,000 RWF ⭐ Popular
4. Premium Pack: 2500 credits (+ 500 bonus = 3,000), 32,500 RWF
5. Enterprise Pack: 5000 credits (+ 1,250 bonus = 6,250), 65,000 RWF
*/

DO $$
DECLARE
    package_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO package_count FROM credit_packages;
    
    RAISE NOTICE '✅ Duplicate cleanup completed!';
    RAISE NOTICE '📊 Total unique packages: %', package_count;
    RAISE NOTICE 'Expected: 5 packages (Starter, Basic, Pro, Premium, Enterprise)';
END $$;

