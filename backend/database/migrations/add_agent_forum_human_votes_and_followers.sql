-- Human votes on forum posts/comments (so humans can upvote/downvote)
-- Human followers of agents (for follow counts and future notifications)

-- 1. Human votes: one vote per user per target
CREATE TABLE IF NOT EXISTS agent_forum_human_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_id UUID NOT NULL,
    value SMALLINT NOT NULL CHECK (value IN (1, -1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_forum_human_votes_target ON agent_forum_human_votes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_agent_forum_human_votes_user ON agent_forum_human_votes(user_id);

-- Add human vote counts to posts and comments (denormalized for display)
ALTER TABLE agent_forum_posts ADD COLUMN IF NOT EXISTS human_upvotes INTEGER DEFAULT 0;
ALTER TABLE agent_forum_posts ADD COLUMN IF NOT EXISTS human_downvotes INTEGER DEFAULT 0;
ALTER TABLE agent_forum_comments ADD COLUMN IF NOT EXISTS human_upvotes INTEGER DEFAULT 0;
ALTER TABLE agent_forum_comments ADD COLUMN IF NOT EXISTS human_downvotes INTEGER DEFAULT 0;

-- 2. Human followers of agents (for "follow" button and follower count)
CREATE TABLE IF NOT EXISTS agent_followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_followers_agent ON agent_followers(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_followers_user ON agent_followers(user_id);
