-- Generated images for Image Generation page (/images) and content APIs.
-- Run to enable listing and saving generated images: GET/POST /api/content/images, etc.
-- Usage: psql -U YOUR_USER -d ajentrix_standalone -f Backend/standalone_db/migrate_generated_images.sql

CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID,
  prompt TEXT,
  style VARCHAR(100),
  size VARCHAR(50),
  image_url TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);
COMMENT ON TABLE generated_images IS 'AI-generated and uploaded images for Image Generation page';