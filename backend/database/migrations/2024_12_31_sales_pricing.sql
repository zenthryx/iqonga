/**
 * Sales Functions - Pricing Configuration
 * Adds credit costs for all sales-related operations
 * Date: December 31, 2024
 */

-- Insert pricing for Sales & CRM functions
INSERT INTO service_pricing (
  service_key,
  service_name,
  category,
  credit_cost,
  billing_unit,
  rate,
  description
) VALUES
  -- Lead Management
  ('sales_lead_create', 'Create Lead', 'sales', 5, 'flat', 5, 'Create new sales lead (manual entry)'),
  ('sales_lead_enrich', 'AI Lead Enrichment', 'sales', 20, 'flat', 20, 'Enrich lead data using AI and external APIs'),
  ('sales_lead_update', 'Update Lead', 'sales', 2, 'flat', 2, 'Update existing lead information'),
  ('sales_lead_delete', 'Delete Lead', 'sales', 1, 'flat', 1, 'Delete a lead from system'),
  ('sales_lead_convert', 'Convert Lead to Deal', 'sales', 8, 'flat', 8, 'Convert qualified lead to deal'),
  
  -- Deal/Pipeline Management
  ('sales_deal_create', 'Create Deal', 'sales', 5, 'flat', 5, 'Create new sales deal'),
  ('sales_deal_update', 'Update Deal', 'sales', 2, 'flat', 2, 'Update deal information'),
  ('sales_deal_close', 'Close Deal', 'sales', 10, 'flat', 10, 'Close deal (won/lost)'),
  
  -- Email Management
  ('sales_email_basic', 'Send Basic Email', 'sales', 5, 'flat', 5, 'Send untracked email'),
  ('sales_email_tracked', 'Send Tracked Email', 'sales', 10, 'flat', 10, 'Send email with open/click tracking'),
  ('sales_email_ai_generate', 'AI Email Generation', 'sales', 30, 'flat', 30, 'Generate personalized email using AI'),
  ('sales_email_ai_subject', 'AI Subject Line', 'sales', 10, 'flat', 10, 'Generate email subject line using AI'),
  
  -- Meeting & Calendar
  ('sales_meeting_schedule', 'Schedule Meeting', 'sales', 8, 'flat', 8, 'Schedule calendar meeting with Google Calendar integration'),
  ('sales_meeting_notes_ai', 'AI Meeting Notes', 'sales', 25, 'flat', 25, 'AI-generated meeting notes and action items'),
  
  -- Lead Scoring
  ('sales_lead_score_auto', 'Automatic Lead Scoring', 'sales', 3, 'flat', 3, 'Calculate lead score based on rules'),
  ('sales_lead_score_ai', 'AI Lead Scoring', 'sales', 15, 'flat', 15, 'AI-powered lead quality prediction'),
  ('sales_lead_duplicate_check', 'Duplicate Check', 'sales', 2, 'flat', 2, 'Check for duplicate leads'),
  
  -- AI Insights & Analytics
  ('sales_ai_insights_lead', 'AI Lead Insights', 'sales', 25, 'flat', 25, 'AI analysis of lead data and recommendations'),
  ('sales_ai_insights_deal', 'AI Deal Insights', 'sales', 30, 'flat', 30, 'AI deal win probability and risk analysis'),
  ('sales_ai_next_action', 'AI Next Best Action', 'sales', 20, 'flat', 20, 'AI recommendation for next action'),
  ('sales_ai_forecast', 'AI Sales Forecast', 'sales', 40, 'flat', 40, 'AI-powered revenue forecasting'),
  
  -- Reporting & Analytics
  ('sales_analytics_view', 'Advanced Analytics Access', 'sales', 10, 'daily', 10, 'Access advanced analytics dashboard (charged once per day)'),
  ('sales_report_export_csv', 'Export Report (CSV)', 'sales', 15, 'flat', 15, 'Export sales report to CSV format'),
  ('sales_report_export_pdf', 'Export Report (PDF)', 'sales', 20, 'flat', 20, 'Export sales report to PDF format'),
  ('sales_report_custom', 'Custom Report Generation', 'sales', 25, 'flat', 25, 'Generate custom analytics report'),
  
  -- Bulk Operations
  ('sales_bulk_assign', 'Bulk Assign', 'sales', 2, 'per_item', 2, 'Bulk assign leads/deals (per item)'),
  ('sales_bulk_update', 'Bulk Update', 'sales', 2, 'per_item', 2, 'Bulk update leads/deals (per item)'),
  ('sales_bulk_delete', 'Bulk Delete', 'sales', 1, 'per_item', 1, 'Bulk delete leads/deals (per item)'),
  ('sales_bulk_export', 'Bulk Export', 'sales', 10, 'flat', 10, 'Bulk export selected items'),
  
  -- Activity Tracking
  ('sales_activity_log', 'Log Activity', 'sales', 2, 'flat', 2, 'Log email, call, meeting, or task'),
  ('sales_activity_update', 'Update Activity', 'sales', 1, 'flat', 1, 'Update activity record'),
  ('sales_activity_complete', 'Complete Activity', 'sales', 1, 'flat', 1, 'Mark activity as complete')

ON CONFLICT (service_key) DO UPDATE
  SET 
    service_name = EXCLUDED.service_name,
    category = EXCLUDED.category,
    credit_cost = EXCLUDED.credit_cost,
    billing_unit = EXCLUDED.billing_unit,
    rate = EXCLUDED.rate,
    description = EXCLUDED.description;

-- Summary comment
COMMENT ON TABLE service_pricing IS 'Pricing configuration for all platform services including Sales & CRM functions';

-- Display pricing summary
SELECT 
  category,
  COUNT(*) as service_count,
  SUM(credit_cost) as total_credits,
  AVG(credit_cost) as avg_credits_per_service
FROM service_pricing
WHERE category = 'sales'
GROUP BY category;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Sales pricing configuration complete!';
  RAISE NOTICE '📊 %s sales services added', (SELECT COUNT(*) FROM service_pricing WHERE category = 'sales');
  RAISE NOTICE '💰 Average cost: %s credits', (SELECT ROUND(AVG(credit_cost), 2) FROM service_pricing WHERE category = 'sales');
END $$;

