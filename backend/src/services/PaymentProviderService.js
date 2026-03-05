/**
 * Payment Provider Service - Abstract payment processing
 * Supports multiple payment providers including Irembo Pay (Rwanda)
 */

const database = require('../database/connection');
const logger = require('../utils/logger');

class PaymentProviderService {
  constructor() {
    this.providers = new Map();
    this.exchangeRates = {
      'USD_TO_RWF': 1300, // 1 USD = 1300 RWF (update regularly)
      'RWF_TO_USD': 0.00077, // 1 RWF = 0.00077 USD
    };
  }

  /**
   * Register a payment provider
   * @param {string} providerName - 'irembo_pay', 'stripe', 'paypal'
   * @param {Object} providerInstance - Payment provider instance
   */
  registerProvider(providerName, providerInstance) {
    this.providers.set(providerName, providerInstance);
    logger.info(`Payment provider registered: ${providerName}`);
  }

  /**
   * Get available payment providers for a user
   * @param {Object} user - User object
   * @returns {Array} Available providers
   */
  getAvailableProviders(user) {
    const providers = [];
    
    // Irembo Pay - Available to all users (Rwanda payment gateway)
    if (this.providers.has('irembo_pay')) {
      const iremboService = this.providers.get('irembo_pay');
      if (iremboService.isAvailable()) {
        providers.push({
          id: 'irembo_pay',
          name: 'Irembo Pay',
          description: 'Credit Card & Mobile Money (MTN, Airtel)',
          icon: '💳',
          supported_methods: ['credit_card', 'mobile_money'],
          currencies: ['RWF', 'USD'],
          recommended: user.country_code === 'RW'
        });
      }
    }
    
    // Stripe - for international users
    if (this.providers.has('stripe')) {
      providers.push({
        id: 'stripe',
        name: 'Credit/Debit Card',
        description: 'Visa, Mastercard, Amex',
        icon: '💳',
        supported_methods: ['credit_card', 'debit_card'],
        currencies: ['USD', 'EUR', 'GBP', 'RWF'],
        recommended: user.country_code !== 'RW'
      });
    }
    
    // PayPal - optional
    if (this.providers.has('paypal')) {
      providers.push({
        id: 'paypal',
        name: 'PayPal',
        description: 'PayPal Balance or Card',
        icon: '🅿️',
        supported_methods: ['paypal_balance', 'credit_card'],
        currencies: ['USD', 'EUR'],
        recommended: false
      });
    }
    
    return providers;
  }

  /**
   * Calculate credit package price for user
   * @param {Object} pkg - Credit package
   * @param {Object} user - User object
   * @param {string} currency - Target currency
   * @returns {Object} Price details
   */
  calculatePrice(pkg, user, currency = 'USD') {
    let basePrice = pkg.base_price_usd;
    
    // Convert to target currency if needed
    if (currency === 'RWF') {
      basePrice = pkg.base_price_rwf || (pkg.base_price_usd * this.exchangeRates.USD_TO_RWF);
    }
    
    // Apply pricing multiplier for non-token holders
    const multiplier = user.pricing_multiplier || 1.20;
    const finalPrice = Math.ceil(basePrice * multiplier);
    
    // Calculate savings for token holders
    const standardPrice = Math.ceil(basePrice * 1.20);
    const savings = user.user_tier === 'token_holder' ? (standardPrice - finalPrice) : 0;
    
    return {
      base_price: basePrice,
      multiplier: multiplier,
      final_price: finalPrice,
      currency: currency,
      savings: savings,
      is_discounted: user.user_tier === 'token_holder',
      credits: pkg.total_credits
    };
  }

