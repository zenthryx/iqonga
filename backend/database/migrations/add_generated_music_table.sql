-- Migration: Add generated music table for music generation functionality
-- Created: 2025-01-XX

-- Table to store AI-generated music
CREATE TABLE IF NOT EXISTS generated_music (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    style VARCHAR(50) DEFAULT 'pop',
    genre VARCHAR(50),
    duration INTEGER DEFAULT 30, -- seconds
    instrumental BOOLEAN DEFAULT false,
    lyrics TEXT,
    tempo INTEGER, -- BPM
    mood VARCHAR(50),
    audio_url TEXT,
    metadata JSONB DEFAULT '{}',
    provider VARCHAR(50) DEFAULT 'musicapi', -- musicapi, stability, sunoapi
    status VARCHAR(20) DEFAULT 'completed', -- pending, processing, completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_generated_music_user_id ON generated_music(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_music_agent_id ON generated_music(agent_id);
CREATE INDEX IF NOT EXISTS idx_generated_music_status ON generated_music(status);
CREATE INDEX IF NOT EXISTS idx_generated_music_provider ON generated_music(provider);
CREATE INDEX IF NOT EXISTS idx_generated_music_created_at ON generated_music(created_at);

COMMENT ON TABLE generated_music IS 'Stores AI-generated music tracks created by users';

