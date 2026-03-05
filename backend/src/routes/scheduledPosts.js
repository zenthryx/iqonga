const express = require('express');
const { v4: uuidv4 } = require('uuid');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const cron = require('node-cron');
const SchedulerService = require('../services/SchedulerService');

// Initialize scheduler service (singleton so assistant can add posts)
const schedulerService = SchedulerService.getInstance();
let schedulerStarted = false;

// Start the scheduler service when the module loads
const startScheduler = async () => {
  // Prevent multiple startup attempts
  if (schedulerStarted) {
    return;
  }
  
  try {
    // Only start if database is connected
    if (database.isConnected) {
      await schedulerService.start();
      schedulerStarted = true;
      logger.info('Scheduler service started successfully');
    } else {
      logger.info('Database not connected, deferring scheduler startup');
      // Retry after 5 seconds
      setTimeout(startScheduler, 5000);
    }
  } catch (error) {
    logger.error('Failed to start scheduler service:', error);
    // Retry after 5 seconds
    setTimeout(startScheduler, 5000);
  }
};

// Start scheduler after a short delay to allow database connection
setTimeout(startScheduler, 2000);

const router = express.Router();

// GET /api/scheduled-posts - Get user's scheduled posts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, platform, limit = 20, offset = 0, start_date, end_date } = req.query;

    let query = `
      SELECT 
        sp.*,
        a.name as agent_name,
        a.personality_type,
        a.avatar_url
      FROM scheduled_posts sp
      JOIN ai_agents a ON sp.agent_id = a.id
      WHERE sp.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND sp.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (platform) {
      query += ` AND sp.platform = $${paramIndex}`;
      params.push(platform);
      paramIndex++;
    }

    // Date range filter for calendar view
    if (start_date) {
      query += ` AND sp.scheduled_time >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND sp.scheduled_time <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    // For calendar view, don't limit if start_date/end_date is provided
    if (start_date && end_date) {
      query += ` ORDER BY sp.scheduled_time ASC`;
    } else {
      query += ` ORDER BY sp.scheduled_time ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), parseInt(offset));
    }

    const result = await database.query(query, params);

    const scheduledPosts = result.rows.map(row => ({
      id: row.id,
      agent: {
        id: row.agent_id,
        name: row.agent_name,
        personality_type: row.personality_type,
        avatar_url: row.avatar_url
      },
      platform: row.platform,
      content_type: row.content_type,
      content_text: row.content_text,
      content_config: row.content_config,
      media_urls: row.media_urls || [],
      telegram_chat_id: row.telegram_chat_id || null,
      scheduled_time: row.scheduled_time,
      timezone: row.timezone,
      frequency: row.frequency,
      frequency_config: row.frequency_config,
      status: row.status,
      last_run: row.last_run,
      next_run: row.next_run,
      run_count: row.run_count,
      max_runs: row.max_runs,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    res.json({
      success: true,
      data: scheduledPosts,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: scheduledPosts.length
      }
    });

  } catch (error) {
    logger.error('Failed to get scheduled posts:', error);
    res.status(500).json({
      error: 'Failed to retrieve scheduled posts',
      details: error.message
    });
  }
});

// POST /api/scheduled-posts - Create a new scheduled post (requires ZTR tokens)
router.post('/', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      agent_id,
      platform = 'twitter',
      content_type = 'tweet',
      content_text,
      content_config,
      media_urls,
      telegram_chat_id,
      scheduled_time,
      timezone = 'UTC',
      frequency = 'once',
      frequency_config,
      max_runs = 1
    } = req.body;

    // Validation
    if (!agent_id || !scheduled_time) {
      return res.status(400).json({
        error: 'Missing required fields: agent_id, scheduled_time'
      });
    }

    // Check if agent exists and belongs to user
    const agentResult = await database.query(`
      SELECT id, platforms FROM ai_agents 
      WHERE id = $1 AND user_id = $2
    `, [agent_id, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agentResult.rows[0];

    // Check if agent has the specified platform enabled
    if (!agent.platforms || !agent.platforms.includes(platform)) {
      return res.status(400).json({ 
        error: `Agent does not have ${platform} platform enabled` 
      });
    }

    // Check if user has platform connection
    let connectionResult;
    if (platform === 'telegram') {
      // For Telegram, check telegram_groups table
      connectionResult = await database.query(`
        SELECT is_active FROM telegram_groups 
        WHERE user_id = $1 AND is_active = true
        LIMIT 1
      `, [userId]);
    } else {
      // For other platforms (Twitter, etc.), check platform_connections table
      connectionResult = await database.query(`
        SELECT connection_status FROM platform_connections 
        WHERE user_id = $1 AND platform = $2 AND connection_status = 'active'
      `, [userId, platform]);
    }

    if (connectionResult.rows.length === 0) {
      return res.status(400).json({ 
        error: `No active ${platform} connection found` 
      });
    }

    // Calculate next_run based on frequency
    let nextRun = new Date(scheduled_time);
    if (frequency !== 'once') {
      nextRun = calculateNextRun(scheduled_time, frequency, frequency_config);
    }

    const scheduledPostId = uuidv4();

    const mediaUrlsArray = Array.isArray(media_urls) ? media_urls : [];
    const result = await database.query(`
      INSERT INTO scheduled_posts (
        id, agent_id, user_id, platform, content_type, content_text, 
        content_config, media_urls, telegram_chat_id, scheduled_time, timezone, frequency, frequency_config,
        next_run, max_runs, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      ) RETURNING *
    `, [
      scheduledPostId, agent_id, userId, platform, content_type, content_text,
      content_config, mediaUrlsArray, platform === 'telegram' ? telegram_chat_id || null : null, scheduled_time, timezone, frequency, frequency_config,
      nextRun, max_runs
    ]);

    const scheduledPost = result.rows[0];

    // Schedule the post using the scheduler service
    try {
      await schedulerService.addScheduledPost(scheduledPost);
    } catch (scheduleError) {
      logger.error('Failed to schedule post:', scheduleError);
      // Continue even if scheduling fails - the post is still created in the database
    }

    res.status(201).json({
      success: true,
      data: {
        id: scheduledPost.id,
        agent_id: scheduledPost.agent_id,
        platform: scheduledPost.platform,
        content_type: scheduledPost.content_type,
        scheduled_time: scheduledPost.scheduled_time,
        next_run: scheduledPost.next_run,
        status: scheduledPost.status
      },
      message: 'Scheduled post created successfully'
    });

  } catch (error) {
    logger.error('Failed to create scheduled post:', error);
    res.status(500).json({
      error: 'Failed to create scheduled post',
      details: error.message
    });
  }
});

// PUT /api/scheduled-posts/:id - Update scheduled post
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updateFields = req.body;

    // Check if scheduled post exists and belongs to user
    const existingPost = await database.query(`
      SELECT id FROM scheduled_posts WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (existingPost.rows.length === 0) {
      return res.status(404).json({ error: 'Scheduled post not found' });
    }

    // Build dynamic update query
    const allowedFields = [
      'content_text', 'content_config', 'media_urls', 'telegram_chat_id', 'content_type',
      'scheduled_time', 'timezone', 'frequency', 'frequency_config', 'max_runs', 'status'
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [field, value] of Object.entries(updateFields)) {
      if (allowedFields.includes(field)) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add updated_at and id to values
    updates.push('updated_at = NOW()');
    values.push(id);

    const query = `
      UPDATE scheduled_posts 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await database.query(query, values);
    const updatedPost = result.rows[0];

    // Recalculate next_run if time or frequency changed
    if (updateFields.scheduled_time || updateFields.frequency || updateFields.frequency_config) {
      let nextRun = new Date(updatedPost.scheduled_time);
      if (updatedPost.frequency !== 'once') {
        nextRun = calculateNextRun(updatedPost.scheduled_time, updatedPost.frequency, updatedPost.frequency_config);
      }
      
      await database.query(`
        UPDATE scheduled_posts SET next_run = $1 WHERE id = $2
      `, [nextRun, id]);
      
      updatedPost.next_run = nextRun;
    }

    res.json({
      success: true,
      data: updatedPost,
      message: 'Scheduled post updated successfully'
    });

  } catch (error) {
    logger.error('Failed to update scheduled post:', error);
    res.status(500).json({
      error: 'Failed to update scheduled post',
      details: error.message
    });
  }
});

// DELETE /api/scheduled-posts/:id - Delete scheduled post
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check if scheduled post exists and belongs to user
    const existingPost = await database.query(`
      SELECT sp.*, a.user_id as agent_user_id
      FROM scheduled_posts sp
      JOIN ai_agents a ON sp.agent_id = a.id
      WHERE sp.id = $1
    `, [id]);

    if (existingPost.rows.length === 0) {
      return res.status(404).json({ error: 'Scheduled post not found' });
    }

    if (existingPost.rows[0].agent_user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    // Cancel any pending execution
    cancelScheduledPost(id);

    // Delete the scheduled post
    await database.query(`
      DELETE FROM scheduled_posts WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Scheduled post deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete scheduled post:', error);
    res.status(500).json({
      error: 'Failed to delete scheduled post',
      details: error.message
    });
  }
});

