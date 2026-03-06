-- AI Meeting Prep Table
-- Stores AI-generated meeting preparation briefs

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS ai_meeting_prep CASCADE;

-- Create table
CREATE TABLE ai_meeting_prep (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Meeting context
  meeting_summary TEXT,
  attendee_context JSONB DEFAULT '[]',
  related_emails JSONB DEFAULT '[]',
  past_meetings JSONB DEFAULT '[]',
  
  -- AI-generated content
  discussion_topics TEXT[],
  suggested_questions TEXT[],
  preparation_checklist TEXT[],
  key_context TEXT,
  estimated_prep_time INTEGER, -- in minutes
  
  -- Metadata
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(event_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_meeting_prep_event_id ON ai_meeting_prep(event_id);
CREATE INDEX IF NOT EXISTS idx_ai_meeting_prep_user_id ON ai_meeting_prep(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_meeting_prep_expires_at ON ai_meeting_prep(expires_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_meeting_prep_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_meeting_prep_updated_at
  BEFORE UPDATE ON ai_meeting_prep
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_meeting_prep_updated_at();

-- Auto-cleanup of expired prep data (optional - can be run as a cron job)
-- DELETE FROM ai_meeting_prep WHERE expires_at < CURRENT_TIMESTAMP;

COMMENT ON TABLE ai_meeting_prep IS 'AI-generated meeting preparation briefs';
COMMENT ON COLUMN ai_meeting_prep.meeting_summary IS 'AI-generated summary of the meeting purpose';
COMMENT ON COLUMN ai_meeting_prep.attendee_context IS 'Information about each attendee (past meetings, emails, etc.)';
COMMENT ON COLUMN ai_meeting_prep.related_emails IS 'Relevant email threads related to this meeting';
COMMENT ON COLUMN ai_meeting_prep.past_meetings IS 'Previous calendar events with same attendees';
COMMENT ON COLUMN ai_meeting_prep.discussion_topics IS 'AI-suggested topics to discuss';
COMMENT ON COLUMN ai_meeting_prep.suggested_questions IS 'AI-suggested questions to ask';
COMMENT ON COLUMN ai_meeting_prep.preparation_checklist IS 'Tasks to complete before the meeting';
COMMENT ON COLUMN ai_meeting_prep.estimated_prep_time IS 'Estimated preparation time in minutes';

