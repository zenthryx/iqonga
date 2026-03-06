-- ==========================================
-- Sales Email Integration Migration
-- Date: December 31, 2025
-- Purpose: Add email templates and tracking for Sales & CRM
-- ==========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. EMAIL TEMPLATES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL,
    
    -- Template details
    template_name VARCHAR(200) NOT NULL,
    template_category VARCHAR(50) NOT NULL, -- 'introduction', 'follow_up', 'proposal', 'meeting_request', 'thank_you', 'custom'
    subject VARCHAR(500) NOT NULL,
    body_text TEXT,
    body_html TEXT,
    
    -- Template settings
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    use_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    
    -- Personalization tokens available: {{first_name}}, {{last_name}}, {{company_name}}, {{email}}, etc.
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for email_templates
CREATE INDEX idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX idx_email_templates_company_profile_id ON email_templates(company_profile_id);
CREATE INDEX idx_email_templates_category ON email_templates(template_category);
CREATE INDEX idx_email_templates_active ON email_templates(is_active) WHERE is_active = true;

-- ==========================================
-- 2. SENT EMAILS TRACKING TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS sales_emails_sent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Related to lead or deal
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES activities(id) ON DELETE SET NULL, -- Link to logged activity
    
    -- Email details
    email_account_id UUID, -- From user_email_accounts table (nullable for backwards compatibility)
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    
    to_email VARCHAR(255) NOT NULL,
    cc_emails TEXT[], -- Array of CC emails
    bcc_emails TEXT[], -- Array of BCC emails
    subject VARCHAR(500) NOT NULL,
    body_text TEXT,
    body_html TEXT,
    
    -- Tracking
    tracking_id UUID UNIQUE DEFAULT uuid_generate_v4(), -- For open/click tracking
    opened_at TIMESTAMP, -- When email was first opened
    open_count INTEGER DEFAULT 0, -- Number of times opened
    clicked_at TIMESTAMP, -- When first link was clicked
    click_count INTEGER DEFAULT 0, -- Number of link clicks
    replied_at TIMESTAMP, -- When recipient replied (detected via thread)
    
    -- Email service response
    message_id VARCHAR(500), -- Gmail/SMTP message ID
    sent_status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
    error_message TEXT,
    
    -- Metadata
    sent_at TIMESTAMP DEFAULT NOW(),
    sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for sales_emails_sent
CREATE INDEX idx_sales_emails_sent_user_id ON sales_emails_sent(user_id);
CREATE INDEX idx_sales_emails_sent_lead_id ON sales_emails_sent(lead_id);
CREATE INDEX idx_sales_emails_sent_deal_id ON sales_emails_sent(deal_id);
CREATE INDEX idx_sales_emails_sent_tracking_id ON sales_emails_sent(tracking_id);
CREATE INDEX idx_sales_emails_sent_to_email ON sales_emails_sent(to_email);
CREATE INDEX idx_sales_emails_sent_sent_at ON sales_emails_sent(sent_at DESC);
CREATE INDEX idx_sales_emails_sent_opened ON sales_emails_sent(opened_at) WHERE opened_at IS NOT NULL;
CREATE INDEX idx_sales_emails_sent_clicked ON sales_emails_sent(clicked_at) WHERE clicked_at IS NOT NULL;

-- ==========================================
-- 3. EMAIL LINK TRACKING TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS sales_email_link_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sent_email_id UUID NOT NULL REFERENCES sales_emails_sent(id) ON DELETE CASCADE,
    
    -- Link details
    original_url TEXT NOT NULL,
    tracked_url TEXT NOT NULL,
    link_text VARCHAR(500),
    
    -- Click tracking
    clicked_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(50),
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for sales_email_link_clicks
CREATE INDEX idx_sales_email_link_clicks_sent_email_id ON sales_email_link_clicks(sent_email_id);
CREATE INDEX idx_sales_email_link_clicks_clicked_at ON sales_email_link_clicks(clicked_at DESC);

-- ==========================================
-- 4. INSERT DEFAULT EMAIL TEMPLATES
-- ==========================================

-- Note: We'll insert default templates for user_id = 1 (admin) as examples
-- Users can copy and customize these or create their own

