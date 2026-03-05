const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const database = require('../database/connection');
const AIEmailService = require('../services/AIEmailService');
const logger = require('../utils/logger');
const { getInternalEmailId } = require('../utils/emailIdHelper');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const CreditService = require('../services/CreditService');
const ServicePricingService = require('../services/ServicePricingService');

const creditService = new CreditService();

// Middleware to authenticate user
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userResult = await database.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = userResult.rows[0];
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Generate AI draft replies for an email (requires ZTR tokens)
 * POST /api/gmail/ai/drafts/:emailId
 */
router.post('/drafts/:emailId', authenticateUser, requireTokenAccess, async (req, res) => {
  try {
    const { emailId } = req.params;
    const { tone = 'professional' } = req.body;

    // Convert Gmail message ID to internal ID
    const internalEmailId = await getInternalEmailId(emailId, req.user.id);
    
    if (!internalEmailId) {
      return res.status(404).json({ 
        error: 'Email not found',
        message: 'Email may not be synced yet. Please sync your emails first.'
      });
    }

    // Validate tone
    const validTones = ['professional', 'casual', 'friendly', 'brief'];
    if (!validTones.includes(tone)) {
      return res.status(400).json({ 
        error: 'Invalid tone', 
        validTones 
      });
    }

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('gmail_draft_reply');
    try {
      await creditService.deductCredits(req.user.id, 'gmail_draft_reply', creditCost.cost, internalEmailId);
    } catch (creditError) {
      const { formatCreditError } = require('../utils/creditErrorHandler');
      const errorResponse = formatCreditError(creditError, creditCost.cost);
      return res.status(402).json(errorResponse);
    }

    const drafts = await AIEmailService.generateDraftReplies(
      internalEmailId,
      req.user.id,
      tone
    );

    res.json({
      success: true,
      drafts,
      count: drafts.length
    });

  } catch (error) {
    logger.error('Error generating draft replies:', error);
    res.status(500).json({ 
      error: 'Failed to generate draft replies',
      details: error.message 
    });
  }
});

/**
 * Categorize an email with AI (requires ZTR tokens)
 * POST /api/gmail/ai/categorize/:emailId
 */
router.post('/categorize/:emailId', authenticateUser, requireTokenAccess, async (req, res) => {
  try {
    const { emailId } = req.params;

    // Convert Gmail message ID to internal ID
    const internalEmailId = await getInternalEmailId(emailId, req.user.id);
    
    if (!internalEmailId) {
      return res.status(404).json({ 
        error: 'Email not found',
        message: 'Email may not be synced yet. Please sync your emails first.'
      });
    }

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('gmail_categorize');
    try {
      await creditService.deductCredits(req.user.id, 'gmail_categorize', creditCost.cost, internalEmailId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost.cost
      });
    }

    const analysis = await AIEmailService.categorizeEmail(
      internalEmailId,
      req.user.id
    );

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    logger.error('Error categorizing email:', error);
    res.status(500).json({ 
      error: 'Failed to categorize email',
      details: error.message 
    });
  }
});

/**
 * Batch categorize multiple emails (requires ZTR tokens)
 * POST /api/gmail/ai/batch-categorize
 */
router.post('/batch-categorize', authenticateUser, requireTokenAccess, async (req, res) => {
  try {
    const { limit = 50 } = req.body;

    const result = await AIEmailService.batchCategorizeEmails(
      req.user.id,
      parseInt(limit)
    );

    res.json(result);

  } catch (error) {
    logger.error('Error in batch categorization:', error);
    res.status(500).json({ 
      error: 'Failed to batch categorize emails',
      details: error.message 
    });
  }
});

/**
 * Generate email summary (requires ZTR tokens)
 * POST /api/gmail/ai/summarize/:emailId
 */
