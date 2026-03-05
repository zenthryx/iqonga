const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Manual Campaign Builder Routes
 * Allows users to manually create and manage campaigns with AI assistance
 */

// GET /api/manual-campaigns - Get user's manual campaigns
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        id, name, description, start_date, end_date, status,
        platforms, created_at, updated_at, metadata
      FROM manual_campaigns
      WHERE user_id = $1
    `;
    const params = [userId];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await database.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Failed to get manual campaigns:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/manual-campaigns/:id - Get single manual campaign with posts
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get campaign
    const campaignResult = await database.query(`
      SELECT * FROM manual_campaigns
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaignResult.rows[0];

    // Get posts
    const postsResult = await database.query(`
      SELECT * FROM manual_campaign_posts
      WHERE campaign_id = $1 AND user_id = $2
      ORDER BY scheduled_time ASC
    `, [id, userId]);

    res.json({
      success: true,
      data: {
        ...campaign,
        posts: postsResult.rows
      }
    });

  } catch (error) {
    logger.error('Failed to get manual campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/manual-campaigns - Create new manual campaign
router.post('/', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      startDate,
      endDate,
      platforms = [],
      metadata = {}
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Campaign name is required' });
    }

    const campaignId = uuidv4();

    const result = await database.query(`
      INSERT INTO manual_campaigns (
        id, user_id, name, description, start_date, end_date,
        platforms, status, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [
      campaignId,
      userId,
      name,
      description || null,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
      JSON.stringify(platforms),
      'draft',
      JSON.stringify(metadata)
    ]);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Failed to create manual campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/manual-campaigns/:id - Update manual campaign
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      name,
      description,
      startDate,
      endDate,
      platforms,
      status,
      metadata
    } = req.body;

    // Verify ownership
    const existing = await database.query(`
      SELECT id FROM manual_campaigns WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    if (startDate !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      params.push(startDate ? new Date(startDate) : null);
    }
    if (endDate !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      params.push(endDate ? new Date(endDate) : null);
    }
    if (platforms !== undefined) {
      updates.push(`platforms = $${paramIndex++}`);
      params.push(JSON.stringify(platforms));
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(metadata));
    }

    updates.push(`updated_at = NOW()`);
    params.push(id, userId);

    const query = `
      UPDATE manual_campaigns
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING *
    `;

    const result = await database.query(query, params);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Failed to update manual campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/manual-campaigns/:id/posts - Add post to manual campaign
router.post('/:id/posts', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: campaignId } = req.params;
    const {
      platform,
      format = 'feed',
      scheduledTime,
      contentText,
      contentConfig = {},
      smartAdId = null
    } = req.body;

    if (!platform || !scheduledTime) {
      return res.status(400).json({ error: 'Platform and scheduled time are required' });
    }

    // Verify campaign ownership
    const campaign = await database.query(`
      SELECT id FROM manual_campaigns WHERE id = $1 AND user_id = $2
    `, [campaignId, userId]);

    if (campaign.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const postId = uuidv4();

    const result = await database.query(`
      INSERT INTO manual_campaign_posts (
        id, campaign_id, user_id, platform, format, scheduled_time,
        content_text, content_config, smart_ad_id, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `, [
      postId,
      campaignId,
      userId,
      platform,
      format,
      new Date(scheduledTime),
      contentText || null,
      JSON.stringify(contentConfig),
      smartAdId,
      'draft'
    ]);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Failed to add post to manual campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/manual-campaigns/:id/posts/:postId - Update campaign post
router.put('/:id/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: campaignId, postId } = req.params;
    const {
      platform,
      format,
      scheduledTime,
      contentText,
      contentConfig,
      status,
      smartAdId
    } = req.body;

    // Verify ownership
    const existing = await database.query(`
      SELECT id FROM manual_campaign_posts
      WHERE id = $1 AND campaign_id = $2 AND user_id = $3
    `, [postId, campaignId, userId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (platform !== undefined) {
      updates.push(`platform = $${paramIndex++}`);
      params.push(platform);
    }
    if (format !== undefined) {
      updates.push(`format = $${paramIndex++}`);
      params.push(format);
    }
    if (scheduledTime !== undefined) {
      updates.push(`scheduled_time = $${paramIndex++}`);
      params.push(new Date(scheduledTime));
    }
    if (contentText !== undefined) {
      updates.push(`content_text = $${paramIndex++}`);
      params.push(contentText);
    }
    if (contentConfig !== undefined) {
      updates.push(`content_config = $${paramIndex++}`);
      params.push(JSON.stringify(contentConfig));
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (smartAdId !== undefined) {
      updates.push(`smart_ad_id = $${paramIndex++}`);
      params.push(smartAdId);
    }

    updates.push(`updated_at = NOW()`);
    params.push(postId, campaignId, userId);

    const query = `
      UPDATE manual_campaign_posts
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND campaign_id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING *
    `;

    const result = await database.query(query, params);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Failed to update campaign post:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/manual-campaigns/:id/posts/:postId - Delete campaign post
router.delete('/:id/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: campaignId, postId } = req.params;

    // Verify ownership
    const existing = await database.query(`
      SELECT id FROM manual_campaign_posts
      WHERE id = $1 AND campaign_id = $2 AND user_id = $3
    `, [postId, campaignId, userId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await database.query(`
      DELETE FROM manual_campaign_posts
      WHERE id = $1 AND campaign_id = $2 AND user_id = $3
    `, [postId, campaignId, userId]);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete campaign post:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/manual-campaigns/:id - Delete manual campaign
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const existing = await database.query(`
      SELECT id FROM manual_campaigns WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Delete campaign (posts will be cascade deleted)
    await database.query(`
      DELETE FROM manual_campaigns WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete manual campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

