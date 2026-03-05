const express = require('express');
const { v4: uuidv4 } = require('uuid');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const upload = require('../middleware/upload'); // Added for avatar upload

const router = express.Router();

const AgentForumEngagementService = require('../services/AgentForumEngagementService');

// GET /api/agents - Get all user's agents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.wallet_address || 'anonymous';
    const { status, platform, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT 
        a.*,
        COALESCE(gc_stats.total_posts, 0) as total_posts,
        COALESCE(gc_stats.total_engagement, 0) as total_engagement,
        COALESCE(gc_stats.avg_engagement_rate, 0) as avg_engagement_rate
      FROM ai_agents a
      LEFT JOIN (
        SELECT 
          agent_id,
          COUNT(*) as total_posts,
          SUM(COALESCE(likes_count, 0) + COALESCE(retweets_count, 0) + COALESCE(replies_count, 0)) as total_engagement,
          AVG(COALESCE(engagement_rate, 0)) as avg_engagement_rate
        FROM generated_content 
        WHERE status = 'published'
        GROUP BY agent_id
      ) gc_stats ON a.id = gc_stats.agent_id
      WHERE a.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND a.is_active = $${paramIndex}`;
      params.push(status === 'active');
      paramIndex++;
    }

    if (platform) {
      query += ` AND $${paramIndex} = ANY(a.platforms)`;
      params.push(platform);
      paramIndex++;
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await database.query(query, params);

    const agents = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      avatar_url: row.avatar_url ? (row.avatar_url.startsWith('http') 
        ? row.avatar_url.replace('app.iqonga.org', 'www.iqonga.org')
        : `${process.env.BACKEND_URL || process.env.API_BASE_URL || 'https://www.iqonga.org'}${row.avatar_url}`) : null,
      personality_config: {
        core_traits: row.personality_type ? [row.personality_type] : [],
        communication_style: row.voice_tone || 'Not specified',
        expertise_areas: row.target_topics || [],
        response_tone: row.voice_tone || 'Not specified',
        humor_style: row.humor_style || 'Not specified',
        intelligence_level: row.intelligence_level || 'Not specified',
        controversy_comfort: row.controversy_comfort || 30,
        behavioral_guidelines: row.behavioral_guidelines || [],
        avoid_topics: row.avoid_topics || [],
        interaction_preferences: {
          proactive: row.is_active,
          response_speed: 'thoughtful',
          emoji_usage: 'moderate',
          length_preference: 'balanced'
        },
        knowledge_focus: row.target_topics || []
      },
      platforms: row.platforms,
      status: row.is_active ? 'active' : 'inactive',
      created_at: row.created_at,
      updated_at: row.updated_at,
      performance_metrics: {
        total_posts_generated: parseInt(row.total_posts) || 0,
        engagement_rate: parseFloat(row.avg_engagement_rate) || 0,
        total_engagement: parseInt(row.total_engagement) || 0,
        response_time_avg: 45,
        satisfaction_score: 4.5,
        revenue_generated: 0,
        platform_metrics: {
          twitter: {
            followers: 0,
            interactions: parseInt(row.total_engagement) || 0,
            reach: 0,
            username: row.twitter_username,
            connected: row.twitter_status === 'active'
          }
        }
      },
      platform_connections: row.twitter_username ? [{
        platform: 'twitter',
        username: row.twitter_username,
        status: row.twitter_status,
        connected: row.twitter_status === 'active'
      }] : []
    }));

    res.json({
      success: true,
      data: agents,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: agents.length
      }
    });

  } catch (error) {
    logger.error('Failed to get agents:', error);
    res.status(500).json({
      error: 'Failed to retrieve agents',
      details: error.message
    });
  }
});

// GET /api/agents/platform-connections - Get all platform connections for user
router.get('/platform-connections', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await database.query(`
      SELECT 
        platform,
        platform_user_id,
        username,
        display_name,
        profile_image_url,
        connection_status,
        follower_count,
        last_sync,
        created_at,
        metadata
      FROM platform_connections
      WHERE user_id = $1
      ORDER BY platform, created_at DESC
    `, [userId]);

    const connections = result.rows.map(row => ({
      platform: row.platform,
      platform_user_id: row.platform_user_id,
      username: row.username,
      display_name: row.display_name,
      profile_image_url: row.profile_image_url,
      connection_status: row.connection_status,
      connected: row.connection_status === 'active',
      follower_count: row.follower_count,
      last_sync: row.last_sync,
      created_at: row.created_at,
      metadata: row.metadata
    }));

    // Telegram is stored in telegram_groups, not platform_connections. If the user has
    // any active Telegram groups (Bot Token + Chat ID from Dashboard), include a
    // synthetic 'telegram' connection so it shows as connected in the plugin.
    const hasTelegram = connections.some(c => c.platform === 'telegram');
    if (!hasTelegram) {
      try {
        const tgResult = await database.query(`
          SELECT title, bot_username FROM telegram_groups
          WHERE user_id = $1 AND is_active = true
          ORDER BY id DESC
          LIMIT 1
        `, [userId]);
        if (tgResult.rows.length > 0) {
          const row = tgResult.rows[0];
          connections.push({
            platform: 'telegram',
            platform_user_id: null,
            username: row.bot_username || null,
            display_name: row.title || 'Telegram',
            profile_image_url: null,
            connection_status: 'active',
            connected: true,
            follower_count: null,
            last_sync: null,
            created_at: null,
            metadata: null
          });
        }
      } catch (tgErr) {
        logger.warn('Could not check telegram_groups for platform-connections:', tgErr.message);
      }
    }

    res.json({
      success: true,
      data: connections
    });

  } catch (error) {
    logger.error('Failed to get platform connections:', error);
    res.status(500).json({
      error: 'Failed to retrieve platform connections',
      details: error.message
    });
  }
});

// GET /api/agents/:id - Get specific agent
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await database.query(`
      SELECT 
        a.*,
        pc.username as twitter_username,
        pc.connection_status as twitter_status,
        pc.follower_count as twitter_followers
      FROM ai_agents a
      LEFT JOIN platform_connections pc ON a.user_id = pc.user_id AND pc.platform = 'twitter'
      WHERE a.id = $1 AND a.user_id = $2
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = result.rows[0];

    // Get recent content (commented out until table exists)
    // const contentResult = await database.query(`
    //   SELECT content_text, platform, published_at, likes_count, retweets_count, replies_count, engagement_rate
    //   FROM generated_content
    //   WHERE agent_id = $1 
    //   ORDER BY published_at DESC 
    //   LIMIT 10
    // `, [id]);
    
    // For now, return empty content array
    const contentResult = { rows: [] };

    res.json({
      success: true,
      data: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        avatar_url: agent.avatar_url ? (agent.avatar_url.startsWith('http') 
          ? agent.avatar_url.replace('app.iqonga.org', 'www.iqonga.org')
          : `${process.env.BACKEND_URL || process.env.API_BASE_URL || 'https://www.iqonga.org'}${agent.avatar_url}`) : null,
        personality_config: {
          core_traits: agent.personality_type ? [agent.personality_type] : [],
          communication_style: agent.voice_tone || 'Not specified',
          expertise_areas: agent.target_topics || [],
          response_tone: agent.voice_tone || 'Not specified',
          humor_style: agent.humor_style || 'Not specified',
          intelligence_level: agent.intelligence_level || 'Not specified',
          controversy_comfort: agent.controversy_comfort || 30,
          behavioral_guidelines: agent.behavioral_guidelines || [],
          avoid_topics: agent.avoid_topics || [],
          interaction_preferences: {
            proactive: agent.is_active,
            response_speed: 'thoughtful',
            emoji_usage: 'moderate',
            length_preference: 'balanced'
          },
          knowledge_focus: agent.target_topics || []
        },
        platforms: agent.platforms,
        status: agent.is_active ? 'active' : 'inactive',
        performance_metrics: {
          total_posts_generated: agent.total_posts_generated,
          total_replies_sent: agent.total_replies_sent,
          average_engagement_rate: agent.average_engagement_rate,
          viral_posts_count: agent.viral_posts_count,
          evolution_stage: agent.evolution_stage
        },
        platform_connections: agent.twitter_username ? [{
          platform: 'twitter',
          username: agent.twitter_username,
          status: agent.twitter_status,
          followers: agent.twitter_followers
        }] : [],
        recent_content: contentResult.rows,
        created_at: agent.created_at,
        updated_at: agent.updated_at,
        last_activity: agent.last_activity,
        can_post_forum_images: agent.can_post_forum_images ?? false,
        profile_header_image: agent.profile_header_image || null,
        writing_style_enabled: agent.writing_style_enabled ?? false,
        writing_style_samples: Array.isArray(agent.writing_style_samples) ? agent.writing_style_samples : []
      }
    });

  } catch (error) {
    logger.error('Failed to get agent:', error);
    res.status(500).json({
      error: 'Failed to retrieve agent',
      details: error.message
    });
  }
});

