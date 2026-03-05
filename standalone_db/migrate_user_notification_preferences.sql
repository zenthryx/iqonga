-- User notification preferences for Settings > Notifications.
-- Run if you want to persist notification toggles (email, push, agent alerts, performance reports).
-- Usage: psql -U YOUR_USER -d ajentrix_standalone -f Backend/standalone_db/migrate_user_notification_preferences.sql

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT false,
  agent_alerts BOOLEAN DEFAULT true,
  performance_reports BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
COMMENT ON TABLE user_notification_preferences IS 'Settings > Notifications toggles per user';
