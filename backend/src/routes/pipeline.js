const express = require('express');
const router = express.Router();
const PipelineService = require('../services/PipelineService');
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

// GET /api/pipeline/pipelines - Get all pipelines
// Note: Pipeline is a VARCHAR in deals table, not a separate table yet
router.get('/pipelines', async (req, res) => {
  try {
    // Return default pipeline structure
    // In migration, pipeline is just a VARCHAR column, not a separate table
    const pipelines = [
      {
        id: 'default',
        pipeline_name: 'Sales Pipeline',
        is_default: true,
        created_at: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      data: pipelines
    });
  } catch (error) {
    console.error('Get pipelines error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pipelines',
      message: error.message
    });
  }
});

// GET /api/pipeline/pipelines/:pipelineId/stages - Get pipeline stages
// Note: Stage is a VARCHAR in deals table, not a separate table yet
router.get('/pipelines/:pipelineId/stages', async (req, res) => {
  try {
    // Return default stages matching migration comments
    const stages = [
      { id: 'lead', stage_name: 'Lead', stage_order: 1, win_probability: 10 },
      { id: 'qualified', stage_name: 'Qualified', stage_order: 2, win_probability: 25 },
      { id: 'meeting', stage_name: 'Meeting', stage_order: 3, win_probability: 40 },
      { id: 'proposal', stage_name: 'Proposal', stage_order: 4, win_probability: 60 },
      { id: 'negotiation', stage_name: 'Negotiation', stage_order: 5, win_probability: 80 },
      { id: 'closed_won', stage_name: 'Closed Won', stage_order: 6, win_probability: 100 },
      { id: 'closed_lost', stage_name: 'Closed Lost', stage_order: 7, win_probability: 0 }
    ];

    res.json({
      success: true,
      data: stages
    });
  } catch (error) {
    console.error('Get pipeline stages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pipeline stages',
      message: error.message
    });
  }
});

// GET /api/pipeline/deals - Get all deals with filters
router.get('/deals', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000; // High limit for pipeline board

    // Build filters
    const filters = {};
    if (req.query.pipeline_id) filters.pipeline = req.query.pipeline_id; // pipeline is VARCHAR
    if (req.query.stage_id) filters.stage = req.query.stage_id; // stage is VARCHAR
    if (req.query.status) filters.status = req.query.status;

    // Call service with correct signature
    const result = await PipelineService.getDeals(userId, filters, { page, limit });
    
    res.json({
      success: true,
      data: result.deals || [],
      total: result.total || 0,
      page: result.page || page,
      limit: result.limit || limit
    });
  } catch (error) {
    console.error('Get deals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deals',
      message: error.message
    });
  }
});

// GET /api/pipeline/deals/:id - Get single deal
router.get('/deals/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const dealId = req.params.id;

    const deal = await PipelineService.getDealById(userId, dealId);

    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found'
      });
    }

    res.json({
      success: true,
      data: deal
    });
  } catch (error) {
    console.error('Get deal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deal',
      message: error.message
    });
  }
});

// POST /api/pipeline/deals - Create new deal
router.post('/deals', async (req, res) => {
  try {
    const userId = req.user.id;
    const companyProfileId = req.body.company_profile_id || null;
    const dealData = req.body;

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('sales_deal_create');
    const dealId = uuidv4();
    
    try {
      await creditService.deductCredits(userId, 'sales_deal_create', creditCost, dealId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const deal = await PipelineService.createDeal(userId, companyProfileId, dealData);

    res.status(201).json({
      success: true,
      data: deal,
      message: 'Deal created successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Create deal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create deal',
      message: error.message
    });
  }
});

// PUT /api/pipeline/deals/:id - Update deal
router.put('/deals/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const dealId = req.params.id;
    const updates = req.body;

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('sales_deal_update');
    
    try {
      await creditService.deductCredits(userId, 'sales_deal_update', creditCost, dealId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const deal = await PipelineService.updateDeal(userId, dealId, updates);

    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found'
      });
    }

    res.json({
      success: true,
      data: deal,
      message: 'Deal updated successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Update deal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update deal',
      message: error.message
    });
  }
});

// DELETE /api/pipeline/deals/:id - Delete deal
router.delete('/deals/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const dealId = req.params.id;

    const success = await PipelineService.deleteDeal(userId, dealId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found'
      });
    }

    res.json({
      success: true,
      message: 'Deal deleted successfully'
    });
  } catch (error) {
    console.error('Delete deal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete deal',
      message: error.message
    });
  }
});

