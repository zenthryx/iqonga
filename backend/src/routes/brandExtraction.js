const express = require('express');
const router = express.Router();
const WebsiteBrandExtractionService = require('../services/WebsiteBrandExtractionService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * POST /api/brand-extraction/extract
 * Extract brand from website URL (like Holo.ai's "Input your URL")
 */
router.post('/extract', authenticateToken, async (req, res) => {
  try {
    const { websiteUrl } = req.body;
    const userId = req.user.id;

    if (!websiteUrl) {
      return res.status(400).json({ 
        success: false,
        error: 'Website URL is required' 
      });
    }

    // Validate URL format
    try {
      new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
    } catch (error) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid URL format. Please enter a valid website URL (e.g., example.com or https://example.com)' 
      });
    }

    logger.info(`Brand extraction requested by user ${userId} for ${websiteUrl}`);

    const result = await WebsiteBrandExtractionService.extractBrandFromWebsite(
      userId,
      websiteUrl,
      {
        downloadImages: req.body.downloadImages !== false // Default to true
      }
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Brand extraction failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract brand from website. Please check the URL and try again.'
    });
  }
});

/**
 * GET /api/brand-extraction/status
 * Check if brand extraction is available
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Check if required dependencies are available
    const cheerio = require('cheerio');
    const sharp = require('sharp');
    
    res.json({
      success: true,
      available: true,
      message: 'Brand extraction is available'
    });
  } catch (error) {
    res.json({
      success: true,
      available: false,
      message: 'Brand extraction requires cheerio and sharp packages',
      error: error.message
    });
  }
});

module.exports = router;
