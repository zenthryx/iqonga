-- ====================================
-- Ajentrix Sales Functions Database Schema
-- Phase 1: Lead Management & Sales Pipeline
-- Created: December 30, 2024
-- ====================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- LEADS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL,
    
    -- Contact Information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    company_name VARCHAR(200),
    job_title VARCHAR(150),
    
    -- Social & Web
    linkedin_url VARCHAR(500),
    twitter_handle VARCHAR(100),
    website_url VARCHAR(500),
    
    -- Lead Source
    source VARCHAR(50) NOT NULL, -- 'website', 'social_media', 'email', 'referral', 'manual', 'api'
    source_details JSONB DEFAULT '{}', -- Additional source metadata
    
    -- Lead Status
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'
    stage VARCHAR(50) DEFAULT 'lead', -- 'lead', 'mql', 'sql', 'opportunity', 'customer'
    
    -- Qualification
    is_qualified BOOLEAN DEFAULT false,
    qualification_score INTEGER DEFAULT 0, -- 0-100
    qualification_notes TEXT,
    
    -- BANT (Budget, Authority, Need, Timeline)
    has_budget BOOLEAN,
    has_authority BOOLEAN,
    has_need BOOLEAN,
    timeline VARCHAR(50), -- 'immediate', '1-3_months', '3-6_months', '6-12_months', 'no_timeline'
    
    -- Lead Scoring
    lead_score INTEGER DEFAULT 0, -- 0-100 calculated score
    behavioral_score INTEGER DEFAULT 0,
    firmographic_score INTEGER DEFAULT 0,
    intent_score INTEGER DEFAULT 0,
    
    -- Enrichment Data
    company_size VARCHAR(50), -- 'solo', '2-10', '11-50', '51-200', '201-500', '500+'
    industry VARCHAR(100),
    revenue_range VARCHAR(50),
    location VARCHAR(200),
    country VARCHAR(100),
    
    -- Engagement Tracking
    website_visits INTEGER DEFAULT 0,
    pages_viewed INTEGER DEFAULT 0,
    email_opens INTEGER DEFAULT 0,
    email_clicks INTEGER DEFAULT 0,
    social_interactions INTEGER DEFAULT 0,
    content_downloads INTEGER DEFAULT 0,
    
    -- Assignment
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP,
    
    -- Important Dates
    last_contact_date TIMESTAMP,
    last_activity_date TIMESTAMP,
    qualified_at TIMESTAMP,
    converted_at TIMESTAMP,
    
    -- Custom Fields
    custom_fields JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for Leads
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_company_profile_id ON leads(company_profile_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_lead_score ON leads(lead_score DESC);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_last_activity_date ON leads(last_activity_date DESC);

-- ====================================
-- DEALS/OPPORTUNITIES TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Deal Information
    deal_name VARCHAR(300) NOT NULL,
    description TEXT,
    
    -- Deal Value
    amount DECIMAL(15, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Pipeline & Stage
    pipeline VARCHAR(100) DEFAULT 'default', -- Support for multiple pipelines
    stage VARCHAR(100) NOT NULL, -- 'lead', 'qualified', 'meeting', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
    stage_entered_at TIMESTAMP DEFAULT NOW(),
    
    -- Probability & Forecast
    win_probability INTEGER DEFAULT 50, -- 0-100%
    expected_value DECIMAL(15, 2) GENERATED ALWAYS AS (amount * win_probability / 100.0) STORED,
    
    -- Timeline
    expected_close_date DATE,
    actual_close_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'won', 'lost'
    close_reason VARCHAR(200), -- Reason for won/lost
    
    -- Assignment
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP,
    
    -- Deal Source
    source VARCHAR(50), -- 'inbound', 'outbound', 'referral', 'partner'
    
    -- Contact Information (from lead)
    contact_name VARCHAR(200),
    contact_email VARCHAR(255),
    company_name VARCHAR(200),
    
    -- Important Dates
    last_activity_date TIMESTAMP,
    next_follow_up_date TIMESTAMP,
    
    -- Custom Fields
    custom_fields JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for Deals
CREATE INDEX idx_deals_user_id ON deals(user_id);
CREATE INDEX idx_deals_company_profile_id ON deals(company_profile_id);
CREATE INDEX idx_deals_lead_id ON deals(lead_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_assigned_to ON deals(assigned_to);
CREATE INDEX idx_deals_expected_close_date ON deals(expected_close_date);
CREATE INDEX idx_deals_amount ON deals(amount DESC);
CREATE INDEX idx_deals_created_at ON deals(created_at DESC);

-- ====================================
-- ACTIVITIES TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL,
    
    -- Related Records
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    
    -- Activity Type
    activity_type VARCHAR(50) NOT NULL, -- 'email_sent', 'email_received', 'call', 'meeting', 'note', 'task', 'linkedin_message', 'social_interaction'
    
    -- Activity Details
    subject VARCHAR(300),
    description TEXT,
    outcome VARCHAR(100), -- 'successful', 'no_answer', 'voicemail', 'scheduled', 'completed'
    
    -- Duration (for calls/meetings)
    duration_minutes INTEGER,
    
    -- Scheduled vs Completed
    scheduled_at TIMESTAMP,
    completed_at TIMESTAMP,
    is_completed BOOLEAN DEFAULT false,
    
    -- Email Specific
    email_thread_id VARCHAR(255),
    email_message_id VARCHAR(255),
    email_opened BOOLEAN DEFAULT false,
    email_clicked BOOLEAN DEFAULT false,
    
    -- Call Specific
    call_direction VARCHAR(20), -- 'inbound', 'outbound'
    call_recording_url VARCHAR(500),
    
    -- Meeting Specific
    meeting_url VARCHAR(500),
    meeting_attendees TEXT[],
    
    -- Task Specific
    task_priority VARCHAR(20), -- 'low', 'medium', 'high', 'urgent'
    task_due_date TIMESTAMP,
    task_assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Custom Fields
    custom_fields JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for Activities
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_lead_id ON activities(lead_id);
CREATE INDEX idx_activities_deal_id ON activities(deal_id);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_scheduled_at ON activities(scheduled_at);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_activities_task_assigned_to ON activities(task_assigned_to) WHERE activity_type = 'task';
CREATE INDEX idx_activities_incomplete_tasks ON activities(task_due_date) WHERE activity_type = 'task' AND is_completed = false;

-- ====================================
-- LEAD SCORING RULES TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
    
    -- Rule Information
    rule_name VARCHAR(200) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'behavioral', 'firmographic', 'intent'
    
    -- Rule Conditions
    condition_field VARCHAR(100) NOT NULL, -- Field to check (e.g., 'website_visits', 'company_size')
    condition_operator VARCHAR(20) NOT NULL, -- 'equals', 'greater_than', 'less_than', 'contains', etc.
    condition_value VARCHAR(255) NOT NULL,
    
    -- Scoring
    points INTEGER NOT NULL, -- Points to add/subtract
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Lead Scoring Rules
CREATE INDEX idx_scoring_rules_user_id ON lead_scoring_rules(user_id);
CREATE INDEX idx_scoring_rules_active ON lead_scoring_rules(is_active);

-- ====================================
-- LEAD SOURCES TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS lead_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL,
    
    -- Source Information
    source_name VARCHAR(200) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'website', 'social_media', 'email', 'referral', 'advertising', 'event', 'other'
    
    -- Source Details
    description TEXT,
    source_url VARCHAR(500),
    
    -- Tracking
    total_leads INTEGER DEFAULT 0,
    qualified_leads INTEGER DEFAULT 0,
    converted_leads INTEGER DEFAULT 0,
    
    -- Cost Tracking
    cost_per_lead DECIMAL(10, 2),
    total_cost DECIMAL(10, 2),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Lead Sources
CREATE INDEX idx_lead_sources_user_id ON lead_sources(user_id);
CREATE INDEX idx_lead_sources_type ON lead_sources(source_type);

-- ====================================
-- PIPELINE STAGES TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL,
    
    -- Pipeline Information
    pipeline_name VARCHAR(100) NOT NULL DEFAULT 'default',
    stage_name VARCHAR(100) NOT NULL,
    stage_order INTEGER NOT NULL,
    
    -- Stage Configuration
    default_win_probability INTEGER, -- Default probability for this stage
    stage_color VARCHAR(20), -- Hex color for UI
    
    -- Automation
    auto_create_tasks JSONB DEFAULT '[]', -- Tasks to auto-create when deal enters stage
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, pipeline_name, stage_name)
);

-- Indexes for Pipeline Stages
CREATE INDEX idx_pipeline_stages_user_id ON pipeline_stages(user_id);
CREATE INDEX idx_pipeline_stages_order ON pipeline_stages(pipeline_name, stage_order);

-- ====================================
-- DEAL STAGE HISTORY TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS deal_stage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    
    -- Stage Change
    from_stage VARCHAR(100),
    to_stage VARCHAR(100) NOT NULL,
    
    -- Duration
    time_in_stage_days INTEGER,
    
    -- Metadata
    changed_at TIMESTAMP DEFAULT NOW(),
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for Deal Stage History
CREATE INDEX idx_stage_history_deal_id ON deal_stage_history(deal_id);
CREATE INDEX idx_stage_history_changed_at ON deal_stage_history(changed_at DESC);

-- ====================================
-- LEAD NOTES TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS lead_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Note Content
    note_text TEXT NOT NULL,
    
    -- Note Type
    note_type VARCHAR(50) DEFAULT 'general', -- 'general', 'qualification', 'objection', 'next_steps'
    
    -- Visibility
    is_private BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for Lead Notes
CREATE INDEX idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX idx_lead_notes_created_at ON lead_notes(created_at DESC);

-- ====================================
-- SALES METRICS TABLE (for caching)
-- ====================================
CREATE TABLE IF NOT EXISTS sales_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL,
    
    -- Time Period
    metric_date DATE NOT NULL,
    metric_period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
    
    -- Lead Metrics
    leads_created INTEGER DEFAULT 0,
    leads_qualified INTEGER DEFAULT 0,
    leads_converted INTEGER DEFAULT 0,
    
    -- Deal Metrics
    deals_created INTEGER DEFAULT 0,
    deals_won INTEGER DEFAULT 0,
    deals_lost INTEGER DEFAULT 0,
    total_deal_value DECIMAL(15, 2) DEFAULT 0,
    won_deal_value DECIMAL(15, 2) DEFAULT 0,
    
    -- Activity Metrics
    emails_sent INTEGER DEFAULT 0,
    calls_made INTEGER DEFAULT 0,
    meetings_held INTEGER DEFAULT 0,
    
    -- Conversion Metrics
    lead_to_qualified_rate DECIMAL(5, 2),
    qualified_to_deal_rate DECIMAL(5, 2),
    deal_win_rate DECIMAL(5, 2),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, metric_date, metric_period)
);

