const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const database = require('../database/connection');
const GoogleCalendarService = require('../services/GoogleCalendarService');
const logger = require('../utils/logger');

// Middleware to authenticate user
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userResult = await database.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = userResult.rows[0];
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Initiate OAuth flow
 * GET /api/calendar/auth
 */
router.get('/auth', authenticateUser, async (req, res) => {
  try {
    // Generate secure state token
    const stateToken = crypto.randomBytes(32).toString('hex');

    // Store state in database
    await database.query(
      `INSERT INTO calendar_oauth_states (user_id, state_token, provider, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [
        req.user.id,
        stateToken,
        'google',
        new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      ]
    );

    // Generate authorization URL
    const authUrl = GoogleCalendarService.getAuthorizationUrl(stateToken);

    res.json({ authUrl });
  } catch (error) {
    logger.error('Error initiating calendar OAuth:', error);
    res.status(500).json({ error: 'Failed to initiate authorization' });
  }
});

/**
 * Handle OAuth callback from Google
 * GET /api/calendar/auth/callback
 */
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      logger.error('OAuth error from Google:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/calendar?error=access_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/calendar?error=invalid_request`);
    }

    // Verify state token
    const stateResult = await database.query(
      'SELECT * FROM calendar_oauth_states WHERE state_token = $1 AND expires_at > NOW()',
      [state]
    );

    if (stateResult.rows.length === 0) {
      logger.error('Invalid or expired state token');
      return res.redirect(`${process.env.FRONTEND_URL}/calendar?error=invalid_state`);
    }

    const { user_id } = stateResult.rows[0];

    // Exchange code for tokens
    const tokens = await GoogleCalendarService.getTokensFromCode(code);

    // Get user info from Google
    const { google } = require('googleapis');
    const oauth2Client = GoogleCalendarService.createOAuth2Client();
    oauth2Client.setCredentials(tokens);
    
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Calculate token expiration
    const expiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date) 
      : new Date(Date.now() + 3600 * 1000); // 1 hour default

    // Store calendar account
    await database.query(
      `INSERT INTO user_calendar_accounts 
       (user_id, provider, email_address, access_token, refresh_token, token_expires_at, scope, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, provider, email_address) 
       DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expires_at = EXCLUDED.token_expires_at,
         scope = EXCLUDED.scope,
         is_active = true,
         updated_at = CURRENT_TIMESTAMP`,
      [
        user_id,
        'google',
        userInfo.email,
        tokens.access_token,
        tokens.refresh_token,
        expiresAt,
        tokens.scope || '',
        true
      ]
    );

    // Delete used state token
    await database.query('DELETE FROM calendar_oauth_states WHERE state_token = $1', [state]);

    logger.info('Calendar account connected successfully', { userId: user_id, email: userInfo.email });

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/calendar?success=true`);
  } catch (error) {
    logger.error('Error in calendar OAuth callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/calendar?error=server_error`);
  }
});

/**
 * Check calendar connection status
 * GET /api/calendar/status
 */
router.get('/status', authenticateUser, async (req, res) => {
  try {
    const result = await database.query(
      `SELECT email_address, last_sync_at, created_at 
       FROM user_calendar_accounts 
       WHERE user_id = $1 AND provider = $2 AND is_active = true`,
      [req.user.id, 'google']
    );

    if (result.rows.length === 0) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      email: result.rows[0].email_address,
      lastSync: result.rows[0].last_sync_at,
      connectedAt: result.rows[0].created_at
    });
  } catch (error) {
    logger.error('Error checking calendar status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

/**
 * Disconnect calendar account
 * DELETE /api/calendar/disconnect
 */
router.delete('/disconnect', authenticateUser, async (req, res) => {
  try {
    await database.query(
      'UPDATE user_calendar_accounts SET is_active = false WHERE user_id = $1 AND provider = $2',
      [req.user.id, 'google']
    );

    logger.info('Calendar account disconnected', { userId: req.user.id });

    res.json({ success: true, message: 'Calendar disconnected successfully' });
  } catch (error) {
    logger.error('Error disconnecting calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect calendar' });
  }
});

/**
 * Trigger calendar sync
 * POST /api/calendar/sync
 */
router.post('/sync', authenticateUser, async (req, res) => {
  try {
    const { maxResults, daysAhead } = req.body;

    const result = await GoogleCalendarService.syncEventsForUser(req.user.id, {
      maxResults: maxResults || 100,
      timeMax: daysAhead ? new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString() : undefined
    });

    res.json({
      success: true,
      synced: result.synced,
      failed: result.failed
    });
  } catch (error) {
    logger.error('Error syncing calendar:', error);
    res.status(500).json({ error: 'Failed to sync calendar', details: error.message });
  }
});

module.exports = router;

