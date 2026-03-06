-- ====================================
-- WhatsApp Business API Database Schema
-- Phase 1: Foundation Tables
-- Created: January 2025
-- ====================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- WHATSAPP BUSINESS ACCOUNTS (WABA)
-- ====================================
CREATE TABLE IF NOT EXISTS whatsapp_business_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL,
    
    -- WhatsApp Business Account Details
    waba_id VARCHAR(255) NOT NULL, -- WhatsApp Business Account ID from Meta
    phone_number_id VARCHAR(255) NOT NULL, -- Phone Number ID from Meta
    phone_number VARCHAR(50) NOT NULL, -- E.164 format (e.g., +1234567890)
    
    -- Authentication
    access_token TEXT NOT NULL, -- Encrypted access token
    verify_token TEXT, -- For webhook verification
    app_id VARCHAR(255),
    app_secret TEXT, -- Encrypted app secret
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, suspended, pending_verification
    webhook_url TEXT,
    webhook_verified BOOLEAN DEFAULT false,
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Additional account metadata
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, phone_number_id)
);

-- Indexes for whatsapp_business_accounts
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_user_id ON whatsapp_business_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_waba_id ON whatsapp_business_accounts(waba_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_status ON whatsapp_business_accounts(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_phone_number ON whatsapp_business_accounts(phone_number);

-- ====================================
-- WHATSAPP CONTACTS
-- ====================================
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    waba_id UUID REFERENCES whatsapp_business_accounts(id) ON DELETE CASCADE,
    
    -- Contact Information
    phone_number VARCHAR(50) NOT NULL, -- E.164 format
    name VARCHAR(255),
    profile_name VARCHAR(255), -- Name from WhatsApp profile
    profile_picture_url TEXT,
    
    -- Opt-in/Opt-out
    is_opted_in BOOLEAN DEFAULT true,
    opt_in_date TIMESTAMP,
    opt_out_date TIMESTAMP,
    
    -- Engagement
    last_message_at TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    
    -- Organization
    tags TEXT[], -- User-defined tags
    custom_fields JSONB DEFAULT '{}', -- Custom contact fields
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, waba_id, phone_number)
);

-- Indexes for whatsapp_contacts
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_user_id ON whatsapp_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_waba_id ON whatsapp_contacts(waba_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone_number ON whatsapp_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_opted_in ON whatsapp_contacts(is_opted_in);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_last_message ON whatsapp_contacts(last_message_at DESC);

-- ====================================
-- WHATSAPP CONTACT GROUPS
-- ====================================
CREATE TABLE IF NOT EXISTS whatsapp_contact_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    contact_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for whatsapp_contact_groups
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_user_id ON whatsapp_contact_groups(user_id);

-- ====================================
-- WHATSAPP CONTACT GROUP MEMBERS
-- ====================================
CREATE TABLE IF NOT EXISTS whatsapp_contact_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES whatsapp_contact_groups(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
    
    added_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(group_id, contact_id)
);

-- Indexes for whatsapp_contact_group_members
CREATE INDEX IF NOT EXISTS idx_whatsapp_group_members_group_id ON whatsapp_contact_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_group_members_contact_id ON whatsapp_contact_group_members(contact_id);

-- ====================================
-- WHATSAPP MESSAGE TEMPLATES
-- ====================================
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    waba_id UUID REFERENCES whatsapp_business_accounts(id) ON DELETE SET NULL,
    
    -- Template Details
    template_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- MARKETING, UTILITY, AUTHENTICATION
    language VARCHAR(10) DEFAULT 'en',
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, pending, approved, rejected
    template_id VARCHAR(255), -- WhatsApp template ID after approval
    rejection_reason TEXT, -- If rejected
    
    -- Template Content
    header_type VARCHAR(50), -- TEXT, IMAGE, VIDEO, DOCUMENT, LOCATION
    header_content TEXT,
    body_text TEXT NOT NULL,
    footer_text TEXT,
    
    -- Interactive Elements
    buttons JSONB DEFAULT '[]', -- Array of button objects
    variables JSONB DEFAULT '[]', -- Template variables ({{1}}, {{2}}, etc.)
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, template_name, language)
);