-- Indexes for Sales Metrics
CREATE INDEX idx_sales_metrics_user_id ON sales_metrics(user_id);
CREATE INDEX idx_sales_metrics_date ON sales_metrics(metric_date DESC);

-- ====================================
-- FUNCTIONS & TRIGGERS
-- ====================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update last_activity_date on leads
CREATE OR REPLACE FUNCTION update_lead_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE leads 
    SET last_activity_date = NEW.created_at 
    WHERE id = NEW.lead_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update lead last_activity_date when activity is created
CREATE TRIGGER update_lead_activity_date AFTER INSERT ON activities
    FOR EACH ROW WHEN (NEW.lead_id IS NOT NULL)
    EXECUTE FUNCTION update_lead_last_activity();

-- Function to update last_activity_date on deals
CREATE OR REPLACE FUNCTION update_deal_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE deals 
    SET last_activity_date = NEW.created_at 
    WHERE id = NEW.deal_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update deal last_activity_date when activity is created
CREATE TRIGGER update_deal_activity_date AFTER INSERT ON activities
    FOR EACH ROW WHEN (NEW.deal_id IS NOT NULL)
    EXECUTE FUNCTION update_deal_last_activity();

-- Function to track deal stage changes
CREATE OR REPLACE FUNCTION track_deal_stage_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.stage IS DISTINCT FROM NEW.stage THEN
        INSERT INTO deal_stage_history (deal_id, from_stage, to_stage, time_in_stage_days, changed_by)
        VALUES (
            NEW.id,
            OLD.stage,
            NEW.stage,
            EXTRACT(EPOCH FROM (NOW() - OLD.stage_entered_at)) / 86400,
            NEW.updated_at
        );
        
        NEW.stage_entered_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to track deal stage changes
