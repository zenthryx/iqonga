-- Canva Integration Tables
-- Stores OAuth tokens and cached assets for Canva integration

-- Canva Integration table - stores OAuth tokens
CREATE TABLE IF NOT EXISTS canva_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- OAuth tokens (encrypted in application layer)
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Integration metadata
    canva_user_id VARCHAR(255),
    canva_email VARCHAR(255),
    scopes TEXT[], -- Granted scopes
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Canva assets cache - store downloaded designs for quick access
CREATE TABLE IF NOT EXISTS canva_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    canva_design_id VARCHAR(255) NOT NULL,
    
    -- Asset info
    name VARCHAR(255),
    type VARCHAR(50), -- 'image', 'video', 'design', 'template'
    format VARCHAR(20), -- 'png', 'jpg', 'mp4', etc.
    
    -- Local storage
    local_path TEXT,
    local_url TEXT,
    
    -- Canva metadata
    canva_url TEXT,
    thumbnail_url TEXT,
    width INTEGER,
    height INTEGER,
    file_size BIGINT,
    
    -- Usage tracking
    times_used INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, canva_design_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_canva_integrations_user_id ON canva_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_canva_integrations_active ON canva_integrations(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_canva_assets_user_id ON canva_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_canva_assets_type ON canva_assets(type);
CREATE INDEX IF NOT EXISTS idx_canva_assets_design_id ON canva_assets(canva_design_id);
