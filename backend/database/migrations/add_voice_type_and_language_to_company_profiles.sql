-- Add voice type and language preferences to company_profiles table
-- This allows companies to set default voice characteristics and language for music generation

ALTER TABLE company_profiles 
ADD COLUMN IF NOT EXISTS preferred_voice_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS preferred_music_language VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN company_profiles.preferred_voice_type IS 'Preferred voice type for music vocals: male, female, neutral, auto, or specific voice styles';
COMMENT ON COLUMN company_profiles.preferred_music_language IS 'Preferred language for music lyrics: en, es, fr, de, it, pt, ja, ko, zh, etc.';

