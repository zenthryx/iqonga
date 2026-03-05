/**
 * Stub: Solana/ZTR token access removed for Iqonga v1.
 * All methods return safe defaults so Admin and other routes load without @solana/web3.js.
 */

const database = require('../database/connection');

class TokenAccessService {
  constructor() {
    this.ztrTokenAddress = '';
    this.requiredTokens = 0;
  }

  async checkTokenAccess(_walletAddress) {
    return {
      hasAccess: true,
      userBalance: 0,
      requiredThreshold: 0,
      tokenAddress: this.ztrTokenAddress,
      shortfall: 0
    };
  }

  async getZTRBalance(_walletAddress) {
    return 0;
  }

  async updateUserAccessStatus(_userId, _hasAccess, _tokenData) {
    // no-op
  }

  getAccessRequirements() {
    return {
      tokenAddress: this.ztrTokenAddress,
      requiredTokens: this.requiredTokens,
      company: 'Zenthryx AI Lab',
      platform: 'Iqonga - A Product of Zenthryx AI Lab'
    };
  }

  async validateWalletAccess(walletAddress) {
    if (!walletAddress || walletAddress.length < 8) {
      return { isValid: false, hasAccess: false, error: 'Invalid wallet address' };
    }
    const accessResult = await this.checkTokenAccess(walletAddress);
    return {
      isValid: true,
      hasAccess: accessResult.hasAccess,
      tokenData: accessResult
    };
  }
}

module.exports = new TokenAccessService();
