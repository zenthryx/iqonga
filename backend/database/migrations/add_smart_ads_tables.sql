-- Smart Ads & Campaign Tables Migration
-- Run this migration to add Smart Ad Generator support

-- Smart Ads table - stores individual ad creatives
CREATE TABLE IF NOT EXISTS smart_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
    product_id UUID,
    
    -- Ad Configuration
    ad_type VARCHAR(50) NOT NULL DEFAULT 'product_showcase',
    platforms JSONB NOT NULL DEFAULT '[]',
    visual_style VARCHAR(50) DEFAULT 'modern',
    
    -- Generated Content
    copy_variants JSONB DEFAULT '[]',
    visual_assets JSONB DEFAULT '{}',
    video_assets JSONB DEFAULT '{}',
    ugc_assets JSONB DEFAULT '{}',
    ad_packages JSONB DEFAULT '{}',
    
    -- Original Generation Options
    generation_options JSONB DEFAULT '{}',
    
    -- Status & Metadata
    status VARCHAR(20) DEFAULT 'draft',
    favorite BOOLEAN DEFAULT FALSE,
    tags JSONB DEFAULT '[]',
    notes TEXT,
    
    -- Usage Tracking
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Performance Metrics (populated after ads are run)
    performance_metrics JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ad Campaigns table - groups multiple ads into campaigns
CREATE TABLE IF NOT EXISTS ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Campaign Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50) DEFAULT 'multi_platform',
    objective VARCHAR(50) DEFAULT 'awareness',
    
    -- Targeting
    target_audience JSONB DEFAULT '{}',
    target_platforms JSONB DEFAULT '[]',
    target_locations JSONB DEFAULT '[]',
    
    -- Budget & Schedule
    budget JSONB DEFAULT '{}',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    schedule_config JSONB DEFAULT '{}',
    
    -- Associated Ads
    ad_ids JSONB DEFAULT '[]',
    
    -- Content Calendar
    content_calendar JSONB DEFAULT '[]',
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft',
    
    -- Performance
    total_impressions BIGINT DEFAULT 0,
    total_clicks BIGINT DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_spend DECIMAL(10, 2) DEFAULT 0,
    performance_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign Posts table - tracks individual posts within campaigns
CREATE TABLE IF NOT EXISTS campaign_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
    smart_ad_id UUID REFERENCES smart_ads(id) ON DELETE SET NULL,
    
    -- Post Details
    platform VARCHAR(50) NOT NULL,
    format VARCHAR(50) NOT NULL,
    content_variant INTEGER DEFAULT 0,
    
    -- Scheduling
    scheduled_time TIMESTAMP WITH TIME ZONE,
    posted_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    external_post_id VARCHAR(255),
    
    -- Performance
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ad Templates table - reusable ad templates
CREATE TABLE IF NOT EXISTS ad_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Template Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) DEFAULT 'custom',
    category VARCHAR(50),
    
    -- Template Configuration
    platforms JSONB DEFAULT '[]',
    ad_type VARCHAR(50),
    visual_style VARCHAR(50),
    default_cta VARCHAR(100),
    
    -- Template Content
    headline_template TEXT,
    body_template TEXT,
    image_prompt_template TEXT,
    
    -- Visibility
    is_public BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT FALSE,
    
    -- Usage
    times_used INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_smart_ads_user_id ON smart_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_smart_ads_status ON smart_ads(status);
CREATE INDEX IF NOT EXISTS idx_smart_ads_created_at ON smart_ads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smart_ads_ad_type ON smart_ads(ad_type);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_user_id ON ad_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_dates ON ad_campaigns(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_campaign_posts_campaign_id ON campaign_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_posts_scheduled ON campaign_posts(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_campaign_posts_status ON campaign_posts(status);

CREATE INDEX IF NOT EXISTS idx_ad_templates_user_id ON ad_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_templates_public ON ad_templates(is_public) WHERE is_public = TRUE;

-- Insert default system templates
INSERT INTO ad_templates (name, description, template_type, category, platforms, ad_type, visual_style, is_system, is_public)
VALUES 
    ('Product Launch', 'Perfect for announcing new products', 'product_launch', 'product', '["facebook", "instagram"]', 'product_showcase', 'modern', TRUE, TRUE),
    ('Flash Sale', 'Create urgency with limited-time offers', 'promotional', 'sales', '["facebook", "instagram", "twitter"]', 'urgency', 'bold', TRUE, TRUE),
    ('Brand Story', 'Tell your brand story across platforms', 'brand', 'awareness', '["facebook", "instagram", "linkedin"]', 'storytelling', 'lifestyle', TRUE, TRUE),
    ('Customer Testimonial', 'Share authentic customer experiences', 'ugc', 'social_proof', '["facebook", "instagram", "tiktok"]', 'testimonial', 'organic', TRUE, TRUE),
    ('Educational Content', 'Teach and inform your audience', 'educational', 'engagement', '["linkedin", "youtube", "facebook"]', 'educational', 'professional', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_smart_ads_updated_at ON smart_ads;
CREATE TRIGGER update_smart_ads_updated_at
    BEFORE UPDATE ON smart_ads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ad_campaigns_updated_at ON ad_campaigns;
CREATE TRIGGER update_ad_campaigns_updated_at
    BEFORE UPDATE ON ad_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaign_posts_updated_at ON campaign_posts;
CREATE TRIGGER update_campaign_posts_updated_at
    BEFORE UPDATE ON campaign_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ad_templates_updated_at ON ad_templates;
CREATE TRIGGER update_ad_templates_updated_at
    BEFORE UPDATE ON ad_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE smart_ads IS 'AI-generated ad creatives with multi-platform support';
COMMENT ON TABLE ad_campaigns IS 'Marketing campaigns grouping multiple ads across platforms';
COMMENT ON TABLE campaign_posts IS 'Individual scheduled posts within campaigns';
COMMENT ON TABLE ad_templates IS 'Reusable templates for ad generation';

COMMENT ON COLUMN smart_ads.ad_packages IS 'Bundled platform-specific ad packages ready for deployment';
COMMENT ON COLUMN smart_ads.copy_variants IS 'Multiple text variations for A/B testing';
COMMENT ON COLUMN ad_campaigns.content_calendar IS 'AI-generated posting schedule for the campaign';

