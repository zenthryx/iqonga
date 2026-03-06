-- Update existing content_templates table to match new requirements
-- This script adds missing columns and updates existing ones

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_templates' AND column_name = 'user_id') THEN
        ALTER TABLE content_templates ADD COLUMN user_id INTEGER;
    END IF;
    
    -- Add template_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_templates' AND column_name = 'template_name') THEN
        ALTER TABLE content_templates ADD COLUMN template_name VARCHAR(255);
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_templates' AND column_name = 'is_active') THEN
        ALTER TABLE content_templates ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_templates' AND column_name = 'updated_at') THEN
        ALTER TABLE content_templates ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Rename template_content to content_template if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_templates' AND column_name = 'template_content') THEN
        ALTER TABLE content_templates RENAME COLUMN template_content TO content_template;
    END IF;
    
END $$;

-- Update user_id based on company_profile_id if user_id is null
UPDATE content_templates 
SET user_id = (
    SELECT user_id 
    FROM company_profiles 
    WHERE company_profiles.id = content_templates.company_profile_id
)
WHERE user_id IS NULL AND company_profile_id IS NOT NULL;

-- Add foreign key constraint for user_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'content_templates_user_id_fkey'
    ) THEN
        ALTER TABLE content_templates 
        ADD CONSTRAINT content_templates_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_content_templates_user_id ON content_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_content_templates_active ON content_templates(is_active);

-- Insert default templates for user_id = 1 (adjust as needed)
INSERT INTO content_templates (
    user_id, 
    template_name, 
    template_type, 
    content_template, 
    variables, 
    is_active
) VALUES
(1, 'Product Announcement', 'announcement', '🚀 Exciting news! We just launched {product_name}! {product_description} Check it out at {website_url} #ProductLaunch #Innovation', '{"product_name": "string", "product_description": "string", "website_url": "string"}', true),
(1, 'Industry Insight', 'post', '💡 {industry_insight} This is why {company_name} is leading the way in {industry}. What do you think? #IndustryInsights #Innovation', '{"industry_insight": "string", "company_name": "string", "industry": "string"}', true),
(1, 'Customer Success', 'post', '🎉 Another success story! {customer_name} achieved {achievement} using {product_name}. This is what drives us at {company_name}! #CustomerSuccess #Results', '{"customer_name": "string", "achievement": "string", "product_name": "string", "company_name": "string"}', true),
(1, 'Company Update', 'post', '📢 {company_name} update: {update_message} Stay tuned for more exciting developments! #CompanyUpdate #Growth', '{"company_name": "string", "update_message": "string"}', true),
(1, 'Helpful Reply', 'reply', 'Thanks for asking! {helpful_response} At {company_name}, we believe in {key_message}. Let me know if you need more info!', '{"helpful_response": "string", "company_name": "string", "key_message": "string"}', true)
ON CONFLICT (id) DO NOTHING;

-- Update existing records to have proper template names if they don't have them
UPDATE content_templates 
SET template_name = CASE 
    WHEN template_type = 'announcement' THEN 'Product Announcement'
    WHEN template_type = 'post' THEN 'Industry Insight'
    WHEN template_type = 'reply' THEN 'Helpful Reply'
    ELSE 'Custom Template'
END
WHERE template_name IS NULL;

-- Set is_active to true for existing records if it's null
UPDATE content_templates 
SET is_active = true 
WHERE is_active IS NULL;
