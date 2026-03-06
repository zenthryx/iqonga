-- Migration: Add generated videos table for video generation functionality
-- Created: 2025-11-07

-- Table to store AI-generated videos
CREATE TABLE IF NOT EXISTS generated_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    style VARCHAR(50) DEFAULT 'cinematic',
    duration INTEGER DEFAULT 5, -- seconds
    aspect_ratio VARCHAR(10) DEFAULT '16:9',
    video_url TEXT,
    video_script TEXT,
    storyboard TEXT,
    metadata JSONB DEFAULT '{}',
    provider VARCHAR(50) DEFAULT 'gemini', -- gemini, openai, etc.
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add provider column to generated_images if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'generated_images' AND column_name = 'provider') THEN
        ALTER TABLE generated_images ADD COLUMN provider VARCHAR(50) DEFAULT 'openai';
    END IF;
END $$;

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_generated_videos_user_id ON generated_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_videos_agent_id ON generated_videos(agent_id);
CREATE INDEX IF NOT EXISTS idx_generated_videos_status ON generated_videos(status);
CREATE INDEX IF NOT EXISTS idx_generated_videos_created_at ON generated_videos(created_at);