// POST /api/scheduled-posts/:id/pause - Pause a scheduled post
router.post('/:id/pause', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check if scheduled post exists and belongs to user
    const existingPost = await database.query(`
      SELECT sp.*, a.user_id as agent_user_id
      FROM scheduled_posts sp
      JOIN ai_agents a ON sp.agent_id = a.id
      WHERE sp.id = $1
    `, [id]);

    if (existingPost.rows.length === 0) {
      return res.status(404).json({ error: 'Scheduled post not found' });
    }

    if (existingPost.rows[0].agent_user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to pause this post' });
    }

    // Cancel any pending execution using the scheduler service
    try {
      await schedulerService.pauseScheduledPost(id);
    } catch (scheduleError) {
      logger.error('Failed to pause post in scheduler:', scheduleError);
      // Continue even if scheduler operation fails
    }

    // Update status to paused
    await database.query(`
      UPDATE scheduled_posts 
      SET status = 'paused', updated_at = NOW()
      WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Scheduled post paused successfully'
    });

  } catch (error) {
    logger.error('Failed to pause scheduled post:', error);
    res.status(500).json({
      error: 'Failed to pause scheduled post',
      details: error.message
    });
  }
});

// POST /api/scheduled-posts/:id/resume - Resume a paused scheduled post
router.post('/:id/resume', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check if scheduled post exists and belongs to user
    const existingPost = await database.query(`
      SELECT sp.*, a.user_id as agent_user_id
      FROM scheduled_posts sp
      JOIN ai_agents a ON sp.agent_id = a.id
      WHERE sp.id = $1
    `, [id]);

    if (existingPost.rows.length === 0) {
      return res.status(404).json({ error: 'Scheduled post not found' });
    }

    if (existingPost.rows[0].agent_user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to resume this post' });
    }

    const post = existingPost.rows[0];

    // Calculate next run time
    let nextRun = new Date(post.scheduled_time);
    if (post.frequency !== 'once') {
      nextRun = calculateNextRun(post.scheduled_time, post.frequency, post.frequency_config);
    }

    // Resume the post using the scheduler service
    try {
      await schedulerService.resumeScheduledPost(id);
    } catch (scheduleError) {
      logger.error('Failed to resume post in scheduler:', scheduleError);
      // Continue even if scheduler operation fails
    }

    res.json({
      success: true,
      data: { next_run: nextRun },
      message: 'Scheduled post resumed successfully'
    });

  } catch (error) {
    logger.error('Failed to resume scheduled post:', error);
    res.status(500).json({
      error: 'Failed to resume scheduled post',
      details: error.message
    });
  }
});

// GET /api/scheduled-posts/health - Check scheduler health
router.get('/health', async (req, res) => {
  try {
    const health = await schedulerService.checkSchedulerHealth();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Failed to check scheduler health:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/scheduled-posts/debug/twitter/:agentId - Debug Twitter connection for agent
router.get('/debug/twitter/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const connectionStatus = await schedulerService.checkTwitterConnection(agentId);
    res.json({
      success: true,
      data: connectionStatus
    });
  } catch (error) {
    logger.error('Failed to check Twitter connection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/scheduled-posts/debug/telegram/:userId - Debug Telegram connection for user
router.get('/debug/telegram/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;
    
    // Only allow users to check their own connections
    if (parseInt(userId) !== requestingUserId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Check Telegram groups
    const telegramGroups = await database.query(`
      SELECT chat_id, chat_type, title, username, is_active, created_at
      FROM telegram_groups 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    
    // Check platform connections
    const platformConnections = await database.query(`
      SELECT platform, connection_status, created_at
      FROM platform_connections 
      WHERE user_id = $1 AND platform = 'telegram'
    `, [userId]);
    
    res.json({
      success: true,
      data: {
        telegram_groups: telegramGroups.rows,
        platform_connections: platformConnections.rows,
        active_groups_count: telegramGroups.rows.filter(g => g.is_active).length,
        total_groups_count: telegramGroups.rows.length
      }
    });
  } catch (error) {
    logger.error('Failed to check Telegram connection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to calculate next run time
function calculateNextRun(scheduledTime, frequency, frequencyConfig) {
  const baseTime = new Date(scheduledTime);
  const now = new Date();

  switch (frequency) {
    case 'once':
      return baseTime;
    
    case 'hourly':
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1);
      nextHour.setMinutes(baseTime.getMinutes(), 0, 0);
      return nextHour;
    
    case 'every_4_hours':
      const next4Hours = new Date(now);
      next4Hours.setHours(next4Hours.getHours() + 4);
      next4Hours.setMinutes(baseTime.getMinutes(), 0, 0);
      return next4Hours;
    
    case 'every_6_hours':
      const next6Hours = new Date(now);
      next6Hours.setHours(next6Hours.getHours() + 6);
      next6Hours.setMinutes(baseTime.getMinutes(), 0, 0);
      return next6Hours;
    
    case 'every_12_hours':
      const next12Hours = new Date(now);
      next12Hours.setHours(next12Hours.getHours() + 12);
      next12Hours.setMinutes(baseTime.getMinutes(), 0, 0);
      return next12Hours;
    
    case 'daily':
      let nextDaily = new Date(baseTime);
      while (nextDaily <= now) {
        nextDaily.setDate(nextDaily.getDate() + 1);
      }
      return nextDaily;
    
    case 'weekly':
      let nextWeekly = new Date(baseTime);
      while (nextWeekly <= now) {
        nextWeekly.setDate(nextWeekly.getDate() + 7);
      }
      return nextWeekly;
    
    case 'monthly':
      let nextMonthly = new Date(baseTime);
      while (nextMonthly <= now) {
        nextMonthly.setMonth(nextMonthly.getMonth() + 1);
      }
      return nextMonthly;
    
    default:
      return baseTime;
  }
}

// Helper function to schedule a post
function schedulePost(scheduledPost) {
  const postTime = new Date(scheduledPost.next_run);
  const now = new Date();
  
  if (postTime <= now) {
    return; // Post time has already passed
  }
  
  const delay = postTime.getTime() - now.getTime();
  
  setTimeout(async () => {
    try {
      await executeScheduledPost(scheduledPost.id);
    } catch (error) {
      logger.error(`Failed to execute scheduled post ${scheduledPost.id}:`, error);
    }
  }, delay);
}

// Helper function to cancel a scheduled post
function cancelScheduledPost(postId) {
  // This would cancel any pending timeouts
  // In a production system, you might use a more sophisticated job queue
}

// Helper function to execute a scheduled post
async function executeScheduledPost(postId) {
  try {
    // Get the scheduled post details
    const postResult = await database.query(`
      SELECT * FROM scheduled_posts WHERE id = $1
    `, [postId]);

    if (postResult.rows.length === 0) {
      return;
    }

    const post = postResult.rows[0];

    // Update status to running
    await database.query(`
      UPDATE scheduled_posts SET status = 'running' WHERE id = $1
    `, [postId]);

    // Execute the post based on platform
    logger.info(`Executing scheduled post for platform: ${post.platform}`);
    
    if (post.platform === 'twitter') {
      await executeTwitterPost(post);
    } else if (post.platform === 'telegram') {
      await executeTelegramPost(post);
    } else {
      logger.warn(`Unsupported platform for scheduled post: ${post.platform}`);
    }

    // Update status and calculate next run
    await updatePostExecution(post);

  } catch (error) {
    logger.error(`Failed to execute scheduled post ${postId}:`, error);
    
    // Update status to failed
    await database.query(`
      UPDATE scheduled_posts SET status = 'failed' WHERE id = $1
    `, [postId]);
  }
}

// Helper function to execute Twitter post
async function executeTwitterPost(post) {
  try {
    logger.info(`Executing scheduled Twitter post for agent ${post.agent_id}`);
    
    // Get agent details
    const agentResult = await database.query(`
      SELECT id, name, user_id, personality_type, voice_tone, target_topics, platforms
      FROM ai_agents 
      WHERE id = $1
    `, [post.agent_id]);
    
    if (agentResult.rows.length === 0) {
      throw new Error('Agent not found');
    }
    
    const agent = agentResult.rows[0];
    
    // Check if user has Twitter connection
    const twitterConnection = await database.query(`
      SELECT username, connection_status, access_token, refresh_token
      FROM platform_connections 
      WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'
    `, [agent.user_id]);
    
    if (twitterConnection.rows.length === 0) {
      throw new Error('No active Twitter connection found');
    }
    
    const connection = twitterConnection.rows[0];
    
    // Generate fresh content using AI with company data
    const aiService = require('../services/AIContentService');
    
    logger.info(`Generating fresh content for scheduled Twitter post with company data`);
    
    const contentResult = await aiService.generateContent(agent, {
      content_type: 'tweet',
      topic: post.content_config?.topic || 'general',
      style: post.content_config?.style || 'engaging',
      length: 'medium',
      hashtags: true,
      emojis: true
    });
    
    // Extract content from the result
    let contentToPost;
    if (Array.isArray(contentResult.content)) {
      contentToPost = contentResult.content[0]?.content || contentResult.content[0] || 'Generated content';
    } else if (typeof contentResult.content === 'string') {
      contentToPost = contentResult.content;
    } else {
      contentToPost = contentResult.content?.content || 'Generated content';
    }
    
    logger.info(`Generated content for Twitter: ${contentToPost.substring(0, 100)}...`);
    
    // Post to Twitter using the existing Twitter posting logic
    const { TwitterApi } = require('twitter-api-v2');
    
    // Create Twitter client with stored tokens
    const twitterClient = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });
    
    // Refresh token if needed
    const { accessToken, refreshToken } = await twitterClient.refreshOAuth2Token(connection.refresh_token);
    
    // Update tokens in database
    await database.query(`
      UPDATE platform_connections 
      SET access_token = $1, refresh_token = $2, updated_at = NOW()
      WHERE user_id = $3 AND platform = 'twitter'
    `, [accessToken, refreshToken, agent.user_id]);
    
    // Create authenticated client
    const authenticatedClient = twitterClient.login(accessToken);
    
    // Post the tweet
    const tweetResult = await authenticatedClient.v2.tweet({
      text: contentToPost
    });
    
    logger.info(`Successfully posted scheduled Twitter post: Tweet ID ${tweetResult.data.id}`);
    
    return {
      success: true,
      tweetId: tweetResult.data.id,
      content: contentToPost
    };
    
  } catch (error) {
    logger.error(`Failed to execute scheduled Twitter post:`, error);
    throw error;
  }
}

