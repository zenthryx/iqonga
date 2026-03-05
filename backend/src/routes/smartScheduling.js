const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const SmartSchedulingService = require('../services/SmartSchedulingService');
const logger = require('../utils/logger');

/**
 * Analyze calendar and get all insights
 * GET /api/smart-scheduling/analyze
 */
router.get('/analyze', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { daysBack = 30, daysAhead = 7 } = req.query;

    logger.info('Analyzing calendar', { userId, daysBack, daysAhead });

    const analysis = await SmartSchedulingService.analyzeCalendar(userId, {
      daysBack: parseInt(daysBack),
      daysAhead: parseInt(daysAhead)
    });

    res.json({
      success: true,
      ...analysis
    });

  } catch (error) {
    logger.error('Error analyzing calendar:', error);
    res.status(500).json({ 
      error: 'Failed to analyze calendar', 
      details: error.message 
    });
  }
});

/**
 * Get calendar health score
 * GET /api/smart-scheduling/health
 */
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const health = await SmartSchedulingService.getCalendarHealth(userId);

    res.json({
      success: true,
      health
    });

  } catch (error) {
    logger.error('Error getting calendar health:', error);
    res.status(500).json({ 
      error: 'Failed to get calendar health', 
      details: error.message 
    });
  }
});

/**
 * Get active scheduling suggestions
 * GET /api/smart-scheduling/suggestions
 */
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const suggestions = await SmartSchedulingService.getActiveSuggestions(userId);

    res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    logger.error('Error getting suggestions:', error);
    res.status(500).json({ 
      error: 'Failed to get suggestions', 
      details: error.message 
    });
  }
});

/**
 * Get active conflicts
 * GET /api/smart-scheduling/conflicts
 */
router.get('/conflicts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const conflicts = await SmartSchedulingService.getActiveConflicts(userId);

    res.json({
      success: true,
      conflicts
    });

  } catch (error) {
    logger.error('Error getting conflicts:', error);
    res.status(500).json({ 
      error: 'Failed to get conflicts', 
      details: error.message 
    });
  }
});

/**
 * Suggest best time for a new meeting (requires ZTR tokens)
 * POST /api/smart-scheduling/suggest-time
 */
router.post('/suggest-time', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { duration = 60, daysAhead = 7 } = req.body;

    const suggestions = await SmartSchedulingService.suggestBestTime(
      userId, 
      parseInt(duration), 
      parseInt(daysAhead)
    );

    res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    logger.error('Error suggesting time:', error);
    res.status(500).json({ 
      error: 'Failed to suggest time', 
      details: error.message 
    });
  }
});

/**
 * Dismiss a suggestion
 * POST /api/smart-scheduling/suggestions/:id/dismiss
 */
router.post('/suggestions/:id/dismiss', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    await SmartSchedulingService.dismissSuggestion(userId, parseInt(id));

    res.json({
      success: true,
      message: 'Suggestion dismissed'
    });

  } catch (error) {
    logger.error('Error dismissing suggestion:', error);
    res.status(500).json({ 
      error: 'Failed to dismiss suggestion', 
      details: error.message 
    });
  }
});

/**
 * Accept a suggestion
 * POST /api/smart-scheduling/suggestions/:id/accept
 */
router.post('/suggestions/:id/accept', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    await SmartSchedulingService.acceptSuggestion(userId, parseInt(id));

    res.json({
      success: true,
      message: 'Suggestion accepted'
    });

  } catch (error) {
    logger.error('Error accepting suggestion:', error);
    res.status(500).json({ 
      error: 'Failed to accept suggestion', 
      details: error.message 
    });
  }
});

/**
 * Get historical health metrics
 * GET /api/smart-scheduling/metrics/history
 */
router.get('/metrics/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const result = await require('../database/connection').query(`
      SELECT *
      FROM calendar_health_metrics
      WHERE user_id = $1
      AND metric_date >= $2
      ORDER BY metric_date ASC
    `, [userId, startDate]);

    res.json({
      success: true,
      metrics: result.rows
    });

  } catch (error) {
    logger.error('Error getting metrics history:', error);
    res.status(500).json({ 
      error: 'Failed to get metrics history', 
      details: error.message 
    });
  }
});

module.exports = router;

