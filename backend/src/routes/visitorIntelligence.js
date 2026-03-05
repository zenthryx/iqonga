/**
 * Visitor Intelligence API Routes
 * Handles website visitor tracking and lead conversion
 */

const express = require('express');
const router = express.Router();
const VisitorIntelligenceService = require('../services/VisitorIntelligenceService');
const CreditService = require('../services/CreditService');
const ServicePricingService = require('../services/ServicePricingService');
const { authenticateToken } = require('../middleware/auth');

// Initialize credit service
const creditService = new CreditService();

// ====================================
// VISITOR TRACKING (Public endpoints for tracking script)
// ====================================

// POST /api/visitor-intelligence/track - Track visitor (public, but can use API key)
router.post('/track', async (req, res) => {
  try {
    // Get user_id from API key or auth token
    const userId = req.body.user_id || (req.user ? req.user.id : null);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    const visitor = await VisitorIntelligenceService.trackVisitor(userId, req.body);

    res.json({
      success: true,
      data: visitor
    });
  } catch (error) {
    console.error('Track visitor error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track visitor',
      message: error.message
    });
  }
});

// POST /api/visitor-intelligence/session - Track session
router.post('/session', async (req, res) => {
  try {
    const userId = req.body.user_id || (req.user ? req.user.id : null);
    
    if (!userId || !req.body.visitor_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id and visitor_id are required'
      });
    }

    // Get visitor UUID from visitor_id
    const visitorRecord = await VisitorIntelligenceService.getVisitorByVisitorId(req.body.visitor_id, userId);
    
    if (!visitorRecord) {
      return res.status(404).json({
        success: false,
        error: 'Visitor not found'
      });
    }

    const session = await VisitorIntelligenceService.trackSession(userId, visitorRecord.id, req.body);

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Track session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track session',
      message: error.message
    });
  }
});

// POST /api/visitor-intelligence/pageview - Track page view
router.post('/pageview', async (req, res) => {
  try {
    const userId = req.body.user_id || (req.user ? req.user.id : null);
    
    if (!userId || !req.body.visitor_id || !req.body.session_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id, visitor_id, and session_id are required'
      });
    }

    // Get visitor UUID
    const visitorRecord = await VisitorIntelligenceService.getVisitorByVisitorId(req.body.visitor_id, userId);
    
    if (!visitorRecord) {
      return res.status(404).json({
        success: false,
        error: 'Visitor not found'
      });
    }

    // Get session UUID (simplified - in production, you'd query by session_id)
    const pageView = await VisitorIntelligenceService.trackPageView(
      userId,
      visitorRecord.id,
      req.body.session_id, // In production, convert to UUID
      req.body
    );

    res.json({
      success: true,
      data: pageView
    });
  } catch (error) {
    console.error('Track page view error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track page view',
      message: error.message
    });
  }
});

// POST /api/visitor-intelligence/event - Track event
router.post('/event', async (req, res) => {
  try {
    const userId = req.body.user_id || (req.user ? req.user.id : null);
    
    if (!userId || !req.body.visitor_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id and visitor_id are required'
      });
    }

    // Get visitor UUID
    const visitorRecord = await VisitorIntelligenceService.getVisitorByVisitorId(req.body.visitor_id, userId);
    
    if (!visitorRecord) {
      return res.status(404).json({
        success: false,
        error: 'Visitor not found'
      });
    }

    const event = await VisitorIntelligenceService.trackEvent(
      userId,
      visitorRecord.id,
      req.body.session_id,
      req.body
    );

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track event',
      message: error.message
    });
  }
});

// ====================================
// VISITOR MANAGEMENT (Authenticated)
// ====================================

// GET /api/visitor-intelligence/visitors - Get visitors
router.get('/visitors', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      converted: req.query.converted !== undefined ? req.query.converted === 'true' : undefined,
      min_score: req.query.min_score ? parseInt(req.query.min_score) : undefined,
      company_domain: req.query.company_domain,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };

    const visitors = await VisitorIntelligenceService.getVisitors(userId, filters);

    res.json({
      success: true,
      data: visitors
    });
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitors',
      message: error.message
    });
  }
});

// GET /api/visitor-intelligence/visitors/:id - Get visitor details
router.get('/visitors/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const visitorId = req.params.id;

    const details = await VisitorIntelligenceService.getVisitorDetails(visitorId, userId);

    if (!details) {
      return res.status(404).json({
        success: false,
        error: 'Visitor not found'
      });
    }

    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Get visitor details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitor details',
      message: error.message
    });
  }
});

// POST /api/visitor-intelligence/visitors/:id/convert - Convert visitor to lead
router.post('/visitors/:id/convert', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const visitorId = req.params.id;
    const { conversion_type = 'manual', conversion_source = 'manual' } = req.body;
    const creditCost = await ServicePricingService.getPricing('visitor_convert_to_lead');

    try {
      await creditService.deductCredits(userId, 'visitor_convert_to_lead', creditCost);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const lead = await VisitorIntelligenceService.convertVisitorToLead(
      visitorId,
      userId,
      conversion_type,
      conversion_source
    );

    res.json({
      success: true,
      data: lead,
      message: 'Visitor converted to lead successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Convert visitor error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to convert visitor',
      message: error.message
    });
  }
});

// GET /api/visitor-intelligence/analytics - Get visitor analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const dateRange = {
      start: req.query.start ? new Date(req.query.start) : undefined,
      end: req.query.end ? new Date(req.query.end) : undefined
    };

    const analytics = await VisitorIntelligenceService.getVisitorAnalytics(userId, dateRange);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
});

module.exports = router;

