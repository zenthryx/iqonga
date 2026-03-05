const axios = require('axios');
const logger = require('../utils/logger');

/**
 * TwitterAPI.io Service Wrapper
 * 
 * This service provides an interface to TwitterAPI.io, a third-party Twitter API
 * that offers higher rate limits and lower costs than the official Twitter API.
 * 
 * Documentation: https://docs.twitterapi.io/introduction
 * Pricing: $0.15/1K tweets, $0.18/1K profiles
 * Rate Limits: 1000+ req/sec
 */
class TwitterAPIIOService {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.TWITTERAPIIO_API_KEY;
    // TwitterAPI.io base URL - endpoints are at /twitter/ path
    this.baseUrl = options.baseUrl || process.env.TWITTERAPIIO_BASE_URL || 'https://api.twitterapi.io';
    this.username = options.username || null;
    this.password = options.password || null;
    this.sessionToken = null;
    this.lastRequestTime = 0;
    // QPS 20 = 1 request per 50ms (1000ms / 20 = 50ms between requests)
    // Set to 50ms to achieve 20 QPS (requests per second)
    this.minRequestInterval = parseInt(process.env.TWITTERAPIIO_RATE_LIMIT_MS || '50');
    
    if (!this.apiKey) {
      logger.warn('TwitterAPI.io API key not configured. Some features may not work.');
    } else {
      logger.info(`TwitterAPI.io service initialized with API key: ${this.apiKey.substring(0, 10)}...`);
      logger.info(`Base URL: ${this.baseUrl}`);
    }
  }

  /**
   * Rate limit helper - ensures minimum delay between requests
   */
  async waitForRateLimit() {
    // Skip if rate limit is 0 (no delay needed)
    if (this.minRequestInterval === 0) {
      return;
    }
    
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      logger.info(`Rate limit: waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Get request headers
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    // TwitterAPI.io uses x-api-key header, not Authorization Bearer
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    if (this.sessionToken) {
      headers['X-Session-Token'] = this.sessionToken;
    }

    return headers;
  }

  /**
   * Login with X/Twitter account credentials
   * Endpoint: POST /twitter/user_login_v2
   * Documentation: https://docs.twitterapi.io/api-reference/endpoint/user_login_v2
   * Note: This is required for write operations
   * 
   * Required parameters:
   * - user_name: Twitter username
   * - email: Email address
   * - password: Password
   * 
   * Optional but recommended:
   * - proxy: High-quality residential proxy (recommended for reliability)
   * - totp_secret: TOTP secret from authenticator app setup (recommended for reliability)
   * 
   * Note: According to docs, proxy and totp_secret are marked as required, but we'll try
   * without them first and let the API decide. Some accounts may work without them.
   * 
   * @param {string} username - Twitter username
   * @param {string} password - Twitter password
   * @param {string} email - Email address (required)
   * @param {string} proxy - Residential proxy URL (required) - format: http://username:password@ip:port
   * @param {string} totpSecret - TOTP secret from Twitter profile (required)
   * @param {string} twoFactorCode - 2FA code if required (optional)
   */
  async login(username, password, email = null, proxy = null, totpSecret = null, twoFactorCode = null) {
    await this.waitForRateLimit();
    
    try {
      // Remove @ if present
      const cleanUsername = username.replace('@', '');
      
      const loginData = {
        user_name: cleanUsername,  // Twitter username is the login identifier
        password: password
      };

      // Email is required by the API as a separate field
      // Note: According to TwitterAPI.io docs, both user_name and email are required
      // - user_name: Twitter username (this is the login identifier)
      // - email: Email address (separate required field, NOT the login ID)
      if (email) {
        loginData.email = email;
      } else {
        throw new Error('Email is required for login. Please provide email parameter.');
      }
      
      // Log what we're sending (without sensitive data)
      logger.info('Login request - identifiers being used:', {
        login_identifier: 'user_name (Twitter username)',
        user_name: cleanUsername,
        email_provided: email ? `${email.substring(0, 3)}***` : 'not provided',
        note: 'Using Twitter username as login ID, email is separate required field',
        has_proxy: !!proxy,
        has_totp_secret: !!totpSecret
      });

      // Proxy - Optional but recommended
      if (proxy) {
        loginData.proxy = proxy;
        logger.info('Using residential proxy for login');
      } else {
        logger.warn('No proxy provided. Login may fail or be less reliable. Consider using a residential proxy.');
        // Don't throw error - let API decide if proxy is truly required
      }
      
      // TOTP secret - Optional but recommended
      // This is the STATIC secret key (not the 6-digit code that changes every 30 seconds)
      if (totpSecret) {
        loginData.totp_secret = totpSecret;
      } else {
        logger.warn('No TOTP secret provided. Login may fail. TOTP secret is the static key from your authenticator app setup, not the 6-digit code.');
        // Don't throw error - let API decide if it's truly required
      }
      
      if (twoFactorCode) {
        loginData.totp_code = twoFactorCode;
      }

      const response = await axios.post(
        `${this.baseUrl}/twitter/user_login_v2`,
        loginData,
        { headers: this.getHeaders() }
      );

      // Check for error response from API
      // Note: We return the response even if it's an error, so the caller can check the status
      // This allows the test script to properly detect and report errors
      if (response.data.status === 'error' || response.data.status === 'failed') {
        const errorMessage = response.data.message || response.data.msg || 'Login failed';
        logger.error('TwitterAPI.io login returned error:', {
          status: response.data.status,
          message: errorMessage,
          data: response.data
        });
        
        // Provide helpful diagnostic information
        if (errorMessage.includes('authentication error') || errorMessage.includes('login failed')) {
          logger.warn('Authentication error - possible causes:', {
            checkUsername: 'Verify username is correct (without @)',
            checkPassword: 'Verify password is correct',
            checkEmail: 'Verify email matches Twitter account',
            checkTOTP: 'Verify TOTP secret is correct (static key, not 6-digit code)',
            checkProxy: 'Verify proxy format: http://user:pass@ip:port',
            checkAccount: 'Account may be locked or require additional verification'
          });
        }
        
        // Don't throw - return the error response so caller can check status
        // The caller (test script) will check response.status and handle accordingly
        return response.data;
      }

      // Response should contain login_cookie for authenticated requests
      if (response.data.login_cookie) {
        this.sessionToken = response.data.login_cookie;
        logger.info('Login successful, session token obtained');
        return response.data;
      }

      // If no login_cookie and no error status, still return the data
      // But log a warning
      if (!response.data.login_cookie) {
        logger.warn('Login response received but no login_cookie found:', response.data);
      }

      return response.data;
    } catch (error) {
      logger.error('TwitterAPI.io login failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      throw this.formatError(error);
    }
  }

  /**
   * Post a tweet
   * Endpoint: POST /tweet/create
   */
  async postTweet(text, options = {}) {
    try {
      await this.waitForRateLimit();
      
      const response = await axios.post(
        `${this.baseUrl}/twitter/tweet/create`,
        {
          text: text,
          media_ids: options.mediaIds || [],
          reply_to_tweet_id: options.replyToTweetId || null,
          quote_tweet_id: options.quoteTweetId || null
        },
        { headers: this.getHeaders() }
      );

      return {
        id: response.data.tweet_id,
        text: response.data.text,
        created_at: response.data.created_at
      };
    } catch (error) {
      logger.error('TwitterAPI.io postTweet failed:', error.response?.data || error.message);
      throw this.formatError(error);
    }
  }

  /**
   * Reply to a tweet
   * Endpoint: POST /tweet/reply
   */
  async replyToTweet(tweetId, text, options = {}) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/tweet/reply`,
        {
          tweet_id: tweetId,
          text: text,
          media_ids: options.mediaIds || []
        },
        { headers: this.getHeaders() }
      );

      return {
        id: response.data.tweet_id,
        text: response.data.text,
        created_at: response.data.created_at
      };
    } catch (error) {
      logger.error('TwitterAPI.io replyToTweet failed:', error.response?.data || error.message);
      throw this.formatError(error);
    }
  }

  /**
   * Search tweets
   * Endpoint: GET /twitter/tweet/advanced_search
   * Documentation: https://docs.twitterapi.io/api-reference/endpoint/tweet_advanced_search
   * Examples: https://github.com/igorbrigadir/twitter-advanced-search
   */
  async searchTweets(query, options = {}) {
    await this.waitForRateLimit();
    
    try {
      const params = {
        query: query,
        queryType: options.queryType || 'Latest' // Required: Latest, Top, etc.
      };

      // Add optional parameters if provided (only include non-null values)
      if (options.maxResults) {
        params.max_results = options.maxResults;
      }
      if (options.startTime) {
        params.start_time = options.startTime;
      }
      if (options.endTime) {
        params.end_time = options.endTime;
      }
      if (options.cursor) {
        params.cursor = options.cursor; // For pagination
      }

      // Use the correct endpoint from documentation: /twitter/tweet/advanced_search (with underscore)
      const response = await axios.get(
        `${this.baseUrl}/twitter/tweet/advanced_search`,
        {
          params: params,
          headers: this.getHeaders()
        }
      );

      // Response format: { tweets: [...], status: "success", msg: "..." }
      return response.data.tweets || response.data.data || [];
    } catch (error) {
      logger.error('TwitterAPI.io searchTweets failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      throw this.formatError(error);
    }
  }

  /**
   * Get user mentions
   * Note: TwitterAPI.io may not have a direct mentions endpoint
   * We'll use search with @username pattern as fallback
   */
  async getMentions(username, options = {}) {
    try {
      await this.waitForRateLimit();
      
      // Remove @ if present
      const cleanUsername = username.replace('@', '');
      
      // Try multiple endpoint patterns
      const endpoints = [
        `${this.baseUrl}/twitter/user/mentions`,
        `${this.baseUrl}/twitter/mentions`,
        `${this.baseUrl}/user/mentions`
      ];
      
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          const params = {
            username: cleanUsername,
            userName: cleanUsername, // Try both formats
            max_results: options.maxResults || 20
          };

          const response = await axios.get(endpoint, {
            params: params,
            headers: this.getHeaders()
          });

          // If we get a successful response, return it
          if (response.data) {
            logger.info(`TwitterAPI.io getMentions succeeded with endpoint: ${endpoint}`);
            return response.data.mentions || response.data.data || response.data || [];
          }
        } catch (endpointError) {
          lastError = endpointError;
          // If it's not a 404, throw immediately (auth errors, etc.)
          if (endpointError.response?.status !== 404) {
            throw endpointError;
          }
          // Continue to next endpoint if 404
          logger.warn(`TwitterAPI.io getMentions endpoint ${endpoint} returned 404, trying next...`);
        }
      }
      
      // If all endpoints failed, use search as fallback
      logger.warn(`All mentions endpoints failed, using search fallback for @${cleanUsername}`);
      return await this.searchTweets(`@${cleanUsername}`, { maxResults: options.maxResults || 20 });
      
    } catch (error) {
      // If search also fails, return empty array instead of throwing
      // This allows the system to continue functioning even if mentions can't be fetched
      logger.error('TwitterAPI.io getMentions failed, returning empty array:', error.response?.data || error.message);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Get user profile
   * Endpoint: GET /twitter/user/info
   * Documentation: https://docs.twitterapi.io/api-reference/endpoint/get_user_by_username
   */
  async getUserProfile(username) {
    await this.waitForRateLimit();
    
    try {
      // Remove @ if present
      const cleanUsername = username.replace('@', '');
      
      const response = await axios.get(
        `${this.baseUrl}/twitter/user/info`,
        {
          params: { userName: cleanUsername }, // Note: userName (camelCase) not username
          headers: this.getHeaders()
        }
      );

      // Response format: { data: {...}, status: "success", msg: "..." }
      return response.data.data || response.data;
    } catch (error) {
      logger.error('TwitterAPI.io getUserProfile failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      throw this.formatError(error);
    }
  }

  /**
   * Get user timeline
   * Endpoint: GET /user/last-tweets
   */
  async getUserTimeline(username, options = {}) {
    await this.waitForRateLimit();
    
    try {
      // Remove @ if present
      const cleanUsername = username.replace('@', '');
      
      const params = {
        userName: cleanUsername, // Note: userName (camelCase) not username
        max_results: options.maxResults || 50
      };

      const response = await axios.get(
        `${this.baseUrl}/twitter/user/last-tweets`,
        {
          params: params,
          headers: this.getHeaders()
        }
      );

      return response.data.tweets || response.data.data || [];
    } catch (error) {
      logger.error('TwitterAPI.io getUserTimeline failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw this.formatError(error);
    }
  }

  /**
   * Get tweet by ID
   * Endpoint: GET /tweet/by-ids
   */
  async getTweetById(tweetId) {
    try {
      await this.waitForRateLimit();
      
      const response = await axios.get(
        `${this.baseUrl}/twitter/tweets`,
        {
          params: { tweet_ids: tweetId }, // Comma-separated for multiple IDs
          headers: this.getHeaders()
        }
      );

      return response.data.tweets?.[0] || null;
    } catch (error) {
      logger.error('TwitterAPI.io getTweetById failed:', error.response?.data || error.message);
      throw this.formatError(error);
    }
  }

  /**
   * Get tweet replies
   * Endpoint: GET /tweet/replies
   */
  async getTweetReplies(tweetId, options = {}) {
    try {
      const params = {
        tweet_id: tweetId,
        max_results: options.maxResults || 50
      };

      const response = await axios.get(
        `${this.baseUrl}/tweet/replies`,
        {
          params: params,
          headers: this.getHeaders() }
      );

      return response.data.replies || [];
    } catch (error) {
      logger.error('TwitterAPI.io getTweetReplies failed:', error.response?.data || error.message);
      throw this.formatError(error);
    }
  }

  /**
   * Upload media
   * Endpoint: POST /media/upload
   */
  async uploadMedia(mediaUrl, mediaType = 'image') {
    try {
      const FormData = require('form-data');
      const fs = require('fs');
      const path = require('path');
      const https = require('https');
      const http = require('http');

      // Download media first
      const mediaResponse = await axios.get(mediaUrl, {
        responseType: 'arraybuffer'
      });

      // Create form data
      const formData = new FormData();
      const buffer = Buffer.from(mediaResponse.data);
      const ext = mediaType === 'image' ? 'jpg' : 'mp4';
      formData.append('media', buffer, {
        filename: `media.${ext}`,
        contentType: mediaResponse.headers['content-type'] || `image/${ext}`
      });

      const response = await axios.post(
        `${this.baseUrl}/media/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            ...this.getHeaders()
          }
        }
      );

      return response.data.media_id;
    } catch (error) {
      logger.error('TwitterAPI.io uploadMedia failed:', error.response?.data || error.message);
      throw this.formatError(error);
    }
  }

  /**
   * Like a tweet
   * Endpoint: POST /tweet/like
   */
  async likeTweet(tweetId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/tweet/like`,
        { tweet_id: tweetId },
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      logger.error('TwitterAPI.io likeTweet failed:', error.response?.data || error.message);
      throw this.formatError(error);
    }
  }

  /**
   * Retweet
   * Endpoint: POST /tweet/retweet
   */
  async retweet(tweetId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/tweet/retweet`,
        { tweet_id: tweetId },
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      logger.error('TwitterAPI.io retweet failed:', error.response?.data || error.message);
      throw this.formatError(error);
    }
  }

  /**
   * Format error for consistent error handling
   */
  formatError(error) {
    const formattedError = new Error(
      error.response?.data?.message || error.message || 'TwitterAPI.io request failed'
    );
    formattedError.code = error.response?.status || error.code;
    formattedError.rateLimit = error.response?.data?.rate_limit || null;
    formattedError.originalError = error;
    return formattedError;
  }
}

module.exports = TwitterAPIIOService;

