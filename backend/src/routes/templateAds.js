const express = require('express');
const router = express.Router();
const TemplateAdService = require('../services/TemplateAdService');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const logger = require('../utils/logger');

const upload = multer({ dest: 'uploads/temp/' });

// GET /api/template-ads/templates - List templates
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const templates = await TemplateAdService.listTemplates(req.user.id, {
      category: req.query.category,
      platform: req.query.platform,
      search: req.query.search,
      includePublic: req.query.includePublic !== 'false'
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    logger.error('Failed to list templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/template-ads/templates/:id - Get template by ID
router.get('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const template = await TemplateAdService.getTemplateById(req.params.id, req.user.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (error) {
    logger.error('Failed to get template:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/template-ads/templates - Create template
router.post('/templates', authenticateToken, async (req, res) => {
  try {
    const template = await TemplateAdService.createTemplate(req.user.id, req.body);
    res.json({ success: true, data: template });
  } catch (error) {
    logger.error('Failed to create template:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/template-ads/templates/:id - Update template
router.put('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const template = await TemplateAdService.updateTemplate(
      req.params.id,
      req.user.id,
      req.body
    );
    res.json({ success: true, data: template });
  } catch (error) {
    logger.error('Failed to update template:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/template-ads/templates/:id - Delete template
router.delete('/templates/:id', authenticateToken, async (req, res) => {
  try {
    await TemplateAdService.deleteTemplate(req.params.id, req.user.id);
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    logger.error('Failed to delete template:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/template-ads/templates/:id/generate - Generate variations
router.post('/templates/:id/generate', authenticateToken, async (req, res) => {
  try {
    const { copyVariants, platform, format, saveToDatabase = true } = req.body;
    
    if (!copyVariants || !Array.isArray(copyVariants)) {
      return res.status(400).json({ error: 'copyVariants array is required' });
    }
    
    const results = await TemplateAdService.generateVariations(
      req.params.id,
      req.user.id,
      copyVariants,
      { platform, format, saveToDatabase }
    );
    
    res.json({ 
      success: true, 
      data: results,
      count: results.filter(r => !r.error).length,
      errors: results.filter(r => r.error).length
    });
  } catch (error) {
    logger.error('Failed to generate variations:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/template-ads/templates/:id/batch-generate - Batch generate from CSV
router.post('/templates/:id/batch-generate', authenticateToken, upload.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }
    
    const results = await TemplateAdService.processCSVAndGenerate(
      req.file,
      req.params.id,
      req.user.id,
      { platform: req.body.platform, format: req.body.format }
    );
    
    res.json({ 
      success: true, 
      data: results,
      count: results.filter(r => !r.error).length,
      errors: results.filter(r => r.error).length
    });
  } catch (error) {
    logger.error('Failed to process CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/template-ads/templates/:id/generated - Get generated ads for template
router.get('/templates/:id/generated', authenticateToken, async (req, res) => {
  try {
    const ads = await TemplateAdService.getGeneratedAds(
      req.params.id,
      req.user.id,
      {
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      }
    );
    res.json({ success: true, data: ads });
  } catch (error) {
    logger.error('Failed to get generated ads:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
