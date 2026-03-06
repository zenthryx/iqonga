-- ==========================================
-- Sales Analytics Views Migration (FIXED)
-- Date: December 31, 2025
-- Purpose: Add materialized views for fast analytics queries
-- ==========================================

-- ==========================================
-- 1. SALES ANALYTICS SUMMARY (Materialized View)
-- ==========================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS sales_analytics_summary CASCADE;

-- Create materialized view for fast dashboard queries
CREATE MATERIALIZED VIEW sales_analytics_summary AS
SELECT 
    l.user_id,
    
    -- Lead metrics
    COUNT(DISTINCT l.id) as total_leads,
    COUNT(DISTINCT CASE WHEN l.is_qualified = true THEN l.id END) as qualified_leads,
    COUNT(DISTINCT CASE WHEN l.stage = 'lead' THEN l.id END) as new_leads,
    COUNT(DISTINCT CASE WHEN l.stage = 'opportunity' THEN l.id END) as opportunities,
    AVG(l.lead_score) as avg_lead_score,
    
    -- Deal metrics
    (SELECT COUNT(*) FROM deals WHERE user_id = l.user_id) as total_deals,
    (SELECT COUNT(*) FROM deals WHERE user_id = l.user_id AND status = 'closed_won') as won_deals,
    (SELECT COUNT(*) FROM deals WHERE user_id = l.user_id AND status = 'closed_lost') as lost_deals,
    (SELECT COUNT(*) FROM deals WHERE user_id = l.user_id AND status NOT IN ('closed_won', 'closed_lost')) as active_deals,
    
    -- Pipeline value
    (SELECT COALESCE(SUM(amount), 0) FROM deals WHERE user_id = l.user_id AND status NOT IN ('closed_won', 'closed_lost')) as pipeline_value,
    (SELECT COALESCE(SUM(amount), 0) FROM deals WHERE user_id = l.user_id AND status = 'closed_won') as won_revenue,
    
    -- Close rate calculation
    CASE 
        WHEN (SELECT COUNT(*) FROM deals WHERE user_id = l.user_id AND status IN ('closed_won', 'closed_lost')) > 0
        THEN (SELECT COUNT(*) FROM deals WHERE user_id = l.user_id AND status = 'closed_won')::FLOAT / 
             (SELECT COUNT(*) FROM deals WHERE user_id = l.user_id AND status IN ('closed_won', 'closed_lost'))::FLOAT * 100
        ELSE 0
    END as close_rate,
    
    -- Activity metrics
    (SELECT COUNT(*) FROM activities WHERE user_id = l.user_id) as total_activities,
    (SELECT COUNT(*) FROM activities WHERE user_id = l.user_id AND is_completed = true) as completed_activities,
    
    -- Last updated
    NOW() as last_refreshed
    
FROM leads l
GROUP BY l.user_id;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_sales_analytics_summary_user_id ON sales_analytics_summary(user_id);

-- ==========================================
-- 2. REFRESH FUNCTION
-- ==========================================

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_sales_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY sales_analytics_summary;
    RAISE NOTICE 'Sales analytics summary refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 3. LEAD SOURCE SUMMARY VIEW (Regular View)
-- ==========================================

-- This is a regular view (not materialized) for real-time lead source data
CREATE OR REPLACE VIEW lead_source_summary AS
SELECT 
    l.user_id,
    l.source,
    COUNT(l.id) as lead_count,
    COUNT(CASE WHEN l.is_qualified = true THEN 1 END) as qualified_count,
    COUNT(d.id) as converted_count,
    COALESCE(SUM(CASE WHEN d.status = 'closed_won' THEN d.amount ELSE 0 END), 0) as total_revenue,
    
    -- Qualification rate
    CASE 
        WHEN COUNT(l.id) > 0 
        THEN (COUNT(CASE WHEN l.is_qualified = true THEN 1 END)::FLOAT / COUNT(l.id)::FLOAT * 100)
        ELSE 0
    END as qualification_rate,
    
    -- Conversion rate
    CASE 
        WHEN COUNT(l.id) > 0 
        THEN (COUNT(d.id)::FLOAT / COUNT(l.id)::FLOAT * 100)
        ELSE 0
    END as conversion_rate
    
FROM leads l
LEFT JOIN deals d ON l.id = d.lead_id
GROUP BY l.user_id, l.source;

-- ==========================================
-- 4. SALES VELOCITY VIEW (Regular View) - FIXED
-- ==========================================

-- View for calculating sales velocity metrics
-- FIXED: Use actual_close_date instead of close_date
CREATE OR REPLACE VIEW sales_velocity_summary AS
SELECT 
    d.user_id,
    COUNT(*) as closed_deals,
    AVG(EXTRACT(DAY FROM (d.actual_close_date - l.created_at))) as avg_days_to_close,
    MIN(EXTRACT(DAY FROM (d.actual_close_date - l.created_at))) as fastest_close,
    MAX(EXTRACT(DAY FROM (d.actual_close_date - l.created_at))) as slowest_close,
    AVG(d.amount) as avg_deal_size,
    SUM(d.amount) as total_revenue
FROM deals d
JOIN leads l ON d.lead_id = l.id
WHERE d.status = 'closed_won' AND d.actual_close_date IS NOT NULL
GROUP BY d.user_id;

-- ==========================================
-- 5. SCHEDULED REFRESH (OPTIONAL)
-- ==========================================

-- You can set up a cron job or pg_cron extension to refresh automatically
-- Example: Refresh every hour
-- SELECT cron.schedule('refresh-sales-analytics', '0 * * * *', 'SELECT refresh_sales_analytics()');

-- For now, you can manually refresh by calling:
-- SELECT refresh_sales_analytics();

-- ==========================================
-- INITIAL REFRESH
-- ==========================================

-- Perform initial refresh of materialized view
SELECT refresh_sales_analytics();

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================

-- Summary
SELECT 
    'Sales analytics views created!' as message,
    (SELECT COUNT(*) FROM sales_analytics_summary) as users_with_data,
    (SELECT MAX(last_refreshed) FROM sales_analytics_summary) as last_refreshed,
    NOW() as completed_at;

