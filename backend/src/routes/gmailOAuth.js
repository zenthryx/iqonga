const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const database = require('../database/connection');
const logger = require('../utils/logger');
const GmailService = require('../services/GmailService');

const router = express.Router();

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

// Generate OAuth state for security
const generateOAuthState = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Initiate Gmail OAuth flow
 * GET /api/gmail/auth
 */
router.get('/auth', authenticateUser, async (req, res) => {
  try {
    // Generate secure state
    const state = generateOAuthState();
    
    // Store state in database with expiration (5 minutes)
    await database.query(
      'INSERT INTO email_oauth_states (user_id, state, provider, redirect_uri, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [
        req.user.id, 
        state, 
        'gmail',
        process.env.GMAIL_REDIRECT_URI,
        new Date(Date.now() + 5 * 60 * 1000)
      ]
    );

    // Generate OAuth URL
    const authUrl = GmailService.generateAuthUrl(state);

    logger.info(`Gmail OAuth initiated for user ${req.user.id}`);
    
    res.json({ 
      success: true, 
      oauth_url: authUrl,
      message: 'Redirect user to this URL to authorize Gmail access'
    });

  } catch (error) {
    logger.error('Gmail OAuth initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
});

/**
 * Handle Gmail OAuth callback
 * GET /api/gmail/auth/callback
 */
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    // Check for OAuth errors
    if (error) {
      logger.error('Gmail OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/smart-inbox?error=${error}`);
    }

    if (!code || !state) {
      logger.error('Missing OAuth parameters:', { code: !!code, state: !!state });
      return res.redirect(`${process.env.FRONTEND_URL}/smart-inbox?error=missing_parameters`);
    }

    // Verify state exists and hasn't expired
    const stateResult = await database.query(
      'SELECT user_id, redirect_uri FROM email_oauth_states WHERE state = $1 AND provider = $2 AND expires_at > NOW()',
      [state, 'gmail']
    );

    if (stateResult.rows.length === 0) {
      logger.error('Invalid or expired OAuth state:', state);
      return res.redirect(`${process.env.FRONTEND_URL}/smart-inbox?error=invalid_state`);
    }

    const { user_id } = stateResult.rows[0];

    // Exchange code for tokens
    const tokens = await GmailService.getTokensFromCode(code);
    
    if (!tokens.access_token) {
      logger.error('No access token received from Gmail');
      return res.redirect(`${process.env.FRONTEND_URL}/smart-inbox?error=no_access_token`);
    }

    // Get user info from Gmail
    const userInfo = await GmailService.getUserInfo(tokens.access_token);
    
    // Calculate token expiration
    const expiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date) 
      : new Date(Date.now() + 3600 * 1000); // 1 hour default

    // Store user's Gmail account configuration
    await database.query(`
      INSERT INTO user_email_accounts (
        user_id, provider, email_address, 
        access_token, refresh_token, token_expires_at, 
        scope, is_active, is_primary
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, 
        (SELECT COUNT(*) = 0 FROM user_email_accounts WHERE user_id = $1 AND provider = 'gmail')
      )
      ON CONFLICT (user_id, email_address) 
      DO UPDATE SET 
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expires_at = EXCLUDED.token_expires_at,
        scope = EXCLUDED.scope,
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
    `, [
      user_id, 
      'gmail', 
      userInfo.email,
      tokens.access_token,
      tokens.refresh_token,
      expiresAt,
      tokens.scope
    ]);

    // Clean up OAuth state
    await database.query('DELETE FROM email_oauth_states WHERE state = $1', [state]);

    logger.info(`Gmail OAuth completed for user ${user_id}, email: ${userInfo.email}`);

    // Redirect back to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/smart-inbox?success=true&email=${encodeURIComponent(userInfo.email)}`);

  } catch (error) {
    logger.error('Gmail OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/smart-inbox?error=callback_failed`);
  }
});

/**
 * Get user's Gmail account status
 * GET /api/gmail/status
 */
router.get('/status', authenticateUser, async (req, res) => {
  try {
    const result = await database.query(
      'SELECT email_address, is_active, last_sync_at, created_at FROM user_email_accounts WHERE user_id = $1 AND provider = $2 AND is_active = true',
      [req.user.id, 'gmail']
    );

    if (result.rows.length === 0) {
      return res.json({
        connected: false,
        message: 'No Gmail account connected'
      });
    }

    const account = result.rows[0];
    res.json({
      connected: true,
      email: account.email_address,
      last_sync_at: account.last_sync_at,
      connected_at: account.created_at
    });

  } catch (error) {
    logger.error('Error fetching Gmail status:', error);
    res.status(500).json({ error: 'Failed to fetch Gmail status' });
  }
});

/**
 * Disconnect Gmail account
 * DELETE /api/gmail/disconnect
 */
router.delete('/disconnect', authenticateUser, async (req, res) => {
  try {
    await database.query(
      'UPDATE user_email_accounts SET is_active = false WHERE user_id = $1 AND provider = $2',
      [req.user.id, 'gmail']
    );

    logger.info(`Gmail disconnected for user ${req.user.id}`);
    res.json({ success: true, message: 'Gmail account disconnected successfully' });

  } catch (error) {
    logger.error('Error disconnecting Gmail:', error);
    res.status(500).json({ error: 'Failed to disconnect Gmail account' });
  }
});

/**
 * Trigger email sync
 * POST /api/gmail/sync
 */
router.post('/sync', authenticateUser, async (req, res) => {
  try {
    const { maxResults = 100 } = req.body;

    const result = await GmailService.syncEmailsForUser(req.user.id, maxResults);

    res.json({
      success: true,
      synced: result.synced,
      failed: result.failed,
      message: `Successfully synced ${result.synced} emails`
    });

  } catch (error) {
    logger.error('Error syncing emails:', error);
    res.status(500).json({ error: 'Failed to sync emails', details: error.message });
  }
});

module.exports = router;

