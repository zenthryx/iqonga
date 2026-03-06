-- Chat Privacy Settings Migration
-- Adds privacy settings for chat messaging

-- Add chat privacy columns to user_preferences table (or create if needed)
DO $$
BEGIN
    -- Check if user_preferences table exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
        CREATE TABLE user_preferences (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id)
        );
    END IF;

    -- Add chat privacy columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_preferences' AND column_name = 'chat_message_privacy') THEN
        ALTER TABLE user_preferences 
        ADD COLUMN chat_message_privacy VARCHAR(20) DEFAULT 'contacts' 
        CHECK (chat_message_privacy IN ('everyone', 'friends', 'contacts', 'none'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_preferences' AND column_name = 'chat_show_online_status') THEN
        ALTER TABLE user_preferences 
        ADD COLUMN chat_show_online_status BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_preferences' AND column_name = 'chat_allow_friend_requests') THEN
        ALTER TABLE user_preferences 
        ADD COLUMN chat_allow_friend_requests BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Create index for user preferences lookup
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Comments for documentation
COMMENT ON COLUMN user_preferences.chat_message_privacy IS 'Who can message this user: everyone, friends, contacts (people you''ve chatted with), none';
COMMENT ON COLUMN user_preferences.chat_show_online_status IS 'Whether to show online status to others';
COMMENT ON COLUMN user_preferences.chat_allow_friend_requests IS 'Whether to allow friend requests from others';

