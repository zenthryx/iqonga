-- Fix Company knowledge pages: add missing columns and tables for standalone.
-- Run if you see: column "file_type"/"file_path" does not exist, relation "web3_details" or "agent_knowledge_assignments" does not exist
-- Usage: psql -U YOUR_USER -d ajentrix_standalone -f Backend/standalone_db/migrate_company_knowledge.sql

-- 1) knowledge_documents: add file_type, file_size, file_path (for document upload/list)
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS file_type VARCHAR(50);
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS file_path TEXT;

-- 2) web3_details table (for Web3 Details tab)
CREATE TABLE IF NOT EXISTS web3_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  blockchain_platforms JSONB DEFAULT '[]',
  network_type VARCHAR(100),
  layer_type VARCHAR(100),
  smart_contract_addresses JSONB DEFAULT '[]',
  token_standard VARCHAR(50),
  is_cross_chain BOOLEAN DEFAULT FALSE,
  cross_chain_details TEXT,
  token_name VARCHAR(200),
  token_ticker VARCHAR(50),
  token_contract_address VARCHAR(255),
  total_supply VARCHAR(100),
  circulating_supply VARCHAR(100),
  token_distribution JSONB DEFAULT '{}',
  vesting_schedule TEXT,
  token_utility JSONB DEFAULT '[]',
  burn_mechanism TEXT,
  has_staking BOOLEAN DEFAULT FALSE,
  staking_details JSONB DEFAULT '{}',
  protocol_type VARCHAR(100),
  tvl VARCHAR(100),
  liquidity_pools JSONB DEFAULT '[]',
  trading_pairs JSONB DEFAULT '[]',
  fee_structure JSONB DEFAULT '{}',
  yield_apy VARCHAR(50),
  governance_model VARCHAR(200),
  voting_mechanism TEXT,
  governance_token VARCHAR(200),
  proposal_process TEXT,
  voting_power_requirements TEXT,
  has_nft BOOLEAN DEFAULT FALSE,
  nft_collection_name VARCHAR(300),
  nft_collection_size VARCHAR(50),
  nft_minting_details JSONB DEFAULT '{}',
  nft_royalties VARCHAR(50),
  nft_utility TEXT,
  nft_marketplace_links JSONB DEFAULT '[]',
  audit_reports JSONB DEFAULT '[]',
  audited_by JSONB DEFAULT '[]',
  has_bug_bounty BOOLEAN DEFAULT FALSE,
  bug_bounty_details TEXT,
  insurance_coverage TEXT,
  multisig_details TEXT,
  dex_listings JSONB DEFAULT '[]',
  cex_listings JSONB DEFAULT '[]',
  liquidity_providers JSONB DEFAULT '[]',
  token_purchase_guide TEXT,
  supported_wallets JSONB DEFAULT '[]',
  wallet_connection_guide TEXT,
  network_settings JSONB DEFAULT '{}',
  community_size VARCHAR(100),
  community_channels JSONB DEFAULT '[]',
  community_programs JSONB DEFAULT '[]',
  key_partnerships JSONB DEFAULT '[]',
  integrations JSONB DEFAULT '[]',
  ecosystem_projects JSONB DEFAULT '[]',
  cross_chain_bridges JSONB DEFAULT '[]',
  launch_date DATE,
  major_milestones JSONB DEFAULT '[]',
  upcoming_features JSONB DEFAULT '[]',
  current_phase VARCHAR(100),
  whitepaper_url TEXT,
  litepaper_url TEXT,
  documentation_url TEXT,
  github_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_web3_details_company ON web3_details(company_profile_id);

-- 3) agent_knowledge_assignments (for Agent Access / assign-to-agent)
CREATE TABLE IF NOT EXISTS agent_knowledge_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  knowledge_scope JSONB DEFAULT '[]',
  custom_instructions TEXT,
  priority_level INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, company_profile_id)
);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_assignments_company ON agent_knowledge_assignments(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_assignments_agent ON agent_knowledge_assignments(agent_id);
