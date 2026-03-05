const database = require('../database/connection');
const CreditService = require('./CreditService');
const USDCPayoutService = require('./USDCPayoutService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class ReferralService {
  constructor() {
    this.creditService = new CreditService();
    this.usdcPayoutService = new USDCPayoutService();
  }

  /**
   * Get referral setting value
   */
  async getSetting(key, defaultValue = null) {
    try {
      const result = await database.query(
        'SELECT setting_value FROM referral_settings WHERE setting_key = $1',
        [key]
      );
      return result.rows.length > 0 ? result.rows[0].setting_value : defaultValue;
    } catch (error) {
      logger.error('Error getting referral setting:', error);
      return defaultValue;
    }
  }

  /**
   * Check if referral system is active
   */
  async isActive() {
    const isActive = await this.getSetting('is_active', 'true');
    return isActive === 'true';
  }

  /**
   * Generate unique referral code for user
   */
  async generateReferralCode(userId) {
    try {
      // Check if user already has a referral code
      const existing = await database.query(
        'SELECT * FROM referral_codes WHERE user_id = $1',
        [userId]
      );

      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      // Generate unique code (username-based or random)
      const userResult = await database.query(
        'SELECT username FROM users WHERE id = $1',
        [userId]
      );

      let baseCode = userResult.rows[0]?.username?.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'USER';
      let referralCode = baseCode;
      let attempts = 0;

      // Ensure uniqueness
      while (attempts < 10) {
        const check = await database.query(
          'SELECT id FROM referral_codes WHERE referral_code = $1',
          [referralCode]
        );

        if (check.rows.length === 0) {
          break; // Code is unique
        }

        referralCode = `${baseCode}${Math.floor(Math.random() * 10000)}`;
        attempts++;
      }

      // Generate referral link
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const referralLink = `${baseUrl}/signup?ref=${referralCode}`;

      // Insert referral code
      const result = await database.query(
        `INSERT INTO referral_codes (user_id, referral_code, referral_link)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, referralCode, referralLink]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error generating referral code:', error);
      throw error;
    }
  }

  /**
   * Get referral code for user
   */
  async getReferralCode(userId) {
    try {
      const result = await database.query(
        'SELECT * FROM referral_codes WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        // Generate if doesn't exist
        return await this.generateReferralCode(userId);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting referral code:', error);
      throw error;
    }
  }

  /**
   * Track referral when user signs up with referral code
   */
  async trackReferral(referralCode, referredUserId) {
    try {
      if (!(await this.isActive())) {
        logger.info('Referral system is disabled');
        return null;
      }

      // Find referrer by code
      const codeResult = await database.query(
        'SELECT * FROM referral_codes WHERE referral_code = $1 AND is_active = true',
        [referralCode.toUpperCase()]
      );

      if (codeResult.rows.length === 0) {
        logger.warn(`Invalid referral code: ${referralCode}`);
        return null;
      }

      const referrerId = codeResult.rows[0].user_id;

      // Prevent self-referral
      if (referrerId === referredUserId) {
        logger.warn('Self-referral attempted');
        return null;
      }

      // Check if referral already exists
      const existing = await database.query(
        'SELECT * FROM referrals WHERE referred_user_id = $1',
        [referredUserId]
      );

      if (existing.rows.length > 0) {
        logger.info('Referral already exists for this user');
        return existing.rows[0];
      }

      // Get referrer's wallet address
      const referrerResult = await database.query(
        'SELECT wallet_address FROM users WHERE id = $1',
        [referrerId]
      );

      if (!referrerResult.rows[0]?.wallet_address) {
        logger.warn(`Referrer ${referrerId} has no wallet address`);
        return null;
      }

      // Create referral record
      const result = await database.query(
        `INSERT INTO referrals (referrer_id, referred_user_id, referral_code, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING *`,
        [referrerId, referredUserId, referralCode.toUpperCase()]
      );

      // Update referral code stats
      await database.query(
        'UPDATE referral_codes SET total_signups = total_signups + 1 WHERE id = $1',
        [codeResult.rows[0].id]
      );

      // Update user's referral_code_used
      await database.query(
        'UPDATE users SET referral_code_used = $1 WHERE id = $2',
        [referralCode.toUpperCase(), referredUserId]
      );

      logger.info(`Referral tracked: User ${referredUserId} referred by ${referrerId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error tracking referral:', error);
      throw error;
    }
  }

  /**
   * Process referral rewards when user makes a purchase
   */
  async processReferralReward(userId, purchaseAmount, creditTransactionId = null) {
    try {
      if (!(await this.isActive())) {
        return null;
      }

      // Find referral
      const referralResult = await database.query(
        'SELECT * FROM referrals WHERE referred_user_id = $1 AND status = $2',
        [userId, 'active']
      );

      if (referralResult.rows.length === 0) {
        return null; // No referral
      }

      const referral = referralResult.rows[0];
      const isFirstPurchase = !referral.first_purchase_at;

      // Get settings
      const referrerCommissionPct = parseFloat(await this.getSetting('referrer_commission_percentage', '20'));
      const refereeBonusPct = parseFloat(await this.getSetting('referee_first_purchase_bonus_percentage', '20'));
      const minPurchase = parseFloat(await this.getSetting('minimum_purchase_amount', '100'));
      const minUSDC = parseFloat(await this.getSetting('minimum_usdc_payout', '0.01'));

      // Check minimum purchase
      if (purchaseAmount < minPurchase) {
        logger.info(`Purchase amount ${purchaseAmount} below minimum ${minPurchase}`);
        return null;
      }

      // Calculate rewards
      const purchaseAmountUSD = purchaseAmount * 0.01; // 1 credit = $0.01
      const commissionUSDC = purchaseAmountUSD * (referrerCommissionPct / 100);

      // Process referee bonus (first purchase only) - IN CREDITS
      if (isFirstPurchase) {
        const bonusCredits = purchaseAmount * (refereeBonusPct / 100);
        await this.creditService.addCredits(
          userId,
          bonusCredits,
          `referral_first_purchase_bonus_${uuidv4()}`
        );
        logger.info(`Referee bonus: ${bonusCredits} credits to user ${userId}`);
      }

      // Process referrer commission - IN USDC
      if (commissionUSDC >= minUSDC) {
        // Get referrer's wallet address
        const referrerResult = await database.query(
          'SELECT wallet_address FROM users WHERE id = $1',
          [referral.referrer_id]
        );

        const referrerWallet = referrerResult.rows[0]?.wallet_address;
        if (!referrerWallet) {
          logger.warn(`Referrer ${referral.referrer_id} has no wallet address`);
          return null;
        }

        // Create reward record
        const rewardResult = await database.query(
          `INSERT INTO referral_rewards (
            referral_id, referrer_id, referred_user_id, reward_type,
            purchase_amount, reward_percentage, usdc_amount, credits_awarded,
            transaction_id, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
          RETURNING *`,
          [
            referral.id,
            referral.referrer_id,
            userId,
            isFirstPurchase ? 'first_purchase_commission' : 'purchase_commission',
            purchaseAmount,
            referrerCommissionPct,
            commissionUSDC,
            isFirstPurchase ? purchaseAmount * (refereeBonusPct / 100) : 0,
            creditTransactionId
          ]
        );

        const reward = rewardResult.rows[0];

        // Queue USDC payout
        await this.queueUSDCReferralPayout({
          reward_id: reward.id,
          referrer_id: referral.referrer_id,
          referrer_wallet_address: referrerWallet,
          usdc_amount: commissionUSDC
        });

        // Update referral stats
        await database.query(
          `UPDATE referrals 
           SET total_purchases = total_purchases + $1,
               total_earnings = total_earnings + $2,
               first_purchase_at = CASE WHEN first_purchase_at IS NULL THEN NOW() ELSE first_purchase_at END,
               updated_at = NOW()
           WHERE id = $3`,
          [purchaseAmount, commissionUSDC, referral.id]
        );

        // Update referral code stats
        await database.query(
          'UPDATE referral_codes SET total_earnings = total_earnings + $1 WHERE user_id = $2',
          [commissionUSDC, referral.referrer_id]
        );

        logger.info(`Referral reward processed: ${commissionUSDC} USDC to referrer ${referral.referrer_id}`);
        return reward;
      } else {
        logger.info(`Commission ${commissionUSDC} below minimum ${minUSDC}, skipping payout`);
      }

      return null;
    } catch (error) {
      logger.error('Error processing referral reward:', error);
      throw error;
    }
  }

  /**
   * Queue USDC referral payout
   */
  async queueUSDCReferralPayout({ reward_id, referrer_id, referrer_wallet_address, usdc_amount }) {
    try {
      const result = await database.query(
        `INSERT INTO referral_payout_queue (
          reward_id, referrer_id, referrer_wallet_address, usdc_amount, status
        ) VALUES ($1, $2, $3, $4, 'queued')
        RETURNING *`,
        [reward_id, referrer_id, referrer_wallet_address, usdc_amount]
      );

      logger.info(`USDC payout queued: ${usdc_amount} USDC to ${referrer_wallet_address}`);
      
      // Process immediately if delay is 0
      const delaySeconds = parseInt(await this.getSetting('usdc_payout_delay_seconds', '0'));
      if (delaySeconds === 0) {
        // Process in background (don't await)
        this.processUSDCReferralPayouts().catch(err => {
          logger.error('Error processing USDC payouts:', err);
        });
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error queueing USDC payout:', error);
      throw error;
    }
  }

  /**
   * Process queued USDC referral payouts
   */
  async processUSDCReferralPayouts() {
    try {
      const batchSize = parseInt(await this.getSetting('usdc_payout_batch_size', '10'));
      
      // Get queued payouts
      const result = await database.query(
        `SELECT * FROM referral_payout_queue 
         WHERE status = 'queued' 
         ORDER BY priority DESC, created_at ASC 
         LIMIT $1`,
        [batchSize]
      );

      const payouts = result.rows;
      logger.info(`Processing ${payouts.length} USDC referral payouts`);

      for (const payout of payouts) {
        try {
          // Update status to processing
          await database.query(
            'UPDATE referral_payout_queue SET status = $1, processed_at = NOW() WHERE id = $2',
            ['processing', payout.id]
          );

          // Send USDC
          const signature = await this.usdcPayoutService.sendUSDC(
            payout.referrer_wallet_address,
            parseFloat(payout.usdc_amount)
          );

          // Update payout as completed
          await database.query(
            `UPDATE referral_payout_queue 
             SET status = $1, transaction_signature = $2, completed_at = NOW() 
             WHERE id = $3`,
            ['completed', signature, payout.id]
          );

          // Update reward status
          await database.query(
            `UPDATE referral_rewards 
             SET status = $1, solana_transaction_signature = $2, completed_at = NOW() 
             WHERE id = $3`,
            ['completed', signature, payout.reward_id]
          );

          logger.info(`USDC payout completed: ${signature}`);
        } catch (error) {
          logger.error(`Error processing payout ${payout.id}:`, error);
          
          // Update payout as failed
          const retryCount = payout.retry_count + 1;
          const status = retryCount >= payout.max_retries ? 'failed' : 'queued';
          
          await database.query(
            `UPDATE referral_payout_queue 
             SET status = $1, retry_count = $2, error_message = $3 
             WHERE id = $4`,
            [status, retryCount, error.message, payout.id]
          );

          // Update reward status
          await database.query(
            `UPDATE referral_rewards 
             SET status = $1, retry_count = $2, error_message = $3 
             WHERE id = $4`,
            [status === 'failed' ? 'failed' : 'retrying', retryCount, error.message, payout.reward_id]
          );
        }
      }

      return { processed: payouts.length };
    } catch (error) {
      logger.error('Error processing USDC referral payouts:', error);
      throw error;
    }
  }

  /**
   * Get user referral stats
   */
  async getUserReferralStats(userId) {
    try {
      // Get or generate referral code (auto-generates if doesn't exist)
      const referralCode = await this.getReferralCode(userId);

      const referralsResult = await database.query(
        `SELECT COUNT(*) as total, 
                COUNT(CASE WHEN first_purchase_at IS NOT NULL THEN 1 END) as active,
                COALESCE(SUM(total_earnings), 0) as total_earnings
         FROM referrals WHERE referrer_id = $1`,
        [userId]
      );

      const rewardsResult = await database.query(
        `SELECT 
           COUNT(*) as total_rewards,
           COALESCE(SUM(usdc_amount), 0) as total_usdc_earned,
           COALESCE(SUM(CASE WHEN status = 'completed' THEN usdc_amount ELSE 0 END), 0) as completed_usdc,
           COALESCE(SUM(CASE WHEN status = 'pending' OR status = 'processing' THEN usdc_amount ELSE 0 END), 0) as pending_usdc
         FROM referral_rewards WHERE referrer_id = $1`,
        [userId]
      );

      const stats = referralsResult.rows[0];
      const rewards = rewardsResult.rows[0];

      return {
        referralCode: referralCode?.referral_code || null,
        referralLink: referralCode?.referral_link || null,
        totalReferrals: parseInt(stats.total) || 0,
        activeReferrals: parseInt(stats.active) || 0,
        totalEarnings: parseFloat(rewards.total_usdc_earned) || 0,
        completedEarnings: parseFloat(rewards.completed_usdc) || 0,
        pendingEarnings: parseFloat(rewards.pending_usdc) || 0,
        totalRewards: parseInt(rewards.total_rewards) || 0
      };
    } catch (error) {
      logger.error('Error getting user referral stats:', error);
      throw error;
    }
  }

  /**
   * Get referral rewards history
   */
  async getReferralRewards(userId, limit = 50, offset = 0) {
    try {
      const result = await database.query(
        `SELECT r.*, u.username as referred_username
         FROM referral_rewards r
         LEFT JOIN users u ON r.referred_user_id = u.id
         WHERE r.referrer_id = $1
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting referral rewards:', error);
      throw error;
    }
  }
}

module.exports = ReferralService;

