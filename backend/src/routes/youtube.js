const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const { encrypt, decrypt } = require('../utils/encryption');
const YouTubeService = require('../services/YouTubeService');

/**
 * GET /api/youtube/auth/request - Start YouTube OAuth flow
 */
router.get('/auth/request', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Generate secure state token
    const stateToken = crypto.randomBytes(32).toString('hex');
    
    // Store state in database
    await database.query(`
      INSERT INTO oauth_temp_tokens (user_id, state, platform, expires_at, auth_token)
      VALUES ($1, $2, 'youtube', NOW() + INTERVAL '15 minutes', $3)
      ON CONFLICT (user_id, platform) 
      DO UPDATE SET 
        state = $2,
        expires_at = NOW() + INTERVAL '15 minutes',
        auth_token = $3
    `, [userId, stateToken, req.headers.authorization?.replace('Bearer ', '')]);

    // Get authorization URL
    const authUrl = YouTubeService.getAuthorizationUrl(stateToken);

    logger.info(`YouTube OAuth initiated for user: ${userId}`);

    res.json({
      success: true,
      data: {
        authUrl: authUrl,
        state: stateToken
      }
    });
  } catch (error) {
    logger.error('YouTube OAuth request failed:', error);
    res.status(500).json({
      error: 'Failed to initiate YouTube authentication',
      details: error.message
    });
  }
});

/**
 * GET /api/youtube/auth/callback - Handle YouTube OAuth callback
 */
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      logger.error('YouTube OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/profile?youtube_auth=denied&error=${error}`);
    }

    if (!code || !state) {
      logger.error('Missing OAuth parameters');
      return res.redirect(`${process.env.FRONTEND_URL}/profile?youtube_auth=error`);
    }

    // Verify state token
    const stateResult = await database.query(`
      SELECT user_id, auth_token FROM oauth_temp_tokens
      WHERE state = $1 AND platform = 'youtube' AND expires_at > NOW()
    `, [state]);

    if (stateResult.rows.length === 0) {
      logger.error('Invalid or expired state token');
      return res.redirect(`${process.env.FRONTEND_URL}/profile?youtube_auth=error&reason=invalid_state`);
    }

    const { user_id, auth_token } = stateResult.rows[0];

    // Exchange code for tokens
    const tokens = await YouTubeService.exchangeCodeForTokens(code);

    // Get channel info
    const { google } = require('googleapis');
    const { OAuth2Client } = require('google-auth-library');
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI || `${process.env.API_URL}/api/youtube/auth/callback`
    );

    oauth2Client.setCredentials(tokens);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const channelResponse = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      mine: true
    });

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      throw new Error('No YouTube channel found');
    }

    const channel = channelResponse.data.items[0];
    const channelTitle = channel.snippet.title;
    const channelId = channel.id;

    // Store connection in database
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;
    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    // Log if refresh token is missing (for debugging)
    if (!tokens.refresh_token) {
      logger.warn(`No refresh token received for user ${user_id} during YouTube OAuth. User may need to reconnect.`);
    } else {
      logger.info(`Refresh token received and saved for user ${user_id}`);
    }

    await database.query(`
      INSERT INTO platform_connections (
        user_id, platform, username, access_token, refresh_token, 
        expires_at, connection_status, updated_at
      )
      VALUES ($1, 'youtube', $2, $3, $4, $5, 'active', NOW())
      ON CONFLICT (user_id, platform)
      DO UPDATE SET
        username = $2,
        access_token = $3,
        refresh_token = $4,
        expires_at = $5,
        connection_status = 'active',
        updated_at = NOW()
    `, [
      user_id,
      channelTitle,
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt
    ]);

    // Clean up state token
    await database.query(`
      DELETE FROM oauth_temp_tokens WHERE state = $1
    `, [state]);

    logger.info(`YouTube account connected for user: ${user_id}, channel: ${channelTitle}`);

    res.redirect(`${process.env.FRONTEND_URL}/profile?youtube_auth=success`);
  } catch (error) {
    logger.error('YouTube OAuth callback failed:', error);
    res.redirect(`${process.env.FRONTEND_URL}/profile?youtube_auth=error&details=${encodeURIComponent(error.message)}`);
  }
});

/**
 * GET /api/youtube/playlists - Get user's playlists
 */
router.get('/playlists', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const playlists = await YouTubeService.getUserPlaylists(userId);
    
    res.json({
      success: true,
      data: playlists
    });
  } catch (error) {
    logger.error('Error fetching playlists:', error);
    res.status(500).json({
      error: 'Failed to fetch playlists',
      details: error.message
    });
  }
});

/**
 * GET /api/youtube/channel - Get user's YouTube channel info
 */
router.get('/channel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const channelInfo = await YouTubeService.getChannelInfo(userId);

    res.json({
      success: true,
      data: {
        channelId: channelInfo.id,
        title: channelInfo.snippet.title,
        description: channelInfo.snippet.description,
        thumbnail: channelInfo.snippet.thumbnails?.default?.url,
        subscriberCount: channelInfo.statistics?.subscriberCount,
        videoCount: channelInfo.statistics?.videoCount,
        viewCount: channelInfo.statistics?.viewCount
      }
    });
  } catch (error) {
    logger.error('Error getting YouTube channel:', error);
    res.status(500).json({
      error: 'Failed to get YouTube channel info',
      details: error.message
    });
  }
});