// POST /api/agents - Create new agent
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.wallet_address || 'anonymous';
    const {
      name,
      description,
      personality_type,
      voice_tone,
      humor_style,
      intelligence_level,
      controversy_comfort,
      platforms,
      target_topics,
      avoid_topics,
      behavioral_guidelines,
      avatar_url,
      preferred_voice_type,
      preferred_music_language
    } = req.body;

    // Validation
    if (!name || !description || !personality_type || !voice_tone) {
      return res.status(400).json({
        error: 'Missing required fields: name, description, personality_type, voice_tone'
      });
    }

    if (name.length > 100 || description.length > 500) {
      return res.status(400).json({
        error: 'Name must be ≤100 characters, description ≤500 characters'
      });
    }

    const agentId = uuidv4();

    // Optional: store wallet address as string if present (no blockchain in v1)
    let agentAccountAddress = null;
    const transactionSignature = `local_${Date.now()}`;
    try {
      const userResult = await database.query(
        'SELECT wallet_address FROM users WHERE id = $1',
        [userId]
      );
      if (userResult.rows.length > 0 && userResult.rows[0].wallet_address) {
        agentAccountAddress = userResult.rows[0].wallet_address;
      }
    } catch (error) {
      logger.warn('Wallet lookup skipped for user:', error.message);
    }

    const result = await database.query(`
      INSERT INTO ai_agents (
        id, user_id, name, description, personality_type, voice_tone, 
        humor_style, intelligence_level, controversy_comfort, platforms, 
        target_topics, avoid_topics, behavioral_guidelines, avatar_url,
        preferred_voice_type, preferred_music_language,
        agent_account_address, creation_tx_signature, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, true, NOW(), NOW()
      ) RETURNING *
    `, [
      agentId, userId, name, description, personality_type, voice_tone,
      humor_style || 'balanced', intelligence_level || 'standard', 
      controversy_comfort || 30, platforms || ['twitter'],
      target_topics || [], avoid_topics || [], behavioral_guidelines || [],
      avatar_url, preferred_voice_type || null, preferred_music_language || null,
      agentAccountAddress, transactionSignature
    ]);

    const agent = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        personality_type: agent.personality_type,
        voice_tone: agent.voice_tone,
        platforms: agent.platforms,
        status: 'active',
        created_at: agent.created_at
      },
      message: 'Agent created successfully'
    });

  } catch (error) {
    logger.error('Failed to create agent:', error);
    res.status(500).json({
      error: 'Failed to create agent',
      details: error.message
    });
  }
});

// PUT /api/agents/:id - Update agent
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updateFields = req.body;

    // Check if agent exists and belongs to user
    const existingAgent = await database.query(`
      SELECT id FROM ai_agents WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (existingAgent.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Build dynamic update query
    const allowedFields = [
      'name', 'description', 'personality_type', 'voice_tone', 'humor_style',
      'intelligence_level', 'controversy_comfort', 'platforms', 'target_topics',
      'avoid_topics', 'behavioral_guidelines', 'avatar_url', 'is_active',
      'preferred_voice_type', 'preferred_music_language', 'can_post_forum_images', 'profile_header_image',
      'writing_style_enabled', 'writing_style_samples'
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updateFields).forEach(field => {
      if (allowedFields.includes(field)) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(updateFields[field]);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, userId);

    const query = `
      UPDATE ai_agents 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await database.query(query, values);
    const agent = result.rows[0];

    res.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        personality_type: agent.personality_type,
        voice_tone: agent.voice_tone,
        platforms: agent.platforms,
        status: agent.is_active ? 'active' : 'inactive',
        updated_at: agent.updated_at
      },
      message: 'Agent updated successfully'
    });

  } catch (error) {
    logger.error('Failed to update agent:', error);
    res.status(500).json({
      error: 'Failed to update agent',
      details: error.message
    });
  }
});

// DELETE /api/agents/:id - Delete agent
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await database.query(`
      DELETE FROM ai_agents 
      WHERE id = $1 AND user_id = $2
      RETURNING id, name
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({
      success: true,
      message: `Agent "${result.rows[0].name}" deleted successfully`
    });

  } catch (error) {
    logger.error('Failed to delete agent:', error);
    res.status(500).json({
      error: 'Failed to delete agent',
      details: error.message
    });
  }
});

// POST /api/agents/:id/connect-platform - Connect agent to social platform
router.post('/:id/connect-platform', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { platform } = req.body;

    if (!platform || !['twitter', 'telegram', 'agent_forums'].includes(platform)) {
      return res.status(400).json({ 
        error: 'Invalid platform. Supported: twitter, telegram, agent_forums' 
      });
    }

    // Check if agent exists
    const agentResult = await database.query(`
      SELECT id, platforms FROM ai_agents WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Agent Forums does not require a platform connection (no OAuth)
    if (platform !== 'agent_forums') {
      const platformResult = await database.query(`
        SELECT id FROM platform_connections 
        WHERE user_id = $1 AND platform = $2 AND connection_status = 'active'
      `, [userId, platform]);

      if (platformResult.rows.length === 0) {
        return res.status(400).json({ 
          error: `No active ${platform} connection found. Please connect your ${platform} account first.` 
        });
      }
    }

    const agent = agentResult.rows[0];
    const currentPlatforms = agent.platforms || [];

    // Add platform if not already connected
    if (!currentPlatforms.includes(platform)) {
      const updatedPlatforms = [...currentPlatforms, platform];
      
      await database.query(`
        UPDATE ai_agents 
        SET platforms = $1, updated_at = NOW() 
        WHERE id = $2
      `, [updatedPlatforms, id]);

      // When Agent Forums is enabled, trigger engagement immediately so the agent can post soon
      if (platform === 'agent_forums') {
        setImmediate(() => {
          AgentForumEngagementService.runEngagementCycle()
            .then((r) => logger.info('Agent forum engagement (on enable):', r))
            .catch((err) => logger.error('Agent forum engagement (on enable) failed:', err));
        });
      }
    }

    res.json({
      success: true,
      message: `Agent successfully connected to ${platform}`,
      platforms: [...currentPlatforms, platform].filter((p, i, arr) => arr.indexOf(p) === i)
    });

  } catch (error) {
    logger.error('Failed to connect agent to platform:', error);
    res.status(500).json({
      error: 'Failed to connect agent to platform',
      details: error.message
    });
  }
});

// DELETE /api/agents/:id/disconnect-platform - Disconnect agent from platform
router.delete('/:id/disconnect-platform', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { platform } = req.body;

    const result = await database.query(`
      UPDATE ai_agents 
      SET platforms = array_remove(platforms, $1), updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING platforms
    `, [platform, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({
      success: true,
      message: `Agent disconnected from ${platform}`,
      platforms: result.rows[0].platforms
    });

  } catch (error) {
    logger.error('Failed to disconnect agent from platform:', error);
    res.status(500).json({
      error: 'Failed to disconnect agent from platform',
      details: error.message
    });
  }
});

