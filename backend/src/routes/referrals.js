const express = require('express');
const router = express.Router();
const ReferralService = require('../services/ReferralService');
const { authenticateToken } = require('../middleware/auth');
const database = require('../database/connection');

// Verify authenticateToken is available
if (!authenticateToken) {
  console.error('❌ authenticateToken middleware not found!');
  throw new Error('authenticateToken middleware is required');
}

// Middleware to check admin permission
const requireAdminPermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin permission required' });
  }
  
  next();
};

// Initialize referral service
let referralService;
try {
  referralService = new ReferralService();
} catch (error) {
  console.error('❌ Failed to initialize ReferralService:', error);
  throw error;
}

// GET /api/referrals/code - Get user's referral code
router.get('/code', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const referralCode = await referralService.getReferralCode(userId);
    
    res.json({
      success: true,
      data: {
        referralCode: referralCode.referral_code,
        referralLink: referralCode.referral_link,
        totalSignups: referralCode.total_signups,
        totalEarnings: parseFloat(referralCode.total_earnings) || 0
      }
    });
  } catch (error) {
    console.error('Error getting referral code:', error);
    res.status(500).json({ 
      error: 'Failed to get referral code',
      details: error.message 
    });
  }
});

// GET /api/referrals/stats - Get user referral statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await referralService.getUserReferralStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting referral stats:', error);
    res.status(500).json({ 
      error: 'Failed to get referral stats',
      details: error.message 
    });
  }
});

// GET /api/referrals/rewards - Get referral rewards history
router.get('/rewards', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;
    
    const rewards = await referralService.getReferralRewards(
      userId,
      parseInt(limit),
      parseInt(offset)
    );
    
    res.json({
      success: true,
      data: rewards.map(reward => ({
        id: reward.id,
        rewardType: reward.reward_type,
        purchaseAmount: parseFloat(reward.purchase_amount),
        usdcAmount: parseFloat(reward.usdc_amount),
        creditsAwarded: parseFloat(reward.credits_awarded) || 0,
        status: reward.status,
        transactionSignature: reward.solana_transaction_signature,
        referredUsername: reward.referred_username,
        createdAt: reward.created_at,
        completedAt: reward.completed_at
      }))
    });
  } catch (error) {
    console.error('Error getting referral rewards:', error);
    res.status(500).json({ 
      error: 'Failed to get referral rewards',
      details: error.message 
    });
  }
});

// POST /api/referrals/track - Track referral (public endpoint, used during signup)
router.post('/track', async (req, res) => {
  try {
    const { referralCode, userId } = req.body;
    
    if (!referralCode || !userId) {
      return res.status(400).json({ error: 'Referral code and user ID are required' });
    }
    
    const referral = await referralService.trackReferral(referralCode, userId);
    
    if (!referral) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid referral code or referral already exists' 
      });
    }
    
    res.json({
      success: true,
      message: 'Referral tracked successfully',
      data: {
        referralId: referral.id,
        referrerId: referral.referrer_id
      }
    });
  } catch (error) {
    console.error('Error tracking referral:', error);
    res.status(500).json({ 
      error: 'Failed to track referral',
      details: error.message 
    });
  }
});

// POST /api/referrals/process-payouts - Process queued USDC payouts (admin or cron)
router.post('/process-payouts', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const result = await referralService.processUSDCReferralPayouts();
    
    res.json({
      success: true,
      message: `Processed ${result.processed} payouts`,
      data: result
    });
  } catch (error) {
    console.error('Error processing payouts:', error);
    res.status(500).json({ 
      error: 'Failed to process payouts',
      details: error.message 
    });
  }
});

// GET /api/referrals/payout-queue - Get payout queue status (admin)
router.get('/payout-queue', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { status = 'queued', limit = 50 } = req.query;
    
    const result = await database.query(
      `SELECT pq.*, u.username as referrer_username, r.reward_type
       FROM referral_payout_queue pq
       LEFT JOIN users u ON pq.referrer_id = u.id
       LEFT JOIN referral_rewards r ON pq.reward_id = r.id
       WHERE pq.status = $1
       ORDER BY pq.created_at DESC
       LIMIT $2`,
      [status, parseInt(limit)]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting payout queue:', error);
    res.status(500).json({ 
      error: 'Failed to get payout queue',
      details: error.message 
    });
  }
});

// GET /api/referrals/settings - Get referral settings (admin)
router.get('/settings', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const result = await database.query(
      'SELECT * FROM referral_settings ORDER BY setting_key'
    );
    
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = {
        value: row.setting_value,
        description: row.description,
        updatedAt: row.updated_at
      };
    });
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting referral settings:', error);
    res.status(500).json({ 
      error: 'Failed to get referral settings',
      details: error.message 
    });
  }
});

// PUT /api/referrals/settings/:key - Update referral setting (admin)
router.put('/settings/:key', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    
    if (!value) {
      return res.status(400).json({ error: 'Setting value is required' });
    }
    
    await database.query(
      `UPDATE referral_settings 
       SET setting_value = $1, description = COALESCE($2, description), updated_at = NOW(), updated_by = $3
       WHERE setting_key = $4`,
      [value, description, req.user.id, key]
    );
    
    res.json({
      success: true,
      message: 'Setting updated successfully'
    });
  } catch (error) {
    console.error('Error updating referral setting:', error);
    res.status(500).json({ 
      error: 'Failed to update setting',
      details: error.message 
    });
  }
});

module.exports = router;

