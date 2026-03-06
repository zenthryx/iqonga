-- Migration: Create custom business data system
-- Allows businesses to store industry-specific data (real estate properties, inventory, etc.)
-- Supports flexible JSONB schemas for different countries/regions

-- IMPORTANT: This migration requires the pgvector extension
-- If you get "type vector does not exist" error, you need to install pgvector first
-- See instructions at the end of this file

-- Enable pgvector extension (if not already enabled)
-- Note: This requires superuser privileges or the extension must be pre-installed
DO $$
BEGIN
    -- Try to create the extension
    CREATE EXTENSION IF NOT EXISTS vector;
    RAISE NOTICE 'pgvector extension enabled successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Could not enable pgvector extension. Vector search will not be available. Error: %', SQLERRM;
        -- Continue without vector support - we'll make embedding_vector nullable
END $$;

-- Custom data types/schemas registry
CREATE TABLE IF NOT EXISTS custom_data_schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
    schema_name VARCHAR(100) NOT NULL, -- e.g., 'real_estate', 'inventory', 'appointments'
    schema_version VARCHAR(20) DEFAULT '1.0',
    schema_definition JSONB NOT NULL, -- JSON Schema definition
    country_code VARCHAR(10), -- ISO country code for country-specific formats
    region VARCHAR(100), -- Optional region within country
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_profile_id, schema_name, country_code)
);

-- Custom business data entries
CREATE TABLE IF NOT EXISTS custom_business_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
    schema_id UUID REFERENCES custom_data_schemas(id) ON DELETE CASCADE,
    data JSONB NOT NULL, -- Flexible JSON data matching the schema
    search_text TEXT, -- Full-text searchable content
    embedding_vector VECTOR(1536), -- For semantic search (requires pgvector extension)
    tags TEXT[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active', -- active, archived, pending, etc.
    metadata JSONB DEFAULT '{}', -- Additional metadata (views, favorites, etc.)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_data_company ON custom_business_data(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_custom_data_schema ON custom_business_data(schema_id);
CREATE INDEX IF NOT EXISTS idx_custom_data_status ON custom_business_data(status);
CREATE INDEX IF NOT EXISTS idx_custom_data_tags ON custom_business_data USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_custom_data_search ON custom_business_data USING GIN(to_tsvector('english', search_text));
-- Create vector index only if pgvector extension is available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        CREATE INDEX IF NOT EXISTS idx_custom_data_embedding 
        ON custom_business_data USING ivfflat(embedding_vector vector_cosine_ops) 
        WITH (lists = 100);
        RAISE NOTICE 'Vector index created successfully';
    ELSE
        RAISE WARNING 'pgvector extension not available. Vector index not created.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Could not create vector index. Error: %', SQLERRM;
END $$;

-- Vector similarity search function for custom data
-- Only create if pgvector extension is available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        -- Create vector similarity search function
        EXECUTE '
        CREATE OR REPLACE FUNCTION match_custom_data(
            query_embedding VECTOR(1536),
            company_id UUID,
            schema_name VARCHAR(100) DEFAULT NULL,
            match_threshold FLOAT DEFAULT 0.7,
            match_count INT DEFAULT 10
        )
        RETURNS TABLE(
            id UUID,
            data JSONB,
            similarity FLOAT,
            schema_name VARCHAR(100)
        )
        LANGUAGE SQL STABLE
        AS $func$
            SELECT
                cbd.id,
                cbd.data,
                1 - (cbd.embedding_vector <=> query_embedding) AS similarity,
                cds.schema_name
            FROM custom_business_data cbd
            JOIN custom_data_schemas cds ON cbd.schema_id = cds.id
            WHERE cbd.company_profile_id = company_id
            AND cbd.status = ''active''
            AND (schema_name IS NULL OR cds.schema_name = schema_name)
            AND cbd.embedding_vector IS NOT NULL
            AND 1 - (cbd.embedding_vector <=> query_embedding) > match_threshold
            ORDER BY similarity DESC
            LIMIT match_count;
        $func$';
        RAISE NOTICE 'Vector similarity search function created successfully';
    ELSE
        -- Create a fallback function that returns empty results
        EXECUTE '
        CREATE OR REPLACE FUNCTION match_custom_data(
            query_embedding TEXT, -- Accept text instead of vector
            company_id UUID,
            schema_name VARCHAR(100) DEFAULT NULL,
            match_threshold FLOAT DEFAULT 0.7,
            match_count INT DEFAULT 10
        )
        RETURNS TABLE(
            id UUID,
            data JSONB,
            similarity FLOAT,
            schema_name VARCHAR(100)
        )
        LANGUAGE SQL STABLE
        AS $func$
            -- Fallback: return empty results when pgvector is not available
            SELECT
                NULL::UUID as id,
                NULL::JSONB as data,
                0.0::FLOAT as similarity,
                NULL::VARCHAR(100) as schema_name
            WHERE FALSE;
        $func$';
        RAISE WARNING 'pgvector not available. Created fallback function. Semantic search will not work until pgvector is enabled.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Could not create vector search function. Error: %', SQLERRM;
END $$;

-- MCP (Model Context Protocol) integrations
CREATE TABLE IF NOT EXISTS mcp_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
    integration_name VARCHAR(100) NOT NULL,
    integration_type VARCHAR(50) NOT NULL, -- 'vector_db', 'api', 'database', 'file_system'
    config JSONB NOT NULL, -- Connection config, credentials (encrypted)
    capabilities JSONB DEFAULT '[]', -- What the integration can do
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_profile_id, integration_name)
);

