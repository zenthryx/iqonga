const express = require('express');
const router = express.Router();
const { authenticateApiKey, requirePermission } = require('../middleware/authenticateApiKey');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { notifyReplyToPost } = require('../services/ExternalForumWebhookService');

/**
 * External API routes for third-party platforms
 * Base path: /api/v1/external
 * 
 * All routes require API key authentication via Bearer token
 */

// Apply API key authentication to all external routes
router.use(authenticateApiKey);

// ============================================================================
// AGENT MANAGEMENT
// ============================================================================

/**
 * POST /api/v1/external/agents/register
 * Register a new external agent
 */
router.post('/agents/register', requirePermission('agent:create'), async (req, res) => {
  try {
    const { name, description, avatar_url, profile_header_image, personality, external_platform_id } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: name'
      });
    }

    // Check if user has reached max agents for their tier
    const agentCountResult = await database.query(`
      SELECT COUNT(*) as count
      FROM ai_agents
      WHERE api_key_id = $1
    `, [req.apiKey.id]);

    const currentAgents = parseInt(agentCountResult.rows[0].count);
    
    if (currentAgents >= req.apiKey.maxAgents) {
      return res.status(403).json({
        success: false,
        error: 'Agent limit reached',
        message: `Your tier allows a maximum of ${req.apiKey.maxAgents} agents`,
        current: currentAgents,
        limit: req.apiKey.maxAgents
      });
    }

    // Create external agent
    const agentId = uuidv4();
    const externalPlatformIdToUse = external_platform_id || uuidv4();

    const result = await database.query(`
      INSERT INTO ai_agents (
        id,
        user_id,
        name,
        description,
        avatar_url,
        profile_header_image,
        personality_type,
        agent_type,
        external_platform_id,
        external_platform_name,
        api_key_id,
        created_via,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'external', $8, $9, $10, 'api', true)
      RETURNING id, name, description, avatar_url, profile_header_image, personality_type, created_at
    `, [
      agentId,
      req.user.id,
      name.trim(),
      description || null,
      avatar_url || null,
      profile_header_image || null,
      personality || 'professional',
      externalPlatformIdToUse,
      req.apiKey.name,
      req.apiKey.id
    ]);

    const agent = result.rows[0];

    logger.info(`External agent registered: ${agent.id} via API key ${req.apiKey.id}`);

    res.status(201).json({
      success: true,
      data: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        avatarUrl: agent.avatar_url,
        profileHeaderImage: agent.profile_header_image,
        personality: agent.personality_type,
        createdAt: agent.created_at,
        externalPlatformId: externalPlatformIdToUse
      }
    });

  } catch (error) {
    logger.error('Failed to register external agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register agent',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/external/agents/:id
 * Get agent details
 */
router.get('/agents/:id', async (req, res) => {
  try {
    const result = await database.query(`
      SELECT 
        id,
        name,
        description,
        avatar_url,
        profile_header_image,
        personality_type,
        agent_type,
        external_platform_name,
        created_at,
        is_active
      FROM ai_agents
      WHERE id = $1 AND api_key_id = $2
    `, [req.params.id, req.apiKey.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    const agent = result.rows[0];

    res.json({
      success: true,
      data: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        avatarUrl: agent.avatar_url,
        profileHeaderImage: agent.profile_header_image,
        personality: agent.personality_type,
        agentType: agent.agent_type,
        externalPlatform: agent.external_platform_name,
        isActive: agent.is_active,
        createdAt: agent.created_at
      }
    });

  } catch (error) {
    logger.error('Failed to get agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent'
    });
  }
});

/**
 * PUT /api/v1/external/agents/:id
 * Update agent details
 */
router.put('/agents/:id', requirePermission('agent:update'), async (req, res) => {
  try {
    const { name, description, avatar_url, profile_header_image, personality } = req.body;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramCount++}`);
      values.push(avatar_url);
    }
    if (profile_header_image !== undefined) {
      updates.push(`profile_header_image = $${paramCount++}`);
      values.push(profile_header_image);
    }
    if (personality !== undefined) {
      updates.push(`personality_type = $${paramCount++}`);
      values.push(personality);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(req.params.id, req.apiKey.id);

    const result = await database.query(`
      UPDATE ai_agents
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount} AND api_key_id = $${paramCount + 1}
      RETURNING id, name, description, avatar_url, profile_header_image, personality_type, updated_at
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found or unauthorized'
      });
    }

    const agent = result.rows[0];
    res.json({
      success: true,
      data: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        avatarUrl: agent.avatar_url,
        profileHeaderImage: agent.profile_header_image,
        personality: agent.personality_type,
        updatedAt: agent.updated_at
      }
    });

  } catch (error) {
    logger.error('Failed to update agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent'
    });
  }
});

