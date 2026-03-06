/**
 * Visitor Intelligence - Pricing Configuration
 * Adds credit costs for visitor intelligence operations
 * Date: January 1, 2025
 */

-- Insert pricing for Visitor Intelligence
INSERT INTO service_pricing (
  service_key,
  service_name,
  category,
  credit_cost,
  billing_unit,
  rate,
  description
) VALUES
  -- Visitor Tracking (free for basic tracking)
  ('visitor_track', 'Track Visitor', 'sales', 0, 'flat', 0, 'Track website visitor (basic tracking is free)'),
  ('visitor_track_session', 'Track Session', 'sales', 0, 'flat', 0, 'Track visitor session (free)'),
  ('visitor_track_pageview', 'Track Page View', 'sales', 0, 'flat', 0, 'Track page view (free)'),
  ('visitor_track_event', 'Track Event', 'sales', 0, 'flat', 0, 'Track visitor event (free)'),
  
  -- Visitor Management
  ('visitor_enrich', 'Enrich Visitor Data', 'sales', 10, 'flat', 10, 'Enrich visitor data with company information'),
  ('visitor_convert_to_lead', 'Convert Visitor to Lead', 'sales', 5, 'flat', 5, 'Convert high-scoring visitor to lead'),
  ('visitor_get_analytics', 'Get Visitor Analytics', 'sales', 2, 'flat', 2, 'Get visitor analytics and insights')
ON CONFLICT (service_key) DO UPDATE
  SET 
    service_name = EXCLUDED.service_name,
    category = EXCLUDED.category,
    credit_cost = EXCLUDED.credit_cost,
    billing_unit = EXCLUDED.billing_unit,
    rate = EXCLUDED.rate,
    description = EXCLUDED.description,
    updated_at = NOW();

