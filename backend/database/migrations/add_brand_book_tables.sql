-- Brand Book & Enterprise Marketing Features
-- This migration adds brand management, product images, and image manipulation capabilities

-- Brand Book table - stores brand guidelines and assets
CREATE TABLE IF NOT EXISTS brand_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL,
    
    -- Brand Identity
    brand_name VARCHAR(255) NOT NULL,
    brand_description TEXT,
    
    -- Visual Identity
    primary_logo_url VARCHAR(500), -- Main logo
    secondary_logo_url VARCHAR(500), -- Alternative logo (e.g., horizontal, icon)
    favicon_url VARCHAR(500),
    
    -- Color Palette
    primary_colors JSONB DEFAULT '[]', -- Array of {name, hex, usage}
    secondary_colors JSONB DEFAULT '[]',
    accent_colors JSONB DEFAULT '[]',
    neutral_colors JSONB DEFAULT '[]',
    
    -- Typography
    primary_font VARCHAR(100),
    secondary_font VARCHAR(100),
    heading_font VARCHAR(100),
    body_font VARCHAR(100),
    font_urls JSONB DEFAULT '{}', -- URLs to font files if custom
    
    -- Brand Guidelines
    brand_voice TEXT,
    brand_personality JSONB DEFAULT '[]', -- Array of personality traits
    brand_values JSONB DEFAULT '[]', -- Core values
    brand_messaging TEXT, -- Key messaging guidelines
    tone_of_voice TEXT, -- Tone guidelines
    
    -- Visual Style Guidelines
    image_style_preferences JSONB DEFAULT '{}', -- Preferred styles, filters, aesthetics
    do_not_use_elements JSONB DEFAULT '[]', -- Elements to avoid
    required_elements JSONB DEFAULT '[]', -- Elements that must be included
    
    -- Brand Assets Library
    asset_library JSONB DEFAULT '[]', -- References to brand assets (logos, icons, patterns)
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE, -- Default brand book for the company
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brand Assets table - stores individual brand assets (logos, icons, patterns, etc.)
CREATE TABLE IF NOT EXISTS brand_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_book_id UUID REFERENCES brand_books(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Asset Info
    asset_name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL, -- 'logo', 'icon', 'pattern', 'illustration', 'image', 'other'
    asset_category VARCHAR(100), -- 'primary', 'secondary', 'social', 'print', etc.
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- File Info
    file_url VARCHAR(500) NOT NULL,
    file_path VARCHAR(500), -- Server path
    file_type VARCHAR(50), -- MIME type
    file_size BIGINT, -- Bytes
    width INTEGER,
    height INTEGER,
    
    -- Usage Guidelines
    usage_guidelines TEXT, -- When/how to use this asset
    restrictions TEXT, -- Usage restrictions
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Additional metadata
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product/Service Images table - stores images for products and services
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES company_products(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Image Info
    image_name VARCHAR(255),
    image_type VARCHAR(50) DEFAULT 'product', -- 'product', 'lifestyle', 'detail', 'packaging', 'other'
    is_primary BOOLEAN DEFAULT FALSE, -- Primary product image
    sort_order INTEGER DEFAULT 0,
    
    -- File Info
    file_url VARCHAR(500) NOT NULL,
    file_path VARCHAR(500), -- Server path
    file_type VARCHAR(50), -- MIME type
    file_size BIGINT, -- Bytes
    width INTEGER,
    height INTEGER,
    
    -- Image Metadata
    alt_text TEXT, -- For accessibility
    caption TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Usage Tracking
    times_used INTEGER DEFAULT 0, -- How many times used in ads
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Additional metadata (colors, objects detected, etc.)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Uploaded Images table - stores user-uploaded images for ad creation
CREATE TABLE IF NOT EXISTS user_uploaded_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Image Info
    image_name VARCHAR(255) NOT NULL,
    image_category VARCHAR(50), -- 'ad_creative', 'background', 'product', 'lifestyle', 'other'
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- File Info
    file_url VARCHAR(500) NOT NULL,
    file_path VARCHAR(500), -- Server path
    file_type VARCHAR(50), -- MIME type
    file_size BIGINT, -- Bytes
    width INTEGER,
    height INTEGER,
    
    -- Original vs Edited
    original_image_id UUID REFERENCES user_uploaded_images(id) ON DELETE SET NULL, -- If this is an edited version
    is_edited BOOLEAN DEFAULT FALSE,
    edit_history JSONB DEFAULT '[]', -- History of edits applied
    
    -- Usage Tracking
    times_used INTEGER DEFAULT 0, -- How many times used in ads/campaigns
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Additional metadata
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Image Manipulation History table - tracks image edits
CREATE TABLE IF NOT EXISTS image_manipulation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id UUID NOT NULL, -- References user_uploaded_images or product_images
    image_type VARCHAR(50) NOT NULL, -- 'user_uploaded', 'product'
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Edit Info
    edit_type VARCHAR(50) NOT NULL, -- 'crop', 'resize', 'filter', 'text_overlay', 'adjust', 'composite'
    edit_config JSONB DEFAULT '{}', -- Configuration of the edit
    before_state JSONB DEFAULT '{}', -- State before edit
    after_state JSONB DEFAULT '{}', -- State after edit
    
    -- Result
    result_image_id UUID, -- ID of the resulting edited image
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_books_user_id ON brand_books(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_books_company_profile_id ON brand_books(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_brand_books_is_default ON brand_books(is_default) WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_brand_assets_brand_book_id ON brand_assets(brand_book_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_user_id ON brand_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_asset_type ON brand_assets(asset_type);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_user_id ON product_images(user_id);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(is_primary) WHERE is_primary = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_uploaded_images_user_id ON user_uploaded_images(user_id);
CREATE INDEX IF NOT EXISTS idx_user_uploaded_images_category ON user_uploaded_images(image_category);
CREATE INDEX IF NOT EXISTS idx_user_uploaded_images_original ON user_uploaded_images(original_image_id);

CREATE INDEX IF NOT EXISTS idx_image_manipulation_history_image_id ON image_manipulation_history(image_id);
CREATE INDEX IF NOT EXISTS idx_image_manipulation_history_user_id ON image_manipulation_history(user_id);

-- Add image_urls column to company_products if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_products' AND column_name = 'image_urls'
    ) THEN
        ALTER TABLE company_products ADD COLUMN image_urls TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_brand_book_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_brand_books_updated_at
    BEFORE UPDATE ON brand_books
    FOR EACH ROW
    EXECUTE FUNCTION update_brand_book_updated_at();

CREATE TRIGGER update_brand_assets_updated_at
    BEFORE UPDATE ON brand_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_brand_book_updated_at();

CREATE TRIGGER update_product_images_updated_at
    BEFORE UPDATE ON product_images
    FOR EACH ROW
    EXECUTE FUNCTION update_brand_book_updated_at();

CREATE TRIGGER update_user_uploaded_images_updated_at
    BEFORE UPDATE ON user_uploaded_images
    FOR EACH ROW
    EXECUTE FUNCTION update_brand_book_updated_at();

-- Comments for documentation
COMMENT ON TABLE brand_books IS 'Brand guidelines and visual identity management';
COMMENT ON TABLE brand_assets IS 'Individual brand assets (logos, icons, patterns)';
COMMENT ON TABLE product_images IS 'Images associated with products and services';
COMMENT ON TABLE user_uploaded_images IS 'User-uploaded images for ad creation and manipulation';
COMMENT ON TABLE image_manipulation_history IS 'History of image edits and manipulations';

