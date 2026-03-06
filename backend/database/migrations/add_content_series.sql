-- Content Series & Campaign Generator Migration
-- Enables users to create multi-piece content campaigns and series

-- Content Series Table
CREATE TABLE IF NOT EXISTS content_series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
    
    -- Series metadata
    title VARCHAR(255) NOT NULL,
    description TEXT,
    series_type VARCHAR(50) NOT NULL, -- 'educational', 'product_launch', 'thought_leadership', 'narrative', 'custom'
    theme VARCHAR(255),
    topic TEXT NOT NULL,
    
    -- Series configuration
    total_pieces INTEGER NOT NULL DEFAULT 5,
    platforms TEXT[] DEFAULT ARRAY['twitter'], -- Array of platforms
    content_types TEXT[] DEFAULT ARRAY['tweet'], -- Array of content types per piece
    progression_type VARCHAR(50) DEFAULT 'linear', -- 'linear', 'thematic', 'narrative', 'random'
    
    -- Scheduling
    start_date DATE,
    frequency VARCHAR(20) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly', 'custom'
    timezone VARCHAR(50) DEFAULT 'UTC',
    auto_schedule BOOLEAN DEFAULT false,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'generating', 'ready', 'scheduled', 'active', 'completed', 'paused'
    generation_progress INTEGER DEFAULT 0, -- 0-100
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_series_user ON content_series(user_id);
CREATE INDEX IF NOT EXISTS idx_content_series_agent ON content_series(agent_id);
CREATE INDEX IF NOT EXISTS idx_content_series_status ON content_series(status);
CREATE INDEX IF NOT EXISTS idx_content_series_type ON content_series(series_type);

-- Content Series Pieces Table (individual content items in a series)
CREATE TABLE IF NOT EXISTS content_series_pieces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    series_id UUID NOT NULL REFERENCES content_series(id) ON DELETE CASCADE,
    
    -- Piece metadata
    piece_number INTEGER NOT NULL, -- Order in series (1, 2, 3, ...)
    title VARCHAR(255),
    platform VARCHAR(50) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    
    -- Content
    content_text TEXT,
    content_config JSONB, -- Style, tone, hashtags, etc.
    
    -- Media
    image_id UUID REFERENCES generated_images(id) ON DELETE SET NULL,
    video_id UUID REFERENCES generated_videos(id) ON DELETE SET NULL,
    
    -- Scheduling
    scheduled_time TIMESTAMP,
    scheduled_post_id UUID REFERENCES scheduled_posts(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'generated', 'scheduled', 'published', 'failed'
    generation_error TEXT,
    
    -- Performance (updated after publishing)
    engagement_score DECIMAL(10, 2),
    impressions INTEGER,
    likes INTEGER,
    shares INTEGER,
    comments INTEGER,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    published_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_series_pieces_series ON content_series_pieces(series_id, piece_number);
CREATE INDEX IF NOT EXISTS idx_series_pieces_status ON content_series_pieces(status);
CREATE INDEX IF NOT EXISTS idx_series_pieces_scheduled ON content_series_pieces(scheduled_time) WHERE scheduled_time IS NOT NULL;

-- Content Series Templates Table (reusable content structures for content series)
-- Note: This is separate from the existing content_templates table which has a different schema
CREATE TABLE IF NOT EXISTS content_series_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- NULL = system template
    
    -- Template metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'framework', 'industry', 'format', 'custom'
    framework_type VARCHAR(50), -- 'AIDA', 'PAS', 'StoryBrand', 'BeforeAfterBridge', 'HowTo', 'Listicle', etc.
    industry VARCHAR(50), -- 'saas', 'ecommerce', 'b2b', 'healthcare', etc.
    
    -- Template structure
    template_structure JSONB NOT NULL, -- Defines sections, order, prompts
    example_content TEXT,
    
    -- Usage
    is_system_template BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_series_templates_user ON content_series_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_content_series_templates_category ON content_series_templates(category);
CREATE INDEX IF NOT EXISTS idx_content_series_templates_framework ON content_series_templates(framework_type);
CREATE INDEX IF NOT EXISTS idx_content_series_templates_system ON content_series_templates(is_system_template) WHERE is_system_template = true;

-- No need to add columns - we're creating a new table with the correct schema

-- Insert default system templates (only if they don't already exist)
INSERT INTO content_series_templates (user_id, name, description, category, framework_type, is_system_template, template_structure)
SELECT * FROM (VALUES
(CAST(NULL AS INTEGER), 'AIDA Framework', 'Attention, Interest, Desire, Action - Classic marketing framework', 'framework', 'AIDA', true, '{"sections": [{"name": "Attention", "prompt": "Create a hook that grabs attention"}, {"name": "Interest", "prompt": "Build interest with valuable information"}, {"name": "Desire", "prompt": "Create desire by highlighting benefits"}, {"name": "Action", "prompt": "Include a clear call-to-action"}]}'::jsonb),
(CAST(NULL AS INTEGER), 'PAS Framework', 'Problem, Agitate, Solve - Effective problem-solving structure', 'framework', 'PAS', true, '{"sections": [{"name": "Problem", "prompt": "Identify the problem"}, {"name": "Agitate", "prompt": "Amplify the problem''s impact"}, {"name": "Solve", "prompt": "Present the solution"}]}'::jsonb),
(CAST(NULL AS INTEGER), 'StoryBrand Framework', 'Character, Problem, Guide, Plan, Success - Story-driven marketing', 'framework', 'StoryBrand', true, '{"sections": [{"name": "Character", "prompt": "Define the customer as the hero"}, {"name": "Problem", "prompt": "Identify the customer''s problem"}, {"name": "Guide", "prompt": "Position your brand as the guide"}, {"name": "Plan", "prompt": "Present a clear plan"}, {"name": "Success", "prompt": "Show the successful outcome"}]}'::jsonb),
(CAST(NULL AS INTEGER), 'Before/After/Bridge', 'Current state → Desired state → Solution', 'framework', 'BeforeAfterBridge', true, '{"sections": [{"name": "Before", "prompt": "Describe the current situation"}, {"name": "After", "prompt": "Paint the desired future state"}, {"name": "Bridge", "prompt": "Show how to get there"}]}'::jsonb),
(CAST(NULL AS INTEGER), 'How-To Guide', 'Step-by-step instructional content', 'format', 'HowTo', true, '{"sections": [{"name": "Introduction", "prompt": "Introduce the topic"}, {"name": "Steps", "prompt": "Provide clear step-by-step instructions"}, {"name": "Conclusion", "prompt": "Summarize and reinforce key points"}]}'::jsonb),
(CAST(NULL AS INTEGER), 'Listicle', 'Top 10, Best of, Ultimate Guide format', 'format', 'Listicle', true, '{"sections": [{"name": "Introduction", "prompt": "Introduce the list"}, {"name": "Items", "prompt": "Create numbered list items with explanations"}, {"name": "Conclusion", "prompt": "Wrap up with key takeaways"}]}'::jsonb)
) AS v(user_id, name, description, category, framework_type, is_system_template, template_structure)
WHERE NOT EXISTS (
    SELECT 1 FROM content_series_templates 
    WHERE content_series_templates.name = v.name 
    AND content_series_templates.is_system_template = true
);

