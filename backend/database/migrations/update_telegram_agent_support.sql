-- Migration: Update Telegram support for agent-specific bots
-- This allows each AI agent to have its own Telegram bot
-- And allows connecting multiple Telegram groups per account

-- Step 1: Add agent_id column if it doesn't exist
ALTER TABLE telegram_groups 
ADD COLUMN IF NOT EXISTS agent_id UUID;

-- Step 2: Add agent_name column if it doesn't exist
ALTER TABLE telegram_groups 
ADD COLUMN IF NOT EXISTS agent_name VARCHAR(255);

-- Step 3: Add webhook configuration columns for agent-specific webhooks
ALTER TABLE telegram_groups 
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN DEFAULT false;

-- Step 4: Update existing records to set agent_id (if there are any without it)
-- This assigns them to the user's first agent
UPDATE telegram_groups tg
SET agent_id = (
  SELECT aa.id 
  FROM ai_agents aa 
  WHERE aa.user_id = tg.user_id 
  AND aa.is_active = true
  ORDER BY aa.created_at ASC 
  LIMIT 1
)
WHERE agent_id IS NULL AND user_id IS NOT NULL;

-- Step 5: Update agent_name for existing records
UPDATE telegram_groups tg
SET agent_name = (
  SELECT aa.name 
  FROM ai_agents aa 
  WHERE aa.id = tg.agent_id
  LIMIT 1
)
WHERE agent_id IS NOT NULL AND agent_name IS NULL;

-- Step 6: Delete any orphaned records that still don't have an agent_id
-- (records where user doesn't have any agents)
DELETE FROM telegram_groups WHERE agent_id IS NULL;

-- Step 7: Now make agent_id NOT NULL (after all records have been updated)
ALTER TABLE telegram_groups 
ALTER COLUMN agent_id SET NOT NULL;

-- Step 8: Drop the old unique constraint if it exists
ALTER TABLE telegram_groups 
DROP CONSTRAINT IF EXISTS telegram_groups_user_id_chat_id_key;

-- Step 9: Add new unique constraint that allows:
-- - Same group with different agents (different bots)
-- - Multiple groups per agent
-- - Multiple groups per user (through different agents)
-- The constraint is: unique combination of agent_id, bot_token_encrypted, and chat_id
-- This means the same agent can't connect the same group with the same bot twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_groups_agent_bot_chat 
ON telegram_groups(agent_id, bot_token_encrypted, chat_id);

-- Step 10: Add index for efficient agent-based queries
CREATE INDEX IF NOT EXISTS idx_telegram_groups_agent_id 
ON telegram_groups(agent_id) WHERE is_active = true;

-- Step 11: Add index for efficient user + agent queries
CREATE INDEX IF NOT EXISTS idx_telegram_groups_user_agent 
ON telegram_groups(user_id, agent_id) WHERE is_active = true;

