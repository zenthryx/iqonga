-- Migration: Add page template support to eBook chapters
-- This allows chapters to use predefined page templates for structured layouts

-- Add template fields to ebook_chapters table
ALTER TABLE ebook_chapters
ADD COLUMN IF NOT EXISTS page_template VARCHAR(50) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS template_config JSONB DEFAULT '{}';

-- Create ebook_page_templates table for template definitions
CREATE TABLE IF NOT EXISTS ebook_page_templates (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'text', 'image', 'video', 'mixed', 'catalog', 'training'
  layout_type VARCHAR(50) NOT NULL, -- 'standard', 'image_1', 'image_2', 'image_3', 'video', 'split', 'gallery'
  preview_image_url VARCHAR(500),
  template_structure JSONB NOT NULL, -- Defines the layout structure
  default_styles JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default page templates
INSERT INTO ebook_page_templates (id, name, description, category, layout_type, template_structure, default_styles) VALUES
-- Standard text-only template
('standard', 'Standard Text', 'Traditional text-only page layout', 'text', 'standard', 
 '{"sections": [{"type": "text", "width": "100%"}]}', 
 '{"fontSize": "16px", "lineHeight": "1.8", "fontFamily": "serif"}'),

-- Single image templates
('image_1_top', 'Image Top', 'Single image at the top with text below', 'image', 'image_1',
 '{"sections": [{"type": "image", "width": "100%", "position": "top"}, {"type": "text", "width": "100%"}]}',
 '{"imageHeight": "300px", "imageAlign": "center"}'),

('image_1_bottom', 'Image Bottom', 'Text at the top with single image below', 'image', 'image_1',
 '{"sections": [{"type": "text", "width": "100%"}, {"type": "image", "width": "100%", "position": "bottom"}]}',
 '{"imageHeight": "300px", "imageAlign": "center"}'),

('image_1_left', 'Image Left', 'Image on the left with text on the right', 'image', 'image_1',
 '{"sections": [{"type": "image", "width": "40%", "position": "left", "float": true}, {"type": "text", "width": "58%", "position": "right"}]}',
 '{"imageHeight": "auto", "imageAlign": "left"}'),

('image_1_right', 'Image Right', 'Text on the left with image on the right', 'image', 'image_1',
 '{"sections": [{"type": "text", "width": "58%", "position": "left"}, {"type": "image", "width": "40%", "position": "right", "float": true}]}',
 '{"imageHeight": "auto", "imageAlign": "right"}'),

-- Two image templates
('image_2_side', 'Two Images Side by Side', 'Two images displayed side by side', 'image', 'image_2',
 '{"sections": [{"type": "image", "width": "48%", "position": "left"}, {"type": "image", "width": "48%", "position": "right"}, {"type": "text", "width": "100%"}]}',
 '{"imageHeight": "250px", "imageAlign": "center", "gap": "4%"}'),

('image_2_stack', 'Two Images Stacked', 'Two images stacked vertically', 'image', 'image_2',
 '{"sections": [{"type": "image", "width": "100%"}, {"type": "image", "width": "100%"}, {"type": "text", "width": "100%"}]}',
 '{"imageHeight": "250px", "imageAlign": "center"}'),

-- Three image templates
('image_3_grid', 'Three Images Grid', 'Three images in a grid layout', 'image', 'image_3',
 '{"sections": [{"type": "image", "width": "32%", "position": "left"}, {"type": "image", "width": "32%", "position": "center"}, {"type": "image", "width": "32%", "position": "right"}, {"type": "text", "width": "100%"}]}',
 '{"imageHeight": "200px", "imageAlign": "center", "gap": "2%"}'),

-- Video templates
('video_standard', 'Video Embed', 'Embedded video with text above and below', 'video', 'video',
 '{"sections": [{"type": "text", "width": "100%"}, {"type": "video", "width": "100%", "aspectRatio": "16:9"}, {"type": "text", "width": "100%"}]}',
 '{"videoHeight": "400px", "videoAlign": "center"}'),

('video_full', 'Full Width Video', 'Full-width video section', 'video', 'video',
 '{"sections": [{"type": "video", "width": "100%", "aspectRatio": "16:9"}]}',
 '{"videoHeight": "500px", "videoAlign": "center"}'),

-- Mixed/Catalog templates
('catalog_item', 'Catalog Item', 'Product/item showcase with image and details', 'catalog', 'mixed',
 '{"sections": [{"type": "image", "width": "40%", "position": "left"}, {"type": "text", "width": "58%", "position": "right", "fields": ["title", "description", "price", "specs"]}]}',
 '{"imageHeight": "300px", "fontSize": "14px"}'),

('training_step', 'Training Step', 'Step-by-step training layout with image and instructions', 'training', 'mixed',
 '{"sections": [{"type": "text", "width": "100%", "fields": ["step_number", "title"]}, {"type": "image", "width": "100%"}, {"type": "text", "width": "100%", "fields": ["instructions"]}]}',
 '{"imageHeight": "350px", "stepNumberStyle": "bold"}'),

-- Gallery template
('gallery_grid', 'Image Gallery', 'Multiple images in a gallery grid', 'image', 'gallery',
 '{"sections": [{"type": "gallery", "columns": 3, "images": []}]}',
 '{"imageHeight": "200px", "gap": "10px"}'),

-- Split layout
('split_text', 'Split Text', 'Two-column text layout', 'text', 'split',
 '{"sections": [{"type": "text", "width": "48%", "position": "left"}, {"type": "text", "width": "48%", "position": "right"}]}',
 '{"fontSize": "15px", "lineHeight": "1.6"}')

ON CONFLICT (id) DO NOTHING;

-- Create index for faster template lookups
CREATE INDEX IF NOT EXISTS idx_ebook_page_templates_category ON ebook_page_templates(category);
CREATE INDEX IF NOT EXISTS idx_ebook_page_templates_layout ON ebook_page_templates(layout_type);
CREATE INDEX IF NOT EXISTS idx_ebook_chapters_template ON ebook_chapters(page_template);

