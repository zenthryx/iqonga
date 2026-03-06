-- Migration: Add preferred_music_genre to company_profiles
-- Created: 2025-11-14
-- Purpose: Allow companies to explicitly set their preferred music genre/style

-- Add preferred_music_genre column to company_profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_profiles' 
        AND column_name = 'preferred_music_genre'
    ) THEN
        ALTER TABLE company_profiles 
        ADD COLUMN preferred_music_genre VARCHAR(100);
        
        COMMENT ON COLUMN company_profiles.preferred_music_genre IS 
        'Preferred music genre/style for agent-generated music (e.g., hip-hop, rap, pop, electronic, rock, jazz, etc.)';
    END IF;
END $$;