INSERT INTO email_templates (user_id, template_name, template_category, subject, body_html, is_default, is_active) VALUES
(
    1, -- Replace with your admin user ID if different
    'Introduction Email',
    'introduction',
    'Quick introduction - {{company_name}}',
    '<p>Hi {{first_name}},</p>

<p>I hope this email finds you well. My name is {{sender_name}}, and I wanted to reach out because I believe {{company_name}} could benefit from what we offer.</p>

<p>We specialize in helping businesses like yours with [your value proposition here].</p>

<p>Would you be open to a brief 15-minute call this week to explore how we might be able to help?</p>

<p>Best regards,<br>
{{sender_name}}<br>
{{sender_company}}</p>',
    true,
    true
),
(
    1,
    'Follow-up Email',
    'follow_up',
    'Following up - {{company_name}}',
    '<p>Hi {{first_name}},</p>

<p>I wanted to follow up on my previous email regarding {{company_name}}.</p>

<p>I understand you''re busy, so I''ll keep this brief. We''ve helped similar companies achieve [specific results], and I believe we could do the same for you.</p>

<p>Are you available for a quick call this week?</p>

<p>Best regards,<br>
{{sender_name}}</p>',
    true,
    true
),
(
    1,
    'Meeting Request',
    'meeting_request',
    'Meeting request - {{company_name}}',
    '<p>Hi {{first_name}},</p>

<p>Thank you for your interest in learning more about how we can help {{company_name}}.</p>

<p>I''d love to schedule a meeting to discuss your needs and show you how we can help. Would any of the following times work for you?</p>

<ul>
    <li>[Date/Time Option 1]</li>
    <li>[Date/Time Option 2]</li>
    <li>[Date/Time Option 3]</li>
</ul>

<p>Or feel free to suggest a time that works better for your schedule.</p>

<p>Looking forward to speaking with you!</p>

<p>Best regards,<br>
{{sender_name}}</p>',
    true,
    true
),
(
    1,
    'Proposal Email',
    'proposal',
    'Proposal for {{company_name}}',
    '<p>Hi {{first_name}},</p>

<p>As promised, I''ve attached our proposal for {{company_name}}.</p>

<p>This proposal outlines:</p>
<ul>
    <li>Your current challenges and goals</li>
    <li>Our recommended solution</li>
    <li>Timeline and deliverables</li>
    <li>Investment required</li>
</ul>

<p>Please review at your convenience, and let me know if you have any questions. I''m happy to hop on a call to walk through any sections in detail.</p>

<p>I''m excited about the possibility of working together!</p>

<p>Best regards,<br>
{{sender_name}}</p>',
    true,
    true
),
(
    1,
    'Thank You Email',
    'thank_you',
    'Thank you - {{company_name}}',
    '<p>Hi {{first_name}},</p>

<p>Thank you so much for taking the time to meet with me today. I really enjoyed our conversation and learning more about {{company_name}}''s goals.</p>

<p>As discussed, I''ll [next steps from your meeting]. I should have this to you by [date].</p>

<p>In the meantime, if you have any questions or need anything else, please don''t hesitate to reach out.</p>

<p>Looking forward to working together!</p>

<p>Best regards,<br>
{{sender_name}}</p>',
    true,
    true
);

-- ==========================================
-- 5. UPDATE ACTIVITIES TABLE (if needed)
-- ==========================================
-- Add email_tracking_id column to activities table for linking sent emails
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'email_tracking_id'
    ) THEN
        ALTER TABLE activities ADD COLUMN email_tracking_id UUID REFERENCES sales_emails_sent(id) ON DELETE SET NULL;
        CREATE INDEX idx_activities_email_tracking_id ON activities(email_tracking_id);
    END IF;
END $$;

-- ==========================================
-- 6. TRIGGER: Update email template use count
-- ==========================================
CREATE OR REPLACE FUNCTION update_email_template_use_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.template_id IS NOT NULL THEN
        UPDATE email_templates
        SET 
            use_count = use_count + 1,
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.template_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_template_use_count
    AFTER INSERT ON sales_emails_sent
    FOR EACH ROW
    EXECUTE FUNCTION update_email_template_use_count();

-- ==========================================
-- 7. TRIGGER: Update lead/deal last_activity_at when email is opened or clicked
-- ==========================================
CREATE OR REPLACE FUNCTION update_lead_deal_on_email_engagement()
RETURNS TRIGGER AS $$
BEGIN
    -- Update lead's last_activity_at when email is opened/clicked
    IF NEW.lead_id IS NOT NULL THEN
        IF (OLD.opened_at IS NULL AND NEW.opened_at IS NOT NULL) OR 
           (OLD.clicked_at IS NULL AND NEW.clicked_at IS NOT NULL) THEN
            UPDATE leads
            SET 
                last_activity_at = GREATEST(COALESCE(last_activity_at, NEW.opened_at, NEW.clicked_at), COALESCE(NEW.opened_at, NEW.clicked_at)),
                updated_at = NOW()
            WHERE id = NEW.lead_id;
        END IF;
    END IF;
    
    -- Update deal's last_activity_at when email is opened/clicked
    IF NEW.deal_id IS NOT NULL THEN
        IF (OLD.opened_at IS NULL AND NEW.opened_at IS NOT NULL) OR 
           (OLD.clicked_at IS NULL AND NEW.clicked_at IS NOT NULL) THEN
            UPDATE deals
            SET 
                last_activity_at = GREATEST(COALESCE(last_activity_at, NEW.opened_at, NEW.clicked_at), COALESCE(NEW.opened_at, NEW.clicked_at)),
                updated_at = NOW()
            WHERE id = NEW.deal_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lead_deal_on_email_engagement
    AFTER UPDATE ON sales_emails_sent
    FOR EACH ROW
    WHEN (OLD.opened_at IS DISTINCT FROM NEW.opened_at OR OLD.clicked_at IS DISTINCT FROM NEW.clicked_at)
    EXECUTE FUNCTION update_lead_deal_on_email_engagement();

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================

-- Grant permissions (OPTIONAL - uncomment and adjust for your database user if needed)
-- GRANT ALL PRIVILEGES ON email_templates TO your_database_user;
-- GRANT ALL PRIVILEGES ON sales_emails_sent TO your_database_user;
-- GRANT ALL PRIVILEGES ON sales_email_link_clicks TO your_database_user;

-- Summary
SELECT 
    'Email templates migration completed!' as message,
    (SELECT COUNT(*) FROM email_templates) as default_templates_count,
    NOW() as completed_at;

