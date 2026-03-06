-- Google Calendar Integration Tables

-- User Calendar Accounts
CREATE TABLE IF NOT EXISTS user_calendar_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'google',
  email_address VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP NOT NULL,
  scope TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  sync_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, provider, email_address)
);

CREATE INDEX idx_calendar_accounts_user ON user_calendar_accounts(user_id);
CREATE INDEX idx_calendar_accounts_active ON user_calendar_accounts(is_active);

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES user_calendar_accounts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_event_id VARCHAR(255) NOT NULL,
  calendar_id VARCHAR(255) NOT NULL,
  summary TEXT,
  description TEXT,
  location TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  start_timezone VARCHAR(100),
  end_timezone VARCHAR(100),
  is_all_day BOOLEAN DEFAULT false,
  status VARCHAR(50),
  attendees JSONB,
  organizer JSONB,
  recurring_event_id VARCHAR(255),
  recurrence TEXT[],
  conference_data JSONB,
  reminders JSONB,
  color_id VARCHAR(50),
  visibility VARCHAR(50),
  transparency VARCHAR(50),
  html_link TEXT,
  hangout_link TEXT,
  meet_link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_id, provider_event_id)
);

CREATE INDEX idx_events_account ON calendar_events(account_id);
CREATE INDEX idx_events_user ON calendar_events(user_id);
CREATE INDEX idx_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_events_end_time ON calendar_events(end_time);
CREATE INDEX idx_events_calendar ON calendar_events(calendar_id);
CREATE INDEX idx_events_status ON calendar_events(status);

-- Calendar OAuth States (for security)
CREATE TABLE IF NOT EXISTS calendar_oauth_states (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state_token VARCHAR(255) NOT NULL UNIQUE,
  provider VARCHAR(50) NOT NULL DEFAULT 'google',
  redirect_uri TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_oauth_states_token ON calendar_oauth_states(state_token);
CREATE INDEX idx_oauth_states_user ON calendar_oauth_states(user_id);

-- AI Meeting Prep Data
CREATE TABLE IF NOT EXISTS ai_meeting_prep (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agenda_summary TEXT,
  key_topics TEXT[],
  suggested_talking_points TEXT[],
  attendee_context JSONB,
  related_emails JSONB,
  meeting_brief TEXT,
  ai_recommendations TEXT[],
  prep_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_meeting_prep_event ON ai_meeting_prep(event_id);
CREATE INDEX idx_meeting_prep_user ON ai_meeting_prep(user_id);
CREATE INDEX idx_meeting_prep_status ON ai_meeting_prep(prep_status);

-- Calendar Analytics
CREATE TABLE IF NOT EXISTS calendar_analytics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_events INTEGER DEFAULT 0,
  total_hours NUMERIC(10,2) DEFAULT 0,
  meeting_count INTEGER DEFAULT 0,
  meeting_hours NUMERIC(10,2) DEFAULT 0,
  focus_time_hours NUMERIC(10,2) DEFAULT 0,
  avg_meeting_duration NUMERIC(10,2) DEFAULT 0,
  busiest_hour INTEGER,
  most_common_attendees JSONB,
  event_categories JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);

CREATE INDEX idx_analytics_user ON calendar_analytics(user_id);
CREATE INDEX idx_analytics_date ON calendar_analytics(date);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_calendar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_accounts_timestamp
  BEFORE UPDATE ON user_calendar_accounts
  FOR EACH ROW EXECUTE FUNCTION update_calendar_timestamp();

CREATE TRIGGER update_calendar_events_timestamp
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_calendar_timestamp();

CREATE TRIGGER update_meeting_prep_timestamp
  BEFORE UPDATE ON ai_meeting_prep
  FOR EACH ROW EXECUTE FUNCTION update_calendar_timestamp();

CREATE TRIGGER update_calendar_analytics_timestamp
  BEFORE UPDATE ON calendar_analytics
  FOR EACH ROW EXECUTE FUNCTION update_calendar_timestamp();

-- Comments
COMMENT ON TABLE user_calendar_accounts IS 'Stores user Google Calendar OAuth connections';
COMMENT ON TABLE calendar_events IS 'Stores synced calendar events from Google Calendar';
COMMENT ON TABLE calendar_oauth_states IS 'Temporary storage for OAuth state tokens';
COMMENT ON TABLE ai_meeting_prep IS 'AI-generated meeting preparation data';
COMMENT ON TABLE calendar_analytics IS 'Daily aggregated calendar analytics';