/**
 * POST /api/youtube/upload - Upload video to YouTube
 */
router.post('/upload', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      videoUrl, // URL of the video to upload (from generated_videos)
      videoId, // ID from generated_videos table
      title,
      description,
      tags = [],
      categoryId = '22', // People & Blogs
      privacyStatus = 'private', // 'private', 'unlisted', 'public'
      thumbnailUrl, // Optional thumbnail URL (from generated_images or uploaded)
      madeForKids = false, // COPPA compliance
      playlistIds = [] // Optional array of playlist IDs to add video to
    } = req.body;

    if (!videoUrl || !title) {
      return res.status(400).json({
        error: 'Video URL and title are required'
      });
    }

    // If videoId is provided, get additional metadata from database
    let videoMetadata = {};
    if (videoId) {
      const videoResult = await database.query(`
        SELECT prompt, style, duration, aspect_ratio
        FROM generated_videos
        WHERE id = $1 AND user_id = $2
      `, [videoId, userId]);

      if (videoResult.rows.length > 0) {
        const video = videoResult.rows[0];
        // Use video prompt as description if description not provided
        if (!description && video.prompt) {
          videoMetadata.description = video.prompt;
        }
        // Add style as tag if not already present
        if (video.style && !tags.includes(video.style)) {
          videoMetadata.tags = [...tags, video.style];
        }
      }
    }

    // Handle thumbnail - if it's a relative path, convert to local path
    let thumbnailPath = null;
    if (thumbnailUrl) {
      const path = require('path');
      const fs = require('fs');
      const axios = require('axios');
      
      if (thumbnailUrl.startsWith('/uploads/')) {
        // Local file path
        thumbnailPath = path.join(__dirname, '../..', thumbnailUrl);
        if (!fs.existsSync(thumbnailPath)) {
          logger.warn(`Thumbnail file not found: ${thumbnailPath}`);
          thumbnailPath = null;
        }
      } else if (thumbnailUrl.startsWith('http')) {
        // Remote URL - download it
        const tempDir = path.join(__dirname, '../../uploads/temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempThumbPath = path.join(tempDir, `thumbnail_${Date.now()}.jpg`);
        try {
          const response = await axios({
            method: 'GET',
            url: thumbnailUrl,
            responseType: 'stream'
          });
          const writer = fs.createWriteStream(tempThumbPath);
          response.data.pipe(writer);
          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });
          thumbnailPath = tempThumbPath;
        } catch (thumbError) {
          logger.warn('Failed to download thumbnail:', thumbError.message);
          thumbnailPath = null;
        }
      }
    }

    // Upload video
    const result = await YouTubeService.uploadVideoFromUrl(userId, videoUrl, {
      title,
      description: description || videoMetadata.description || '',
      tags: videoMetadata.tags || tags,
      categoryId,
      privacyStatus,
      thumbnailPath,
      madeForKids,
      playlistIds
    });

    // Update generated_videos table with YouTube video ID
    if (videoId) {
      await database.query(`
        UPDATE generated_videos
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{youtube}',
          $1::jsonb
        ),
        updated_at = NOW()
        WHERE id = $2
      `, [
        JSON.stringify({
          videoId: result.videoId,
          videoUrl: result.videoUrl,
          uploadedAt: new Date().toISOString()
        }),
        videoId
      ]);
    }

    logger.info(`Video uploaded to YouTube for user ${userId}: ${result.videoId}`);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error uploading video to YouTube:', error);
    res.status(500).json({
      error: 'Failed to upload video to YouTube',
      details: error.message
    });
  }
});

/**
 * GET /api/youtube/videos - Get user's uploaded videos
 */
router.get('/videos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const maxResults = parseInt(req.query.maxResults) || 50;

    const videos = await YouTubeService.getUserVideos(userId, maxResults);

    res.json({
      success: true,
      data: {
        videos: videos.map(video => ({
          videoId: video.id.videoId,
          title: video.snippet.title,
          description: video.snippet.description,
          thumbnail: video.snippet.thumbnails?.default?.url,
          publishedAt: video.snippet.publishedAt
        }))
      }
    });
  } catch (error) {
    logger.error('Error getting YouTube videos:', error);
    res.status(500).json({
      error: 'Failed to get YouTube videos',
      details: error.message
    });
  }
});

/**
 * DELETE /api/youtube/disconnect - Disconnect YouTube account
 */
router.delete('/disconnect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await database.query(`
      UPDATE platform_connections
      SET connection_status = 'inactive', updated_at = NOW()
      WHERE user_id = $1 AND platform = 'youtube'
    `, [userId]);

    logger.info(`YouTube account disconnected for user: ${userId}`);

    res.json({
      success: true,
      message: 'YouTube account disconnected successfully'
    });
  } catch (error) {
    logger.error('Error disconnecting YouTube:', error);
    res.status(500).json({
      error: 'Failed to disconnect YouTube account',
      details: error.message
    });
  }
});

module.exports = router;

