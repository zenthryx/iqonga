-- Create content_templates table for storing company-specific content templates
CREATE TABLE IF NOT EXISTS content_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(100) NOT NULL, -- 'post', 'reply', 'thread', 'announcement'
    content_template TEXT NOT NULL,
    variables JSONB DEFAULT '{}', -- Template variables like {company_name}, {product_name}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_templates_user_id ON content_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_content_templates_type ON content_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_content_templates_active ON content_templates(is_active);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_content_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_content_templates_updated_at 
    BEFORE UPDATE ON content_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_content_templates_updated_at();

-- Insert some default templates for common use cases
INSERT INTO content_templates (user_id, template_name, template_type, content_template, variables) VALUES
(1, 'Product Announcement', 'announcement', '🚀 Exciting news! We just launched {product_name}! {product_description} Check it out at {website_url} #ProductLaunch #Innovation', '{"product_name": "string", "product_description": "string", "website_url": "string"}'),
(1, 'Industry Insight', 'post', '💡 {industry_insight} This is why {company_name} is leading the way in {industry}. What do you think? #IndustryInsights #Innovation', '{"industry_insight": "string", "company_name": "string", "industry": "string"}'),
(1, 'Customer Success', 'post', '🎉 Another success story! {customer_name} achieved {achievement} using {product_name}. This is what drives us at {company_name}! #CustomerSuccess #Results', '{"customer_name": "string", "achievement": "string", "product_name": "string", "company_name": "string"}'),
(1, 'Company Update', 'post', '📢 {company_name} update: {update_message} Stay tuned for more exciting developments! #CompanyUpdate #Growth', '{"company_name": "string", "update_message": "string"}'),
(1, 'Helpful Reply', 'reply', 'Thanks for asking! {helpful_response} At {company_name}, we believe in {key_message}. Let me know if you need more info!', '{"helpful_response": "string", "company_name": "string", "key_message": "string"}');
