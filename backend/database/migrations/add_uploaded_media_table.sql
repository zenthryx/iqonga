-- Migration: Add uploaded media table for user-uploaded images and videos
-- Created: 2025-11-08

-- Table to store user-uploaded media files
CREATE TABLE IF NOT EXISTS uploaded_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'image' or 'video'
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL, -- Size in bytes
    width INTEGER, -- For images/videos
    height INTEGER, -- For images/videos
    duration INTEGER, -- For videos (in seconds)
    thumbnail_url TEXT, -- For videos
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'deleted', 'processing'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_uploaded_media_user_id ON uploaded_media(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_media_agent_id ON uploaded_media(agent_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_media_file_type ON uploaded_media(file_type);
CREATE INDEX IF NOT EXISTS idx_uploaded_media_status ON uploaded_media(status);
CREATE INDEX IF NOT EXISTS idx_uploaded_media_created_at ON uploaded_media(created_at);
CREATE INDEX IF NOT EXISTS idx_uploaded_media_tags ON uploaded_media USING GIN(tags);

-- Add comment
COMMENT ON TABLE uploaded_media IS 'Stores user-uploaded images and videos for use in content generation and media library';

