-- ====================================
-- Sample Data for Sales Functions Testing
-- Run this AFTER the main migration
-- ====================================

-- Get the user ID (replace with your actual user ID)
-- You can find it by running: SELECT id FROM users LIMIT 1;
DO $$
DECLARE
    test_user_id INTEGER;
    lead1_id UUID;
    lead2_id UUID;
    lead3_id UUID;
    deal1_id UUID;
    deal2_id UUID;
BEGIN
    -- Get first user ID (or create test user)
    SELECT id INTO test_user_id FROM users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found. Please create a user first.';
    END IF;

    RAISE NOTICE 'Using user ID: %', test_user_id;

    -- ====================================
    -- INSERT SAMPLE LEADS
    -- ====================================
    
    -- Lead 1: Qualified lead from website
    INSERT INTO leads (
        user_id,
        first_name,
        last_name,
        email,
        phone,
        company_name,
        job_title,
        source,
        status,
        is_qualified,
        lead_score,
        has_budget,
        has_authority,
        has_need,
        timeline,
        company_size,
        industry
    ) VALUES (
        test_user_id,
        'Sarah',
        'Johnson',
        'sarah.johnson@techcorp.com',
        '+1-555-0123',
        'TechCorp Solutions',
        'VP of Marketing',
        'website',
        'qualified',
        true,
        85,
        true,
        true,
        true,
        '1-3_months',
        '51-200',
        'Technology'
    ) RETURNING id INTO lead1_id;

    -- Lead 2: New lead from LinkedIn
    INSERT INTO leads (
        user_id,
        first_name,
        last_name,
        email,
        phone,
        company_name,
        job_title,
        source,
        status,
        lead_score,
        company_size,
        industry
    ) VALUES (
        test_user_id,
        'Michael',
        'Chen',
        'michael.chen@innovate.io',
        '+1-555-0124',
        'Innovate Inc',
        'CTO',
        'linkedin',
        'new',
        65,
        '11-50',
        'Software'
    ) RETURNING id INTO lead2_id;

    -- Lead 3: Contacted lead from referral
    INSERT INTO leads (
        user_id,
        first_name,
        last_name,
        email,
        company_name,
        job_title,
        source,
        status,
        lead_score,
        has_need,
        timeline,
        industry
    ) VALUES (
        test_user_id,
        'Emily',
        'Rodriguez',
        'emily@startup.com',
        'StartupXYZ',
        'Founder',
        'referral',
        'contacted',
        72,
        true,
        '3-6_months',
        'Crypto'
    ) RETURNING id INTO lead3_id;

    RAISE NOTICE 'Created 3 sample leads';

    -- ====================================
    -- INSERT SAMPLE DEALS
    -- ====================================
    
    -- Deal 1: In proposal stage
    INSERT INTO deals (
        user_id,
        lead_id,
        deal_name,
        description,
        amount,
        currency,
        pipeline,
        stage,
        win_probability,
        expected_close_date,
        status,
        source,
        contact_name,
        contact_email,
        company_name
    ) VALUES (
        test_user_id,
        lead1_id,
        'TechCorp - Marketing Platform',
        'Implement AI-powered marketing automation platform',
        50000,
        'USD',
        'default',
        'proposal',
        60,
        CURRENT_DATE + INTERVAL '30 days',
        'open',
        'inbound',
        'Sarah Johnson',
        'sarah.johnson@techcorp.com',
        'TechCorp Solutions'
    ) RETURNING id INTO deal1_id;

    -- Deal 2: In meeting stage
    INSERT INTO deals (
        user_id,
        lead_id,
        deal_name,
        description,
        amount,
        currency,
        pipeline,
        stage,
        win_probability,
        expected_close_date,
        status,
        source,
        contact_name,
        contact_email,
        company_name
    ) VALUES (
        test_user_id,
        lead2_id,
        'Innovate Inc - AI Agents',
        'Deploy 3 AI agents for customer support',
        35000,
        'USD',
        'default',
        'meeting',
        40,
        CURRENT_DATE + INTERVAL '45 days',
        'open',
        'outbound',
        'Michael Chen',
        'michael.chen@innovate.io',
        'Innovate Inc'
    ) RETURNING id INTO deal2_id;

    RAISE NOTICE 'Created 2 sample deals';

    -- ====================================
    -- INSERT SAMPLE ACTIVITIES
    -- ====================================
    
    -- Activity 1: Email sent to lead 1
    INSERT INTO activities (
        user_id,
        lead_id,
        activity_type,
        subject,
        description,
        is_completed,
        completed_at
    ) VALUES (
        test_user_id,
        lead1_id,
        'email_sent',
        'Follow-up on proposal',
        'Sent detailed proposal document with pricing',
        true,
        NOW() - INTERVAL '2 days'
    );

    -- Activity 2: Call with lead 1
    INSERT INTO activities (
        user_id,
        lead_id,
        deal_id,
        activity_type,
        subject,
        description,
        outcome,
        duration_minutes,
        call_direction,
        is_completed,
        completed_at
    ) VALUES (
        test_user_id,
        lead1_id,
        deal1_id,
        'call',
        'Discovery call',
        'Discussed requirements and timeline',
        'successful',
        45,
        'outbound',
        true,
        NOW() - INTERVAL '5 days'
    );

    -- Activity 3: Meeting scheduled with lead 2
    INSERT INTO activities (
        user_id,
        lead_id,
        deal_id,
        activity_type,
        subject,
        description,
        scheduled_at,
        is_completed
    ) VALUES (
        test_user_id,
        lead2_id,
        deal2_id,
        'meeting',
        'Product demo',
        'Demonstrate AI agent capabilities',
        CURRENT_DATE + INTERVAL '3 days' + TIME '14:00:00',
        false
    );

    -- Activity 4: Task - follow up
    INSERT INTO activities (
        user_id,
        lead_id,
        activity_type,
        subject,
        description,
        task_priority,
        task_due_date,
        is_completed
    ) VALUES (
        test_user_id,
        lead3_id,
        'task',
        'Send pricing information',
        'Prepare and send custom pricing proposal',
        'high',
        CURRENT_DATE + INTERVAL '2 days',
        false
    );

    -- Activity 5: LinkedIn message
    INSERT INTO activities (
        user_id,
        lead_id,
        activity_type,
        subject,
        description,
        is_completed,
        completed_at
    ) VALUES (
        test_user_id,
        lead2_id,
        'linkedin_message',
        'Connection request accepted',
        'Started conversation about AI automation needs',
        true,
        NOW() - INTERVAL '7 days'
    );

    RAISE NOTICE 'Created 5 sample activities';

    -- ====================================
    -- UPDATE LAST ACTIVITY DATES
    -- ====================================
    
    UPDATE leads SET last_activity_date = NOW() - INTERVAL '2 days' WHERE id = lead1_id;
    UPDATE leads SET last_activity_date = NOW() - INTERVAL '5 days' WHERE id = lead2_id;
    UPDATE leads SET last_activity_date = NOW() - INTERVAL '7 days' WHERE id = lead3_id;

    UPDATE deals SET last_activity_date = NOW() - INTERVAL '2 days' WHERE id = deal1_id;
    UPDATE deals SET last_activity_date = NOW() - INTERVAL '5 days' WHERE id = deal2_id;

    RAISE NOTICE '✅ Sample data inserted successfully!';
    RAISE NOTICE '📊 Dashboard: 3 leads, 2 deals, 5 activities';
    RAISE NOTICE '🎯 View at: /sales/dashboard';

END $$;

-- ====================================
-- VERIFY DATA
-- ====================================

-- Show summary
SELECT 
    'Leads' as entity,
    COUNT(*) as count
FROM leads
UNION ALL
SELECT 
    'Deals' as entity,
    COUNT(*) as count
FROM deals
UNION ALL
SELECT 
    'Activities' as entity,
    COUNT(*) as count
FROM activities;

-- Show leads summary
SELECT 
    first_name || ' ' || last_name as name,
    company_name,
    status,
    lead_score,
    source
FROM leads
ORDER BY created_at DESC;

-- Show deals summary
SELECT 
    deal_name,
    amount,
    stage,
    win_probability,
    status
FROM deals
ORDER BY created_at DESC;

