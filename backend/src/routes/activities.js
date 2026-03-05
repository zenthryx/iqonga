const express = require('express');
const router = express.Router();
const ActivityTrackingService = require('../services/ActivityTrackingService');
const database = require('../database/connection');
const CreditService = require('../services/CreditService');
const ServicePricingService = require('../services/ServicePricingService');
const { v4: uuidv4 } = require('uuid');

// Initialize credit service
const creditService = new CreditService();

// Auth middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token structure' });
    }
    
    const userResult = await database.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Apply auth middleware to all routes
router.use(authenticateToken);

// GET /api/activities - Get all activities with filters
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Build filters
    const filters = {};
    if (req.query.type) filters.activity_type = req.query.type;
    if (req.query.lead_id) filters.lead_id = req.query.lead_id;
    if (req.query.deal_id) filters.deal_id = req.query.deal_id;

    // Call service with correct signature
    const result = await ActivityTrackingService.getActivities(userId, filters, { page, limit });

    res.json({
      success: true,
      data: result.activities || [],
      total: result.total || 0,
      page: result.page || page,
      limit: result.limit || limit,
      totalPages: result.totalPages || 0
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activities',
      message: error.message
    });
  }
});

// GET /api/activities/:id - Get single activity
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const activityId = req.params.id;

    const activity = await ActivityTrackingService.getActivityById(userId, activityId);

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity',
      message: error.message
    });
  }
});

// POST /api/activities - Create new activity
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const activityData = req.body;

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('sales_activity_log');
    const activityId = uuidv4();
    
    try {
      await creditService.deductCredits(userId, 'sales_activity_log', creditCost, activityId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const activity = await ActivityTrackingService.logActivity(userId, activityData);

    res.status(201).json({
      success: true,
      data: activity,
      message: 'Activity created successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create activity',
      message: error.message
    });
  }
});

// PUT /api/activities/:id - Update activity
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const activityId = req.params.id;
    const updates = req.body;

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('sales_activity_update');
    
    try {
      await creditService.deductCredits(userId, 'sales_activity_update', creditCost, activityId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const activity = await ActivityTrackingService.updateActivity(activityId, userId, updates); // FIXED: activityId first!

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    res.json({
      success: true,
      data: activity,
      message: 'Activity updated successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update activity',
      message: error.message
    });
  }
});

// POST /api/activities/:id/complete - Mark activity/task as complete
router.post('/:id/complete', async (req, res) => {
  try {
    const userId = req.user.id;
    const activityId = req.params.id;

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('sales_activity_complete');
    
    try {
      await creditService.deductCredits(userId, 'sales_activity_complete', creditCost, activityId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Update activity to mark as complete
    const activity = await ActivityTrackingService.updateActivity(activityId, userId, { // FIXED: activityId first!
      is_completed: true,
      completed_at: new Date()
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    res.json({
      success: true,
      data: activity,
      message: 'Activity marked as complete',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Complete activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete activity',
      message: error.message
    });
  }
});

// DELETE /api/activities/:id - Delete activity
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const activityId = req.params.id;

    const success = await ActivityTrackingService.deleteActivity(userId, activityId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    res.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete activity',
      message: error.message
    });
  }
});

// PUT /api/activities/:id/complete - Mark activity as complete
router.put('/:id/complete', async (req, res) => {
  try {
    const userId = req.user.id;
    const activityId = req.params.id;

    const activity = await ActivityTrackingService.completeActivity(userId, activityId);

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    res.json({
      success: true,
      data: activity,
      message: 'Activity marked as complete'
    });
  } catch (error) {
    console.error('Complete activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete activity',
      message: error.message
    });
  }
});

// GET /api/activities/timeline/lead/:leadId - Get activity timeline for a lead
router.get('/timeline/lead/:leadId', async (req, res) => {
  try {
    const userId = req.user.id;
    const leadId = req.params.leadId;

    const activities = await ActivityTrackingService.getLeadTimeline(userId, leadId);

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get lead timeline error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead timeline',
      message: error.message
    });
  }
});

// GET /api/activities/timeline/deal/:dealId - Get activity timeline for a deal
router.get('/timeline/deal/:dealId', async (req, res) => {
  try {
    const userId = req.user.id;
    const dealId = req.params.dealId;

    const activities = await ActivityTrackingService.getDealTimeline(userId, dealId);

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get deal timeline error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deal timeline',
      message: error.message
    });
  }
});

// GET /api/activities/overdue - Get overdue tasks
router.get('/overdue', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await database.query(
      `SELECT a.*, 
        l.first_name || ' ' || l.last_name as lead_name,
        d.deal_name
       FROM activities a
       LEFT JOIN leads l ON a.lead_id = l.id
       LEFT JOIN deals d ON a.deal_id = d.id
       WHERE a.user_id = $1 
         AND a.activity_type = 'task'
         AND a.is_completed = false
         AND a.task_due_date < NOW()
       ORDER BY a.task_due_date ASC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get overdue tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overdue tasks',
      message: error.message
    });
  }
});

// GET /api/activities/stats - Get activity statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get activity counts by type
    const typeResult = await database.query(
      `SELECT 
        activity_type,
        COUNT(*) as count
       FROM activities
       WHERE user_id = $1
       GROUP BY activity_type`,
      [userId]
    );

    // Get pending/overdue task counts
    const taskResult = await database.query(
      `SELECT 
        COUNT(*) FILTER (WHERE is_completed = false) as pending_tasks,
        COUNT(*) FILTER (WHERE is_completed = false AND task_due_date < NOW()) as overdue_tasks
       FROM activities
       WHERE user_id = $1 AND activity_type = 'task'`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        by_type: typeResult.rows,
        pending_tasks: parseInt(taskResult.rows[0].pending_tasks) || 0,
        overdue_tasks: parseInt(taskResult.rows[0].overdue_tasks) || 0
      }
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity statistics',
      message: error.message
    });
  }
});

module.exports = router;
