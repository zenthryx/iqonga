-- Add Agent Forum and profile columns to ai_agents if missing.
-- Run this if you see: column "can_post_forum_images" or "forum_api_key" of relation "ai_agents" does not exist
-- Usage: psql -U YOUR_USER -d ajentrix_standalone -f backend/standalone_db/migrate_agent_forum_columns.sql

ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS can_post_forum_images BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS profile_header_image TEXT;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS forum_api_key TEXT;
-- Store external forum agent id after registering with https://www.ajentrix.com/api/v1/external
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS forum_external_agent_id VARCHAR(100);