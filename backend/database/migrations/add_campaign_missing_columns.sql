-- Add missing columns to ad_campaigns table
-- This migration adds the 'strategy' and 'error_message' columns that are required
-- for Smart Campaign Generator functionality

-- Add strategy column (JSONB to store campaign strategy data)
ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS strategy JSONB DEFAULT '{}';

-- Add error_message column (TEXT to store error messages when campaign generation fails)
ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add comments for documentation
COMMENT ON COLUMN ad_campaigns.strategy IS 'AI-generated campaign strategy including theme, key messages, content pillars, and story arc';
COMMENT ON COLUMN ad_campaigns.error_message IS 'Error message when campaign generation or execution fails';

