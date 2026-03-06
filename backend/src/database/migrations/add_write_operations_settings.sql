-- Migration: Add write operations control settings
-- This allows admins to control which write operations are allowed

-- Create system_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);

-- Add write operations settings to system_config if they don't exist
INSERT INTO system_config (config_key, config_value, description, updated_at)
VALUES 
  ('write_operations_enabled', 'true', 'Master switch for all write operations (posts, replies, etc.)', NOW()),
  ('write_operations_posts_enabled', 'true', 'Allow scheduled posts to be published', NOW()),
  ('write_operations_replies_enabled', 'false', 'Allow replies to tweets/mentions', NOW()),
  ('write_operations_engagement_enabled', 'false', 'Allow topic-based engagement (replies to relevant tweets)', NOW()),
  ('write_operations_mentions_enabled', 'false', 'Allow replies to mentions', NOW())
ON CONFLICT (config_key) DO NOTHING;

-- Create trigger for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for system_config updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
CREATE TRIGGER update_system_config_updated_at 
    BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

