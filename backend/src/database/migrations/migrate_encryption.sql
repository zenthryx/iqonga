-- Migration to standardize encryption for all platform connection tokens
-- This script will decrypt existing tokens and re-encrypt them with the new method

-- First, let's see what we're working with
SELECT 
  id,
  user_id,
  platform,
  connection_status,
  LENGTH(access_token) as access_token_length,
  LENGTH(refresh_token) as refresh_token_length,
  LEFT(access_token, 20) as access_token_preview,
  LEFT(refresh_token, 20) as refresh_token_preview
FROM platform_connections 
WHERE access_token IS NOT NULL OR refresh_token IS NOT NULL;

-- Note: After running the Node.js migration script below,
-- all tokens will be encrypted with the new standardized method
