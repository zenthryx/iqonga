-- Adds richer context to company profiles plus supporting tables

BEGIN;

ALTER TABLE company_profiles
    ADD COLUMN legal_name VARCHAR(200),
    ADD COLUMN business_type VARCHAR(100),
    ADD COLUMN registration_number VARCHAR(100),
    ADD COLUMN time_zone VARCHAR(100),
    ADD COLUMN headquarters_address JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN support_email VARCHAR(200),
    ADD COLUMN support_phone VARCHAR(50),
    ADD COLUMN whatsapp_number VARCHAR(50),
    ADD COLUMN support_hours TEXT,
    ADD COLUMN primary_currency_code VARCHAR(10),
    ADD COLUMN primary_currency_symbol VARCHAR(10),
    ADD COLUMN accepted_currencies TEXT[] DEFAULT '{}'::text[],
    ADD COLUMN preferred_languages TEXT[] DEFAULT '{}'::text[],
    ADD COLUMN shipping_regions TEXT[] DEFAULT '{}'::text[],
    ADD COLUMN operating_countries TEXT[] DEFAULT '{}'::text[],
    ADD COLUMN tax_policy TEXT,
    ADD COLUMN vat_number VARCHAR(100),
    ADD COLUMN return_policy TEXT,
    ADD COLUMN refund_policy TEXT,
    ADD COLUMN warranty_policy TEXT,
    ADD COLUMN business_hours JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS company_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
    location_name VARCHAR(200) NOT NULL,
    location_type VARCHAR(50),
    address JSONB DEFAULT '{}'::jsonb,
    contact_email VARCHAR(200),
    contact_phone VARCHAR(50),
    timezone VARCHAR(100),
    hours JSONB DEFAULT '{}'::jsonb,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}'::text[],
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure updated_at columns refresh automatically
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_company_locations_updated_at'
    ) THEN
        CREATE TRIGGER update_company_locations_updated_at
        BEFORE UPDATE ON company_locations
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_company_faqs_updated_at'
    ) THEN
        CREATE TRIGGER update_company_faqs_updated_at
        BEFORE UPDATE ON company_faqs
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END;
$$;

COMMIT;

