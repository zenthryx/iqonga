-- Migration: Add characters table for character creation and library
-- Created: 2025-11-09
-- Purpose: Store user-created characters for use in video generation

-- Table to store user-created characters
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Character creation method: 'images', 'single_image', 'description', 'ai_generated'
    creation_method VARCHAR(50) DEFAULT 'images',
    
    -- Character images (array of image URLs)
    -- For 'images' method: multiple reference images
    -- For 'single_image' method: one main image
    -- For 'description' method: AI-generated images
    image_urls TEXT[] DEFAULT '{}',
    
    -- Main/preview image URL (first image or generated preview)
    preview_image_url TEXT,
    
    -- Character metadata
    metadata JSONB DEFAULT '{}',
    
    -- Tags for organization
    tags TEXT[] DEFAULT '{}',
    
    -- Visibility: 'private' (user only), 'public' (community library)
    visibility VARCHAR(20) DEFAULT 'private',
    
    -- Status: 'active', 'archived', 'deleted'
    status VARCHAR(20) DEFAULT 'active',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_status ON characters(status);
CREATE INDEX IF NOT EXISTS idx_characters_visibility ON characters(visibility);
CREATE INDEX IF NOT EXISTS idx_characters_created_at ON characters(created_at);
CREATE INDEX IF NOT EXISTS idx_characters_tags ON characters USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);

-- Add comment
COMMENT ON TABLE characters IS 'Stores user-created characters for consistent use in video generation';