// PUT /api/pipeline/deals/:id/stage - Move deal to different stage
router.put('/deals/:id/stage', async (req, res) => {
  try {
    const userId = req.user.id;
    const dealId = req.params.id;
    const { stage_id } = req.body;

    if (!stage_id) {
      return res.status(400).json({
        success: false,
        error: 'stage_id is required'
      });
    }

    // Update deal stage directly (stage is VARCHAR, not foreign key)
    const result = await database.query(
      `UPDATE deals 
       SET stage = $1, stage_entered_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [stage_id, dealId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Deal moved successfully'
    });
  } catch (error) {
    console.error('Move deal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to move deal',
      message: error.message
    });
  }
});

// POST /api/pipeline/deals/:id/close-won - Close deal as won
router.post('/deals/:id/close-won', async (req, res) => {
  try {
    const userId = req.user.id;
    const dealId = req.params.id;
    const { notes } = req.body;

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('sales_deal_close');
    
    try {
      await creditService.deductCredits(userId, 'sales_deal_close', creditCost, dealId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const deal = await PipelineService.closeDeal(userId, dealId, 'Won', notes);

    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found'
      });
    }

    res.json({
      success: true,
      data: deal,
      message: 'Deal closed as won',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Close deal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to close deal',
      message: error.message
    });
  }
});

// POST /api/pipeline/deals/:id/close-lost - Close deal as lost
router.post('/deals/:id/close-lost', async (req, res) => {
  try {
    const userId = req.user.id;
    const dealId = req.params.id;
    const { notes, lost_reason } = req.body;

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('sales_deal_close');
    
    try {
      await creditService.deductCredits(userId, 'sales_deal_close', creditCost, dealId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const deal = await PipelineService.closeDeal(userId, dealId, 'Lost', notes, lost_reason);

    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found'
      });
    }

    res.json({
      success: true,
      data: deal,
      message: 'Deal closed as lost',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Close deal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to close deal',
      message: error.message
    });
  }
});

// GET /api/pipeline/dashboard - Get sales dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total pipeline value (all open deals)
    const pipelineResult = await database.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as total_pipeline_value,
        COUNT(*) as total_deals
       FROM deals 
       WHERE user_id = $1 AND status = 'open'`,
      [userId]
    );

    // Get won deals
    const wonResult = await database.query(
      `SELECT COUNT(*) as won_deals, COALESCE(SUM(amount), 0) as won_value
       FROM deals 
       WHERE user_id = $1 AND status = 'won'`,
      [userId]
    );

    // Get lost deals
    const lostResult = await database.query(
      `SELECT COUNT(*) as lost_deals
       FROM deals 
       WHERE user_id = $1 AND status = 'lost'`,
      [userId]
    );

    // Get open deals count
    const openResult = await database.query(
      `SELECT COUNT(*) as open_deals
       FROM deals 
       WHERE user_id = $1 AND status = 'open'`,
      [userId]
    );

    // Calculate win rate
    const totalClosed = parseInt(wonResult.rows[0].won_deals) + parseInt(lostResult.rows[0].lost_deals);
    const winRate = totalClosed > 0 
      ? (parseInt(wonResult.rows[0].won_deals) / totalClosed) * 100 
      : 0;

    // Calculate average deal size
    const avgDealResult = await database.query(
      `SELECT AVG(amount) as avg_deal_size
       FROM deals 
       WHERE user_id = $1 AND status = 'won'`,
      [userId]
    );

    // Get deals by stage (group by stage VARCHAR)
    const stageResult = await database.query(
      `SELECT 
        stage as stage_name,
        COUNT(id) as deal_count,
        COALESCE(SUM(amount), 0) as total_value
       FROM deals
       WHERE user_id = $1 AND status = 'open'
       GROUP BY stage
       ORDER BY stage`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        total_pipeline_value: parseFloat(pipelineResult.rows[0].total_pipeline_value),
        total_deals: parseInt(pipelineResult.rows[0].total_deals),
        won_deals: parseInt(wonResult.rows[0].won_deals),
        won_value: parseFloat(wonResult.rows[0].won_value),
        lost_deals: parseInt(lostResult.rows[0].lost_deals),
        open_deals: parseInt(openResult.rows[0].open_deals),
        win_rate: winRate,
        average_deal_size: parseFloat(avgDealResult.rows[0].avg_deal_size) || 0,
        deals_by_stage: stageResult.rows,
        forecast: {
          this_month: 0, // Implement if needed
          next_month: 0,
          this_quarter: 0
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message: error.message
    });
  }
});

module.exports = router;
