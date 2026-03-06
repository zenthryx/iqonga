-- AI Style Profiles Table
-- Stores user's learned editing styles for AI-powered style application

CREATE TABLE IF NOT EXISTS ai_style_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_name VARCHAR(255) NOT NULL,
    style_data JSONB NOT NULL DEFAULT '{}',
    sample_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_style_profiles_user_id ON ai_style_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_style_profiles_active ON ai_style_profiles(user_id, is_active) WHERE is_active = TRUE;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_ai_style_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_style_profiles_updated_at
    BEFORE UPDATE ON ai_style_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_style_profiles_updated_at();

-- Comments
COMMENT ON TABLE ai_style_profiles IS 'Stores AI-learned style profiles for users based on their editing patterns';
COMMENT ON COLUMN ai_style_profiles.style_data IS 'JSON object containing color profile, style characteristics, and editing preferences';
COMMENT ON COLUMN ai_style_profiles.sample_count IS 'Number of edited images used to learn this style';

