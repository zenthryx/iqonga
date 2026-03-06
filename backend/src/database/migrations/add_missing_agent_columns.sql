-- Add missing columns to ai_agents table
-- This migration adds description and avatar_url columns that are needed by the agents API

ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update any existing agents with default values
UPDATE ai_agents 
SET description = COALESCE(description, 'AI Agent with ' || personality_type || ' personality')
WHERE description IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN ai_agents.description IS 'Agent description provided by user';
COMMENT ON COLUMN ai_agents.avatar_url IS 'URL to agent avatar image';
