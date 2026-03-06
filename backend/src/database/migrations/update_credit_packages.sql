-- Update credit_packages table to add new columns for dual-tier pricing
-- This preserves all existing data

-- ==========================================
-- ADD MISSING COLUMNS
-- ==========================================

-- Add package_name (will copy from name)
ALTER TABLE credit_packages 
ADD COLUMN IF NOT EXISTS package_name VARCHAR(100);

-- Add base_price_usd (will copy from price_usdc)
ALTER TABLE credit_packages 
ADD COLUMN IF NOT EXISTS base_price_usd DECIMAL(10, 2);

-- Add base_price_rwf (Rwanda pricing - 1 USD = 1,300 RWF)
ALTER TABLE credit_packages 
ADD COLUMN IF NOT EXISTS base_price_rwf DECIMAL(10, 2);

-- Add total_credits (credits + bonus_credits)
ALTER TABLE credit_packages 
ADD COLUMN IF NOT EXISTS total_credits INTEGER;

-- Add is_popular flag
ALTER TABLE credit_packages 
ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;

-- Add display_order (will copy from sort_order)
ALTER TABLE credit_packages 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add description if needed
ALTER TABLE credit_packages 
ADD COLUMN IF NOT EXISTS description TEXT;

-- ==========================================
-- POPULATE NEW COLUMNS WITH DATA
-- ==========================================

-- Copy name to package_name
UPDATE credit_packages 
SET package_name = name 
WHERE package_name IS NULL;

-- Copy price_usdc to base_price_usd
UPDATE credit_packages 
SET base_price_usd = price_usdc 
WHERE base_price_usd IS NULL;

-- Calculate Rwanda pricing (1 USD = 1,300 RWF)
UPDATE credit_packages 
SET base_price_rwf = price_usdc * 1300 
WHERE base_price_rwf IS NULL;

-- Calculate total_credits
UPDATE credit_packages 
SET total_credits = credits + COALESCE(bonus_credits, 0) 
WHERE total_credits IS NULL;

-- Copy sort_order to display_order
UPDATE credit_packages 
SET display_order = COALESCE(sort_order, 0) 
WHERE display_order IS NULL OR display_order = 0;

-- Mark Pro Pack as popular (1000 credits)
UPDATE credit_packages 
SET is_popular = true 
WHERE name = 'Pro Pack' AND credits = 1000;

-- ==========================================
-- ADD DESCRIPTIONS
-- ==========================================

-- Add helpful descriptions
UPDATE credit_packages SET description = 'Perfect for trying out the platform' 
WHERE name = 'Starter Pack' AND credits = 100;

UPDATE credit_packages SET description = 'Great for regular users with bonus credits' 
WHERE name = 'Basic Pack' AND credits = 500;

UPDATE credit_packages SET description = 'Most popular choice - best value!' 
WHERE name = 'Pro Pack' AND credits = 1000;

UPDATE credit_packages SET description = 'For power users and small teams' 
WHERE name = 'Premium Pack' AND credits = 2500;

UPDATE credit_packages SET description = 'Maximum credits for large scale operations' 
WHERE name = 'Enterprise Pack' AND credits = 5000;

-- ==========================================
-- CLEAN UP DUPLICATES (Optional)
-- ==========================================

-- Show duplicates first
SELECT name, credits, COUNT(*) as count
FROM credit_packages
GROUP BY name, credits
HAVING COUNT(*) > 1;

-- Optional: Delete duplicates keeping the oldest record
-- Uncomment if you want to clean up duplicates:
/*
DELETE FROM credit_packages a USING credit_packages b
WHERE a.id > b.id 
AND a.name = b.name 
AND a.credits = b.credits;
*/

-- ==========================================
-- VERIFY RESULTS
-- ==========================================

SELECT 
    name,
    package_name,
    credits,
    bonus_credits,
    total_credits,
    base_price_usd,
    base_price_rwf,
    is_popular,
    display_order,
    description
FROM credit_packages
ORDER BY display_order;

-- ==========================================
-- SUMMARY
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '✅ credit_packages table updated successfully!';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '  - Added package_name column (copied from name)';
    RAISE NOTICE '  - Added base_price_usd column (copied from price_usdc)';
    RAISE NOTICE '  - Added base_price_rwf column (calculated from USD)';
    RAISE NOTICE '  - Added total_credits column (credits + bonus)';
    RAISE NOTICE '  - Added is_popular flag (Pro Pack marked popular)';
    RAISE NOTICE '  - Added display_order column (copied from sort_order)';
    RAISE NOTICE '  - Added descriptions for packages';
    RAISE NOTICE '  - All existing data preserved! ✓';
END $$;

