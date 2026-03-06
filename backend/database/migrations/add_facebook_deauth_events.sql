-- Migration: Add facebook_deauthorization_events table

CREATE TABLE IF NOT EXISTS facebook_deauthorization_events (
    id UUID PRIMARY KEY,
    platform_user_id VARCHAR(100),
    payload JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fb_deauth_platform_user_id ON facebook_deauthorization_events(platform_user_id);

