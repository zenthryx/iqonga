-- Migration: Add Influencer Marketing Platform
-- Created: 2025-12-10
-- Description: AI-powered platform for discovering brand-safe, authentic creators by topic

-- Table for influencers/creators
CREATE TABLE IF NOT EXISTS influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL, -- instagram, tiktok, youtube, twitter, etc.
  platform_user_id VARCHAR(255) NOT NULL, -- External platform user ID
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  profile_image_url TEXT,
  bio TEXT,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0.00, -- Average engagement rate percentage
  authenticity_score DECIMAL(5,2) DEFAULT 0.00, -- AI-calculated authenticity score (0-100)
  brand_safety_score DECIMAL(5,2) DEFAULT 0.00, -- AI-calculated brand safety score (0-100)
  verified BOOLEAN DEFAULT FALSE,
  location VARCHAR(255),
  website_url TEXT,
  email VARCHAR(255),
  phone VARCHAR(50),
  categories TEXT[] DEFAULT '{}', -- Primary categories/topics
  tags TEXT[] DEFAULT '{}', -- Additional tags for discovery
  demographics JSONB DEFAULT '{}'::jsonb, -- Age range, gender, location breakdown
  content_themes JSONB DEFAULT '{}'::jsonb, -- Content themes and topics
  pricing JSONB DEFAULT '{}'::jsonb, -- Pricing information (post, story, reel, etc.)
  availability_status VARCHAR(50) DEFAULT 'available', -- available, busy, unavailable
  last_activity_at TIMESTAMP,
  last_synced_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional platform-specific data
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(platform, platform_user_id)
);

-- Table for influencer content samples
CREATE TABLE IF NOT EXISTS influencer_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  platform_post_id VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- post, story, reel, video, etc.
  content_url TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  mentions TEXT[] DEFAULT '{}',
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0.00,
  topics TEXT[] DEFAULT '{}', -- AI-extracted topics
  sentiment_score DECIMAL(3,2) DEFAULT 0.00, -- -1.0 to 1.0
  brand_safety_flags TEXT[] DEFAULT '{}', -- Any brand safety concerns
  posted_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(platform, platform_post_id)
);

-- Table for influencer campaigns (brand-influencer partnerships)
CREATE TABLE IF NOT EXISTS influencer_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(50) NOT NULL, -- sponsored_post, product_review, takeover, etc.
  objective VARCHAR(100), -- awareness, conversions, engagement, etc.
  budget DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'USD',
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, completed, cancelled
  target_audience JSONB DEFAULT '{}'::jsonb, -- Target demographics
  required_topics TEXT[] DEFAULT '{}', -- Required content topics
  excluded_topics TEXT[] DEFAULT '{}', -- Topics to avoid
  brand_guidelines TEXT, -- Brand guidelines for influencers
  deliverables JSONB DEFAULT '{}'::jsonb, -- Required deliverables
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table for campaign-influencer relationships
CREATE TABLE IF NOT EXISTS campaign_influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES influencer_campaigns(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, invited, accepted, declined, active, completed
  role VARCHAR(50), -- primary, secondary, micro, nano
  compensation DECIMAL(10,2),
  compensation_type VARCHAR(50), -- fixed, per_post, commission, product_only
  deliverables JSONB DEFAULT '{}'::jsonb, -- Specific deliverables for this influencer
  notes TEXT,
  performance_metrics JSONB DEFAULT '{}'::jsonb, -- Tracked performance
  invited_at TIMESTAMP,
  responded_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(campaign_id, influencer_id)
);

-- Table for influencer search history and saved searches
CREATE TABLE IF NOT EXISTS influencer_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  search_query TEXT,
  filters JSONB DEFAULT '{}'::jsonb, -- Applied filters
  results_count INTEGER DEFAULT 0,
  saved BOOLEAN DEFAULT FALSE,
  search_type VARCHAR(50) DEFAULT 'discovery', -- discovery, saved, recommendation
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table for saved influencers (user's favorite/bookmarked influencers)
CREATE TABLE IF NOT EXISTS saved_influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, influencer_id)
);

-- Table for influencer analytics and insights
CREATE TABLE IF NOT EXISTS influencer_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metrics JSONB DEFAULT '{}'::jsonb, -- Engagement, reach, impressions, etc.
  top_performing_content JSONB DEFAULT '[]'::jsonb,
  audience_growth INTEGER DEFAULT 0,
  engagement_trends JSONB DEFAULT '{}'::jsonb,
  topic_performance JSONB DEFAULT '{}'::jsonb, -- Performance by topic
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(influencer_id, period_start, period_end)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_influencers_platform ON influencers(platform);
CREATE INDEX IF NOT EXISTS idx_influencers_categories ON influencers USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_influencers_tags ON influencers USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_influencers_authenticity_score ON influencers(authenticity_score DESC);
CREATE INDEX IF NOT EXISTS idx_influencers_brand_safety_score ON influencers(brand_safety_score DESC);
CREATE INDEX IF NOT EXISTS idx_influencers_engagement_rate ON influencers(engagement_rate DESC);
CREATE INDEX IF NOT EXISTS idx_influencers_follower_count ON influencers(follower_count DESC);
CREATE INDEX IF NOT EXISTS idx_influencer_content_influencer_id ON influencer_content(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_content_topics ON influencer_content USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_influencer_content_posted_at ON influencer_content(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_influencer_campaigns_user_id ON influencer_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_influencer_campaigns_status ON influencer_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_influencers_campaign_id ON campaign_influencers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_influencers_influencer_id ON campaign_influencers(influencer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_influencers_status ON campaign_influencers(status);
CREATE INDEX IF NOT EXISTS idx_influencer_searches_user_id ON influencer_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_influencers_user_id ON saved_influencers(user_id);
CREATE INDEX IF NOT EXISTS idx_influencer_analytics_influencer_id ON influencer_analytics(influencer_id);

-- Add comments
COMMENT ON TABLE influencers IS 'Influencers/creators discovered and tracked on the platform';
COMMENT ON TABLE influencer_content IS 'Content samples from influencers for analysis';
COMMENT ON TABLE influencer_campaigns IS 'Brand campaigns involving influencers';
COMMENT ON TABLE campaign_influencers IS 'Relationships between campaigns and influencers';
COMMENT ON TABLE influencer_searches IS 'User search history for influencer discovery';
COMMENT ON TABLE saved_influencers IS 'User-saved/bookmarked influencers';
COMMENT ON TABLE influencer_analytics IS 'Analytics and insights for influencers';

