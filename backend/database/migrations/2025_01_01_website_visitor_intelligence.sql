/**
 * Website Visitor Intelligence Database Schema
 * Tracks website visitors and converts them to leads
 * Date: January 1, 2025
 */

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- WEBSITE VISITORS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS website_visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Visitor Identification
    visitor_id VARCHAR(255) UNIQUE NOT NULL, -- Unique visitor identifier (cookie/session)
    ip_address VARCHAR(45), -- IPv4 or IPv6
    user_agent TEXT,
    referrer_url TEXT,
    
    -- First Visit
    first_visit_at TIMESTAMP DEFAULT NOW(),
    last_visit_at TIMESTAMP DEFAULT NOW(),
    total_visits INTEGER DEFAULT 1,
    
    -- Company/Contact Intelligence
    company_name VARCHAR(200),
    company_domain VARCHAR(255),
    company_industry VARCHAR(100),
    company_size VARCHAR(50), -- '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
    
    -- Contact Information (if identified)
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    job_title VARCHAR(150),
    phone VARCHAR(50),
    
    -- Lead Status
    converted_to_lead BOOLEAN DEFAULT false,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    converted_at TIMESTAMP,
    
    -- Scoring
    visitor_score INTEGER DEFAULT 0, -- 0-100
    intent_score INTEGER DEFAULT 0, -- 0-100
    engagement_score INTEGER DEFAULT 0, -- 0-100
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Additional visitor data
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================================
-- VISITOR SESSIONS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS visitor_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID REFERENCES website_visitors(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session Details
    session_id VARCHAR(255) NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    
    -- Page Views
    page_views INTEGER DEFAULT 0,
    unique_pages INTEGER DEFAULT 0,
    
    -- Engagement
    time_on_site INTEGER DEFAULT 0, -- Total seconds
    bounce BOOLEAN DEFAULT false,
    exit_page VARCHAR(500),
    entry_page VARCHAR(500),
    
    -- Device & Location
    device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(100),
    os VARCHAR(100),
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- Traffic Source
    source VARCHAR(50), -- 'direct', 'organic', 'paid', 'social', 'referral', 'email'
    medium VARCHAR(50), -- 'search', 'cpc', 'social', 'email', 'referral'
    campaign VARCHAR(255),
    keyword VARCHAR(255),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================================
-- VISITOR PAGE VIEWS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS visitor_page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID REFERENCES website_visitors(id) ON DELETE CASCADE,
    session_id UUID REFERENCES visitor_sessions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Page Details
    page_url TEXT NOT NULL,
    page_title VARCHAR(500),
    page_path VARCHAR(500),
    
    -- Engagement
    time_on_page INTEGER DEFAULT 0, -- Seconds
    scroll_depth INTEGER DEFAULT 0, -- Percentage 0-100
    engaged BOOLEAN DEFAULT false, -- User engaged with page
    
    -- Actions
    clicks INTEGER DEFAULT 0,
    form_submissions INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    video_plays INTEGER DEFAULT 0,
    
    -- Intent Signals
    viewed_pricing BOOLEAN DEFAULT false,
    viewed_demo BOOLEAN DEFAULT false,
    viewed_case_studies BOOLEAN DEFAULT false,
    viewed_blog BOOLEAN DEFAULT false,
    
    -- Timestamp
    viewed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ====================================
-- VISITOR EVENTS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS visitor_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID REFERENCES website_visitors(id) ON DELETE CASCADE,
    session_id UUID REFERENCES visitor_sessions(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Event Details
    event_type VARCHAR(100) NOT NULL, -- 'page_view', 'click', 'form_submit', 'download', 'video_play', 'chat_start', 'demo_request'
    event_name VARCHAR(255),
    event_value VARCHAR(500),
    
    -- Event Data
    event_data JSONB DEFAULT '{}',
    
    -- Page Context
    page_url TEXT,
    page_title VARCHAR(500),
    
    -- Timestamp
    occurred_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ====================================
-- VISITOR LEAD CONVERSIONS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS visitor_lead_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID REFERENCES website_visitors(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Conversion Details
    conversion_type VARCHAR(50) NOT NULL, -- 'auto', 'manual', 'form_submit', 'chat', 'demo_request'
    conversion_source VARCHAR(100), -- 'contact_form', 'chat_widget', 'demo_form', 'pricing_page', 'manual'
    
    -- Conversion Data
    conversion_data JSONB DEFAULT '{}',
    
    -- Scoring at Conversion
    visitor_score INTEGER,
    intent_score INTEGER,
    engagement_score INTEGER,
    
    -- Timestamp
    converted_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ====================================
-- INDEXES FOR PERFORMANCE
-- ====================================

-- Website Visitors
CREATE INDEX IF NOT EXISTS idx_visitors_user_id ON website_visitors(user_id);
CREATE INDEX IF NOT EXISTS idx_visitors_visitor_id ON website_visitors(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitors_company_domain ON website_visitors(company_domain);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON website_visitors(email);
CREATE INDEX IF NOT EXISTS idx_visitors_converted ON website_visitors(converted_to_lead);
CREATE INDEX IF NOT EXISTS idx_visitors_score ON website_visitors(visitor_score DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_last_visit ON website_visitors(last_visit_at DESC);

-- Visitor Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_visitor_id ON visitor_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON visitor_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON visitor_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON visitor_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_source ON visitor_sessions(source);

-- Page Views
CREATE INDEX IF NOT EXISTS idx_page_views_visitor_id ON visitor_page_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON visitor_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON visitor_page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON visitor_page_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON visitor_page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_intent_signals ON visitor_page_views(viewed_pricing, viewed_demo, viewed_case_studies);

-- Events
CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON visitor_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON visitor_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON visitor_events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON visitor_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON visitor_events(occurred_at DESC);

-- Conversions
CREATE INDEX IF NOT EXISTS idx_conversions_visitor_id ON visitor_lead_conversions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_conversions_lead_id ON visitor_lead_conversions(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversions_user_id ON visitor_lead_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversions_converted_at ON visitor_lead_conversions(converted_at DESC);

-- ====================================
-- TRIGGERS FOR AUTO-UPDATES
-- ====================================

-- Update visitor updated_at
CREATE OR REPLACE FUNCTION update_visitor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_visitor_updated_at
    BEFORE UPDATE ON website_visitors
    FOR EACH ROW
    EXECUTE FUNCTION update_visitor_updated_at();

-- Update session updated_at
CREATE OR REPLACE FUNCTION update_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_updated_at
    BEFORE UPDATE ON visitor_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_session_updated_at();

-- Auto-update visitor stats when session ends
CREATE OR REPLACE FUNCTION update_visitor_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        UPDATE website_visitors
        SET 
            last_visit_at = NEW.ended_at,
            total_visits = total_visits + 1,
            updated_at = NOW()
        WHERE id = NEW.visitor_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_visitor_stats
    AFTER UPDATE ON visitor_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_visitor_stats();

-- Auto-update session page_views count
CREATE OR REPLACE FUNCTION update_session_page_views()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE visitor_sessions
        SET 
            page_views = page_views + 1,
            unique_pages = (
                SELECT COUNT(DISTINCT page_path) 
                FROM visitor_page_views 
                WHERE session_id = NEW.session_id
            ),
            updated_at = NOW()
        WHERE id = NEW.session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_page_views
    AFTER INSERT ON visitor_page_views
    FOR EACH ROW
    EXECUTE FUNCTION update_session_page_views();

-- ====================================
-- COMMENTS FOR DOCUMENTATION
-- ====================================

COMMENT ON TABLE website_visitors IS 'Website visitors tracked for lead generation';
COMMENT ON TABLE visitor_sessions IS 'Individual visitor sessions';
COMMENT ON TABLE visitor_page_views IS 'Page views per visitor session';
COMMENT ON TABLE visitor_events IS 'Events tracked per visitor (clicks, form submits, etc.)';
COMMENT ON TABLE visitor_lead_conversions IS 'Conversion history from visitor to lead';

COMMENT ON COLUMN website_visitors.visitor_score IS 'Overall visitor score (0-100) based on behavior';
COMMENT ON COLUMN website_visitors.intent_score IS 'Intent score (0-100) based on pages viewed';
COMMENT ON COLUMN website_visitors.engagement_score IS 'Engagement score (0-100) based on interactions';