// PUT /api/agents/:id - Update agent
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    // Verify agent ownership
    const agentResult = await database.query(`
      SELECT id FROM ai_agents WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Update agent
    const updateResult = await database.query(`
      UPDATE ai_agents 
      SET name = $1, description = $2, is_active = $3, updated_at = NOW()
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `, [name, description, is_active, id, userId]);

    res.json({
      success: true,
      message: 'Agent updated successfully',
      agent: updateResult.rows[0]
    });

  } catch (error) {
    logger.error('Failed to update agent:', error);
    res.status(500).json({
      error: 'Failed to update agent',
      details: error.message
    });
  }
});

// POST /api/agents/:id/post-to-telegram - Post content to Telegram (requires ZTR tokens)
router.post('/:id/post-to-telegram', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: agentId } = req.params;
    const { content, chatId, contentType = 'message', imageId, videoId } = req.body;

    if (!content || !chatId) {
      return res.status(400).json({ error: 'Content and chat ID are required' });
    }

    // Check if agent exists and belongs to user
    const agentResult = await database.query(`
      SELECT id, name, description, personality_type, voice_tone, target_topics, platforms
      FROM ai_agents 
      WHERE id = $1 AND user_id = $2
    `, [agentId, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agentResult.rows[0];

    // Check if agent has Telegram platform enabled
    if (!agent.platforms || !agent.platforms.includes('telegram')) {
      // Auto-enable Telegram platform if not set
      await database.query(`
        UPDATE ai_agents 
        SET platforms = CASE 
          WHEN platforms IS NULL OR platforms = '{}' THEN ARRAY['telegram']
          WHEN NOT ('telegram' = ANY(platforms)) THEN array_append(platforms, 'telegram')
          ELSE platforms
        END
        WHERE id = $1
      `, [agentId]);
    }

    // Get image details if imageId is provided
    let imageData = null;
    if (imageId) {
      const imageResult = await database.query(`
        SELECT image_url, prompt, style, size
        FROM generated_images 
        WHERE id = $1 AND user_id = $2
      `, [imageId, userId]);
      
      if (imageResult.rows.length > 0) {
        imageData = imageResult.rows[0];
      }
    }

    // Get video details if videoId is provided
    let videoData = null;
    if (videoId) {
      const videoResult = await database.query(`
        SELECT video_url, prompt, style, duration, aspect_ratio
        FROM generated_videos 
        WHERE id = $1 AND user_id = $2
      `, [videoId, userId]);
      
      if (videoResult.rows.length > 0) {
        videoData = videoResult.rows[0];
      }
    }

    // Post to Telegram
    const telegramService = require('../services/TelegramService');
    const result = await telegramService.postToTelegram(
      userId,
      parseInt(chatId),
      content.trim(),
      { agentId, contentType, imageData, videoData }
    );

    if (result.queued) {
      res.status(202).json({
        success: true,
        queued: true,
        message: 'Message queued due to rate limit',
        queueId: result.queueId,
        agent: {
          id: agent.id,
          name: agent.name
        }
      });
    } else {
      // Store the generated content record
      await database.query(`
        INSERT INTO generated_content 
        (agent_id, platform, content_type, content_text, platform_post_id, published_at, status, ai_model_used)
        VALUES ($1, 'telegram', $2, $3, $4, NOW(), 'published', 'agent-generated')
      `, [agentId, contentType, content, result.messageId]);

      res.json({
        success: true,
        data: {
          agent: {
            id: agent.id,
            name: agent.name,
            personality: agent.personality_type
          },
          content: {
            text: content,
            type: contentType
          },
          telegram: {
            messageId: result.messageId,
            chatId: result.chatId
          }
        }
      });
    }
  } catch (error) {
    console.error('Failed to post to Telegram:', error);
    res.status(500).json({
      error: 'Failed to post to Telegram',
      details: error.message
    });
  }
});

// POST /api/agents/:id/post-to-twitter - Generate and post content to Twitter (requires ZTR tokens)
router.post('/:id/post-to-twitter', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: agentId } = req.params;
    const { content, content_type = 'tweet', imageId } = req.body; // ✅ Use content from request body

    // 🔍 DEBUG LOGGING - Track content flow
    logger.info('🐦 TWITTER POST REQUEST DEBUG:', {
      userId,
      agentId,
      contentLength: content ? content.length : 0,
      contentPreview: content ? content.substring(0, 100) + '...' : 'NO CONTENT',
      contentType: content_type,
      imageId: imageId || 'none',
      timestamp: new Date().toISOString()
    });

    // Check if agent exists and belongs to user
    const agentResult = await database.query(`
      SELECT id, name, description, personality_type, voice_tone, target_topics, platforms
      FROM ai_agents 
      WHERE id = $1 AND user_id = $2
    `, [agentId, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agentResult.rows[0];

    // 🔍 DEBUG LOGGING - Agent details
    logger.info('🤖 AGENT DETAILS DEBUG:', {
      agentId: agent.id,
      agentName: agent.name,
      personalityType: agent.personality_type,
      platforms: agent.platforms,
      targetTopics: agent.target_topics,
      timestamp: new Date().toISOString()
    });

    // Check if agent has Twitter platform enabled
    if (!agent.platforms || !agent.platforms.includes('twitter')) {
      // Auto-enable Twitter platform if not set
      await database.query(`
        UPDATE ai_agents 
        SET platforms = CASE 
          WHEN platforms IS NULL OR platforms = '{}' THEN ARRAY['twitter']
          WHEN NOT ('twitter' = ANY(platforms)) THEN array_append(platforms, 'twitter')
          ELSE platforms
        END
        WHERE id = $1
      `, [agentId]);
      
      // Update agent object for this request
      agent.platforms = agent.platforms || [];
      if (!agent.platforms.includes('twitter')) {
        agent.platforms.push('twitter');
      }
    }

    // Check if user has Twitter connection
    const twitterConnection = await database.query(`
      SELECT username, connection_status 
      FROM platform_connections 
      WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'
    `, [userId]);

    if (twitterConnection.rows.length === 0) {
      return res.status(400).json({ error: 'No active Twitter connection found' });
    }

    // ✅ Use the content sent from frontend instead of generating new content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const contentToPost = content.trim();

    // 🔍 DEBUG LOGGING - Content analysis before posting
    logger.info('📝 CONTENT ANALYSIS DEBUG:', {
      originalContent: content,
      trimmedContent: contentToPost,
      contentLength: contentToPost.length,
      containsCompanyKeywords: contentToPost.toLowerCase().includes('zenthryx') || contentToPost.toLowerCase().includes('trading') || contentToPost.toLowerCase().includes('ai'),
      isGenericContent: contentToPost.includes('Big things are happening') || contentToPost.includes('Stay tuned'),
      timestamp: new Date().toISOString()
    });

    // Get image details if imageId is provided
    let imageData = null;
    if (imageId) {
      const imageResult = await database.query(`
        SELECT image_url, prompt, style, size
        FROM generated_images 
        WHERE id = $1 AND user_id = $2
      `, [imageId, userId]);
      
      if (imageResult.rows.length > 0) {
        imageData = imageResult.rows[0];
      }
    }

    // Post to Twitter using direct function call instead of HTTP request
    const { TwitterApi } = require('twitter-api-v2');
    const { decrypt } = require('../utils/encryption');
    
    // Get user's Twitter connection
    const connectionResult = await database.query(`
      SELECT access_token, refresh_token, username
      FROM platform_connections 
      WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'
    `, [userId]);

    if (connectionResult.rows.length === 0) {
      return res.status(400).json({
        error: 'No active Twitter connection found'
      });
    }

    const connection = connectionResult.rows[0];
    
    // Decrypt tokens
    const accessToken = decrypt(connection.access_token);
    const refreshToken = decrypt(connection.refresh_token);

    console.log('🔄 TOKEN REFRESH LOGIC STARTING...');
    console.log('   - Original access token length:', accessToken ? accessToken.length : 'None');
    console.log('   - Original refresh token length:', refreshToken ? refreshToken.length : 'None');

    // Use the same token validation approach as scheduled posts
    // Validate first, then refresh only if needed
    let currentAccessToken = accessToken;
    let currentRefreshToken = refreshToken;
    
    try {
      // Create TwitterService for validation (same as scheduled posts)
      const TwitterServiceModule = require('../services/TwitterService');
      const TwitterService = TwitterServiceModule.TwitterService;
      const twitterServiceForValidation = new TwitterService(accessToken, refreshToken);
      
      // Validate token first (same approach as scheduled posts)
      console.log('🔐 Validating Twitter token...');
      const isTokenValid = await twitterServiceForValidation.validateToken();
      
      if (!isTokenValid && refreshToken) {
        console.log('🔄 Token expired, attempting refresh...');
        const newTokens = await twitterServiceForValidation.refreshAccessToken();
        
        console.log('✅ Token refreshed successfully');
        currentAccessToken = newTokens.accessToken;
        currentRefreshToken = newTokens.refreshToken || refreshToken;
        
        // Update the database with new tokens
        const { encrypt } = require('../utils/encryption');
        const encryptedNewAccessToken = encrypt(newTokens.accessToken);
        const encryptedNewRefreshToken = newTokens.refreshToken ? encrypt(newTokens.refreshToken) : null;
        
        await database.query(`
          UPDATE platform_connections 
          SET access_token = $1, refresh_token = $2, updated_at = NOW()
          WHERE user_id = $3 AND platform = 'twitter'
        `, [encryptedNewAccessToken, encryptedNewRefreshToken, userId]);
        
        console.log('💾 Updated database with new tokens');
      } else if (isTokenValid) {
        console.log('✅ Token is valid, no refresh needed');
      }
      
    } catch (refreshError) {
      // Check if it's a rate limit error (429)
      if (refreshError.code === 429 || (refreshError.rateLimit && refreshError.rateLimit.remaining === 0)) {
        console.log('⚠️ Rate limit hit during token validation/refresh:', refreshError.message);
        // Continue with existing token - might still work
      } else {
        console.log('⚠️ Token validation/refresh failed, using existing token:', refreshError.message);
        // Continue with existing token if refresh fails
      }
    }

    // Create authenticated Twitter client
    console.log('Creating Twitter client with:', {
      clientId: process.env.TWITTER_CLIENT_ID ? 'Set' : 'Missing',
      clientSecret: process.env.TWITTER_CLIENT_SECRET ? 'Set' : 'Missing',
      accessTokenLength: currentAccessToken ? currentAccessToken.length : 'None',
      refreshTokenLength: currentRefreshToken ? currentRefreshToken.length : 'None'
    });

    // Log the actual decrypted tokens (first few characters for security)
    console.log('Decrypted access token preview:', currentAccessToken ? currentAccessToken.substring(0, 10) + '...' : 'None');
    console.log('Decrypted refresh token preview:', currentRefreshToken ? currentRefreshToken.substring(0, 10) + '...' : 'None');

    // For OAuth 2.0, we need to create the client differently
    const userClient = new TwitterApi(currentAccessToken);

    // Test the client authentication
    try {
      console.log('🔐 Testing Twitter client authentication...');
      console.log('📡 Making request to Twitter API v2.me()...');
      
      // First, let's test what scopes we actually have
      console.log('🔍 Testing token scopes and permissions...');
      
      const me = await userClient.v2.me();
      console.log('✅ Twitter client authenticated successfully for user:', me.data.username);
      
    } catch (authError) {
      console.error('❌ Twitter client authentication failed:', authError.message);
      console.error('🔍 Full error details:', JSON.stringify(authError, null, 2));
      
      // Enhanced error analysis
      if (authError.message.includes('401') || authError.message.includes('Unauthorized')) {
        console.error('🚨 401 Unauthorized Error Analysis:');
        console.error('   - Access token length:', currentAccessToken ? currentAccessToken.length : 'None');
        console.error('   - Refresh token length:', currentRefreshToken ? currentRefreshToken.length : 'None');
        console.error('   - Client ID set:', !!process.env.TWITTER_CLIENT_ID);
        console.error('   - Client Secret set:', !!process.env.TWITTER_CLIENT_SECRET);
        console.error('   - Token refresh attempted:', 'Yes (in this code path)');
        console.error('   - Possible causes:');
        console.error('     1. Access token expired and refresh failed');
        console.error('     2. Invalid OAuth 2.0 client credentials');
        console.error('     3. Twitter app permissions insufficient');
        console.error('     4. OAuth 2.0 scopes not granted');
      }
      
      throw new Error(`Twitter authentication failed: ${authError.message}`);
    }

    // ✅ Post the content sent from frontend, not generated content
    console.log('📝 Posting content to Twitter:', contentToPost);
    
    let tweet;
    try {
      if (imageData && imageData.image_url) {
        // Post tweet with image
        console.log('📸 Posting tweet with image:', imageData.image_url);
        
        // Convert relative URL to absolute URL
        const imageUrl = imageData.image_url.startsWith('http') 
          ? imageData.image_url 
          : `${process.env.BACKEND_URL || process.env.API_BASE_URL || 'https://www.iqonga.org'}${imageData.image_url}`;
        
        console.log('📸 Full image URL:', imageUrl);
        
        // Download image from URL
        const axios = require('axios');
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);
        
        // Upload media to Twitter
        const mediaId = await userClient.v1.uploadMedia(imageBuffer, { type: 'image/jpeg' });
        console.log('📤 Image uploaded to Twitter, media ID:', mediaId);
        
        // Post tweet with image
        tweet = await userClient.v2.tweet({
          text: contentToPost,
          media: {
            media_ids: [mediaId]
          }
        });
      } else {
        // Post text-only tweet
        console.log('🐦 Attempting to post tweet to Twitter API...');
        console.log('📝 Content length:', contentToPost.length);
        console.log('📝 Content preview:', contentToPost.substring(0, 100));
        
        tweet = await userClient.v2.tweet(contentToPost);
        
        console.log('✅ Tweet posted successfully!');
        console.log('📊 Tweet ID:', tweet.data?.id);
        console.log('📊 Tweet data:', JSON.stringify(tweet.data, null, 2));
      }
    } catch (twitterError) {
      console.error('❌ Twitter API Error Details:');
      console.error('   - Error code:', twitterError.code);
      console.error('   - Error message:', twitterError.message);
      console.error('   - Rate limit info:', twitterError.rateLimit);
      console.error('   - Full error:', JSON.stringify(twitterError, null, 2));
      // Handle specific Twitter API errors
      if (twitterError.code === 429) {
        // Rate limit exceeded - Queue the post for later
        const postQueueService = require('../services/PostQueueService');
        
        try {
          // Check which limit was hit (app-level daily vs user-level daily)
          const rateLimit = twitterError.rateLimit || {};
          const dayLimit = rateLimit.day || {};
          const userDayLimit = rateLimit.userDay || {};
          
          // Use the most restrictive limit (whichever has 0 remaining)
          let limitHit = 'general';
          let resetTime = rateLimit.reset;
          
          if (dayLimit.remaining === 0) {
            // App-level daily limit hit (most restrictive)
            limitHit = 'app_daily';
            resetTime = dayLimit.reset;
            console.log(`⚠️ App-level daily limit hit: ${dayLimit.limit - dayLimit.remaining}/${dayLimit.limit}. Resets at: ${new Date(resetTime * 1000).toISOString()}`);
          } else if (userDayLimit.remaining === 0) {
            // User-level daily limit hit
            limitHit = 'user_daily';
            resetTime = userDayLimit.reset;
            console.log(`⚠️ User-level daily limit hit: ${userDayLimit.limit - userDayLimit.remaining}/${userDayLimit.limit}. Resets at: ${new Date(resetTime * 1000).toISOString()}`);
          }
          
          // Update rate limit tracking (track app-level daily limit)
          if (rateLimit && dayLimit.limit) {
            await postQueueService.updateRateLimit(
              userId,
              'twitter',
              'daily',
              dayLimit.limit - dayLimit.remaining, // Track app-level limit usage
              dayLimit.limit,
              resetTime
            );
          }

          // Queue the post for when rate limit resets
          const queueResult = await postQueueService.queuePost(
            userId,
            agentId,
            contentToPost,
            content_type,
            'twitter',
            resetTime,
            `Rate limit exceeded (${limitHit}): ${twitterError.message}. App daily: ${dayLimit.remaining}/${dayLimit.limit}, User daily: ${userDayLimit.remaining}/${userDayLimit.limit}`
          );

          const resetTimeFormatted = resetTime 
            ? new Date(resetTime * 1000).toLocaleString()
            : 'Unknown';

          return res.status(202).json({
            success: true,
            queued: true,
            message: 'Post queued due to rate limit',
            details: `Rate limit exceeded (${limitHit}). App daily: ${dayLimit.remaining}/${dayLimit.limit}, User daily: ${userDayLimit.remaining}/${userDayLimit.limit}. Your post has been queued and will be posted automatically when the limit resets at: ${resetTimeFormatted}`,
            errorType: 'RATE_LIMIT_QUEUED',
            limitHit: limitHit,
            appDailyLimit: { used: dayLimit.limit - dayLimit.remaining, limit: dayLimit.limit, remaining: dayLimit.remaining },
            userDailyLimit: { used: userDayLimit.limit - userDayLimit.remaining, limit: userDayLimit.limit, remaining: userDayLimit.remaining },
            queueId: queueResult.queueId,
            scheduledFor: queueResult.scheduledFor,
            retryAfter: resetTime,
            remainingPosts: dayLimit.remaining || 0
          });
        } catch (queueError) {
          console.error('Error queueing post:', queueError);
          // Fallback to original rate limit error
          const resetTime = twitterError.rateLimit?.reset 
            ? new Date(twitterError.rateLimit.reset * 1000).toLocaleString()
            : 'Unknown';
          
          return res.status(429).json({
            error: 'Twitter API rate limit exceeded',
            details: `You have reached your daily posting limit. Rate limit resets at: ${resetTime}`,
            errorType: 'RATE_LIMIT',
            retryAfter: twitterError.rateLimit?.reset,
            remainingPosts: twitterError.rateLimit?.remaining || 0
          });
        }
      } else if (twitterError.code === 403) {
        // Enhanced 403 error diagnostics
        const errorDetail = twitterError.error?.detail || twitterError.data?.detail || twitterError.message || 'Unknown error';
        const accessLevel = twitterError.headers?.['x-access-level'] || 'unknown';
        
        console.error('❌ Twitter API 403 Forbidden Error Analysis:');
        console.error('   - Error detail:', errorDetail);
        console.error('   - Access level from headers:', accessLevel);
        console.error('   - Full error response:', JSON.stringify(twitterError.error || twitterError.data, null, 2));
        
        // Special case: If access level is "read-write" but still getting 403
        if (accessLevel === 'read-write') {
          console.error('   ⚠️  SPECIAL CASE: Access level shows "read-write" but posting is still forbidden.');
          console.error('      This typically means:');
          console.error('      - The Twitter account itself may be restricted, suspended, or locked');
          console.error('      - The account may have posting restrictions (new account, low follower count, etc.)');
          console.error('      - The account may need to verify email/phone number');
          console.error('      - Twitter may have flagged the account for automated activity');
          console.error('   - Recommended actions:');
          console.error('      1. Check the Twitter account status at https://twitter.com/settings/account');
          console.error('      2. Verify email and phone number are confirmed');
          console.error('      3. Check if account has any restrictions or warnings');
          console.error('      4. Try posting manually from the Twitter web/app to verify account can post');
          console.error('      5. If account is new, wait a few days and try again');
        }
        
        console.error('   - Possible causes:');
        console.error('     1. Twitter app does not have "Read and Write" permissions enabled in Developer Portal');
        console.error('     2. OAuth scopes were requested but not granted during authorization');
        console.error('     3. Twitter account may be restricted, suspended, or locked');
        console.error('     4. Twitter app may need to be re-authorized with write permissions');
        console.error('   - Solution:');
        console.error('     1. Go to https://developer.twitter.com/en/portal/dashboard');
        console.error('     2. Select your app and go to "Settings" > "User authentication settings"');
        console.error('     3. Ensure "App permissions" is set to "Read and Write" (not just "Read")');
        console.error('     4. Re-authorize your Twitter account connection in the platform');
        
        return res.status(403).json({
          error: 'Twitter API access forbidden',
          details: errorDetail,
          errorType: 'FORBIDDEN',
          diagnostic: {
            accessLevel: accessLevel,
            isReadWriteButForbidden: accessLevel === 'read-write',
            possibleCauses: accessLevel === 'read-write' ? [
              'Twitter account may be restricted, suspended, or locked',
              'Account may have posting restrictions (new account, low follower count, etc.)',
              'Account may need to verify email/phone number',
              'Twitter may have flagged the account for automated activity',
              'Account may need to post manually first to establish trust'
            ] : [
              'Twitter app does not have "Read and Write" permissions enabled in Developer Portal',
              'OAuth scopes were requested but not granted during authorization',
              'Twitter account may be restricted, suspended, or locked',
              'Twitter app may need to be re-authorized with write permissions'
            ],
            solution: {
              step1: 'Go to https://developer.twitter.com/en/portal/dashboard',
              step2: 'Select your app and go to "Settings" > "User authentication settings"',
              step3: 'Ensure "App permissions" is set to "Read and Write" (not just "Read")',
              step4: 'Re-authorize your Twitter account connection in the platform'
            }
          }
        });
      } else {
        // Log all other Twitter errors for debugging
        console.error('❌ Twitter API Error (non-429/403):');
        console.error('   - Error code:', twitterError.code);
        console.error('   - Error message:', twitterError.message);
        console.error('   - Error data:', twitterError.data);
        console.error('   - Rate limit info:', twitterError.rateLimit);
        console.error('   - Full error stack:', twitterError.stack);
        
        // Re-throw other errors to be handled by the main catch block
        throw twitterError;
      }
    }
    
    // ✅ Success - Log the successful post
    if (tweet && tweet.data) {
      console.log('✅ Tweet posted successfully!');
      console.log('   - Tweet ID:', tweet.data.id);
      console.log('   - Tweet text:', tweet.data.text?.substring(0, 100));
    } else {
      console.error('⚠️ Tweet response missing data:', tweet);
    }

    // Store the generated content record
    await database.query(`
      INSERT INTO generated_content 
      (agent_id, platform, content_type, content_text, platform_post_id, published_at, status, ai_model_used)
      VALUES ($1, 'twitter', $2, $3, $4, NOW(), 'published', 'agent-generated')
    `, [agentId, content_type, contentToPost, tweet.data.id]);

    // Deduct platform-specific posting cost (on top of content generation cost)
    try {
      const ServicePricingService = require('../services/ServicePricingService');
      const CreditService = require('../services/CreditService');
      const creditService = new CreditService();
      
      const postingCostKey = content_type === 'reply' 
        ? 'platform_posting_twitter_reply' 
        : 'platform_posting_twitter_post';
      
      const postingCost = await ServicePricingService.getPricing(postingCostKey);
      
      if (postingCost > 0) {
        await creditService.deductCredits(
          userId, 
          postingCostKey, 
          postingCost, 
          `twitter_post_${tweet.data.id}`
        );
      }
    } catch (costError) {
      // Log error but don't fail the post if cost deduction fails
      console.error('Error deducting platform posting cost:', costError);
    }

    // 🔍 DEBUG LOGGING - Successful post
    logger.info('✅ TWITTER POST SUCCESS DEBUG:', {
      tweetId: tweet.data.id,
      tweetUrl: `https://twitter.com/${connection.username}/status/${tweet.data.id}`,
      postedContent: contentToPost,
      agentName: agent.name,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
          personality: agent.personality_type
        },
        content: {
          text: contentToPost,
          type: content_type,
          style: 'custom', // Assuming style is not directly available from frontend content
          length: 'custom' // Assuming length is not directly available from frontend content
        },
        twitter: {
          tweetId: tweet.data.id,
          url: `https://twitter.com/${connection.username}/status/${tweet.data.id}`
        }
      }
    });

  } catch (error) {
    logger.error('Failed to post to Twitter:', error);
    res.status(500).json({
      error: 'Failed to post to Twitter',
      details: error.message
    });
  }
});

