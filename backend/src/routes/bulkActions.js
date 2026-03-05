const express = require('express');
const router = express.Router();
const database = require('../database/connection');
const { Parser } = require('json2csv');
const { authenticateToken } = require('../middleware/auth');
const CreditService = require('../services/CreditService');
const ServicePricingService = require('../services/ServicePricingService');
const { v4: uuidv4 } = require('uuid');

// Initialize credit service
const creditService = new CreditService();

// POST /api/bulk-actions/leads/update - Bulk update leads
router.post('/leads/update', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { leadIds, updates } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'leadIds array is required'
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'updates object is required'
      });
    }

    // Get pricing and deduct credits (per lead)
    const creditCostPerItem = await ServicePricingService.getPricing('sales_bulk_update');
    const totalCreditCost = creditCostPerItem * leadIds.length;
    const bulkActionId = uuidv4();
    
    try {
      await creditService.deductCredits(userId, 'sales_bulk_update', totalCreditCost, bulkActionId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: totalCreditCost,
        itemCount: leadIds.length,
        costPerItem: creditCostPerItem
      });
    }

    // Build UPDATE query
    const sets = [];
    const values = [userId, leadIds];
    let paramCount = 2;

    if (updates.status !== undefined) {
      sets.push(`status = $${++paramCount}`);
      values.push(updates.status);
    }
    if (updates.stage !== undefined) {
      sets.push(`stage = $${++paramCount}`);
      values.push(updates.stage);
    }
    if (updates.assigned_to !== undefined) {
      sets.push(`assigned_to = $${++paramCount}`, `assigned_at = NOW()`);
      values.push(updates.assigned_to);
    }
    if (updates.tags !== undefined) {
      sets.push(`tags = $${++paramCount}`);
      values.push(updates.tags);
    }

    if (sets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid updates provided'
      });
    }

    sets.push(`updated_at = NOW()`);

    const query = `
      UPDATE leads
      SET ${sets.join(', ')}
      WHERE user_id = $1 AND id = ANY($2::uuid[])
      RETURNING id
    `;

    const result = await database.query(query, values);

    res.json({
      success: true,
      data: {
        updatedCount: result.rows.length
      },
      message: `${result.rows.length} leads updated successfully`,
      creditsUsed: totalCreditCost,
      costPerItem: creditCostPerItem
    });
  } catch (error) {
    console.error('Bulk update leads error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update leads',
      message: error.message
    });
  }
});

// POST /api/bulk-actions/leads/assign - Bulk assign leads
router.post('/leads/assign', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { leadIds, assignedTo } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'leadIds array is required'
      });
    }

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        error: 'assignedTo is required'
      });
    }

    // Get pricing and deduct credits (per lead)
    const creditCostPerItem = await ServicePricingService.getPricing('sales_bulk_assign');
    const totalCreditCost = creditCostPerItem * leadIds.length;
    const bulkActionId = uuidv4();
    
    try {
      await creditService.deductCredits(userId, 'sales_bulk_assign', totalCreditCost, bulkActionId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: totalCreditCost,
        itemCount: leadIds.length,
        costPerItem: creditCostPerItem
      });
    }

    const query = `
      UPDATE leads
      SET assigned_to = $1, assigned_at = NOW(), updated_at = NOW()
      WHERE user_id = $2 AND id = ANY($3::uuid[])
      RETURNING id
    `;

    const result = await database.query(query, [assignedTo, userId, leadIds]);

    res.json({
      success: true,
      data: {
        assignedCount: result.rows.length
      },
      message: `${result.rows.length} leads assigned successfully`,
      creditsUsed: totalCreditCost,
      costPerItem: creditCostPerItem
    });
  } catch (error) {
    console.error('Bulk assign leads error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk assign leads',
      message: error.message
    });
  }
});

// POST /api/bulk-actions/leads/delete - Bulk delete leads
router.post('/leads/delete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { leadIds } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'leadIds array is required'
      });
    }

    const query = `
      DELETE FROM leads
      WHERE user_id = $1 AND id = ANY($2::uuid[])
      RETURNING id
    `;

    const result = await database.query(query, [userId, leadIds]);

    res.json({
      success: true,
      data: {
        deletedCount: result.rows.length
      },
      message: `${result.rows.length} leads deleted successfully`
    });
  } catch (error) {
    console.error('Bulk delete leads error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk delete leads',
      message: error.message
    });
  }
});

