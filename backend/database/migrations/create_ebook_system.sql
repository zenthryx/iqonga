-- ============================================
-- eBook Creator System - Database Migration
-- ============================================
-- This migration creates all tables needed for the eBook Creator system
-- including projects, chapters, templates, audiobooks, and transcriptions

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- eBook Projects Table
-- ============================================
CREATE TABLE IF NOT EXISTS ebook_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  genre VARCHAR(50),
  language VARCHAR(10) DEFAULT 'en',
  cover_image_url TEXT,
  template_id UUID,
  status VARCHAR(20) DEFAULT 'draft', -- draft, in_progress, completed, published
  visibility VARCHAR(20) DEFAULT 'private', -- private, public, unlisted
  share_token VARCHAR(255) UNIQUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ebook_projects
CREATE INDEX IF NOT EXISTS idx_ebook_projects_user_id ON ebook_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_ebook_projects_status ON ebook_projects(status);
CREATE INDEX IF NOT EXISTS idx_ebook_projects_share_token ON ebook_projects(share_token);
CREATE INDEX IF NOT EXISTS idx_ebook_projects_created_at ON ebook_projects(created_at DESC);

-- ============================================
-- eBook Chapters Table
-- ============================================
CREATE TABLE IF NOT EXISTS ebook_chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES ebook_projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title VARCHAR(255),
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, chapter_number)
);

-- Indexes for ebook_chapters
CREATE INDEX IF NOT EXISTS idx_ebook_chapters_project_id ON ebook_chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_ebook_chapters_order_index ON ebook_chapters(project_id, order_index);

-- ============================================
-- eBook Templates Table
-- ============================================
CREATE TABLE IF NOT EXISTS ebook_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- fiction, non-fiction, business, educational, etc.
  is_public BOOLEAN DEFAULT false,
  template_data JSONB NOT NULL, -- Layout, fonts, styles, colors, etc.
  preview_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ebook_templates
CREATE INDEX IF NOT EXISTS idx_ebook_templates_user_id ON ebook_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_ebook_templates_is_public ON ebook_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_ebook_templates_category ON ebook_templates(category);

-- ============================================
-- Audiobooks Table
-- ============================================
CREATE TABLE IF NOT EXISTS audiobooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES ebook_projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  voice VARCHAR(50) DEFAULT 'alloy', -- OpenAI TTS voices: alloy, echo, fable, onyx, nova, shimmer
  model VARCHAR(20) DEFAULT 'tts-1', -- tts-1 or tts-1-hd
  speed DECIMAL(3,2) DEFAULT 1.0, -- 0.25 to 4.0
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  audio_url TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for audiobooks
CREATE INDEX IF NOT EXISTS idx_audiobooks_project_id ON audiobooks(project_id);
CREATE INDEX IF NOT EXISTS idx_audiobooks_user_id ON audiobooks(user_id);
CREATE INDEX IF NOT EXISTS idx_audiobooks_status ON audiobooks(status);

-- ============================================
-- Transcriptions Table
-- ============================================
CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type VARCHAR(20) NOT NULL, -- video, audio
  source_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size_bytes BIGINT,
  transcribed_text TEXT,
  language VARCHAR(10),
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for transcriptions
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON transcriptions(status);
CREATE INDEX IF NOT EXISTS idx_transcriptions_source_type ON transcriptions(source_type);

-- ============================================
-- eBook Exports Table (Track export history)
-- ============================================
CREATE TABLE IF NOT EXISTS ebook_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES ebook_projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  export_format VARCHAR(20) NOT NULL, -- pdf, epub, mobi, flipbook, txt
  file_url TEXT,
  file_size_bytes BIGINT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ebook_exports
CREATE INDEX IF NOT EXISTS idx_ebook_exports_project_id ON ebook_exports(project_id);
CREATE INDEX IF NOT EXISTS idx_ebook_exports_user_id ON ebook_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_ebook_exports_format ON ebook_exports(export_format);

-- ============================================
-- eBook Covers Table
-- ============================================
CREATE TABLE IF NOT EXISTS ebook_covers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES ebook_projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cover_url TEXT NOT NULL,
  style VARCHAR(50),
  color_scheme VARCHAR(50),
  prompt_used TEXT,
  credits_used INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ebook_covers
CREATE INDEX IF NOT EXISTS idx_ebook_covers_project_id ON ebook_covers(project_id);
CREATE INDEX IF NOT EXISTS idx_ebook_covers_user_id ON ebook_covers(user_id);
CREATE INDEX IF NOT EXISTS idx_ebook_covers_created_at ON ebook_covers(created_at DESC);

-- ============================================
-- Comments/Annotations Table (for collaboration)
-- ============================================
CREATE TABLE IF NOT EXISTS ebook_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES ebook_projects(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES ebook_chapters(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  parent_comment_id UUID REFERENCES ebook_comments(id) ON DELETE CASCADE, -- For threaded comments
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ebook_comments
CREATE INDEX IF NOT EXISTS idx_ebook_comments_project_id ON ebook_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_ebook_comments_chapter_id ON ebook_comments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_ebook_comments_user_id ON ebook_comments(user_id);

-- ============================================
-- Function to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_ebook_projects_updated_at ON ebook_projects;
DROP TRIGGER IF EXISTS update_ebook_chapters_updated_at ON ebook_chapters;
DROP TRIGGER IF EXISTS update_ebook_templates_updated_at ON ebook_templates;
DROP TRIGGER IF EXISTS update_ebook_comments_updated_at ON ebook_comments;

-- Create triggers
CREATE TRIGGER update_ebook_projects_updated_at BEFORE UPDATE ON ebook_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ebook_chapters_updated_at BEFORE UPDATE ON ebook_chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ebook_templates_updated_at BEFORE UPDATE ON ebook_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ebook_comments_updated_at BEFORE UPDATE ON ebook_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Insert Default Templates
-- ============================================
INSERT INTO ebook_templates (id, name, description, category, is_public, template_data) VALUES
(
  uuid_generate_v4(),
  'Modern Fiction',
  'Clean, modern layout for fiction books',
  'fiction',
  true,
  '{"layout": "single_column", "font_family": "Georgia", "font_size": 12, "line_height": 1.6, "margin_top": 2, "margin_bottom": 2, "margin_left": 1.5, "margin_right": 1.5, "page_size": "letter", "header": {"enabled": true, "content": "{book_title}"}, "footer": {"enabled": true, "content": "{page_number}"}}'::jsonb
),
(
  uuid_generate_v4(),
  'Business Professional',
  'Professional layout for business and non-fiction books',
  'non-fiction',
  true,
  '{"layout": "two_column", "font_family": "Arial", "font_size": 11, "line_height": 1.5, "margin_top": 1.5, "margin_bottom": 1.5, "margin_left": 1, "margin_right": 1, "page_size": "letter", "header": {"enabled": true, "content": "{chapter_title}"}, "footer": {"enabled": true, "content": "Page {page_number}"}}'::jsonb
),
(
  uuid_generate_v4(),
  'Children''s Book',
  'Large, readable layout for children''s books',
  'children',
  true,
  '{"layout": "single_column", "font_family": "Comic Sans MS", "font_size": 16, "line_height": 1.8, "margin_top": 2, "margin_bottom": 2, "margin_left": 2, "margin_right": 2, "page_size": "letter", "header": {"enabled": false}, "footer": {"enabled": false}}'::jsonb
)
ON CONFLICT DO NOTHING;

