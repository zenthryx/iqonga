/**
 * Iqonga v1: Blockchain (Solana) removed. This stub exists so route files that
 * still require SimpleSolanaService do not crash. All methods throw.
 */
const NOT_AVAILABLE = 'Blockchain is not available in Iqonga v1.';

function throwNotAvailable() {
  throw new Error(NOT_AVAILABLE);
}

class SimpleSolanaService {
  constructor() {
    this.connection = {
      sendRawTransaction: () => Promise.reject(new Error(NOT_AVAILABLE)),
      confirmTransaction: () => Promise.reject(new Error(NOT_AVAILABLE)),
      getTransaction: () => Promise.reject(new Error(NOT_AVAILABLE)),
    };
  }

  async createAIAgent() {
    throwNotAvailable();
  }

  async mintNFTForAgent() {
    throwNotAvailable();
  }

  async purchaseCreditsWithZTR() {
    throwNotAvailable();
  }

  async purchaseCredits() {
    throwNotAvailable();
  }

  async createAndUploadMetadata() {
    throwNotAvailable();
  }

  async getAgentData() {
    throwNotAvailable();
  }

  async updateAgentPerformance() {
    throwNotAvailable();
  }

  async updatePlatformPricing() {
    throwNotAvailable();
  }

  async verifyPayment() {
    throwNotAvailable();
  }
}

module.exports = { SimpleSolanaService };
