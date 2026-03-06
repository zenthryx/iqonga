-- Migration: Add facebook_data_deletion_requests table

CREATE TABLE IF NOT EXISTS facebook_data_deletion_requests (
    id UUID PRIMARY KEY,
    platform_user_id VARCHAR(100),
    payload JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facebook_data_deletion_status ON facebook_data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_facebook_data_deletion_platform_user_id ON facebook_data_deletion_requests(platform_user_id);

