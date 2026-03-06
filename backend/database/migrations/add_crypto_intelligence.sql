-- Crypto Intelligence Module schema
-- Monitors, snapshots, alerts, usage, and job queue

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS crypto_monitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_symbol VARCHAR(20) NOT NULL,
    token_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,

    -- Alert settings
    sentiment_threshold DECIMAL(5,2) DEFAULT 5.0,
    mention_spike_threshold INTEGER DEFAULT 5,
    track_influencers BOOLEAN DEFAULT TRUE,
    influencer_handles TEXT[],

    -- Content generation settings
    auto_post_enabled BOOLEAN DEFAULT FALSE,
    post_channels TEXT[] DEFAULT ARRAY[]::TEXT[],
    content_style VARCHAR(50) DEFAULT 'professional',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crypto_monitors_user ON crypto_monitors(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_monitors_active ON crypto_monitors(is_active);

CREATE TABLE IF NOT EXISTS sentiment_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    monitor_id UUID NOT NULL REFERENCES crypto_monitors(id) ON DELETE CASCADE,
    token_symbol VARCHAR(20) NOT NULL,

    -- Sentiment metrics
    sentiment_score DECIMAL(5,2),
    mention_count INTEGER,
    positive_count INTEGER,
    negative_count INTEGER,
    neutral_count INTEGER,

    -- Key phrases detected
    market_moving_phrases TEXT[],

    -- Influencer activity
    influencer_mentions INTEGER,
    top_influencer_sentiment VARCHAR(20),

    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentiment_monitor ON sentiment_snapshots(monitor_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_time ON sentiment_snapshots(snapshot_time);
CREATE INDEX IF NOT EXISTS idx_sentiment_token ON sentiment_snapshots(token_symbol, snapshot_time);

CREATE TABLE IF NOT EXISTS crypto_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    monitor_id UUID NOT NULL REFERENCES crypto_monitors(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',

    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,

    channels_sent TEXT[],
    content_generated_id UUID,

    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON crypto_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_monitor ON crypto_alerts(monitor_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON crypto_alerts(created_at DESC);

CREATE TABLE IF NOT EXISTS crypto_api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    operation_type VARCHAR(50) NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 1,

    grok_model VARCHAR(50),
    sources_used INTEGER DEFAULT 0,

    estimated_cost_usd DECIMAL(10,6),
    credits_deducted DECIMAL(10,2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user ON crypto_api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON crypto_api_usage(created_at DESC);

CREATE TABLE IF NOT EXISTS crypto_monitoring_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    monitor_id UUID NOT NULL REFERENCES crypto_monitors(id) ON DELETE CASCADE,

    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',

    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    result JSONB,
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_monitor ON crypto_monitoring_jobs(monitor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON crypto_monitoring_jobs(status, scheduled_at);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_crypto_monitors_updated_at ON crypto_monitors;
CREATE TRIGGER update_crypto_monitors_updated_at
    BEFORE UPDATE ON crypto_monitors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

