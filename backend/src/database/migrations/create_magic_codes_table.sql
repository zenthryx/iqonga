-- Create magic_codes table for passwordless authentication
-- Stores 6-digit codes sent via email

CREATE TABLE IF NOT EXISTS magic_codes (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT idx_magic_codes_email UNIQUE (email)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_magic_codes_expires_at ON magic_codes(expires_at);

-- Auto-cleanup expired codes (runs every hour)
-- You can set up a cron job or use pg_cron extension for this
-- DELETE FROM magic_codes WHERE expires_at < NOW();

-- Comments for documentation
COMMENT ON TABLE magic_codes IS 'Stores 6-digit magic codes for passwordless authentication';
COMMENT ON COLUMN magic_codes.email IS 'User email address';
COMMENT ON COLUMN magic_codes.code IS '6-digit verification code';
COMMENT ON COLUMN magic_codes.expires_at IS 'Code expiration time (15 minutes from creation)';
COMMENT ON COLUMN magic_codes.attempts IS 'Number of failed verification attempts';

