/**
 * Sales Email Routes
 * API endpoints for sending and tracking emails from Sales & CRM
 */

const express = require('express');
const router = express.Router();
const EmailTemplateService = require('../services/EmailTemplateService');
const SalesEmailService = require('../services/SalesEmailService');
const { authenticateToken } = require('../middleware/auth');
const CreditService = require('../services/CreditService');
const ServicePricingService = require('../services/ServicePricingService');
const { v4: uuidv4 } = require('uuid');

// Initialize credit service
const creditService = new CreditService();

// Middleware to get user ID from token
const getUserId = (req) => req.user?.id || req.user?.userId;

// ==========================================
// EMAIL TEMPLATES
// ==========================================

// GET /api/sales-email/templates - Get all email templates
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { category, isActive, search } = req.query;

    const templates = await EmailTemplateService.getTemplates(userId, {
      category,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search
    });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Get email templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email templates',
      message: error.message
    });
  }
});

// GET /api/sales-email/templates/:id - Get single template
router.get('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const templateId = req.params.id;

    const template = await EmailTemplateService.getTemplateById(templateId, userId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Get email template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email template',
      message: error.message
    });
  }
});

// POST /api/sales-email/templates - Create new template
router.post('/templates', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const templateData = req.body;

    const template = await EmailTemplateService.createTemplate(userId, templateData);

    res.status(201).json({
      success: true,
      data: template,
      message: 'Email template created successfully'
    });
  } catch (error) {
    console.error('Create email template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create email template',
      message: error.message
    });
  }
});

// PUT /api/sales-email/templates/:id - Update template
router.put('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const templateId = req.params.id;
    const updates = req.body;

    const template = await EmailTemplateService.updateTemplate(templateId, userId, updates);

    res.json({
      success: true,
      data: template,
      message: 'Email template updated successfully'
    });
  } catch (error) {
    console.error('Update email template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update email template',
      message: error.message
    });
  }
});

// DELETE /api/sales-email/templates/:id - Delete template
router.delete('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const templateId = req.params.id;

    await EmailTemplateService.deleteTemplate(templateId, userId);

    res.json({
      success: true,
      message: 'Email template deleted successfully'
    });
  } catch (error) {
    console.error('Delete email template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete email template',
      message: error.message
    });
  }
});

// POST /api/sales-email/templates/:id/duplicate - Duplicate template
router.post('/templates/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const templateId = req.params.id;

    const template = await EmailTemplateService.duplicateTemplate(templateId, userId);

    res.status(201).json({
      success: true,
      data: template,
      message: 'Email template duplicated successfully'
    });
  } catch (error) {
    console.error('Duplicate email template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to duplicate email template',
      message: error.message
    });
  }
});

// GET /api/sales-email/templates/tokens - Get available personalization tokens
router.get('/tokens', authenticateToken, async (req, res) => {
  try {
    const tokens = EmailTemplateService.getAvailableTokens();

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    console.error('Get tokens error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tokens',
      message: error.message
    });
  }
});

// GET /api/sales-email/categories - Get template categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = EmailTemplateService.getCategories();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      message: error.message
    });
  }
});

// ==========================================
// SEND EMAILS
// ==========================================

// POST /api/sales-email/send - Send an email
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const emailData = req.body;

    // Determine pricing based on tracking and AI usage
    let serviceKey = 'sales_email_basic';
    if (emailData.trackOpens || emailData.trackClicks) {
      serviceKey = 'sales_email_tracked';
    }
    if (emailData.useAI || emailData.aiGenerated) {
      serviceKey = 'sales_email_ai_generate';
    }

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing(serviceKey);
    const emailId = uuidv4();
    
    try {
      await creditService.deductCredits(userId, serviceKey, creditCost, emailId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const result = await SalesEmailService.sendSalesEmail(userId, emailData);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Email sent successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      message: error.message
    });
  }
});

// ==========================================
// EMAIL TRACKING
// ==========================================

// GET /api/sales-email/open/:trackingId - Track email open (tracking pixel)
router.get('/open/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Track the open (don't await - fire and forget)
    SalesEmailService.trackEmailOpen(trackingId, ipAddress, userAgent).catch(err => {
      console.error('Email open tracking failed:', err);
    });

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    res.set('Content-Type', 'image/gif');
    res.set('Content-Length', pixel.length);
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(pixel);
  } catch (error) {
    console.error('Email open tracking error:', error);
    // Still return pixel even if tracking fails
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.set('Content-Type', 'image/gif');
    res.send(pixel);
  }
});

// GET /api/sales-email/click/:trackingId - Track link click and redirect
router.get('/click/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { url } = req.query;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Missing URL parameter'
      });
    }

    // Track the click (don't await - fire and forget)
    SalesEmailService.trackEmailLinkClick(trackingId, url, ipAddress, userAgent).catch(err => {
      console.error('Email click tracking failed:', err);
    });

    // Redirect to original URL
    res.redirect(url);
  } catch (error) {
    console.error('Email click tracking error:', error);
    // Still redirect even if tracking fails
    if (req.query.url) {
      res.redirect(req.query.url);
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to track click'
      });
    }
  }
});

// ==========================================
// EMAIL STATS
// ==========================================

// GET /api/sales-email/sent - Get sent emails
router.get('/sent', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { leadId, dealId, status, limit } = req.query;

    const emails = await SalesEmailService.getSentEmails({
      userId,
      leadId,
      dealId,
      status,
      limit: limit ? parseInt(limit) : undefined
    });

    res.json({
      success: true,
      data: emails
    });
  } catch (error) {
    console.error('Get sent emails error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sent emails',
      message: error.message
    });
  }
});

// GET /api/sales-email/stats/:id - Get email stats
router.get('/stats/:id', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const emailId = req.params.id;

    const stats = await SalesEmailService.getEmailStats(emailId, userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get email stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email stats',
      message: error.message
    });
  }
});

module.exports = router;

