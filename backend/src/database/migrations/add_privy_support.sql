-- Add Privy support to users table
-- This migration adds fields needed for Privy authentication

-- Add Privy user ID column (unique identifier from Privy)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS privy_user_id TEXT UNIQUE;

-- Add authentication method column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_method TEXT DEFAULT 'wallet';

-- Add email verified flag
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Add subscription_tier column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='subscription_tier') THEN
        ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'basic';
    END IF;
END $$;

-- Add token_balance column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='token_balance') THEN
        ALTER TABLE users ADD COLUMN token_balance NUMERIC(20, 9) DEFAULT 0;
    END IF;
END $$;

-- Add wallet_address column (if not exists) for embedded wallets
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='wallet_address') THEN
        ALTER TABLE users ADD COLUMN wallet_address VARCHAR(255);
    END IF;
END $$;

-- Add ZTR token balance and threshold columns (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='ztr_balance') THEN
        ALTER TABLE users ADD COLUMN ztr_balance NUMERIC(20, 9) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='ztr_threshold') THEN
        ALTER TABLE users ADD COLUMN ztr_threshold NUMERIC(20, 9) DEFAULT 1000000;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='token_access_enabled') THEN
        ALTER TABLE users ADD COLUMN token_access_enabled BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create index for Privy user lookup
CREATE INDEX IF NOT EXISTS idx_users_privy_id ON users(privy_user_id);

-- Update existing users to mark email as verified if they have email
UPDATE users 
SET email_verified = true 
WHERE email IS NOT NULL AND email != '';

-- Update existing users to have default subscription_tier if null
UPDATE users 
SET subscription_tier = 'basic'
WHERE subscription_tier IS NULL;

-- Update existing users to have default token_balance if null
UPDATE users 
SET token_balance = 0
WHERE token_balance IS NULL;

-- Update existing users to have token_access_enabled true if they have a wallet address
UPDATE users
SET token_access_enabled = TRUE
WHERE wallet_address IS NOT NULL AND token_access_enabled IS NULL;

-- Create index for auth method lookup
CREATE INDEX IF NOT EXISTS idx_users_auth_method ON users(auth_method);

-- Comments for documentation
COMMENT ON COLUMN users.privy_user_id IS 'Unique identifier from Privy authentication service';
COMMENT ON COLUMN users.auth_method IS 'Authentication method used: wallet, email, google, etc.';
COMMENT ON COLUMN users.email_verified IS 'Whether the user email has been verified';
COMMENT ON COLUMN users.subscription_tier IS 'User subscription tier: basic, premium, etc.';
COMMENT ON COLUMN users.token_balance IS 'User token balance for platform credits';
COMMENT ON COLUMN users.wallet_address IS 'Wallet address (Solana or Ethereum) for embedded wallets';
COMMENT ON COLUMN users.ztr_balance IS 'Current ZTR token balance in wallet';
COMMENT ON COLUMN users.ztr_threshold IS 'Required ZTR token threshold for access (default 1M)';
COMMENT ON COLUMN users.token_access_enabled IS 'Whether user has sufficient ZTR tokens for premium features';

