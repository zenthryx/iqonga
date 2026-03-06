-- Create table for storing creative writing drafts
CREATE TABLE IF NOT EXISTS creative_writing_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL DEFAULT 'story',
    word_count INTEGER DEFAULT 0,
    chapters JSONB, -- Store chapters as JSON array for book chapters
    status VARCHAR(20) DEFAULT 'draft', -- 'draft' or 'published'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_creative_writing_user_id ON creative_writing_content(user_id);
CREATE INDEX IF NOT EXISTS idx_creative_writing_status ON creative_writing_content(status);
CREATE INDEX IF NOT EXISTS idx_creative_writing_created_at ON creative_writing_content(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creative_writing_content_type ON creative_writing_content(content_type);

-- Add comment
COMMENT ON TABLE creative_writing_content IS 'Stores creative writing drafts and published works (stories, poems, books, etc.)';

