-- Add voice_enabled column to widget_settings table
ALTER TABLE widget_settings 
ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN DEFAULT true;

-- Update existing records to enable voice by default
UPDATE widget_settings 
SET voice_enabled = true 
WHERE voice_enabled IS NULL;
