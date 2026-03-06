-- Add Payment System and User Tier Support
-- This migration adds support for dual-tier pricing and multiple payment methods

-- Add user tier and pricing columns
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

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Payment details
    payment_provider VARCHAR(50) NOT NULL CHECK (payment_provider IN ('irembo_pay', 'stripe', 'paypal', 'crypto')),
    payment_method VARCHAR(50), -- 'mobile_money', 'credit_card', 'debit_card', 'SOL', 'USDC'
    
    -- Transaction info
    transaction_id VARCHAR(255) UNIQUE NOT NULL, -- Provider's transaction ID
    external_reference VARCHAR(255), -- Provider's external reference
    amount DECIMAL(20, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'RWF', -- RWF for Rwanda, USD for others
    credits_purchased INTEGER NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
    failure_reason TEXT,
    
    -- Provider specific data (JSON)
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

-- Indexes for payment transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON payment_transactions(payment_provider);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- Payment methods table (user's saved payment methods)
CREATE TABLE IF NOT EXISTS user_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Payment method details
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('irembo_pay', 'stripe', 'paypal')),
    method_type VARCHAR(50) NOT NULL, -- 'mobile_money', 'credit_card', 'debit_card'
    
    -- Stored details (tokenized)
    provider_method_id VARCHAR(255), -- Stripe payment method ID, Irembo Pay token, etc.
    last_four VARCHAR(4), -- Last 4 digits of card or phone
    expiry_month INTEGER,
    expiry_year INTEGER,
    brand VARCHAR(50), -- 'Visa', 'Mastercard', 'MTN Mobile Money', etc.
    
    -- Phone number for mobile money
    phone_number VARCHAR(20),
    
    -- Settings
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    nickname VARCHAR(100), -- User's custom name for this payment method
    country_code VARCHAR(2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(user_id, provider, provider_method_id)
);

-- Indexes for payment methods
CREATE INDEX IF NOT EXISTS idx_user_payment_methods_user ON user_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payment_methods_default ON user_payment_methods(user_id, is_default) WHERE is_default = true;

-- Drop existing credit_packages table if it has old structure
DROP TABLE IF EXISTS credit_packages CASCADE;

-- Credit purchase packages with tiered pricing
CREATE TABLE credit_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Package details
    package_name VARCHAR(100) NOT NULL,
    credits INTEGER NOT NULL,
    
    -- Pricing for different users
    base_price_usd DECIMAL(10, 2) NOT NULL, -- Base price in USD
    base_price_rwf DECIMAL(10, 2), -- Price in Rwandan Francs
    
    -- Bonus credits
    bonus_credits INTEGER DEFAULT 0,
    total_credits INTEGER NOT NULL, -- credits + bonus_credits
    
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

-- Insert default credit packages
INSERT INTO credit_packages (package_name, credits, base_price_usd, base_price_rwf, bonus_credits, total_credits, is_popular, display_order)
VALUES 
    ('Starter', 100, 1.00, 1300, 0, 100, false, 1),
    ('Basic', 500, 5.00, 6500, 50, 550, false, 2),
    ('Pro', 1000, 10.00, 13000, 150, 1150, true, 3),
    ('Business', 5000, 50.00, 65000, 1000, 6000, false, 4),
    ('Enterprise', 10000, 100.00, 130000, 2500, 12500, false, 5)
ON CONFLICT DO NOTHING;

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

-- Comments for documentation
COMMENT ON COLUMN users.user_tier IS 'User tier: token_holder (1M+ ZTR) or standard (no tokens)';
COMMENT ON COLUMN users.pricing_multiplier IS 'Pricing multiplier: 1.00 for token holders, 1.20 for standard users (20% premium)';
COMMENT ON COLUMN users.preferred_payment_method IS 'User preferred payment method';
COMMENT ON COLUMN users.irembo_pay_customer_id IS 'Irembo Pay customer ID';
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID';
COMMENT ON TABLE payment_transactions IS 'All payment transactions from any provider';
COMMENT ON TABLE user_payment_methods IS 'User saved payment methods (tokenized)';
COMMENT ON TABLE credit_packages IS 'Available credit packages with pricing';

-- Grant permissions (adjust role name as needed)
-- GRANT SELECT, INSERT, UPDATE ON payment_transactions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON user_payment_methods TO your_app_user;
-- GRANT SELECT ON credit_packages TO your_app_user;

