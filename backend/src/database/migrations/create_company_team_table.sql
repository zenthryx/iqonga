-- Create company_team table
CREATE TABLE IF NOT EXISTS company_team (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    bio TEXT,
    expertise_areas TEXT[],
    social_links JSONB DEFAULT '{}',
    profile_image_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_team_profile_id ON company_team(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_company_team_status ON company_team(status);
CREATE INDEX IF NOT EXISTS idx_company_team_position ON company_team(position);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_company_team_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_team_updated_at
    BEFORE UPDATE ON company_team
    FOR EACH ROW
    EXECUTE FUNCTION update_company_team_updated_at();