// GET /api/agents/queue - Get queued posts for current user
router.get('/queue', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { platform, status } = req.query;
    
    const postQueueService = require('../services/PostQueueService');
    let queuedPosts = await postQueueService.getQueuedPosts(userId, platform);
    
    // Filter by status if provided
    if (status) {
      queuedPosts = queuedPosts.filter(p => p.status === status);
    }
    
    res.json({
      success: true,
      data: {
        queuedPosts: queuedPosts,
        totalQueued: queuedPosts.length,
        byStatus: {
          queued: queuedPosts.filter(p => p.status === 'queued').length,
          processing: queuedPosts.filter(p => p.status === 'processing').length,
          posted: queuedPosts.filter(p => p.status === 'posted').length,
          failed: queuedPosts.filter(p => p.status === 'failed').length
        }
      }
    });
  } catch (error) {
    logger.error('Error getting queued posts:', error);
    res.status(500).json({
      error: 'Failed to get queued posts',
      details: error.message
    });
  }
});

// DELETE /api/agents/queue/:queueId - Cancel a queued post
router.delete('/queue/:queueId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { queueId } = req.params;
    
    const postQueueService = require('../services/PostQueueService');
    await postQueueService.cancelQueuedPost(userId, queueId);
    
    res.json({
      success: true,
      message: 'Queued post cancelled successfully'
    });
  } catch (error) {
    logger.error('Error cancelling queued post:', error);
    res.status(500).json({
      error: 'Failed to cancel queued post',
      details: error.message
    });
  }
});

