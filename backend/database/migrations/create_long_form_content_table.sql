-- Create table for storing long-form content drafts
CREATE TABLE IF NOT EXISTS long_form_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL DEFAULT 'blog',
    word_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft' or 'published'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_long_form_content_user_id ON long_form_content(user_id);
CREATE INDEX IF NOT EXISTS idx_long_form_content_status ON long_form_content(status);
CREATE INDEX IF NOT EXISTS idx_long_form_content_created_at ON long_form_content(created_at DESC);

-- Add comment
COMMENT ON TABLE long_form_content IS 'Stores long-form content drafts and published articles (blogs, newsletters, articles, etc.)';

