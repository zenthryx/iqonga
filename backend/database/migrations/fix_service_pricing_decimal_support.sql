-- Migration: Fix service_pricing table to support decimal credit costs
-- Created: 2025-12-14
-- Description: Change credit_cost from INTEGER to DECIMAL to support fractional credit costs (e.g., 0.1 credits)

-- Change credit_cost column from INTEGER to DECIMAL
ALTER TABLE service_pricing 
ALTER COLUMN credit_cost TYPE DECIMAL(10, 4) USING credit_cost::DECIMAL(10, 4);

-- Ensure rate column is also DECIMAL (it should already be, but make sure)
ALTER TABLE service_pricing 
ALTER COLUMN rate TYPE DECIMAL(10, 4) USING rate::DECIMAL(10, 4);

-- Add comment for documentation
COMMENT ON COLUMN service_pricing.credit_cost IS 'Credit cost for the service (supports decimal values like 0.1)';
COMMENT ON COLUMN service_pricing.rate IS 'Rate for per-second/per-minute billing (supports decimal values)';