-- Indexes for whatsapp_templates
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_user_id ON whatsapp_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_waba_id ON whatsapp_templates(waba_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON whatsapp_templates(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_template_id ON whatsapp_templates(template_id);

-- ====================================
-- WHATSAPP CAMPAIGNS
-- ====================================
CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    waba_id UUID REFERENCES whatsapp_business_accounts(id) ON DELETE SET NULL,
    
    -- Campaign Details
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- broadcast, drip, scheduled
    template_id UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, sending, completed, failed, paused
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Statistics
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    
    -- Configuration
    variables JSONB DEFAULT '{}', -- Template variables per recipient
    metadata JSONB DEFAULT '{}', -- Additional campaign metadata
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for whatsapp_campaigns
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_user_id ON whatsapp_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_waba_id ON whatsapp_campaigns(waba_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_status ON whatsapp_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_scheduled_at ON whatsapp_campaigns(scheduled_at);

-- ====================================
-- WHATSAPP CAMPAIGN RECIPIENTS
-- ====================================
CREATE TABLE IF NOT EXISTS whatsapp_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES whatsapp_campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE SET NULL,
    
    phone_number VARCHAR(50) NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, read, failed
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    
    -- Error Handling
    error_code INTEGER,
    error_message TEXT,
    
    -- Message Details
    message_id VARCHAR(255), -- WhatsApp message ID
    wamid VARCHAR(255), -- WhatsApp Message ID
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for whatsapp_campaign_recipients
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaign_recipients_campaign_id ON whatsapp_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaign_recipients_contact_id ON whatsapp_campaign_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaign_recipients_status ON whatsapp_campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaign_recipients_phone_number ON whatsapp_campaign_recipients(phone_number);

-- ====================================
-- WHATSAPP MESSAGES
-- ====================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    waba_id UUID REFERENCES whatsapp_business_accounts(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE SET NULL,
    
    -- Message Identifiers
    wamid VARCHAR(255), -- WhatsApp Message ID
    message_id VARCHAR(255), -- Internal message ID
    
    -- Message Details
    direction VARCHAR(20) NOT NULL, -- inbound, outbound
    message_type VARCHAR(50) NOT NULL, -- text, image, video, audio, document, location, contacts, etc.
    
    -- Content
    text_content TEXT,
    media_url TEXT,
    media_id VARCHAR(255), -- WhatsApp media ID
    caption TEXT,
    
    -- Associations
    template_id UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES whatsapp_campaigns(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'sent', -- sent, delivered, read, failed
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    
    -- Error Handling
    error_code INTEGER,
    error_message TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Additional message metadata
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_waba_id ON whatsapp_messages(waba_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact_id ON whatsapp_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_wamid ON whatsapp_messages(wamid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);

-- ====================================
-- WHATSAPP CONVERSATIONS
-- ====================================
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    waba_id UUID REFERENCES whatsapp_business_accounts(id) ON DELETE SET NULL,
    contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
    
    phone_number VARCHAR(50) NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'open', -- open, closed, archived
    assigned_agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- For team inbox
    
    -- Engagement
    unread_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP,
    last_message_preview TEXT,
    
    -- Organization
    tags TEXT[],
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(waba_id, contact_id)
);

-- Indexes for whatsapp_conversations
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user_id ON whatsapp_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_waba_id ON whatsapp_conversations(waba_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_contact_id ON whatsapp_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status ON whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_assigned_agent ON whatsapp_conversations(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message ON whatsapp_conversations(last_message_at DESC);

-- ====================================
-- WHATSAPP WEBHOOK EVENTS (Event Log)
-- ====================================
CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    waba_id UUID REFERENCES whatsapp_business_accounts(id) ON DELETE SET NULL,
    
    -- Event Details
    event_type VARCHAR(100) NOT NULL, -- message, status, template, etc.
    event_data JSONB NOT NULL,
    
    -- Processing
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for whatsapp_webhook_events
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_waba_id ON whatsapp_webhook_events(waba_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_event_type ON whatsapp_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_processed ON whatsapp_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_created_at ON whatsapp_webhook_events(created_at DESC);

-- ====================================
-- WHATSAPP BOTS (Reply Automation)
-- ====================================
CREATE TABLE IF NOT EXISTS whatsapp_bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    waba_id UUID REFERENCES whatsapp_business_accounts(id) ON DELETE CASCADE,
    
    -- Bot Configuration
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL, -- exact_match, contains, first_message, keyword
    trigger_text TEXT, -- Text to match (not required for first_message)
    
    -- Reply Configuration
    reply_type VARCHAR(50) NOT NULL, -- text, template, flow, ai_agent
    reply_text TEXT, -- For text replies
    template_id UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL, -- For template replies
    flow_id UUID, -- WhatsApp Flow ID (for flow replies)
    ai_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL, -- For AI agent replies
    
    -- Message Formatting
    header_text TEXT,
    footer_text TEXT,
    buttons JSONB DEFAULT '[]', -- Array of button objects
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Higher priority bots checked first
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for whatsapp_bots
CREATE INDEX IF NOT EXISTS idx_whatsapp_bots_user_id ON whatsapp_bots(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_bots_waba_id ON whatsapp_bots(waba_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_bots_active ON whatsapp_bots(is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_bots_priority ON whatsapp_bots(priority DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_bots_trigger_type ON whatsapp_bots(trigger_type);

-- ====================================
-- WHATSAPP BOT EXECUTIONS (Log)
-- ====================================
CREATE TABLE IF NOT EXISTS whatsapp_bot_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES whatsapp_bots(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE SET NULL,
    phone_number VARCHAR(50) NOT NULL,
    message_text TEXT,
    response_text TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for whatsapp_bot_executions
CREATE INDEX IF NOT EXISTS idx_whatsapp_bot_executions_bot_id ON whatsapp_bot_executions(bot_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_bot_executions_contact_id ON whatsapp_bot_executions(contact_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_bot_executions_created_at ON whatsapp_bot_executions(created_at DESC);

-- ====================================
-- WHATSAPP SETTINGS
-- ====================================
CREATE TABLE IF NOT EXISTS whatsapp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    waba_id UUID REFERENCES whatsapp_business_accounts(id) ON DELETE SET NULL,
    
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, waba_id, setting_key)
);

-- Indexes for whatsapp_settings
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_user_id ON whatsapp_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_waba_id ON whatsapp_settings(waba_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_key ON whatsapp_settings(setting_key);

-- ====================================
-- TRIGGERS FOR UPDATED_AT
-- ====================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_whatsapp_accounts_updated_at BEFORE UPDATE ON whatsapp_business_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_contacts_updated_at BEFORE UPDATE ON whatsapp_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_groups_updated_at BEFORE UPDATE ON whatsapp_contact_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON whatsapp_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_campaigns_updated_at BEFORE UPDATE ON whatsapp_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON whatsapp_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_settings_updated_at BEFORE UPDATE ON whatsapp_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_bots_updated_at BEFORE UPDATE ON whatsapp_bots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- ====================================

-- Function to update contact message count
CREATE OR REPLACE FUNCTION update_whatsapp_contact_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.direction = 'inbound' THEN
        UPDATE whatsapp_contacts
        SET message_count = message_count + 1,
            last_message_at = NEW.created_at,
            updated_at = NOW()
        WHERE id = NEW.contact_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update contact message count
CREATE TRIGGER update_contact_message_count AFTER INSERT ON whatsapp_messages
    FOR EACH ROW EXECUTE FUNCTION update_whatsapp_contact_message_count();

-- Function to update conversation last message
CREATE OR REPLACE FUNCTION update_whatsapp_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE whatsapp_conversations
    SET last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.text_content, 100),
        updated_at = NOW()
    WHERE contact_id = NEW.contact_id AND waba_id = NEW.waba_id;
    
    -- If conversation doesn't exist, create it
    IF NOT FOUND THEN
        INSERT INTO whatsapp_conversations (user_id, waba_id, contact_id, phone_number, last_message_at, last_message_preview)
        SELECT NEW.user_id, NEW.waba_id, NEW.contact_id, 
               (SELECT phone_number FROM whatsapp_contacts WHERE id = NEW.contact_id),
               NEW.created_at, LEFT(NEW.text_content, 100)
        ON CONFLICT (waba_id, contact_id) DO UPDATE
        SET last_message_at = NEW.created_at,
            last_message_preview = LEFT(NEW.text_content, 100),
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update conversation
CREATE TRIGGER update_conversation_last_message AFTER INSERT ON whatsapp_messages
    FOR EACH ROW EXECUTE FUNCTION update_whatsapp_conversation_last_message();

-- Function to update group contact count
CREATE OR REPLACE FUNCTION update_whatsapp_group_contact_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE whatsapp_contact_groups
        SET contact_count = contact_count + 1,
            updated_at = NOW()
        WHERE id = NEW.group_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE whatsapp_contact_groups
        SET contact_count = contact_count - 1,
            updated_at = NOW()
        WHERE id = OLD.group_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger to update group contact count
CREATE TRIGGER update_group_contact_count AFTER INSERT OR DELETE ON whatsapp_contact_group_members
    FOR EACH ROW EXECUTE FUNCTION update_whatsapp_group_contact_count();

-- ====================================
-- COMMENTS
-- ====================================

COMMENT ON TABLE whatsapp_business_accounts IS 'WhatsApp Business Accounts (WABA) connected to user accounts';
COMMENT ON TABLE whatsapp_contacts IS 'WhatsApp contacts synced from conversations';
COMMENT ON TABLE whatsapp_contact_groups IS 'User-defined contact groups for organizing contacts';
COMMENT ON TABLE whatsapp_templates IS 'WhatsApp message templates for campaigns';
COMMENT ON TABLE whatsapp_campaigns IS 'Broadcast and drip campaigns';
COMMENT ON TABLE whatsapp_messages IS 'All WhatsApp messages (inbound and outbound)';
COMMENT ON TABLE whatsapp_conversations IS 'Conversation threads with contacts';
COMMENT ON TABLE whatsapp_webhook_events IS 'Webhook event log for debugging and auditing';
COMMENT ON TABLE whatsapp_bots IS 'Automated reply bots with trigger-based responses';
COMMENT ON TABLE whatsapp_bot_executions IS 'Bot execution log for tracking and analytics';
