const { google } = require('googleapis');
const logger = require('../utils/logger');
const database = require('../database/connection');
const { decrypt } = require('../utils/encryption');
const fs = require('fs');
const path = require('path');

class GoogleDriveService {
  constructor() {
    // Support both service-specific and shared Google OAuth credentials
    this.clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'https://www.iqonga.org/api/google-drive/auth/callback';
    
    // Google Drive API scopes
    this.scopes = [
      'https://www.googleapis.com/auth/drive.file', // Access files created by the app
      'https://www.googleapis.com/auth/drive.readonly', // Read-only access
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];
  }

  /**
   * Create OAuth2 client
   */
  createOAuth2Client() {
    const clientId = this.clientId;
    const clientSecret = this.clientSecret;
    const redirectUri = this.redirectUri;
    
    if (!clientId || !clientSecret) {
      throw new Error('Google Drive OAuth credentials not configured. Please set GOOGLE_DRIVE_CLIENT_ID/GOOGLE_DRIVE_CLIENT_SECRET or GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in .env');
    }
    
    return new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(state) {
    const oauth2Client = this.createOAuth2Client();
    
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
  async getTokensFromCode(code) {
    try {
      const oauth2Client = this.createOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);
      
      return tokens;
    } catch (error) {
      logger.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Get OAuth2 client for a user
   */
  async getOAuth2Client(userId) {
    try {
      // Get user's Google Drive connection
      const connectionResult = await database.query(`
        SELECT access_token, refresh_token, expires_at
        FROM platform_connections
        WHERE user_id = $1 AND platform = 'google_drive' AND connection_status = 'active'
      `, [userId]);

      if (connectionResult.rows.length === 0) {
        throw new Error('Google Drive account not connected');
      }

      const connection = connectionResult.rows[0];
      const oauth2Client = this.createOAuth2Client();

      // Decrypt tokens
      const decryptedAccessToken = decrypt(connection.access_token);
      const decryptedRefreshToken = connection.refresh_token ? decrypt(connection.refresh_token) : null;

      // Set credentials
      const credentials = {
        access_token: decryptedAccessToken,
        expiry_date: connection.expires_at ? new Date(connection.expires_at).getTime() : null
      };

      if (decryptedRefreshToken && decryptedRefreshToken.trim() !== '') {
        credentials.refresh_token = decryptedRefreshToken;
      }

      oauth2Client.setCredentials(credentials);

      // Auto-refresh token if expired
      if (credentials.expiry_date && credentials.expiry_date < Date.now()) {
        if (decryptedRefreshToken) {
          try {
            const { credentials: newCredentials } = await oauth2Client.refreshAccessToken();
            
            // Update database with new tokens
            const { encrypt } = require('../utils/encryption');
            await database.query(`
              UPDATE platform_connections
              SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW()
              WHERE user_id = $4 AND platform = 'google_drive'
            `, [
              encrypt(newCredentials.access_token),
              newCredentials.refresh_token ? encrypt(newCredentials.refresh_token) : connection.refresh_token,
              newCredentials.expiry_date ? new Date(newCredentials.expiry_date) : null,
              userId
            ]);

            oauth2Client.setCredentials(newCredentials);
          } catch (refreshError) {
            logger.error('Failed to refresh Google Drive token:', refreshError);
            throw new Error('Failed to refresh access token. Please reconnect your Google Drive account.');
          }
        } else {
          throw new Error('Access token expired and no refresh token available. Please reconnect your Google Drive account.');
        }
      }

      return oauth2Client;
    } catch (error) {
      logger.error('Error getting OAuth2 client:', error);
      throw error;
    }
  }

  /**
   * Get Drive API client for a user
   */
  async getDriveClient(userId) {
    const oauth2Client = await this.getOAuth2Client(userId);
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(userId, filePath, fileName, mimeType, folderId = null) {
    try {
      const drive = await this.getDriveClient(userId);

      const fileMetadata = {
        name: fileName
      };

      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const media = {
        mimeType: mimeType,
        body: fs.createReadStream(filePath)
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink, size'
      });

      logger.info(`File uploaded to Google Drive: ${response.data.name} (${response.data.id})`);

      return {
        success: true,
        fileId: response.data.id,
        fileName: response.data.name,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
        size: response.data.size
      };
    } catch (error) {
      logger.error('Failed to upload file to Google Drive:', error);
      throw error;
    }
  }

  /**
   * Download file from Google Drive
   */
  async downloadFile(userId, fileId, destinationPath) {
    try {
      const drive = await this.getDriveClient(userId);

      const response = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, { responseType: 'stream' });

      const dest = fs.createWriteStream(destinationPath);
      response.data.pipe(dest);

      return new Promise((resolve, reject) => {
        dest.on('finish', () => {
          logger.info(`File downloaded from Google Drive: ${destinationPath}`);
          resolve(destinationPath);
        });
        dest.on('error', reject);
      });
    } catch (error) {
      logger.error('Failed to download file from Google Drive:', error);
      throw error;
    }
  }

  /**
   * List files in Google Drive
   */
  async listFiles(userId, folderId = null, mimeType = null, limit = 50) {
    try {
      const drive = await this.getDriveClient(userId);

      const query = [];
      if (folderId) {
        query.push(`'${folderId}' in parents`);
      }
      if (mimeType) {
        query.push(`mimeType = '${mimeType}'`);
      }

      const response = await drive.files.list({
        q: query.length > 0 ? query.join(' and ') : undefined,
        pageSize: limit,
        fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink)',
        orderBy: 'modifiedTime desc'
      });

      return {
        success: true,
        files: response.data.files || []
      };
    } catch (error) {
      logger.error('Failed to list Google Drive files:', error);
      throw error;
    }
  }

  /**
   * Create folder in Google Drive
   */
  async createFolder(userId, folderName, parentFolderId = null) {
    try {
      const drive = await this.getDriveClient(userId);

      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const response = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, webViewLink'
      });

      logger.info(`Folder created in Google Drive: ${response.data.name} (${response.data.id})`);

      return {
        success: true,
        folderId: response.data.id,
        folderName: response.data.name,
        webViewLink: response.data.webViewLink
      };
    } catch (error) {
      logger.error('Failed to create folder in Google Drive:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(userId, fileId) {
    try {
      const drive = await this.getDriveClient(userId);

      const response = await drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, parents'
      });

      return {
        success: true,
        file: response.data
      };
    } catch (error) {
      logger.error('Failed to get file metadata:', error);
      throw error;
    }
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(userId, fileId) {
    try {
      const drive = await this.getDriveClient(userId);

      await drive.files.delete({
        fileId: fileId
      });

      logger.info(`File deleted from Google Drive: ${fileId}`);

      return {
        success: true
      };
    } catch (error) {
      logger.error('Failed to delete file from Google Drive:', error);
      throw error;
    }
  }
}

module.exports = new GoogleDriveService();

