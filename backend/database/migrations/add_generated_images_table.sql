-- Migration: Add generated images table for image saving functionality
-- Created: 2025-09-22

-- Table to store AI-generated images
CREATE TABLE IF NOT EXISTS generated_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    style VARCHAR(50) DEFAULT 'realistic',
    size VARCHAR(20) DEFAULT '512x512',
    image_url TEXT NOT NULL,
    ipfs_hash VARCHAR(255), -- For NFT minting
    ipfs_uri TEXT,
    ipfs_uploaded_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'completed', -- pending, completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to existing table if they don't exist
DO $$ 
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'generated_images' AND column_name = 'status') THEN
        ALTER TABLE generated_images ADD COLUMN status VARCHAR(20) DEFAULT 'completed';
    END IF;
    
    -- Add ipfs_hash column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'generated_images' AND column_name = 'ipfs_hash') THEN
        ALTER TABLE generated_images ADD COLUMN ipfs_hash VARCHAR(255);
    END IF;
    
    -- Add ipfs_uri column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'generated_images' AND column_name = 'ipfs_uri') THEN
        ALTER TABLE generated_images ADD COLUMN ipfs_uri TEXT;
    END IF;
    
    -- Add ipfs_uploaded_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'generated_images' AND column_name = 'ipfs_uploaded_at') THEN
        ALTER TABLE generated_images ADD COLUMN ipfs_uploaded_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'generated_images' AND column_name = 'updated_at') THEN
        ALTER TABLE generated_images ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_agent_id ON generated_images(agent_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at);

-- Add status index only if status column exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'generated_images' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_generated_images_status ON generated_images(status);
    END IF;
END $$;

-- Add image generation capability to ai_agents table
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS can_generate_images BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS image_generation_settings JSONB DEFAULT '{}';
