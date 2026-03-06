-- Meeting Reminder Preferences Table
-- Stores user preferences for automated email reminders

CREATE TABLE IF NOT EXISTS meeting_reminder_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Pre-meeting reminders
  enable_pre_meeting_reminders BOOLEAN DEFAULT true,
  reminder_minutes_before INTEGER DEFAULT 30, -- 30 minutes before meeting
  
  -- Daily digest
  enable_daily_digest BOOLEAN DEFAULT true,
  daily_digest_time TIME DEFAULT '08:00:00', -- 8:00 AM local time
  daily_digest_timezone VARCHAR(100) DEFAULT 'UTC',
  
  -- Weekly preview
  enable_weekly_preview BOOLEAN DEFAULT true,
  weekly_preview_day INTEGER DEFAULT 0, -- 0 = Sunday, 1 = Monday, etc.
  weekly_preview_time TIME DEFAULT '18:00:00', -- 6:00 PM local time
  
  -- Email preferences
  include_ai_insights BOOLEAN DEFAULT true, -- Include AI prep in reminders
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(user_id)
);

-- Reminder tracking table (to avoid duplicate sends)
CREATE TABLE IF NOT EXISTS meeting_reminders_sent (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES calendar_events(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL, -- 'pre_meeting', 'daily_digest', 'weekly_preview'
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminder_prefs_user_id ON meeting_reminder_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_sent_user_id ON meeting_reminders_sent(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_sent_event_id ON meeting_reminders_sent(event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_sent_type ON meeting_reminders_sent(reminder_type);

-- Unique index to prevent duplicate reminders on same day (using date cast)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_sent_unique_per_day 
  ON meeting_reminders_sent (user_id, COALESCE(event_id, -1), reminder_type, DATE(sent_at));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reminder_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reminder_prefs_updated_at
  BEFORE UPDATE ON meeting_reminder_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_reminder_prefs_updated_at();

COMMENT ON TABLE meeting_reminder_preferences IS 'User preferences for automated meeting reminders';
COMMENT ON TABLE meeting_reminders_sent IS 'Tracks sent reminders to avoid duplicates';
COMMENT ON COLUMN meeting_reminder_preferences.reminder_minutes_before IS 'Minutes before meeting to send reminder (default 30)';
COMMENT ON COLUMN meeting_reminder_preferences.daily_digest_time IS 'Time to send daily digest (local time)';
COMMENT ON COLUMN meeting_reminder_preferences.weekly_preview_day IS '0=Sunday, 1=Monday, 2=Tuesday, etc.';

