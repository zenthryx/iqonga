-- Create generated_content table for storing AI-generated content
CREATE TABLE IF NOT EXISTS generated_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_text TEXT NOT NULL,
    ai_model_used VARCHAR(100),
    generation_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'generated',
    metadata JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_generated_content_agent_id ON generated_content(agent_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_platform ON generated_content(platform);
CREATE INDEX IF NOT EXISTS idx_generated_content_content_type ON generated_content(content_type);
CREATE INDEX IF NOT EXISTS idx_generated_content_created_at ON generated_content(created_at);
CREATE INDEX IF NOT EXISTS idx_generated_content_status ON generated_content(status);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_generated_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_generated_content_updated_at
    BEFORE UPDATE ON generated_content
    FOR EACH ROW
    EXECUTE FUNCTION update_generated_content_updated_at();

-- Add comments
COMMENT ON TABLE generated_content IS 'Stores AI-generated content for agents';
COMMENT ON COLUMN generated_content.id IS 'Unique identifier for the generated content';
COMMENT ON COLUMN generated_content.agent_id IS 'Reference to the AI agent that generated this content';
COMMENT ON COLUMN generated_content.platform IS 'Platform where content was generated for (e.g., ai_generation, twitter, etc.)';
COMMENT ON COLUMN generated_content.content_type IS 'Type of content generated (e.g., tweet, thread, reply)';
COMMENT ON COLUMN generated_content.content_text IS 'The actual generated content text';
COMMENT ON COLUMN generated_content.ai_model_used IS 'AI model used for generation (e.g., gpt-4, gpt-3.5-turbo)';
COMMENT ON COLUMN generated_content.generation_config IS 'Configuration used for generation (JSON)';
COMMENT ON COLUMN generated_content.status IS 'Status of the generated content (e.g., generated, posted, failed)';
COMMENT ON COLUMN generated_content.metadata IS 'Additional metadata about the generation';
