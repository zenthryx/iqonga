-- Add IPFS fields to generated_content table for NFT minting
-- This migration adds fields to store IPFS hashes and URIs

-- Add IPFS hash field
ALTER TABLE generated_content 
ADD COLUMN IF NOT EXISTS ipfs_hash VARCHAR(255);

-- Add IPFS URI field
ALTER TABLE generated_content 
ADD COLUMN IF NOT EXISTS ipfs_uri VARCHAR(500);

-- Add IPFS upload timestamp
ALTER TABLE generated_content 
ADD COLUMN IF NOT EXISTS ipfs_uploaded_at TIMESTAMP;

-- Add index for IPFS hash lookups
CREATE INDEX IF NOT EXISTS idx_generated_content_ipfs_hash 
ON generated_content(ipfs_hash);

-- Add comments for documentation
COMMENT ON COLUMN generated_content.ipfs_hash IS 'IPFS hash (CID) of the uploaded file';
COMMENT ON COLUMN generated_content.ipfs_uri IS 'Full IPFS URI for accessing the file';
COMMENT ON COLUMN generated_content.ipfs_uploaded_at IS 'Timestamp when file was uploaded to IPFS';

-- Update existing records to have NULL values for new fields
UPDATE generated_content 
SET ipfs_hash = NULL, ipfs_uri = NULL, ipfs_uploaded_at = NULL 
WHERE ipfs_hash IS NULL;
