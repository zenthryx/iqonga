const express = require('express');
const router = express.Router();
const database = require('../database/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin, requireAdminPermission, logAdminAction, logSystemEvent } = require('../middleware/adminAuth');
const CreditService = require('../services/CreditService');

// Initialize credit service
const creditService = new CreditService();

// Apply authentication and admin checks to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Test route to verify admin routes are working
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Admin routes are working', admin: req.admin });
});

// GET /api/admin/dashboard - Get admin dashboard overview
router.get('/dashboard', async (req, res) => {
  logger.info('Admin dashboard route hit', { userId: req.user?.id, adminId: req.admin?.id });
  try {
    // Helper function to safely query with fallback
    const safeQuery = async (query, fallback = {}) => {
      try {
        const result = await database.query(query);
        return result.rows[0] || fallback;
      } catch (error) {
        logger.warn(`Dashboard query failed, using fallback: ${error.message}`);
        return fallback;
      }
    };

    const safeQueryArray = async (query, fallback = []) => {
      try {
        const result = await database.query(query);
        return result.rows || fallback;
      } catch (error) {
        logger.warn(`Dashboard query failed, using fallback: ${error.message}`);
        return fallback;
      }
    };

    // Get user statistics
    const userStats = await safeQuery(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_week,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_month,
        COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_users
      FROM users
    `, { total_users: 0, new_users_week: 0, new_users_month: 0, admin_users: 0 });

    // Get agent statistics
    const agentStats = await safeQuery(`
      SELECT 
        COUNT(*) as total_agents,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_agents_week,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_agents
      FROM ai_agents
    `, { total_agents: 0, new_agents_week: 0, active_agents: 0 });

    // Get content generation stats
    const contentStats = await safeQuery(`
      SELECT 
        COUNT(*) as total_content,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as content_week,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_content
      FROM generated_content
    `, { total_content: 0, content_week: 0, published_content: 0 });

    // Get credit statistics
    const creditStats = await safeQuery(`
      SELECT 
        COALESCE(SUM(credit_balance), 0) as total_credits,
        COALESCE(AVG(credit_balance), 0) as avg_credits_per_user,
        COUNT(CASE WHEN credit_balance = 0 THEN 1 END) as users_without_credits
      FROM user_credits
    `, { total_credits: 0, avg_credits_per_user: 0, users_without_credits: 0 });

    // Get scheduled posts statistics (table might not exist)
    const scheduledPostsStats = await safeQuery(`
      SELECT 
        COUNT(*) as total_scheduled_posts,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_posts,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_posts,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_posts,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_posts,
        COUNT(CASE WHEN platform = 'twitter' THEN 1 END) as twitter_posts,
        COUNT(CASE WHEN platform = 'telegram' THEN 1 END) as telegram_posts,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as posts_created_week,
        COUNT(CASE WHEN last_run >= NOW() - INTERVAL '24 hours' THEN 1 END) as posts_executed_24h
      FROM scheduled_posts
    `, {
      total_scheduled_posts: 0,
      active_posts: 0,
      running_posts: 0,
      failed_posts: 0,
      completed_posts: 0,
      twitter_posts: 0,
      telegram_posts: 0,
      posts_created_week: 0,
      posts_executed_24h: 0
    });

    // Get recent system logs (table might not exist)
    const recentLogs = await safeQueryArray(`
      SELECT level, category, message, created_at, user_id
      FROM system_logs 
      WHERE level IN ('error', 'warn')
      ORDER BY created_at DESC 
      LIMIT 10
    `, []);

    // Get open support tickets (table might not exist)
    const openTicketsResult = await safeQuery(`
      SELECT COUNT(*) as open_tickets
      FROM support_tickets 
      WHERE status IN ('open', 'in_progress')
    `, { open_tickets: 0 });

    res.json({
      success: true,
      data: {
        users: userStats,
        agents: agentStats,
        content: contentStats,
        credits: creditStats,
        scheduledPosts: scheduledPostsStats,
        recentLogs: recentLogs,
        openTickets: openTicketsResult.open_tickets || 0
      }
    });

  } catch (error) {
    logger.error('Admin dashboard error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to load dashboard data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/scheduled-posts - Get detailed scheduled posts information
router.get('/scheduled-posts', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status, platform } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [limit, offset];
    let paramIndex = 3;

    if (status) {
      whereClause += ` AND sp.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (platform) {
      whereClause += ` AND sp.platform = $${paramIndex}`;
      queryParams.push(platform);
      paramIndex++;
    }

    // Get detailed scheduled posts with user and agent info
    const postsQuery = `
      SELECT 
        sp.id, sp.platform, sp.status, sp.frequency, sp.max_runs, sp.run_count,
        sp.scheduled_time, sp.next_run, sp.last_run, sp.created_at,
        u.username, u.wallet_address,
        aa.name as agent_name, aa.personality_type
      FROM scheduled_posts sp
      JOIN users u ON sp.user_id = u.id
      JOIN ai_agents aa ON sp.agent_id = aa.id
      WHERE 1=1 ${whereClause}
      ORDER BY sp.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const posts = await database.query(postsQuery, queryParams);

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN platform = 'twitter' THEN 1 END) as twitter,
        COUNT(CASE WHEN platform = 'telegram' THEN 1 END) as telegram,
        COUNT(CASE WHEN last_run >= NOW() - INTERVAL '1 hour' THEN 1 END) as executed_last_hour,
        COUNT(CASE WHEN last_run >= NOW() - INTERVAL '24 hours' THEN 1 END) as executed_last_24h
      FROM scheduled_posts
    `;

    const summary = await database.query(summaryQuery);

    res.json({
      success: true,
      data: {
        posts: posts.rows,
        summary: summary.rows[0],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: summary.rows[0].total
        }
      }
    });

  } catch (error) {
    logger.error('Admin scheduled posts error:', error);
    res.status(500).json({ error: 'Failed to load scheduled posts data' });
  }
});

