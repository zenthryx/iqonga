/**
 * Sales Cadences API Routes
 * Handles multi-step sales sequence management
 */

const express = require('express');
const router = express.Router();
const SalesCadenceService = require('../services/SalesCadenceService');
const CreditService = require('../services/CreditService');
const ServicePricingService = require('../services/ServicePricingService');
const { authenticateToken } = require('../middleware/auth');

// Initialize credit service
const creditService = new CreditService();

// ====================================
// CADENCE MANAGEMENT
// ====================================

// GET /api/sales-cadences - Get all cadences
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      channel: req.query.channel,
      search: req.query.search
    };

    const cadences = await SalesCadenceService.getCadences(userId, filters);

    res.json({
      success: true,
      data: cadences
    });
  } catch (error) {
    console.error('Get cadences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cadences',
      message: error.message
    });
  }
});

// GET /api/sales-cadences/:id - Get cadence by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const cadenceId = req.params.id;

    const cadence = await SalesCadenceService.getCadenceById(cadenceId, userId);

    if (!cadence) {
      return res.status(404).json({
        success: false,
        error: 'Cadence not found'
      });
    }

    res.json({
      success: true,
      data: cadence
    });
  } catch (error) {
    console.error('Get cadence error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cadence',
      message: error.message
    });
  }
});

// POST /api/sales-cadences - Create cadence
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const cadenceData = req.body;
  const creditCost = await ServicePricingService.getPricing('sales_cadence_create');

  try {
      await creditService.deductCredits(userId, 'sales_cadence_create', creditCost);
  } catch (creditError) {
    return res.status(402).json({
      success: false,
      error: 'Insufficient credits',
      details: creditError.message,
      requiredCredits: creditCost
    });
  }

  try {
    const cadence = await SalesCadenceService.createCadence(userId, cadenceData);

    res.status(201).json({
      success: true,
      data: cadence,
      message: 'Cadence created successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Create cadence error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create cadence',
      message: error.message
    });
  }
});

// PUT /api/sales-cadences/:id - Update cadence
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const cadenceId = req.params.id;
    const updates = req.body;
    const creditCost = await ServicePricingService.getPricing('sales_cadence_update');

    try {
      await CreditService.deductCredits(userId, 'sales_cadence_update', creditCost);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const cadence = await SalesCadenceService.updateCadence(cadenceId, userId, updates);

    if (!cadence) {
      return res.status(404).json({
        success: false,
        error: 'Cadence not found'
      });
    }

    res.json({
      success: true,
      data: cadence,
      message: 'Cadence updated successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Update cadence error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cadence',
      message: error.message
    });
  }
});

// DELETE /api/sales-cadences/:id - Delete cadence
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const cadenceId = req.params.id;
    const creditCost = await ServicePricingService.getPricing('sales_cadence_delete');

    try {
      await CreditService.deductCredits(userId, 'sales_cadence_delete', creditCost);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const deleted = await SalesCadenceService.deleteCadence(cadenceId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Cadence not found'
      });
    }

    res.json({
      success: true,
      message: 'Cadence deleted successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Delete cadence error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete cadence',
      message: error.message
    });
  }
});

// GET /api/sales-cadences/:id/stats - Get cadence statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const cadenceId = req.params.id;

    const stats = await SalesCadenceService.getCadenceStats(cadenceId, userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get cadence stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cadence statistics',
      message: error.message
    });
  }
});

// ====================================
// CADENCE STEPS MANAGEMENT
// ====================================

// GET /api/sales-cadences/:id/steps - Get steps for cadence
router.get('/:id/steps', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const cadenceId = req.params.id;

    const steps = await SalesCadenceService.getSteps(cadenceId, userId);

    res.json({
      success: true,
      data: steps
    });
  } catch (error) {
    console.error('Get cadence steps error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cadence steps',
      message: error.message
    });
  }
});

// POST /api/sales-cadences/:id/steps - Add step to cadence
router.post('/:id/steps', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const cadenceId = req.params.id;
    const stepData = req.body;
    const creditCost = await ServicePricingService.getPricing('sales_cadence_add_step');

    try {
      await CreditService.deductCredits(userId, 'sales_cadence_add_step', creditCost);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const step = await SalesCadenceService.addStep(cadenceId, userId, stepData);

    res.status(201).json({
      success: true,
      data: step,
      message: 'Step added successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Add step error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add step',
      message: error.message
    });
  }
});

