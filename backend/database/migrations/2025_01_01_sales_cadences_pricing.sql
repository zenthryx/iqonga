/**
 * Sales Cadences - Pricing Configuration
 * Adds credit costs for sales cadence operations
 * Date: January 1, 2025
 */

-- Insert pricing for Sales Cadences
INSERT INTO service_pricing (
  service_key,
  service_name,
  category,
  credit_cost,
  billing_unit,
  rate,
  description
) VALUES
  -- Cadence Management
  ('sales_cadence_create', 'Create Sales Cadence', 'sales', 10, 'flat', 10, 'Create new sales cadence/sequence'),
  ('sales_cadence_update', 'Update Sales Cadence', 'sales', 5, 'flat', 5, 'Update cadence configuration'),
  ('sales_cadence_delete', 'Delete Sales Cadence', 'sales', 2, 'flat', 2, 'Delete a sales cadence'),
  
  -- Step Management
  ('sales_cadence_add_step', 'Add Cadence Step', 'sales', 3, 'flat', 3, 'Add step to sales cadence'),
  ('sales_cadence_update_step', 'Update Cadence Step', 'sales', 2, 'flat', 2, 'Update cadence step configuration'),
  ('sales_cadence_delete_step', 'Delete Cadence Step', 'sales', 1, 'flat', 1, 'Delete step from cadence'),
  
  -- Enrollment
  ('sales_cadence_enroll', 'Enroll Lead in Cadence', 'sales', 5, 'flat', 5, 'Enroll lead/deal in sales cadence'),
  
  -- Execution (per step execution - credits deducted when step executes)
  ('sales_cadence_execute_email', 'Execute Email Step', 'sales', 5, 'flat', 5, 'Execute email step in cadence (includes email send cost)'),
  ('sales_cadence_execute_task', 'Execute Task Step', 'sales', 2, 'flat', 2, 'Execute task step in cadence'),
  ('sales_cadence_execute_wait', 'Execute Wait Step', 'sales', 0, 'flat', 0, 'Execute wait step (no cost)')
ON CONFLICT (service_key) DO UPDATE
  SET 
    service_name = EXCLUDED.service_name,
    category = EXCLUDED.category,
    credit_cost = EXCLUDED.credit_cost,
    billing_unit = EXCLUDED.billing_unit,
    rate = EXCLUDED.rate,
    description = EXCLUDED.description,
    updated_at = NOW();