// GET /api/admin/users - Get all users with pagination
router.get('/users', requireAdminPermission('user_management'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', sortBy = 'created_at', sortOrder = 'desc' } = req.query;
    const offset = (page - 1) * limit;

    // Validate sortBy to prevent SQL injection
    const validSortColumns = ['id', 'username', 'wallet_address', 'email', 'role', 'created_at', 'updated_at'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    let whereClause = '';
    let queryParams = [limit, offset];

    if (search) {
      whereClause = `WHERE username ILIKE $3 OR wallet_address ILIKE $3`;
      queryParams.push(`%${search}%`);
    }

    // Use subqueries to get counts separately to avoid GROUP BY issues
    const usersQuery = `
      SELECT 
        u.id, u.username, u.wallet_address, u.email, u.role, u.is_admin,
        u.created_at, u.updated_at,
        COALESCE(uc.credit_balance, 0) as credit_balance,
        COALESCE(uc.debt_balance, 0) as debt_balance,
        COALESCE(agent_counts.agent_count, 0) as agent_count,
        COALESCE(content_counts.content_count, 0) as content_count
      FROM users u
      LEFT JOIN user_credits uc ON u.id = uc.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(DISTINCT id) as agent_count
        FROM ai_agents
        GROUP BY user_id
      ) agent_counts ON u.id = agent_counts.user_id
      LEFT JOIN (
        SELECT aa.user_id, COUNT(DISTINCT gc.id) as content_count
        FROM generated_content gc
        INNER JOIN ai_agents aa ON gc.agent_id = aa.id
        GROUP BY aa.user_id
      ) content_counts ON u.id = content_counts.user_id
      ${whereClause}
      ORDER BY u.${safeSortBy} ${safeSortOrder}
      LIMIT $1 OFFSET $2
    `;

    const users = await database.query(usersQuery, queryParams);

    // Get total count (with same WHERE clause logic)
    let countQuery = `SELECT COUNT(*) as total FROM users u`;
    let countParams = [];
    
    if (search) {
      countQuery += ` WHERE username ILIKE $1 OR wallet_address ILIKE $1`;
      countParams.push(`%${search}%`);
    }
    
    const count = await database.query(countQuery, countParams);

    // Get stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN u.is_admin = true THEN 1 END) as admin_users,
        COUNT(CASE WHEN uc.credit_balance > 0 OR uc.credit_balance IS NULL THEN 1 END) as active_users,
        COUNT(CASE WHEN uc.credit_balance = 0 OR uc.credit_balance IS NULL THEN 1 END) as users_without_credits
      FROM users u
      LEFT JOIN user_credits uc ON u.id = uc.user_id
    `;
    const stats = await database.query(statsQuery);

    res.json({
      success: true,
      data: {
        users: users.rows.map(user => ({
          ...user,
          total_agents: parseInt(user.agent_count) || 0,
          debt_balance: parseFloat(user.debt_balance) || 0
        })),
        stats: stats.rows[0] ? {
          total_users: parseInt(stats.rows[0].total_users) || 0,
          admin_users: parseInt(stats.rows[0].admin_users) || 0,
          active_users: parseInt(stats.rows[0].active_users) || 0,
          users_without_credits: parseInt(stats.rows[0].users_without_credits) || 0
        } : null,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(count.rows[0].total),
          pages: Math.ceil(count.rows[0].total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Admin users list error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/users/:id - Get specific user details
router.get('/users/:id', requireAdminPermission('user_management'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get user details
    const userResult = await database.query(`
      SELECT 
        u.*, uc.credit_balance, uc.total_credits_purchased
      FROM users u
      LEFT JOIN user_credits uc ON u.id = uc.user_id
      WHERE u.id = $1
    `, [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's agents
    const agentsResult = await database.query(`
      SELECT id, name, personality_type, platforms, is_active, created_at
      FROM ai_agents 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [id]);

    // Get user's recent content
    const contentResult = await database.query(`
      SELECT id, platform, content_type, content_text, status, created_at
      FROM generated_content 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [id]);

    // Get user's recent activity
    const activityResult = await database.query(`
      SELECT action_type, description, created_at
      FROM admin_actions 
      WHERE target_user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [id]);

    res.json({
      success: true,
      data: {
        user: userResult.rows[0],
        agents: agentsResult.rows,
        recentContent: contentResult.rows,
        recentActivity: activityResult.rows
      }
    });

  } catch (error) {
    logger.error('Admin user details error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// PUT /api/admin/users/:id/suspend - Suspend/unsuspend user
router.put('/users/:id/suspend', requireAdminPermission('user_management'), async (req, res) => {
  try {
    const { id } = req.params;
    const { suspended, reason } = req.body;

    // Update user status
    await database.query(`
      UPDATE users 
      SET is_suspended = $1, suspension_reason = $2, updated_at = NOW()
      WHERE id = $3
    `, [suspended, reason, id]);

    // Log admin action
    await logAdminAction(
      req.admin.id,
      'user_suspend',
      `User ${suspended ? 'suspended' : 'unsuspended'}: ${reason || 'No reason provided'}`,
      id,
      { suspended, reason }
    );

    res.json({
      success: true,
      message: `User ${suspended ? 'suspended' : 'unsuspended'} successfully`
    });

  } catch (error) {
    logger.error('Admin user suspend error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// PUT /api/admin/users/:id/credits - Adjust user credits
router.put('/users/:id/credits', requireAdminPermission('user_management'), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason, operation = 'add' } = req.body;

    console.log('Credit adjustment request:', { id, amount, reason, operation, body: req.body });

    if (!amount || !reason) {
      return res.status(400).json({ error: 'Amount and reason are required' });
    }

    // Get current credits
    const currentCredits = await database.query(`
      SELECT credit_balance FROM user_credits WHERE user_id = $1
    `, [id]);

    if (currentCredits.rows.length === 0) {
      return res.status(404).json({ error: 'User credits not found' });
    }

    const currentBalance = currentCredits.rows[0].credit_balance;
    const newBalance = operation === 'add' 
      ? currentBalance + parseInt(amount)
      : currentBalance - parseInt(amount);

    if (newBalance < 0) {
      return res.status(400).json({ error: 'Insufficient credits for this operation' });
    }

    // Update credits
    await database.query(`
      UPDATE user_credits 
      SET credit_balance = $1, updated_at = NOW()
      WHERE user_id = $2
    `, [newBalance, id]);

    // Log admin action
    await logAdminAction(
      req.admin.id,
      'credit_adjust',
      `Credits ${operation}ed: ${amount}. Reason: ${reason}`,
      id,
      { amount: parseInt(amount), operation, reason, oldBalance: currentBalance, newBalance }
    );

    res.json({
      success: true,
      message: `Credits ${operation}ed successfully`,
      data: {
        oldBalance: currentBalance,
        newBalance: newBalance,
        change: operation === 'add' ? parseInt(amount) : -parseInt(amount)
      }
    });

  } catch (error) {
    logger.error('Admin credit adjustment error:', error);
    res.status(500).json({ error: 'Failed to adjust credits' });
  }
});

// GET /api/admin/logs - Get system logs
router.get('/logs', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    const { page = 1, limit = 50, level = '', category = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [limit, offset];

    if (level || category) {
      const conditions = [];
      if (level) {
        conditions.push(`level = $${queryParams.length + 1}`);
        queryParams.push(level);
      }
      if (category) {
        conditions.push(`category = $${queryParams.length + 1}`);
        queryParams.push(category);
      }
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    const logsQuery = `
      SELECT id, level, category, message, user_id, created_at, metadata
      FROM system_logs 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const logs = await database.query(logsQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM system_logs 
      ${whereClause}
    `;
    const countParams = queryParams.slice(2); // Remove limit and offset
    const count = await database.query(countQuery, countParams);

    res.json({
      success: true,
      data: {
        logs: logs.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(count.rows[0].total),
          pages: Math.ceil(count.rows[0].total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Admin logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// GET /api/admin/actions - Get admin actions log
router.get('/actions', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const actionsQuery = `
      SELECT 
        aa.*,
        admin_user.username as admin_username,
        target_user.username as target_username
      FROM admin_actions aa
      LEFT JOIN users admin_user ON aa.admin_user_id = admin_user.id
      LEFT JOIN users target_user ON aa.target_user_id = target_user.id
      ORDER BY aa.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const actions = await database.query(actionsQuery, [limit, offset]);

    // Get total count
    const count = await database.query('SELECT COUNT(*) as total FROM admin_actions');

    res.json({
      success: true,
      data: {
        actions: actions.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(count.rows[0].total),
          pages: Math.ceil(count.rows[0].total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Admin actions error:', error);
    res.status(500).json({ error: 'Failed to fetch admin actions' });
  }
});

// POST /api/admin/debt/adjust - Adjust user debt
router.post('/debt/adjust', requireAdminPermission('user_management'), async (req, res) => {
  try {
    const { userId, adjustmentType, amount, reason } = req.body;
    const adminId = req.user.id;

    if (!userId || !adjustmentType || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['wipe', 'reduce', 'increase', 'set'].includes(adjustmentType)) {
      return res.status(400).json({ error: 'Invalid adjustment type' });
    }

    if (adjustmentType !== 'wipe' && (!amount || amount < 0)) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const result = await creditService.adminAdjustDebt(userId, adjustmentType, amount, reason, adminId);
    
    res.json({
      success: true,
      message: 'Debt adjusted successfully',
      data: result
    });

  } catch (error) {
    console.error('Error adjusting debt:', error);
    res.status(500).json({ 
      error: 'Failed to adjust debt',
      details: error.message 
    });
  }
});

// POST /api/admin/credits/add - Add credits to user account
router.post('/credits/add', requireAdminPermission('user_management'), async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    const adminId = req.user.id;

    if (!userId || !amount || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const result = await creditService.adminAddCredits(userId, amount, reason, adminId);
    
    res.json({
      success: true,
      message: 'Credits added successfully',
      data: result
    });

  } catch (error) {
    console.error('Error adding credits:', error);
    res.status(500).json({ 
      error: 'Failed to add credits',
      details: error.message 
    });
  }
});

// POST /api/admin/credits/deduct - Deduct credits from user account
router.post('/credits/deduct', requireAdminPermission('user_management'), async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    const adminId = req.user.id;

    if (!userId || !amount || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const result = await creditService.adminDeductCredits(userId, amount, reason, adminId);
    
    res.json({
      success: true,
      message: 'Credits deducted successfully',
      data: result
    });

  } catch (error) {
    console.error('Error deducting credits:', error);
    res.status(500).json({ 
      error: 'Failed to deduct credits',
      details: error.message 
    });
  }
});

// GET /api/admin/user/:userId/credits - Get user credit details
router.get('/user/:userId/credits', requireAdminPermission('user_management'), async (req, res) => {
  try {
    const { userId } = req.params;

    const userResult = await database.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const creditsResult = await database.query(
      'SELECT * FROM user_credits WHERE user_id = $1',
      [userId]
    );

    const transactionsResult = await database.query(
      `SELECT * FROM credit_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        user: userResult.rows[0],
        credits: creditsResult.rows[0] || null,
        recentTransactions: transactionsResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching user credits:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user credits',
      details: error.message 
    });
  }
});

// GET /api/admin/content - Get all generated content across platform
router.get('/content', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    const { page = 1, limit = 50, type, status } = req.query;
    const offset = (page - 1) * limit;

    // Get content from all tables
    const contentQueries = [];

    // Images
    const imagesQuery = `
      SELECT 
        gi.id, 'image' as type, gi.user_id, u.username, aa.name as agent_name,
        gi.prompt, NULL as content, gi.image_url as url, 'completed' as status,
        gi.provider, gi.created_at
      FROM generated_images gi
      LEFT JOIN users u ON gi.user_id = u.id
      LEFT JOIN ai_agents aa ON gi.agent_id = aa.id
      ${type === 'image' || !type ? '' : 'WHERE 1=0'}
      ORDER BY gi.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    contentQueries.push(database.query(imagesQuery, [limit, offset]));

    // Videos
    const videosQuery = `
      SELECT 
        gv.id, 'video' as type, gv.user_id, u.username, aa.name as agent_name,
        gv.prompt, NULL as content, gv.video_url as url, gv.status,
        gv.provider, gv.created_at
      FROM generated_videos gv
      LEFT JOIN users u ON gv.user_id = u.id
      LEFT JOIN ai_agents aa ON gv.agent_id = aa.id
      ${type === 'video' || !type ? '' : 'WHERE 1=0'}
      ORDER BY gv.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    contentQueries.push(database.query(videosQuery, [limit, offset]));

    // Music
    const musicQuery = `
      SELECT 
        gm.id, 'music' as type, gm.user_id, u.username, aa.name as agent_name,
        gm.prompt, NULL as content, gm.audio_url as url, 'completed' as status,
        gm.provider, gm.created_at
      FROM generated_music gm
      LEFT JOIN users u ON gm.user_id = u.id
      LEFT JOIN ai_agents aa ON gm.agent_id = aa.id
      ${type === 'music' || !type ? '' : 'WHERE 1=0'}
      ORDER BY gm.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    contentQueries.push(database.query(musicQuery, [limit, offset]));

    // Lyrics
    const lyricsQuery = `
      SELECT 
        gl.id, 'lyrics' as type, gl.user_id, u.username, aa.name as agent_name,
        gl.topic as prompt, gl.lyrics as content, NULL as url, 'completed' as status,
        'ai' as provider, gl.created_at
      FROM generated_lyrics gl
      LEFT JOIN users u ON gl.user_id = u.id
      LEFT JOIN ai_agents aa ON gl.agent_id = aa.id
      ${type === 'lyrics' || !type ? '' : 'WHERE 1=0'}
      ORDER BY gl.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    contentQueries.push(database.query(lyricsQuery, [limit, offset]));

    // Text content
    const textQuery = `
      SELECT 
        gc.id, 'text' as type, gc.user_id, u.username, aa.name as agent_name,
        gc.content_text as prompt, gc.content_text as content, NULL as url, gc.status,
        'ai' as provider, gc.created_at
      FROM generated_content gc
      LEFT JOIN users u ON gc.user_id = u.id
      LEFT JOIN ai_agents aa ON gc.agent_id = aa.id
      ${type === 'text' || !type ? '' : 'WHERE 1=0'}
      ORDER BY gc.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    contentQueries.push(database.query(textQuery, [limit, offset]));

    const results = await Promise.all(contentQueries);
    
    // Combine and sort all content
    let allContent = [];
    results.forEach(result => {
      if (result.rows) {
        allContent = allContent.concat(result.rows);
      }
    });

    // Sort by created_at descending
    allContent.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Apply status filter if provided
    if (status && status !== 'all') {
      allContent = allContent.filter(item => item.status === status);
    }

    // Get stats
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM generated_images) as images,
        (SELECT COUNT(*) FROM generated_videos) as videos,
        (SELECT COUNT(*) FROM generated_music) as music,
        (SELECT COUNT(*) FROM generated_lyrics) as lyrics,
        (SELECT COUNT(*) FROM generated_content) as text_content
    `;
    const statsResult = await database.query(statsQuery);

    const stats = statsResult.rows[0] ? {
      images: parseInt(statsResult.rows[0].images) || 0,
      videos: parseInt(statsResult.rows[0].videos) || 0,
      music: parseInt(statsResult.rows[0].music) || 0,
      lyrics: parseInt(statsResult.rows[0].lyrics) || 0,
      text_content: parseInt(statsResult.rows[0].text_content) || 0,
      total_content: (parseInt(statsResult.rows[0].images) || 0) +
                     (parseInt(statsResult.rows[0].videos) || 0) +
                     (parseInt(statsResult.rows[0].music) || 0) +
                     (parseInt(statsResult.rows[0].lyrics) || 0) +
                     (parseInt(statsResult.rows[0].text_content) || 0)
    } : null;

    res.json({
      success: true,
      data: {
        content: allContent.slice(0, limit),
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: allContent.length
        }
      }
    });

  } catch (error) {
    logger.error('Admin content error:', error);
    res.status(500).json({ error: 'Failed to load content data' });
  }
});

// GET /api/admin/agents - Get all agents across platform
router.get('/agents', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const agentsQuery = `
      SELECT 
        aa.id, aa.name, aa.user_id, u.username, aa.personality_type,
        aa.platforms, aa.is_active, aa.created_at,
        COUNT(DISTINCT gc.id) as content_count
      FROM ai_agents aa
      LEFT JOIN users u ON aa.user_id = u.id
      LEFT JOIN generated_content gc ON aa.id = gc.agent_id
      GROUP BY aa.id, u.username
      ORDER BY aa.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const agents = await database.query(agentsQuery, [limit, offset]);

    // Get stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_agents,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_agents,
        COUNT(DISTINCT user_id) as total_users
      FROM ai_agents
    `;
    const stats = await database.query(statsQuery);

    res.json({
      success: true,
      data: {
        agents: agents.rows.map(agent => ({
          ...agent,
          platforms: typeof agent.platforms === 'string' 
            ? (agent.platforms.startsWith('[') ? JSON.parse(agent.platforms) : agent.platforms.split(','))
            : agent.platforms || [],
          content_count: parseInt(agent.content_count) || 0
        })),
        stats: stats.rows[0] ? {
          total_agents: parseInt(stats.rows[0].total_agents) || 0,
          active_agents: parseInt(stats.rows[0].active_agents) || 0,
          total_users: parseInt(stats.rows[0].total_users) || 0
        } : null,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Admin agents error:', error);
    res.status(500).json({ error: 'Failed to load agents data' });
  }
});

// GET /api/admin/credit-transactions - Get all credit transactions
router.get('/credit-transactions', requireAdminPermission('user_management'), async (req, res) => {
  try {
    const { page = 1, limit = 100, type } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [limit, offset];
    
    if (type && type !== 'all') {
      whereClause = 'WHERE transaction_type = $3';
      queryParams.push(type);
    }

    const transactionsQuery = `
      SELECT 
        ct.*, u.username
      FROM credit_transactions ct
      LEFT JOIN users u ON ct.user_id = u.id
      ${whereClause}
      ORDER BY ct.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const transactions = await database.query(transactionsQuery, queryParams);

    // Get stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN transaction_type IN ('purchase', 'refund', 'bonus') THEN amount ELSE 0 END) as total_purchased,
        SUM(CASE WHEN transaction_type = 'deduct' THEN amount ELSE 0 END) as total_deducted
      FROM credit_transactions
    `;
    const stats = await database.query(statsQuery);

    res.json({
      success: true,
      data: {
        transactions: transactions.rows,
        stats: stats.rows[0] || null,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Admin credit transactions error:', error);
    res.status(500).json({ error: 'Failed to load credit transactions' });
  }
});

// GET /api/admin/api-usage - Get API usage statistics
router.get('/api-usage', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    
    // Calculate date range
    let dateFilter = '';
    if (range === '24h') {
      dateFilter = "WHERE created_at >= NOW() - INTERVAL '24 hours'";
    } else if (range === '7d') {
      dateFilter = "WHERE created_at >= NOW() - INTERVAL '7 days'";
    } else if (range === '30d') {
      dateFilter = "WHERE created_at >= NOW() - INTERVAL '30 days'";
    } else if (range === '90d') {
      dateFilter = "WHERE created_at >= NOW() - INTERVAL '90 days'";
    }

    // This is a placeholder - you'll need to create an api_usage_logs table or track this in system_logs
    // For now, return mock data structure
    const usage = [
      { provider: 'openai', total_requests: 0, successful_requests: 0, failed_requests: 0, total_cost: 0, avg_response_time: 0, last_used: new Date().toISOString() },
      { provider: 'runway', total_requests: 0, successful_requests: 0, failed_requests: 0, total_cost: 0, avg_response_time: 0, last_used: new Date().toISOString() },
      { provider: 'veo', total_requests: 0, successful_requests: 0, failed_requests: 0, total_cost: 0, avg_response_time: 0, last_used: new Date().toISOString() },
      { provider: 'heygen', total_requests: 0, successful_requests: 0, failed_requests: 0, total_cost: 0, avg_response_time: 0, last_used: new Date().toISOString() }
    ];

    const stats = {
      total_requests: 0,
      successful_requests: 0,
      total_cost: 0,
      avg_response_time: 0
    };

    res.json({
      success: true,
      data: {
        usage,
        stats
      }
    });

  } catch (error) {
    logger.error('Admin API usage error:', error);
    res.status(500).json({ error: 'Failed to load API usage data' });
  }
});

// GET /api/admin/integrations - Get all platform integrations
router.get('/integrations', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    // Get platform connections
    const connectionsQuery = `
      SELECT 
        pc.id, pc.user_id, u.username, pc.platform, pc.connection_status as status,
        pc.connected_at, pc.last_sync_at as last_sync, pc.metadata
      FROM platform_connections pc
      LEFT JOIN users u ON pc.user_id = u.id
      ORDER BY pc.connected_at DESC
    `;

    const connections = await database.query(connectionsQuery);

    // Get stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_integrations,
        COUNT(CASE WHEN connection_status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN connection_status = 'error' THEN 1 END) as errors,
        COUNT(DISTINCT user_id) as unique_users
      FROM platform_connections
    `;
    const stats = await database.query(statsQuery);

    res.json({
      success: true,
      data: {
        integrations: connections.rows.map(conn => ({
          id: conn.id,
          user_id: conn.user_id,
          username: conn.username,
          platform: conn.platform,
          status: conn.status || 'inactive',
          connected_at: conn.connected_at,
          last_sync: conn.last_sync,
          metadata: conn.metadata
        })),
        stats: stats.rows[0] || null
      }
    });

  } catch (error) {
    logger.error('Admin integrations error:', error);
    res.status(500).json({ error: 'Failed to load integrations' });
  }
});

// POST /api/admin/bulk-operations - Execute bulk operations
router.post('/bulk-operations', requireAdminPermission('user_management'), async (req, res) => {
  try {
    const { operation, user_ids, amount, reason } = req.body;

    if (!operation || !user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'Invalid operation parameters' });
    }

    const results = {
      total: user_ids.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const userId of user_ids) {
      try {
        if (operation === 'credits') {
          if (!amount || !reason) {
            results.failed++;
            results.errors.push(`User ${userId}: Missing amount or reason`);
            continue;
          }

          const currentCredits = await database.query(
            'SELECT credit_balance FROM user_credits WHERE user_id = $1',
            [userId]
          );

          if (currentCredits.rows.length === 0) {
            results.failed++;
            results.errors.push(`User ${userId}: Credit account not found`);
            continue;
          }

          const newBalance = currentCredits.rows[0].credit_balance + parseInt(amount);
          await database.query(
            'UPDATE user_credits SET credit_balance = $1 WHERE user_id = $2',
            [newBalance, userId]
          );

          await database.query(
            `INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_before, balance_after, description)
             VALUES ($1, 'bonus', $2, $3, $4, $5)`,
            [userId, parseInt(amount), currentCredits.rows[0].credit_balance, newBalance, `Bulk operation: ${reason}`]
          );

        } else if (operation === 'suspend') {
          await database.query(
            'UPDATE users SET suspended = true WHERE id = $1',
            [userId]
          );
        } else if (operation === 'activate') {
          await database.query(
            'UPDATE users SET suspended = false WHERE id = $1',
            [userId]
          );
        }

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`User ${userId}: ${error.message}`);
      }
    }

    await logAdminAction(
      req.admin.id,
      'bulk_operation',
      `Bulk ${operation} on ${user_ids.length} users`,
      null,
      { operation, user_count: user_ids.length, results }
    );

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('Bulk operation error:', error);
    res.status(500).json({ error: 'Failed to execute bulk operation' });
  }
});

// POST /api/admin/reports/generate - Generate report
router.post('/reports/generate', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    const { report_type, date_range, format = 'csv' } = req.body;

    // This is a placeholder - implement actual report generation
    // For now, return a simple response
    res.json({
      success: true,
      message: 'Report generation feature coming soon',
      data: {
        report_type,
        date_range,
        format,
        note: 'Report generation will be implemented with actual data export functionality'
      }
    });

  } catch (error) {
    logger.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /api/admin/system-config - Get system configuration
router.get('/system-config', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    // Feature flags - placeholder structure
    const features = [
      { key: 'video_generation', name: 'Video Generation', description: 'Enable video generation features', enabled: true, category: 'Content' },
      { key: 'music_generation', name: 'Music Generation', description: 'Enable music generation features', enabled: true, category: 'Content' },
      { key: 'heygen_avatars', name: 'HeyGen Avatars', description: 'Enable HeyGen avatar video features', enabled: true, category: 'Content' },
      { key: 'wordpress_plugin', name: 'WordPress Plugin', description: 'Enable WordPress plugin features', enabled: true, category: 'Integrations' },
      { key: 'discord_bot', name: 'Discord Bot', description: 'Enable Discord bot features', enabled: true, category: 'Integrations' },
      { key: 'maintenance_mode', name: 'Maintenance Mode', description: 'Enable maintenance mode', enabled: false, category: 'System' }
    ];

    // System settings from system_config
    const configRows = await database.query(`
      SELECT config_key, config_value FROM system_config
      WHERE config_key IN ('default_credits', 'maintenance_mode', 'maintenance_message', 'agent_forum_engagement_interval_minutes')
    `);
    const configMap = {};
    configRows.rows.forEach(row => {
      configMap[row.config_key] = row.config_value;
    });
    const settings = {
      default_credits: parseInt(configMap.default_credits, 10) || 100,
      maintenance_mode: configMap.maintenance_mode === 'true',
      maintenance_message: configMap.maintenance_message || '',
      agent_forum_engagement_interval_minutes: Math.max(1, parseInt(configMap.agent_forum_engagement_interval_minutes, 10) || 5)
    };

    res.json({
      success: true,
      data: {
        features,
        settings
      }
    });

  } catch (error) {
    logger.error('System config error:', error);
    res.status(500).json({ error: 'Failed to load system configuration' });
  }
});

// PUT /api/admin/system-config/features - Update feature flag
router.put('/system-config/features', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    const { key, enabled } = req.body;

    // This would update a feature_flags table in production
    // For now, just log the action
    await logAdminAction(
      req.admin.id,
      'feature_toggle',
      `Feature ${key} ${enabled ? 'enabled' : 'disabled'}`,
      null,
      { key, enabled }
    );

    res.json({
      success: true,
      message: `Feature ${enabled ? 'enabled' : 'disabled'} successfully`
    });

  } catch (error) {
    logger.error('Feature toggle error:', error);
    res.status(500).json({ error: 'Failed to update feature' });
  }
});

// PUT /api/admin/system-config/settings - Update system setting
router.put('/system-config/settings', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    const { key, value } = req.body;

    // Update system_config table
    await database.query(`
      INSERT INTO system_config (config_key, config_value, description, updated_at)
      VALUES ($1, $2, 'System setting', NOW())
      ON CONFLICT (config_key) 
      DO UPDATE SET config_value = $2, updated_at = NOW()
    `, [key, String(value)]);

    await logAdminAction(
      req.admin.id,
      'setting_update',
      `Setting ${key} updated to ${value}`,
      null,
      { key, value }
    );

    res.json({
      success: true,
      message: 'Setting updated successfully'
    });

  } catch (error) {
    logger.error('Setting update error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// GET /api/admin/write-operations - Get write operations settings
router.get('/write-operations', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    const result = await database.query(`
      SELECT config_key, config_value, description
      FROM system_config 
      WHERE config_key LIKE 'write_operations_%'
      ORDER BY config_key
    `);

    const settings = {
      allEnabled: true,
      postsEnabled: true,
      repliesEnabled: false,
      engagementEnabled: false,
      mentionsEnabled: false
    };

    result.rows.forEach(row => {
      const value = row.config_value === 'true' || row.config_value === true;
      switch (row.config_key) {
        case 'write_operations_enabled':
          settings.allEnabled = value;
          break;
        case 'write_operations_posts_enabled':
          settings.postsEnabled = value;
          break;
        case 'write_operations_replies_enabled':
          settings.repliesEnabled = value;
          break;
        case 'write_operations_engagement_enabled':
          settings.engagementEnabled = value;
          break;
        case 'write_operations_mentions_enabled':
          settings.mentionsEnabled = value;
          break;
      }
    });

    res.json({
      success: true,
      data: {
        settings: {
          allEnabled: settings.allEnabled,
          postsEnabled: settings.postsEnabled,
          repliesEnabled: settings.repliesEnabled,
          engagementEnabled: settings.engagementEnabled,
          mentionsEnabled: settings.mentionsEnabled
        },
        descriptions: {
          allEnabled: 'Master switch - disables all write operations if false',
          postsEnabled: 'Allow scheduled posts to be published',
          repliesEnabled: 'Allow replies to tweets/mentions',
          engagementEnabled: 'Allow topic-based engagement (replies to relevant tweets)',
          mentionsEnabled: 'Allow replies to mentions'
        }
      }
    });
  } catch (error) {
    logger.error('Error getting write operations settings:', error);
    res.status(500).json({ error: 'Failed to get write operations settings' });
  }
});

// PUT /api/admin/write-operations - Update write operations settings
router.put('/write-operations', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    const { allEnabled, postsEnabled, repliesEnabled, engagementEnabled, mentionsEnabled } = req.body;

    const updates = [];
    if (allEnabled !== undefined) {
      await database.query(`
        INSERT INTO system_config (config_key, config_value, description, updated_at)
        VALUES ('write_operations_enabled', $1, 'Master switch for all write operations', NOW())
        ON CONFLICT (config_key) DO UPDATE SET config_value = $1, updated_at = NOW()
      `, [String(allEnabled)]);
      updates.push(`allEnabled: ${allEnabled}`);
    }

    if (postsEnabled !== undefined) {
      await database.query(`
        INSERT INTO system_config (config_key, config_value, description, updated_at)
        VALUES ('write_operations_posts_enabled', $1, 'Allow scheduled posts', NOW())
        ON CONFLICT (config_key) DO UPDATE SET config_value = $1, updated_at = NOW()
      `, [String(postsEnabled)]);
      updates.push(`postsEnabled: ${postsEnabled}`);
    }

    if (repliesEnabled !== undefined) {
      await database.query(`
        INSERT INTO system_config (config_key, config_value, description, updated_at)
        VALUES ('write_operations_replies_enabled', $1, 'Allow replies', NOW())
        ON CONFLICT (config_key) DO UPDATE SET config_value = $1, updated_at = NOW()
      `, [String(repliesEnabled)]);
      updates.push(`repliesEnabled: ${repliesEnabled}`);
    }

    if (engagementEnabled !== undefined) {
      await database.query(`
        INSERT INTO system_config (config_key, config_value, description, updated_at)
        VALUES ('write_operations_engagement_enabled', $1, 'Allow topic-based engagement', NOW())
        ON CONFLICT (config_key) DO UPDATE SET config_value = $1, updated_at = NOW()
      `, [String(engagementEnabled)]);
      updates.push(`engagementEnabled: ${engagementEnabled}`);
    }

    if (mentionsEnabled !== undefined) {
      await database.query(`
        INSERT INTO system_config (config_key, config_value, description, updated_at)
        VALUES ('write_operations_mentions_enabled', $1, 'Allow replies to mentions', NOW())
        ON CONFLICT (config_key) DO UPDATE SET config_value = $1, updated_at = NOW()
      `, [String(mentionsEnabled)]);
      updates.push(`mentionsEnabled: ${mentionsEnabled}`);
    }

    await logAdminAction(
      req.admin.id,
      'write_operations_update',
      `Write operations settings updated: ${updates.join(', ')}`,
      null,
      { allEnabled, postsEnabled, repliesEnabled, engagementEnabled, mentionsEnabled }
    );

    // Clear cache in WriteOperationsService
    const WriteOperationsService = require('../services/WriteOperationsService');
    WriteOperationsService.clearCache();

    res.json({
      success: true,
      message: 'Write operations settings updated successfully',
      updates: updates
    });
  } catch (error) {
    logger.error('Error updating write operations settings:', error);
    res.status(500).json({ error: 'Failed to update write operations settings' });
  }
});

// GET /api/admin/rate-limits - Get rate limit configuration
router.get('/rate-limits', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    // Placeholder - return default rate limits
    const rateLimits = [
      { endpoint: '/api/content/videos/generate', method: 'POST', limit: 10, window: 60, current_usage: 3, blocked_requests: 0 },
      { endpoint: '/api/content/ai/images/generate', method: 'POST', limit: 20, window: 60, current_usage: 8, blocked_requests: 0 },
      { endpoint: '/api/content/ai/music/generate', method: 'POST', limit: 5, window: 60, current_usage: 1, blocked_requests: 0 },
      { endpoint: '/api/admin/*', method: 'ALL', limit: 100, window: 900, current_usage: 45, blocked_requests: 0 }
    ];

    res.json({
      success: true,
      data: {
        rate_limits: rateLimits
      }
    });

  } catch (error) {
    logger.error('Rate limits error:', error);
    res.status(500).json({ error: 'Failed to load rate limits' });
  }
});

// PUT /api/admin/rate-limits - Update rate limit
router.put('/rate-limits', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    const { endpoint, limit, window } = req.body;

    // This would update rate limit configuration in production
    await logAdminAction(
      req.admin.id,
      'rate_limit_update',
      `Rate limit updated for ${endpoint}`,
      null,
      { endpoint, limit, window }
    );

    res.json({
      success: true,
      message: 'Rate limit updated successfully'
    });

  } catch (error) {
    logger.error('Rate limit update error:', error);
    res.status(500).json({ error: 'Failed to update rate limit' });
  }
});

// GET /api/admin/service-pricing - Get all service pricing
router.get('/service-pricing', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    // Initialize table if needed
    await ServicePricingService.initializePricingTable();
    
    // Get pricing from database
    let pricing = [];
    
    try {
      const result = await database.query(`
        SELECT service_key, service_name, category, credit_cost, billing_unit, rate, description
        FROM service_pricing
        ORDER BY category, service_name
      `);
      pricing = result.rows;
    } catch (error) {
      // Table doesn't exist yet, return default pricing structure
      logger.warn('service_pricing table not found, using defaults');
      pricing = getDefaultServicePricing();
    }

    // If no pricing in database, return defaults
    if (pricing.length === 0) {
      pricing = getDefaultServicePricing();
    }

    res.json({
      success: true,
      data: {
        pricing
      }
    });

  } catch (error) {
    logger.error('Service pricing error:', error);
    res.status(500).json({ error: 'Failed to load service pricing' });
  }
});

// PUT /api/admin/service-pricing - Update service pricing
router.put('/service-pricing', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    const { service_key, credit_cost, billing_unit, rate } = req.body;

    if (!service_key || credit_cost === undefined || credit_cost < 0) {
      return res.status(400).json({ error: 'Invalid pricing data' });
    }

    // Validate billing_unit if provided
    const validBillingUnits = ['flat', 'second', 'minute'];
    const finalBillingUnit = billing_unit && validBillingUnits.includes(billing_unit) 
      ? billing_unit 
      : 'flat';
    
    // For non-flat billing, rate is required
    const finalRate = finalBillingUnit === 'flat' 
      ? (rate !== undefined ? parseFloat(rate) : credit_cost)
      : (rate !== undefined ? parseFloat(rate) : credit_cost);

    // Ensure table exists and is migrated (adds missing columns if needed)
    await ServicePricingService.initializePricingTable();

    // Get service info from defaults or database
    const defaults = getDefaultServicePricing();
    let defaultService = defaults.find(s => s.service_key === service_key);
    
    // If not in defaults, check if it exists in database
    if (!defaultService) {
      const existingService = await database.query(
        'SELECT service_key, service_name, category, description FROM service_pricing WHERE service_key = $1',
        [service_key]
      );
      
      if (existingService.rows.length > 0) {
        const existing = existingService.rows[0];
        defaultService = {
          service_key: existing.service_key,
          service_name: existing.service_name,
          category: existing.category,
          description: existing.description || ''
        };
      } else {
        return res.status(400).json({ error: 'Invalid service key' });
      }
    }

    // Update or insert pricing
    await database.query(`
      INSERT INTO service_pricing (service_key, service_name, category, credit_cost, billing_unit, rate, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (service_key) 
      DO UPDATE SET 
        credit_cost = $4, 
        billing_unit = $5,
        rate = $6,
        updated_at = NOW()
    `, [
      service_key, 
      defaultService.service_name, 
      defaultService.category, 
      credit_cost,
      finalBillingUnit,
      finalRate,
      defaultService.description || ''
    ]);

    // Clear pricing cache
    ServicePricingService.clearCache();

    await logAdminAction(
      req.admin.id,
      'pricing_update',
      `Updated pricing for ${service_key}: ${credit_cost} credits (${finalBillingUnit === 'flat' ? 'flat' : `${finalRate} credits/${finalBillingUnit}`})`,
      null,
      { service_key, credit_cost, billing_unit: finalBillingUnit, rate: finalRate }
    );

    res.json({
      success: true,
      message: 'Pricing updated successfully'
    });

  } catch (error) {
    logger.error('Service pricing update error:', error);
    res.status(500).json({ error: 'Failed to update service pricing' });
  }
});

const ServicePricingService = require('../services/ServicePricingService');

// Helper function to get default service pricing
function getDefaultServicePricing() {
  const defaults = ServicePricingService.getDefaultPricing();
  const formatService = (key, name, category, desc) => {
    const pricing = defaults[key];
    if (typeof pricing === 'object' && pricing.cost !== undefined) {
      return {
        service_key: key,
        service_name: name,
        category: category,
        credit_cost: pricing.cost,
        billing_unit: pricing.billing_unit || 'flat',
        rate: pricing.rate || pricing.cost,
        description: desc
      };
    }
    return {
      service_key: key,
      service_name: name,
      category: category,
      credit_cost: pricing || 0,
      billing_unit: 'flat',
      rate: pricing || 0,
      description: desc
    };
  };
  
  return [
    formatService('content_generation_post', 'Content Generation (Post)', 'Content', 'Generate social media posts'),
    formatService('content_generation_reply', 'Content Generation (Reply)', 'Content', 'Generate reply content'),
    formatService('image_generation', 'Image Generation', 'Media', 'Generate images with DALL-E'),
    formatService('video_generation_script', 'Video Script Generation', 'Media', 'Generate video script and storyboard'),
    formatService('video_generation_actual', 'Video Generation (Actual)', 'Media', 'Generate actual video with Runway/Veo'),
    formatService('video_generation_extension', 'Video Extension', 'Media', 'Extend existing video'),
    formatService('video_generation_ingredients', 'Video from Ingredients', 'Media', 'Generate video from reference images'),
    formatService('video_generation_frames', 'Video from Frames', 'Media', 'Generate video between two frames'),
    formatService('music_generation', 'Music Generation', 'Media', 'Generate music tracks'),
    formatService('lyrics_generation', 'Lyrics Generation', 'Media', 'Generate song lyrics'),
    formatService('music_video_generation', 'Music Video Generation', 'Media', 'Generate music videos with lip-sync'),
    formatService('heygen_text_to_avatar', 'HeyGen Text-to-Avatar', 'Media', 'Generate avatar video from text script'),
    formatService('heygen_audio_lip_sync', 'HeyGen Audio Lip-Sync', 'Media', 'Generate avatar video with audio lip-sync'),
    formatService('heygen_video_translation_fast', 'HeyGen Video Translation (Fast)', 'Media', 'Translate video with lip-sync (fast mode, per minute)'),
    formatService('heygen_video_translation_quality', 'HeyGen Video Translation (Quality)', 'Media', 'Translate video with lip-sync (quality mode, per minute)'),
    formatService('veo_video_generation', 'Veo Video Generation (Fast)', 'Media', 'Generate video with Veo 3.1 Fast (per second)'),
    formatService('veo_video_generation_standard', 'Veo Video Generation (Standard)', 'Media', 'Generate video with Veo 3/3.1 Standard (per second)'),
    // Gmail Integration Services
    formatService('gmail_categorize', 'Gmail AI Categorization', 'Integration', 'AI-powered email categorization'),
    formatService('gmail_summarize', 'Gmail AI Summarization', 'Integration', 'AI-powered email summarization'),
    formatService('gmail_draft_reply', 'Gmail AI Draft Reply', 'Integration', 'AI-generated email draft replies'),
    formatService('gmail_spam_check', 'Gmail AI Spam Detection', 'Integration', 'AI-powered spam detection'),
    formatService('gmail_sync', 'Gmail Email Sync', 'Integration', 'Sync emails from Gmail (per sync operation)'),
    // Calendar Integration Services
    formatService('calendar_create_event', 'Calendar Create Event', 'Integration', 'Create a new calendar event'),
    formatService('calendar_update_event', 'Calendar Update Event', 'Integration', 'Update an existing calendar event'),
    formatService('calendar_delete_event', 'Calendar Delete Event', 'Integration', 'Delete a calendar event'),
    formatService('calendar_meeting_prep', 'Calendar AI Meeting Prep', 'Integration', 'AI-powered meeting preparation and insights'),
    formatService('calendar_sync', 'Calendar Event Sync', 'Integration', 'Sync calendar events (per sync operation)'),
    // Long-form Content Services
    formatService('long_form_content', 'Long-form Content Generation', 'Content', 'Generate long-form content (blogs, newsletters, articles, whitepapers, etc.)'),
    // Creative Writing Services
    formatService('creative_writing', 'Creative Writing Generation', 'Content', 'Generate creative writing (stories, poems, books, screenplays, etc.)'),
    // Platform-specific posting costs (additional cost on top of content generation)
    formatService('platform_posting_twitter_post', 'Twitter Post Publishing', 'Platform Posting', 'Additional cost for posting content to Twitter/X (on top of content generation)'),
    formatService('platform_posting_twitter_reply', 'Twitter Reply Publishing', 'Platform Posting', 'Additional cost for replying on Twitter/X (on top of content generation)'),
    formatService('platform_posting_telegram_post', 'Telegram Post Publishing', 'Platform Posting', 'Additional cost for posting to Telegram groups (currently free - cheaper platform)'),
    formatService('platform_posting_telegram_reply', 'Telegram Reply Publishing', 'Platform Posting', 'Additional cost for replying in Telegram groups (currently free - cheaper platform)'),
    // Chat & Messaging Services
    formatService('chat_message_send', 'Chat Message Send', 'Chat & Messaging', 'Send a message in chat (0.1 credits per message)'),
    formatService('chat_file_upload_small', 'Chat File Upload (Small)', 'Chat & Messaging', 'Upload file in chat (< 5MB)'),
    formatService('chat_file_upload_large', 'Chat File Upload (Large)', 'Chat & Messaging', 'Upload file in chat (> 5MB)'),
    formatService('chat_group_creation', 'Chat Group Creation', 'Chat & Messaging', 'Create a new chat group'),
    formatService('chat_signal_share', 'Chat Signal Share', 'Chat & Messaging', 'Share crypto signal in chat (free - bundled with monitoring)')
  ];
}

// GET /api/admin/post-queue - Get all queued posts (admin only)
router.get('/post-queue', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    const { status, platform, limit = 50, offset = 0 } = req.query;
    
    const postQueueService = require('../services/PostQueueService');
    
    let query = `
      SELECT 
        pq.*,
        aa.name as agent_name,
        u.username,
        u.email,
        u.wallet_address
      FROM post_queue pq
      JOIN ai_agents aa ON pq.agent_id = aa.id
      JOIN users u ON pq.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    if (status) {
      query += ` AND pq.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (platform) {
      query += ` AND pq.platform = $${paramCount}`;
      params.push(platform);
      paramCount++;
    }
    
    query += ` ORDER BY pq.scheduled_for ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await database.query(query, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM post_queue pq
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 1;
    
    if (status) {
      countQuery += ` AND pq.status = $${countParamCount}`;
      countParams.push(status);
      countParamCount++;
    }
    
    if (platform) {
      countQuery += ` AND pq.platform = $${countParamCount}`;
      countParams.push(platform);
      countParamCount++;
    }
    
    const countResult = await database.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: {
        queuedPosts: result.rows,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(total / limit)
        },
        summary: {
          queued: result.rows.filter(p => p.status === 'queued').length,
          processing: result.rows.filter(p => p.status === 'processing').length,
          posted: result.rows.filter(p => p.status === 'posted').length,
          failed: result.rows.filter(p => p.status === 'failed').length
        }
      }
    });
  } catch (error) {
    logger.error('Error getting post queue:', error);
    res.status(500).json({
      error: 'Failed to get post queue',
      details: error.message
    });
  }
});

// POST /api/admin/post-queue/:queueId/retry - Retry a failed queued post (admin only)
router.post('/post-queue/:queueId/retry', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    const { queueId } = req.params;
    
    const postQueueService = require('../services/PostQueueService');
    
    // Get the queued post
    const postResult = await database.query(`
      SELECT * FROM post_queue WHERE id = $1
    `, [queueId]);
    
    if (postResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Queued post not found'
      });
    }
    
    const post = postResult.rows[0];
    
    // Reset status and reschedule for now
    await database.query(`
      UPDATE post_queue
      SET status = 'queued',
          scheduled_for = NOW(),
          retry_count = 0,
          updated_at = NOW()
      WHERE id = $1
    `, [queueId]);
    
    await logAdminAction(
      req.admin.id,
      'post_queue_retry',
      `Retried queued post ${queueId}`,
      null,
      { queueId, userId: post.user_id, agentId: post.agent_id }
    );
    
    res.json({
      success: true,
      message: 'Post queued for immediate retry',
      scheduledFor: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrying queued post:', error);
    res.status(500).json({
      error: 'Failed to retry queued post',
      details: error.message
    });
  }
});

// DELETE /api/admin/post-queue/:queueId - Delete a queued post (admin only)
router.delete('/post-queue/:queueId', requireAdminPermission('system_monitoring'), async (req, res) => {
  try {
    const { queueId } = req.params;
    
    const postQueueService = require('../services/PostQueueService');
    
    // Get the queued post before deletion for logging
    const postResult = await database.query(`
      SELECT * FROM post_queue WHERE id = $1
    `, [queueId]);
    
    if (postResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Queued post not found'
      });
    }
    
    const post = postResult.rows[0];
    
    // Delete the post
    await postQueueService.deleteQueuedPost(queueId);
    
    await logAdminAction(
      req.admin.id,
      'post_queue_delete',
      `Deleted queued post ${queueId}`,
      null,
      { queueId, userId: post.user_id, agentId: post.agent_id, status: post.status }
    );
    
    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting queued post:', error);
    res.status(500).json({
      error: 'Failed to delete queued post',
      details: error.message
    });
  }
});

module.exports = router;
