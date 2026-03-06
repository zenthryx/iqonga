-- Migration: Create agent_document_assignments table
-- Allows assigning specific knowledge documents to individual agents

CREATE TABLE IF NOT EXISTS agent_document_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    priority_level INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_document_assignments_agent ON agent_document_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_document_assignments_document ON agent_document_assignments(document_id);

