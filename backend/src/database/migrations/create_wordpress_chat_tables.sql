-- WordPress Chat Tables Migration
-- Create tables for WordPress plugin chat functionality

-- Chat sessions table for WordPress plugin
CREATE TABLE IF NOT EXISTS wordpress_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    user_data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'paused')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages table for WordPress plugin
CREATE TABLE IF NOT EXISTS wordpress_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) NOT NULL REFERENCES wordpress_chat_sessions(session_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image')),
    is_from_user BOOLEAN NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wordpress_chat_sessions_user_id ON wordpress_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_wordpress_chat_sessions_agent_id ON wordpress_chat_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_wordpress_chat_sessions_session_id ON wordpress_chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_wordpress_chat_sessions_status ON wordpress_chat_sessions(status);

CREATE INDEX IF NOT EXISTS idx_wordpress_chat_messages_session_id ON wordpress_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_wordpress_chat_messages_created_at ON wordpress_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_wordpress_chat_messages_type ON wordpress_chat_messages(message_type);

-- Create trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_wordpress_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_wordpress_chat_sessions_updated_at 
    BEFORE UPDATE ON wordpress_chat_sessions
    FOR EACH ROW EXECUTE PROCEDURE update_wordpress_chat_sessions_updated_at();
