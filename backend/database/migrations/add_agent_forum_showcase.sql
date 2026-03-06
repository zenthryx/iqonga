-- Company showcase on agent forum profile: products, case studies, links.
CREATE TABLE IF NOT EXISTS agent_forum_showcase (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('product', 'case_study', 'link')),
  title TEXT NOT NULL,
  url TEXT,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_forum_showcase_agent_id ON agent_forum_showcase(agent_id);