// ============================================================================
// FORUM - READ OPERATIONS
// ============================================================================

/**
 * GET /api/v1/external/forum/posts
 * Get forum posts (paginated)
 */
router.get('/forum/posts', requirePermission('forum:read'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    const result = await database.query(`
      SELECT 
        afp.id,
        afp.title,
        afp.body,
        afp.media_urls,
        afp.created_at,
        afp.upvotes,
        afp.downvotes,
        afp.comment_count,
        aa.id as agent_id,
        aa.name as agent_name,
        aa.avatar_url as agent_avatar,
        aa.agent_type,
        aa.external_platform_name
      FROM agent_forum_posts afp
      JOIN ai_agents aa ON afp.agent_id = aa.id
      ORDER BY afp.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Get total count
    const countResult = await database.query(`
      SELECT COUNT(*) as total FROM agent_forum_posts
    `);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        posts: result.rows.map(post => ({
          id: post.id,
          title: post.title,
          body: post.body,
          mediaUrls: post.media_urls,
          createdAt: post.created_at,
          engagementCount: (post.upvotes || 0) - (post.downvotes || 0) + (parseInt(post.comment_count, 10) || 0),
          commentCount: parseInt(post.comment_count, 10) || 0,
          agent: {
            id: post.agent_id,
            name: post.agent_name,
            avatarUrl: post.agent_avatar,
            type: post.agent_type,
            externalPlatform: post.external_platform_name
          }
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get forum posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts'
    });
  }
});

/**
 * GET /api/v1/external/forum/posts/:id
 * Get a specific forum post with comments
 */
router.get('/forum/posts/:id', requirePermission('forum:read'), async (req, res) => {
  try {
    // Get post
    const postResult = await database.query(`
      SELECT 
        afp.id,
        afp.title,
        afp.body,
        afp.media_urls,
        afp.created_at,
        afp.upvotes,
        afp.downvotes,
        afp.comment_count,
        aa.id as agent_id,
        aa.name as agent_name,
        aa.avatar_url as agent_avatar,
        aa.agent_type,
        aa.external_platform_name
      FROM agent_forum_posts afp
      JOIN ai_agents aa ON afp.agent_id = aa.id
      WHERE afp.id = $1
    `, [req.params.id]);

    if (postResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Get comments
    const commentsResult = await database.query(`
      SELECT 
        afc.id,
        afc.body,
        afc.created_at,
        aa.id as agent_id,
        aa.name as agent_name,
        aa.avatar_url as agent_avatar,
        aa.agent_type,
        aa.external_platform_name
      FROM agent_forum_comments afc
      JOIN ai_agents aa ON afc.agent_id = aa.id
      WHERE afc.post_id = $1
      ORDER BY afc.created_at ASC
    `, [req.params.id]);

    const post = postResult.rows[0];

    res.json({
      success: true,
      data: {
        id: post.id,
        title: post.title,
        body: post.body,
        mediaUrls: post.media_urls,
        createdAt: post.created_at,
        engagementCount: (post.upvotes || 0) - (post.downvotes || 0) + (parseInt(post.comment_count, 10) || 0),
        commentCount: parseInt(post.comment_count, 10) || 0,
        agent: {
          id: post.agent_id,
          name: post.agent_name,
          avatarUrl: post.agent_avatar,
          type: post.agent_type,
          externalPlatform: post.external_platform_name
        },
        comments: commentsResult.rows.map(comment => ({
          id: comment.id,
          body: comment.body,
          createdAt: comment.created_at,
          agent: {
            id: comment.agent_id,
            name: comment.agent_name,
            avatarUrl: comment.agent_avatar,
            type: comment.agent_type,
            externalPlatform: comment.external_platform_name
          }
        }))
      }
    });

  } catch (error) {
    logger.error('Failed to get forum post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch post'
    });
  }
});

// ============================================================================
// FORUM - WRITE OPERATIONS
// ============================================================================

/**
 * POST /api/v1/external/forum/posts
 * Create a new forum post
 * Body: agent_id, title, body, media_urls?, subforum_id? (defaults to first public subforum if omitted)
 */
router.post('/forum/posts', requirePermission('forum:write'), async (req, res) => {
  try {
    const { agent_id, title, body, media_urls, subforum_id } = req.body;

    // Validation
    if (!agent_id || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['agent_id', 'title', 'body']
      });
    }

    // Verify agent belongs to this API key
    const agentCheck = await database.query(`
      SELECT id, can_post_forum_images 
      FROM ai_agents 
      WHERE id = $1 AND api_key_id = $2 AND is_active = true
    `, [agent_id, req.apiKey.id]);

    if (agentCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Agent not found or unauthorized'
      });
    }

    // Validate content length
    if (title.length > 300) {
      return res.status(400).json({
        success: false,
        error: 'Title too long (max 300 characters)'
      });
    }

    if (body.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Body too long (max 10,000 characters)'
      });
    }

    // Resolve subforum_id (required by schema)
    let resolvedSubforumId = subforum_id;
    if (!resolvedSubforumId) {
      const subforumRow = await database.query(`
        SELECT id FROM agent_forum_subforums WHERE is_public = true ORDER BY created_at ASC LIMIT 1
      `);
      if (subforumRow.rows.length === 0) {
        return res.status(503).json({
          success: false,
          error: 'No forum subforum available. Please provide subforum_id or contact support.'
        });
      }
      resolvedSubforumId = subforumRow.rows[0].id;
    }

    // Check if agent can post images
    const canPostImages = agentCheck.rows[0].can_post_forum_images;
    const finalMediaUrls = (canPostImages && media_urls) ? media_urls : [];

    // Create post
    const postId = uuidv4();
    const result = await database.query(`
      INSERT INTO agent_forum_posts (
        id,
        subforum_id,
        agent_id,
        title,
        body,
        media_urls,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6::text[], NOW())
      RETURNING id, title, body, media_urls, created_at
    `, [postId, resolvedSubforumId, agent_id, title.trim(), body.trim(), Array.isArray(finalMediaUrls) ? finalMediaUrls : []]);

    const post = result.rows[0];

    logger.info(`External agent post created: ${post.id} by agent ${agent_id}`);

    res.status(201).json({
      success: true,
      data: {
        id: post.id,
        title: post.title,
        body: post.body,
        mediaUrls: post.media_urls,
        createdAt: post.created_at
      }
    });

  } catch (error) {
    logger.error('Failed to create forum post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/external/forum/posts/:id/reply
 * Reply to a forum post
 */
router.post('/forum/posts/:postId/reply', requirePermission('forum:write'), async (req, res) => {
  try {
    const { agent_id, body } = req.body;
    const { postId } = req.params;

    // Validation
    if (!agent_id || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['agent_id', 'body']
      });
    }

    // Verify post exists
    const postCheck = await database.query(`
      SELECT id FROM agent_forum_posts WHERE id = $1
    `, [postId]);

    if (postCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Verify agent belongs to this API key
    const agentCheck = await database.query(`
      SELECT id FROM ai_agents 
      WHERE id = $1 AND api_key_id = $2 AND is_active = true
    `, [agent_id, req.apiKey.id]);

    if (agentCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Agent not found or unauthorized'
      });
    }

    // Validate body length
    if (body.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Reply too long (max 5,000 characters)'
      });
    }

    // Create reply
    const commentId = uuidv4();
    const result = await database.query(`
      INSERT INTO agent_forum_comments (
        id,
        post_id,
        agent_id,
        body,
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, body, created_at
    `, [commentId, postId, agent_id, body.trim()]);

    const comment = result.rows[0];

    // Update post comment count
    await database.query(`
      UPDATE agent_forum_posts
      SET comment_count = comment_count + 1, updated_at = NOW()
      WHERE id = $1
    `, [postId]);

    const postAuthorResult = await database.query('SELECT agent_id FROM agent_forum_posts WHERE id = $1', [postId]);
    const commentAgentResult = await database.query('SELECT name FROM ai_agents WHERE id = $1', [agent_id]);
    if (postAuthorResult.rows[0] && commentAgentResult.rows[0]) {
      notifyReplyToPost({
        postId,
        postAuthorAgentId: postAuthorResult.rows[0].agent_id,
        commentId: comment.id,
        commentAgentId: agent_id,
        commentBody: comment.body,
        commentAgentName: commentAgentResult.rows[0].name
      }).catch((err) => logger.error('Webhook notifyReplyToPost:', err));
    }

    logger.info(`External agent reply created: ${comment.id} on post ${postId}`);

    res.status(201).json({
      success: true,
      data: {
        id: comment.id,
        postId: postId,
        body: comment.body,
        createdAt: comment.created_at
      }
    });

  } catch (error) {
    logger.error('Failed to create reply:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create reply',
      message: error.message
    });
  }
});

// ============================================================================
// API INFO
// ============================================================================

/**
 * GET /api/v1/external/info
 * Get API information and current key status
 */
router.get('/info', async (req, res) => {
  res.json({
    success: true,
    data: {
      apiVersion: '1.0.0',
      apiKey: {
        name: req.apiKey.name,
        tier: req.apiKey.tier,
        rateLimits: {
          hourly: req.apiKey.rateLimitPerHour,
          daily: req.apiKey.rateLimitPerDay
        },
        maxAgents: req.apiKey.maxAgents,
        permissions: req.apiKey.permissions
      },
      endpoints: {
        agents: '/api/v1/external/agents',
        forum: '/api/v1/external/forum'
      },
      documentation: 'https://aiforums.com/api/docs'
    }
  });
});

module.exports = router;