router.post('/summarize/:emailId', authenticateUser, requireTokenAccess, async (req, res) => {
  try {
    const { emailId } = req.params;

    // Convert Gmail message ID to internal ID
    const internalEmailId = await getInternalEmailId(emailId, req.user.id);
    
    if (!internalEmailId) {
      return res.status(404).json({ 
        error: 'Email not found',
        message: 'Email may not be synced yet. Please sync your emails first.'
      });
    }

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('gmail_summarize');
    try {
      await creditService.deductCredits(req.user.id, 'gmail_summarize', creditCost.cost, internalEmailId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost.cost
      });
    }

    const summary = await AIEmailService.summarizeEmail(
      internalEmailId,
      req.user.id
    );

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    logger.error('Error summarizing email:', error);
    res.status(500).json({ 
      error: 'Failed to summarize email',
      details: error.message 
    });
  }
});

/**
 * Detect spam/phishing (requires ZTR tokens)
 * POST /api/gmail/ai/spam-check/:emailId
 */
router.post('/spam-check/:emailId', authenticateUser, requireTokenAccess, async (req, res) => {
  try {
    const { emailId } = req.params;

    // Convert Gmail message ID to internal ID
    const internalEmailId = await getInternalEmailId(emailId, req.user.id);
    
    if (!internalEmailId) {
      return res.status(404).json({ 
        error: 'Email not found',
        message: 'Email may not be synced yet. Please sync your emails first.'
      });
    }

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('gmail_spam_check');
    try {
      await creditService.deductCredits(req.user.id, 'gmail_spam_check', creditCost.cost, internalEmailId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost.cost
      });
    }

    const analysis = await AIEmailService.detectSpam(
      internalEmailId,
      req.user.id
    );

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    logger.error('Error detecting spam:', error);
    res.status(500).json({ 
      error: 'Failed to detect spam',
      details: error.message 
    });
  }
});

/**
 * Get thread insights
 * GET /api/gmail/ai/thread-insights/:threadId
 */
router.get('/thread-insights/:threadId', authenticateUser, async (req, res) => {
  try {
    const { threadId } = req.params;

    const insights = await AIEmailService.getThreadInsights(
      threadId,
      req.user.id
    );

    res.json({
      success: true,
      insights
    });

  } catch (error) {
    logger.error('Error getting thread insights:', error);
    res.status(500).json({ 
      error: 'Failed to get thread insights',
      details: error.message 
    });
  }
});

/**
 * Get AI suggestions for all actions (one-stop endpoint)
 * GET /api/gmail/ai/suggestions/:emailId
 */
router.get('/suggestions/:emailId', authenticateUser, async (req, res) => {
  try {
    const { emailId } = req.params;
    
    // Convert Gmail message ID (string) to internal database ID (integer)
    const internalEmailId = await getInternalEmailId(emailId, req.user.id);
    
    if (!internalEmailId) {
      return res.status(404).json({ 
        error: 'Email not found',
        message: 'Email may not be synced yet. Please sync your emails first or check the email ID.'
      });
    }

    // Run all AI analyses in parallel using internal ID
    const [drafts, categorization, summary, spamCheck] = await Promise.allSettled([
      AIEmailService.generateDraftReplies(internalEmailId, req.user.id, 'professional'),
      AIEmailService.categorizeEmail(internalEmailId, req.user.id),
      AIEmailService.summarizeEmail(internalEmailId, req.user.id),
      AIEmailService.detectSpam(internalEmailId, req.user.id)
    ]);

    res.json({
      success: true,
      suggestions: {
        drafts: drafts.status === 'fulfilled' ? drafts.value : null,
        category: categorization.status === 'fulfilled' ? categorization.value : null,
        summary: summary.status === 'fulfilled' ? summary.value : null,
        spamCheck: spamCheck.status === 'fulfilled' ? spamCheck.value : null
      },
      errors: {
        drafts: drafts.status === 'rejected' ? drafts.reason.message : null,
        category: categorization.status === 'rejected' ? categorization.reason.message : null,
        summary: summary.status === 'rejected' ? summary.reason.message : null,
        spamCheck: spamCheck.status === 'rejected' ? spamCheck.reason.message : null
      }
    });

  } catch (error) {
    logger.error('Error getting AI suggestions:', error);
    res.status(500).json({ 
      error: 'Failed to get AI suggestions',
      details: error.message 
    });
  }
});

module.exports = router;

