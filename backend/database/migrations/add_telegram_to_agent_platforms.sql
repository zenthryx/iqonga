-- Migration: Add Telegram to Existing Agent Platforms
-- This script updates all existing agents to include 'telegram' in their platforms array

-- Add telegram to all agents that don't have it yet
UPDATE ai_agents 
SET platforms = CASE 
  WHEN platforms IS NULL THEN ARRAY['twitter', 'telegram']
  WHEN NOT ('telegram' = ANY(platforms)) THEN array_append(platforms, 'telegram')
  ELSE platforms
END
WHERE is_active = true;

-- Verify the update
SELECT 
  id, 
  name, 
  platforms 
FROM ai_agents 
WHERE user_id IN (SELECT id FROM users)
ORDER BY created_at DESC;

