const express = require('express');
const router = express.Router();
const ContentSeriesService = require('../services/ContentSeriesService');
const { authenticateToken } = require('../middleware/auth');

const seriesService = new ContentSeriesService();

// GET /api/content-series - Get user's content series
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    const series = await seriesService.getUserSeries(userId, status);
    res.json({ success: true, data: series });
  } catch (error) {
    console.error('Error fetching content series:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/content-series/:id - Get series with pieces
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const series = await seriesService.getSeriesWithPieces(id, userId);
    res.json({ success: true, data: series });
  } catch (error) {
    console.error('Error fetching content series:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/content-series - Create new content series
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const series = await seriesService.createSeries(userId, req.body);
    res.json({ success: true, data: series });
  } catch (error) {
    console.error('Error creating content series:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/content-series/:id/generate - Generate all pieces for a series
router.post('/:id/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Run generation in background
    seriesService.generateSeries(id, userId)
      .then(result => {
        console.log(`Series ${id} generation completed`);
      })
      .catch(error => {
        console.error(`Series ${id} generation failed:`, error);
      });

    res.json({ 
      success: true, 
      message: 'Series generation started',
      data: { seriesId: id, status: 'generating' }
    });
  } catch (error) {
    console.error('Error starting series generation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/content-series/:id/schedule - Schedule all pieces in a series
router.post('/:id/schedule', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const result = await seriesService.scheduleSeries(id, userId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error scheduling content series:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/content-series/templates - Get content templates
router.get('/templates/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, framework_type } = req.query;
    const templates = await seriesService.getTemplates(userId, category, framework_type);
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/content-series/templates - Create custom template
router.post('/templates', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const template = await seriesService.createTemplate(userId, req.body);
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

