-- Referral & Affiliate System Migration
-- Creates tables for tracking referrals and processing USDC rewards

-- 1. Referral Codes Table
CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    referral_link VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    total_signups INTEGER DEFAULT 0,
    total_earnings DECIMAL(10, 6) DEFAULT 0, -- USDC earnings
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON referral_codes(is_active) WHERE is_active = true;

-- 2. Referrals Table (tracks who referred whom)
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referral_code VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, expired
    first_purchase_at TIMESTAMP,
    total_purchases DECIMAL(10, 4) DEFAULT 0, -- Total credits purchased
    total_earnings DECIMAL(10, 6) DEFAULT 0, -- Total USDC earned by referrer
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(referred_user_id) -- One referral per user
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- 3. Referral Rewards Table (logs all reward transactions)
CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_type VARCHAR(20) NOT NULL, -- 'signup_bonus', 'purchase_commission', 'first_purchase_bonus'
    purchase_amount DECIMAL(10, 4) NOT NULL, -- Credits purchased
    reward_percentage DECIMAL(5, 2) NOT NULL,
    usdc_amount DECIMAL(10, 6) NOT NULL, -- USDC amount (6 decimals)
    credits_awarded DECIMAL(10, 4) DEFAULT 0, -- For referee bonuses only
    solana_transaction_signature VARCHAR(255), -- Blockchain transaction signature
    transaction_id UUID REFERENCES credit_transactions(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed, retrying
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred ON referral_rewards(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referral ON referral_rewards(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON referral_rewards(status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_pending ON referral_rewards(status) WHERE status IN ('pending', 'retrying');

-- 4. Referral Payout Queue (USDC payment queue)
CREATE TABLE IF NOT EXISTS referral_payout_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reward_id UUID NOT NULL REFERENCES referral_rewards(id) ON DELETE CASCADE,
    referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referrer_wallet_address VARCHAR(44) NOT NULL,
    usdc_amount DECIMAL(10, 6) NOT NULL,
    priority INTEGER DEFAULT 0, -- Higher priority processed first
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status VARCHAR(20) DEFAULT 'queued', -- queued, processing, completed, failed
    transaction_signature VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_payout_queue_status ON referral_payout_queue(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_referral_payout_queue_referrer ON referral_payout_queue(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_payout_queue_queued ON referral_payout_queue(status, created_at) WHERE status = 'queued';

-- 5. Referral Settings Table (Admin Configuration)
CREATE TABLE IF NOT EXISTS referral_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by INTEGER REFERENCES users(id)
);

-- Insert default settings
INSERT INTO referral_settings (setting_key, setting_value, description) VALUES
('referrer_commission_percentage', '20', 'Percentage of purchase amount given to referrer in USDC'),
('referee_first_purchase_bonus_percentage', '20', 'Bonus percentage for referee first purchase (in credits)'),
('minimum_purchase_amount', '100', 'Minimum purchase in credits to qualify for rewards'),
('minimum_usdc_payout', '0.01', 'Minimum USDC amount to trigger payout (prevents dust)'),
('reward_cap_per_transaction', '0', 'Maximum reward per transaction in USDC (0 = unlimited)'),
('referral_code_expiry_days', '0', 'Days until referral code expires (0 = never)'),
('usdc_payout_batch_size', '10', 'Number of payouts to batch together'),
('usdc_payout_delay_seconds', '0', 'Delay before processing payout (0 = immediate)'),
('gas_fee_coverage', 'true', 'Platform covers gas fees for USDC transfers'),
('is_active', 'true', 'Enable/disable referral system')
ON CONFLICT (setting_key) DO NOTHING;

-- Add referral_code column to users table (to track which code was used during signup)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'referral_code_used'
    ) THEN
        ALTER TABLE users ADD COLUMN referral_code_used VARCHAR(50);
        CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code_used);
    END IF;
END $$;