-- Agent access to custom data
CREATE TABLE IF NOT EXISTS agent_custom_data_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    schema_id UUID REFERENCES custom_data_schemas(id) ON DELETE CASCADE,
    access_level VARCHAR(50) DEFAULT 'read', -- read, write, full
    filters JSONB DEFAULT '{}', -- Optional filters (e.g., only active properties)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(agent_id, schema_id)
);

-- Comments/notes on custom data (for real estate: viewing notes, etc.)
CREATE TABLE IF NOT EXISTS custom_data_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_data_id UUID REFERENCES custom_business_data(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    note_type VARCHAR(50) DEFAULT 'general', -- general, viewing, inquiry, follow_up
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics for custom data (views, inquiries, etc.)
CREATE TABLE IF NOT EXISTS custom_data_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_data_id UUID REFERENCES custom_business_data(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- view, inquiry, favorite, share
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_data_analytics_data ON custom_data_analytics(custom_data_id);
CREATE INDEX IF NOT EXISTS idx_custom_data_analytics_event ON custom_data_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_custom_data_analytics_date ON custom_data_analytics(created_at);

COMMENT ON TABLE custom_data_schemas IS 'Defines data structures for different business types (real estate, inventory, etc.)';
COMMENT ON TABLE custom_business_data IS 'Stores actual business data entries (properties, products, etc.)';
COMMENT ON TABLE mcp_integrations IS 'External integrations via Model Context Protocol';
COMMENT ON TABLE agent_custom_data_access IS 'Controls which agents can access which custom data schemas';

-- ============================================================================
-- INSTALLATION INSTRUCTIONS FOR pgvector
-- ============================================================================
-- 
-- If you see "type vector does not exist" error, you need to install pgvector:
--
-- Option 1: Using Aiven (if using Aiven PostgreSQL)
--   - Go to your Aiven dashboard
--   - Navigate to your PostgreSQL service
--   - Go to "Extensions" tab
--   - Enable "vector" extension
--
-- Option 2: Using standard PostgreSQL
--   - Install pgvector on your server:
--     Ubuntu/Debian: sudo apt-get install postgresql-XX-vector
--     macOS: brew install pgvector
--   - Connect to your database as superuser
--   - Run: CREATE EXTENSION vector;
--
-- Option 3: Using Docker
--   - Use a PostgreSQL image with pgvector pre-installed:
--     docker run -d -p 5432:5432 ankane/pgvector:latest
--
-- Option 4: Without pgvector (Limited functionality)
--   - The migration will run but embedding_vector will be NULL
--   - Semantic search will not work
--   - Full-text search will still work
--
-- After installing pgvector, re-run this migration or manually enable:
--   CREATE EXTENSION IF NOT EXISTS vector;
-- ============================================================================

