const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const logger = require('../utils/logger');

class LighthouseService {
  constructor() {
    this.apiKey = process.env.LIGHTHOUSE_API_KEY;
    this.uploadEndpoint = process.env.LIGHTHOUSE_UPLOAD_ENDPOINT;
    this.gateway = process.env.LIGHTHOUSE_GATEWAY;
    
    if (!this.apiKey) {
      logger.warn('Lighthouse API key not configured');
    }
  }

  /**
   * Upload AI Agent NFT metadata to Lighthouse
   * @param {Object} metadata - NFT metadata object
   * @returns {Promise<string>} - IPFS hash
   */
  async uploadNFTMetadata(metadata) {
    try {
      const metadataJson = JSON.stringify(metadata, null, 2);
      
      const formData = new FormData();
      formData.append('file', Buffer.from(metadataJson), {
        filename: `agent-${metadata.name.replace(/\s+/g, '-').toLowerCase()}-metadata.json`,
        contentType: 'application/json'
      });

      const response = await axios.post(`${this.uploadEndpoint}/api/v0/add`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const ipfsHash = response.data.Hash;
      logger.info(`NFT metadata uploaded to Lighthouse: ${ipfsHash}`);
      
      return {
        ipfsHash,
        url: `${this.gateway}/ipfs/${ipfsHash}`,
        gatewayUrl: `https://ipfs.io/ipfs/${ipfsHash}` // Fallback gateway
      };

    } catch (error) {
      logger.error('Failed to upload NFT metadata to Lighthouse:', error);
      throw new Error(`Lighthouse upload failed: ${error.message}`);
    }
  }

  /**
   * Upload AI Agent avatar image to Lighthouse
   * @param {Buffer|string} imageData - Image buffer or file path
   * @param {string} agentName - Name for the file
   * @returns {Promise<string>} - IPFS hash
   */
  async uploadAgentAvatar(imageData, agentName) {
    try {
      const formData = new FormData();
      
      if (typeof imageData === 'string') {
        // File path provided
        formData.append('file', fs.createReadStream(imageData));
      } else {
        // Buffer provided
        formData.append('file', imageData, {
          filename: `${agentName.replace(/\s+/g, '-').toLowerCase()}-avatar.png`,
          contentType: 'image/png'
        });
      }

      const response = await axios.post(`${this.uploadEndpoint}/api/v0/add`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const ipfsHash = response.data.Hash;
      logger.info(`Agent avatar uploaded to Lighthouse: ${ipfsHash}`);
      
      return {
        ipfsHash,
        url: `${this.gateway}/ipfs/${ipfsHash}`,
        gatewayUrl: `https://ipfs.io/ipfs/${ipfsHash}`
      };

    } catch (error) {
      logger.error('Failed to upload avatar to Lighthouse:', error);
      throw new Error(`Avatar upload failed: ${error.message}`);
    }
  }

  /**
   * Upload AI Agent training data (encrypted)
   * @param {Object} trainingData - AI agent configuration and training data
   * @param {string} agentId - Agent identifier
   * @returns {Promise<string>} - IPFS hash
   */
  async uploadAgentTrainingData(trainingData, agentId) {
    try {
      const encryptedData = await this.encryptSensitiveData(trainingData);
      
      const formData = new FormData();
      formData.append('file', Buffer.from(JSON.stringify(encryptedData)), {
        filename: `agent-${agentId}-training-data.json`,
        contentType: 'application/json'
      });

      const response = await axios.post(`${this.uploadEndpoint}/api/v0/add`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const ipfsHash = response.data.Hash;
      logger.info(`Agent training data uploaded to Lighthouse: ${ipfsHash}`);
      
      return {
        ipfsHash,
        url: `${this.gateway}/ipfs/${ipfsHash}`,
        encrypted: true
      };

    } catch (error) {
      logger.error('Failed to upload training data to Lighthouse:', error);
      throw new Error(`Training data upload failed: ${error.message}`);
    }
  }

  /**
   * Update dynamic NFT metadata (for evolving agents)
   * @param {string} existingHash - Current metadata IPFS hash
   * @param {Object} updates - Metadata updates
   * @returns {Promise<string>} - New IPFS hash
   */
  async updateNFTMetadata(existingHash, updates) {
    try {
      // Fetch existing metadata
      const existingMetadata = await this.fetchMetadata(existingHash);
      
      // Merge updates
      const updatedMetadata = {
        ...existingMetadata,
        ...updates,
        attributes: this.mergeAttributes(existingMetadata.attributes, updates.attributes),
        updated_at: new Date().toISOString()
      };

      // Upload updated metadata
      return await this.uploadNFTMetadata(updatedMetadata);

    } catch (error) {
      logger.error('Failed to update NFT metadata:', error);
      throw new Error(`Metadata update failed: ${error.message}`);
    }
  }

  /**
   * Fetch metadata from IPFS
   * @param {string} ipfsHash - IPFS hash
   * @returns {Promise<Object>} - Metadata object
   */
  async fetchMetadata(ipfsHash) {
    try {
      const response = await axios.get(`${this.gateway}/ipfs/${ipfsHash}`);
      return response.data;
    } catch (error) {
      // Try fallback gateway
      try {
        const fallbackResponse = await axios.get(`https://ipfs.io/ipfs/${ipfsHash}`);
        return fallbackResponse.data;
      } catch (fallbackError) {
        logger.error(`Failed to fetch metadata from IPFS: ${ipfsHash}`, error);
        throw new Error(`Metadata fetch failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate complete NFT metadata for AI Agent
   * @param {Object} agentConfig - AI agent configuration
   * @param {string} avatarIpfsHash - Avatar image IPFS hash
   * @param {Object} performanceStats - Agent performance data
   * @returns {Object} - Complete NFT metadata
   */
  generateNFTMetadata(agentConfig, avatarIpfsHash, performanceStats = {}) {
    const metadata = {
      name: agentConfig.name,
      description: `AI Agent specialized in ${agentConfig.specialization} with ${agentConfig.personality} personality`,
      image: `${this.gateway}/ipfs/${avatarIpfsHash}`,
      external_url: `https://www.iqonga.org/agent/${agentConfig.id}`,
      
      attributes: [
        {
          trait_type: "Personality",
          value: agentConfig.personality
        },
        {
          trait_type: "Specialization",
          value: agentConfig.specialization
        },
        {
          trait_type: "Platforms",
          value: agentConfig.platforms.join(", ")
        },
        {
          trait_type: "Experience Level",
          value: this.calculateExperienceLevel(performanceStats.totalPosts || 0)
        },
        {
          trait_type: "Posts Generated",
          value: performanceStats.totalPosts || 0,
          display_type: "number"
        },
        {
          trait_type: "Avg Engagement Rate",
          value: performanceStats.avgEngagement || 0,
          display_type: "boost_percentage"
        },
        {
          trait_type: "Reputation Score",
          value: performanceStats.reputationScore || 500,
          max_value: 1000
        },
        {
          trait_type: "Creation Date",
          value: Math.floor(Date.now() / 1000),
          display_type: "date"
        },
        {
          trait_type: "Rarity Tier",
          value: this.calculateRarityTier(agentConfig, performanceStats)
        }
      ],
      
      properties: {
        category: "AI Agent",
        creators: [
          {
            address: agentConfig.ownerWallet,
            share: 95
          },
          {
            address: process.env.PLATFORM_WALLET_ADDRESS,
            share: 5
          }
        ],
        files: [
          {
            uri: `${this.gateway}/ipfs/${avatarIpfsHash}`,
            type: "image/png"
          }
        ]
      },
      
      ai_specific: {
        model_version: "v1.0",
        personality_hash: this.hashPersonality(agentConfig),
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      }
    };

    return metadata;
  }

  /**
   * Calculate experience level based on posts
   * @param {number} totalPosts 
   * @returns {string}
   */
  calculateExperienceLevel(totalPosts) {
    if (totalPosts >= 5000) return "Legendary";
    if (totalPosts >= 1000) return "Expert";
    if (totalPosts >= 100) return "Intermediate";
    return "Novice";
  }

  /**
   * Calculate rarity tier
   * @param {Object} agentConfig 
   * @param {Object} performanceStats 
   * @returns {string}
   */
  calculateRarityTier(agentConfig, performanceStats) {
    let rarityScore = 0;
    
    // Personality rarity
    const personalityRarity = {
      "Quirky": 5,
      "Authoritative": 4,
      "Creative": 3,
      "Witty": 2,
      "Professional": 1
    };
    rarityScore += personalityRarity[agentConfig.personality] || 1;
    
    // Specialization rarity
    if (agentConfig.specialization === "Custom") rarityScore += 5;
    else if (agentConfig.specialization === "Creative") rarityScore += 3;
    else if (agentConfig.specialization === "Technology") rarityScore += 2;
    
    // Performance bonus
    if (performanceStats.avgEngagement > 20) rarityScore += 3;
    else if (performanceStats.avgEngagement > 15) rarityScore += 2;
    else if (performanceStats.avgEngagement > 10) rarityScore += 1;
    
    if (rarityScore >= 10) return "Legendary";
    if (rarityScore >= 7) return "Epic";
    if (rarityScore >= 5) return "Rare";
    if (rarityScore >= 3) return "Uncommon";
    return "Common";
  }

  /**
   * Create personality hash for uniqueness
   * @param {Object} agentConfig 
   * @returns {string}
   */
  hashPersonality(agentConfig) {
    const crypto = require('crypto');
    const personalityString = JSON.stringify({
      personality: agentConfig.personality,
      specialization: agentConfig.specialization,
      tone: agentConfig.tone,
      platforms: agentConfig.platforms.sort()
    });
    
    return crypto.createHash('sha256').update(personalityString).digest('hex').substring(0, 16);
  }

  /**
   * Merge attribute arrays for metadata updates
   * @param {Array} existing 
   * @param {Array} updates 
   * @returns {Array}
   */
  mergeAttributes(existing = [], updates = []) {
    const merged = [...existing];
    
    updates.forEach(update => {
      const existingIndex = merged.findIndex(attr => attr.trait_type === update.trait_type);
      if (existingIndex >= 0) {
        merged[existingIndex] = update;
      } else {
        merged.push(update);
      }
    });
    
    return merged;
  }

  /**
   * Encrypt sensitive data before upload
   * @param {Object} data 
   * @returns {Promise<Object>}
   */
  async encryptSensitiveData(data) {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      algorithm: algorithm,
      timestamp: Date.now()
    };
  }

  /**
   * Get storage stats
   * @returns {Promise<Object>}
   */
  async getStorageStats() {
    try {
      // This would call Lighthouse API to get usage stats
      // For now, return mock data
      return {
        totalStorage: "2.3 GB",
        filesStored: 1247,
        bandwidthUsed: "45.7 GB",
        cost: "$10/month"
      };
    } catch (error) {
      logger.error('Failed to get storage stats:', error);
      return null;
    }
  }
}

module.exports = new LighthouseService(); 