// PUT /api/sales-cadences/:id/steps/:stepId - Update step
router.put('/:id/steps/:stepId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const cadenceId = req.params.id;
    const stepId = req.params.stepId;
    const updates = req.body;
    const creditCost = await ServicePricingService.getPricing('sales_cadence_update_step');

    try {
      await CreditService.deductCredits(userId, 'sales_cadence_update_step', creditCost);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const step = await SalesCadenceService.updateStep(stepId, cadenceId, userId, updates);

    if (!step) {
      return res.status(404).json({
        success: false,
        error: 'Step not found'
      });
    }

    res.json({
      success: true,
      data: step,
      message: 'Step updated successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Update step error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update step',
      message: error.message
    });
  }
});

// DELETE /api/sales-cadences/:id/steps/:stepId - Delete step
router.delete('/:id/steps/:stepId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const cadenceId = req.params.id;
    const stepId = req.params.stepId;
    const creditCost = await ServicePricingService.getPricing('sales_cadence_delete_step');

    try {
      await CreditService.deductCredits(userId, 'sales_cadence_delete_step', creditCost);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const deleted = await SalesCadenceService.deleteStep(stepId, cadenceId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Step not found'
      });
    }

    res.json({
      success: true,
      message: 'Step deleted successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Delete step error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete step',
      message: error.message
    });
  }
});

// ====================================
// ENROLLMENT MANAGEMENT
// ====================================

// GET /api/sales-cadences/:id/enrollments - Get enrollments for cadence
router.get('/:id/enrollments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const cadenceId = req.params.id;
    const filters = {
      status: req.query.status
    };

    const enrollments = await SalesCadenceService.getEnrollments(cadenceId, userId, filters);

    res.json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch enrollments',
      message: error.message
    });
  }
});

// POST /api/sales-cadences/:id/enroll - Enroll lead/deal in cadence
router.post('/:id/enroll', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const cadenceId = req.params.id;
    const { leadId, dealId } = req.body;
    const creditCost = await ServicePricingService.getPricing('sales_cadence_enroll');

    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: 'leadId is required'
      });
    }

    try {
      await CreditService.deductCredits(userId, 'sales_cadence_enroll', creditCost);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const enrollment = await SalesCadenceService.enrollLead(cadenceId, userId, leadId, dealId);

    res.status(201).json({
      success: true,
      data: enrollment,
      message: 'Lead enrolled in cadence successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Enroll lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enroll lead',
      message: error.message
    });
  }
});

// POST /api/sales-cadences/enrollments/:enrollmentId/pause - Pause enrollment
router.post('/enrollments/:enrollmentId/pause', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const enrollmentId = req.params.enrollmentId;

    const enrollment = await SalesCadenceService.pauseEnrollment(enrollmentId, userId);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found'
      });
    }

    res.json({
      success: true,
      data: enrollment,
      message: 'Enrollment paused successfully'
    });
  } catch (error) {
    console.error('Pause enrollment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause enrollment',
      message: error.message
    });
  }
});

// POST /api/sales-cadences/enrollments/:enrollmentId/resume - Resume enrollment
router.post('/enrollments/:enrollmentId/resume', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const enrollmentId = req.params.enrollmentId;

    const enrollment = await SalesCadenceService.resumeEnrollment(enrollmentId, userId);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found'
      });
    }

    res.json({
      success: true,
      data: enrollment,
      message: 'Enrollment resumed successfully'
    });
  } catch (error) {
    console.error('Resume enrollment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume enrollment',
      message: error.message
    });
  }
});

// POST /api/sales-cadences/enrollments/:enrollmentId/stop - Stop enrollment
router.post('/enrollments/:enrollmentId/stop', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const enrollmentId = req.params.enrollmentId;
    const { reason } = req.body;

    const enrollment = await SalesCadenceService.stopEnrollment(enrollmentId, userId, reason || 'Manual stop');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found'
      });
    }

    res.json({
      success: true,
      data: enrollment,
      message: 'Enrollment stopped successfully'
    });
  } catch (error) {
    console.error('Stop enrollment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop enrollment',
      message: error.message
    });
  }
});

module.exports = router;

