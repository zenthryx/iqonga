-- Add missing columns to generated_content table for Twitter posting functionality
ALTER TABLE generated_content 
ADD COLUMN IF NOT EXISTS platform_post_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ai_model_used VARCHAR(100) DEFAULT 'gpt-4o-mini';

-- Add index for platform_post_id for better performance
CREATE INDEX IF NOT EXISTS idx_generated_content_platform_post_id ON generated_content(platform_post_id);

-- Add comments for the new columns
COMMENT ON COLUMN generated_content.platform_post_id IS 'ID of the post on the platform (e.g., Twitter tweet ID)';
COMMENT ON COLUMN generated_content.published_at IS 'Timestamp when the content was published to the platform';
COMMENT ON COLUMN generated_content.ai_model_used IS 'AI model used for generation (e.g., gpt-4, gpt-3.5-turbo)';

-- Update existing records to have a default ai_model_used if it's NULL
UPDATE generated_content 
SET ai_model_used = 'gpt-4o-mini' 
WHERE ai_model_used IS NULL;
