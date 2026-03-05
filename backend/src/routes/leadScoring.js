const express = require('express');
const router = express.Router();
const LeadScoringService = require('../services/LeadScoringService');
const { authenticateToken } = require('../middleware/auth');
const CreditService = require('../services/CreditService');
const ServicePricingService = require('../services/ServicePricingService');
const { v4: uuidv4 } = require('uuid');

// Initialize credit service
const creditService = new CreditService();

// POST /api/lead-scoring/rules - Create scoring rule
router.post('/rules', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const ruleData = req.body;

    const rule = await LeadScoringService.createScoringRule(userId, ruleData);

    res.status(201).json({
      success: true,
      data: rule,
      message: 'Scoring rule created successfully'
    });
  } catch (error) {
    console.error('Create scoring rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create scoring rule',
      message: error.message
    });
  }
});

// GET /api/lead-scoring/rules - Get all scoring rules
router.get('/rules', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const rules = await LeadScoringService.getScoringRules(userId);

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('Get scoring rules error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scoring rules',
      message: error.message
    });
  }
});

// GET /api/lead-scoring/rules/:ruleId - Get specific scoring rule
router.get('/rules/:ruleId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ruleId } = req.params;

    const rule = await LeadScoringService.getScoringRule(ruleId, userId);

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Get scoring rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scoring rule',
      message: error.message
    });
  }
});

// PUT /api/lead-scoring/rules/:ruleId - Update scoring rule
router.put('/rules/:ruleId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ruleId } = req.params;
    const updates = req.body;

    const rule = await LeadScoringService.updateScoringRule(ruleId, userId, updates);

    res.json({
      success: true,
      data: rule,
      message: 'Scoring rule updated successfully'
    });
  } catch (error) {
    console.error('Update scoring rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update scoring rule',
      message: error.message
    });
  }
});

// DELETE /api/lead-scoring/rules/:ruleId - Delete scoring rule
router.delete('/rules/:ruleId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ruleId } = req.params;

    await LeadScoringService.deleteScoringRule(ruleId, userId);

    res.json({
      success: true,
      message: 'Scoring rule deleted successfully'
    });
  } catch (error) {
    console.error('Delete scoring rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete scoring rule',
      message: error.message
    });
  }
});

// POST /api/lead-scoring/calculate/:leadId - Calculate lead score
router.post('/calculate/:leadId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { leadId } = req.params;

    // Get pricing and deduct credits
    // Check if AI scoring is requested
    const useAI = req.body.useAI || false;
    const serviceKey = useAI ? 'sales_lead_score_ai' : 'sales_lead_score_auto';
    const creditCost = await ServicePricingService.getPricing(serviceKey);
    
    try {
      await creditService.deductCredits(userId, serviceKey, creditCost, leadId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const lead = await LeadScoringService.calculateLeadScore(leadId, userId);

    res.json({
      success: true,
      data: lead,
      message: 'Lead score calculated successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Calculate lead score error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate lead score',
      message: error.message
    });
  }
});

// GET /api/lead-scoring/history/:leadId - Get score history
router.get('/history/:leadId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { leadId } = req.params;

    const history = await LeadScoringService.getScoreHistory(leadId, userId);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get score history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch score history',
      message: error.message
    });
  }
});

module.exports = router;

