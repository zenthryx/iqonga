-- Twitter Analytics Historical Data Migration
-- Stores daily snapshots of Twitter metrics for trend analysis

-- Twitter Analytics Snapshots Table
CREATE TABLE IF NOT EXISTS twitter_analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    
    -- Follower metrics
    follower_count INTEGER DEFAULT 0,
    follower_change INTEGER DEFAULT 0, -- Change from previous day
    
    -- Engagement metrics
    total_tweets INTEGER DEFAULT 0,
    total_impressions BIGINT DEFAULT 0,
    total_likes BIGINT DEFAULT 0,
    total_retweets BIGINT DEFAULT 0,
    total_replies BIGINT DEFAULT 0,
    total_quotes BIGINT DEFAULT 0,
    engagement_rate DECIMAL(5, 2) DEFAULT 0,
    
    -- Post performance
    avg_likes_per_tweet DECIMAL(10, 2) DEFAULT 0,
    avg_retweets_per_tweet DECIMAL(10, 2) DEFAULT 0,
    avg_replies_per_tweet DECIMAL(10, 2) DEFAULT 0,
    avg_impressions_per_tweet BIGINT DEFAULT 0,
    
    -- Best time metrics
    best_hour INTEGER, -- UTC hour (0-23)
    best_day INTEGER, -- Day of week (0-6, Sunday=0)
    
    -- Mentions
    mention_count INTEGER DEFAULT 0,
    positive_mentions INTEGER DEFAULT 0,
    negative_mentions INTEGER DEFAULT 0,
    neutral_mentions INTEGER DEFAULT 0,
    
    -- Metadata
    username VARCHAR(255),
    platform_user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure one snapshot per user per day
    UNIQUE(user_id, snapshot_date)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_twitter_snapshots_user_date ON twitter_analytics_snapshots(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_twitter_snapshots_date ON twitter_analytics_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_twitter_snapshots_user ON twitter_analytics_snapshots(user_id);

-- Twitter Analytics Exports Table (track export history)
CREATE TABLE IF NOT EXISTS twitter_analytics_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    export_type VARCHAR(20) NOT NULL, -- 'csv', 'pdf'
    export_format VARCHAR(50), -- 'overview', 'posts', 'mentions', 'full'
    date_range_start DATE,
    date_range_end DATE,
    file_path TEXT,
    file_size_bytes INTEGER,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_twitter_exports_user ON twitter_analytics_exports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_twitter_exports_status ON twitter_analytics_exports(status) WHERE status IN ('pending', 'processing');

