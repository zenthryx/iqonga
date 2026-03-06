-- Create HubSpot integration tables
CREATE TABLE IF NOT EXISTS hubspot_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    portal_id VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    webhook_secret TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_profile_id, portal_id)
);

CREATE TABLE IF NOT EXISTS hubspot_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hubspot_account_id UUID NOT NULL REFERENCES hubspot_accounts(id) ON DELETE CASCADE,
    hubspot_contact_id VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    job_title VARCHAR(255),
    lead_status VARCHAR(100),
    lifecycle_stage VARCHAR(100),
    lead_score INTEGER DEFAULT 0,
    last_activity_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(hubspot_account_id, hubspot_contact_id)
);

CREATE TABLE IF NOT EXISTS hubspot_deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hubspot_account_id UUID NOT NULL REFERENCES hubspot_accounts(id) ON DELETE CASCADE,
    hubspot_deal_id VARCHAR(50) NOT NULL,
    deal_name VARCHAR(500) NOT NULL,
    amount DECIMAL(15,2),
    currency VARCHAR(10),
    deal_stage VARCHAR(100),
    deal_type VARCHAR(100),
    close_date DATE,
    owner_id VARCHAR(50),
    contact_id VARCHAR(50),
    company_id VARCHAR(50),
    pipeline VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(hubspot_account_id, hubspot_deal_id)
);

CREATE TABLE IF NOT EXISTS hubspot_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hubspot_account_id UUID NOT NULL REFERENCES hubspot_accounts(id) ON DELETE CASCADE,
    hubspot_company_id VARCHAR(50) NOT NULL,
    company_name VARCHAR(500) NOT NULL,
    domain VARCHAR(255),
    industry VARCHAR(255),
    city VARCHAR(255),
    state VARCHAR(255),
    country VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(500),
    number_of_employees INTEGER,
    annual_revenue DECIMAL(15,2),
    lifecycle_stage VARCHAR(100),
    lead_status VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(hubspot_account_id, hubspot_company_id)
);

CREATE TABLE IF NOT EXISTS hubspot_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hubspot_account_id UUID NOT NULL REFERENCES hubspot_accounts(id) ON DELETE CASCADE,
    interaction_id VARCHAR(50) NOT NULL,
    contact_id VARCHAR(50),
    company_id VARCHAR(50),
    deal_id VARCHAR(50),
    interaction_type VARCHAR(100), -- 'email', 'call', 'meeting', 'note', 'task'
    subject VARCHAR(500),
    body TEXT,
    direction VARCHAR(20), -- 'inbound', 'outbound'
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(hubspot_account_id, interaction_id)
);

CREATE TABLE IF NOT EXISTS hubspot_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hubspot_account_id UUID NOT NULL REFERENCES hubspot_accounts(id) ON DELETE CASCADE,
    hubspot_ticket_id VARCHAR(50) NOT NULL,
    ticket_name VARCHAR(500) NOT NULL,
    ticket_status VARCHAR(100),
    ticket_priority VARCHAR(50),
    ticket_category VARCHAR(100),
    contact_id VARCHAR(50),
    company_id VARCHAR(50),
    subject VARCHAR(500),
    content TEXT,
    resolution VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(hubspot_account_id, hubspot_ticket_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hubspot_accounts_company_profile ON hubspot_accounts(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_contacts_account ON hubspot_contacts(hubspot_account_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_contacts_email ON hubspot_contacts(email);
CREATE INDEX IF NOT EXISTS idx_hubspot_contacts_lead_status ON hubspot_contacts(lead_status);
CREATE INDEX IF NOT EXISTS idx_hubspot_deals_account ON hubspot_deals(hubspot_account_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_deals_stage ON hubspot_deals(deal_stage);
CREATE INDEX IF NOT EXISTS idx_hubspot_companies_account ON hubspot_companies(hubspot_account_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_companies_domain ON hubspot_companies(domain);
CREATE INDEX IF NOT EXISTS idx_hubspot_interactions_account ON hubspot_interactions(hubspot_account_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_interactions_contact ON hubspot_interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_tickets_account ON hubspot_tickets(hubspot_account_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_tickets_status ON hubspot_tickets(ticket_status);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_hubspot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hubspot_accounts_updated_at
    BEFORE UPDATE ON hubspot_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_hubspot_updated_at();

CREATE TRIGGER trigger_update_hubspot_contacts_updated_at
    BEFORE UPDATE ON hubspot_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_hubspot_updated_at();

CREATE TRIGGER trigger_update_hubspot_deals_updated_at
    BEFORE UPDATE ON hubspot_deals
    FOR EACH ROW
    EXECUTE FUNCTION update_hubspot_updated_at();

CREATE TRIGGER trigger_update_hubspot_companies_updated_at
    BEFORE UPDATE ON hubspot_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_hubspot_updated_at();

CREATE TRIGGER trigger_update_hubspot_interactions_updated_at
    BEFORE UPDATE ON hubspot_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_hubspot_updated_at();

CREATE TRIGGER trigger_update_hubspot_tickets_updated_at
    BEFORE UPDATE ON hubspot_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_hubspot_updated_at();