// GET /api/bulk-actions/leads/export - Export leads to CSV
router.get('/leads/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { leadIds } = req.query;

    let query, params;

    if (leadIds) {
      const ids = leadIds.split(',');
      query = `
        SELECT 
          first_name, last_name, email, phone, company_name, job_title,
          source, status, stage, lead_score, created_at
        FROM leads
        WHERE user_id = $1 AND id = ANY($2::uuid[])
        ORDER BY created_at DESC
      `;
      params = [userId, ids];
    } else {
      query = `
        SELECT 
          first_name, last_name, email, phone, company_name, job_title,
          source, status, stage, lead_score, created_at
        FROM leads
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      params = [userId];
    }

    const result = await database.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No leads to export'
      });
    }

    const fields = ['first_name', 'last_name', 'email', 'phone', 'company_name', 
                    'job_title', 'source', 'status', 'stage', 'lead_score', 'created_at'];
    const parser = new Parser({ fields });
    const csv = parser.parse(result.rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export leads error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export leads',
      message: error.message
    });
  }
});

// POST /api/bulk-actions/deals/update - Bulk update deals
router.post('/deals/update', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { dealIds, updates } = req.body;

    if (!dealIds || !Array.isArray(dealIds) || dealIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'dealIds array is required'
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'updates object is required'
      });
    }

    // Get pricing and deduct credits (per deal)
    const creditCostPerItem = await ServicePricingService.getPricing('sales_bulk_update');
    const totalCreditCost = creditCostPerItem * dealIds.length;
    const bulkActionId = uuidv4();
    
    try {
      await creditService.deductCredits(userId, 'sales_bulk_update', totalCreditCost, bulkActionId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: totalCreditCost,
        itemCount: dealIds.length,
        costPerItem: creditCostPerItem
      });
    }

    // Build UPDATE query
    const sets = [];
    const values = [userId, dealIds];
    let paramCount = 2;

    if (updates.status !== undefined) {
      sets.push(`status = $${++paramCount}`);
      values.push(updates.status);
    }
    if (updates.stage !== undefined) {
      sets.push(`stage = $${++paramCount}`);
      values.push(updates.stage);
    }
    if (updates.assigned_to !== undefined) {
      sets.push(`assigned_to = $${++paramCount}`, `assigned_at = NOW()`);
      values.push(updates.assigned_to);
    }

    if (sets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid updates provided'
      });
    }

    sets.push(`updated_at = NOW()`);

    const query = `
      UPDATE deals
      SET ${sets.join(', ')}
      WHERE user_id = $1 AND id = ANY($2::uuid[])
      RETURNING id
    `;

    const result = await database.query(query, values);

    res.json({
      success: true,
      data: {
        updatedCount: result.rows.length
      },
      message: `${result.rows.length} deals updated successfully`,
      creditsUsed: totalCreditCost,
      costPerItem: creditCostPerItem
    });
  } catch (error) {
    console.error('Bulk update deals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update deals',
      message: error.message
    });
  }
});

// POST /api/bulk-actions/activities/complete - Bulk complete activities
router.post('/activities/complete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { activityIds } = req.body;

    if (!activityIds || !Array.isArray(activityIds) || activityIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'activityIds array is required'
      });
    }

    const query = `
      UPDATE activities
      SET is_completed = true, completed_at = NOW(), updated_at = NOW()
      WHERE user_id = $1 AND id = ANY($2::uuid[])
      RETURNING id
    `;

    const result = await database.query(query, [userId, activityIds]);

    res.json({
      success: true,
      data: {
        completedCount: result.rows.length
      },
      message: `${result.rows.length} activities marked as complete`
    });
  } catch (error) {
    console.error('Bulk complete activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk complete activities',
      message: error.message
    });
  }
});

// POST /api/bulk-actions/activities/delete - Bulk delete activities
router.post('/activities/delete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { activityIds } = req.body;

    if (!activityIds || !Array.isArray(activityIds) || activityIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'activityIds array is required'
      });
    }

    const query = `
      DELETE FROM activities
      WHERE user_id = $1 AND id = ANY($2::uuid[])
      RETURNING id
    `;

    const result = await database.query(query, [userId, activityIds]);

    res.json({
      success: true,
      data: {
        deletedCount: result.rows.length
      },
      message: `${result.rows.length} activities deleted successfully`
    });
  } catch (error) {
    console.error('Bulk delete activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk delete activities',
      message: error.message
    });
  }
});

module.exports = router;

