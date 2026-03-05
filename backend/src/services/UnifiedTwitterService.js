/**
 * UnifiedTwitterService
 * 
 * Hybrid approach: Use TwitterAPI.io for reads, Official Twitter API for writes
 * 
 * Benefits:
 * - Reads: Cost-effective, no user authentication needed, better rate limits
 * - Writes: User-friendly OAuth, no proxy/TOTP requirements, reliable
 */

const TwitterServiceModule = require('./TwitterService');
const TwitterService = TwitterServiceModule.TwitterService;
const TwitterAPIIOService = require('./TwitterAPIIOService');
const logger = require('../utils/logger');

class UnifiedTwitterService {
  /**
   * Unified Twitter Service - Hybrid Approach
   * 
   * Uses TwitterAPI.io for READ operations (cost-effective, no user auth needed)
   * Uses Official Twitter API for WRITE operations (user-friendly OAuth)
   * 
   * @param {string} userAccessToken - OAuth access token for Official Twitter API (for writes)
   * @param {string} twitterAPIIOKey - API key for TwitterAPI.io (for reads, platform-wide)
   * @param {string} refreshToken - Optional refresh token for Official Twitter API
   */
  constructor(userAccessToken = null, twitterAPIIOKey = null, refreshToken = null) {
    // Official Twitter API for WRITE operations (only if access token provided)
    if (userAccessToken) {
      this.twitterService = new TwitterService(userAccessToken, refreshToken);
      this.hasWriteAccess = true;
    } else {
      this.twitterService = null;
      this.hasWriteAccess = false;
      logger.warn('UnifiedTwitterService: No access token provided, write operations will not be available');
    }
    
    // TwitterAPI.io for READ operations (platform-wide API key)
    if (twitterAPIIOKey) {
      this.twitterAPIIO = new TwitterAPIIOService(twitterAPIIOKey);
      this.hasReadAccess = true;
    } else {
      // Fallback: try to get from env if not provided
      const apiKey = process.env.TWITTERAPIIO_API_KEY;
      if (apiKey) {
        this.twitterAPIIO = new TwitterAPIIOService(apiKey);
        this.hasReadAccess = true;
        logger.info('UnifiedTwitterService: Using TWITTERAPIIO_API_KEY from environment');
      } else {
        this.twitterAPIIO = null;
        this.hasReadAccess = false;
        logger.warn('UnifiedTwitterService: No TwitterAPI.io API key provided, read operations will not be available');
      }
    }
    
    logger.info('UnifiedTwitterService initialized', {
      hasOfficialAPI: this.hasWriteAccess,
      hasTwitterAPIIO: this.hasReadAccess,
      strategy: 'TwitterAPI.io for reads, Official API for writes'
    });
  }

  // ==========================================
  // WRITE OPERATIONS → Official Twitter API
  // ==========================================

  /**
   * Post a tweet
   * Uses Official Twitter API (OAuth)
   */
  async postTweet(content, mediaUrls = []) {
    if (!this.hasWriteAccess) {
      throw new Error('Write access not available. User must connect Twitter account via OAuth.');
    }
    logger.info('Posting tweet via Official Twitter API');
    return await this.twitterService.postTweet(content, mediaUrls);
  }

  /**
   * Reply to a tweet
   * Uses Official Twitter API (OAuth)
   */
  async replyToTweet(tweetId, content) {
    if (!this.hasWriteAccess) {
      throw new Error('Write access not available. User must connect Twitter account via OAuth.');
    }
    logger.info('Replying to tweet via Official Twitter API');
    return await this.twitterService.replyToTweet(tweetId, content);
  }

  /**
   * Upload media
   * Uses Official Twitter API (OAuth)
   */
  async uploadMedia(url) {
    return await this.twitterService.uploadMedia(url);
  }

  /**
   * Like a tweet
   * Uses Official Twitter API (OAuth)
   */
  async likeTweet(tweetId) {
    return await this.twitterService.likeTweet(tweetId);
  }

  /**
   * Retweet
   * Uses Official Twitter API (OAuth)
   */
  async retweet(tweetId) {
    return await this.twitterService.retweet(tweetId);
  }

