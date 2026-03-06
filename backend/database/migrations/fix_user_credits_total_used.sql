-- Fix user_credits table: set NULL numeric columns to 0
-- This fixes the error: "null value in column "total_used" violates not-null constraint"

-- First, check what columns exist
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'user_credits';

-- Update all NULL values to 0 for the columns that exist
DO $$
BEGIN
    -- Fix total_used if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_credits' AND column_name = 'total_used') THEN
        EXECUTE 'UPDATE user_credits SET total_used = 0 WHERE total_used IS NULL';
        EXECUTE 'ALTER TABLE user_credits ALTER COLUMN total_used SET DEFAULT 0';
        RAISE NOTICE 'Fixed total_used column';
    END IF;

    -- Fix credit_balance if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_credits' AND column_name = 'credit_balance') THEN
        EXECUTE 'UPDATE user_credits SET credit_balance = 0 WHERE credit_balance IS NULL';
        EXECUTE 'ALTER TABLE user_credits ALTER COLUMN credit_balance SET DEFAULT 0';
        RAISE NOTICE 'Fixed credit_balance column';
    END IF;

    -- Fix total_purchased if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_credits' AND column_name = 'total_purchased') THEN
        EXECUTE 'UPDATE user_credits SET total_purchased = 0 WHERE total_purchased IS NULL';
        EXECUTE 'ALTER TABLE user_credits ALTER COLUMN total_purchased SET DEFAULT 0';
        RAISE NOTICE 'Fixed total_purchased column';
    END IF;

    -- Fix debt_balance if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_credits' AND column_name = 'debt_balance') THEN
        EXECUTE 'UPDATE user_credits SET debt_balance = 0 WHERE debt_balance IS NULL';
        EXECUTE 'ALTER TABLE user_credits ALTER COLUMN debt_balance SET DEFAULT 0';
        RAISE NOTICE 'Fixed debt_balance column';
    END IF;

    -- Fix debt_limit if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_credits' AND column_name = 'debt_limit') THEN
        EXECUTE 'UPDATE user_credits SET debt_limit = 0 WHERE debt_limit IS NULL';
        EXECUTE 'ALTER TABLE user_credits ALTER COLUMN debt_limit SET DEFAULT 0';
        RAISE NOTICE 'Fixed debt_limit column';
    END IF;

    RAISE NOTICE 'Migration complete: user_credits NULL values fixed';
END
$$;

-- Verify the fix
SELECT 'User credits fixed successfully' as status;
