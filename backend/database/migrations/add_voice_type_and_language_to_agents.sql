-- Migration: Add preferred voice type and music language to agents table
-- This allows each agent to have a consistent voice type for music generation

-- Add preferred_voice_type column to ai_agents table
ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS preferred_voice_type VARCHAR(50) DEFAULT NULL;

-- Add preferred_music_language column to ai_agents table
ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS preferred_music_language VARCHAR(10) DEFAULT NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN ai_agents.preferred_voice_type IS 'Preferred voice type for music generation (e.g., male, female, neutral, auto, or specific styles). Takes priority over company profile.';
COMMENT ON COLUMN ai_agents.preferred_music_language IS 'Preferred language code for music generation (e.g., en, es, fr, de). Takes priority over company profile.';

