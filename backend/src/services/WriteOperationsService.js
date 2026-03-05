const database = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Service to check if write operations are allowed
 * Reads from system_config table
 */
class WriteOperationsService {
  constructor() {
    this.cache = {
      settings: null,
      lastFetch: null,
      cacheTTL: 60000 // Cache for 1 minute
    };
  }

  /**
   * Get write operations settings from database
   */
  async getSettings() {
    // Use cache if available and fresh
    const now = Date.now();
    if (this.cache.settings && this.cache.lastFetch && (now - this.cache.lastFetch) < this.cache.cacheTTL) {
      return this.cache.settings;
    }

    try {
      const result = await database.query(`
        SELECT config_key, config_value 
        FROM system_config 
        WHERE config_key IN (
          'write_operations_enabled',
          'write_operations_posts_enabled',
          'write_operations_replies_enabled',
          'write_operations_engagement_enabled',
          'write_operations_mentions_enabled'
        )
      `);

      const settings = {
        allEnabled: true,
        postsEnabled: true,
        repliesEnabled: false,
        engagementEnabled: false,
        mentionsEnabled: false
      };

      result.rows.forEach(row => {
        const value = row.config_value === 'true' || row.config_value === true;
        switch (row.config_key) {
          case 'write_operations_enabled':
            settings.allEnabled = value;
            break;
          case 'write_operations_posts_enabled':
            settings.postsEnabled = value;
            break;
          case 'write_operations_replies_enabled':
            settings.repliesEnabled = value;
            break;
          case 'write_operations_engagement_enabled':
            settings.engagementEnabled = value;
            break;
          case 'write_operations_mentions_enabled':
            settings.mentionsEnabled = value;
            break;
        }
      });

      // Update cache
      this.cache.settings = settings;
      this.cache.lastFetch = now;

      return settings;
    } catch (error) {
      logger.error('Failed to fetch write operations settings:', error);
      // Return default settings (all enabled) if query fails
      return {
        allEnabled: true,
        postsEnabled: true,
        repliesEnabled: false,
        engagementEnabled: false,
        mentionsEnabled: false
      };
    }
  }

  /**
   * Check if posts are allowed
   */
  async canPost() {
    const settings = await this.getSettings();
    return settings.allEnabled && settings.postsEnabled;
  }

  /**
   * Check if replies are allowed
   */
  async canReply() {
    const settings = await this.getSettings();
    return settings.allEnabled && settings.repliesEnabled;
  }

  /**
   * Check if engagement (topic-based replies) is allowed
   */
  async canEngage() {
    const settings = await this.getSettings();
    return settings.allEnabled && settings.engagementEnabled;
  }

  /**
   * Check if replying to mentions is allowed
   */
  async canReplyToMentions() {
    const settings = await this.getSettings();
    return settings.allEnabled && settings.mentionsEnabled;
  }

  /**
   * Clear cache (call this after updating settings)
   */
  clearCache() {
    this.cache.settings = null;
    this.cache.lastFetch = null;
  }
}

module.exports = new WriteOperationsService();

