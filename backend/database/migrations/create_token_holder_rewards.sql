-- Create tables for token holder reward system
-- This system tracks daily token balances and distributes monthly rewards

-- Daily token balance snapshots
CREATE TABLE IF NOT EXISTS token_balance_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) NOT NULL,
    ztr_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
    snapshot_date DATE NOT NULL,
    snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, snapshot_date)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_token_snapshots_user_date ON token_balance_snapshots(user_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_token_snapshots_date ON token_balance_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_token_snapshots_wallet ON token_balance_snapshots(wallet_address);

-- Monthly token holder rewards
CREATE TABLE IF NOT EXISTS token_holder_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_month DATE NOT NULL, -- First day of the month (YYYY-MM-01)
    ztr_balance_avg DECIMAL(20, 8) NOT NULL DEFAULT 0, -- Average balance for the month
    ztr_balance_min DECIMAL(20, 8) NOT NULL DEFAULT 0, -- Minimum balance during the month
    days_held INTEGER NOT NULL DEFAULT 0, -- Number of days user held tokens above threshold
    reward_tier VARCHAR(50), -- 'tier_1m', 'tier_5m', 'tier_10m'
    credits_awarded INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'distributed', 'failed', 'skipped')),
    distribution_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, reward_month)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_token_rewards_user_month ON token_holder_rewards(user_id, reward_month);
CREATE INDEX IF NOT EXISTS idx_token_rewards_month ON token_holder_rewards(reward_month);
CREATE INDEX IF NOT EXISTS idx_token_rewards_status ON token_holder_rewards(status);

-- Reward tier configuration (can be managed via admin)
CREATE TABLE IF NOT EXISTS token_reward_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_name VARCHAR(50) UNIQUE NOT NULL,
    min_balance DECIMAL(20, 8) NOT NULL,
    credits_per_month INTEGER NOT NULL,
    min_holding_days INTEGER NOT NULL DEFAULT 20, -- Minimum days to hold in month to qualify
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default reward tiers (optional - you can delete these and start with your own single tier)
-- To start with just one tier, delete the other two after running this migration
INSERT INTO token_reward_tiers (tier_name, min_balance, credits_per_month, min_holding_days, description)
VALUES 
    ('tier_1m', 1000000, 500, 20, 'Hold 1M+ ZTR tokens for at least 20 days in the month'),
    ('tier_5m', 5000000, 1000, 20, 'Hold 5M+ ZTR tokens for at least 20 days in the month'),
    ('tier_10m', 10000000, 3000, 20, 'Hold 10M+ ZTR tokens for at least 20 days in the month')
ON CONFLICT (tier_name) DO NOTHING;

-- Note: You can customize these tiers or start with just one tier via the admin dashboard
-- All values (min_balance, credits_per_month, min_holding_days) are fully customizable

