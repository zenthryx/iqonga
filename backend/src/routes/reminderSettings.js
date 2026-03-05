const express = require('express');
const router = express.Router();
const MeetingReminderService = require('../services/MeetingReminderService');
const logger = require('../utils/logger');

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
 * Get user's reminder preferences
 * GET /api/reminder-settings
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const preferences = await MeetingReminderService.getUserPreferences(userId);

    res.json({
      success: true,
      preferences
    });

  } catch (error) {
    logger.error('Error getting reminder preferences:', error);
    res.status(500).json({ 
      error: 'Failed to get reminder preferences', 
      details: error.message 
    });
  }
});

/**
 * Update user's reminder preferences
 * PUT /api/reminder-settings
 */
router.put('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const preferences = req.body;

    logger.info('Updating reminder preferences', { userId, preferences });

    const updated = await MeetingReminderService.updateUserPreferences(userId, preferences);

    res.json({
      success: true,
      message: 'Reminder preferences updated successfully',
      preferences: updated
    });

  } catch (error) {
    logger.error('Error updating reminder preferences:', error);
    res.status(500).json({ 
      error: 'Failed to update reminder preferences', 
      details: error.message 
    });
  }
});

/**
 * Test reminder (send test email immediately)
 * POST /api/reminder-settings/test
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type } = req.body; // 'pre_meeting', 'daily_digest', 'weekly_preview'

    logger.info('Test reminder requested', { userId, type });

    // For now, just return success (actual test sending can be implemented later)
    res.json({
      success: true,
      message: `Test ${type} reminder would be sent (not implemented in MVP)`
    });

  } catch (error) {
    logger.error('Error sending test reminder:', error);
    res.status(500).json({ 
      error: 'Failed to send test reminder', 
      details: error.message 
    });
  }
});

module.exports = router;

