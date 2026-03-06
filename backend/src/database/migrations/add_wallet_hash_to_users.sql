-- Add wallet_hash column to users table
-- This migration adds a wallet_hash column for more stable user identification
-- The wallet_hash will be a SHA-256 hash of the wallet address

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS wallet_hash TEXT;

-- Create index on wallet_hash for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_hash ON users(wallet_hash);

-- Update existing rows with wallet_hash if wallet_address exists
UPDATE users 
SET wallet_hash = encode(sha256(wallet_address::bytea), 'hex')
WHERE wallet_address IS NOT NULL AND wallet_hash IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.wallet_hash IS 'SHA-256 hash of wallet address for stable user identification';
