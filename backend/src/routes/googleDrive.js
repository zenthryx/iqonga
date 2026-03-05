const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const GoogleDriveService = require('../services/GoogleDriveService');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { encrypt } = require('../utils/encryption');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * GET /api/google-drive/auth - Initiate Google Drive OAuth
 */
router.get('/auth', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Generate state token
    const state = crypto.randomBytes(32).toString('hex');
    const authToken = crypto.randomBytes(32).toString('hex');
    
    // Store state token temporarily
    await database.query(`
      INSERT INTO oauth_temp_tokens (state, auth_token, user_id, platform, expires_at)
      VALUES ($1, $2, $3, $4, NOW() + INTERVAL '10 minutes')
      ON CONFLICT (state) DO UPDATE SET
        auth_token = EXCLUDED.auth_token,
        user_id = EXCLUDED.user_id,
        expires_at = EXCLUDED.expires_at
    `, [state, authToken, userId, 'google_drive']);

    const authUrl = GoogleDriveService.generateAuthUrl(state);

    res.json({
      success: true,
      authUrl: authUrl,
      state: state
    });
  } catch (error) {
    logger.error('Failed to generate Google Drive auth URL:', error);
    res.status(500).json({
      error: 'Failed to generate authorization URL',
      details: error.message
    });
  }
});

/**
 * GET /api/google-drive/auth/callback - Handle Google Drive OAuth callback
 */
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      logger.error('Google Drive OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/profile?google_drive_auth=denied&error=${error}`);
    }

    if (!code || !state) {
      logger.error('Missing OAuth parameters');
      return res.redirect(`${process.env.FRONTEND_URL}/profile?google_drive_auth=error`);
    }

    // Verify state token
    const stateResult = await database.query(`
      SELECT user_id, auth_token FROM oauth_temp_tokens
      WHERE state = $1 AND platform = 'google_drive' AND expires_at > NOW()
    `, [state]);

    if (stateResult.rows.length === 0) {
      logger.error('Invalid or expired state token');
      return res.redirect(`${process.env.FRONTEND_URL}/profile?google_drive_auth=error&reason=invalid_state`);
    }

    const { user_id } = stateResult.rows[0];

    // Exchange code for tokens
    const tokens = await GoogleDriveService.getTokensFromCode(code);

    // Get user info
    const { google } = require('googleapis');
    const oauth2Client = GoogleDriveService.createOAuth2Client();
    oauth2Client.setCredentials(tokens);
    
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Store or update connection
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;
    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    await database.query(`
      INSERT INTO platform_connections (user_id, platform, access_token, refresh_token, expires_at, username, connection_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (user_id, platform) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        username = EXCLUDED.username,
        connection_status = EXCLUDED.connection_status,
        updated_at = NOW()
    `, [
      user_id,
      'google_drive',
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      userInfo.data.email || 'Google Drive',
      'active'
    ]);

    // Clean up temp token
    await database.query(`
      DELETE FROM oauth_temp_tokens WHERE state = $1
    `, [state]);

    logger.info(`Google Drive connected for user ${user_id}`);

    res.redirect(`${process.env.FRONTEND_URL}/profile?google_drive_auth=success`);
  } catch (error) {
    logger.error('Google Drive OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/profile?google_drive_auth=error&details=${encodeURIComponent(error.message)}`);
  }
});

/**
 * GET /api/google-drive/status - Check Google Drive connection status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await database.query(`
      SELECT connection_status, username, updated_at
      FROM platform_connections
      WHERE user_id = $1 AND platform = 'google_drive'
    `, [userId]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        connected: false
      });
    }

    res.json({
      success: true,
      connected: result.rows[0].connection_status === 'active',
      username: result.rows[0].username,
      updatedAt: result.rows[0].updated_at
    });
  } catch (error) {
    logger.error('Failed to check Google Drive status:', error);
    res.status(500).json({
      error: 'Failed to check connection status',
      details: error.message
    });
  }
});

/**
 * POST /api/google-drive/disconnect - Disconnect Google Drive
 */
router.post('/disconnect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await database.query(`
      UPDATE platform_connections
      SET connection_status = 'inactive', updated_at = NOW()
      WHERE user_id = $1 AND platform = 'google_drive'
    `, [userId]);

    res.json({
      success: true,
      message: 'Google Drive disconnected successfully'
    });
  } catch (error) {
    logger.error('Failed to disconnect Google Drive:', error);
    res.status(500).json({
      error: 'Failed to disconnect',
      details: error.message
    });
  }
});

/**
 * POST /api/google-drive/upload - Upload file to Google Drive
 */
router.post('/upload', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { filePath, fileName, mimeType, folderId } = req.body;

    if (!filePath || !fileName) {
      return res.status(400).json({ error: 'File path and name are required' });
    }

    const result = await GoogleDriveService.uploadFile(
      userId,
      filePath,
      fileName,
      mimeType || 'application/octet-stream',
      folderId
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to upload to Google Drive:', error);
    res.status(500).json({
      error: 'Failed to upload file',
      details: error.message
    });
  }
});

/**
 * GET /api/google-drive/files - List files in Google Drive
 */
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { folderId, mimeType, limit } = req.query;

    const result = await GoogleDriveService.listFiles(
      userId,
      folderId || null,
      mimeType || null,
      parseInt(limit) || 50
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to list Google Drive files:', error);
    res.status(500).json({
      error: 'Failed to list files',
      details: error.message
    });
  }
});

/**
 * POST /api/google-drive/download - Download file from Google Drive
 */
router.post('/download', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { fileId, destinationPath } = req.body;

    if (!fileId || !destinationPath) {
      return res.status(400).json({ error: 'File ID and destination path are required' });
    }

    const result = await GoogleDriveService.downloadFile(userId, fileId, destinationPath);

    res.json({
      success: true,
      filePath: result
    });
  } catch (error) {
    logger.error('Failed to download from Google Drive:', error);
    res.status(500).json({
      error: 'Failed to download file',
      details: error.message
    });
  }
});

/**
 * POST /api/google-drive/folder - Create folder in Google Drive
 */
router.post('/folder', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { folderName, parentFolderId } = req.body;

    if (!folderName) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const result = await GoogleDriveService.createFolder(
      userId,
      folderName,
      parentFolderId || null
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to create folder:', error);
    res.status(500).json({
      error: 'Failed to create folder',
      details: error.message
    });
  }
});

module.exports = router;

