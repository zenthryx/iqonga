-- Migration: Create web3_details table for blockchain project information
-- This table stores Web3-specific information for company profiles

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create web3_details table
CREATE TABLE IF NOT EXISTS web3_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    
    -- Blockchain & Technical Infrastructure
    blockchain_platforms JSONB DEFAULT '[]', -- Array of blockchain names: ["Solana", "Ethereum", etc.]
    network_type VARCHAR(50), -- "Mainnet", "Testnet", "Devnet"
    layer_type VARCHAR(50), -- "Layer 1", "Layer 2", "Sidechain"
    smart_contract_addresses JSONB DEFAULT '[]', -- Array of {label, address, blockchain}
    token_standard VARCHAR(50), -- "SPL", "ERC-20", "ERC-721", etc.
    is_cross_chain BOOLEAN DEFAULT false,
    cross_chain_details TEXT,
    
    -- Tokenomics
    token_name VARCHAR(255),
    token_ticker VARCHAR(20),
    token_contract_address VARCHAR(255),
    total_supply VARCHAR(50), -- Using VARCHAR to handle large numbers
    circulating_supply VARCHAR(50),
    token_distribution JSONB DEFAULT '{}', -- {community: 30, team: 20, investors: 15, treasury: 25, liquidity: 10}
    vesting_schedule TEXT,
    token_utility JSONB DEFAULT '[]', -- Array: ["Governance", "Staking", "Payment", "Rewards", "Access"]
    burn_mechanism TEXT,
    has_staking BOOLEAN DEFAULT false,
    staking_details JSONB DEFAULT '{}', -- {apy, lock_periods, rewards}
    
    -- DeFi/Protocol Specifics
    protocol_type VARCHAR(100), -- "DEX", "Lending", "Derivatives", "Yield Farming", etc.
    tvl VARCHAR(50), -- Total Value Locked
    liquidity_pools JSONB DEFAULT '[]', -- Array of pool details
    trading_pairs JSONB DEFAULT '[]', -- Array of trading pairs
    fee_structure JSONB DEFAULT '{}', -- {trading_fee, protocol_fee}
    yield_apy VARCHAR(50),
    
    -- Governance & DAO
    governance_model VARCHAR(50), -- "DAO", "Multi-sig", "Centralized", "Hybrid"
    voting_mechanism VARCHAR(100), -- "Token-weighted", "Quadratic", etc.
    governance_token VARCHAR(50),
    proposal_process TEXT,
    voting_power_requirements VARCHAR(50),
    
    -- NFT Details
    has_nft BOOLEAN DEFAULT false,
    nft_collection_name VARCHAR(255),
    nft_collection_size VARCHAR(50),
    nft_minting_details JSONB DEFAULT '{}', -- {price, date, how_to_mint}
    nft_royalties VARCHAR(20), -- e.g., "5%"
    nft_utility TEXT,
    nft_marketplace_links JSONB DEFAULT '[]', -- Array of marketplace URLs
    
    -- Security & Trust
    audit_reports JSONB DEFAULT '[]', -- Array of {firm, report_url, date}
    audited_by JSONB DEFAULT '[]', -- Array of audit firm names
    has_bug_bounty BOOLEAN DEFAULT false,
    bug_bounty_details TEXT,
    insurance_coverage TEXT,
    multisig_details TEXT,
    
    -- Where to Buy/Trade
    dex_listings JSONB DEFAULT '[]', -- Array of DEX names
    cex_listings JSONB DEFAULT '[]', -- Array of CEX names
    liquidity_providers JSONB DEFAULT '[]', -- Array of liquidity provider details
    token_purchase_guide TEXT,
    
    -- Wallet & Access
    supported_wallets JSONB DEFAULT '[]', -- Array: ["Phantom", "MetaMask", etc.]
    wallet_connection_guide TEXT,
    network_settings JSONB DEFAULT '{}', -- {rpc_endpoints, chain_ids}
    
    -- Community & Social Metrics
    community_size JSONB DEFAULT '{}', -- {discord: 5000, telegram: 3000, twitter: 10000}
    community_channels JSONB DEFAULT '{}', -- {discord_url, telegram_url, twitter_url}
    community_programs TEXT,
    
    -- Partnerships & Ecosystem
    key_partnerships JSONB DEFAULT '[]', -- Array of partner names/descriptions
    integrations JSONB DEFAULT '[]', -- Array of integrated protocols
    ecosystem_projects JSONB DEFAULT '[]', -- Array of projects building on top
    cross_chain_bridges JSONB DEFAULT '[]', -- Array of bridge partners
    
    -- Roadmap & Milestones
    launch_date DATE,
    major_milestones JSONB DEFAULT '[]', -- Array of {title, date, description, completed}
    upcoming_features JSONB DEFAULT '[]', -- Array of {feature, planned_date, description}
    current_phase VARCHAR(50), -- "Alpha", "Beta", "Mainnet", etc.
    
    -- Additional Information
    whitepaper_url VARCHAR(500),
    litepaper_url VARCHAR(500),
    documentation_url VARCHAR(500),
    github_url VARCHAR(500),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Ensure one web3_details per company profile
    UNIQUE(company_profile_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_web3_details_company_profile_id ON web3_details(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_web3_details_token_ticker ON web3_details(token_ticker);
CREATE INDEX IF NOT EXISTS idx_web3_details_blockchain_platforms ON web3_details USING gin(blockchain_platforms);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_web3_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_web3_details_updated_at
    BEFORE UPDATE ON web3_details
    FOR EACH ROW
    EXECUTE FUNCTION update_web3_details_updated_at();

-- Add comments for documentation
COMMENT ON TABLE web3_details IS 'Stores Web3/blockchain-specific information for company profiles';
COMMENT ON COLUMN web3_details.blockchain_platforms IS 'JSON array of blockchain platforms the project operates on';
COMMENT ON COLUMN web3_details.token_distribution IS 'JSON object with percentage breakdown of token allocation';
COMMENT ON COLUMN web3_details.smart_contract_addresses IS 'JSON array of smart contract addresses with labels';
COMMENT ON COLUMN web3_details.staking_details IS 'JSON object with staking APY, lock periods, and reward details';

