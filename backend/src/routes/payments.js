/**
 * Payment Routes - Handle payment processing
 * Supports Irembo Pay, Stripe, and other providers
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const PaymentProviderService = require('../services/PaymentProviderService');
const logger = require('../utils/logger');
const database = require('../database/connection');

// Initialize payment providers (lazy load to avoid circular dependencies)
let IremboPayService;
try {
  IremboPayService = require('../services/IremboPayService');
  PaymentProviderService.registerProvider('irembo_pay', IremboPayService);
} catch (error) {
  logger.warn('Irembo Pay service not available:', error.message);
}

// GET /api/payments/providers - Get available payment providers for user
router.get('/providers', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const providers = PaymentProviderService.getAvailableProviders(user);
    
    // Extract provider IDs for frontend
    const providerIds = providers.map(p => p.id);
    
    res.json({
      success: true,
      data: {
        providers: providerIds, // Return array of provider IDs
        providers_detail: providers, // Also return full details if needed
        user_tier: user.user_tier,
        pricing_multiplier: user.pricing_multiplier,
        country_code: user.country_code || 'US'
      }
    });
  } catch (error) {
    logger.error('Error getting payment providers:', error);
    res.status(500).json({ error: 'Failed to get payment providers' });
  }
});

// GET /api/payments/packages - Get credit packages with user-specific pricing
router.get('/packages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const currency = req.query.currency || 'USD';
    
    // Get user details
    const userResult = await database.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get all active packages
    const packagesResult = await database.query(`
      SELECT * FROM credit_packages
      WHERE is_active = true
      ORDER BY display_order ASC
    `);
    
    // Calculate pricing for each package
    const packages = packagesResult.rows.map(pkg => {
      const pricing = PaymentProviderService.calculatePrice(pkg, user, currency);
      
      return {
        id: pkg.id,
        name: pkg.package_name,
        credits: pkg.credits,
        bonus_credits: pkg.bonus_credits,
        total_credits: pkg.total_credits,
        base_price: pricing.base_price,
        final_price: pricing.final_price,
        currency: currency,
        savings: pricing.savings,
        is_popular: pkg.is_popular,
        description: pkg.description,
        pricing_details: {
          user_tier: user.user_tier,
          multiplier: pricing.multiplier,
          is_discounted: pricing.is_discounted
        }
      };
    });
    
    res.json({
      success: true,
      data: {
        packages,
        user_tier: user.user_tier,
        pricing_multiplier: user.pricing_multiplier
      }
    });
    
  } catch (error) {
    logger.error('Error getting credit packages:', error);
    res.status(500).json({ error: 'Failed to get credit packages' });
  }
});

// POST /api/payments/create - Create a payment
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      package_id,
      provider,
      payment_method,
      currency = 'USD',
      return_url,
      cancel_url
    } = req.body;

    if (!package_id || !provider) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create payment
    const payment = await PaymentProviderService.createPayment({
      userId: userId,
      packageId: package_id,
      provider: provider,
      paymentMethod: payment_method,
      currency: currency,
      returnUrl: return_url || `${process.env.FRONTEND_URL}/payments/success`,
      cancelUrl: cancel_url || `${process.env.FRONTEND_URL}/payments/cancelled`
    });

    res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    logger.error('Error creating payment:', error);
    res.status(500).json({ 
      error: 'Failed to create payment',
      details: error.message 
    });
  }
});

// POST /api/payments/webhook/irembo-pay - Irembo Pay webhook
router.post('/webhook/irembo-pay', async (req, res) => {
  try {
    logger.info('Irembo Pay webhook received');
    
    const webhookData = req.body;
    
    // Process webhook
    const result = await PaymentProviderService.handleWebhook('irembo_pay', webhookData);
    
    // Respond to Irembo Pay
    res.status(200).json({
      success: true,
      message: 'Webhook processed'
    });
    
  } catch (error) {
    logger.error('Error processing Irembo Pay webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// POST /api/payments/webhook/stripe - Stripe webhook (if using Stripe)
router.post('/webhook/stripe', async (req, res) => {
  try {
    logger.info('Stripe webhook received');
    
    const webhookData = req.body;
    
    // Process webhook
    const result = await PaymentProviderService.handleWebhook('stripe', webhookData);
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    logger.error('Error processing Stripe webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// GET /api/payments/transaction/:transactionId - Get transaction status
router.get('/transaction/:transactionId', authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;
    
    const transaction = await PaymentProviderService.getTransaction(transactionId);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Verify transaction belongs to user
    if (transaction.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      success: true,
      data: transaction
    });
    
  } catch (error) {
    logger.error('Error getting transaction:', error);
    res.status(500).json({ error: 'Failed to get transaction' });
  }
});

// GET /api/payments/history - Get user payment history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    
    const history = await PaymentProviderService.getUserPaymentHistory(userId, limit);
    
    res.json({
      success: true,
      data: {
        transactions: history
      }
    });
    
  } catch (error) {
    logger.error('Error getting payment history:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

// GET /api/payments/saved-methods - Get user saved payment methods
router.get('/saved-methods', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const methods = await database.query(`
      SELECT id, provider, method_type, last_four, brand, 
             phone_number, is_default, nickname, expiry_month, expiry_year
      FROM user_payment_methods
      WHERE user_id = $1 AND is_active = true
      ORDER BY is_default DESC, created_at DESC
    `, [userId]);
    
    res.json({
      success: true,
      data: {
        payment_methods: methods.rows
      }
    });
    
  } catch (error) {
    logger.error('Error getting saved payment methods:', error);
    res.status(500).json({ error: 'Failed to get payment methods' });
  }
});

// POST /api/payments/mock-complete/:transactionId - Mock payment completion (dev only)
if (process.env.NODE_ENV === 'development') {
  router.post('/mock-complete/:transactionId', authenticateToken, async (req, res) => {
    try {
      const { transactionId } = req.params;
      
      logger.info(`🧪 Mock completing payment: ${transactionId}`);
      
      // Get transaction
      const transaction = await PaymentProviderService.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      
      // Update to completed
      await PaymentProviderService.updateTransaction(transactionId, 'completed', {
        mock: true,
        completed_at: new Date().toISOString()
      });
      
      // Add credits
      await PaymentProviderService.addCreditsToUser(
        transaction.user_id,
        transaction.credits_purchased,
        transactionId
      );
      
      res.json({
        success: true,
        message: 'Mock payment completed',
        credits_added: transaction.credits_purchased
      });
      
    } catch (error) {
      logger.error('Error mock completing payment:', error);
      res.status(500).json({ error: 'Failed to complete mock payment' });
    }
  });
}

module.exports = router;

