const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const AIImageEditingService = require('../services/AIImageEditingService');
const CreditService = require('../services/CreditService');
const ServicePricingService = require('../services/ServicePricingService');
const logger = require('../utils/logger');

const creditService = new CreditService();
const pricingService = ServicePricingService; // ServicePricingService is exported as an instance

/**
 * AI Image Editor Routes
 * AI-powered image editing capabilities
 */

// GET /api/ai-image-editor/filters - Get available smart filter styles
router.get('/filters', authenticateToken, (req, res) => {
  try {
    const filters = AIImageEditingService.getAvailableFilters();
    res.json({
      success: true,
      data: filters
    });
  } catch (error) {
    logger.error('Failed to get AI filters:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai-image-editor/remove-background - Remove background from image
router.post('/remove-background', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageUrl, prompt } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Get pricing
    const creditCost = await pricingService.getPricing('ai_background_removal') || 50;

    // Check and deduct credits
    const operationId = require('uuid').v4();
    try {
      await creditService.deductCredits(userId, 'ai_background_removal', creditCost, operationId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Perform background removal
    const result = await AIImageEditingService.removeBackground(imageUrl, { prompt });

    res.json({
      success: true,
      data: result,
      creditsUsed: creditCost
    });

  } catch (error) {
    logger.error('AI background removal failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai-image-editor/remove-object - Remove object from image
router.post('/remove-object', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageUrl, maskArea, prompt } = req.body;

    if (!imageUrl || !maskArea) {
      return res.status(400).json({ 
        error: 'Image URL and mask area are required. Mask area should be { x, y, width, height }' 
      });
    }

    // Get pricing
    const creditCost = await pricingService.getPricing('ai_object_removal') || 50;

    // Check and deduct credits
    const operationId = require('uuid').v4();
    try {
      await creditService.deductCredits(userId, 'ai_object_removal', creditCost, operationId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Perform object removal
    const result = await AIImageEditingService.removeObject(imageUrl, maskArea, { prompt });

    res.json({
      success: true,
      data: result,
      creditsUsed: creditCost
    });

  } catch (error) {
    logger.error('AI object removal failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai-image-editor/apply-filter - Apply AI smart filter
router.post('/apply-filter', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageUrl, filterStyle } = req.body;

    if (!imageUrl || !filterStyle) {
      return res.status(400).json({ error: 'Image URL and filter style are required' });
    }

    // Validate filter style
    const availableFilters = AIImageEditingService.getAvailableFilters();
    const validFilter = availableFilters.find(f => f.id === filterStyle);
    if (!validFilter) {
      return res.status(400).json({ 
        error: 'Invalid filter style',
        availableFilters: availableFilters.map(f => f.id)
      });
    }

    // Get pricing
    const creditCost = await pricingService.getPricing('ai_smart_filter') || 30;

    // Check and deduct credits
    const operationId = require('uuid').v4();
    try {
      await creditService.deductCredits(userId, 'ai_smart_filter', creditCost, operationId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Apply filter
    const result = await AIImageEditingService.applySmartFilter(imageUrl, filterStyle);

    res.json({
      success: true,
      data: result,
      creditsUsed: creditCost
    });

  } catch (error) {
    logger.error('AI smart filter application failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai-image-editor/upscale - Upscale image using AI
router.post('/upscale', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageUrl, scale = 2, prompt } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    if (scale < 1 || scale > 4) {
      return res.status(400).json({ error: 'Scale must be between 1 and 4' });
    }

    // Get pricing
    const creditCost = await pricingService.getPricing('ai_image_upscale') || 40;

    // Check and deduct credits
    const operationId = require('uuid').v4();
    try {
      await creditService.deductCredits(userId, 'ai_image_upscale', creditCost, operationId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Perform upscaling
    const result = await AIImageEditingService.upscaleImage(imageUrl, scale, { prompt });

    res.json({
      success: true,
      data: result,
      creditsUsed: creditCost
    });

  } catch (error) {
    logger.error('AI image upscaling failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai-image-editor/retouch - Apply AI retouching
router.post('/retouch', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageUrl, retouchOptions = {} } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Get pricing
    const creditCost = await pricingService.getPricing('ai_retouching') || 60;

    // Check and deduct credits
    const operationId = require('uuid').v4();
    try {
      await creditService.deductCredits(userId, 'ai_retouching', creditCost, operationId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Perform retouching
    const result = await AIImageEditingService.applyRetouching(imageUrl, retouchOptions);

    res.json({
      success: true,
      data: result,
      creditsUsed: creditCost
    });

  } catch (error) {
    logger.error('AI retouching failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai-image-editor/learn-style - Learn style from editing history
router.post('/learn-style', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sampleImageIds = [] } = req.body;

    // Get pricing
    const creditCost = await pricingService.getPricing('ai_style_learning') || 100;

    // Check and deduct credits
    const operationId = require('uuid').v4();
    try {
      await creditService.deductCredits(userId, 'ai_style_learning', creditCost, operationId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Learn style
    const result = await AIImageEditingService.learnStyleFromHistory(userId, sampleImageIds);

    res.json({
      success: true,
      data: result,
      creditsUsed: creditCost
    });

  } catch (error) {
    logger.error('Style learning failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai-image-editor/style-profiles - Get user's style profiles
router.get('/style-profiles', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const profiles = await AIImageEditingService.getUserStyleProfiles(userId);

    res.json({
      success: true,
      data: profiles
    });

  } catch (error) {
    logger.error('Failed to get style profiles:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai-image-editor/apply-style - Apply learned style to image
router.post('/apply-style', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageUrl, profileId } = req.body;

    if (!imageUrl || !profileId) {
      return res.status(400).json({ error: 'Image URL and profile ID are required' });
    }

    // Get pricing
    const creditCost = await pricingService.getPricing('ai_apply_style') || 40;

    // Check and deduct credits
    const operationId = require('uuid').v4();
    try {
      await creditService.deductCredits(userId, 'ai_apply_style', creditCost, operationId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Apply style
    const result = await AIImageEditingService.applyLearnedStyle(imageUrl, profileId);

    res.json({
      success: true,
      data: result,
      creditsUsed: creditCost
    });

  } catch (error) {
    logger.error('Apply learned style failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai-image-editor/generate-logo - Generate AI logo
router.post('/generate-logo', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { prompt, style, colors, shape, size } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Get pricing
    const creditCost = await pricingService.getPricing('ai_logo_generation') || 150;

    // Check and deduct credits
    const operationId = require('uuid').v4();
    try {
      await creditService.deductCredits(userId, 'ai_logo_generation', creditCost, operationId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Generate logo
    const result = await AIImageEditingService.generateLogo(prompt, {
      style,
      colors: colors || [],
      shape,
      size: size || '1024x1024'
    });

    res.json({
      success: true,
      data: result,
      creditsUsed: creditCost
    });

  } catch (error) {
    logger.error('AI logo generation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai-image-editor/logo-styles - Get available logo styles
router.get('/logo-styles', authenticateToken, (req, res) => {
  try {
    const styles = AIImageEditingService.getAvailableLogoStyles();
    res.json({
      success: true,
      data: styles
    });
  } catch (error) {
    logger.error('Failed to get logo styles:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai-image-editor/logo-shapes - Get available logo shapes
router.get('/logo-shapes', authenticateToken, (req, res) => {
  try {
    const shapes = AIImageEditingService.getAvailableLogoShapes();
    res.json({
      success: true,
      data: shapes
    });
  } catch (error) {
    logger.error('Failed to get logo shapes:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

