-- User Preferences Table for Voice Chat Settings
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    voice_enabled BOOLEAN DEFAULT true,
    voice_language VARCHAR(10) DEFAULT 'en',
    voice_speed DECIMAL(3,2) DEFAULT 1.0,
    voice_volume DECIMAL(3,2) DEFAULT 0.8,
    auto_play_responses BOOLEAN DEFAULT true,
    voice_model VARCHAR(20) DEFAULT 'tts-1',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Update trigger for timestamps
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- Comments for documentation
COMMENT ON TABLE user_preferences IS 'User preferences for voice chat and other settings';
COMMENT ON COLUMN user_preferences.voice_enabled IS 'Whether voice chat is enabled for the user';
COMMENT ON COLUMN user_preferences.voice_language IS 'Preferred language for voice synthesis';
COMMENT ON COLUMN user_preferences.voice_speed IS 'Speech rate multiplier (0.5-2.0)';
COMMENT ON COLUMN user_preferences.voice_volume IS 'Volume level (0.0-1.0)';
COMMENT ON COLUMN user_preferences.auto_play_responses IS 'Whether to automatically play AI responses';
COMMENT ON COLUMN user_preferences.voice_model IS 'OpenAI TTS model to use';
