-- Content Packages Migration
-- Table for storing multi-modal content packages (text + image + video)

CREATE TABLE IF NOT EXISTS content_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  package_type VARCHAR(50) DEFAULT 'multimodal',
  text_content TEXT,
  image_id UUID REFERENCES generated_images(id) ON DELETE SET NULL,
  video_id UUID REFERENCES generated_videos(id) ON DELETE SET NULL,
  platform VARCHAR(50),
  metadata JSONB,
  credits_used INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_packages_user ON content_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_content_packages_agent ON content_packages(agent_id);
CREATE INDEX IF NOT EXISTS idx_content_packages_status ON content_packages(status);
CREATE INDEX IF NOT EXISTS idx_content_packages_created ON content_packages(created_at DESC);