CREATE TRIGGER track_deal_stage_changes BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION track_deal_stage_change();

-- ====================================
-- SEED DATA: Default Pipeline Stages
-- ====================================

-- Insert default pipeline stages (will be inserted per user, this is template)
-- Actual seeding should be done per user in application code

-- ====================================
-- VIEWS FOR REPORTING
-- ====================================

-- View: Pipeline Overview
CREATE OR REPLACE VIEW v_pipeline_overview AS
SELECT 
    d.user_id,
    d.pipeline,
    d.stage,
    COUNT(*) as deal_count,
    SUM(d.amount) as total_value,
    SUM(d.expected_value) as expected_value,
    AVG(d.win_probability) as avg_win_probability
FROM deals d
WHERE d.status = 'open'
GROUP BY d.user_id, d.pipeline, d.stage;

-- View: Lead Conversion Funnel
CREATE OR REPLACE VIEW v_lead_conversion_funnel AS
SELECT 
    l.user_id,
    COUNT(*) FILTER (WHERE l.status = 'new') as new_leads,
    COUNT(*) FILTER (WHERE l.status = 'contacted') as contacted_leads,
    COUNT(*) FILTER (WHERE l.is_qualified = true) as qualified_leads,
    COUNT(*) FILTER (WHERE l.status = 'converted') as converted_leads,
    COUNT(*) FILTER (WHERE l.status = 'lost') as lost_leads
FROM leads l
GROUP BY l.user_id;

-- View: Sales Activity Summary
CREATE OR REPLACE VIEW v_sales_activity_summary AS
SELECT 
    a.user_id,
    DATE(a.created_at) as activity_date,
    COUNT(*) FILTER (WHERE a.activity_type LIKE 'email%') as emails,
    COUNT(*) FILTER (WHERE a.activity_type = 'call') as calls,
    COUNT(*) FILTER (WHERE a.activity_type = 'meeting') as meetings,
    COUNT(*) FILTER (WHERE a.activity_type = 'task' AND a.is_completed = true) as tasks_completed
FROM activities a
GROUP BY a.user_id, DATE(a.created_at);

-- ====================================
-- GRANT PERMISSIONS
-- ====================================

-- Grant appropriate permissions to application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ajentrix_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ajentrix_app_user;

-- ====================================
-- END OF MIGRATION
-- ====================================

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Ajentrix Sales Functions database schema created successfully!';
END $$;

