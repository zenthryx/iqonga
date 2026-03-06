-- Migration: Add Manual Campaigns and Whiteboard Planning Space
-- Created: 2025-12-10

-- Table for manual campaigns (user-created campaigns with manual content)
CREATE TABLE IF NOT EXISTS manual_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, active, paused, completed, cancelled
  platforms TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb -- Store additional campaign settings
);

-- Table for campaign posts (manual posts within a campaign)
CREATE TABLE IF NOT EXISTS manual_campaign_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES manual_campaigns(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  format VARCHAR(50) DEFAULT 'feed', -- feed, story, reel, etc.
  scheduled_time TIMESTAMP NOT NULL,
  content_text TEXT,
  content_config JSONB DEFAULT '{}'::jsonb, -- Store images, videos, hashtags, etc.
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, posted, failed
  smart_ad_id UUID REFERENCES smart_ads(id) ON DELETE SET NULL, -- Link to AI-generated ad if used
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table for whiteboard/planning space
CREATE TABLE IF NOT EXISTS whiteboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  canvas_data JSONB DEFAULT '{}'::jsonb, -- Store canvas elements (notes, images, links, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table for whiteboard elements (notes, images, links, etc.)
CREATE TABLE IF NOT EXISTS whiteboard_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  element_type VARCHAR(50) NOT NULL, -- note, image, link, ad_reference, campaign_reference
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  width FLOAT,
  height FLOAT,
  content JSONB DEFAULT '{}'::jsonb, -- Store element-specific data
  style JSONB DEFAULT '{}'::jsonb, -- Store styling (color, font, etc.)
  z_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_manual_campaigns_user_id ON manual_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_campaigns_status ON manual_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_manual_campaign_posts_campaign_id ON manual_campaign_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_manual_campaign_posts_user_id ON manual_campaign_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_campaign_posts_scheduled_time ON manual_campaign_posts(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_whiteboards_user_id ON whiteboards(user_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_elements_whiteboard_id ON whiteboard_elements(whiteboard_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_elements_user_id ON whiteboard_elements(user_id);

-- Add comments
COMMENT ON TABLE manual_campaigns IS 'User-created campaigns with manual content planning';
COMMENT ON TABLE manual_campaign_posts IS 'Individual posts within a manual campaign';
COMMENT ON TABLE whiteboards IS 'Planning space for organizing ideas and content';
COMMENT ON TABLE whiteboard_elements IS 'Elements (notes, images, links) on a whiteboard canvas';