  /**
   * Create a payment transaction
   * @param {Object} params - Payment parameters
   * @returns {Object} Payment transaction
   */
  async createPayment(params) {
    const {
      userId,
      packageId,
      provider,
      paymentMethod,
      currency = 'USD',
      returnUrl,
      cancelUrl
    } = params;

    try {
      // Get user details
      const userResult = await database.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const user = userResult.rows[0];
      
      // Get package details
      const packageResult = await database.query(
        'SELECT * FROM credit_packages WHERE id = $1 AND is_active = true',
        [packageId]
      );
      
      if (packageResult.rows.length === 0) {
        throw new Error('Package not found');
      }
      
      const pkg = packageResult.rows[0];
      
      // Calculate price
      const pricing = this.calculatePrice(pkg, user, currency);
      
      // Get payment provider
      const paymentProvider = this.providers.get(provider);
      
      if (!paymentProvider) {
        throw new Error(`Payment provider not available: ${provider}`);
      }
      
      // Create transaction record
      const transactionId = `${provider}_${Date.now()}_${userId.slice(0, 8)}`;
      
      const transaction = await database.query(`
        INSERT INTO payment_transactions (
          user_id, payment_provider, payment_method, transaction_id,
          amount, currency, credits_purchased, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        userId,
        provider,
        paymentMethod,
        transactionId,
        pricing.final_price,
        currency,
        pricing.credits,
        'pending'
      ]);
      
      const dbTransaction = transaction.rows[0];
      
      // Create payment with provider
      const paymentResult = await paymentProvider.createPayment({
        transactionId: dbTransaction.transaction_id,
        amount: pricing.final_price,
        currency: currency,
        description: `${pricing.credits} credits for Iqonga`,
        userId: userId,
        userEmail: user.email,
        userPhone: user.irembo_pay_phone,
        returnUrl: returnUrl,
        cancelUrl: cancelUrl,
        metadata: {
          user_id: userId,
          package_id: packageId,
          credits: pricing.credits,
          user_tier: user.user_tier
        }
      });
      
      // Update transaction with provider data
      await database.query(`
        UPDATE payment_transactions
        SET external_reference = $1,
            provider_data = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [
        paymentResult.externalReference || paymentResult.id,
        JSON.stringify(paymentResult),
        dbTransaction.id
      ]);
      
      return {
        success: true,
        transaction_id: dbTransaction.transaction_id,
        payment_url: paymentResult.payment_url,
        payment_data: paymentResult,
        amount: pricing.final_price,
        currency: currency,
        credits: pricing.credits
      };
      
    } catch (error) {
      logger.error('Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Handle payment webhook
   * @param {string} provider - Payment provider
   * @param {Object} webhookData - Webhook payload
   * @returns {Object} Processing result
   */
  async handleWebhook(provider, webhookData) {
    try {
      const paymentProvider = this.providers.get(provider);
      
      if (!paymentProvider) {
        throw new Error(`Payment provider not found: ${provider}`);
      }
      
      // Verify and process webhook
      const webhookResult = await paymentProvider.handleWebhook(webhookData);
      
      // Update transaction
      const updateResult = await this.updateTransaction(
        webhookResult.transactionId,
        webhookResult.status,
        webhookResult.data
      );
      
      // If payment successful, add credits
      if (webhookResult.status === 'completed') {
        await this.addCreditsToUser(
          updateResult.user_id,
          updateResult.credits_purchased,
          updateResult.transaction_id
        );
      }
      
      return {
        success: true,
        status: webhookResult.status,
        transaction_id: webhookResult.transactionId
      };
      
    } catch (error) {
      logger.error('Error handling webhook:', error);
      throw error;
    }
  }

  /**
   * Update payment transaction status
   * @param {string} transactionId - Transaction ID
   * @param {string} status - New status
   * @param {Object} webhookData - Webhook data
   * @returns {Object} Updated transaction
   */
  async updateTransaction(transactionId, status, webhookData) {
    const result = await database.query(`
      UPDATE payment_transactions
      SET status = $1,
          webhook_received_at = NOW(),
          webhook_data = $2,
          completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
          updated_at = NOW()
      WHERE transaction_id = $3
      RETURNING *
    `, [status, JSON.stringify(webhookData), transactionId]);
    
    if (result.rows.length === 0) {
      throw new Error('Transaction not found');
    }
    
    return result.rows[0];
  }

  /**
   * Add credits to user account
   * @param {string} userId - User ID
   * @param {number} credits - Credits to add
   * @param {string} transactionId - Transaction reference
   */
  async addCreditsToUser(userId, credits, transactionId) {
    try {
      // Add credits using existing credit service
      const CreditService = require('./CreditService');
      
      await CreditService.addCredits(
        userId,
        credits,
        `Payment: ${transactionId}`,
        'payment'
      );
      
      logger.info(`Added ${credits} credits to user ${userId} from payment ${transactionId}`);
      
    } catch (error) {
      logger.error('Error adding credits to user:', error);
      throw error;
    }
  }

  /**
   * Get payment transaction
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Transaction
   */
  async getTransaction(transactionId) {
    const result = await database.query(
      'SELECT * FROM payment_transactions WHERE transaction_id = $1',
      [transactionId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }

  /**
   * Get user payment history
   * @param {string} userId - User ID
   * @param {number} limit - Limit
   * @returns {Array} Transactions
   */
  async getUserPaymentHistory(userId, limit = 50) {
    const result = await database.query(`
      SELECT * FROM payment_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);
    
    return result.rows;
  }

  /**
   * Convert currency
   * @param {number} amount - Amount
   * @param {string} from - From currency
   * @param {string} to - To currency
   * @returns {number} Converted amount
   */
  convertCurrency(amount, from, to) {
    if (from === to) return amount;
    
    const key = `${from}_TO_${to}`;
    const rate = this.exchangeRates[key];
    
    if (!rate) {
      logger.warn(`Exchange rate not found: ${key}, using 1:1`);
      return amount;
    }
    
    return Math.ceil(amount * rate);
  }
}

// Export singleton instance
module.exports = new PaymentProviderService();

