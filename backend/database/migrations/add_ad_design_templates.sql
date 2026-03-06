-- Ad Design Templates Migration
-- Template-based ad generation system (no LLM for images)

-- Ad Design Templates table - stores visual templates with layout configs
CREATE TABLE IF NOT EXISTS ad_design_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Template Metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'product_showcase', 'promotional', 'testimonial', 'educational', etc.
    tags TEXT[], -- For search/filtering
    
    -- Template Assets
    background_image_url TEXT NOT NULL, -- URL to background image (uploaded or stock)
    background_image_path TEXT, -- Local file path
    background_color VARCHAR(7), -- Hex color fallback (e.g., '#FFFFFF')
    
    -- Layout Configuration (JSON)
    layout_config JSONB NOT NULL DEFAULT '{}',
    /*
    Example layout_config:
    {
      "textPlaceholders": [
        {
          "id": "headline",
          "type": "headline",
          "position": { "x": 50, "y": 100 },
          "size": { "width": 900, "height": 120 },
          "style": {
            "fontFamily": "Arial",
            "fontSize": 48,
            "fontWeight": "bold",
            "color": "#FFFFFF",
            "align": "center",
            "maxLines": 2,
            "strokeColor": "#000000",
            "strokeWidth": 2,
            "shadow": true
          }
        },
        {
          "id": "description",
          "type": "description",
          "position": { "x": 50, "y": 250 },
          "size": { "width": 900, "height": 200 },
          "style": {
            "fontFamily": "Arial",
            "fontSize": 32,
            "fontWeight": "normal",
            "color": "#FFFFFF",
            "align": "center",
            "maxLines": 3
          }
        },
        {
          "id": "cta",
          "type": "cta",
          "position": { "x": 400, "y": 500 },
          "size": { "width": 200, "height": 60 },
          "style": {
            "fontFamily": "Arial",
            "fontSize": 24,
            "fontWeight": "bold",
            "color": "#FFFFFF",
            "backgroundColor": "#FF6B6B",
            "borderRadius": 8,
            "padding": { "x": 20, "y": 10 }
          }
        }
      ]
    }
    */
    
    -- Platform Support
    platforms JSONB DEFAULT '[]', -- ['facebook', 'instagram', 'twitter', etc.]
    aspect_ratios JSONB DEFAULT '["1:1"]', -- ['1:1', '9:16', '16:9', etc.]
    default_dimensions JSONB, -- { "width": 1080, "height": 1080 }
    
    -- Usage Stats
    times_used INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT FALSE,
    is_system_template BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template Generated Ads table - tracks generated ad variations
CREATE TABLE IF NOT EXISTS template_generated_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES ad_design_templates(id) ON DELETE CASCADE,
    
    -- Generated Content
    headline TEXT,
    description TEXT,
    cta_text TEXT,
    
    -- Generated Asset
    image_url TEXT NOT NULL,
    image_path TEXT,
    
    -- Platform/Format
    platform VARCHAR(50),
    format VARCHAR(50), -- 'feed', 'story', 'carousel', etc.
    aspect_ratio VARCHAR(10),
    
    -- Metadata
    generation_time_ms INTEGER, -- How long it took to generate
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ad_design_templates_user_id ON ad_design_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_design_templates_category ON ad_design_templates(category);
CREATE INDEX IF NOT EXISTS idx_ad_design_templates_public ON ad_design_templates(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_ad_design_templates_system ON ad_design_templates(is_system_template) WHERE is_system_template = TRUE;

CREATE INDEX IF NOT EXISTS idx_template_generated_ads_user_id ON template_generated_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_template_generated_ads_template_id ON template_generated_ads(template_id);
CREATE INDEX IF NOT EXISTS idx_template_generated_ads_created_at ON template_generated_ads(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_ad_design_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ad_design_templates_updated_at ON ad_design_templates;
CREATE TRIGGER update_ad_design_templates_updated_at
    BEFORE UPDATE ON ad_design_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_ad_design_templates_updated_at();

-- Comments
COMMENT ON TABLE ad_design_templates IS 'Visual ad design templates for template-based generation (no LLM)';
COMMENT ON TABLE template_generated_ads IS 'Generated ad variations from templates';
COMMENT ON COLUMN ad_design_templates.layout_config IS 'JSON configuration for text placeholder positions and styles';
COMMENT ON COLUMN ad_design_templates.background_image_url IS 'URL to pre-designed background image (no LLM generation needed)';