// Helper function to execute Telegram post
async function executeTelegramPost(post) {
  try {
    logger.info(`Executing scheduled Telegram post for agent ${post.agent_id}`);
    
    // Get agent details
    const agentResult = await database.query(`
      SELECT id, name, user_id, personality_type, voice_tone, target_topics, platforms
      FROM ai_agents WHERE id = $1
    `, [post.agent_id]);
    
    if (agentResult.rows.length === 0) {
      throw new Error('Agent not found');
    }
    
    const agent = agentResult.rows[0];
    
    // Generate fresh content using AI with company data
    const aiService = require('../services/AIContentService');
    
    logger.info(`Generating fresh content for scheduled Telegram post with company data`);
    
    const contentResult = await aiService.generateContent(agent, {
      content_type: 'telegram',
      topic: post.content_config?.topic || 'general',
      style: post.content_config?.style || 'engaging',
      length: 'medium',
      hashtags: true,
      emojis: true
    });
    
    // Extract content from the result
    let contentToPost;
    if (Array.isArray(contentResult.content)) {
      contentToPost = contentResult.content[0]?.content || contentResult.content[0] || 'Generated content';
    } else if (typeof contentResult.content === 'string') {
      contentToPost = contentResult.content;
    } else {
      contentToPost = contentResult.content?.content || 'Generated content';
    }
    
    logger.info(`Generated content for Telegram: ${contentToPost.substring(0, 100)}...`);
    
    // Get agent's Telegram groups
    const groupsResult = await database.query(`
      SELECT chat_id, bot_token_encrypted, agent_id FROM telegram_groups 
      WHERE user_id = $1 AND agent_id = $2 AND is_active = true
      LIMIT 1
    `, [agent.user_id, agentId]);
    
    logger.info(`Found ${groupsResult.rows.length} Telegram groups for agent ${agent.name} (${agentId})`);
    
    if (groupsResult.rows.length === 0) {
      throw new Error(`No active Telegram groups found for agent ${agent.name}`);
    }
    
    const group = groupsResult.rows[0];
    logger.info(`Using Telegram group chat_id: ${group.chat_id} for agent: ${agent.name}`);
    
    // Post to Telegram using TelegramService with agent-specific bot
    const telegramService = require('../services/TelegramService');
    const result = await telegramService.postToTelegram(
      agent.user_id,
      group.chat_id,
      contentToPost,
      {
        contentType: post.content_type || 'message',
        agentId: agent.id
      }
    );
    
    logger.info(`Telegram post executed successfully:`, result);
    
  } catch (error) {
    logger.error(`Failed to execute Telegram post:`, error);
    throw error;
  }
}

// Helper function to update post execution
async function updatePostExecution(post) {
  const now = new Date();
  
  // Update run count and last run
  let nextRun = null;
  let status = 'completed';
  
  if (post.frequency !== 'once' && post.run_count < post.max_runs) {
    nextRun = calculateNextRun(post.scheduled_time, post.frequency, post.frequency_config);
    status = 'scheduled';
    
    // Schedule next run
    schedulePost({ ...post, next_run: nextRun });
  }
  
  await database.query(`
    UPDATE scheduled_posts 
    SET status = $1, last_run = $2, next_run = $3, run_count = run_count + 1
    WHERE id = $4
  `, [status, now, nextRun, post.id]);
}

// Debug endpoint to check scheduler status
router.get('/debug', authenticateToken, async (req, res) => {
  try {
    const schedulerStatus = schedulerService.getStatus();
    const scheduledPosts = await schedulerService.debugScheduledPosts();
    
    res.json({
      success: true,
      scheduler: schedulerStatus,
      posts: scheduledPosts
    });
  } catch (error) {
    logger.error('Failed to get debug info:', error);
    res.status(500).json({
      error: 'Failed to get debug info',
      details: error.message
    });
  }
});

module.exports = router;
