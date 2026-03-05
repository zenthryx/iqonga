-- =============================================================================
-- Iqonga standalone DB: all migrations in one file
-- =============================================================================
-- Run this AFTER standalone_init.sql. Safe to run multiple times (IF NOT EXISTS).
--
-- Order: identity_links → session_columns → messages_read_by_uuid → exec_requests
--        → generated_images → user_notification_preferences → company_knowledge
--        → agent_forum_columns
--
-- Usage: psql -U YOUR_USER -d your_db -f docs/standalone_db/migrate_all.sql
-- =============================================================================

-- ---------- Phase 3.2: Identity links (channel identities → canonical user) ----------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS identity_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(64) NOT NULL,
  external_id VARCHAR(256) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel, external_id)
);
CREATE INDEX IF NOT EXISTS idx_identity_links_canonical ON identity_links(canonical_user_id);
CREATE INDEX IF NOT EXISTS idx_identity_links_channel_external ON identity_links(channel, external_id);
COMMENT ON TABLE identity_links IS 'Maps external channel identities (e.g. Telegram ID) to canonical user for session scoping.';

-- ---------- Phase 3.2: Session key and agent/channel/peer on conversations ----------
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS session_key VARCHAR(512),
  ADD COLUMN IF NOT EXISTS agent_id UUID,
  ADD COLUMN IF NOT EXISTS channel VARCHAR(64),
  ADD COLUMN IF NOT EXISTS peer_id VARCHAR(256),
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_session_key
  ON conversations(session_key) WHERE session_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_agent_channel_peer
  ON conversations(agent_id, channel, peer_id) WHERE agent_id IS NOT NULL;
COMMENT ON COLUMN conversations.session_key IS 'Derived from (agent_id, channel, peer_id) and dm_scope; used to find or create agent sessions.';
COMMENT ON COLUMN conversations.agent_id IS 'Agent owning this conversation when session-scoped (e.g. widget/Telegram).';
COMMENT ON COLUMN conversations.channel IS 'Channel source: e.g. widget, telegram, api.';
COMMENT ON COLUMN conversations.peer_id IS 'External peer id (e.g. Telegram user id) or canonical user id depending on dm_scope.';
COMMENT ON COLUMN conversations.last_activity_at IS 'Last message or activity; used for idle timeout and reset policies.';

-- ---------- Migrate messages.read_by from INTEGER[] to UUID[] ----------
BEGIN;
ALTER TABLE messages DROP COLUMN IF EXISTS read_by;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_by UUID[] DEFAULT '{}';
COMMIT;

-- ---------- Phase 3.4: Exec tool exec_requests table ----------
CREATE TABLE IF NOT EXISTS exec_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  command VARCHAR(1024) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'running', 'completed', 'failed')),
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  output TEXT,
  error TEXT,
  exit_code INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_exec_requests_status ON exec_requests(status);
CREATE INDEX IF NOT EXISTS idx_exec_requests_requested_by ON exec_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_exec_requests_created ON exec_requests(created_at DESC);
COMMENT ON TABLE exec_requests IS 'Exec tool: pending and completed command requests. Approval flow when EXEC_REQUIRE_APPROVAL=true.';

-- ---------- Generated images (Image Generation page / content APIs) ----------
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID,
  prompt TEXT,
  style VARCHAR(100),
  size VARCHAR(50),
  image_url TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);
COMMENT ON TABLE generated_images IS 'AI-generated and uploaded images for Image Generation page';

-- ---------- User notification preferences (Settings > Notifications) ----------
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT false,
  agent_alerts BOOLEAN DEFAULT true,
  performance_reports BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
COMMENT ON TABLE user_notification_preferences IS 'Settings > Notifications toggles per user';

-- ---------- Company knowledge: missing columns and tables ----------
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS file_type VARCHAR(50);
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS file_path TEXT;

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

-- ---------- Agent Forum / profile columns on ai_agents ----------
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS can_post_forum_images BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS profile_header_image TEXT;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS forum_api_key TEXT;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS forum_external_agent_id VARCHAR(100);

-- ---------- Done ----------
