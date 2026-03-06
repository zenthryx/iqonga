-- Enhanced Avatar System Migration
-- Transforms characters table into a comprehensive avatar system with video/photo support and multiple looks

-- Add new columns to characters table for avatar functionality
DO $$ 
BEGIN
  -- Avatar type: 'video', 'photo', 'ai_generated', 'images' (legacy)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'characters' AND column_name = 'avatar_type') THEN
    ALTER TABLE characters ADD COLUMN avatar_type VARCHAR(50) DEFAULT 'images';
  END IF;

  -- Processing status: 'pending', 'processing', 'completed', 'failed'
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'characters' AND column_name = 'processing_status') THEN
    ALTER TABLE characters ADD COLUMN processing_status VARCHAR(50) DEFAULT 'completed';
  END IF;

  -- Processing progress (0-100)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'characters' AND column_name = 'processing_progress') THEN
    ALTER TABLE characters ADD COLUMN processing_progress INTEGER DEFAULT 100;
  END IF;

  -- HeyGen avatar ID (if using HeyGen API)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'characters' AND column_name = 'heygen_avatar_id') THEN
    ALTER TABLE characters ADD COLUMN heygen_avatar_id VARCHAR(255);
  END IF;

  -- Video URL for video-based avatars
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'characters' AND column_name = 'video_url') THEN
    ALTER TABLE characters ADD COLUMN video_url TEXT;
  END IF;

  -- Number of looks
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'characters' AND column_name = 'looks_count') THEN
    ALTER TABLE characters ADD COLUMN looks_count INTEGER DEFAULT 1;
  END IF;

  -- Processing error message
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'characters' AND column_name = 'processing_error') THEN
    ALTER TABLE characters ADD COLUMN processing_error TEXT;
  END IF;

  -- Processing started at timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'characters' AND column_name = 'processing_started_at') THEN
    ALTER TABLE characters ADD COLUMN processing_started_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Processing completed at timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'characters' AND column_name = 'processing_completed_at') THEN
    ALTER TABLE characters ADD COLUMN processing_completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create avatar_looks table for multiple looks per avatar
CREATE TABLE IF NOT EXISTS avatar_looks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Look metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    look_type VARCHAR(50) DEFAULT 'photo', -- 'photo', 'video', 'ai_generated'
    
    -- Look media
    image_url TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    
    -- Look settings
    outfit_type VARCHAR(50), -- 'casual', 'formal', 'athletic', 'business', etc.
    setting VARCHAR(100), -- 'office', 'gym', 'vacation', 'studio', etc.
    pose VARCHAR(50), -- 'standing', 'sitting', 'walking', etc.
    expression VARCHAR(50), -- 'smiling', 'neutral', 'serious', etc.
    
    -- Look configuration
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for avatar_looks
CREATE INDEX IF NOT EXISTS idx_avatar_looks_character ON avatar_looks(character_id);
CREATE INDEX IF NOT EXISTS idx_avatar_looks_user ON avatar_looks(user_id);
CREATE INDEX IF NOT EXISTS idx_avatar_looks_default ON avatar_looks(character_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_avatar_looks_active ON avatar_looks(character_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_avatar_looks_order ON avatar_looks(character_id, order_index);

-- Create avatar_processing_jobs table for tracking processing status
CREATE TABLE IF NOT EXISTS avatar_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Job metadata
    job_type VARCHAR(50) NOT NULL, -- 'video_processing', 'photo_processing', 'look_generation'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
    
    -- Progress tracking
    progress INTEGER DEFAULT 0, -- 0-100
    current_step VARCHAR(255),
    total_steps INTEGER,
    
    -- Input/output
    input_data JSONB, -- Original upload data
    output_data JSONB, -- Processing results
    error_message TEXT,
    
    -- External service IDs (e.g., HeyGen job ID)
    external_job_id VARCHAR(255),
    external_service VARCHAR(50), -- 'heygen', 'internal', etc.
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for avatar_processing_jobs
CREATE INDEX IF NOT EXISTS idx_avatar_jobs_character ON avatar_processing_jobs(character_id);
CREATE INDEX IF NOT EXISTS idx_avatar_jobs_user ON avatar_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_avatar_jobs_status ON avatar_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_avatar_jobs_type ON avatar_processing_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_avatar_jobs_external ON avatar_processing_jobs(external_service, external_job_id) WHERE external_job_id IS NOT NULL;

-- Create avatar_videos table for storing uploaded video files
CREATE TABLE IF NOT EXISTS avatar_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Video metadata
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT, -- in bytes
    duration DECIMAL(10, 2), -- in seconds
    resolution VARCHAR(20), -- e.g., '1920x1080'
    format VARCHAR(20), -- 'mp4', 'mov', 'webm'
    
    -- Video properties
    fps INTEGER, -- frames per second
    bitrate INTEGER, -- in kbps
    codec VARCHAR(50),
    
    -- Upload metadata
    upload_method VARCHAR(50), -- 'file_upload', 'webcam', 'phone', 'google_drive'
    upload_source TEXT, -- Original source URL if from Google Drive
    
    -- Processing status
    is_processed BOOLEAN DEFAULT false,
    processing_status VARCHAR(50) DEFAULT 'pending',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for avatar_videos
CREATE INDEX IF NOT EXISTS idx_avatar_videos_character ON avatar_videos(character_id);
CREATE INDEX IF NOT EXISTS idx_avatar_videos_user ON avatar_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_avatar_videos_processed ON avatar_videos(is_processed);

-- Update existing characters to have default values
UPDATE characters 
SET 
    avatar_type = COALESCE(avatar_type, 'images'),
    processing_status = COALESCE(processing_status, 'completed'),
    processing_progress = COALESCE(processing_progress, 100),
    looks_count = 1
WHERE avatar_type IS NULL OR processing_status IS NULL;

-- Add comments for documentation
COMMENT ON TABLE avatar_looks IS 'Stores multiple looks (outfits, poses, settings) for each avatar';
COMMENT ON TABLE avatar_processing_jobs IS 'Tracks processing jobs for avatar creation and look generation';
COMMENT ON TABLE avatar_videos IS 'Stores uploaded video files for video-based avatar creation';

COMMENT ON COLUMN characters.avatar_type IS 'Type of avatar: video, photo, ai_generated, or images (legacy)';
COMMENT ON COLUMN characters.processing_status IS 'Current processing status: pending, processing, completed, failed';
COMMENT ON COLUMN characters.heygen_avatar_id IS 'HeyGen API avatar ID if using HeyGen service';
COMMENT ON COLUMN characters.video_url IS 'URL to uploaded video file for video-based avatars';

