-- Scheduling Analytics Tables
-- Stores user scheduling patterns and AI recommendations

-- User scheduling patterns and preferences
CREATE TABLE IF NOT EXISTS user_scheduling_patterns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Preferred meeting times (learned from history)
  preferred_hours JSONB DEFAULT '[]', -- [9, 10, 11, 14, 15] - hours user typically schedules
  
  -- Meeting statistics
  avg_meetings_per_day DECIMAL(5,2) DEFAULT 0,
  avg_meeting_duration_minutes INTEGER DEFAULT 60,
  most_common_day INTEGER, -- 0-6 (Sunday-Saturday)
  
  -- Focus time preferences
  preferred_focus_hours JSONB DEFAULT '[]', -- Hours to protect for deep work
  min_focus_block_minutes INTEGER DEFAULT 120, -- Minimum uninterrupted time
  
  -- Travel/location patterns
  common_locations JSONB DEFAULT '[]', -- Frequently used locations
  avg_travel_time_minutes INTEGER DEFAULT 15,
  
  -- Last analysis
  last_analyzed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id)
);

-- Scheduling conflicts and warnings
CREATE TABLE IF NOT EXISTS scheduling_conflicts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  -- Conflict type
  conflict_type VARCHAR(50) NOT NULL, -- 'overlap', 'back_to_back', 'travel_time', 'overload', 'focus_time'
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  
  -- Conflict details
  conflicting_event_id INTEGER REFERENCES calendar_events(id) ON DELETE CASCADE,
  description TEXT,
  suggested_action TEXT,
  
  -- AI recommendation
  ai_suggestion JSONB, -- Structured suggestion from AI
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'ignored'
  resolved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Smart scheduling suggestions
CREATE TABLE IF NOT EXISTS scheduling_suggestions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Suggestion type
  suggestion_type VARCHAR(50) NOT NULL, -- 'best_time', 'reschedule', 'block_focus', 'reduce_load', 'add_buffer'
  priority VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high'
  
  -- Suggestion details
  title TEXT NOT NULL,
  description TEXT,
  reasoning TEXT, -- Why AI made this suggestion
  
  -- Actionable data
  suggested_action JSONB, -- Action user can take
  affected_event_ids INTEGER[], -- Events this suggestion relates to
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
  expires_at TIMESTAMP, -- Suggestion validity period
  acted_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Calendar health metrics (daily snapshots)
CREATE TABLE IF NOT EXISTS calendar_health_metrics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  
  -- Daily metrics
  total_meetings INTEGER DEFAULT 0,
  total_meeting_hours DECIMAL(5,2) DEFAULT 0,
  back_to_back_meetings INTEGER DEFAULT 0,
  conflicts_count INTEGER DEFAULT 0,
  
  -- Health scores (0-100)
  overall_health_score INTEGER,
  balance_score INTEGER, -- Work-life balance
  focus_time_score INTEGER, -- Available deep work time
  efficiency_score INTEGER, -- Meeting efficiency
  
  -- Recommendations count
  active_suggestions INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, metric_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduling_patterns_user_id ON user_scheduling_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_user_id ON scheduling_conflicts(user_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_event_id ON scheduling_conflicts(event_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_status ON scheduling_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_user_id ON scheduling_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON scheduling_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_expires ON scheduling_suggestions(expires_at);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_date ON calendar_health_metrics(user_id, metric_date);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_scheduling_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scheduling_patterns_updated_at
  BEFORE UPDATE ON user_scheduling_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduling_updated_at();

CREATE TRIGGER trigger_update_conflicts_updated_at
  BEFORE UPDATE ON scheduling_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduling_updated_at();

-- Comments
COMMENT ON TABLE user_scheduling_patterns IS 'Learned scheduling patterns and preferences for each user';
COMMENT ON TABLE scheduling_conflicts IS 'Detected scheduling conflicts and issues';
COMMENT ON TABLE scheduling_suggestions IS 'AI-generated scheduling recommendations';
COMMENT ON TABLE calendar_health_metrics IS 'Daily snapshots of calendar health metrics';
COMMENT ON COLUMN user_scheduling_patterns.preferred_hours IS 'Array of hours (0-23) user typically schedules meetings';
COMMENT ON COLUMN scheduling_conflicts.conflict_type IS 'Type: overlap, back_to_back, travel_time, overload, focus_time';
COMMENT ON COLUMN scheduling_suggestions.suggestion_type IS 'Type: best_time, reschedule, block_focus, reduce_load, add_buffer';
COMMENT ON COLUMN calendar_health_metrics.overall_health_score IS 'Score 0-100 representing calendar health';

