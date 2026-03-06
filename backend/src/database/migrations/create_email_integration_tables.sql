-- Email Integration Tables for Gmail & Outlook

-- User Email Accounts (OAuth configurations)
CREATE TABLE IF NOT EXISTS user_email_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'gmail' or 'outlook'
    email_address VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    scope TEXT,
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, email_address)
);

-- Email Messages
CREATE TABLE IF NOT EXISTS email_messages (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES user_email_accounts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_message_id VARCHAR(255) NOT NULL, -- Gmail messageId or Outlook id
    thread_id VARCHAR(255), -- Conversation thread ID
    subject TEXT,
    from_email VARCHAR(255),
    from_name VARCHAR(255),
    to_emails TEXT[], -- Array of recipient emails
    cc_emails TEXT[], -- Array of CC emails
    bcc_emails TEXT[], -- Array of BCC emails
    body_text TEXT,
    body_html TEXT,
    snippet TEXT, -- Short preview text
    labels TEXT[], -- Gmail labels or Outlook categories
    is_read BOOLEAN DEFAULT false,
    is_starred BOOLEAN DEFAULT false,
    is_important BOOLEAN DEFAULT false,
    is_spam BOOLEAN DEFAULT false,
    has_attachments BOOLEAN DEFAULT false,
    attachment_count INTEGER DEFAULT 0,
    received_at TIMESTAMP,
    sent_at TIMESTAMP,
    ai_category VARCHAR(50), -- AI-generated category: 'urgent', 'followup', 'newsletter', 'spam', 'personal', 'work'
    ai_priority VARCHAR(20), -- 'high', 'medium', 'low'
    ai_sentiment VARCHAR(20), -- 'positive', 'neutral', 'negative'
    ai_summary TEXT, -- AI-generated summary
    ai_action_items TEXT[], -- Extracted action items
    ai_processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, provider_message_id)
);

-- Email Attachments
CREATE TABLE IF NOT EXISTS email_attachments (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
    provider_attachment_id VARCHAR(255),
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    url TEXT, -- URL to download attachment
    is_inline BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Draft Replies (AI-generated)
CREATE TABLE IF NOT EXISTS email_draft_replies (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    draft_body TEXT NOT NULL,
    draft_html TEXT,
    tone VARCHAR(50), -- 'professional', 'casual', 'friendly', 'formal'
    length VARCHAR(20), -- 'short', 'medium', 'long'
    confidence_score DECIMAL(3,2), -- AI confidence score 0.00-1.00
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Contacts (enriched contact data)
CREATE TABLE IF NOT EXISTS email_contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_address VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company VARCHAR(255),
    job_title VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url TEXT,
    twitter_handle VARCHAR(100),
    avatar_url TEXT,
    last_email_at TIMESTAMP,
    email_count INTEGER DEFAULT 1,
    is_favorite BOOLEAN DEFAULT false,
    notes TEXT,
    enriched_at TIMESTAMP, -- When contact data was enriched
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, email_address)
);

-- Email Rules & Filters (user-defined automation)
CREATE TABLE IF NOT EXISTS email_rules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES user_email_accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL, -- JSON conditions for rule matching
    actions JSONB NOT NULL, -- JSON actions to perform
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Analytics & Stats
CREATE TABLE IF NOT EXISTS email_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES user_email_accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    emails_received INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    emails_read INTEGER DEFAULT 0,
    emails_starred INTEGER DEFAULT 0,
    emails_spam INTEGER DEFAULT 0,
    avg_response_time_minutes INTEGER,
    top_senders JSONB, -- JSON array of top senders
    top_topics JSONB, -- JSON array of detected topics
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, account_id, date)
);

-- Email OAuth States (temporary, for OAuth flow)
CREATE TABLE IF NOT EXISTS email_oauth_states (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state VARCHAR(255) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL, -- 'gmail' or 'outlook'
    redirect_uri TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email_messages_user_id ON email_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_account_id ON email_messages(account_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_received_at ON email_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_is_read ON email_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_email_messages_ai_category ON email_messages(ai_category);
CREATE INDEX IF NOT EXISTS idx_email_messages_labels ON email_messages USING GIN (labels);
CREATE INDEX IF NOT EXISTS idx_email_contacts_user_id ON email_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_contacts_email ON email_contacts(email_address);
CREATE INDEX IF NOT EXISTS idx_email_draft_replies_message_id ON email_draft_replies(message_id);
CREATE INDEX IF NOT EXISTS idx_email_rules_user_id ON email_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_accounts_user_id ON user_email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_accounts_email ON user_email_accounts(email_address);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_email_accounts_updated_at BEFORE UPDATE ON user_email_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_messages_updated_at BEFORE UPDATE ON email_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_contacts_updated_at BEFORE UPDATE ON email_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_rules_updated_at BEFORE UPDATE ON email_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

