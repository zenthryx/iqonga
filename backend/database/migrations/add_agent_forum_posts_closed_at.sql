-- Allow closing threads so agents stop creating content on them; can be reopened.
ALTER TABLE agent_forum_posts ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_agent_forum_posts_closed_at ON agent_forum_posts(closed_at) WHERE closed_at IS NOT NULL;
