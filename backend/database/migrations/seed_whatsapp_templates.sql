-- WhatsApp Template Seed Data
-- These are example templates that users can use as starting points
-- Note: These need to be submitted to WhatsApp for approval before use
-- 
-- IMPORTANT: 
-- 1. Make sure the whatsapp_templates table exists (run add_whatsapp_tables.sql first)
-- 2. Update user_id values to match actual users in your database
-- 3. waba_id can be NULL initially and will be set when users connect their accounts

-- Check if table exists before inserting
DO $$
BEGIN
    -- Only insert if table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'whatsapp_templates'
    ) THEN
        -- Insert seed templates
        INSERT INTO whatsapp_templates (
            user_id,
            waba_id,
            template_name,
            category,
            language,
            body_text,
            footer_text,
            status,
            buttons,
            variables,
            created_at,
            updated_at
        ) VALUES
        -- Welcome Template
        (
            1, -- Replace with actual user_id
            NULL, -- Will be set when user connects their WABA
            'welcome_message',
            'MARKETING',
            'en',
            'Hello {{1}}! Welcome to {{2}}. We''re excited to have you on board. How can we help you today?',
            'Thank you for choosing us!',
            'draft',
            '[]'::jsonb, -- Empty buttons array
            '[]'::jsonb, -- Empty variables array
            NOW(),
            NOW()
        ),
        -- Order Confirmation
        (
            1,
            NULL,
            'order_confirmation',
            'UTILITY',
            'en',
            'Hi {{1}}, your order #{{2}} has been confirmed! Total: {{3}}. Expected delivery: {{4}}. Track your order: {{5}}',
            'Questions? Reply to this message.',
            'draft',
            '[]'::jsonb,
            '[]'::jsonb,
            NOW(),
            NOW()
        ),
        -- Appointment Reminder
        (
            1,
            NULL,
            'appointment_reminder',
            'UTILITY',
            'en',
            'Reminder: You have an appointment with {{1}} on {{2}} at {{3}}. Location: {{4}}. Reply CONFIRM to confirm or RESCHEDULE to reschedule.',
            'We look forward to seeing you!',
            'draft',
            '[]'::jsonb,
            '[]'::jsonb,
            NOW(),
            NOW()
        ),
        -- Payment Reminder
        (
            1,
            NULL,
            'payment_reminder',
            'UTILITY',
            'en',
            'Hi {{1}}, this is a friendly reminder that your payment of {{2}} for invoice #{{3}} is due on {{4}}. Pay now: {{5}}',
            'Thank you for your business!',
            'draft',
            '[]'::jsonb,
            '[]'::jsonb,
            NOW(),
            NOW()
        ),
        -- Product Launch
        (
            1,
            NULL,
            'product_launch',
            'MARKETING',
            'en',
            '🎉 Exciting news! We''ve just launched {{1}}! {{2}} Get yours now with {{3}} off: {{4}}',
            'Limited time offer!',
            'draft',
            '[]'::jsonb,
            '[]'::jsonb,
            NOW(),
            NOW()
        ),
        -- Customer Support
        (
            1,
            NULL,
            'support_response',
            'UTILITY',
            'en',
            'Hi {{1}}, thank you for contacting us. Your ticket #{{2}} has been received. Our team will respond within {{3}}. In the meantime, you can check our FAQ: {{4}}',
            'We''re here to help!',
            'draft',
            '[]'::jsonb,
            '[]'::jsonb,
            NOW(),
            NOW()
        ),
        -- Newsletter/Update
        (
            1,
            NULL,
            'newsletter_update',
            'MARKETING',
            'en',
            '📰 {{1}} Newsletter - {{2}} Check out our latest updates: {{3}} Read more: {{4}}',
            'Stay connected with us!',
            'draft',
            '[]'::jsonb,
            '[]'::jsonb,
            NOW(),
            NOW()
        ),
        -- Event Invitation
        (
            1,
            NULL,
            'event_invitation',
            'MARKETING',
            'en',
            'You''re invited! 🎉 Join us for {{1}} on {{2}} at {{3}}. RSVP: {{4}} We hope to see you there!',
            'Looking forward to seeing you!',
            'draft',
            '[]'::jsonb,
            '[]'::jsonb,
            NOW(),
            NOW()
        ),
        -- Shipping Notification
        (
            1,
            NULL,
            'shipping_notification',
            'UTILITY',
            'en',
            'Great news! Your order #{{1}} has been shipped. Tracking number: {{2}} Track here: {{3}} Expected delivery: {{4}}',
            'Thank you for your order!',
            'draft',
            '[]'::jsonb,
            '[]'::jsonb,
            NOW(),
            NOW()
        ),
        -- Feedback Request
        (
            1,
            NULL,
            'feedback_request',
            'MARKETING',
            'en',
            'Hi {{1}}, we''d love to hear about your experience with {{2}}! Please take a moment to share your feedback: {{3}}',
            'Your opinion matters to us!',
            'draft',
            '[]'::jsonb,
            '[]'::jsonb,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id, template_name, language) DO NOTHING; -- Prevent duplicates
        
        RAISE NOTICE 'WhatsApp template seed data inserted successfully';
    ELSE
        RAISE NOTICE 'Table whatsapp_templates does not exist. Please run add_whatsapp_tables.sql first.';
    END IF;
END $$;

-- Notes:
-- 1. Buttons can be added later via the API or template builder UI
-- 2. Example button structures:
--    - Quick Reply: {"type": "QUICK_REPLY", "text": "Yes"}
--    - URL: {"type": "URL", "text": "Visit Website", "url": "https://example.com"}
--    - Phone: {"type": "PHONE_NUMBER", "text": "Call Us", "phoneNumber": "+1234567890"}
-- 3. Variables are automatically detected from {{1}}, {{2}}, etc. in body_text
-- 4. These templates are in 'draft' status and need to be submitted to WhatsApp for approval
