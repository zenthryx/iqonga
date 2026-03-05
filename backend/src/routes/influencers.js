const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const InfluencerService = require('../services/InfluencerService');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Influencer Marketing Routes
 * AI-powered platform for discovering brand-safe, authentic creators
 */

// GET /api/influencers/discover - Discover influencers by topic
router.get('/discover', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      topics = [],
      platforms = [],
      minFollowers,
      maxFollowers,
      minEngagementRate,
      minBrandSafetyScore,
      minAuthenticityScore,
      verified,
      limit = 20,
      offset = 0
    } = req.query;

    // Parse topics and platforms from query
    const topicsArray = Array.isArray(topics) ? topics : topics ? topics.split(',') : [];
    const platformsArray = Array.isArray(platforms) ? platforms : platforms ? platforms.split(',') : [];

    const filters = {};
    if (minFollowers) filters.minFollowers = parseInt(minFollowers);
    if (maxFollowers) filters.maxFollowers = parseInt(maxFollowers);
    if (minEngagementRate) filters.minEngagementRate = parseFloat(minEngagementRate);
    if (minBrandSafetyScore) filters.minBrandSafetyScore = parseFloat(minBrandSafetyScore);
    if (minAuthenticityScore) filters.minAuthenticityScore = parseFloat(minAuthenticityScore);
    if (verified !== undefined) filters.verified = verified === 'true';

    const influencers = await InfluencerService.discoverInfluencers({
      topics: topicsArray,
      platforms: platformsArray,
      filters,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Save search if topics provided
    if (topicsArray.length > 0) {
      await InfluencerService.saveSearch(
        userId,
        topicsArray.join(', '),
        filters,
        influencers.length
      );
    }

    res.json({
      success: true,
      data: influencers,
      count: influencers.length
    });
  } catch (error) {
    logger.error('Failed to discover influencers:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/influencers/:id - Get influencer details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const influencer = await InfluencerService.getInfluencerById(id);

    if (!influencer) {
      return res.status(404).json({ error: 'Influencer not found' });
    }

    // Get content samples
    const content = await InfluencerService.getInfluencerContent(id, 20);

    // Get analytics if available
    const analytics = await database.query(
      `SELECT * FROM influencer_analytics 
       WHERE influencer_id = $1 
       ORDER BY period_end DESC 
       LIMIT 1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...influencer,
        content,
        analytics: analytics.rows[0] || null
      }
    });
  } catch (error) {
    logger.error('Failed to get influencer:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/influencers/:id/analyze - Analyze influencer for brand safety and authenticity
router.post('/:id/analyze', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const analysis = await InfluencerService.analyzeInfluencer(id);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Failed to analyze influencer:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/influencers/:id/content - Get influencer content samples
router.get('/:id/content', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const content = await database.query(
      `SELECT * FROM influencer_content 
       WHERE influencer_id = $1 
       ORDER BY posted_at DESC 
       LIMIT $2 OFFSET $3`,
      [id, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: content.rows
    });
  } catch (error) {
    logger.error('Failed to get influencer content:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/influencers/:id/save - Save influencer to favorites
router.post('/:id/save', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { notes, tags = [] } = req.body;

    const saved = await InfluencerService.saveInfluencer(
      userId,
      id,
      notes,
      Array.isArray(tags) ? tags : tags.split(',')
    );

    res.json({
      success: true,
      data: saved
    });
  } catch (error) {
    logger.error('Failed to save influencer:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/influencers/:id/save - Remove influencer from favorites
router.delete('/:id/save', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await database.query(
      `DELETE FROM saved_influencers WHERE user_id = $1 AND influencer_id = $2`,
      [userId, id]
    );

    res.json({
      success: true,
      message: 'Influencer removed from favorites'
    });
  } catch (error) {
    logger.error('Failed to remove saved influencer:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/influencers/saved/list - Get user's saved influencers
router.get('/saved/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const saved = await InfluencerService.getSavedInfluencers(userId);

    res.json({
      success: true,
      data: saved
    });
  } catch (error) {
    logger.error('Failed to get saved influencers:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/influencers/search/history - Get user's search history
router.get('/search/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const result = await database.query(
      `SELECT * FROM influencer_searches 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Failed to get search history:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/influencers/topics/popular - Get popular topics
router.get('/topics/popular', authenticateToken, async (req, res) => {
  try {
    // Get most common topics from influencers
    const result = await database.query(
      `SELECT unnest(categories) as topic, COUNT(*) as count
       FROM influencers
       WHERE categories IS NOT NULL AND array_length(categories, 1) > 0
       GROUP BY topic
       ORDER BY count DESC
       LIMIT 50`
    );

    res.json({
      success: true,
      data: result.rows.map((row) => ({
        topic: row.topic,
        count: parseInt(row.count)
      }))
    });
  } catch (error) {
    logger.error('Failed to get popular topics:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

