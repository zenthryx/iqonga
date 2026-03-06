-- SAFE Payment System Migration
-- This version checks for existing data before dropping tables

-- ==========================================
-- STEP 1: ADD NEW COLUMNS TO USERS TABLE
-- ==========================================

-- Add user tier and pricing columns (safe - won't drop existing data)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS user_tier VARCHAR(20) DEFAULT 'standard' CHECK (user_tier IN ('token_holder', 'standard'));

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS pricing_multiplier DECIMAL(3,2) DEFAULT 1.20;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS preferred_payment_method VARCHAR(50);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'RW';

-- Irembo Pay specific columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS irembo_pay_customer_id VARCHAR(255);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS irembo_pay_phone VARCHAR(20);

-- Stripe specific columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(user_tier);
CREATE INDEX IF NOT EXISTS idx_users_payment_method ON users(preferred_payment_method);
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country_code);
CREATE INDEX IF NOT EXISTS idx_users_irembo_customer ON users(irembo_pay_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

-- Update existing token holders to correct tier
UPDATE users 
SET user_tier = 'token_holder',
    pricing_multiplier = 1.00
WHERE ztr_balance >= 1000000;

-- Update non-token holders to standard tier with 20% premium
UPDATE users 
SET user_tier = 'standard',
    pricing_multiplier = 1.20
WHERE ztr_balance < 1000000 OR ztr_balance IS NULL;

-- ==========================================
-- STEP 2: HANDLE PAYMENT_TRANSACTIONS TABLE
-- ==========================================

-- Only create if doesn't exist
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Payment details
    payment_provider VARCHAR(50) NOT NULL CHECK (payment_provider IN ('irembo_pay', 'stripe', 'paypal', 'crypto')),
    payment_method VARCHAR(50),
    
    -- Transaction info
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    external_reference VARCHAR(255),
    amount DECIMAL(20, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'RWF',
    credits_purchased INTEGER NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
    failure_reason TEXT,
    
    -- Provider specific data
    provider_data JSONB,
    
    -- Webhook tracking
    webhook_received_at TIMESTAMP WITH TIME ZONE,
    webhook_data JSONB,
    
    -- Timestamps
    initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON payment_transactions(payment_provider);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- ==========================================
-- STEP 3: HANDLE USER_PAYMENT_METHODS TABLE
-- ==========================================

-- Only create if doesn't exist
CREATE TABLE IF NOT EXISTS user_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Payment method details
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('irembo_pay', 'stripe', 'paypal')),
    method_type VARCHAR(50) NOT NULL,
    
    -- Stored details (tokenized)
    provider_method_id VARCHAR(255),
    last_four VARCHAR(4),
    expiry_month INTEGER,
    expiry_year INTEGER,
    brand VARCHAR(50),
    
    -- Phone number for mobile money
    phone_number VARCHAR(20),
    
    -- Settings
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    nickname VARCHAR(100),
    country_code VARCHAR(2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(user_id, provider, provider_method_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_payment_methods_user ON user_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payment_methods_default ON user_payment_methods(user_id, is_default) WHERE is_default = true;

-- ==========================================
-- STEP 4: HANDLE CREDIT_PACKAGES TABLE
-- ==========================================

-- Check if credit_packages exists and has data
DO $$
DECLARE
    table_exists BOOLEAN;
    row_count INTEGER;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'credit_packages'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Count rows
        SELECT COUNT(*) INTO row_count FROM credit_packages;
        
        IF row_count > 0 THEN
            RAISE NOTICE '⚠️  credit_packages table exists with % rows', row_count;
            RAISE NOTICE '⚠️  Skipping table recreation to preserve data';
            RAISE NOTICE '⚠️  Review existing packages and update manually if needed';
        ELSE
            RAISE NOTICE 'credit_packages exists but is empty, will recreate';
            DROP TABLE credit_packages CASCADE;
        END IF;
    END IF;
END $$;

-- Create credit_packages if it doesn't exist
CREATE TABLE IF NOT EXISTS credit_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Package details
    package_name VARCHAR(100) NOT NULL,
    credits INTEGER NOT NULL,
    
    -- Pricing for different users
    base_price_usd DECIMAL(10, 2) NOT NULL,
    base_price_rwf DECIMAL(10, 2),
    
    -- Bonus credits
    bonus_credits INTEGER DEFAULT 0,
    total_credits INTEGER NOT NULL,
    
    -- Display
    is_popular BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    description TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default credit packages (only if table is empty)
INSERT INTO credit_packages (package_name, credits, base_price_usd, base_price_rwf, bonus_credits, total_credits, is_popular, display_order)
SELECT 'Starter', 100, 1.00, 1300, 0, 100, false, 1
WHERE NOT EXISTS (SELECT 1 FROM credit_packages WHERE package_name = 'Starter')
UNION ALL
SELECT 'Basic', 500, 5.00, 6500, 50, 550, false, 2
WHERE NOT EXISTS (SELECT 1 FROM credit_packages WHERE package_name = 'Basic')
UNION ALL
SELECT 'Pro', 1000, 10.00, 13000, 150, 1150, true, 3
WHERE NOT EXISTS (SELECT 1 FROM credit_packages WHERE package_name = 'Pro')
UNION ALL
SELECT 'Business', 5000, 50.00, 65000, 1000, 6000, false, 4
WHERE NOT EXISTS (SELECT 1 FROM credit_packages WHERE package_name = 'Business')
UNION ALL
SELECT 'Enterprise', 10000, 100.00, 130000, 2500, 12500, false, 5
WHERE NOT EXISTS (SELECT 1 FROM credit_packages WHERE package_name = 'Enterprise');

-- ==========================================
-- STEP 5: CREATE TRIGGER FUNCTION
-- ==========================================

-- Function to automatically update pricing multiplier based on token balance
CREATE OR REPLACE FUNCTION update_user_tier_on_balance_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if ztr_balance changed
    IF NEW.ztr_balance IS DISTINCT FROM OLD.ztr_balance THEN
        -- Update tier based on new balance
        IF NEW.ztr_balance >= 1000000 THEN
            NEW.user_tier := 'token_holder';
            NEW.pricing_multiplier := 1.00;
        ELSE
            NEW.user_tier := 'standard';
            NEW.pricing_multiplier := 1.20;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update user tier
DROP TRIGGER IF EXISTS trigger_update_user_tier ON users;
CREATE TRIGGER trigger_update_user_tier
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_tier_on_balance_change();

-- ==========================================
-- STEP 6: ADD COMMENTS
-- ==========================================

COMMENT ON COLUMN users.user_tier IS 'User tier: token_holder (1M+ ZTR) or standard (no tokens)';
COMMENT ON COLUMN users.pricing_multiplier IS 'Pricing multiplier: 1.00 for token holders, 1.20 for standard users (20% premium)';
COMMENT ON COLUMN users.preferred_payment_method IS 'User preferred payment method';
COMMENT ON COLUMN users.irembo_pay_customer_id IS 'Irembo Pay customer ID';
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID';
COMMENT ON TABLE payment_transactions IS 'All payment transactions from any provider';
COMMENT ON TABLE user_payment_methods IS 'User saved payment methods (tokenized)';
COMMENT ON TABLE credit_packages IS 'Available credit packages with pricing';

-- ==========================================
-- STEP 7: SUMMARY
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '  - Users table: Added tier and pricing columns';
    RAISE NOTICE '  - Payment transactions: Created (if not exists)';
    RAISE NOTICE '  - User payment methods: Created (if not exists)';
    RAISE NOTICE '  - Credit packages: Created/Updated';
    RAISE NOTICE '  - Trigger: Auto-update user tier on balance change';
END $$;

