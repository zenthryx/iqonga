const express = require('express');
const router = express.Router();
const AIMeetingPrepService = require('../services/AIMeetingPrepService');
const logger = require('../utils/logger');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const CreditService = require('../services/CreditService');
const ServicePricingService = require('../services/ServicePricingService');

const creditService = new CreditService();

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

/**
 * Generate AI meeting prep for an event (requires ZTR tokens)
 * POST /api/meeting-prep/events/:eventId/generate
 */
router.post('/events/:eventId/generate', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const { eventId } = req.params; // Can be Google Calendar ID (string) or internal ID (number)
    const userId = req.user.userId;

    logger.info('Generating AI meeting prep', { userId, eventId });

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('calendar_meeting_prep');
    try {
      await creditService.deductCredits(userId, 'calendar_meeting_prep', creditCost.cost, eventId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost.cost
      });
    }

    // Service now handles both provider_event_id (Google Calendar ID) and internal ID
    const prep = await AIMeetingPrepService.generateMeetingPrep(userId, eventId);

    res.json({
      success: true,
      prep
    });

  } catch (error) {
    logger.error('Error generating meeting prep:', error);
    res.status(500).json({ 
      error: 'Failed to generate meeting prep', 
      details: error.message 
    });
  }
});

/**
 * Get existing meeting prep for an event
 * GET /api/meeting-prep/events/:eventId
 */
router.get('/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params; // Can be Google Calendar ID (string) or internal ID (number)
    const userId = req.user.userId;

    // Service now handles both provider_event_id (Google Calendar ID) and internal ID
    const prep = await AIMeetingPrepService.getMeetingPrep(userId, eventId);

    if (!prep) {
      return res.status(404).json({ 
        error: 'No meeting prep found', 
        message: 'Generate a new meeting prep to get started' 
      });
    }

    res.json({
      success: true,
      prep
    });

  } catch (error) {
    logger.error('Error getting meeting prep:', error);
    res.status(500).json({ 
      error: 'Failed to get meeting prep', 
      details: error.message 
    });
  }
});

/**
 * Delete meeting prep for an event
 * DELETE /api/meeting-prep/events/:eventId
 */
router.delete('/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;

    await AIMeetingPrepService.deleteMeetingPrep(userId, parseInt(eventId));

    res.json({
      success: true,
      message: 'Meeting prep deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting meeting prep:', error);
    res.status(500).json({ 
      error: 'Failed to delete meeting prep', 
      details: error.message 
    });
  }
});

/**
 * Regenerate meeting prep (force refresh) (requires ZTR tokens)
 * POST /api/meeting-prep/events/:eventId/regenerate
 */
router.post('/events/:eventId/regenerate', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;

    // Delete existing prep first
    await AIMeetingPrepService.deleteMeetingPrep(userId, parseInt(eventId));

    // Generate new prep
    const prep = await AIMeetingPrepService.generateMeetingPrep(userId, parseInt(eventId));

    res.json({
      success: true,
      message: 'Meeting prep regenerated successfully',
      prep
    });

  } catch (error) {
    logger.error('Error regenerating meeting prep:', error);
    res.status(500).json({ 
      error: 'Failed to regenerate meeting prep', 
      details: error.message 
    });
  }
});

/**
 * Email meeting prep to user
 * POST /api/meeting-prep/events/:eventId/email
 */
router.post('/events/:eventId/email', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;

    logger.info('Email meeting prep request', { userId, eventId });

    const result = await AIMeetingPrepService.emailMeetingPrep(userId, parseInt(eventId));

    res.json(result);

  } catch (error) {
    logger.error('Error emailing meeting prep:', error);
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to email meeting prep';
    if (error.message === 'Gmail account not connected') {
      errorMessage = 'Please connect your Gmail account first';
    } else if (error.message === 'User email not found') {
      errorMessage = 'No email address found for your account';
    } else if (error.message === 'Event not found') {
      errorMessage = 'Meeting event not found';
    }
    
    res.status(500).json({ 
      error: errorMessage, 
      details: error.message 
    });
  }
});

module.exports = router;

