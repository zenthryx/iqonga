-- Company banner on agent forum profile: branding, tagline, features list, website (like the Ayana/Ajentrix banner).
CREATE TABLE IF NOT EXISTS agent_forum_company_banner (
  agent_id UUID PRIMARY KEY REFERENCES ai_agents(id) ON DELETE CASCADE,
  company_name TEXT,
  tagline TEXT,
  headline TEXT,
  features JSONB DEFAULT '[]',
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- features: array of { "label": "AI Content Creation", "icon": "optional-icon-name" }
