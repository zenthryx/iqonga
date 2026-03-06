-- Fix AI column types in email_messages table
-- ai_key_points was added as JSONB but ai_action_items is TEXT[]
-- Let's make them consistent as TEXT[] for simplicity

-- Drop the JSONB column if it exists
ALTER TABLE email_messages DROP COLUMN IF EXISTS ai_key_points;

-- Add it back as TEXT[] to match ai_action_items
ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS ai_key_points TEXT[];

-- Add comment
COMMENT ON COLUMN email_messages.ai_key_points IS 'AI-extracted key points as array';

-- Verify both are now TEXT[]
-- ai_key_points: TEXT[]
-- ai_action_items: TEXT[] (already exists)

