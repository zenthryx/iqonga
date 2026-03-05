const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const database = require('../database/connection');
const GoogleCalendarService = require('../services/GoogleCalendarService');
const logger = require('../utils/logger');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const CreditService = require('../services/CreditService');
const ServicePricingService = require('../services/ServicePricingService');

const creditService = new CreditService();

// Middleware to authenticate user
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

/**
 * Get calendar statistics
 * GET /api/calendar/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await GoogleCalendarService.getCalendarStats(req.user.userId);
    res.json(stats);
  } catch (error) {
    logger.error('Error getting calendar stats:', error);
    res.status(500).json({ error: 'Failed to get calendar statistics' });
  }
});

/**
 * Get upcoming events
 * GET /api/calendar/events/upcoming
 */
router.get('/events/upcoming', authenticateToken, async (req, res) => {
  try {
    const { limit, daysAhead } = req.query;
    
    const events = await GoogleCalendarService.getUpcomingEvents(req.user.userId, {
      limit: parseInt(limit) || 20,
      daysAhead: parseInt(daysAhead) || 7
    });

    res.json({ events });
  } catch (error) {
    logger.error('Error getting upcoming events:', error);
    res.status(500).json({ error: 'Failed to get upcoming events' });
  }
});

/**
 * Get events with filters
 * GET /api/calendar/events
 */
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      search,
      limit = 50,
      offset = 0
    } = req.query;

    // Get user's calendar account
    const accountResult = await database.query(
      'SELECT id FROM user_calendar_accounts WHERE user_id = $1 AND provider = $2 AND is_active = true',
      [req.user.userId, 'google']
    );

    if (accountResult.rows.length === 0) {
      return res.json({ events: [], total: 0 });
    }

    const accountId = accountResult.rows[0].id;

    // Build query
    let query = 'SELECT * FROM calendar_events WHERE account_id = $1';
    const params = [accountId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND start_time >= $${paramIndex}`;
      params.push(new Date(startDate));
      paramIndex++;
    }

    if (endDate) {
      query += ` AND end_time <= $${paramIndex}`;
      params.push(new Date(endDate));
      paramIndex++;
    }

    if (search) {
      query += ` AND (summary ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR location ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` AND status != 'cancelled'`;

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await database.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add pagination and ordering
    query += ` ORDER BY start_time ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    // Get events
    const result = await database.query(query, params);

    res.json({
      events: result.rows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('Error getting calendar events:', error);
    res.status(500).json({ error: 'Failed to get calendar events' });
  }
});

/**
 * Get events for today
 * GET /api/calendar/events/today
 */
router.get('/events/today', authenticateToken, async (req, res) => {
  try {
    const accountResult = await database.query(
      'SELECT id FROM user_calendar_accounts WHERE user_id = $1 AND provider = $2 AND is_active = true',
      [req.user.userId, 'google']
    );

    if (accountResult.rows.length === 0) {
      return res.json({ events: [] });
    }

    const accountId = accountResult.rows[0].id;

    const result = await database.query(
      `SELECT * FROM calendar_events 
       WHERE account_id = $1 
       AND DATE(start_time) = CURRENT_DATE
       AND status != 'cancelled'
       ORDER BY start_time ASC`,
      [accountId]
    );

    res.json({ events: result.rows });
  } catch (error) {
    logger.error('Error getting today events:', error);
    res.status(500).json({ error: 'Failed to get today events' });
  }
});

/**
 * Get events for this week
 * GET /api/calendar/events/week
 */
router.get('/events/week', authenticateToken, async (req, res) => {
  try {
    const accountResult = await database.query(
      'SELECT id FROM user_calendar_accounts WHERE user_id = $1 AND provider = $2 AND is_active = true',
      [req.user.userId, 'google']
    );

    if (accountResult.rows.length === 0) {
      return res.json({ events: [] });
    }

    const accountId = accountResult.rows[0].id;

    const result = await database.query(
      `SELECT * FROM calendar_events 
       WHERE account_id = $1 
       AND start_time >= CURRENT_DATE
       AND start_time < CURRENT_DATE + INTERVAL '7 days'
       AND status != 'cancelled'
       ORDER BY start_time ASC`,
      [accountId]
    );

    res.json({ events: result.rows });
  } catch (error) {
    logger.error('Error getting week events:', error);
    res.status(500).json({ error: 'Failed to get week events' });
  }
});

/**
 * Get single event by ID
 * GET /api/calendar/events/:id
 */
router.get('/events/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await database.query(
      'SELECT * FROM calendar_events WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error getting calendar event:', error);
    res.status(500).json({ error: 'Failed to get calendar event' });
  }
});

/**
 * Create new calendar event (requires ZTR tokens)
 * POST /api/calendar/events
 */
router.post('/events', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const {
      summary,
      description,
      location,
      startTime,
      endTime,
      timeZone,
      attendees,
      addMeetLink
    } = req.body;

    if (!summary || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields: summary, startTime, endTime' });
    }

    const eventData = {
      summary,
      description,
      location,
      startTime,
      endTime,
      timeZone: timeZone || 'UTC',
      attendees: attendees || [],
      conferenceData: addMeetLink || false
    };

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('calendar_create_event');
    try {
      await creditService.deductCredits(req.user.userId, 'calendar_create_event', creditCost.cost, null);
    } catch (creditError) {
      const { formatCreditError } = require('../utils/creditErrorHandler');
      const errorResponse = formatCreditError(creditError, creditCost.cost);
      return res.status(402).json(errorResponse);
    }

    const event = await GoogleCalendarService.createEvent(req.user.userId, eventData);

    res.json({
      success: true,
      event
    });
  } catch (error) {
    logger.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event', details: error.message });
  }
});

/**
 * Update calendar event (requires ZTR tokens)
 * PUT /api/calendar/events/:id
 */
router.put('/events/:id', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      summary,
      description,
      location,
      startTime,
      endTime,
      timeZone,
      attendees
    } = req.body;

    const eventData = {};
    if (summary !== undefined) eventData.summary = summary;
    if (description !== undefined) eventData.description = description;
    if (location !== undefined) eventData.location = location;
    if (startTime) eventData.startTime = startTime;
    if (endTime) eventData.endTime = endTime;
    if (timeZone) eventData.timeZone = timeZone;
    if (attendees !== undefined) eventData.attendees = attendees;

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('calendar_update_event');
    try {
      await creditService.deductCredits(req.user.userId, 'calendar_update_event', creditCost.cost, parseInt(id));
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost.cost
      });
    }

    const event = await GoogleCalendarService.updateEvent(req.user.userId, parseInt(id), eventData);

    res.json({
      success: true,
      event
    });
  } catch (error) {
    logger.error('Error updating calendar event:', error);
    res.status(500).json({ error: 'Failed to update calendar event', details: error.message });
  }
});

/**
 * Cancel calendar event (requires ZTR tokens)
 * POST /api/calendar/events/:id/cancel
 */
router.post('/events/:id/cancel', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const { id } = req.params;

    // Get pricing and deduct credits (cancel uses same pricing as delete)
    const creditCost = await ServicePricingService.getPricing('calendar_delete_event');
    try {
      await creditService.deductCredits(req.user.userId, 'calendar_delete_event', creditCost.cost, parseInt(id));
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost.cost
      });
    }

    const event = await GoogleCalendarService.cancelEvent(req.user.userId, parseInt(id));

    res.json({
      success: true,
      message: 'Event cancelled successfully',
      event
    });
  } catch (error) {
    logger.error('Error cancelling calendar event:', error);
    res.status(500).json({ error: 'Failed to cancel calendar event', details: error.message });
  }
});

/**
 * Delete calendar event (permanently) (requires ZTR tokens)
 * DELETE /api/calendar/events/:id
 */
router.delete('/events/:id', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const { id } = req.params;

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('calendar_delete_event');
    try {
      await creditService.deductCredits(req.user.userId, 'calendar_delete_event', creditCost.cost, parseInt(id));
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost.cost
      });
    }

    await GoogleCalendarService.deleteEvent(req.user.userId, parseInt(id));

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting calendar event:', error);
    res.status(500).json({ error: 'Failed to delete calendar event', details: error.message });
  }
});

module.exports = router;

