const { 
  Connection, 
  PublicKey, 
  Transaction,
  Keypair,
  sendAndConfirmTransaction
} = require('@solana/web3.js');
const { 
  getAssociatedTokenAddress, 
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID 
} = require('@solana/spl-token');
const database = require('../database/connection');
const logger = require('../utils/logger');

class USDCPayoutService {
  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://lb.drpc.org/solana/AlwNrDhsrEZXoXJDet6LGcYqdigSZtkR8K9yEklbR4ac',
      'confirmed'
    );
    
    // Treasury wallet (sender)
    this.treasuryWallet = new PublicKey(
      process.env.TREASURY_WALLET_ADDRESS || 
      process.env.TREASURY_WALLET || 
      'DMBbyCHCvTXwWjt6QFFBeTqZ8G6E9jNy1TNbKYZpL79w'
    );
    
    // Treasury private key for signing (MUST be set in production)
    const treasuryPrivateKey = process.env.TREASURY_WALLET_PRIVATE_KEY;
    if (treasuryPrivateKey) {
      // Handle base58 or array format
      if (typeof treasuryPrivateKey === 'string') {
        try {
          const keyArray = JSON.parse(treasuryPrivateKey);
          this.treasuryKeypair = Keypair.fromSecretKey(Uint8Array.from(keyArray));
        } catch {
          // Try as base58
          const bs58 = require('bs58');
          this.treasuryKeypair = Keypair.fromSecretKey(bs58.decode(treasuryPrivateKey));
        }
      }
    } else {
      logger.warn('TREASURY_WALLET_PRIVATE_KEY not set - USDC payouts will fail in production');
      // For development, create a dummy keypair (will fail on real transfers)
      this.treasuryKeypair = null;
    }
    
    // USDC mint address (mainnet)
    this.USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  }

  /**
   * Send USDC to a recipient wallet
   * @param {string} recipientWallet - Recipient's Solana wallet address
   * @param {number} usdcAmount - Amount in USDC (will be converted to 6 decimals)
   * @returns {Promise<string>} Transaction signature
   */
  async sendUSDC(recipientWallet, usdcAmount) {
    try {
      if (!this.treasuryKeypair) {
        throw new Error('Treasury wallet private key not configured');
      }

      const recipientPubkey = new PublicKey(recipientWallet);
      const usdcAmountRaw = Math.floor(usdcAmount * 1e6); // USDC has 6 decimals

      logger.info(`Sending ${usdcAmount} USDC to ${recipientWallet}`);

      // Get treasury's USDC token account
      const treasuryUsdcAccount = await getAssociatedTokenAddress(
        this.USDC_MINT,
        this.treasuryWallet
      );

      // Get recipient's USDC token account
      const recipientUsdcAccount = await getAssociatedTokenAddress(
        this.USDC_MINT,
        recipientPubkey
      );

      // Create transaction
      const transaction = new Transaction();

      // Check if treasury USDC account exists
      try {
        const treasuryAccount = await getAccount(this.connection, treasuryUsdcAccount);
        const treasuryBalance = Number(treasuryAccount.amount) / 1e6;
        
        if (treasuryBalance < usdcAmount) {
          throw new Error(`Insufficient USDC in treasury. Required: ${usdcAmount}, Available: ${treasuryBalance}`);
        }
        
        logger.info(`Treasury USDC balance: ${treasuryBalance} USDC`);
      } catch (error) {
        if (error.message.includes('Insufficient')) {
          throw error;
        }
        logger.error('Treasury USDC account error:', error);
        throw new Error('Treasury USDC account not found or inaccessible');
      }

      // Check if recipient's USDC token account exists, create if not
      let recipientAccountExists = false;
      try {
        await getAccount(this.connection, recipientUsdcAccount);
        recipientAccountExists = true;
        logger.info('Recipient USDC token account exists');
      } catch (error) {
        logger.info('Recipient USDC token account does not exist, creating...');
        // Treasury pays for account creation
        const createAccountInstruction = createAssociatedTokenAccountInstruction(
          this.treasuryWallet, // payer
          recipientUsdcAccount, // associated token account
          recipientPubkey, // owner
          this.USDC_MINT // mint
        );
        transaction.add(createAccountInstruction);
      }

      // Create transfer instruction (from treasury to recipient)
      const transferInstruction = createTransferInstruction(
        treasuryUsdcAccount, // source (treasury)
        recipientUsdcAccount, // destination (recipient)
        this.treasuryWallet, // authority (treasury signs)
        usdcAmountRaw
      );

      transaction.add(transferInstruction);

      // Get recent blockhash
      const { blockhash } = await this.connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.treasuryWallet;

      // Sign and send transaction
      transaction.sign(this.treasuryKeypair);

      logger.info('Sending USDC transfer transaction...');
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.treasuryKeypair],
        {
          commitment: 'confirmed',
          skipPreflight: false
        }
      );

      logger.info(`USDC transfer successful. Signature: ${signature}`);
      return signature;

    } catch (error) {
      logger.error('Error sending USDC:', error);
      throw new Error(`Failed to send USDC: ${error.message}`);
    }
  }

  /**
   * Verify USDC transfer transaction
   * @param {string} signature - Transaction signature
   * @returns {Promise<Object>} Verification result
   */
  async verifyTransfer(signature) {
    try {
      const transaction = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      if (transaction.meta.err) {
        return { success: false, error: 'Transaction failed', details: transaction.meta.err };
      }

      return {
        success: true,
        signature: signature,
        confirmed: true
      };
    } catch (error) {
      logger.error('Error verifying transfer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get treasury USDC balance
   * @returns {Promise<number>} USDC balance
   */
  async getTreasuryBalance() {
    try {
      const treasuryUsdcAccount = await getAssociatedTokenAddress(
        this.USDC_MINT,
        this.treasuryWallet
      );

      const account = await getAccount(this.connection, treasuryUsdcAccount);
      return Number(account.amount) / 1e6;
    } catch (error) {
      logger.error('Error getting treasury balance:', error);
      return 0;
    }
  }
}

module.exports = USDCPayoutService;

