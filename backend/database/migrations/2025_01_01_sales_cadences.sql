/**
 * Sales Cadences & Sequences Database Schema
 * Enables multi-step automated sales sequences
 * Date: January 1, 2025
 */

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- SALES CADENCES TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS sales_cadences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    cadence_name VARCHAR(255) NOT NULL,
    description TEXT,
    channel VARCHAR(50) NOT NULL DEFAULT 'email', -- 'email', 'linkedin', 'multi_channel'
    is_active BOOLEAN DEFAULT true,
    auto_stop_on_reply BOOLEAN DEFAULT true, -- Stop sequence if lead replies
    auto_stop_on_meeting BOOLEAN DEFAULT true, -- Stop sequence if meeting scheduled
    total_steps INTEGER DEFAULT 0,
    default_delay_days INTEGER DEFAULT 2, -- Default days between steps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- ====================================
-- SALES CADENCE STEPS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS sales_cadence_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cadence_id UUID REFERENCES sales_cadences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL, -- Order in sequence (1, 2, 3, ...)
    step_type VARCHAR(50) NOT NULL, -- 'email', 'linkedin_message', 'call_task', 'wait'
    step_name VARCHAR(255) NOT NULL,
    delay_days INTEGER DEFAULT 0, -- Days to wait before this step (0 = immediate)
    delay_hours INTEGER DEFAULT 0, -- Hours to wait (for same-day delays)
    
    -- Email Step Fields
    email_template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    email_subject VARCHAR(500),
    email_body TEXT,
    track_opens BOOLEAN DEFAULT true,
    track_clicks BOOLEAN DEFAULT true,
    
    -- LinkedIn Step Fields
    linkedin_message TEXT,
    linkedin_action VARCHAR(50), -- 'connection_request', 'message', 'content_share'
    
    -- Task Step Fields
    task_subject VARCHAR(255),
    task_notes TEXT,
    task_priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    
    -- Wait Step Fields
    wait_reason VARCHAR(255), -- Why we're waiting
    
    -- Conditions
    skip_if_condition JSONB DEFAULT '{}', -- Conditions to skip this step
    execute_only_if JSONB DEFAULT '{}', -- Conditions to execute this step
    
    -- A/B Testing
    is_ab_test BOOLEAN DEFAULT false,
    ab_variant_name VARCHAR(100), -- 'variant_a', 'variant_b'
    ab_test_percentage INTEGER DEFAULT 50, -- 0-100
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================================
-- SALES CADENCE ENROLLMENTS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS sales_cadence_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cadence_id UUID REFERENCES sales_cadences(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    
    -- Enrollment Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'completed', 'stopped', 'unsubscribed'
    current_step_order INTEGER DEFAULT 0, -- Which step we're on
    next_step_execution_at TIMESTAMP, -- When next step should execute
    
    -- Stop Conditions
    stopped_reason VARCHAR(255), -- Why sequence was stopped
    stopped_at TIMESTAMP,
    
    -- Completion
    completed_at TIMESTAMP,
    total_steps_completed INTEGER DEFAULT 0,
    
    -- A/B Test Assignment
    ab_variant VARCHAR(50), -- Which A/B variant this enrollment uses
    
    enrolled_at TIMESTAMP DEFAULT NOW(),
    enrolled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================================
-- SALES CADENCE EXECUTIONS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS sales_cadence_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID REFERENCES sales_cadence_enrollments(id) ON DELETE CASCADE,
    step_id UUID REFERENCES sales_cadence_steps(id) ON DELETE SET NULL,
    cadence_id UUID REFERENCES sales_cadences(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Execution Details
    step_order INTEGER NOT NULL,
    step_type VARCHAR(50) NOT NULL,
    execution_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'executed', 'skipped', 'failed'
    
    -- Execution Results
    executed_at TIMESTAMP,
    execution_result JSONB DEFAULT '{}', -- Result data (email sent, task created, etc.)
    error_message TEXT,
    
    -- Email Execution Results
    email_sent_id UUID REFERENCES sales_emails_sent(id) ON DELETE SET NULL,
    email_opened BOOLEAN DEFAULT false,
    email_clicked BOOLEAN DEFAULT false,
    email_replied BOOLEAN DEFAULT false,
    
    -- Task Execution Results
    task_created_id UUID REFERENCES activities(id) ON DELETE SET NULL,
    task_completed BOOLEAN DEFAULT false,
    
    scheduled_for TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================================
-- INDEXES FOR PERFORMANCE
-- ====================================

-- Sales Cadences
CREATE INDEX IF NOT EXISTS idx_sales_cadences_user_id ON sales_cadences(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_cadences_is_active ON sales_cadences(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_cadences_channel ON sales_cadences(channel);

-- Cadence Steps
CREATE INDEX IF NOT EXISTS idx_cadence_steps_cadence_id ON sales_cadence_steps(cadence_id);
CREATE INDEX IF NOT EXISTS idx_cadence_steps_order ON sales_cadence_steps(cadence_id, step_order);
CREATE INDEX IF NOT EXISTS idx_cadence_steps_type ON sales_cadence_steps(step_type);

-- Enrollments
CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_cadence_id ON sales_cadence_enrollments(cadence_id);
CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_lead_id ON sales_cadence_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_deal_id ON sales_cadence_enrollments(deal_id);
CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_user_id ON sales_cadence_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_status ON sales_cadence_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_next_execution ON sales_cadence_enrollments(next_step_execution_at) WHERE status = 'active';

-- Executions
CREATE INDEX IF NOT EXISTS idx_cadence_executions_enrollment_id ON sales_cadence_executions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_cadence_executions_step_id ON sales_cadence_executions(step_id);
CREATE INDEX IF NOT EXISTS idx_cadence_executions_lead_id ON sales_cadence_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_cadence_executions_status ON sales_cadence_executions(execution_status);
CREATE INDEX IF NOT EXISTS idx_cadence_executions_scheduled ON sales_cadence_executions(scheduled_for) WHERE execution_status = 'pending';

-- ====================================
-- TRIGGERS FOR AUTO-UPDATES
-- ====================================

-- Update cadence updated_at
CREATE OR REPLACE FUNCTION update_sales_cadence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sales_cadence_updated_at
    BEFORE UPDATE ON sales_cadences
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_cadence_updated_at();

-- Update step updated_at
CREATE OR REPLACE FUNCTION update_cadence_step_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cadence_step_updated_at
    BEFORE UPDATE ON sales_cadence_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_cadence_step_updated_at();

-- Update enrollment updated_at
CREATE OR REPLACE FUNCTION update_cadence_enrollment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cadence_enrollment_updated_at
    BEFORE UPDATE ON sales_cadence_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_cadence_enrollment_updated_at();

-- Update execution updated_at
CREATE OR REPLACE FUNCTION update_cadence_execution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cadence_execution_updated_at
    BEFORE UPDATE ON sales_cadence_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_cadence_execution_updated_at();

-- Auto-update cadence total_steps count
CREATE OR REPLACE FUNCTION update_cadence_step_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE sales_cadences
        SET total_steps = (
            SELECT COUNT(*) FROM sales_cadence_steps WHERE cadence_id = NEW.cadence_id
        )
        WHERE id = NEW.cadence_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE sales_cadences
        SET total_steps = (
            SELECT COUNT(*) FROM sales_cadence_steps WHERE cadence_id = OLD.cadence_id
        )
        WHERE id = OLD.cadence_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cadence_step_count
    AFTER INSERT OR UPDATE OR DELETE ON sales_cadence_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_cadence_step_count();

-- ====================================
-- DEFAULT CADENCE TEMPLATES
-- ====================================

-- Insert default cadences for user_id = 1 (can be customized per user)
DO $$
DECLARE
    default_user_id INTEGER := 1;
    intro_cadence_id UUID;
    followup_cadence_id UUID;
BEGIN
    -- Only insert if user exists
    IF EXISTS (SELECT 1 FROM users WHERE id = default_user_id) THEN
        -- Introduction Cadence (5-step email sequence)
        INSERT INTO sales_cadences (id, user_id, cadence_name, description, channel, is_active, auto_stop_on_reply, auto_stop_on_meeting, default_delay_days, created_by)
        VALUES (uuid_generate_v4(), default_user_id, 'Introduction Sequence', '5-step email introduction sequence for new leads', 'email', true, true, true, 2, default_user_id)
        RETURNING id INTO intro_cadence_id;
        
        -- Follow-up Cadence (3-step sequence)
        INSERT INTO sales_cadences (id, user_id, cadence_name, description, channel, is_active, auto_stop_on_reply, auto_stop_on_meeting, default_delay_days, created_by)
        VALUES (uuid_generate_v4(), default_user_id, 'Follow-up Sequence', '3-step follow-up sequence for engaged leads', 'email', true, true, true, 3, default_user_id)
        RETURNING id INTO followup_cadence_id;
        
        -- Note: Steps will be created via API or UI, not in migration
    END IF;
END $$;

-- ====================================
-- COMMENTS FOR DOCUMENTATION
-- ====================================

COMMENT ON TABLE sales_cadences IS 'Sales cadences/sequences for automated multi-step outreach';
COMMENT ON TABLE sales_cadence_steps IS 'Individual steps within a sales cadence';
COMMENT ON TABLE sales_cadence_enrollments IS 'Leads/deals enrolled in sales cadences';
COMMENT ON TABLE sales_cadence_executions IS 'Execution history of cadence steps';

COMMENT ON COLUMN sales_cadences.channel IS 'Primary channel: email, linkedin, or multi_channel';
COMMENT ON COLUMN sales_cadence_steps.step_type IS 'Type: email, linkedin_message, call_task, wait';
COMMENT ON COLUMN sales_cadence_enrollments.status IS 'Status: active, paused, completed, stopped, unsubscribed';
COMMENT ON COLUMN sales_cadence_executions.execution_status IS 'Status: pending, executed, skipped, failed';

