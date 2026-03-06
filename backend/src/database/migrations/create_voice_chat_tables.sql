-- Voice Chat Tables
-- Stores voice conversations and messages

-- Voice Conversations
CREATE TABLE IF NOT EXISTS voice_conversations (
    id VARCHAR(50) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    voice_settings JSONB,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Voice Messages
CREATE TABLE IF NOT EXISTS voice_messages (
    id VARCHAR(50) PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL REFERENCES voice_conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user', 'agent', 'system'
    content TEXT NOT NULL,
    audio_url TEXT,
    audio_duration_ms INTEGER,
    transcription TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_conversations_user_id ON voice_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_conversations_agent_id ON voice_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_voice_conversations_started_at ON voice_conversations(started_at);
CREATE INDEX IF NOT EXISTS idx_voice_messages_conversation_id ON voice_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_user_id ON voice_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_created_at ON voice_messages(created_at);

-- Update trigger for timestamps
CREATE OR REPLACE FUNCTION update_voice_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_voice_conversations_updated_at
    BEFORE UPDATE ON voice_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_conversations_updated_at();

-- Comments for documentation
COMMENT ON TABLE voice_conversations IS 'Voice chat conversations between users and AI agents';
COMMENT ON TABLE voice_messages IS 'Individual messages within voice conversations';
COMMENT ON COLUMN voice_conversations.voice_settings IS 'JSON settings for voice synthesis and recognition';
COMMENT ON COLUMN voice_messages.role IS 'Message role: user, agent, or system';
COMMENT ON COLUMN voice_messages.audio_url IS 'URL to audio file for voice messages';
COMMENT ON COLUMN voice_messages.transcription IS 'Text transcription of voice message';