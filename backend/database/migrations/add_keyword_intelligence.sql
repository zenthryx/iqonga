-- Keyword & Hashtag Intelligence Module schema
-- Monitors, snapshots, alerts, usage, and collections
-- Created: 2025-12-14

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for keyword/hashtag monitors
CREATE TABLE IF NOT EXISTS keyword_monitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL, -- The keyword or hashtag to monitor
    monitor_type VARCHAR(20) NOT NULL DEFAULT 'keyword' CHECK (monitor_type IN ('keyword', 'hashtag')),
    platform VARCHAR(50) NOT NULL DEFAULT 'twitter' CHECK (platform IN ('twitter', 'instagram', 'google', 'all')),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Alert settings
    sentiment_threshold DECIMAL(5,2) DEFAULT 5.0, -- Alert if sentiment changes by this amount
    mention_spike_threshold INTEGER DEFAULT 5, -- Alert if mentions increase by this percentage
    track_influencers BOOLEAN DEFAULT TRUE,
    influencer_handles TEXT[], -- Specific influencers to track
    
    -- Monitoring settings
    monitoring_frequency VARCHAR(20) DEFAULT '15min' CHECK (monitoring_frequency IN ('5min', '15min', '30min', '1hour', '6hour', '24hour')),
    exclude_keywords TEXT[], -- Keywords to exclude from results
    
    -- Content generation settings
    auto_post_enabled BOOLEAN DEFAULT FALSE,
    post_channels TEXT[] DEFAULT ARRAY[]::TEXT[],
    content_style VARCHAR(50) DEFAULT 'professional',
    
    -- Metadata
    tags TEXT[] DEFAULT '{}', -- User-defined tags for organization
    notes TEXT, -- User notes about this monitor
    collection_id UUID, -- Optional: link to a collection
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keyword_monitors_user ON keyword_monitors(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_monitors_active ON keyword_monitors(is_active);
CREATE INDEX IF NOT EXISTS idx_keyword_monitors_keyword ON keyword_monitors(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_monitors_type ON keyword_monitors(monitor_type);

-- Table for keyword/hashtag snapshots (historical data)
CREATE TABLE IF NOT EXISTS keyword_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    monitor_id UUID NOT NULL REFERENCES keyword_monitors(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    
    -- Sentiment metrics
    sentiment_score DECIMAL(5,2), -- -100 to 100
    mention_count INTEGER DEFAULT 0,
    positive_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    
    -- Engagement metrics
    total_likes INTEGER DEFAULT 0,
    total_retweets INTEGER DEFAULT 0,
    total_replies INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Key phrases detected
    trending_phrases TEXT[],
    related_keywords TEXT[], -- AI-discovered related keywords
    
    -- Influencer activity
    influencer_mentions INTEGER DEFAULT 0,
    top_influencer_sentiment VARCHAR(20), -- bullish, bearish, neutral
    top_influencers JSONB DEFAULT '[]'::jsonb, -- Array of top influencer data
    
    -- Geographic data (when available)
    top_locations TEXT[],
    
    -- Raw data
    sample_posts JSONB DEFAULT '[]'::jsonb, -- Sample of top posts
    raw_data JSONB DEFAULT '{}'::jsonb, -- Full raw response from API
    
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keyword_snapshots_monitor ON keyword_snapshots(monitor_id);
CREATE INDEX IF NOT EXISTS idx_keyword_snapshots_time ON keyword_snapshots(snapshot_time);
CREATE INDEX IF NOT EXISTS idx_keyword_snapshots_keyword ON keyword_snapshots(keyword, snapshot_time);

-- Table for keyword/hashtag alerts
CREATE TABLE IF NOT EXISTS keyword_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    monitor_id UUID NOT NULL REFERENCES keyword_monitors(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    alert_type VARCHAR(50) NOT NULL, -- sentiment_shift, mention_spike, influencer_activity, trending
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional alert data
    
    -- Alert details
    previous_value DECIMAL(10,2), -- Previous metric value
    current_value DECIMAL(10,2), -- Current metric value
    change_percent DECIMAL(5,2), -- Percentage change
    
    -- Notification channels
    channels_sent TEXT[], -- Where alert was sent (email, in-app, etc.)
    content_generated_id UUID, -- If auto-post was generated
    
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keyword_alerts_user ON keyword_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_alerts_monitor ON keyword_alerts(monitor_id);
CREATE INDEX IF NOT EXISTS idx_keyword_alerts_created ON keyword_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_alerts_read ON keyword_alerts(is_read, created_at DESC);

-- Table for API usage tracking
CREATE TABLE IF NOT EXISTS keyword_api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    operation_type VARCHAR(50) NOT NULL, -- keyword_x_search, hashtag_x_search, keyword_sentiment_analysis, etc.
    tokens_used INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 1,
    
    grok_model VARCHAR(50),
    sources_used INTEGER DEFAULT 0,
    
    estimated_cost_usd DECIMAL(10,6),
    credits_deducted DECIMAL(10,4),
    
    monitor_id UUID REFERENCES keyword_monitors(id) ON DELETE SET NULL,
    keyword VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keyword_api_usage_user ON keyword_api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_api_usage_created ON keyword_api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_api_usage_operation ON keyword_api_usage(operation_type, created_at);

-- Table for hashtag/keyword collections (organizational tool)
CREATE TABLE IF NOT EXISTS keyword_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    color VARCHAR(20), -- For UI organization
    tags TEXT[] DEFAULT '{}',
    
    -- Statistics (cached)
    total_keywords INTEGER DEFAULT 0,
    total_mentions INTEGER DEFAULT 0,
    avg_sentiment DECIMAL(5,2) DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keyword_collections_user ON keyword_collections(user_id);

-- Table for keyword research results (discovery tool)
CREATE TABLE IF NOT EXISTS keyword_research (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    research_type VARCHAR(50) NOT NULL, -- trending, related, competitor, suggestion
    query VARCHAR(255) NOT NULL, -- The keyword/hashtag researched
    platform VARCHAR(50) DEFAULT 'twitter',
    
    -- Research results
    results JSONB DEFAULT '{}'::jsonb, -- Structured research data
    trending_keywords TEXT[], -- Discovered trending keywords
    related_keywords TEXT[], -- Related keywords
    suggested_hashtags TEXT[], -- Suggested hashtags
    competitor_keywords TEXT[], -- Competitor keywords found
    
    -- Metrics
    search_volume INTEGER, -- Estimated search volume
    competition_level VARCHAR(20), -- low, medium, high
    trend_direction VARCHAR(20), -- rising, falling, stable
    
    -- Metadata
    notes TEXT,
    saved BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keyword_research_user ON keyword_research(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_research_query ON keyword_research(query);
CREATE INDEX IF NOT EXISTS idx_keyword_research_saved ON keyword_research(saved, created_at DESC);

-- Add foreign key for collection_id in keyword_monitors
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'keyword_monitors_collection_id_fkey'
    ) THEN
        ALTER TABLE keyword_monitors
        ADD CONSTRAINT keyword_monitors_collection_id_fkey
        FOREIGN KEY (collection_id) REFERENCES keyword_collections(id) ON DELETE SET NULL;
    END IF;
END $$;

