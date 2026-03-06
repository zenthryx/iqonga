-- ==========================================
-- Lead Scoring Rules Migration
-- Date: December 31, 2025
-- Purpose: Add custom lead scoring rules and history tracking
-- ==========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. LEAD SCORING RULES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL,
    
    -- Rule details
    rule_name VARCHAR(200) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'behavioral', 'firmographic', 'combined'
    
    -- Behavioral scoring (points for actions)
    email_opened_points INTEGER DEFAULT 5,
    email_clicked_points INTEGER DEFAULT 10,
    website_visited_points INTEGER DEFAULT 5,
    demo_requested_points INTEGER DEFAULT 50,
    pricing_viewed_points INTEGER DEFAULT 20,
    
    -- Firmographic scoring (points for company attributes)
    company_size_rules JSONB DEFAULT '{}', -- e.g. {"1-10": 5, "11-50": 10, "51-200": 15, "201-500": 20, "500+": 25}
    industry_rules JSONB DEFAULT '{}', -- e.g. {"technology": 20, "finance": 15, "healthcare": 10}
    location_rules JSONB DEFAULT '{}', -- e.g. {"US": 20, "UK": 15, "EU": 10}
    
    -- Rule settings
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for lead_scoring_rules
CREATE INDEX idx_lead_scoring_rules_user_id ON lead_scoring_rules(user_id);
CREATE INDEX idx_lead_scoring_rules_company_profile_id ON lead_scoring_rules(company_profile_id);
CREATE INDEX idx_lead_scoring_rules_active ON lead_scoring_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_lead_scoring_rules_type ON lead_scoring_rules(rule_type);

-- ==========================================
-- 2. LEAD SCORE HISTORY TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS lead_score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Score changes
    old_score INTEGER,
    new_score INTEGER,
    score_change INTEGER, -- Positive for increase, negative for decrease
    
    -- Reason for change
    reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for lead_score_history
CREATE INDEX idx_lead_score_history_lead_id ON lead_score_history(lead_id);
CREATE INDEX idx_lead_score_history_created_at ON lead_score_history(created_at DESC);

-- ==========================================
-- 3. TRIGGER: Update lead_scoring_rules updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_lead_scoring_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lead_scoring_rules_updated_at
    BEFORE UPDATE ON lead_scoring_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_scoring_rules_updated_at();

-- ==========================================
-- 4. INSERT DEFAULT SCORING RULES (OPTIONAL)
-- ==========================================

-- Note: This is optional - only inserts if you have user_id = 1
-- You can customize or create your own rules via the API

DO $$ 
BEGIN
    -- Only insert if user_id = 1 exists
    IF EXISTS (SELECT 1 FROM users WHERE id = 1) THEN
        INSERT INTO lead_scoring_rules (
            user_id, 
            rule_name, 
            rule_type,
            email_opened_points,
            email_clicked_points,
            website_visited_points,
            demo_requested_points,
            pricing_viewed_points,
            company_size_rules,
            industry_rules,
            is_active
        ) VALUES (
            1,
            'Default Behavioral Scoring',
            'behavioral',
            5,  -- Email opened
            10, -- Email clicked
            5,  -- Website visited
            50, -- Demo requested
            20, -- Pricing viewed
            '{"1-10": 5, "11-50": 10, "51-200": 15, "201-500": 20, "500+": 25}',
            '{"technology": 20, "finance": 15, "healthcare": 10, "manufacturing": 10, "retail": 10, "other": 5}',
            true
        ) ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ==========================================
-- 5. ADD HELPER FUNCTION: Get lead's current score breakdown
-- ==========================================
CREATE OR REPLACE FUNCTION get_lead_score_breakdown(p_lead_id UUID)
RETURNS TABLE (
    score_category VARCHAR(50),
    points INTEGER,
    details TEXT
) AS $$
BEGIN
    -- This is a placeholder function that can be enhanced to return
    -- detailed breakdown of where a lead's score comes from
    RETURN QUERY
    SELECT 
        'total_score'::VARCHAR(50) as score_category,
        lead_score as points,
        'Total lead score'::TEXT as details
    FROM leads
    WHERE id = p_lead_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================

-- Summary
SELECT 
    'Lead scoring rules migration completed!' as message,
    (SELECT COUNT(*) FROM lead_scoring_rules) as default_rules_count,
    NOW() as completed_at;

