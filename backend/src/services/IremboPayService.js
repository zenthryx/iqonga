/**
 * Irembo Pay Service - Rwanda Payment Integration
 * Ready for Irembo Pay API integration when available
 * 
 * Irembo Pay supports:
 * - Mobile Money (MTN, Airtel, Tigo)
 * - Bank Cards (Rwandan banks)
 * - Government services integration
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

class IremboPayService {
  constructor() {
    // Configuration (to be set when API is available)
    this.apiUrl = process.env.IREMBO_PAY_API_URL || 'https://api.irembo.gov.rw/pay/v1';
    this.apiKey = process.env.IREMBO_PAY_API_KEY;
    this.merchantId = process.env.IREMBO_PAY_MERCHANT_ID;
    this.webhookSecret = process.env.IREMBO_PAY_WEBHOOK_SECRET;
    
    // Payment status mapping
    this.statusMap = {
      'INITIATED': 'pending',
      'PENDING': 'processing',
      'SUCCESS': 'completed',
      'COMPLETED': 'completed',
      'FAILED': 'failed',
      'CANCELLED': 'cancelled',
      'REFUNDED': 'refunded'
    };
  }

  /**
   * Check if Irembo Pay is configured and available
   * @returns {boolean} Is available
   */
  isAvailable() {
    const isConfigured = !!(this.apiKey && this.merchantId);
    
    if (!isConfigured) {
      logger.info('Irembo Pay not yet configured. Awaiting API credentials.');
    }
    
    return isConfigured;
  }

  /**
   * Create a payment transaction
   * @param {Object} params - Payment parameters
   * @returns {Object} Payment result
   */
  async createPayment(params) {
    const {
      transactionId,
      amount,
      currency = 'RWF',
      description,
      userId,
      userEmail,
      userPhone,
      returnUrl,
      cancelUrl,
      metadata
    } = params;

    if (!this.isAvailable()) {
      // Mock response for testing until API is available
      return this.createMockPayment(params);
    }

    try {
      // Prepare payment request (adjust based on actual Irembo Pay API)
      const paymentRequest = {
        merchant_id: this.merchantId,
        transaction_id: transactionId,
        amount: amount,
        currency: currency,
        description: description,
        customer: {
          email: userEmail,
          phone: userPhone,
          reference: userId
        },
        callback_url: `${process.env.BACKEND_URL}/api/payments/webhook/irembo-pay`,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        metadata: metadata
      };

      // Sign request (if required by Irembo Pay)
      const signature = this.generateSignature(paymentRequest);
      
      // Make API call
      const response = await axios.post(
        `${this.apiUrl}/payments/initiate`,
        paymentRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Signature': signature
          },
          timeout: 30000
        }
      );

      logger.info(`Irembo Pay payment created: ${transactionId}`);

      return {
        success: true,
        id: response.data.payment_id,
        externalReference: response.data.reference,
        payment_url: response.data.payment_url,
        status: this.statusMap[response.data.status] || 'pending',
        raw_response: response.data
      };

    } catch (error) {
      logger.error('Irembo Pay payment creation failed:', error);
      throw new Error(`Irembo Pay error: ${error.message}`);
    }
  }

  /**
   * Create mock payment for testing (before API integration)
   * @param {Object} params - Payment parameters
   * @returns {Object} Mock payment result
   */
  createMockPayment(params) {
    logger.info('🧪 Creating MOCK Irembo Pay payment (API not yet configured)');
    
    const mockPaymentId = `IREMBO_MOCK_${Date.now()}`;
    const mockUrl = `${process.env.FRONTEND_URL}/payment/mock-irembo-pay/${mockPaymentId}`;
    
    return {
      success: true,
      id: mockPaymentId,
      externalReference: `REF_${mockPaymentId}`,
      payment_url: mockUrl,
      status: 'pending',
      is_mock: true,
      message: 'Mock payment - Irembo Pay API integration pending'
    };
  }

  /**
   * Handle payment webhook
   * @param {Object} webhookData - Webhook payload from Irembo Pay
   * @returns {Object} Processed webhook result
   */
  async handleWebhook(webhookData) {
    try {
      // Verify webhook signature (if Irembo Pay provides one)
      if (webhookData.signature && !this.verifyWebhookSignature(webhookData)) {
        throw new Error('Invalid webhook signature');
      }

      // Extract relevant data (adjust based on actual Irembo Pay webhook format)
      const transactionId = webhookData.transaction_id || webhookData.merchant_transaction_id;
      const status = this.statusMap[webhookData.status] || 'pending';
      const paymentId = webhookData.payment_id;

      logger.info(`Irembo Pay webhook received: ${transactionId} - ${status}`);

      return {
        transactionId: transactionId,
        status: status,
        paymentId: paymentId,
        data: webhookData
      };

    } catch (error) {
      logger.error('Error processing Irembo Pay webhook:', error);
      throw error;
    }
  }

  /**
   * Verify payment status
   * @param {string} paymentId - Irembo Pay payment ID
   * @returns {Object} Payment status
   */
  async verifyPayment(paymentId) {
    if (!this.isAvailable()) {
      return {
        status: 'pending',
        is_mock: true
      };
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 15000
        }
      );

      return {
        status: this.statusMap[response.data.status] || 'pending',
        payment_data: response.data
      };

    } catch (error) {
      logger.error('Error verifying Irembo Pay payment:', error);
      throw error;
    }
  }

  /**
   * Refund a payment
   * @param {string} paymentId - Payment ID to refund
   * @param {number} amount - Amount to refund (optional, full refund if not specified)
   * @returns {Object} Refund result
   */
  async refundPayment(paymentId, amount = null) {
    if (!this.isAvailable()) {
      throw new Error('Irembo Pay not configured');
    }

    try {
      const refundRequest = {
        payment_id: paymentId,
        amount: amount,
        reason: 'Customer request'
      };

      const response = await axios.post(
        `${this.apiUrl}/payments/${paymentId}/refund`,
        refundRequest,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      logger.info(`Irembo Pay refund initiated: ${paymentId}`);

      return {
        success: true,
        refund_id: response.data.refund_id,
        status: response.data.status,
        amount_refunded: response.data.amount
      };

    } catch (error) {
      logger.error('Irembo Pay refund failed:', error);
      throw error;
    }
  }

  /**
   * Generate signature for API request (adjust based on Irembo Pay docs)
   * @param {Object} data - Request data
   * @returns {string} Signature
   */
  generateSignature(data) {
    if (!this.webhookSecret) {
      return '';
    }

    const payload = JSON.stringify(data);
    const signature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return signature;
  }

  /**
   * Verify webhook signature
   * @param {Object} webhookData - Webhook data with signature
   * @returns {boolean} Is valid
   */
  verifyWebhookSignature(webhookData) {
    if (!this.webhookSecret) {
      logger.warn('Webhook secret not configured, skipping signature verification');
      return true;
    }

    const { signature, ...data } = webhookData;
    const expectedSignature = this.generateSignature(data);

    return signature === expectedSignature;
  }

  /**
   * Get supported payment methods
   * @returns {Array} Payment methods
   */
  getSupportedMethods() {
    return [
      {
        id: 'mobile_money',
        name: 'Mobile Money',
        description: 'MTN, Airtel, Tigo Mobile Money',
        icon: '📱',
        currencies: ['RWF']
      },
      {
        id: 'bank_card',
        name: 'Bank Card',
        description: 'Debit/Credit Cards (Rwandan banks)',
        icon: '💳',
        currencies: ['RWF']
      }
    ];
  }

  /**
   * Format phone number for Rwanda
   * @param {string} phone - Phone number
   * @returns {string} Formatted phone
   */
  formatRwandaPhone(phone) {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 250, keep it
    if (cleaned.startsWith('250')) {
      return `+${cleaned}`;
    }
    
    // If starts with 0, replace with 250
    if (cleaned.startsWith('0')) {
      return `+250${cleaned.substring(1)}`;
    }
    
    // Otherwise, add 250 prefix
    return `+250${cleaned}`;
  }
}

// Export singleton instance
module.exports = new IremboPayService();

