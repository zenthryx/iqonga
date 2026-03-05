import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '@/services/api';
import {
  GlobeAltIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  UsersIcon,
  RocketLaunchIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

interface Web3DetailsData {
  // Blockchain & Technical Infrastructure
  blockchainPlatforms: string[];
  networkType: string;
  layerType: string;
  smartContractAddresses: Array<{ label: string; address: string; blockchain: string }>;
  tokenStandard: string;
  isCrossChain: boolean;
  crossChainDetails: string;
  
  // Tokenomics
  tokenName: string;
  tokenTicker: string;
  tokenContractAddress: string;
  totalSupply: string;
  circulatingSupply: string;
  tokenDistribution: Record<string, number>;
  vestingSchedule: string;
  tokenUtility: string[];
  burnMechanism: string;
  hasStaking: boolean;
  stakingDetails: { apy?: string; lockPeriods?: string; rewards?: string };
  
  // DeFi/Protocol Specifics
  protocolType: string;
  tvl: string;
  liquidityPools: Array<{ name: string; pair: string; liquidity: string }>;
  tradingPairs: string[];
  feeStructure: { tradingFee?: string; protocolFee?: string };
  yieldApy: string;
  
  // Governance & DAO
  governanceModel: string;
  votingMechanism: string;
  governanceToken: string;
  proposalProcess: string;
  votingPowerRequirements: string;
  
  // NFT Details
  hasNft: boolean;
  nftCollectionName: string;
  nftCollectionSize: string;
  nftMintingDetails: { price?: string; date?: string; howToMint?: string };
  nftRoyalties: string;
  nftUtility: string;
  nftMarketplaceLinks: Array<{ name: string; url: string }>;
  
  // Security & Trust
  auditReports: Array<{ firm: string; reportUrl: string; date: string }>;
  auditedBy: string[];
  hasBugBounty: boolean;
  bugBountyDetails: string;
  insuranceCoverage: string;
  multisigDetails: string;
  
  // Where to Buy/Trade
  dexListings: string[];
  cexListings: string[];
  liquidityProviders: Array<{ name: string; url: string }>;
  tokenPurchaseGuide: string;
  
  // Wallet & Access
  supportedWallets: string[];
  walletConnectionGuide: string;
  networkSettings: { rpcEndpoints?: string[]; chainIds?: Record<string, string> };
  
  // Community & Social Metrics
  communitySize: Record<string, number>;
  communityChannels: Record<string, string>;
  communityPrograms: string;
  
  // Partnerships & Ecosystem
  keyPartnerships: Array<{ name: string; description: string }>;
  integrations: string[];
  ecosystemProjects: string[];
  crossChainBridges: string[];
  
  // Roadmap & Milestones
  launchDate: string;
  majorMilestones: Array<{ title: string; date: string; description: string; completed: boolean }>;
  upcomingFeatures: Array<{ feature: string; plannedDate: string; description: string }>;
  currentPhase: string;
  
  // Additional Information
  whitepaperUrl: string;
  litepaperUrl: string;
  documentationUrl: string;
  githubUrl: string;
}

const Web3Details: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('blockchain');
  
  const [formData, setFormData] = useState<Web3DetailsData>({
    blockchainPlatforms: [],
    networkType: '',
    layerType: '',
    smartContractAddresses: [],
    tokenStandard: '',
    isCrossChain: false,
    crossChainDetails: '',
    tokenName: '',
    tokenTicker: '',
    tokenContractAddress: '',
    totalSupply: '',
    circulatingSupply: '',
    tokenDistribution: {},
    vestingSchedule: '',
    tokenUtility: [],
    burnMechanism: '',
    hasStaking: false,
    stakingDetails: {},
    protocolType: '',
    tvl: '',
    liquidityPools: [],
    tradingPairs: [],
    feeStructure: {},
    yieldApy: '',
    governanceModel: '',
    votingMechanism: '',
    governanceToken: '',
    proposalProcess: '',
    votingPowerRequirements: '',
    hasNft: false,
    nftCollectionName: '',
    nftCollectionSize: '',
    nftMintingDetails: {},
    nftRoyalties: '',
    nftUtility: '',
    nftMarketplaceLinks: [],
    auditReports: [],
    auditedBy: [],
    hasBugBounty: false,
    bugBountyDetails: '',
    insuranceCoverage: '',
    multisigDetails: '',
    dexListings: [],
    cexListings: [],
    liquidityProviders: [],
    tokenPurchaseGuide: '',
    supportedWallets: [],
    walletConnectionGuide: '',
    networkSettings: {},
    communitySize: {},
    communityChannels: {},
    communityPrograms: '',
    keyPartnerships: [],
    integrations: [],
    ecosystemProjects: [],
    crossChainBridges: [],
    launchDate: '',
    majorMilestones: [],
    upcomingFeatures: [],
    currentPhase: '',
    whitepaperUrl: '',
    litepaperUrl: '',
    documentationUrl: '',
    githubUrl: ''
  });

  useEffect(() => {
    fetchWeb3Details();
  }, []);

  const fetchWeb3Details = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/company/web3');
      
      if (response.success && response.data.web3Details) {
        const web3Data = response.data.web3Details;
        
        // Parse JSON fields
        setFormData({
          blockchainPlatforms: Array.isArray(web3Data.blockchain_platforms) ? web3Data.blockchain_platforms : JSON.parse(web3Data.blockchain_platforms || '[]'),
          networkType: web3Data.network_type || '',
          layerType: web3Data.layer_type || '',
          smartContractAddresses: Array.isArray(web3Data.smart_contract_addresses) ? web3Data.smart_contract_addresses : JSON.parse(web3Data.smart_contract_addresses || '[]'),
          tokenStandard: web3Data.token_standard || '',
          isCrossChain: web3Data.is_cross_chain || false,
          crossChainDetails: web3Data.cross_chain_details || '',
          tokenName: web3Data.token_name || '',
          tokenTicker: web3Data.token_ticker || '',
          tokenContractAddress: web3Data.token_contract_address || '',
          totalSupply: web3Data.total_supply || '',
          circulatingSupply: web3Data.circulating_supply || '',
          tokenDistribution: typeof web3Data.token_distribution === 'object' ? web3Data.token_distribution : JSON.parse(web3Data.token_distribution || '{}'),
          vestingSchedule: web3Data.vesting_schedule || '',
          tokenUtility: Array.isArray(web3Data.token_utility) ? web3Data.token_utility : JSON.parse(web3Data.token_utility || '[]'),
          burnMechanism: web3Data.burn_mechanism || '',
          hasStaking: web3Data.has_staking || false,
          stakingDetails: typeof web3Data.staking_details === 'object' ? web3Data.staking_details : JSON.parse(web3Data.staking_details || '{}'),
          protocolType: web3Data.protocol_type || '',
          tvl: web3Data.tvl || '',
          liquidityPools: Array.isArray(web3Data.liquidity_pools) ? web3Data.liquidity_pools : JSON.parse(web3Data.liquidity_pools || '[]'),
          tradingPairs: Array.isArray(web3Data.trading_pairs) ? web3Data.trading_pairs : JSON.parse(web3Data.trading_pairs || '[]'),
          feeStructure: typeof web3Data.fee_structure === 'object' ? web3Data.fee_structure : JSON.parse(web3Data.fee_structure || '{}'),
          yieldApy: web3Data.yield_apy || '',
          governanceModel: web3Data.governance_model || '',
          votingMechanism: web3Data.voting_mechanism || '',
          governanceToken: web3Data.governance_token || '',
          proposalProcess: web3Data.proposal_process || '',
          votingPowerRequirements: web3Data.voting_power_requirements || '',
          hasNft: web3Data.has_nft || false,
          nftCollectionName: web3Data.nft_collection_name || '',
          nftCollectionSize: web3Data.nft_collection_size || '',
          nftMintingDetails: typeof web3Data.nft_minting_details === 'object' ? web3Data.nft_minting_details : JSON.parse(web3Data.nft_minting_details || '{}'),
          nftRoyalties: web3Data.nft_royalties || '',
          nftUtility: web3Data.nft_utility || '',
          nftMarketplaceLinks: Array.isArray(web3Data.nft_marketplace_links) ? web3Data.nft_marketplace_links : JSON.parse(web3Data.nft_marketplace_links || '[]'),
          auditReports: Array.isArray(web3Data.audit_reports) ? web3Data.audit_reports : JSON.parse(web3Data.audit_reports || '[]'),
          auditedBy: Array.isArray(web3Data.audited_by) ? web3Data.audited_by : JSON.parse(web3Data.audited_by || '[]'),
          hasBugBounty: web3Data.has_bug_bounty || false,
          bugBountyDetails: web3Data.bug_bounty_details || '',
          insuranceCoverage: web3Data.insurance_coverage || '',
          multisigDetails: web3Data.multisig_details || '',
          dexListings: Array.isArray(web3Data.dex_listings) ? web3Data.dex_listings : JSON.parse(web3Data.dex_listings || '[]'),
          cexListings: Array.isArray(web3Data.cex_listings) ? web3Data.cex_listings : JSON.parse(web3Data.cex_listings || '[]'),
          liquidityProviders: Array.isArray(web3Data.liquidity_providers) ? web3Data.liquidity_providers : JSON.parse(web3Data.liquidity_providers || '[]'),
          tokenPurchaseGuide: web3Data.token_purchase_guide || '',
          supportedWallets: Array.isArray(web3Data.supported_wallets) ? web3Data.supported_wallets : JSON.parse(web3Data.supported_wallets || '[]'),
          walletConnectionGuide: web3Data.wallet_connection_guide || '',
          networkSettings: typeof web3Data.network_settings === 'object' ? web3Data.network_settings : JSON.parse(web3Data.network_settings || '{}'),
          communitySize: typeof web3Data.community_size === 'object' ? web3Data.community_size : JSON.parse(web3Data.community_size || '{}'),
          communityChannels: typeof web3Data.community_channels === 'object' ? web3Data.community_channels : JSON.parse(web3Data.community_channels || '{}'),
          communityPrograms: web3Data.community_programs || '',
          keyPartnerships: Array.isArray(web3Data.key_partnerships) ? web3Data.key_partnerships : JSON.parse(web3Data.key_partnerships || '[]'),
          integrations: Array.isArray(web3Data.integrations) ? web3Data.integrations : JSON.parse(web3Data.integrations || '[]'),
          ecosystemProjects: Array.isArray(web3Data.ecosystem_projects) ? web3Data.ecosystem_projects : JSON.parse(web3Data.ecosystem_projects || '[]'),
          crossChainBridges: Array.isArray(web3Data.cross_chain_bridges) ? web3Data.cross_chain_bridges : JSON.parse(web3Data.cross_chain_bridges || '[]'),
          launchDate: web3Data.launch_date || '',
          majorMilestones: Array.isArray(web3Data.major_milestones) ? web3Data.major_milestones : JSON.parse(web3Data.major_milestones || '[]'),
          upcomingFeatures: Array.isArray(web3Data.upcoming_features) ? web3Data.upcoming_features : JSON.parse(web3Data.upcoming_features || '[]'),
          currentPhase: web3Data.current_phase || '',
          whitepaperUrl: web3Data.whitepaper_url || '',
          litepaperUrl: web3Data.litepaper_url || '',
          documentationUrl: web3Data.documentation_url || '',
          githubUrl: web3Data.github_url || ''
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch Web3 details:', error);
      toast.error('Failed to load Web3 details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await apiService.post('/company/web3', formData);
      
      if (response.success) {
        toast.success('Web3 details saved successfully!');
      } else {
        toast.error(response.error || 'Failed to save Web3 details');
      }
    } catch (error: any) {
      console.error('Failed to save Web3 details:', error);
      toast.error('Failed to save Web3 details');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'blockchain', name: 'Blockchain & Tech', icon: GlobeAltIcon },
    { id: 'tokenomics', name: 'Tokenomics', icon: CurrencyDollarIcon },
    { id: 'defi', name: 'DeFi/Protocol', icon: RocketLaunchIcon },
    { id: 'governance', name: 'Governance & DAO', icon: UsersIcon },
    { id: 'nft', name: 'NFT Details', icon: DocumentTextIcon },
    { id: 'security', name: 'Security & Trust', icon: ShieldCheckIcon },
    { id: 'trading', name: 'Trading & Wallets', icon: CurrencyDollarIcon },
    { id: 'community', name: 'Community', icon: UsersIcon },
    { id: 'partnerships', name: 'Partnerships', icon: LinkIcon },
    { id: 'roadmap', name: 'Roadmap', icon: RocketLaunchIcon },
    { id: 'links', name: 'Important Links', icon: DocumentTextIcon }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Web3 Project Details</h2>
        <p className="text-blue-100">
          Provide comprehensive blockchain and tokenomics information for your Web3 project.
          This helps AI agents accurately represent your project to the community.
        </p>
      </div>

      {/* Section Navigation */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <section.icon className="w-4 h-4" />
              {section.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content Sections */}
      <div className="bg-gray-800 rounded-lg p-6">
        {/* Blockchain & Technical Infrastructure */}
        {activeSection === 'blockchain' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Blockchain & Technical Infrastructure</h3>
            
            {/* Blockchain Platforms */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Blockchain Platforms *
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {['Solana', 'Ethereum', 'Polygon', 'BSC', 'Avalanche', 'Arbitrum', 'Optimism', 'Base'].map(chain => (
                  <button
                    key={chain}
                    onClick={() => {
                      if (formData.blockchainPlatforms.includes(chain)) {
                        setFormData({
                          ...formData,
                          blockchainPlatforms: formData.blockchainPlatforms.filter(c => c !== chain)
                        });
                      } else {
                        setFormData({
                          ...formData,
                          blockchainPlatforms: [...formData.blockchainPlatforms, chain]
                        });
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      formData.blockchainPlatforms.includes(chain)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {chain}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add custom blockchain..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    setFormData({
                      ...formData,
                      blockchainPlatforms: [...formData.blockchainPlatforms, e.currentTarget.value.trim()]
                    });
                    e.currentTarget.value = '';
                  }
                }}
              />
              <p className="text-xs text-gray-400 mt-1">Press Enter to add custom blockchain</p>
            </div>

            {/* Network Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Network Type
              </label>
              <select
                value={formData.networkType}
                onChange={(e) => setFormData({ ...formData, networkType: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Select network type...</option>
                <option value="Mainnet">Mainnet</option>
                <option value="Testnet">Testnet</option>
                <option value="Devnet">Devnet</option>
              </select>
            </div>

            {/* Layer Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Layer Type
              </label>
              <select
                value={formData.layerType}
                onChange={(e) => setFormData({ ...formData, layerType: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Select layer...</option>
                <option value="Layer 1">Layer 1</option>
                <option value="Layer 2">Layer 2</option>
                <option value="Sidechain">Sidechain</option>
              </select>
            </div>

            {/* Token Standard */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token Standard
              </label>
              <input
                type="text"
                value={formData.tokenStandard}
                onChange={(e) => setFormData({ ...formData, tokenStandard: e.target.value })}
                placeholder="e.g., SPL, ERC-20, ERC-721"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            {/* Smart Contract Addresses */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Smart Contract Addresses
              </label>
              <div className="space-y-2">
                {formData.smartContractAddresses.map((contract, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={contract.label}
                      onChange={(e) => {
                        const updated = [...formData.smartContractAddresses];
                        updated[index].label = e.target.value;
                        setFormData({ ...formData, smartContractAddresses: updated });
                      }}
                      placeholder="Label (e.g., Main Contract)"
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                    <input
                      type="text"
                      value={contract.address}
                      onChange={(e) => {
                        const updated = [...formData.smartContractAddresses];
                        updated[index].address = e.target.value;
                        setFormData({ ...formData, smartContractAddresses: updated });
                      }}
                      placeholder="Contract Address"
                      className="flex-[2] px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                    <input
                      type="text"
                      value={contract.blockchain}
                      onChange={(e) => {
                        const updated = [...formData.smartContractAddresses];
                        updated[index].blockchain = e.target.value;
                        setFormData({ ...formData, smartContractAddresses: updated });
                      }}
                      placeholder="Blockchain"
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          smartContractAddresses: formData.smartContractAddresses.filter((_, i) => i !== index)
                        });
                      }}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setFormData({
                      ...formData,
                      smartContractAddresses: [...formData.smartContractAddresses, { label: '', address: '', blockchain: '' }]
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Contract
                </button>
              </div>
            </div>

            {/* Cross-Chain */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.isCrossChain}
                  onChange={(e) => setFormData({ ...formData, isCrossChain: e.target.checked })}
                  className="w-4 h-4"
                />
                Cross-Chain Support
              </label>
              {formData.isCrossChain && (
                <textarea
                  value={formData.crossChainDetails}
                  onChange={(e) => setFormData({ ...formData, crossChainDetails: e.target.value })}
                  placeholder="Describe cross-chain capabilities..."
                  rows={3}
                  className="w-full mt-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              )}
            </div>
          </div>
        )}

        {/* Tokenomics Section */}
        {activeSection === 'tokenomics' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Tokenomics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Token Name *
                </label>
                <input
                  type="text"
                  value={formData.tokenName}
                  onChange={(e) => setFormData({ ...formData, tokenName: e.target.value })}
                  placeholder="e.g., Zenthryx Token"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Token Ticker *
                </label>
                <input
                  type="text"
                  value={formData.tokenTicker}
                  onChange={(e) => setFormData({ ...formData, tokenTicker: e.target.value })}
                  placeholder="e.g., $ZTR"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token Contract Address
              </label>
              <input
                type="text"
                value={formData.tokenContractAddress}
                onChange={(e) => setFormData({ ...formData, tokenContractAddress: e.target.value })}
                placeholder="Contract address for verification"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Supply
                </label>
                <input
                  type="text"
                  value={formData.totalSupply}
                  onChange={(e) => setFormData({ ...formData, totalSupply: e.target.value })}
                  placeholder="e.g., 1,000,000,000"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Circulating Supply
                </label>
                <input
                  type="text"
                  value={formData.circulatingSupply}
                  onChange={(e) => setFormData({ ...formData, circulatingSupply: e.target.value })}
                  placeholder="e.g., 500,000,000"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Token Distribution */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token Distribution (%)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {['Community', 'Team', 'Investors', 'Treasury', 'Liquidity'].map(category => (
                  <div key={category} className="flex items-center gap-2">
                    <label className="text-gray-400 text-sm w-24">{category}</label>
                    <input
                      type="number"
                      value={formData.tokenDistribution[category.toLowerCase()] || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        tokenDistribution: {
                          ...formData.tokenDistribution,
                          [category.toLowerCase()]: parseFloat(e.target.value) || 0
                        }
                      })}
                      placeholder="0"
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                    <span className="text-gray-400 text-sm">%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Token Utility */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token Utility
              </label>
              <div className="flex flex-wrap gap-2">
                {['Governance', 'Staking', 'Payment', 'Rewards', 'Access', 'Liquidity Mining'].map(utility => (
                  <button
                    key={utility}
                    onClick={() => {
                      if (formData.tokenUtility.includes(utility)) {
                        setFormData({
                          ...formData,
                          tokenUtility: formData.tokenUtility.filter(u => u !== utility)
                        });
                      } else {
                        setFormData({
                          ...formData,
                          tokenUtility: [...formData.tokenUtility, utility]
                        });
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      formData.tokenUtility.includes(utility)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {utility}
                  </button>
                ))}
              </div>
            </div>

            {/* Vesting Schedule */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Vesting Schedule
              </label>
              <textarea
                value={formData.vestingSchedule}
                onChange={(e) => setFormData({ ...formData, vestingSchedule: e.target.value })}
                placeholder="Describe token vesting details..."
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            {/* Burn Mechanism */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Burn Mechanism (Deflationary)
              </label>
              <textarea
                value={formData.burnMechanism}
                onChange={(e) => setFormData({ ...formData, burnMechanism: e.target.value })}
                placeholder="Describe burn mechanism if applicable..."
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            {/* Staking */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <input
                  type="checkbox"
                  checked={formData.hasStaking}
                  onChange={(e) => setFormData({ ...formData, hasStaking: e.target.checked })}
                  className="w-4 h-4"
                />
                Staking Available
              </label>
              {formData.hasStaking && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                  <input
                    type="text"
                    value={formData.stakingDetails.apy || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      stakingDetails: { ...formData.stakingDetails, apy: e.target.value }
                    })}
                    placeholder="APY (e.g., 12%)"
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  />
                  <input
                    type="text"
                    value={formData.stakingDetails.lockPeriods || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      stakingDetails: { ...formData.stakingDetails, lockPeriods: e.target.value }
                    })}
                    placeholder="Lock periods (e.g., 30/60/90 days)"
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  />
                  <input
                    type="text"
                    value={formData.stakingDetails.rewards || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      stakingDetails: { ...formData.stakingDetails, rewards: e.target.value }
                    })}
                    placeholder="Rewards details"
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* DeFi/Protocol Specifics Section */}
        {activeSection === 'defi' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">DeFi/Protocol Specifics</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Protocol Type
              </label>
              <select
                value={formData.protocolType}
                onChange={(e) => setFormData({ ...formData, protocolType: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Select protocol type...</option>
                <option value="DEX">DEX (Decentralized Exchange)</option>
                <option value="Lending">Lending Protocol</option>
                <option value="Derivatives">Derivatives</option>
                <option value="Yield Farming">Yield Farming</option>
                <option value="Liquidity Protocol">Liquidity Protocol</option>
                <option value="Staking">Staking Protocol</option>
                <option value="Synthetic Assets">Synthetic Assets</option>
                <option value="Insurance">Insurance Protocol</option>
                <option value="Asset Management">Asset Management</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  TVL (Total Value Locked)
                </label>
                <input
                  type="text"
                  value={formData.tvl}
                  onChange={(e) => setFormData({ ...formData, tvl: e.target.value })}
                  placeholder="e.g., $50M"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Yield/APY
                </label>
                <input
                  type="text"
                  value={formData.yieldApy}
                  onChange={(e) => setFormData({ ...formData, yieldApy: e.target.value })}
                  placeholder="e.g., 5-15%"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Trading Pairs
              </label>
              <input
                type="text"
                placeholder="Enter trading pairs (comma-separated)"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const pairs = e.currentTarget.value.split(',').map(p => p.trim()).filter(p => p);
                    setFormData({
                      ...formData,
                      tradingPairs: [...formData.tradingPairs, ...pairs]
                    });
                    e.currentTarget.value = '';
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tradingPairs.map((pair, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2">
                    {pair}
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        tradingPairs: formData.tradingPairs.filter((_, i) => i !== index)
                      })}
                      className="text-white hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Press Enter to add pairs (e.g., SOL/USDC, ETH/USDT)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fee Structure
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={formData.feeStructure.tradingFee || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    feeStructure: { ...formData.feeStructure, tradingFee: e.target.value }
                  })}
                  placeholder="Trading fee (e.g., 0.3%)"
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  value={formData.feeStructure.protocolFee || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    feeStructure: { ...formData.feeStructure, protocolFee: e.target.value }
                  })}
                  placeholder="Protocol fee (e.g., 0.05%)"
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Governance & DAO Section */}
        {activeSection === 'governance' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Governance & DAO</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Governance Model
              </label>
              <select
                value={formData.governanceModel}
                onChange={(e) => setFormData({ ...formData, governanceModel: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Select governance model...</option>
                <option value="DAO">DAO (Decentralized Autonomous Organization)</option>
                <option value="Multi-sig">Multi-sig</option>
                <option value="Centralized">Centralized</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Voting Mechanism
              </label>
              <input
                type="text"
                value={formData.votingMechanism}
                onChange={(e) => setFormData({ ...formData, votingMechanism: e.target.value })}
                placeholder="e.g., Token-weighted, Quadratic voting"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Governance Token
              </label>
              <input
                type="text"
                value={formData.governanceToken}
                onChange={(e) => setFormData({ ...formData, governanceToken: e.target.value })}
                placeholder="Token used for governance"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Voting Power Requirements
              </label>
              <input
                type="text"
                value={formData.votingPowerRequirements}
                onChange={(e) => setFormData({ ...formData, votingPowerRequirements: e.target.value })}
                placeholder="Minimum tokens needed to vote"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Proposal Process
              </label>
              <textarea
                value={formData.proposalProcess}
                onChange={(e) => setFormData({ ...formData, proposalProcess: e.target.value })}
                placeholder="Describe how community can submit proposals..."
                rows={4}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>
          </div>
        )}

        {/* NFT Details Section */}
        {activeSection === 'nft' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">NFT Details</h3>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <input
                  type="checkbox"
                  checked={formData.hasNft}
                  onChange={(e) => setFormData({ ...formData, hasNft: e.target.checked })}
                  className="w-4 h-4"
                />
                Project has NFT Collection
              </label>
            </div>

            {formData.hasNft && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Collection Name
                    </label>
                    <input
                      type="text"
                      value={formData.nftCollectionName}
                      onChange={(e) => setFormData({ ...formData, nftCollectionName: e.target.value })}
                      placeholder="NFT collection name"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Collection Size
                    </label>
                    <input
                      type="text"
                      value={formData.nftCollectionSize}
                      onChange={(e) => setFormData({ ...formData, nftCollectionSize: e.target.value })}
                      placeholder="Total NFTs (e.g., 10,000)"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Royalties
                  </label>
                  <input
                    type="text"
                    value={formData.nftRoyalties}
                    onChange={(e) => setFormData({ ...formData, nftRoyalties: e.target.value })}
                    placeholder="e.g., 5%"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    NFT Utility
                  </label>
                  <textarea
                    value={formData.nftUtility}
                    onChange={(e) => setFormData({ ...formData, nftUtility: e.target.value })}
                    placeholder="Describe NFT utility (access, rewards, governance, etc.)"
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Minting Details
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={formData.nftMintingDetails.price || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        nftMintingDetails: { ...formData.nftMintingDetails, price: e.target.value }
                      })}
                      placeholder="Mint price"
                      className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                    <input
                      type="text"
                      value={formData.nftMintingDetails.date || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        nftMintingDetails: { ...formData.nftMintingDetails, date: e.target.value }
                      })}
                      placeholder="Mint date"
                      className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                    <input
                      type="text"
                      value={formData.nftMintingDetails.howToMint || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        nftMintingDetails: { ...formData.nftMintingDetails, howToMint: e.target.value }
                      })}
                      placeholder="Where to mint"
                      className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Marketplace Links
                  </label>
                  <div className="space-y-2">
                    {formData.nftMarketplaceLinks.map((link, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={link.name}
                          onChange={(e) => {
                            const updated = [...formData.nftMarketplaceLinks];
                            updated[index].name = e.target.value;
                            setFormData({ ...formData, nftMarketplaceLinks: updated });
                          }}
                          placeholder="Marketplace name"
                          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                        />
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => {
                            const updated = [...formData.nftMarketplaceLinks];
                            updated[index].url = e.target.value;
                            setFormData({ ...formData, nftMarketplaceLinks: updated });
                          }}
                          placeholder="Marketplace URL"
                          className="flex-[2] px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                        />
                        <button
                          onClick={() => {
                            setFormData({
                              ...formData,
                              nftMarketplaceLinks: formData.nftMarketplaceLinks.filter((_, i) => i !== index)
                            });
                          }}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          nftMarketplaceLinks: [...formData.nftMarketplaceLinks, { name: '', url: '' }]
                        });
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add Marketplace
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Security & Trust Section */}
        {activeSection === 'security' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Security & Trust</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Audited By
              </label>
              <input
                type="text"
                placeholder="Enter audit firm names (comma-separated)"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const firms = e.currentTarget.value.split(',').map(f => f.trim()).filter(f => f);
                    setFormData({
                      ...formData,
                      auditedBy: [...formData.auditedBy, ...firms]
                    });
                    e.currentTarget.value = '';
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.auditedBy.map((firm, index) => (
                  <span key={index} className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm flex items-center gap-2">
                    {firm}
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        auditedBy: formData.auditedBy.filter((_, i) => i !== index)
                      })}
                      className="text-white hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Press Enter to add audit firms (e.g., Certik, Hacken, Trail of Bits)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Audit Reports
              </label>
              <div className="space-y-2">
                {formData.auditReports.map((report, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={report.firm}
                      onChange={(e) => {
                        const updated = [...formData.auditReports];
                        updated[index].firm = e.target.value;
                        setFormData({ ...formData, auditReports: updated });
                      }}
                      placeholder="Audit firm"
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                    <input
                      type="url"
                      value={report.reportUrl}
                      onChange={(e) => {
                        const updated = [...formData.auditReports];
                        updated[index].reportUrl = e.target.value;
                        setFormData({ ...formData, auditReports: updated });
                      }}
                      placeholder="Report URL"
                      className="flex-[2] px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                    <input
                      type="text"
                      value={report.date}
                      onChange={(e) => {
                        const updated = [...formData.auditReports];
                        updated[index].date = e.target.value;
                        setFormData({ ...formData, auditReports: updated });
                      }}
                      placeholder="Date"
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          auditReports: formData.auditReports.filter((_, i) => i !== index)
                        });
                      }}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setFormData({
                      ...formData,
                      auditReports: [...formData.auditReports, { firm: '', reportUrl: '', date: '' }]
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Audit Report
                </button>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <input
                  type="checkbox"
                  checked={formData.hasBugBounty}
                  onChange={(e) => setFormData({ ...formData, hasBugBounty: e.target.checked })}
                  className="w-4 h-4"
                />
                Bug Bounty Program
              </label>
              {formData.hasBugBounty && (
                <textarea
                  value={formData.bugBountyDetails}
                  onChange={(e) => setFormData({ ...formData, bugBountyDetails: e.target.value })}
                  placeholder="Describe bug bounty program details..."
                  rows={3}
                  className="w-full mt-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Insurance Coverage
              </label>
              <textarea
                value={formData.insuranceCoverage}
                onChange={(e) => setFormData({ ...formData, insuranceCoverage: e.target.value })}
                placeholder="Describe insurance coverage (if any)..."
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Multi-sig Details
              </label>
              <textarea
                value={formData.multisigDetails}
                onChange={(e) => setFormData({ ...formData, multisigDetails: e.target.value })}
                placeholder="Describe multi-sig setup for treasury management..."
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>
          </div>
        )}

        {/* Trading & Wallets Section */}
        {activeSection === 'trading' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Trading & Wallets</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                DEX Listings
              </label>
              <input
                type="text"
                placeholder="Enter DEX names (comma-separated)"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const dexes = e.currentTarget.value.split(',').map(d => d.trim()).filter(d => d);
                    setFormData({
                      ...formData,
                      dexListings: [...formData.dexListings, ...dexes]
                    });
                    e.currentTarget.value = '';
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.dexListings.map((dex, index) => (
                  <span key={index} className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm flex items-center gap-2">
                    {dex}
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        dexListings: formData.dexListings.filter((_, i) => i !== index)
                      })}
                      className="text-white hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Press Enter to add DEX (e.g., Raydium, Uniswap, PancakeSwap)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                CEX Listings
              </label>
              <input
                type="text"
                placeholder="Enter CEX names (comma-separated)"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const cexes = e.currentTarget.value.split(',').map(c => c.trim()).filter(c => c);
                    setFormData({
                      ...formData,
                      cexListings: [...formData.cexListings, ...cexes]
                    });
                    e.currentTarget.value = '';
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.cexListings.map((cex, index) => (
                  <span key={index} className="px-3 py-1 bg-orange-600 text-white rounded-lg text-sm flex items-center gap-2">
                    {cex}
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        cexListings: formData.cexListings.filter((_, i) => i !== index)
                      })}
                      className="text-white hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Press Enter to add CEX (e.g., Binance, Coinbase, Kraken)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token Purchase Guide
              </label>
              <textarea
                value={formData.tokenPurchaseGuide}
                onChange={(e) => setFormData({ ...formData, tokenPurchaseGuide: e.target.value })}
                placeholder="Step-by-step guide for new users on how to purchase your token..."
                rows={5}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Supported Wallets
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {['Phantom', 'MetaMask', 'Trust Wallet', 'Coinbase Wallet', 'WalletConnect', 'Ledger'].map(wallet => (
                  <button
                    key={wallet}
                    onClick={() => {
                      if (formData.supportedWallets.includes(wallet)) {
                        setFormData({
                          ...formData,
                          supportedWallets: formData.supportedWallets.filter(w => w !== wallet)
                        });
                      } else {
                        setFormData({
                          ...formData,
                          supportedWallets: [...formData.supportedWallets, wallet]
                        });
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      formData.supportedWallets.includes(wallet)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {wallet}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add custom wallet..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    setFormData({
                      ...formData,
                      supportedWallets: [...formData.supportedWallets, e.currentTarget.value.trim()]
                    });
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Wallet Connection Guide
              </label>
              <textarea
                value={formData.walletConnectionGuide}
                onChange={(e) => setFormData({ ...formData, walletConnectionGuide: e.target.value })}
                placeholder="Instructions for connecting wallet to your platform..."
                rows={4}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>
          </div>
        )}

        {/* Community Section */}
        {activeSection === 'community' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Community & Social Metrics</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Community Size
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {['Discord', 'Telegram', 'Twitter', 'Reddit', 'Medium'].map(platform => (
                  <div key={platform} className="flex items-center gap-2">
                    <label className="text-gray-400 text-sm w-24">{platform}</label>
                    <input
                      type="number"
                      value={formData.communitySize[platform.toLowerCase()] || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        communitySize: {
                          ...formData.communitySize,
                          [platform.toLowerCase()]: parseInt(e.target.value) || 0
                        }
                      })}
                      placeholder="0"
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Community Channels
              </label>
              <div className="space-y-2">
                {['Discord', 'Telegram', 'Twitter', 'Reddit', 'Medium', 'GitHub'].map(platform => (
                  <div key={platform} className="flex items-center gap-2">
                    <label className="text-gray-400 text-sm w-24">{platform}</label>
                    <input
                      type="url"
                      value={formData.communityChannels[platform.toLowerCase()] || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        communityChannels: {
                          ...formData.communityChannels,
                          [platform.toLowerCase()]: e.target.value
                        }
                      })}
                      placeholder={`${platform} URL`}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Community Programs
              </label>
              <textarea
                value={formData.communityPrograms}
                onChange={(e) => setFormData({ ...formData, communityPrograms: e.target.value })}
                placeholder="Describe community programs (ambassadors, referrals, contests, etc.)..."
                rows={4}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>
          </div>
        )}

        {/* Partnerships Section */}
        {activeSection === 'partnerships' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Partnerships & Ecosystem</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Key Partnerships
              </label>
              <div className="space-y-2">
                {formData.keyPartnerships.map((partnership, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={partnership.name}
                      onChange={(e) => {
                        const updated = [...formData.keyPartnerships];
                        updated[index].name = e.target.value;
                        setFormData({ ...formData, keyPartnerships: updated });
                      }}
                      placeholder="Partner name"
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                    <input
                      type="text"
                      value={partnership.description}
                      onChange={(e) => {
                        const updated = [...formData.keyPartnerships];
                        updated[index].description = e.target.value;
                        setFormData({ ...formData, keyPartnerships: updated });
                      }}
                      placeholder="Partnership description"
                      className="flex-[2] px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          keyPartnerships: formData.keyPartnerships.filter((_, i) => i !== index)
                        });
                      }}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setFormData({
                      ...formData,
                      keyPartnerships: [...formData.keyPartnerships, { name: '', description: '' }]
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Partnership
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Protocol Integrations
              </label>
              <input
                type="text"
                placeholder="Enter protocol names (comma-separated)"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const protocols = e.currentTarget.value.split(',').map(p => p.trim()).filter(p => p);
                    setFormData({
                      ...formData,
                      integrations: [...formData.integrations, ...protocols]
                    });
                    e.currentTarget.value = '';
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.integrations.map((integration, index) => (
                  <span key={index} className="px-3 py-1 bg-teal-600 text-white rounded-lg text-sm flex items-center gap-2">
                    {integration}
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        integrations: formData.integrations.filter((_, i) => i !== index)
                      })}
                      className="text-white hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ecosystem Projects
              </label>
              <input
                type="text"
                placeholder="Enter project names (comma-separated)"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const projects = e.currentTarget.value.split(',').map(p => p.trim()).filter(p => p);
                    setFormData({
                      ...formData,
                      ecosystemProjects: [...formData.ecosystemProjects, ...projects]
                    });
                    e.currentTarget.value = '';
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.ecosystemProjects.map((project, index) => (
                  <span key={index} className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2">
                    {project}
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        ecosystemProjects: formData.ecosystemProjects.filter((_, i) => i !== index)
                      })}
                      className="text-white hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cross-chain Bridges
              </label>
              <input
                type="text"
                placeholder="Enter bridge names (comma-separated)"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const bridges = e.currentTarget.value.split(',').map(b => b.trim()).filter(b => b);
                    setFormData({
                      ...formData,
                      crossChainBridges: [...formData.crossChainBridges, ...bridges]
                    });
                    e.currentTarget.value = '';
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.crossChainBridges.map((bridge, index) => (
                  <span key={index} className="px-3 py-1 bg-pink-600 text-white rounded-lg text-sm flex items-center gap-2">
                    {bridge}
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        crossChainBridges: formData.crossChainBridges.filter((_, i) => i !== index)
                      })}
                      className="text-white hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Roadmap Section */}
        {activeSection === 'roadmap' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Roadmap & Milestones</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Launch Date
              </label>
              <input
                type="date"
                value={formData.launchDate}
                onChange={(e) => setFormData({ ...formData, launchDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Current Development Phase
              </label>
              <select
                value={formData.currentPhase}
                onChange={(e) => setFormData({ ...formData, currentPhase: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Select phase...</option>
                <option value="Concept">Concept</option>
                <option value="Alpha">Alpha</option>
                <option value="Beta">Beta</option>
                <option value="Mainnet">Mainnet</option>
                <option value="Scaling">Scaling</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Major Milestones
              </label>
              <div className="space-y-3">
                {formData.majorMilestones.map((milestone, index) => (
                  <div key={index} className="p-4 bg-gray-700 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                      <input
                        type="text"
                        value={milestone.title}
                        onChange={(e) => {
                          const updated = [...formData.majorMilestones];
                          updated[index].title = e.target.value;
                          setFormData({ ...formData, majorMilestones: updated });
                        }}
                        placeholder="Milestone title"
                        className="px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400"
                      />
                      <input
                        type="date"
                        value={milestone.date}
                        onChange={(e) => {
                          const updated = [...formData.majorMilestones];
                          updated[index].date = e.target.value;
                          setFormData({ ...formData, majorMilestones: updated });
                        }}
                        className="px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white"
                      />
                    </div>
                    <textarea
                      value={milestone.description}
                      onChange={(e) => {
                        const updated = [...formData.majorMilestones];
                        updated[index].description = e.target.value;
                        setFormData({ ...formData, majorMilestones: updated });
                      }}
                      placeholder="Milestone description"
                      rows={2}
                      className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 mb-2"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={milestone.completed}
                          onChange={(e) => {
                            const updated = [...formData.majorMilestones];
                            updated[index].completed = e.target.checked;
                            setFormData({ ...formData, majorMilestones: updated });
                          }}
                          className="w-4 h-4"
                        />
                        Completed
                      </label>
                      <button
                        onClick={() => {
                          setFormData({
                            ...formData,
                            majorMilestones: formData.majorMilestones.filter((_, i) => i !== index)
                          });
                        }}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setFormData({
                      ...formData,
                      majorMilestones: [...formData.majorMilestones, { title: '', date: '', description: '', completed: false }]
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Milestone
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Upcoming Features
              </label>
              <div className="space-y-3">
                {formData.upcomingFeatures.map((feature, index) => (
                  <div key={index} className="p-4 bg-gray-700 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                      <input
                        type="text"
                        value={feature.feature}
                        onChange={(e) => {
                          const updated = [...formData.upcomingFeatures];
                          updated[index].feature = e.target.value;
                          setFormData({ ...formData, upcomingFeatures: updated });
                        }}
                        placeholder="Feature name"
                        className="px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400"
                      />
                      <input
                        type="text"
                        value={feature.plannedDate}
                        onChange={(e) => {
                          const updated = [...formData.upcomingFeatures];
                          updated[index].plannedDate = e.target.value;
                          setFormData({ ...formData, upcomingFeatures: updated });
                        }}
                        placeholder="Planned date (e.g., Q2 2026)"
                        className="px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400"
                      />
                    </div>
                    <div className="flex gap-2">
                      <textarea
                        value={feature.description}
                        onChange={(e) => {
                          const updated = [...formData.upcomingFeatures];
                          updated[index].description = e.target.value;
                          setFormData({ ...formData, upcomingFeatures: updated });
                        }}
                        placeholder="Feature description"
                        rows={2}
                        className="flex-1 px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400"
                      />
                      <button
                        onClick={() => {
                          setFormData({
                            ...formData,
                            upcomingFeatures: formData.upcomingFeatures.filter((_, i) => i !== index)
                          });
                        }}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setFormData({
                      ...formData,
                      upcomingFeatures: [...formData.upcomingFeatures, { feature: '', plannedDate: '', description: '' }]
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Feature
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'links' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Important Links</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Whitepaper URL
              </label>
              <input
                type="url"
                value={formData.whitepaperUrl}
                onChange={(e) => setFormData({ ...formData, whitepaperUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Litepaper URL
              </label>
              <input
                type="url"
                value={formData.litepaperUrl}
                onChange={(e) => setFormData({ ...formData, litepaperUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Documentation URL
              </label>
              <input
                type="url"
                value={formData.documentationUrl}
                onChange={(e) => setFormData({ ...formData, documentationUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                GitHub URL
              </label>
              <input
                type="url"
                value={formData.githubUrl}
                onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                placeholder="https://github.com/..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Web3 Details'}
        </button>
      </div>
    </div>
  );
};

export default Web3Details;

