-- Add AI-related columns to email_messages table

-- AI Categorization
ALTER TABLE email_messages 
ADD COLUMN IF NOT EXISTS ai_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS ai_priority VARCHAR(20),
ADD COLUMN IF NOT EXISTS ai_sentiment VARCHAR(20),
ADD COLUMN IF NOT EXISTS ai_labels JSONB,
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3, 2);

-- AI Summary
ALTER TABLE email_messages 
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_key_points JSONB,
ADD COLUMN IF NOT EXISTS ai_action_items JSONB;

-- Spam Detection
ALTER TABLE email_messages 
ADD COLUMN IF NOT EXISTS is_spam BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS spam_score DECIMAL(3, 2);

-- Indexes for AI queries
CREATE INDEX IF NOT EXISTS idx_email_messages_ai_category ON email_messages(ai_category);
CREATE INDEX IF NOT EXISTS idx_email_messages_ai_priority ON email_messages(ai_priority);
CREATE INDEX IF NOT EXISTS idx_email_messages_is_spam ON email_messages(is_spam);

-- Comments
COMMENT ON COLUMN email_messages.ai_category IS 'AI-determined category: urgent, followup, newsletter, promotional, social, spam, personal, work';
COMMENT ON COLUMN email_messages.ai_priority IS 'AI-determined priority: high, medium, low';
COMMENT ON COLUMN email_messages.ai_sentiment IS 'AI-determined sentiment: positive, neutral, negative';
COMMENT ON COLUMN email_messages.ai_labels IS 'AI-suggested labels as JSON array';
COMMENT ON COLUMN email_messages.ai_confidence IS 'AI confidence score (0-1)';
COMMENT ON COLUMN email_messages.ai_summary IS 'AI-generated email summary';
COMMENT ON COLUMN email_messages.ai_key_points IS 'AI-extracted key points as JSON array';
COMMENT ON COLUMN email_messages.ai_action_items IS 'AI-extracted action items as JSON array';
COMMENT ON COLUMN email_messages.is_spam IS 'Whether email is identified as spam';
COMMENT ON COLUMN email_messages.spam_score IS 'Spam probability score (0-1)';

