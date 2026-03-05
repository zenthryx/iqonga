const axios = require('axios');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

/**
 * Canva Service
 * Handles Canva API integration for accessing user designs and stock assets
 */
class CanvaService {
  constructor() {
    this.apiBaseUrl = 'https://api.canva.com/rest/v1';
    this.authUrl = 'https://www.canva.com/api/oauth/authorize';
    this.tokenUrl = 'https://api.canva.com/rest/v1/oauth/token';
    
    // Get from environment variables
    this.clientId = process.env.CANVA_CLIENT_ID;
    this.clientSecret = process.env.CANVA_CLIENT_SECRET;
    this.redirectUri = process.env.CANVA_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/canva/callback`;
    
    // Code verifier storage (in-memory, should use Redis in production)
    this.codeVerifiers = new Map();
    // State -> userId mapping for OAuth callback (since callback doesn't have auth token)
    this.stateToUserId = new Map();
  }

  /**
   * Check if Canva is configured
   */
  isConfigured() {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Generate OAuth authorization URL with PKCE
   */
  getAuthorizationUrl(userId, state = null) {
    if (!this.isConfigured()) {
      throw new Error('Canva integration is not configured. Please set CANVA_CLIENT_ID and CANVA_CLIENT_SECRET environment variables.');
    }

    // Validate Client ID format (Canva Client IDs typically start with 'OC-')
    if (!this.clientId.startsWith('OC-')) {
      logger.warn('Canva Client ID format may be incorrect', {
        clientIdPrefix: this.clientId.substring(0, 10)
      });
    }

    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    
    // Generate state with userId encoded (for callback identification)
    const oauthState = state || uuidv4();
    
    // Store code verifier and state mapping for later (in production, use Redis or database)
    this.codeVerifiers.set(userId, codeVerifier);
    this.stateToUserId.set(oauthState, userId);
    
    // Set timeout to clean up (5 minutes)
    setTimeout(() => {
      this.codeVerifiers.delete(userId);
      this.stateToUserId.delete(oauthState);
    }, 5 * 60 * 1000);
    
    // Canva uses specific scope format: design:content:read, design:content:write, etc.
    // Based on what's configured in Canva portal
    const scopes = [
      'design:content:read',
      'design:content:write',
      'design:meta:read',
      'asset:read',
      'asset:write',
      'folder:read'
    ].join(' ');
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: oauthState
    });

    const fullUrl = `${this.authUrl}?${params.toString()}`;
    
    logger.debug('Generated Canva OAuth URL', {
      userId,
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      urlLength: fullUrl.length
    });

    return fullUrl;
  }

  /**
   * Get userId from OAuth state
   */
  getUserIdFromState(state) {
    return this.stateToUserId.get(state) || null;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code, userId, state = null) {
    if (!this.isConfigured()) {
      throw new Error('Canva integration is not configured');
    }

    try {
      // If userId not provided, try to get from state
      if (!userId && state) {
        userId = this.getUserIdFromState(state);
        if (!userId) {
          throw new Error('Unable to identify user from OAuth state. Please restart the authorization flow.');
        }
      }

      if (!userId) {
        throw new Error('User ID is required for token exchange');
      }

      const codeVerifier = this.codeVerifiers.get(userId);
      if (!codeVerifier) {
        throw new Error('Code verifier not found. Please restart the authorization flow.');
      }

      // Clean up code verifier and state mapping
      this.codeVerifiers.delete(userId);
      if (state) {
        this.stateToUserId.delete(state);
      }
      
      // Canva OAuth token endpoint expects form-encoded data, not JSON
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        code_verifier: codeVerifier
      });

      const response = await axios.post(this.tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
          username: this.clientId,
          password: this.clientSecret
        }
      });

      const { access_token, refresh_token, expires_in } = response.data;

      // Store tokens securely
      await this.storeTokens(userId, {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000)
      });

      return { access_token, refresh_token };
    } catch (error) {
      logger.error('Failed to exchange code for token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get user's Canva designs
   */
  async getUserDesigns(userId, options = {}) {
    try {
      const token = await this.getAccessToken(userId);
      
      const params = {
        limit: options.limit || 50
      };
      
      // Remove null continuation from params
      if (options.continuation) {
        params.continuation = options.continuation;
      }

      logger.info('Fetching Canva designs', {
        userId,
        limit: params.limit,
        hasContinuation: !!params.continuation,
        apiUrl: `${this.apiBaseUrl}/designs`
      });

      const response = await axios.get(`${this.apiBaseUrl}/designs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params
      });

      // Log first design's structure to see what fields are available
      const firstDesign = response.data?.designs?.[0] || response.data?.data?.[0] || response.data?.items?.[0] || (Array.isArray(response.data) ? response.data[0] : null);
      
      logger.info('Canva designs API response', {
        userId,
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        responseType: typeof response.data,
        responseKeys: response.data ? Object.keys(response.data) : [],
        designsCount: response.data?.designs?.length || 0,
        hasContinuation: !!response.data?.continuation,
        firstDesignKeys: firstDesign ? Object.keys(firstDesign) : [],
        firstDesignSample: firstDesign ? JSON.stringify(firstDesign).substring(0, 500) : null,
        fullResponse: JSON.stringify(response.data).substring(0, 2000) // First 2000 chars for debugging
      });

      // Check if response structure is different
      let designs = [];
      let continuation = null;

      if (response.data) {
        // Try different possible response structures
        if (Array.isArray(response.data)) {
          designs = response.data;
        } else if (response.data.items) {
          // Canva API returns items array
          designs = response.data.items;
          continuation = response.data.continuation || null;
        } else if (response.data.designs) {
          designs = response.data.designs;
          continuation = response.data.continuation || null;
        } else if (response.data.data) {
          designs = Array.isArray(response.data.data) ? response.data.data : [];
          continuation = response.data.continuation || response.data.pagination?.continuation || null;
        }
      }

      // Normalize design structure - extract thumbnail.url to thumbnail_url for easier access
      designs = designs.map(design => ({
        ...design,
        thumbnail_url: design.thumbnail?.url || design.thumbnail_url,
        preview_url: design.preview?.url || design.preview_url,
        image_url: design.image?.url || design.image_url
      }));

      if (designs.length === 0) {
        logger.warn('No designs returned from Canva API', {
          userId,
          fullResponse: JSON.stringify(response.data),
          status: response.status
        });
      } else {
        // Log thumbnail URL availability in designs
        const designsWithThumbnails = designs.filter(d => 
          d.thumbnail_url || d.thumbnail || d.preview_url || d.image_url || d.url
        );
        logger.info('Designs thumbnail availability', {
          userId,
          totalDesigns: designs.length,
          withThumbnails: designsWithThumbnails.length,
          sampleDesign: designs[0] ? {
            id: designs[0].id,
            title: designs[0].title,
            keys: Object.keys(designs[0]),
            thumbnail_url: designs[0].thumbnail_url,
            thumbnail: designs[0].thumbnail,
            preview_url: designs[0].preview_url,
            image_url: designs[0].image_url,
            url: designs[0].url,
            share_url: designs[0].share_url
          } : null
        });
      }

      return {
        designs,
        continuation
      };
    } catch (error) {
      logger.error('Failed to get user designs:', {
        userId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url
      });
      throw error;
    }
  }

  /**
   * Get design details
   */
  async getDesignDetails(userId, designId) {
    try {
      const token = await this.getAccessToken(userId);
      
      const response = await axios.get(`${this.apiBaseUrl}/designs/${designId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Log full response to see what fields are available
      logger.info('Design details response', {
        userId,
        designId,
        status: response.status,
        responseKeys: Object.keys(response.data || {}),
        fullResponse: JSON.stringify(response.data).substring(0, 2000) // First 2000 chars
      });

      // Canva wraps design in 'design' key, extract it
      const design = response.data?.design || response.data;
      
      // Normalize structure - extract thumbnail.url to thumbnail_url
      if (design.thumbnail?.url) {
        design.thumbnail_url = design.thumbnail.url;
      }
      if (design.preview?.url) {
        design.preview_url = design.preview.url;
      }
      if (design.image?.url) {
        design.image_url = design.image.url;
      }

      return design;
    } catch (error) {
      logger.error('Failed to get design details:', {
        userId,
        designId,
        status: error.response?.status,
        errorData: error.response?.data,
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Export design (download as image/video)
   * Note: Canva API export endpoint may not be available. Falls back to thumbnail URL.
   */
  async exportDesign(userId, designId, format = 'png', thumbnailUrl = null) {
    try {
      const token = await this.getAccessToken(userId);
      
      // First, try to get design details to see if we have a thumbnail/preview URL
      let designDetails = null;
      try {
        designDetails = await this.getDesignDetails(userId, designId);
        
        // getDesignDetails now returns normalized design with thumbnail_url
        // Log all possible URL fields
        const urlFields = {
          thumbnail_url: designDetails?.thumbnail_url,
          preview_url: designDetails?.preview_url,
          image_url: designDetails?.image_url,
          url: designDetails?.url,
          share_url: designDetails?.share_url,
          embed_url: designDetails?.embed_url,
          download_url: designDetails?.download_url,
          view_url: designDetails?.urls?.view_url,
          edit_url: designDetails?.urls?.edit_url,
          thumbnail: designDetails?.thumbnail,
          preview: designDetails?.preview,
          image: designDetails?.image
        };
        
        logger.info('Got design details for export fallback', {
          userId,
          designId,
          urlFields,
          designKeys: Object.keys(designDetails || {}),
          hasThumbnailUrl: !!urlFields.thumbnail_url
        });
      } catch (detailError) {
        logger.warn('Could not get design details, will try export endpoint', {
          userId,
          designId,
          error: detailError.message
        });
      }

      // First, check available export formats (might give us hints about the endpoint)
      let availableFormats = null;
      try {
        const formatsResponse = await axios.get(
          `${this.apiBaseUrl}/designs/${designId}/export-formats`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        availableFormats = formatsResponse.data;
        logger.info('Got export formats', {
          userId,
          designId,
          formats: availableFormats
        });
      } catch (formatsError) {
        logger.warn('Could not get export formats', {
          userId,
          designId,
          error: formatsError.response?.data || formatsError.message
        });
      }

      // Try the export endpoint (may not be available in all Canva API versions)
      try {
        // Try different endpoint variations
        let exportResponse = null;
        let exportError = null;

        // Try 1: Standard endpoint
        try {
          exportResponse = await axios.post(
            `${this.apiBaseUrl}/designs/${designId}/exports`,
            {
              format: format, // 'png', 'jpg', 'pdf', 'mp4', etc.
              quality: 'high'
            },
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
        } catch (err1) {
          exportError = err1;
          logger.warn('Standard export endpoint failed, trying alternatives', {
            userId,
            designId,
            error: err1.response?.data || err1.message
          });

          // Try 2: Alternative endpoint structure
          try {
            exportResponse = await axios.post(
              `${this.apiBaseUrl}/exports`,
              {
                design_id: designId,
                format: format,
                quality: 'high'
              },
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
          } catch (err2) {
            logger.warn('Alternative export endpoint also failed', {
              userId,
              designId,
              error: err2.response?.data || err2.message
            });
            throw err1; // Throw original error
          }
        }

        if (!exportResponse) {
          throw exportError || new Error('Export endpoint not available');
        }

        const exportId = exportResponse.data.id;

        // Poll for export completion
        let exportStatus = 'processing';
        let attempts = 0;
        const maxAttempts = 30;

        while (exportStatus === 'processing' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

          const statusResponse = await axios.get(
            `${this.apiBaseUrl}/designs/${designId}/exports/${exportId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );

          exportStatus = statusResponse.data.status;

          if (exportStatus === 'completed') {
            return {
              downloadUrl: statusResponse.data.download_url,
              format: format,
              size: statusResponse.data.size
            };
          }

          attempts++;
        }

        throw new Error('Export timed out');
      } catch (exportError) {
        // Export endpoint not available, use thumbnail/preview as fallback
        logger.warn('Export endpoint failed, using thumbnail/preview URL as fallback', {
          userId,
          designId,
          error: exportError.response?.data || exportError.message
        });

        // Use thumbnail or preview URL as fallback
        // designDetails is now normalized with thumbnail_url already extracted
        // Priority: provided thumbnailUrl > normalized thumbnail_url > other URLs
        let fallbackUrl = thumbnailUrl ||
                           designDetails?.thumbnail_url || 
                           designDetails?.preview_url || 
                           designDetails?.image_url ||
                           designDetails?.urls?.view_url ||
                           designDetails?.urls?.edit_url ||
                           designDetails?.url ||
                           designDetails?.share_url ||
                           designDetails?.embed_url ||
                           designDetails?.download_url ||
                           // Fallback to nested structure if normalization didn't work
                           designDetails?.thumbnail?.url ||
                           designDetails?.preview?.url ||
                           designDetails?.image?.url;

        // If still no URL, try to get from designs list (if we have it cached)
        // Or try to construct a share URL
        if (!fallbackUrl) {
          // Try to get share URL by creating a share link
          try {
            logger.info('Attempting to create share URL for design', { userId, designId });
            const shareResponse = await axios.post(
              `${this.apiBaseUrl}/designs/${designId}/shares`,
              {
                access: 'public' // or 'private'
              },
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (shareResponse.data?.url || shareResponse.data?.share_url) {
              fallbackUrl = shareResponse.data.url || shareResponse.data.share_url;
              logger.info('Got share URL for design', { userId, designId, hasUrl: !!fallbackUrl });
            }
          } catch (shareError) {
            logger.warn('Could not create share URL', {
              userId,
              designId,
              error: shareError.response?.data || shareError.message
            });
          }
        }

        // Last resort: Try constructing a Canva design URL (may not be downloadable)
        if (!fallbackUrl) {
          // Canva design URLs are typically: https://www.canva.com/design/{designId}/view
          // But this won't be directly downloadable
          logger.warn('No fallback URL available, export not possible', {
            userId,
            designId,
            thumbnailUrl,
            designDetailsKeys: designDetails ? Object.keys(designDetails) : [],
            designDetailsSample: designDetails ? JSON.stringify(designDetails).substring(0, 500) : null
          });
        }

        if (fallbackUrl) {
          logger.info('Using thumbnail/preview/share URL as export fallback', {
            userId,
            designId,
            urlType: thumbnailUrl ? 'provided' : (designDetails?.share_url ? 'share' : 'thumbnail'),
            url: fallbackUrl.substring(0, 100) // Log first 100 chars
          });
          
          return {
            downloadUrl: fallbackUrl,
            format: format,
            size: null, // Size unknown for thumbnail
            isThumbnail: true // Flag to indicate this is a thumbnail, not full export
          };
        }

        // If no fallback available, throw the original error
        throw new Error(`Export not available and no thumbnail/share URL found. ${exportError.response?.data?.message || exportError.message}`);
      }
    } catch (error) {
      logger.error('Failed to export design:', {
        userId,
        designId,
        format,
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  /**
   * Search Canva stock assets
   */
  async searchStockAssets(userId, query, options = {}) {
    try {
      const token = await this.getAccessToken(userId);
      
      // Canva API uses different endpoints for stock assets
      // Try the content library endpoint first
      const params = {
        query,
        type: options.type || 'image', // 'image', 'video', 'audio'
        limit: options.limit || 20
      };

      // Try multiple possible endpoints
      let response;
      let error;
      
      // Try 1: /assets/search (original)
      try {
        response = await axios.get(`${this.apiBaseUrl}/assets/search`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params
        });
        
        if (response.data && (response.data.assets || response.data.data)) {
          return response.data.assets || response.data.data || [];
        }
      } catch (err) {
        error = err;
        logger.warn('Stock search endpoint /assets/search failed, trying alternatives:', err.response?.status);
      }

      // Try 2: /content-library/search
      try {
        response = await axios.get(`${this.apiBaseUrl}/content-library/search`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params
        });
        
        if (response.data && (response.data.assets || response.data.data || response.data.items)) {
          return response.data.assets || response.data.data || response.data.items || [];
        }
      } catch (err) {
        logger.warn('Stock search endpoint /content-library/search failed:', err.response?.status);
      }

      // Try 3: /assets (without /search)
      try {
        response = await axios.get(`${this.apiBaseUrl}/assets`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: {
            ...params,
            search: query // Some APIs use 'search' instead of 'query'
          }
        });
        
        if (response.data && (response.data.assets || response.data.data || Array.isArray(response.data))) {
          return response.data.assets || response.data.data || response.data || [];
        }
      } catch (err) {
        logger.warn('Stock search endpoint /assets failed:', err.response?.status);
      }

      // If all endpoints fail, return empty array with a warning
      logger.warn('All stock asset search endpoints failed. Canva API may not support stock asset search, or endpoint has changed.');
      logger.warn('Last error:', error?.response?.data || error?.message);
      
      // Return empty array instead of throwing error
      return [];
      
    } catch (error) {
      logger.error('Failed to search stock assets:', error.response?.data || error.message);
      // Return empty array instead of throwing to allow UI to continue
      return [];
    }
  }

  /**
   * Upload asset to user's Canva library
   */
  async uploadAsset(userId, filePath, metadata = {}) {
    try {
      const token = await this.getAccessToken(userId);
      
      // First, request upload URL
      const uploadRequest = await axios.post(
        `${this.apiBaseUrl}/assets`,
        {
          name: metadata.name || path.basename(filePath),
          type: metadata.type || 'image'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const uploadUrl = uploadRequest.data.upload_url;

      // Upload file to Canva
      const fileBuffer = await fsPromises.readFile(filePath);
      await axios.put(uploadUrl, fileBuffer, {
        headers: {
          'Content-Type': metadata.mimeType || 'image/png'
        }
      });

      return uploadRequest.data;
    } catch (error) {
      logger.error('Failed to upload asset:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get access token (with refresh if needed)
   */
  async getAccessToken(userId) {
    const tokens = await this.getStoredTokens(userId);
    
    if (!tokens) {
      throw new Error('Canva not connected. Please connect your Canva account.');
    }

    // Check if token is expired
    if (new Date() >= tokens.expiresAt) {
      // Refresh token
      return await this.refreshAccessToken(userId, tokens.refreshToken);
    }

    return tokens.accessToken;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(userId, refreshToken) {
    try {
      // Canva OAuth token endpoint expects form-encoded data, not JSON
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId
      });

      const response = await axios.post(this.tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
          username: this.clientId,
          password: this.clientSecret
        }
      });

      const { access_token, expires_in } = response.data;

      await this.updateTokens(userId, {
        accessToken: access_token,
        expiresAt: new Date(Date.now() + expires_in * 1000)
      });

      return access_token;
    } catch (error) {
      logger.error('Failed to refresh token:', error.response?.data || error.message);
      // Token might be invalid, user needs to reconnect
      await this.disconnectCanva(userId);
      throw new Error('Canva session expired. Please reconnect your account.');
    }
  }

  /**
   * Store tokens securely
   */
  async storeTokens(userId, tokens) {
    // In production, encrypt tokens before storing
    // For now, store as-is (encryption should be added)
    
    await database.query(`
      INSERT INTO canva_integrations (user_id, access_token, refresh_token, expires_at, is_active, created_at)
      VALUES ($1, $2, $3, $4, TRUE, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        access_token = $2,
        refresh_token = $3,
        expires_at = $4,
        is_active = TRUE,
        updated_at = NOW()
    `, [userId, tokens.accessToken, tokens.refreshToken, tokens.expiresAt]);
    
    logger.info('Canva tokens stored successfully', { userId });
  }

  /**
   * Get stored tokens
   */
  async getStoredTokens(userId) {
    const result = await database.query(`
      SELECT access_token, refresh_token, expires_at
      FROM canva_integrations
      WHERE user_id = $1 AND is_active = TRUE
    `, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: new Date(row.expires_at)
    };
  }

  /**
   * Update tokens
   */
  async updateTokens(userId, tokens) {
    await database.query(`
      UPDATE canva_integrations
      SET access_token = $1, expires_at = $2, updated_at = NOW()
      WHERE user_id = $3
    `, [tokens.accessToken, tokens.expiresAt, userId]);
  }

  /**
   * Disconnect Canva
   */
  async disconnectCanva(userId) {
    await database.query(`
      UPDATE canva_integrations
      SET is_active = FALSE, updated_at = NOW()
      WHERE user_id = $1
    `, [userId]);
  }

  /**
   * Check if user has Canva connected
   */
  async isConnected(userId) {
    const tokens = await this.getStoredTokens(userId);
    return !!tokens;
  }

  /**
   * PKCE helpers
   */
  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  generateCodeChallenge(verifier) {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }
}

module.exports = new CanvaService();
