-- Migration: Add widget chat system
-- Description: Creates tables for website chat widget functionality

-- Create widget_chat_sessions table
CREATE TABLE IF NOT EXISTS widget_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    visitor_ip VARCHAR(45), -- IPv6 support
    visitor_user_agent TEXT,
    visitor_referrer TEXT,
    website_url TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create widget_chat_messages table
CREATE TABLE IF NOT EXISTS widget_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) REFERENCES widget_chat_sessions(session_id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('visitor', 'agent', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create widget_settings table
CREATE TABLE IF NOT EXISTS widget_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE UNIQUE,
    widget_title VARCHAR(100) DEFAULT 'Chat with our AI Assistant',
    widget_subtitle TEXT DEFAULT 'Ask me anything!',
    primary_color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
    secondary_color VARCHAR(7) DEFAULT '#1E40AF',
    text_color VARCHAR(7) DEFAULT '#FFFFFF',
    background_color VARCHAR(7) DEFAULT '#1F2937',
    border_radius INTEGER DEFAULT 12,
    position VARCHAR(20) DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left')),
    show_agent_avatar BOOLEAN DEFAULT TRUE,
    show_typing_indicator BOOLEAN DEFAULT TRUE,
    enable_sound_notifications BOOLEAN DEFAULT TRUE,
    max_messages_per_session INTEGER DEFAULT 50,
    session_timeout_minutes INTEGER DEFAULT 30,
    welcome_message TEXT DEFAULT 'Hello! I''m here to help. How can I assist you today?',
    offline_message TEXT DEFAULT 'Sorry, I''m currently offline. Please leave a message and I''ll get back to you soon!',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_widget_chat_sessions_agent_id ON widget_chat_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_widget_chat_sessions_session_id ON widget_chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_widget_chat_sessions_is_active ON widget_chat_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_widget_chat_sessions_started_at ON widget_chat_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_widget_chat_messages_session_id ON widget_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_widget_chat_messages_agent_id ON widget_chat_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_widget_chat_messages_message_type ON widget_chat_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_widget_chat_messages_created_at ON widget_chat_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_widget_settings_agent_id ON widget_settings(agent_id);
CREATE INDEX IF NOT EXISTS idx_widget_settings_is_active ON widget_settings(is_active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_widget_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_widget_chat_sessions_updated_at 
    BEFORE UPDATE ON widget_chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_widget_updated_at_column();

CREATE TRIGGER update_widget_settings_updated_at 
    BEFORE UPDATE ON widget_settings 
    FOR EACH ROW EXECUTE FUNCTION update_widget_updated_at_column();

-- Insert default widget settings for existing agents
INSERT INTO widget_settings (agent_id, widget_title, widget_subtitle, primary_color, secondary_color, text_color, background_color, border_radius, position, show_agent_avatar, show_typing_indicator, enable_sound_notifications, max_messages_per_session, session_timeout_minutes, welcome_message, offline_message, is_active)
SELECT 
    id,
    'Chat with ' || name,
    'Ask me anything!',
    '#3B82F6',
    '#1E40AF', 
    '#FFFFFF',
    '#1F2937',
    12,
    'bottom-right',
    TRUE,
    TRUE,
    TRUE,
    50,
    30,
    'Hello! I''m ' || name || ', your AI assistant. How can I help you today?',
    'Sorry, I''m currently offline. Please leave a message and I''ll get back to you soon!',
    TRUE
FROM ai_agents 
WHERE id NOT IN (SELECT agent_id FROM widget_settings);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON widget_chat_sessions TO socialai;
GRANT SELECT, INSERT, UPDATE, DELETE ON widget_chat_messages TO socialai;
GRANT SELECT, INSERT, UPDATE, DELETE ON widget_settings TO socialai;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO socialai;
