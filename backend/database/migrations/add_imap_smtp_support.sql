-- Migration: Add IMAP/SMTP Support to Email Integration
-- This extends the existing user_email_accounts table to support generic IMAP/SMTP connections

-- Add new columns for IMAP/SMTP configuration
ALTER TABLE user_email_accounts 
ADD COLUMN IF NOT EXISTS connection_type VARCHAR(20) DEFAULT 'oauth',
ADD COLUMN IF NOT EXISTS imap_host VARCHAR(255),
ADD COLUMN IF NOT EXISTS imap_port INTEGER DEFAULT 993,
ADD COLUMN IF NOT EXISTS imap_secure BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255),
ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587,
ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_password_encrypted TEXT,
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS connection_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_connection_error TEXT,
ADD COLUMN IF NOT EXISTS last_imap_check_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_smtp_check_at TIMESTAMP;

-- Update provider column to support more options
-- Possible values: 'gmail', 'outlook', 'yahoo', 'icloud', 'custom_imap'
COMMENT ON COLUMN user_email_accounts.provider IS 'Email provider: gmail, outlook, yahoo, icloud, custom_imap';
COMMENT ON COLUMN user_email_accounts.connection_type IS 'Connection type: oauth (for Gmail/Outlook), imap_smtp (for custom servers)';

-- Create table for common email provider presets
CREATE TABLE IF NOT EXISTS email_provider_presets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    imap_host VARCHAR(255) NOT NULL,
    imap_port INTEGER DEFAULT 993,
    imap_secure BOOLEAN DEFAULT true,
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER DEFAULT 587,
    smtp_secure BOOLEAN DEFAULT true,
    requires_app_password BOOLEAN DEFAULT false,
    app_password_url TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common email provider presets
INSERT INTO email_provider_presets (name, display_name, icon, imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure, requires_app_password, app_password_url, notes)
VALUES 
    ('gmail', 'Gmail', 'gmail', 'imap.gmail.com', 993, true, 'smtp.gmail.com', 587, true, true, 'https://myaccount.google.com/apppasswords', 'Requires App Password. Enable 2FA first, then create an App Password.'),
    ('outlook', 'Outlook / Microsoft 365', 'outlook', 'outlook.office365.com', 993, true, 'smtp.office365.com', 587, true, false, NULL, 'Use your regular Microsoft account password.'),
    ('yahoo', 'Yahoo Mail', 'yahoo', 'imap.mail.yahoo.com', 993, true, 'smtp.mail.yahoo.com', 587, true, true, 'https://login.yahoo.com/account/security', 'Requires App Password. Go to Account Info > Account Security > Generate app password.'),
    ('icloud', 'iCloud Mail', 'icloud', 'imap.mail.me.com', 993, true, 'smtp.mail.me.com', 587, true, true, 'https://appleid.apple.com/account/manage', 'Requires App-Specific Password. Sign in to Apple ID and generate one.'),
    ('aol', 'AOL Mail', 'aol', 'imap.aol.com', 993, true, 'smtp.aol.com', 587, true, true, 'https://login.aol.com/account/security', 'May require App Password if 2FA is enabled.'),
    ('zoho', 'Zoho Mail', 'zoho', 'imap.zoho.com', 993, true, 'smtp.zoho.com', 587, true, false, NULL, 'Use your Zoho account password. Enable IMAP in settings first.'),
    ('protonmail', 'ProtonMail Bridge', 'protonmail', '127.0.0.1', 1143, false, '127.0.0.1', 1025, false, false, NULL, 'Requires ProtonMail Bridge app running locally.'),
    ('fastmail', 'Fastmail', 'fastmail', 'imap.fastmail.com', 993, true, 'smtp.fastmail.com', 587, true, true, 'https://www.fastmail.com/settings/security/devicekeys', 'Create an App Password in Settings > Privacy & Security.'),
    ('gmx', 'GMX Mail', 'gmx', 'imap.gmx.com', 993, true, 'mail.gmx.com', 587, true, false, NULL, 'Enable IMAP access in GMX settings first.'),
    ('custom', 'Custom Server', 'server', '', 993, true, '', 587, true, false, NULL, 'Enter your own IMAP and SMTP server details.')
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    imap_host = EXCLUDED.imap_host,
    imap_port = EXCLUDED.imap_port,
    smtp_host = EXCLUDED.smtp_host,
    smtp_port = EXCLUDED.smtp_port,
    requires_app_password = EXCLUDED.requires_app_password,
    app_password_url = EXCLUDED.app_password_url,
    notes = EXCLUDED.notes;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_email_accounts_connection_type ON user_email_accounts(connection_type);
CREATE INDEX IF NOT EXISTS idx_user_email_accounts_connection_status ON user_email_accounts(connection_status);

-- Verify the migration
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_email_accounts'
ORDER BY ordinal_position;

