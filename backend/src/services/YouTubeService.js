const database = require('../database/connection');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Lazy load googleapis
let google = null;
function getGoogle() {
  if (!google) {
    google = require('googleapis').google;
  }
  return google;
}

class YouTubeService {
  constructor() {
    this.oauth2Client = null;
    this.scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ];
  }

  /**
   * Get OAuth2 client for a user
   */
  getOAuth2Client(userId) {
    return new Promise(async (resolve, reject) => {
      try {
        getGoogle();

        // Get user's YouTube connection
        const connectionResult = await database.query(`
          SELECT access_token, refresh_token, expires_at, username
          FROM platform_connections
          WHERE user_id = $1 AND platform = 'youtube' AND connection_status = 'active'
        `, [userId]);

        if (connectionResult.rows.length === 0) {
          throw new Error('YouTube account not connected');
        }

        const connection = connectionResult.rows[0];
        
        const { OAuth2Client } = require('google-auth-library');
        const oauth2Client = new OAuth2Client(
          process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET,
          process.env.YOUTUBE_REDIRECT_URI || `${process.env.API_URL}/api/youtube/auth/callback`
        );

        // Decrypt tokens
        const decryptedAccessToken = decrypt(connection.access_token);
        const decryptedRefreshToken = connection.refresh_token ? decrypt(connection.refresh_token) : null;

        // Set credentials - only include refresh_token if it exists
        const credentials = {
          access_token: decryptedAccessToken,
          expiry_date: connection.expires_at ? new Date(connection.expires_at).getTime() : null
        };

        // Only add refresh_token if it exists and is not null/empty
        if (decryptedRefreshToken && decryptedRefreshToken.trim() !== '') {
          credentials.refresh_token = decryptedRefreshToken;
        }

        oauth2Client.setCredentials(credentials);

        // Auto-refresh token if expired (only if refresh token exists)
        if (decryptedRefreshToken && decryptedRefreshToken.trim() !== '') {
          oauth2Client.on('tokens', async (tokens) => {
            if (tokens.access_token) {
              await this.updateTokens(userId, tokens);
            }
          });
        } else {
          logger.warn(`No refresh token available for user ${userId} - token refresh disabled`);
        }

        resolve(oauth2Client);
      } catch (error) {
        logger.error('Error getting OAuth2 client:', error);
        reject(error);
      }
    });
  }

  /**
   * Update tokens in database
   */
  async updateTokens(userId, tokens) {
    try {
      const encryptedAccessToken = encrypt(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;
      const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

      await database.query(`
        UPDATE platform_connections
        SET access_token = $1,
            refresh_token = $2,
            expires_at = $3,
            updated_at = NOW()
        WHERE user_id = $4 AND platform = 'youtube'
      `, [encryptedAccessToken, encryptedRefreshToken, expiresAt, userId]);

      logger.info('YouTube tokens updated for user:', userId);
    } catch (error) {
      logger.error('Error updating YouTube tokens:', error);
      throw error;
    }
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(state) {
    const { OAuth2Client } = require('google-auth-library');
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI || `${process.env.API_URL}/api/youtube/auth/callback`
    );

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      state: state,
      prompt: 'consent' // Force consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code) {
    const { OAuth2Client } = require('google-auth-library');
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI || `${process.env.API_URL}/api/youtube/auth/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Get user's playlists
   */
  async getUserPlaylists(userId, maxResults = 50) {
    try {
      const oauth2Client = await this.getOAuth2Client(userId);
      
      // Check if token needs refresh and if refresh token is available
      const credentials = oauth2Client.credentials;
      if (credentials.expiry_date && credentials.expiry_date < Date.now()) {
        if (!credentials.refresh_token) {
          throw new Error('Access token expired and no refresh token available. Please reconnect your YouTube account.');
        }
      }
      
      const youtube = getGoogle().youtube({ version: 'v3', auth: oauth2Client });

      const response = await youtube.playlists.list({
        part: ['snippet', 'contentDetails'],
        mine: true,
        maxResults: maxResults
      });

      return response.data.items.map(playlist => ({
        id: playlist.id,
        title: playlist.snippet.title,
        description: playlist.snippet.description,
        thumbnail: playlist.snippet.thumbnails?.default?.url || null,
        itemCount: playlist.contentDetails.itemCount
      }));
    } catch (error) {
      logger.error('Error fetching playlists:', error);
      throw error;
    }
  }

  async getChannelInfo(userId) {
    try {
      if (!google) {
        google = require('googleapis').google;
      }
      const oauth2Client = await this.getOAuth2Client(userId);
      
      // Check if token needs refresh and if refresh token is available
      const credentials = oauth2Client.credentials;
      if (credentials.expiry_date && credentials.expiry_date < Date.now()) {
        if (!credentials.refresh_token) {
          throw new Error('Access token expired and no refresh token available. Please reconnect your YouTube account.');
        }
      }
      
      const youtube = getGoogle().youtube({ version: 'v3', auth: oauth2Client });

      const response = await youtube.channels.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        mine: true
      });

      if (response.data.items && response.data.items.length > 0) {
        return response.data.items[0];
      }

      throw new Error('No channel found');
    } catch (error) {
      logger.error('Error getting YouTube channel info:', error);
      throw error;
    }
  }

  /**
   * Upload video to YouTube
   */
  async uploadVideo(userId, videoData) {
    try {
      const {
        videoPath, // Local file path
        title,
        description,
        tags = [],
        categoryId = '22', // People & Blogs (default)
        privacyStatus = 'private', // 'private', 'unlisted', 'public'
        thumbnailPath = null
      } = videoData;

      if (!videoPath || !title) {
        throw new Error('Video path and title are required');
      }

      // Check if file exists
      if (!fs.existsSync(videoPath)) {
        throw new Error('Video file not found');
      }

      const oauth2Client = await this.getOAuth2Client(userId);
      const youtube = getGoogle().youtube({ version: 'v3', auth: oauth2Client });

      // Prepare video metadata
      const videoMetadata = {
        snippet: {
          title: title,
          description: description || '',
          tags: tags,
          categoryId: categoryId
        },
        status: {
          privacyStatus: privacyStatus,
          selfDeclaredMadeForKids: videoData.madeForKids || false
        }
      };

      // Upload video
      const videoSize = fs.statSync(videoPath).size;
      logger.info(`Uploading video: ${videoPath} (${videoSize} bytes)`);

      const response = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: videoMetadata,
        media: {
          body: fs.createReadStream(videoPath)
        }
      });

      const uploadedVideo = response.data;
      logger.info(`Video uploaded successfully: ${uploadedVideo.id}`);

      // Upload thumbnail if provided
      if (thumbnailPath && fs.existsSync(thumbnailPath)) {
        try {
          await youtube.thumbnails.set({
            videoId: uploadedVideo.id,
            media: {
              body: fs.createReadStream(thumbnailPath)
            }
          });
          logger.info(`Thumbnail uploaded for video: ${uploadedVideo.id}`);
        } catch (thumbnailError) {
          logger.warn('Failed to upload thumbnail:', thumbnailError);
          // Don't fail the whole operation if thumbnail fails
        }
      }

      // Add video to playlists if provided
      if (videoData.playlistIds && Array.isArray(videoData.playlistIds) && videoData.playlistIds.length > 0) {
        try {
          for (const playlistId of videoData.playlistIds) {
            await youtube.playlistItems.insert({
              part: ['snippet'],
              requestBody: {
                snippet: {
                  playlistId: playlistId,
                  resourceId: {
                    kind: 'youtube#video',
                    videoId: uploadedVideo.id
                  }
                }
              }
            });
            logger.info(`Video added to playlist: ${playlistId}`);
          }
        } catch (playlistError) {
          logger.warn('Failed to add video to playlists:', playlistError);
          // Don't fail the whole operation if playlist addition fails
        }
      }

      return {
        success: true,
        videoId: uploadedVideo.id,
        videoUrl: `https://www.youtube.com/watch?v=${uploadedVideo.id}`,
        title: uploadedVideo.snippet.title,
        description: uploadedVideo.snippet.description,
        privacyStatus: uploadedVideo.status.privacyStatus
      };
    } catch (error) {
      logger.error('Error uploading video to YouTube:', error);
      throw error;
    }
  }

  /**
   * Upload video from URL (downloads first, then uploads)
   * If URL is a relative path starting with /uploads/, reads directly from filesystem
   */
  async uploadVideoFromUrl(userId, videoUrl, videoData) {
    try {
      let videoPath;

      // Check if URL is a relative path to local file
      if (videoUrl.startsWith('/uploads/')) {
        // It's a local file path - read directly from filesystem
        videoPath = path.join(__dirname, '../..', videoUrl);
        logger.info(`Reading video from local path: ${videoPath}`);
        
        if (!fs.existsSync(videoPath)) {
          throw new Error(`Video file not found: ${videoPath}`);
        }
      } else {
        // It's a remote URL - download it
        const tempDir = path.join(__dirname, '../../uploads/temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFilePath = path.join(tempDir, `youtube_${Date.now()}.mp4`);

        // Download video
        logger.info(`Downloading video from URL: ${videoUrl}`);
        const response = await axios({
          method: 'GET',
          url: videoUrl.startsWith('http') 
            ? videoUrl 
            : `${process.env.API_BASE_URL || 'https://www.iqonga.org'}${videoUrl}`,
          responseType: 'stream'
        });

        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        logger.info(`Video downloaded to: ${tempFilePath}`);
        videoPath = tempFilePath;
      }

      try {
        // Upload to YouTube
        const result = await this.uploadVideo(userId, {
          ...videoData,
          videoPath: videoPath
        });

        // Clean up temp file only if it was downloaded (not if it was a local file)
        if (!videoUrl.startsWith('/uploads/') && fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }

        return result;
      } catch (uploadError) {
        // Clean up temp file on error (only if it was downloaded)
        if (!videoUrl.startsWith('/uploads/') && fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }
        throw uploadError;
      }
    } catch (error) {
      logger.error('Error uploading video from URL:', error);
      throw error;
    }
  }

  /**
   * Update video metadata
   */
  async updateVideo(userId, videoId, updates) {
    try {
      const oauth2Client = await this.getOAuth2Client(userId);
      const youtube = getGoogle().youtube({ version: 'v3', auth: oauth2Client });

      const video = await youtube.videos.list({
        part: ['snippet', 'status'],
        id: [videoId]
      });

      if (!video.data.items || video.data.items.length === 0) {
        throw new Error('Video not found');
      }

      const existingVideo = video.data.items[0];
      const updatedSnippet = {
        ...existingVideo.snippet,
        title: updates.title || existingVideo.snippet.title,
        description: updates.description || existingVideo.snippet.description,
        tags: updates.tags || existingVideo.snippet.tags
      };

      const updatedStatus = {
        ...existingVideo.status,
        privacyStatus: updates.privacyStatus || existingVideo.status.privacyStatus
      };

      const response = await youtube.videos.update({
        part: ['snippet', 'status'],
        requestBody: {
          id: videoId,
          snippet: updatedSnippet,
          status: updatedStatus
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error updating YouTube video:', error);
      throw error;
    }
  }

  /**
   * Delete video from YouTube
   */
  async deleteVideo(userId, videoId) {
    try {
      const oauth2Client = await this.getOAuth2Client(userId);
      const youtube = getGoogle().youtube({ version: 'v3', auth: oauth2Client });

      await youtube.videos.delete({
        id: videoId
      });

      return { success: true };
    } catch (error) {
      logger.error('Error deleting YouTube video:', error);
      throw error;
    }
  }

  /**
   * Get user's uploaded videos
   */
  async getUserVideos(userId, maxResults = 50) {
    try {
      const oauth2Client = await this.getOAuth2Client(userId);
      const youtube = getGoogle().youtube({ version: 'v3', auth: oauth2Client });

      const response = await youtube.search.list({
        part: ['snippet'],
        forMine: true,
        type: ['video'],
        maxResults: maxResults,
        order: 'date'
      });

      return response.data.items || [];
    } catch (error) {
      logger.error('Error getting user videos:', error);
      throw error;
    }
  }
}

module.exports = new YouTubeService();

