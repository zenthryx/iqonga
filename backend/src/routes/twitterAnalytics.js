const express = require('express');
const router = express.Router();
const TwitterAnalyticsService = require('../services/TwitterAnalyticsService');
const TwitterAnalyticsExportService = require('../services/TwitterAnalyticsExportService');
const TwitterAnalyticsGrokService = require('../services/TwitterAnalyticsGrokService');
const { authenticateToken } = require('../middleware/auth');
const path = require('path');
const fs = require('fs').promises;

const analyticsService = new TwitterAnalyticsService();
const exportService = new TwitterAnalyticsExportService();
const grokService = new TwitterAnalyticsGrokService();

// Helper to handle errors
const handleError = (res, error, message = 'Twitter analytics error') => {
  // Extract error code and details
  const errorCode = error?.code || error?.response?.status || error?.status || 500;
  const errorDetails = error?.response?.data || error?.data || error?.message || 'Unknown error';
  const rateLimit = error?.rateLimit;
  
  // Log the full error for debugging
  console.error(message, {
    code: errorCode,
    message: error?.message || errorDetails,
    rateLimit,
    fullError: error,
  });

  // For rate limits (429), return 429 status
  if (errorCode === 429 || rateLimit) {
    return res.status(429).json({
      success: false,
      error: message,
      details: 'Twitter API rate limit exceeded. Please try again in a few minutes.',
      rateLimit: rateLimit || { retryAfter: 900 }, // Default 15 minutes
    });
  }

  // For authentication errors (401), return 401
  if (errorCode === 401) {
    return res.status(401).json({
      success: false,
      error: message,
      details: 'Twitter authentication failed. Please reconnect your Twitter account.',
    });
  }

  // For other errors, return 500 with details
  res.status(errorCode >= 400 && errorCode < 500 ? errorCode : 500).json({
    success: false,
    error: message,
    details: typeof errorDetails === 'string' ? errorDetails : (errorDetails?.detail || errorDetails?.message || 'Unknown error'),
  });
};

// GET /api/twitter-analytics/overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await analyticsService.getOverview(userId);
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch Twitter overview');
  }
});

// GET /api/twitter-analytics/posts
router.get('/posts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;
    const data = await analyticsService.getTopPosts(userId, parseInt(limit));
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch Twitter posts');
  }
});

// GET /api/twitter-analytics/mentions
router.get('/mentions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;
    const data = await analyticsService.getMentions(userId, parseInt(limit));
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch Twitter mentions');
  }
});

// GET /api/twitter-analytics/best-times
router.get('/best-times', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await analyticsService.getBestTimes(userId);
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch best times to post');
  }
});

// GET /api/twitter-analytics/historical - Get historical data for charts
router.get('/historical', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    const data = await analyticsService.getHistoricalData(userId, parseInt(days));
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch historical data');
  }
});

// GET /api/twitter-analytics/follower-growth - Get follower growth trend
router.get('/follower-growth', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    const data = await analyticsService.getFollowerGrowth(userId, parseInt(days));
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch follower growth');
  }
});

// GET /api/twitter-analytics/engagement-trends - Get engagement trends
router.get('/engagement-trends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    const data = await analyticsService.getEngagementTrends(userId, parseInt(days));
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch engagement trends');
  }
});

// POST /api/twitter-analytics/snapshot - Manually trigger snapshot (admin/testing)
router.post('/snapshot', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const snapshot = await analyticsService.saveDailySnapshot(userId);
    res.json({ success: true, data: snapshot });
  } catch (error) {
    handleError(res, error, 'Failed to save snapshot');
  }
});

// POST /api/twitter-analytics/export/csv - Export to CSV
router.post('/export/csv', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { exportType = 'full', dateRange } = req.body;
    const result = await exportService.exportToCSV(userId, exportType, dateRange);
    
    // Send file
    res.download(result.filepath, result.filename, (err) => {
      if (err) {
        console.error('File download error:', err);
        res.status(500).json({ success: false, error: 'Failed to download file' });
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to export CSV');
  }
});

// POST /api/twitter-analytics/export/pdf - Export to PDF
router.post('/export/pdf', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { exportType = 'overview' } = req.body;
    const result = await exportService.exportToPDF(userId, exportType);
    
    // Send file
    res.download(result.filepath, result.filename, (err) => {
      if (err) {
        console.error('File download error:', err);
        res.status(500).json({ success: false, error: 'Failed to download file' });
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to export PDF');
  }
});

// GET /api/twitter-analytics/exports - Get export history
router.get('/exports', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;
    const exports = await exportService.getExportHistory(userId, parseInt(limit));
    res.json({ success: true, data: exports });
  } catch (error) {
    handleError(res, error, 'Failed to get export history');
  }
});

// POST /api/twitter-analytics/sentiment-analysis - Analyze mentions sentiment with Grok
router.post('/sentiment-analysis', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50 } = req.body;
    
    // Get mentions
    const mentions = await analyticsService.getMentions(userId, limit);
    
    // Analyze with Grok
    const sentiment = await grokService.analyzeMentionsSentiment(mentions);
    
    res.json({ success: true, data: sentiment });
  } catch (error) {
    handleError(res, error, 'Failed to analyze sentiment');
  }
});

// POST /api/twitter-analytics/suggestions - Get hashtag/topic suggestions from Grok
router.post('/suggestions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get current data
    const [posts, mentions] = await Promise.all([
      analyticsService.getTopPosts(userId, 20),
      analyticsService.getMentions(userId, 20),
    ]);
    
    // Get suggestions from Grok
    const suggestions = await grokService.suggestHashtagsAndTopics(posts, mentions);
    
    res.json({ success: true, data: suggestions });
  } catch (error) {
    handleError(res, error, 'Failed to get suggestions');
  }
});

// POST /api/twitter-analytics/content-suggestions - Get content strategy suggestions
router.post('/content-suggestions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get current data
    const [overview, posts] = await Promise.all([
      analyticsService.getOverview(userId),
      analyticsService.getTopPosts(userId, 10),
    ]);
    
    // Get suggestions from Grok
    const suggestions = await grokService.generateContentSuggestions(overview, posts);
    
    res.json({ success: true, data: suggestions });
  } catch (error) {
    handleError(res, error, 'Failed to get content suggestions');
  }
});

module.exports = router;


