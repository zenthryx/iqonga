-- Voice Chat Migration v2 (Safe)
-- Create conversations and messages tables for voice chat functionality
-- This version safely handles existing tables

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'paused')),
    title VARCHAR(200), -- Optional conversation title
    voice_settings JSONB DEFAULT '{}', -- Voice preferences, speed, etc.
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversation messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL, -- Text content of the message
    audio_url TEXT, -- URL to audio file (if voice message)
    audio_duration_ms INTEGER, -- Duration in milliseconds
    metadata JSONB DEFAULT '{}', -- Additional data like transcription confidence, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- Voice settings table for widget configuration
CREATE TABLE IF NOT EXISTS voice_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    widget_id VARCHAR(100), -- Reference to widget instance
    enabled BOOLEAN DEFAULT true,
    auto_transcribe BOOLEAN DEFAULT true,
    speech_to_text_config JSONB DEFAULT '{}',
    text_to_speech_config JSONB DEFAULT '{}',
    voice_language VARCHAR(10) DEFAULT 'en-US',
    voice_speed DECIMAL(3,2) DEFAULT 1.0,
    voice_provider VARCHAR(50) DEFAULT 'openai', -- openai, elevenlabs, etc.
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes only if they don't exist
DO $$
BEGIN
    -- Indexes for conversations table
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_conversations_user_agent') THEN
        CREATE INDEX idx_conversations_user_agent ON conversations(user_id, agent_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_conversations_status') THEN
        CREATE INDEX idx_conversations_status ON conversations(status);
    END IF;
    
    -- Indexes for conversation_messages table
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_conversation_messages_conversation_id') THEN
        CREATE INDEX idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_conversation_messages_role') THEN
        CREATE INDEX idx_conversation_messages_role ON conversation_messages(role);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_conversation_messages_created_at') THEN
        CREATE INDEX idx_conversation_messages_created_at ON conversation_messages(created_at);
    END IF;
    
    -- Indexes for voice_settings table
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_voice_settings_user_id') THEN
        CREATE INDEX idx_voice_settings_user_id ON voice_settings(user_id);
    END IF;
END $$;

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_conversations_on_message_insert') THEN
        CREATE TRIGGER update_conversations_on_message_insert
            AFTER INSERT ON conversation_messages
            FOR EACH ROW
            EXECUTE FUNCTION update_conversations_updated_at();
    END IF;
END $$;
