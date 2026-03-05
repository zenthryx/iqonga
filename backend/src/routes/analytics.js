const express = require('express');
const router = express.Router();
const database = require('../database/connection');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Server-Side Analytics Routes
 * Tracks page views and events for all users (including those with ad blockers)
 */

// Helper: Parse user agent for device/browser info
function parseUserAgent(userAgent) {
  if (!userAgent) return { device_type: 'unknown', browser: 'unknown', os: 'unknown' };
  
  const ua = userAgent.toLowerCase();
  
  // Device type
  let device_type = 'desktop';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
    device_type = 'tablet';
  } else if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    device_type = 'mobile';
  }
  
  // Browser
  let browser = 'unknown';
  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome/') && !ua.includes('edg/')) browser = 'Chrome';
  else if (ua.includes('firefox/')) browser = 'Firefox';
  else if (ua.includes('safari/') && !ua.includes('chrome/')) browser = 'Safari';
  else if (ua.includes('opera/') || ua.includes('opr/')) browser = 'Opera';
  
  // OS
  let os = 'unknown';
  if (ua.includes('win')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  
  return { device_type, browser, os };
}

// Helper: Hash IP address for privacy
function hashIP(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip + process.env.IP_HASH_SALT || 'default-salt').digest('hex').slice(0, 16);
}

// POST /api/analytics/track - Track page view or event
router.post('/track', async (req, res) => {
  try {
    const {
      event_type = 'page_view',
      event_name,
      page_path,
      page_title,
      session_id,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      metadata
    } = req.body;
    
    // Optional: Get user ID from token if authenticated
    let user_id = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        user_id = decoded.userId || decoded.id;
      } catch (e) {
        // Not authenticated, that's fine
      }
    }
    
    // Get user agent and IP
    const user_agent = req.headers['user-agent'];
    const ip_address = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection.remoteAddress;
    const ip_hash = hashIP(ip_address);
    
    // Parse user agent
    const { device_type, browser, os } = parseUserAgent(user_agent);
    
    // Insert event
    await database.query(
      `INSERT INTO analytics_events (
        event_type, event_name, page_path, page_title, user_id, session_id,
        user_agent, ip_address, referrer, utm_source, utm_medium, utm_campaign,
        utm_term, utm_content, device_type, browser, os, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        event_type, event_name, page_path, page_title, user_id, session_id,
        user_agent, ip_hash, referrer, utm_source, utm_medium, utm_campaign,
        utm_term, utm_content, device_type, browser, os, metadata
      ]
    );
    
    // Return success without blocking
    res.json({ success: true });
    
  } catch (error) {
    // Don't let analytics errors break the app
    logger.error('Analytics tracking error:', error);
    res.json({ success: false });
  }
});

// GET /api/analytics/stats - Get basic analytics stats (admin only)
router.get('/stats', async (req, res) => {
  try {
    // Get overview stats
    const [totalViews, uniqueSessions, today, week] = await Promise.all([
      // Total page views
      database.query(`SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'page_view'`),
      
      // Unique sessions
      database.query(`SELECT COUNT(DISTINCT session_id) as count FROM analytics_events`),
      
      // Today's views
      database.query(`SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'page_view' AND created_at >= CURRENT_DATE`),
      
      // This week's views
      database.query(`SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'page_view' AND created_at >= CURRENT_DATE - INTERVAL '7 days'`)
    ]);
    
    // Top pages
    const topPages = await database.query(`
      SELECT page_path, page_title, COUNT(*) as views
      FROM analytics_events
      WHERE event_type = 'page_view' AND page_path IS NOT NULL
      GROUP BY page_path, page_title
      ORDER BY views DESC
      LIMIT 10
    `);
    
    // Device breakdown
    const devices = await database.query(`
      SELECT device_type, COUNT(*) as count
      FROM analytics_events
      WHERE device_type IS NOT NULL
      GROUP BY device_type
      ORDER BY count DESC
    `);
    
    // Browser breakdown
    const browsers = await database.query(`
      SELECT browser, COUNT(*) as count
      FROM analytics_events
      WHERE browser IS NOT NULL AND browser != 'unknown'
      GROUP BY browser
      ORDER BY count DESC
      LIMIT 5
    `);
    
    // Referrer sources
    const referrers = await database.query(`
      SELECT 
        CASE 
          WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
          WHEN referrer LIKE '%google%' THEN 'Google'
          WHEN referrer LIKE '%twitter%' OR referrer LIKE '%x.com%' THEN 'Twitter'
          WHEN referrer LIKE '%facebook%' THEN 'Facebook'
          WHEN referrer LIKE '%linkedin%' THEN 'LinkedIn'
          ELSE 'Other'
        END as source,
        COUNT(*) as count
      FROM analytics_events
      WHERE event_type = 'page_view'
      GROUP BY source
      ORDER BY count DESC
    `);
    
    res.json({
      success: true,
      data: {
        overview: {
          total_page_views: parseInt(totalViews.rows[0]?.count || 0),
          unique_sessions: parseInt(uniqueSessions.rows[0]?.count || 0),
          today_views: parseInt(today.rows[0]?.count || 0),
          week_views: parseInt(week.rows[0]?.count || 0)
        },
        top_pages: topPages.rows,
        devices: devices.rows,
        browsers: browsers.rows,
        referrers: referrers.rows
      }
    });
    
  } catch (error) {
    logger.error('Analytics stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics stats',
      details: error.message
    });
  }
});

// GET /api/analytics/daily - Get daily page view trends (last 30 days)
router.get('/daily', async (req, res) => {
  try {
    const result = await database.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM analytics_events
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    logger.error('Analytics daily stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch daily analytics',
      details: error.message
    });
  }
});

module.exports = router;
