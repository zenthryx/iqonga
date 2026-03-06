-- Create table for generated music videos (avatar videos with music)
-- This table stores metadata about music videos created by combining generated music with avatar videos

CREATE TABLE IF NOT EXISTS generated_music_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    music_id UUID REFERENCES generated_music(id) ON DELETE SET NULL, -- Link to the music track
    video_url TEXT, -- Final combined video URL
    audio_url TEXT, -- Original music audio URL (for reference)
    provider VARCHAR(50) DEFAULT 'heygen', -- heygen, reccloud
    avatar_id VARCHAR(255), -- Avatar ID from provider
    avatar_type VARCHAR(50), -- 'photo', 'template', 'custom'
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    metadata JSONB DEFAULT '{}', -- Store provider-specific metadata, task IDs, etc.
    duration INTEGER, -- Video duration in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_generated_music_videos_user_id ON generated_music_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_music_videos_agent_id ON generated_music_videos(agent_id);
CREATE INDEX IF NOT EXISTS idx_generated_music_videos_music_id ON generated_music_videos(music_id);
CREATE INDEX IF NOT EXISTS idx_generated_music_videos_status ON generated_music_videos(status);
CREATE INDEX IF NOT EXISTS idx_generated_music_videos_created_at ON generated_music_videos(created_at DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_generated_music_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_generated_music_videos_updated_at
    BEFORE UPDATE ON generated_music_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_generated_music_videos_updated_at();

