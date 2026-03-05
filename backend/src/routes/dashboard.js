const express = require('express');
const router = express.Router();
const database = require('../database/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const OPTIONAL_SCHEMA_ERRORS = new Set(['42P01', '42703']);

async function safeQuery(query, params = [], {
  fallbackQuery = null,
  fallbackParams = null,
  fallbackResult = null,
  label = 'Query'
} = {}) {
  try {
    return await database.query(query, params);
  } catch (error) {
    if (OPTIONAL_SCHEMA_ERRORS.has(error.code)) {
      if (fallbackQuery) {
        logger.warn(`${label} failed (${error.code}), retrying with fallback query`);
        return database.query(fallbackQuery, fallbackParams || params);
      }

      logger.warn(`${label} skipped because an optional table or column is missing (${error?.message || error})`);
      return fallbackResult ?? { rows: [] };
    }

    throw error;
  }
}

// GET /api/dashboard/integrations - Get all integration statuses
router.get('/integrations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check Twitter/X connection
    const twitterResult = await safeQuery(
      `SELECT COUNT(*) as count FROM platform_connections 
       WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'`,
      [userId],
      {
        label: 'Twitter connection status',
        fallbackResult: { rows: [{ count: 0 }] }
      }
    );
    const twitterConnected = parseInt(twitterResult.rows[0]?.count || 0) > 0;

    // Check Discord integration - table might not exist
    let discordConnected = false;
    let discordCount = 0;
    try {
      const discordResult = await database.query(
        `SELECT COUNT(*) as count FROM discord_bots WHERE user_id = $1 AND is_active = true`,
        [userId]
      );
      discordCount = parseInt(discordResult.rows[0]?.count || 0);
      discordConnected = discordCount > 0;
    } catch (error) {
      // Table doesn't exist, skip Discord check
      logger.warn('Discord bots table does not exist, skipping check');
    }

    // Check WordPress API keys
    const wordpressResult = await safeQuery(
      `SELECT COUNT(*) as count FROM api_keys WHERE user_id = $1 AND platform = 'wordpress' AND is_active = true`,
      [userId],
      {
        label: 'WordPress key status',
        fallbackQuery: `SELECT COUNT(*) as count FROM api_keys WHERE user_id = $1 AND is_active = true`,
        fallbackResult: { rows: [{ count: 0 }] }
      }
    );
    const wordpressConnected = parseInt(wordpressResult.rows[0]?.count || 0) > 0;

    // Check Instagram connection
    const instagramResult = await safeQuery(
      `SELECT COUNT(*) as count FROM platform_connections 
       WHERE user_id = $1 AND platform = 'instagram' AND connection_status = 'active'`,
      [userId],
      {
        label: 'Instagram connection status',
        fallbackResult: { rows: [{ count: 0 }] }
      }
    );
    const instagramConnected = parseInt(instagramResult.rows[0]?.count || 0) > 0;

    // Check Email accounts (Gmail/Outlook)
    const emailResult = await safeQuery(
      `SELECT COUNT(*) as count FROM user_email_accounts WHERE user_id = $1 AND is_active = true`,
      [userId],
      {
        label: 'Email connection status',
        fallbackResult: { rows: [{ count: 0 }] }
      }
    );
    const emailConnected = parseInt(emailResult.rows[0]?.count || 0) > 0;

    // Check Calendar integration
    const calendarResult = await safeQuery(
      `SELECT COUNT(*) as count FROM user_calendar_accounts WHERE user_id = $1 AND is_active = true`,
      [userId],
      {
        label: 'Calendar connection status',
        fallbackResult: { rows: [{ count: 0 }] }
      }
    );
    const calendarConnected = parseInt(calendarResult.rows[0]?.count || 0) > 0;

    // Check Shopify stores
    const shopifyResult = await safeQuery(
      `SELECT COUNT(*) as count FROM user_shopify_configs WHERE user_id = $1 AND is_active = true`,
      [userId],
      {
        label: 'Shopify connection status',
        fallbackResult: { rows: [{ count: 0 }] }
      }
    );
    const shopifyConnected = parseInt(shopifyResult.rows[0]?.count || 0) > 0;

    // Get last sync times
    const lastSyncs = {};
    
    if (twitterConnected) {
      const twitterSync = await safeQuery(
        `SELECT MAX(last_sync) as last_sync FROM platform_connections 
         WHERE user_id = $1 AND platform = 'twitter'`,
        [userId],
        {
          label: 'Twitter last sync',
          fallbackResult: { rows: [{ last_sync: null }] }
        }
      );
      lastSyncs.twitter = twitterSync.rows[0]?.last_sync || null;
    }

    if (emailConnected) {
      const emailSync = await safeQuery(
        `SELECT MAX(last_sync_at) as last_sync FROM user_email_accounts 
         WHERE user_id = $1 AND is_active = true`,
        [userId],
        {
          label: 'Email last sync',
          fallbackResult: { rows: [{ last_sync: null }] }
        }
      );
      lastSyncs.email = emailSync.rows[0]?.last_sync || null;
    }

    if (calendarConnected) {
      const calendarSync = await safeQuery(
        `SELECT MAX(last_sync_at) as last_sync FROM user_calendar_accounts 
         WHERE user_id = $1 AND is_active = true`,
        [userId],
        {
          label: 'Calendar last sync',
          fallbackResult: { rows: [{ last_sync: null }] }
        }
      );
      lastSyncs.calendar = calendarSync.rows[0]?.last_sync || null;
    }

    res.json({
      success: true,
      data: {
        twitter: {
          connected: twitterConnected,
          accounts: twitterConnected ? parseInt(twitterResult.rows[0]?.count || 0) : 0,
          lastSync: lastSyncs.twitter
        },
        discord: {
          connected: discordConnected,
          accounts: discordCount,
          lastSync: null
        },
        wordpress: {
          connected: wordpressConnected,
          accounts: wordpressConnected ? parseInt(wordpressResult.rows[0]?.count || 0) : 0,
          lastSync: null
        },
        instagram: {
          connected: instagramConnected,
          accounts: instagramConnected ? parseInt(instagramResult.rows[0]?.count || 0) : 0,
          lastSync: null
        },
        email: {
          connected: emailConnected,
          accounts: emailConnected ? parseInt(emailResult.rows[0]?.count || 0) : 0,
          lastSync: lastSyncs.email
        },
        calendar: {
          connected: calendarConnected,
          accounts: calendarConnected ? parseInt(calendarResult.rows[0]?.count || 0) : 0,
          lastSync: lastSyncs.calendar
        },
        shopify: {
          connected: shopifyConnected,
          accounts: shopifyConnected ? parseInt(shopifyResult.rows[0]?.count || 0) : 0,
          lastSync: null
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get integration statuses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve integration statuses',
      details: error.message
    });
  }
});

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Agent stats
    const agentStats = await safeQuery(
      `SELECT 
        COUNT(*) as total_agents,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_agents
       FROM ai_agents WHERE user_id = $1`,
      [userId],
      {
        label: 'Agent stats',
        fallbackResult: { rows: [{ total_agents: 0, active_agents: 0 }] }
      }
    );

    // Post stats - generated_content has agent_id, need to join with ai_agents
    const postStats = await safeQuery(
      `SELECT 
        COUNT(*) as total_posts,
        AVG(COALESCE(engagement_rate, 0)) as avg_engagement
       FROM generated_content gc
       JOIN ai_agents a ON gc.agent_id = a.id
       WHERE a.user_id = $1 AND gc.status = 'published'`,
      [userId],
      {
        label: 'Post stats',
        fallbackResult: { rows: [{ total_posts: 0, avg_engagement: 0 }] }
      }
    );

    // Music stats
    const musicStats = await safeQuery(
      `SELECT COUNT(*) as total_tracks FROM generated_music WHERE user_id = $1 AND status = 'completed'`,
      [userId],
      {
        label: 'Music track stats',
        fallbackResult: { rows: [{ total_tracks: 0 }] }
      }
    );

    // Music video stats
    const musicVideoStats = await safeQuery(
      `SELECT COUNT(*) as total_videos FROM generated_music_videos WHERE user_id = $1 AND status = 'completed'`,
      [userId],
      {
        label: 'Music video stats',
        fallbackResult: { rows: [{ total_videos: 0 }] }
      }
    );

    // Image stats - table might not exist, use generated_content as fallback
    const imageStats = await safeQuery(
      `SELECT COUNT(*) as total_images FROM generated_images WHERE user_id = $1 AND status = 'completed'`,
      [userId],
      {
        label: 'Image stats',
        fallbackQuery: `SELECT COUNT(*) as total_images 
           FROM generated_content gc
           JOIN ai_agents a ON gc.agent_id = a.id
           WHERE a.user_id = $1 AND gc.content_type = 'image' AND gc.status = 'published'`,
        fallbackResult: { rows: [{ total_images: 0 }] }
      }
    );

    // Video stats - Check if table exists, use content table as fallback
    const videoStats = await safeQuery(
      `SELECT COUNT(*) as total_videos FROM generated_videos WHERE user_id = $1 AND status = 'completed'`,
      [userId],
      {
        label: 'Video stats',
        fallbackQuery: `SELECT COUNT(*) as total_videos 
         FROM generated_content gc
         JOIN ai_agents a ON gc.agent_id = a.id
         WHERE a.user_id = $1 AND gc.content_type = 'video' AND gc.status = 'published'`,
        fallbackResult: { rows: [{ total_videos: 0 }] }
      }
    );

    // Email stats - table might not exist
    const emailStats = await safeQuery(
      `SELECT COUNT(*) as processed_emails FROM email_messages 
         WHERE user_id = $1 AND ai_category IS NOT NULL`,
      [userId],
      {
        label: 'Email stats',
        fallbackResult: { rows: [{ processed_emails: 0 }] }
      }
    );

    // Calendar stats - Check if table exists
    const calendarStats = await safeQuery(
      `SELECT COUNT(*) as total_events FROM calendar_events WHERE user_id = $1`,
      [userId],
      {
        label: 'Calendar stats',
        fallbackResult: { rows: [{ total_events: 0 }] }
      }
    );

    // Shopify stats - tables might not exist
    const shopifyStats = await safeQuery(
      `SELECT COUNT(*) as total_products 
         FROM shopify_products sp
         JOIN user_shopify_configs usc ON sp.shopify_store_id = usc.id
         WHERE usc.user_id = $1`,
      [userId],
      {
        label: 'Shopify stats',
        fallbackResult: { rows: [{ total_products: 0 }] }
      }
    );

    res.json({
      success: true,
      data: {
        agents: {
          total: parseInt(agentStats.rows[0]?.total_agents || 0),
          active: parseInt(agentStats.rows[0]?.active_agents || 0)
        },
        posts: {
          total: parseInt(postStats.rows[0]?.total_posts || 0),
          avgEngagement: parseFloat(postStats.rows[0]?.avg_engagement || 0)
        },
        music: {
          tracks: parseInt(musicStats.rows[0]?.total_tracks || 0),
          videos: parseInt(musicVideoStats.rows[0]?.total_videos || 0)
        },
        content: {
          images: parseInt(imageStats.rows[0]?.total_images || 0),
          videos: parseInt(videoStats.rows[0]?.total_videos || 0)
        },
        productivity: {
          emails: parseInt(emailStats.rows[0]?.processed_emails || 0),
          calendarEvents: parseInt(calendarStats.rows[0]?.total_events || 0)
        },
        ecommerce: {
          products: parseInt(shopifyStats.rows[0]?.total_products || 0)
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard statistics',
      details: error.message
    });
  }
});

