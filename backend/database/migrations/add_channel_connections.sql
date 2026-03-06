-- AI Assistant: channel connections (agent linked to Telegram/WhatsApp/Teams)
-- One row per (agent + channel); messages from that channel are routed to this agent.

CREATE TABLE IF NOT EXISTS channel_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('telegram', 'whatsapp', 'teams')),
    channel_connection_id VARCHAR(255) NOT NULL,
    channel_metadata JSONB DEFAULT '{}',
    enabled_tool_categories TEXT[] DEFAULT '{}',
    session_policy VARCHAR(50) DEFAULT 'per_peer' CHECK (session_policy IN ('per_peer', 'per_channel_peer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (channel, channel_connection_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_connections_user ON channel_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_connections_agent ON channel_connections(agent_id);
CREATE INDEX IF NOT EXISTS idx_channel_connections_lookup ON channel_connections(channel, channel_connection_id) WHERE is_active = true;

COMMENT ON TABLE channel_connections IS 'AI Assistant: agent connected to Telegram/WhatsApp/Teams; channel_connection_id = bot token id or app id';