  // ==========================================
  // READ OPERATIONS → TwitterAPI.io
  // ==========================================

  /**
   * Search tweets
   * Uses TwitterAPI.io (API key only, no login needed)
   */
  async searchTweets(query, options = {}) {
    if (!this.hasReadAccess) {
      throw new Error('Read access not available. TwitterAPI.io API key not configured.');
    }
    logger.info('Searching tweets via TwitterAPI.io', { query });
    return await this.twitterAPIIO.searchTweets(query, options);
  }

  /**
   * Get user profile
   * Uses TwitterAPI.io (API key only, no login needed)
   */
  async getUserProfile(username) {
    if (!this.hasReadAccess) {
      throw new Error('Read access not available. TwitterAPI.io API key not configured.');
    }
    logger.info('Getting user profile via TwitterAPI.io', { username });
    return await this.twitterAPIIO.getUserProfile(username);
  }

  /**
   * Get user timeline
   * Uses TwitterAPI.io (API key only, no login needed)
   */
  async getUserTimeline(username, options = {}) {
    if (!this.hasReadAccess) {
      throw new Error('Read access not available. TwitterAPI.io API key not configured.');
    }
    logger.info('Getting user timeline via TwitterAPI.io', { username });
    return await this.twitterAPIIO.getUserTimeline(username, options);
  }

  /**
   * Get mentions
   * Uses TwitterAPI.io (API key only, no login needed)
   */
  async getMentions(username, options = {}) {
    if (!this.hasReadAccess) {
      throw new Error('Read access not available. TwitterAPI.io API key not configured.');
    }
    logger.info('Getting mentions via TwitterAPI.io', { username });
    return await this.twitterAPIIO.getMentions(username, options);
  }

  /**
   * Get tweet by ID
   * Uses TwitterAPI.io (API key only, no login needed)
   */
  async getTweetById(tweetId) {
    if (!this.hasReadAccess) {
      throw new Error('Read access not available. TwitterAPI.io API key not configured.');
    }
    logger.info('Getting tweet by ID via TwitterAPI.io', { tweetId });
    return await this.twitterAPIIO.getTweetById(tweetId);
  }

  /**
   * Get tweet replies
   * Uses TwitterAPI.io (API key only, no login needed)
   */
  async getTweetReplies(tweetId, options = {}) {
    if (!this.hasReadAccess) {
      throw new Error('Read access not available. TwitterAPI.io API key not configured.');
    }
    logger.info('Getting tweet replies via TwitterAPI.io', { tweetId });
    return await this.twitterAPIIO.getTweetReplies(tweetId, options);
  }

  /**
   * Get recent mentions for authenticated user
   * Uses TwitterAPI.io (API key only, no login needed)
   * Note: Requires username - will get from Official API if available, otherwise use provided username
   */
  async getRecentMentions(maxResults = 50, username = null) {
    if (!this.hasReadAccess) {
      throw new Error('Read access not available. TwitterAPI.io API key not configured.');
    }
    
    // If username not provided and we have Official API access, get it
    if (!username && this.hasWriteAccess) {
      try {
        const me = await this.twitterService.client.v2.me();
        username = me.data.username;
        logger.info('Got username from Official API for mentions', { username });
      } catch (error) {
        logger.warn('Could not get username from Official API, using provided username', { error: error.message });
      }
    }
    
    if (!username) {
      throw new Error('Username required for getRecentMentions. Provide username parameter or ensure Official API access.');
    }
    
    logger.info('Getting recent mentions via TwitterAPI.io', { username, maxResults });
    return await this.twitterAPIIO.getMentions(username, { maxResults });
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Check which service is being used for an operation
   */
  getServiceInfo() {
    return {
      readOperations: 'TwitterAPI.io (API key only, no login needed)',
      writeOperations: 'Official Twitter API (OAuth, user-friendly)',
      benefits: {
        reads: [
          'Cost-effective',
          'No user authentication needed',
          'Better rate limits',
          'No proxy/TOTP requirements'
        ],
        writes: [
          'Standard OAuth flow',
          'No proxy needed',
          'No TOTP needed',
          'User-friendly setup'
        ]
      }
    };
  }
}

module.exports = UnifiedTwitterService;