// POST /api/agents/upload-avatar - Upload agent avatar image
router.post('/upload-avatar', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image file size must be less than 5MB' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `avatar_${userId}_${timestamp}_${file.originalname}`;
    const uploadPath = `uploads/agents/avatars/${filename}`;

    // Move file to uploads directory
    const fs = require('fs');
    const path = require('path');
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../../uploads/agents/avatars');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Move file to destination
    const destinationPath = path.join(uploadsDir, filename);
    fs.renameSync(file.path, destinationPath);

    // Generate public URL
    const imageUrl = `/uploads/agents/avatars/${filename}`;

    res.json({
      success: true,
      imageUrl: imageUrl,
      message: 'Avatar uploaded successfully'
    });

  } catch (error) {
    logger.error('Failed to upload avatar:', error);
    res.status(500).json({
      error: 'Failed to upload avatar',
      details: error.message
    });
  }
});

// POST /api/agents/upload-header-image - Upload agent profile header background image
router.post('/upload-header-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' });
    }

    // Validate file size (max 10MB for header images as they're typically larger)
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image file size must be less than 10MB' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `header_${userId}_${timestamp}_${file.originalname}`;
    const uploadPath = `uploads/agents/headers/${filename}`;

    // Move file to uploads directory
    const fs = require('fs');
    const path = require('path');
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../../uploads/agents/headers');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Move file to destination
    const destinationPath = path.join(uploadsDir, filename);
    fs.renameSync(file.path, destinationPath);

    // Generate public URL
    const imageUrl = `/uploads/agents/headers/${filename}`;

    res.json({
      success: true,
      data: {
        imageUrl: imageUrl
      },
      message: 'Header image uploaded successfully'
    });

  } catch (error) {
    logger.error('Failed to upload header image:', error);
    res.status(500).json({
      error: 'Failed to upload header image',
      details: error.message
    });
  }
});

// Helper function to generate content based on agent personality
async function generateAgentContent(agent, options) {
  try {
    // Use the AI content service for better content generation
    const aiContentService = require('../services/AIContentService');
    const result = await aiContentService.generateContent(agent, options);
    return result.content;
  } catch (error) {
    logger.error('AI content generation failed, using fallback:', error);
    
    // Fallback to simple template generation
    const { content_type, topic, style, length } = options;
    
    const personalityPrompts = {
      'tech_sage': 'As a tech expert, I would say: ',
      'witty_troll': 'With a bit of humor: ',
      'quirky_observer': 'From my unique perspective: ',
      'custom': 'Based on my personality: '
    };

    const voiceTones = {
      'professional': 'professional and informative',
      'casual': 'casual and friendly',
      'enthusiastic': 'enthusiastic and energetic',
      'thoughtful': 'thoughtful and reflective'
    };

    const lengthLimits = {
      'short': 100,
      'medium': 200,
      'long': 280
    };

    const prompt = personalityPrompts[agent.personality_type] || personalityPrompts.custom;
    const tone = voiceTones[agent.voice_tone] || voiceTones.casual;
    const maxLength = lengthLimits[length] || lengthLimits.medium;

    // Generate content based on agent personality and options
    let content = `${prompt}${topic || 'sharing some thoughts'} in a ${tone} way. `;
    
    // Add some personality-specific content
    if (agent.personality_type === 'tech_sage') {
      content += 'This represents the cutting edge of what\'s possible in our field.';
    } else if (agent.personality_type === 'witty_troll') {
      content += 'Sometimes the best insights come with a smile! 😄';
    } else if (agent.personality_type === 'quirky_observer') {
      content += 'The world is full of fascinating patterns if you know where to look.';
    }

    // Ensure content fits Twitter's character limit
    if (content.length > maxLength) {
      content = content.substring(0, maxLength - 3) + '...';
    }

    return content;
  }
}

// POST /api/agents/:id/toggle-status - Toggle agent status
router.post('/:id/toggle-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { is_active } = req.body;

    // Verify agent ownership
    const agentResult = await database.query(`
      SELECT id FROM ai_agents WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Toggle status
    const updateResult = await database.query(`
      UPDATE ai_agents 
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [is_active, id, userId]);

    res.json({
      success: true,
      message: `Agent ${is_active ? 'activated' : 'deactivated'} successfully`,
      agent: updateResult.rows[0]
    });

  } catch (error) {
    logger.error('Failed to toggle agent status:', error);
    res.status(500).json({
      error: 'Failed to toggle agent status',
      details: error.message
    });
  }
});

