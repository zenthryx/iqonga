-- Create company_achievements table
CREATE TABLE IF NOT EXISTS company_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    achieved_date DATE NOT NULL,
    category VARCHAR(100) DEFAULT 'general' CHECK (category IN ('award', 'milestone', 'certification', 'partnership', 'growth', 'innovation', 'general')),
    impact_level VARCHAR(50) DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    external_url VARCHAR(500),
    image_url VARCHAR(500),
    tags TEXT[],
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_achievements_profile_id ON company_achievements(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_company_achievements_category ON company_achievements(category);
CREATE INDEX IF NOT EXISTS idx_company_achievements_impact_level ON company_achievements(impact_level);
CREATE INDEX IF NOT EXISTS idx_company_achievements_date ON company_achievements(achieved_date DESC);
CREATE INDEX IF NOT EXISTS idx_company_achievements_status ON company_achievements(status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_company_achievements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_achievements_updated_at
    BEFORE UPDATE ON company_achievements
    FOR EACH ROW
    EXECUTE FUNCTION update_company_achievements_updated_at();
