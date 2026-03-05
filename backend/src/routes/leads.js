const express = require('express');
const router = express.Router();
const LeadManagementService = require('../services/LeadManagementService');
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

// GET /api/leads - Get all leads with filters
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Build filters
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.source) filters.source = req.query.source;
    if (req.query.qualified !== undefined) filters.is_qualified = req.query.qualified === 'true';
    if (req.query.min_score) filters.min_score = parseInt(req.query.min_score);
    if (req.query.search) filters.search = req.query.search;

    // Call service with correct signature
    const result = await LeadManagementService.getLeads(userId, filters, { page, limit });

    res.json({
      success: true,
      data: result.leads || [],
      total: result.total || 0,
      page: result.page || page,
      limit: result.limit || limit,
      totalPages: result.totalPages || 0
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads',
      message: error.message
    });
  }
});

// GET /api/leads/check-duplicate - Check for duplicate lead (MUST be before /:id route!)
router.get('/check-duplicate', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const userId = req.user.id;
    
    // Check if lead with this email exists for this user
    const existingLead = await database.query(
      'SELECT * FROM leads WHERE user_id = $1 AND email = $2 LIMIT 1',
      [userId, email]
    );

    if (existingLead.rows.length > 0) {
      return res.json({
        success: true,
        isDuplicate: true,
        lead: existingLead.rows[0]
      });
    }

    res.json({
      success: true,
      isDuplicate: false
    });
  } catch (error) {
    console.error('Check duplicate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check for duplicate',
      message: error.message
    });
  }
});

// GET /api/leads/:id - Get single lead
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const leadId = req.params.id;

    const lead = await LeadManagementService.getLeadById(leadId, userId); // FIXED: leadId first!

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead',
      message: error.message
    });
  }
});

// POST /api/leads - Create new lead
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const leadData = req.body;

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('sales_lead_create');
    const leadId = uuidv4();
    
    try {
      await creditService.deductCredits(userId, 'sales_lead_create', creditCost, leadId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Pass the entire leadData object to the service
    const lead = await LeadManagementService.createLead(userId, leadData);

    res.status(201).json({
      success: true,
      data: lead,
      message: 'Lead created successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create lead',
      message: error.message
    });
  }
});

// PUT /api/leads/:id - Update lead
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const leadId = req.params.id;
    const updates = req.body;

    const lead = await LeadManagementService.updateLead(userId, leadId, updates);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: lead,
      message: 'Lead updated successfully'
    });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lead',
      message: error.message
    });
  }
});

// DELETE /api/leads/:id - Delete lead
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const leadId = req.params.id;

    const success = await LeadManagementService.deleteLead(userId, leadId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lead',
      message: error.message
    });
  }
});

// POST /api/leads/:id/qualify - Qualify a lead
router.post('/:id/qualify', async (req, res) => {
  try {
    const userId = req.user.id;
    const leadId = req.params.id;
    const { notes } = req.body;

    const lead = await LeadManagementService.qualifyLead(userId, leadId, notes);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: lead,
      message: 'Lead qualified successfully'
    });
  } catch (error) {
    console.error('Qualify lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to qualify lead',
      message: error.message
    });
  }
});

// POST /api/leads/:id/convert - Convert lead to deal
router.post('/:id/convert', async (req, res) => {
  try {
    const userId = req.user.id;
    const leadId = req.params.id;
    const { deal_name, amount, currency, close_date, pipeline_id, stage_id } = req.body;

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('sales_lead_convert');
    
    try {
      await creditService.deductCredits(userId, 'sales_lead_convert', creditCost, leadId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const result = await LeadManagementService.convertLeadToDeal(
      userId,
      leadId,
      deal_name,
      amount,
      currency,
      close_date,
      pipeline_id,
      stage_id
    );

    res.json({
      success: true,
      data: result,
      message: 'Lead converted to deal successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Convert lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to convert lead',
      message: error.message
    });
  }
});

// GET /api/leads/:id/activities - Get lead activities
router.get('/:id/activities', async (req, res) => {
  try {
    const userId = req.user.id;
    const leadId = req.params.id;

    const result = await database.query(
      `SELECT a.*, u.username as created_by_name
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.lead_id = $1 AND a.user_id = $2
       ORDER BY a.created_at DESC`,
      [leadId, userId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get lead activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activities',
      message: error.message
    });
  }
});

module.exports = router;