// DELETE /api/agents/:id - Delete agent
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify agent ownership
    const agentResult = await database.query(`
      SELECT id FROM ai_agents WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Delete agent
    await database.query(`
      DELETE FROM ai_agents WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete agent:', error);
    res.status(500).json({
      error: 'Failed to delete agent',
      details: error.message
    });
  }
});

// GET /api/agents/:id/analytics - Get agent analytics
router.get('/:id/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { period = '30d', platform } = req.query;

    // Verify agent ownership
    const agentResult = await database.query(`
      SELECT id, name FROM ai_agents WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    let timeFilter = '';
    switch (period) {
      case '7d':
        timeFilter = "AND published_at > NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        timeFilter = "AND published_at > NOW() - INTERVAL '30 days'";
        break;
      case '90d':
        timeFilter = "AND published_at > NOW() - INTERVAL '90 days'";
        break;
    }

    let platformFilter = '';
    if (platform) {
      platformFilter = `AND platform = '${platform}'`;
    }

    const analyticsResult = await database.query(`
      SELECT 
        platform,
        COUNT(*) as total_posts,
        SUM(likes_count) as total_likes,
        SUM(retweets_count) as total_retweets,
        SUM(replies_count) as total_replies,
        AVG(engagement_rate) as avg_engagement_rate,
        COUNT(CASE WHEN is_viral = true THEN 1 END) as viral_posts,
        MAX(likes_count + retweets_count + replies_count) as best_performance
      FROM generated_content
      WHERE agent_id = $1 AND status = 'published' ${timeFilter} ${platformFilter}
      GROUP BY platform
    `, [id]);

    const analytics = {};
    analyticsResult.rows.forEach(row => {
      analytics[row.platform] = {
        totalPosts: parseInt(row.total_posts) || 0,
        totalLikes: parseInt(row.total_likes) || 0,
        totalRetweets: parseInt(row.total_retweets) || 0,
        totalReplies: parseInt(row.total_replies) || 0,
        averageEngagementRate: parseFloat(row.avg_engagement_rate) || 0,
        viralPosts: parseInt(row.viral_posts) || 0,
        bestPerformance: parseInt(row.best_performance) || 0
      };
    });

    res.json({
      success: true,
      agent: agentResult.rows[0].name,
      period,
      analytics
    });

  } catch (error) {
    logger.error('Failed to get agent analytics:', error);
    res.status(500).json({
      error: 'Failed to retrieve analytics',
      details: error.message
    });
  }
});

// POST /api/agents/:id/fix-platforms - Fix agent platforms (utility endpoint)
router.post('/:id/fix-platforms', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check if agent exists and belongs to user
    const agentResult = await database.query(`
      SELECT id, name, platforms FROM ai_agents 
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agentResult.rows[0];
    let updatedPlatforms = agent.platforms || [];

    // Ensure Twitter is enabled if user has Twitter connection
    const twitterConnection = await database.query(`
      SELECT username, connection_status 
      FROM platform_connections 
      WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'
    `, [userId]);

    if (twitterConnection.rows.length > 0 && !updatedPlatforms.includes('twitter')) {
      updatedPlatforms.push('twitter');
    }

    // Update agent platforms
    await database.query(`
      UPDATE ai_agents 
      SET platforms = $1, updated_at = NOW()
      WHERE id = $2
    `, [updatedPlatforms, id]);

    res.json({
      success: true,
      data: {
        id: agent.id,
        name: agent.name,
        platforms: updatedPlatforms
      },
      message: 'Agent platforms updated successfully'
    });

  } catch (error) {
    logger.error('Failed to fix agent platforms:', error);
    res.status(500).json({
      error: 'Failed to fix agent platforms',
      details: error.message
    });
  }
});

// POST /api/agents/test-twitter - Test Twitter authentication (debugging endpoint)
router.post('/test-twitter', authenticateToken, async (req, res) => {
  try {
    console.log('🧪 Testing Twitter authentication for user:', req.user.id);
    
    // Get user's Twitter connection
    const connectionResult = await database.query(`
      SELECT access_token, refresh_token, username
      FROM platform_connections 
      WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'
    `, [req.user.id]);

    if (connectionResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active Twitter connection found' });
    }

    const connection = connectionResult.rows[0];
    
    // Decrypt tokens
    const { decrypt } = require('../utils/encryption');
    const accessToken = decrypt(connection.access_token);
    const refreshToken = decrypt(connection.refresh_token);
    
    // Check if we need to refresh the access token
    let currentAccessToken = accessToken;
    let currentRefreshToken = refreshToken;
    
    try {
      // Try to refresh the token first
      const { TwitterApi } = require('twitter-api-v2');
      const refreshClient = new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID,
        clientSecret: process.env.TWITTER_CLIENT_SECRET,
      });
      
      console.log('🔄 Attempting to refresh OAuth 2.0 token...');
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshClient.refreshOAuth2Token(refreshToken);
      
      console.log('✅ Token refreshed successfully');
      currentAccessToken = newAccessToken;
      currentRefreshToken = newRefreshToken;
      
      // Update the database with new tokens
      const { encrypt } = require('../utils/encryption');
      const encryptedNewAccessToken = encrypt(newAccessToken);
      const encryptedNewRefreshToken = newRefreshToken ? encrypt(newRefreshToken) : null;
      
      await database.query(`
        UPDATE platform_connections 
        SET access_token = $1, refresh_token = $2, updated_at = NOW()
        WHERE user_id = $3 AND platform = 'twitter'
      `, [encryptedNewAccessToken, encryptedNewRefreshToken, req.user.id]);
      
      console.log('💾 Updated database with new tokens');
      
    } catch (refreshError) {
      console.log('⚠️ Token refresh failed, using existing token:', refreshError.message);
      // Continue with existing token if refresh fails
    }
    
    console.log('🔑 Decrypted access token preview:', currentAccessToken ? currentAccessToken.substring(0, 10) + '...' : 'None');
    console.log('🔑 Decrypted refresh token preview:', currentRefreshToken ? currentRefreshToken.substring(0, 10) + '...' : 'None');
    
    // Test with minimal client - For OAuth 2.0, just pass the access token
    const { TwitterApi } = require('twitter-api-v2');
    const userClient = new TwitterApi(currentAccessToken);

    console.log('📱 Testing Twitter client authentication...');
    console.log('🔧 Client config:', {
      clientId: process.env.TWITTER_CLIENT_ID ? process.env.TWITTER_CLIENT_ID.substring(0, 10) + '...' : 'Missing',
      clientSecret: process.env.TWITTER_CLIENT_SECRET ? process.env.TWITTER_CLIENT_SECRET.substring(0, 10) + '...' : 'Missing',
      accessToken: accessToken ? accessToken.substring(0, 10) + '...' : 'Missing',
      refreshToken: refreshToken ? refreshToken.substring(0, 10) + '...' : 'Missing'
    });
    
    // Just test authentication first
    const me = await userClient.v2.me();
    
    console.log('✅ Twitter authentication successful for:', me.data.username);
    
    res.json({ 
      success: true, 
      username: me.data.username,
      message: 'Twitter authentication successful',
      debug: {
        appKeySet: !!process.env.TWITTER_API_KEY,
        appSecretSet: !!process.env.TWITTER_API_SECRET,
        accessTokenLength: accessToken ? accessToken.length : 0
      }
    });
    
  } catch (error) {
    console.error('❌ Twitter test failed:', error.message);
    console.error('🔍 Full error details:', JSON.stringify(error, null, 2));
    
    res.status(500).json({ 
      error: 'Twitter test failed', 
      details: error.message,
      debug: {
        appKeySet: !!process.env.TWITTER_API_KEY,
        appSecretSet: !!process.env.TWITTER_API_SECRET,
        errorType: error.constructor.name,
        errorCode: error.code,
        errorStatus: error.status
      }
    });
  }
});

// POST /api/agents/:agentId/engagement-settings - Update agent engagement settings
router.post('/:agentId/engagement-settings', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { 
      autoReplyEnabled, 
      replyFrequency, 
      minEngagementThreshold,
      maxRepliesPerDay,
      replyToMentions,
      replyToReplies
    } = req.body;

    // Verify ownership
    const agent = await database.query(
      'SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2',
      [agentId, req.user.id]
    );

    if (agent.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // If auto-reply is disabled, automatically disable individual reply types
    const finalReplyToMentions = autoReplyEnabled ? replyToMentions : false;
    const finalReplyToReplies = autoReplyEnabled ? replyToReplies : false;
    
    // Update engagement settings
    await database.query(`
      UPDATE ai_agents 
      SET auto_reply_enabled = $1,
          reply_frequency = $2,
          min_engagement_threshold = $3,
          max_replies_per_day = $4,
          reply_to_mentions = $5,
          reply_to_replies = $6,
          updated_at = NOW()
      WHERE id = $7
    `, [autoReplyEnabled, replyFrequency, minEngagementThreshold, 
         maxRepliesPerDay, finalReplyToMentions, finalReplyToReplies, agentId]);

    res.json({ 
      success: true, 
      message: 'Engagement settings updated successfully' 
    });

  } catch (error) {
    console.error('Failed to update engagement settings:', error);
    res.status(500).json({ error: 'Failed to update engagement settings' });
  }
});