// GET /api/dashboard/activities - Get recent activities
router.get('/activities', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    const activities = [];

    // Recent agent activities
    const agentActivities = await safeQuery(
      `SELECT 
        'agent' as type,
        'success' as activity_type,
        a.name as title,
        CONCAT('Agent ', a.name, ' is ', CASE WHEN a.is_active THEN 'active' ELSE 'paused' END) as description,
        a.updated_at as timestamp,
        'Agents' as integration
       FROM ai_agents a
       WHERE a.user_id = $1
       ORDER BY a.updated_at DESC
       LIMIT 5`,
      [userId],
      {
        label: 'Agent activities',
        fallbackResult: { rows: [] }
      }
    );

    activities.push(...agentActivities.rows.map(row => ({
      id: `agent-${row.title}-${row.timestamp}`,
      type: row.activity_type,
      title: row.title,
      description: row.description,
      timestamp: row.timestamp,
      integration: row.integration
    })));

    // Recent music generation
    const musicActivities = await safeQuery(
      `SELECT 
        'music' as type,
        CASE WHEN status = 'completed' THEN 'success' ELSE 'info' END as activity_type,
        prompt as title,
        CONCAT('Music track generated: ', prompt) as description,
        created_at as timestamp,
        'Music Generation' as integration
       FROM generated_music
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId],
      {
        label: 'Music activities',
        fallbackResult: { rows: [] }
      }
    );

    activities.push(...musicActivities.rows.map(row => ({
      id: `music-${row.timestamp}`,
      type: row.activity_type,
      title: row.title.substring(0, 50),
      description: row.description,
      timestamp: row.timestamp,
      integration: row.integration
    })));

    // Recent posts - join with ai_agents for user_id
    const postActivities = await safeQuery(
      `SELECT 
        'post' as type,
        'info' as activity_type,
        gc.platform as title,
        CONCAT('Post published on ', gc.platform) as description,
        gc.published_at as timestamp,
        gc.platform as integration
       FROM generated_content gc
       JOIN ai_agents a ON gc.agent_id = a.id
       WHERE a.user_id = $1 AND gc.status = 'published' AND gc.published_at IS NOT NULL
       ORDER BY gc.published_at DESC
       LIMIT 5`,
      [userId],
      {
        label: 'Post activities',
        fallbackResult: { rows: [] }
      }
    );

    activities.push(...postActivities.rows.map(row => ({
      id: `post-${row.timestamp}`,
      type: row.activity_type,
      title: row.title,
      description: row.description,
      timestamp: row.timestamp,
      integration: row.integration
    })));

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const limitedActivities = activities.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: limitedActivities
    });
  } catch (error) {
    logger.error('Failed to get activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve activities',
      details: error.message
    });
  }
});

module.exports = router;