// GET /api/agents/:agentId/engagement-settings - Get agent engagement settings
router.get('/:agentId/engagement-settings', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;

    // Verify ownership
    const agent = await database.query(
      'SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2',
      [agentId, req.user.id]
    );

    if (agent.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Return engagement settings
    res.json({ 
      success: true, 
      data: {
        auto_reply_enabled: agent.rows[0].auto_reply_enabled,
        reply_frequency: agent.rows[0].reply_frequency,
        min_engagement_threshold: agent.rows[0].min_engagement_threshold,
        max_replies_per_day: agent.rows[0].max_replies_per_day,
        reply_to_mentions: agent.rows[0].reply_to_mentions,
        reply_to_replies: agent.rows[0].reply_to_replies
      }
    });

  } catch (error) {
    console.error('Failed to get engagement settings:', error);
    res.status(500).json({ error: 'Failed to get engagement settings' });
  }
});

// GET /api/agents/:agentId/engagement-analytics - Get agent engagement analytics
router.get('/:agentId/engagement-analytics', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { period = '7d' } = req.query;

    // Verify ownership
    const agent = await database.query(
      'SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2',
      [agentId, req.user.id]
    );

    if (agent.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Calculate date range based on period
    let dateRange;
    switch (period) {
      case '24h':
        dateRange = 'NOW() - INTERVAL \'24 hours\'';
        break;
      case '7d':
        dateRange = 'NOW() - INTERVAL \'7 days\'';
        break;
      case '30d':
        dateRange = 'NOW() - INTERVAL \'30 days\'';
        break;
      default:
        dateRange = 'NOW() - INTERVAL \'7 days\'';
    }

    // Get engagement analytics
    const analytics = await database.query(`
      SELECT 
        DATE(created_at) as date,
        engagement_type,
        COUNT(*) as count,
        AVG(engagement_score) as avg_score,
        COUNT(CASE WHEN engagement_score > 0.7 THEN 1 END) as high_quality
      FROM agent_engagements 
      WHERE agent_id = $1 AND created_at > ${dateRange}
      GROUP BY DATE(created_at), engagement_type
      ORDER BY date DESC, engagement_type
    `, [agentId]);

    // Get conversation insights
    const conversations = await database.query(`
      SELECT 
        conversation_tone,
        user_sentiment,
        COUNT(*) as count,
        AVG(conversation_length) as avg_length
      FROM conversation_threads 
      WHERE agent_id = $1 AND created_at > ${dateRange}
      GROUP BY conversation_tone, user_sentiment
    `, [agentId]);

    // Get recent engagements
    const recentEngagements = await database.query(`
      SELECT 
        ae.*,
        ct.conversation_tone,
        ct.user_sentiment
      FROM agent_engagements ae
      LEFT JOIN conversation_threads ct ON ae.tweet_id = ct.root_tweet_id
      WHERE ae.agent_id = $1 
      ORDER BY ae.created_at DESC 
      LIMIT 20
    `, [agentId]);

    res.json({
      success: true,
      data: {
        analytics: analytics.rows,
        conversations: conversations.rows,
        recentEngagements: recentEngagements.rows,
        summary: {
          totalEngagements: analytics.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
          avgEngagementScore: analytics.rows.reduce((sum, row) => sum + parseFloat(row.avg_score || 0), 0) / Math.max(analytics.rows.length, 1),
          highQualityRate: analytics.rows.reduce((sum, row) => sum + parseInt(row.high_quality || 0), 0) / Math.max(analytics.rows.reduce((sum, row) => sum + parseInt(row.count), 0), 1)
        }
      }
    });

  } catch (error) {
    console.error('Failed to get engagement analytics:', error);
    res.status(500).json({ error: 'Failed to get engagement analytics' });
  }
});

// POST /api/agents/:agentId/test-engagement - Test engagement with a sample tweet
router.post('/:agentId/test-engagement', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { sampleTweet } = req.body;

    if (!sampleTweet) {
      return res.status(400).json({ error: 'Sample tweet text required' });
    }

    // Verify ownership
    const agent = await database.query(
      'SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2',
      [agentId, req.user.id]
    );

    if (agent.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Create mock tweet data for testing
    const mockTweet = {
      id: 'test_' + Date.now(),
      text: sampleTweet,
      author_id: 'test_user',
      author: {
        username: 'test_user',
        verified: false,
        public_metrics: {
          followers_count: 100,
          following_count: 50
        }
      },
      public_metrics: {
        like_count: 75,
        retweet_count: 10,
        reply_count: 5,
        quote_count: 2,
        impression_count: 1000
      },
      created_at: new Date().toISOString()
    };

    // Initialize personality agent
    const { PersonalityAgent } = require('../services/PersonalityAgent.js');
    const personalityAgent = new PersonalityAgent(agent.rows[0]);

    // Test engagement decision
    const engagementDecision = await personalityAgent.shouldEngageWithTweet(mockTweet, agent.rows[0]);
    
    // Generate sample reply if engagement is recommended
    let sampleReply = '';
    if (engagementDecision.shouldEngage) {
      sampleReply = await personalityAgent.generateContent({
        type: 'reply',
        platform: 'twitter',
        originalTweet: mockTweet
      });
    }

    res.json({
      success: true,
      data: {
        engagementDecision,
        sampleReply,
        agentConfig: {
          targetTopics: agent.rows[0].target_topics,
          minEngagementThreshold: agent.rows[0].min_engagement_threshold,
          autoReplyEnabled: agent.rows[0].auto_reply_enabled
        }
      }
    });

  } catch (error) {
    console.error('Failed to test engagement:', error);
    res.status(500).json({ error: 'Failed to test engagement' });
  }
});

// GET /api/agents/:agentId/conversations - Get agent conversation history
router.get('/:agentId/conversations', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    // Verify ownership
    const agent = await database.query(
      'SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2',
      [agentId, req.user.id]
    );

    if (agent.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get conversation threads
    const conversations = await database.query(`
      SELECT 
        ct.*,
        COUNT(cm.id) as message_count
      FROM conversation_threads ct
      LEFT JOIN conversation_messages cm ON ct.id = cm.conversation_id
      WHERE ct.agent_id = $1
      GROUP BY ct.id
      ORDER BY ct.last_activity DESC
      LIMIT $2 OFFSET $3
    `, [agentId, parseInt(limit), parseInt(offset)]);

    // Get messages for each conversation
    const conversationsWithMessages = [];
    for (const conv of conversations.rows) {
      const messages = await database.query(`
        SELECT * FROM conversation_messages 
        WHERE conversation_id = $1 
        ORDER BY message_order ASC
      `, [conv.id]);

      conversationsWithMessages.push({
        ...conv,
        messages: messages.rows
      });
    }

    res.json({
      success: true,
      data: {
        conversations: conversationsWithMessages,
        total: conversations.rows.length,
        hasMore: conversations.rows.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Failed to get conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// POST /api/agents/:agentId/engagement-pause - Pause agent engagement temporarily
router.post('/:agentId/engagement-pause', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { pauseDuration = '1h', reason } = req.body;

    // Verify ownership
    const agent = await database.query(
      'SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2',
      [agentId, req.user.id]
    );

    if (agent.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Calculate pause until time
    let pauseUntil;
    switch (pauseDuration) {
      case '1h':
        pauseUntil = new Date(Date.now() + 60 * 60 * 1000);
        break;
      case '6h':
        pauseUntil = new Date(Date.now() + 6 * 60 * 60 * 1000);
        break;
      case '24h':
        pauseUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        pauseUntil = new Date(req.body.customTime);
        break;
      default:
        pauseUntil = new Date(Date.now() + 60 * 60 * 1000);
    }

    // Update agent to pause engagement
    await database.query(`
      UPDATE ai_agents 
      SET auto_reply_enabled = false,
          engagement_paused_until = $1,
          engagement_pause_reason = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [pauseUntil, reason, agentId]);

    res.json({ 
      success: true, 
      message: 'Agent engagement paused successfully',
      data: {
        pausedUntil: pauseUntil,
        reason: reason
      }
    });

  } catch (error) {
    console.error('Failed to pause engagement:', error);
    res.status(500).json({ error: 'Failed to pause engagement' });
  }
});

// POST /api/agents/:agentId/engagement-resume - Resume agent engagement
router.post('/:agentId/engagement-resume', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;

    // Verify ownership
    const agent = await database.query(
      'SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2',
      [agentId, req.user.id]
    );

    if (agent.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Resume engagement
    await database.query(`
      UPDATE ai_agents 
      SET auto_reply_enabled = true,
          engagement_paused_until = NULL,
          engagement_pause_reason = NULL,
          updated_at = NOW()
      WHERE id = $1
    `, [agentId]);

    res.json({ 
      success: true, 
      message: 'Agent engagement resumed successfully' 
    });

  } catch (error) {
    console.error('Failed to resume engagement:', error);
    res.status(500).json({ error: 'Failed to resume engagement' });
  }
});

// Mint NFT for AI Agent — disabled in Iqonga v1 (no blockchain)
router.post('/:id/mint-nft', authenticateToken, async (req, res) => {
  return res.status(501).json({
    error: 'NFT minting is not available in Iqonga v1.',
    message: 'Blockchain features have been removed for this release.'
  });
});

// Get agent NFT data — disabled in Iqonga v1 (no blockchain)
router.get('/:id/nft', authenticateToken, async (req, res) => {
  return res.status(501).json({
    error: 'NFT data is not available in Iqonga v1.',
    message: 'Blockchain features have been removed for this release.'
  });
});

// Update agent performance on blockchain — disabled in Iqonga v1 (no blockchain)
router.post('/:id/update-performance', authenticateToken, async (req, res) => {
  return res.status(501).json({
    error: 'Blockchain performance updates are not available in Iqonga v1.',
    message: 'Blockchain features have been removed for this release.'
  });
});

// Update platform pricing (authority only) — disabled in Iqonga v1 (no blockchain)
router.post('/admin/update-pricing', authenticateToken, async (req, res) => {
  return res.status(501).json({
    error: 'Blockchain pricing is not available in Iqonga v1.',
    message: 'Blockchain features have been removed for this release.'
  });
});

// POST /api/agents/:id/music/generate - Generate music based on agent personality
router.post('/:id/music/generate', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: agentId } = req.params;
    const {
      topic = null,
      duration = 30,
      instrumental = false,
      provider = null, // Music generation provider (musicapi, stability, sunoapi)
      conceptProvider = 'openai', // AI provider for concept generation (openai, gemini)
      voiceType = null, // Voice type override (optional, defaults to company profile)
      language = null // Language override (optional, defaults to company profile)
    } = req.body;

    // Check if agent exists and belongs to user
    const agentResult = await database.query(`
      SELECT id, name, description, personality_type, voice_tone, target_topics, user_id
      FROM ai_agents 
      WHERE id = $1 AND user_id = $2
    `, [agentId, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agentResult.rows[0];

    // Check if music generation service is available
    const MusicGenerationService = require('../services/MusicGenerationService');
    const musicService = new MusicGenerationService();
    if (!musicService.isAvailable()) {
      return res.status(503).json({
        error: 'Music generation service not available',
        details: 'No music generation API keys configured. Please set MUSICAPI_API_KEY, STABILITY_API_KEY, or SUNOAPI_API_KEY in environment variables.'
      });
    }

    // Deduct credits for music generation
    const generationId = uuidv4();
    const creditCost = 300; // Music generation cost
    const CreditService = require('../services/CreditService');
    const creditService = new CreditService();
    
    try {
      await creditService.deductCredits(userId, 'music_generation', creditCost, generationId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    logger.info(`Agent ${agent.name} (${agentId}) generating music concept...`);

    // Step 1: Generate music concept based on agent personality
    const aiContentService = require('../services/AIContentService');
    const musicConcept = await aiContentService.generateMusicConcept(agent, {
      topic,
      duration: parseInt(duration),
      instrumental: instrumental === true || instrumental === 'true',
      provider: conceptProvider,
      voiceType: voiceType || null, // Override company profile if provided
      language: language || null // Override company profile if provided
    });

    logger.info(`Agent ${agent.name} generated music concept:`, {
      prompt: musicConcept.prompt,
      style: musicConcept.style,
      mood: musicConcept.mood,
      reasoning: musicConcept.reasoning
    });

    // Step 2: Generate webhook URL and secret for MusicAPI.ai callbacks
    const crypto = require('crypto');
    const webhookSecret = process.env.MUSICAPI_WEBHOOK_SECRET || crypto.randomBytes(32).toString('hex');
    const webhookUrl = `${process.env.BACKEND_URL || 'https://www.iqonga.org'}/api/webhooks/musicapi`;

    // Step 3: Generate music using the concept
    const result = await musicService.generateMusic(musicConcept.prompt, {
      provider,
      duration: parseInt(duration),
      style: musicConcept.style,
      genre: musicConcept.genre,
      instrumental: instrumental === true || instrumental === 'true',
      lyrics: musicConcept.lyrics,
      tempo: musicConcept.tempo,
      mood: musicConcept.mood,
      voiceType: musicConcept.voiceType || voiceType || null,
      language: musicConcept.language || language || null,
      webhookUrl,
      webhookSecret
    });

    // Step 4: Save to database with agent_id
    let musicId;
    try {
      musicId = uuidv4();
      await database.query(`
        INSERT INTO generated_music (
          id, user_id, agent_id, prompt, style, genre, duration,
          instrumental, lyrics, tempo, mood, audio_url, provider,
          status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        musicId,
        userId,
        agentId,
        musicConcept.prompt,
        musicConcept.style,
        musicConcept.genre || null,
        duration,
        instrumental === true || instrumental === 'true',
        musicConcept.lyrics || null,
        musicConcept.tempo || null,
        musicConcept.mood || null,
        result.audioUrl || null,
        result.provider,
        result.status || 'processing',
        JSON.stringify({
          ...(result.metadata || {}),
          webhook_secret: webhookSecret,
          agent_concept: {
            title: musicConcept.title,
            reasoning: musicConcept.reasoning,
            agent_aware: musicConcept.agent_aware,
            company_aware: musicConcept.company_aware
          }
        })
      ]);

      logger.info(`Music saved to database with ID: ${musicId}, agent_id: ${agentId}, task_id: ${result.taskId || 'N/A'}`);
      
      // Note: Webhooks are the primary method for async completion.
      // Polling is kept as a fallback if webhooks fail or are not configured.
      // If we got a task_id and status is processing, start polling in background as fallback
      if (result.status === 'processing' && result.taskId && result.provider === 'musicapi') {
        // Start background polling as fallback (non-blocking)
        // This will only run if webhook doesn't arrive within a reasonable time (5 minutes delay)
        setTimeout(() => {
          musicService.pollMusicAPICompletion(result.taskId)
            .then(async (completedResult) => {
              // Update database with completed result
              try {
                await database.query(`
                  UPDATE generated_music 
                  SET audio_url = $1, 
                      status = $2,
                      metadata = $3,
                      updated_at = NOW()
                  WHERE id = $4
                `, [
                  completedResult.audioUrl,
                  'completed',
                  JSON.stringify(completedResult.metadata || {}),
                  musicId
                ]);
                logger.info(`Music generation completed via polling fallback: ${musicId}`);
              } catch (updateError) {
                logger.error(`Failed to update music in database: ${updateError.message}`);
              }
            })
            .catch(async (pollError) => {
              // Update database with failed status
              try {
                await database.query(`
                  UPDATE generated_music 
                  SET status = $1,
                      metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{error}', $2::jsonb),
                      updated_at = NOW()
                  WHERE id = $3
                `, [
                  'failed',
                  JSON.stringify(pollError.message),
                  musicId
                ]);
                logger.error(`Music generation failed via polling: ${pollError.message}`);
              } catch (updateError) {
                logger.error(`Failed to update music status in database: ${updateError.message}`);
              }
            });
        }, 5 * 60 * 1000); // Wait 5 minutes before starting fallback polling
      }
    } catch (dbError) {
      logger.error('Failed to save music to database:', dbError);
      // Continue even if database save fails
    }

    res.json({
      success: true,
      message: `Music generated by agent ${agent.name}`,
      data: {
        ...result,
        id: musicId || generationId,
        agent: {
          id: agent.id,
          name: agent.name,
          personality: agent.personality_type
        },
        concept: {
          prompt: musicConcept.prompt,
          title: musicConcept.title,
          style: musicConcept.style,
          genre: musicConcept.genre,
          mood: musicConcept.mood,
          tempo: musicConcept.tempo,
          reasoning: musicConcept.reasoning,
          agent_aware: musicConcept.agent_aware,
          company_aware: musicConcept.company_aware
        },
        lyrics: musicConcept.lyrics,
        duration,
        instrumental
      },
      metadata: {
        provider: result.provider,
        conceptProvider: conceptProvider,
        generatedAt: new Date().toISOString(),
        creditCost
      }
    });

  } catch (error) {
    // Safely log error without circular references
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : undefined
    };
    logger.error('Agent music generation failed:', errorDetails);
    
    // Provide helpful error messages
    let errorMessage = error.message;
    let suggestions = [];
    
    if (error.message.includes('No music generation providers')) {
      errorMessage = 'No music generation providers are configured.';
      suggestions = [
        'Please configure at least one API key: MUSICAPI_API_KEY, STABILITY_API_KEY, or SUNOAPI_API_KEY'
      ];
    } else if (error.message.includes('All music generation providers failed')) {
      errorMessage = 'All music generation providers failed. Please try again.';
      suggestions = [
        'Check your API keys are valid',
        'Try a different topic or settings',
        'Wait a few minutes and try again'
      ];
    } else if (error.message.includes('Failed to generate valid music concept')) {
      errorMessage = 'Failed to generate music concept from agent personality.';
      suggestions = [
        'The agent may need more personality configuration',
        'Try using a different concept provider (openai or gemini)',
        'Check that the agent has proper personality_type and voice_tone set'
      ];
    }
    
    res.status(500).json({
      error: 'Failed to generate music',
      details: errorMessage,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 