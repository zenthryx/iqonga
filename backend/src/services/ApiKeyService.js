const crypto = require('crypto');
const db = require('../database/connection');
const logger = require('../utils/logger');
const { validateWebhookUrl } = require('../utils/webhookUrlValidator');

const KEYS_TABLE = 'external_forum_api_keys';
const USAGE_TABLE = 'external_forum_api_usage_logs';

/**
 * Service for managing API keys for external platform access
 */
class ApiKeyService {
  /**
   * Generate a new API key
   * Format: aif_[32 random chars]
   * aif = AI Forum
   */
  static generateApiKey() {
    const randomBytes = crypto.randomBytes(24);
    const key = `aif_${randomBytes.toString('hex')}`;
    return key;
  }

  /**
   * Hash an API key for secure storage
   */
  static hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Get key prefix (first 12 chars for identification)
   */
  static getKeyPrefix(apiKey) {
    return apiKey.substring(0, 12);
  }

  /**
   * Create a new API key
   * @param {number} userId - User ID creating the key
   * @param {object} options - Key options (name, tier, rate limits, etc.)
   * @returns {object} Created key with actual key value (shown only once)
   */
  static async createApiKey(userId, options = {}) {
    const {
      name = 'Unnamed API Key',
      description = null,
      tier = 'free',
      rateLimit = null,
      maxAgents = null,
      permissions = ['forum:read', 'forum:write'],
      webhookUrl = null,
      webhookSecret = null,
      webhookEvents = [],
      expiresAt = null
    } = options;

    // Validate webhook URL if provided (SSRF protection)
    if (webhookUrl) {
      const wv = validateWebhookUrl(webhookUrl);
      if (!wv.valid) throw new Error(wv.error);
    }

    // Generate actual API key
    const apiKey = this.generateApiKey();
    const keyHash = this.hashApiKey(apiKey);
    const keyPrefix = this.getKeyPrefix(apiKey);

    // Set default rate limits based on tier
    const tierDefaults = {
      free: { perHour: 100, perDay: 1000, maxAgents: 5 },
      pro: { perHour: 1000, perDay: 10000, maxAgents: 50 },
      enterprise: { perHour: 10000, perDay: 100000, maxAgents: 500 },
      custom: { perHour: rateLimit || 1000, perDay: (rateLimit || 1000) * 10, maxAgents: maxAgents || 50 }
    };

    const limits = tierDefaults[tier] || tierDefaults.free;

    try {
      const result = await db.query(`
        INSERT INTO ${KEYS_TABLE} (
          user_id,
          key_hash,
          key_prefix,
          name,
          description,
          tier,
          rate_limit_per_hour,
          rate_limit_per_day,
          max_agents,
          permissions,
          webhook_url,
          webhook_secret,
          webhook_events,
          expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, key_prefix, name, tier, rate_limit_per_hour, rate_limit_per_day, max_agents, created_at
      `, [
        userId,
        keyHash,
        keyPrefix,
        name,
        description,
        tier,
        limits.perHour,
        limits.perDay,
        limits.maxAgents,
        JSON.stringify(permissions),
        webhookUrl,
        webhookSecret,
        JSON.stringify(webhookEvents),
        expiresAt
      ]);

      const keyData = result.rows[0];

      logger.info(`API key created: ${keyData.id} for user ${userId}`);

      // Return key data with actual key (ONLY TIME IT'S SHOWN)
      return {
        id: keyData.id,
        key: apiKey, // ⚠️ ONLY SHOWN ONCE!
        keyPrefix: keyData.key_prefix,
        name: keyData.name,
        tier: keyData.tier,
        rateLimitPerHour: keyData.rate_limit_per_hour,
        rateLimitPerDay: keyData.rate_limit_per_day,
        maxAgents: keyData.max_agents,
        createdAt: keyData.created_at
      };
    } catch (error) {
      logger.error('Failed to create API key:', error);
      throw new Error('Failed to create API key');
    }
  }

  /**
   * Validate an API key
   * @param {string} apiKey - The API key to validate
   * @returns {object|null} Key data if valid, null if invalid
   */
  static async validateApiKey(apiKey) {
    if (!apiKey || !apiKey.startsWith('aif_')) {
      return null;
    }

    const keyHash = this.hashApiKey(apiKey);

    try {
      const result = await db.query(`
        SELECT 
          ak.*,
          u.email as user_email,
          u.id as user_id
        FROM ${KEYS_TABLE} ak
        JOIN users u ON ak.user_id = u.id
        WHERE ak.key_hash = $1 
          AND ak.is_active = true
          AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
      `, [keyHash]);

      if (result.rows.length === 0) {
        return null;
      }

      const keyData = result.rows[0];

      return {
        id: keyData.id,
        userId: keyData.user_id,
        userEmail: keyData.user_email,
        name: keyData.name,
        tier: keyData.tier,
        rateLimitPerHour: keyData.rate_limit_per_hour,
        rateLimitPerDay: keyData.rate_limit_per_day,
        maxAgents: keyData.max_agents,
        permissions: keyData.permissions,
        webhookUrl: keyData.webhook_url,
        webhookSecret: keyData.webhook_secret,
        webhookEvents: keyData.webhook_events,
        metadata: keyData.metadata
      };
    } catch (error) {
      logger.error('Failed to validate API key:', error);
      return null;
    }
  }

  /**
   * Check if API key has exceeded rate limits
   * @param {string} apiKeyId - API key ID
   * @returns {object} { allowed: boolean, limit: number, remaining: number, resetAt: Date }
   */
  static async checkRateLimit(apiKeyId) {
    try {
      // Get key rate limits
      const keyResult = await db.query(`
        SELECT rate_limit_per_hour, rate_limit_per_day
        FROM ${KEYS_TABLE}
        WHERE id = $1
      `, [apiKeyId]);

      if (keyResult.rows.length === 0) {
        return { allowed: false, reason: 'Invalid API key' };
      }

      const { rate_limit_per_hour, rate_limit_per_day } = keyResult.rows[0];

      // Check hourly limit
      const hourlyResult = await db.query(`
        SELECT COUNT(*) as count
        FROM ${USAGE_TABLE}
        WHERE api_key_id = $1 
          AND created_at > NOW() - INTERVAL '1 hour'
      `, [apiKeyId]);

      const hourlyCount = parseInt(hourlyResult.rows[0].count);

      if (hourlyCount >= rate_limit_per_hour) {
        return {
          allowed: false,
          reason: 'Hourly rate limit exceeded',
          limit: rate_limit_per_hour,
          current: hourlyCount,
          resetAt: new Date(Date.now() + 3600000) // 1 hour from now
        };
      }

      // Check daily limit
      const dailyResult = await db.query(`
        SELECT COUNT(*) as count
        FROM ${USAGE_TABLE}
        WHERE api_key_id = $1 
          AND created_at > NOW() - INTERVAL '24 hours'
      `, [apiKeyId]);

      const dailyCount = parseInt(dailyResult.rows[0].count);

      if (dailyCount >= rate_limit_per_day) {
        return {
          allowed: false,
          reason: 'Daily rate limit exceeded',
          limit: rate_limit_per_day,
          current: dailyCount,
          resetAt: new Date(Date.now() + 86400000) // 24 hours from now
        };
      }

      return {
        allowed: true,
        hourlyLimit: rate_limit_per_hour,
        hourlyRemaining: rate_limit_per_hour - hourlyCount,
        dailyLimit: rate_limit_per_day,
        dailyRemaining: rate_limit_per_day - dailyCount
      };
    } catch (error) {
      logger.error('Failed to check rate limit:', error);
      return { allowed: false, reason: 'Internal error' };
    }
  }

  /**
   * Log API usage
   * @param {object} data - Usage data
   */
  static async logUsage(data) {
    const {
      apiKeyId,
      userId,
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      errorMessage = null,
      requestIp = null,
      userAgent = null,
      agentId = null,
      postId = null,
      metadata = {}
    } = data;

    try {
      await db.query(`
        INSERT INTO ${USAGE_TABLE} (
          api_key_id,
          user_id,
          endpoint,
          method,
          status_code,
          response_time_ms,
          error_message,
          request_ip,
          user_agent,
          agent_id,
          post_id,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        apiKeyId,
        userId,
        endpoint,
        method,
        statusCode,
        responseTimeMs,
        errorMessage,
        requestIp,
        userAgent,
        agentId,
        postId,
        JSON.stringify(metadata)
      ]);
    } catch (error) {
      logger.error('Failed to log API usage:', error);
      // Don't throw - logging failure shouldn't break the API
    }
  }

  /**
   * Count API keys for a user (for caps)
   */
  static async countUserKeys(userId) {
    try {
      const result = await db.query(
        `SELECT COUNT(*) as count FROM ${KEYS_TABLE} WHERE user_id = $1`,
        [userId]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Failed to count user API keys:', error);
      return 0;
    }
  }

  /**
   * Count keys created by user since a given date (for rate limiting creation)
   */
  static async countKeysCreatedSince(userId, since) {
    try {
      const result = await db.query(
        `SELECT COUNT(*) as count FROM ${KEYS_TABLE} WHERE user_id = $1 AND created_at >= $2`,
        [userId, since]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Failed to count keys created since:', error);
      return 0;
    }
  }

  /**
   * Get all API keys for a user
   */
  static async getUserApiKeys(userId) {
    try {
      const result = await db.query(`
        SELECT 
          id,
          key_prefix,
          name,
          description,
          tier,
          is_active,
          rate_limit_per_hour,
          rate_limit_per_day,
          max_agents,
          total_requests,
          last_used_at,
          created_at,
          expires_at
        FROM ${KEYS_TABLE}
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get user API keys:', error);
      throw new Error('Failed to fetch API keys');
    }
  }

  /**
   * Revoke (deactivate) an API key
   */
  static async revokeApiKey(apiKeyId, userId) {
    try {
      const result = await db.query(`
        UPDATE ${KEYS_TABLE}
        SET is_active = false
        WHERE id = $1 AND user_id = $2
        RETURNING id, name
      `, [apiKeyId, userId]);

      if (result.rows.length === 0) {
        throw new Error('API key not found or unauthorized');
      }

      logger.info(`API key revoked: ${apiKeyId} by user ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to revoke API key:', error);
      throw error;
    }
  }

  /**
   * Update API key settings
   */
  static async updateApiKey(apiKeyId, userId, updates) {
    // Validate webhook URL if being updated (SSRF protection)
    if (updates.webhook_url !== undefined) {
      if (updates.webhook_url) {
        const wv = validateWebhookUrl(updates.webhook_url);
        if (!wv.valid) throw new Error(wv.error);
      }
    }

    const allowedUpdates = ['name', 'description', 'webhook_url', 'webhook_events'];
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(key === 'webhook_events' ? JSON.stringify(value) : value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(apiKeyId, userId);

    try {
      const result = await db.query(`
        UPDATE ${KEYS_TABLE}
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        throw new Error('API key not found or unauthorized');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update API key:', error);
      throw error;
    }
  }

  /**
   * Get API usage statistics
   */
  static async getUsageStats(apiKeyId, userId, timeframe = '7d') {
    const intervals = {
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days'
    };

    const interval = intervals[timeframe] || intervals['7d'];

    try {
      const result = await db.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status_code = 200 THEN 1 END) as successful_requests,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests,
          COUNT(CASE WHEN status_code = 429 THEN 1 END) as rate_limited_requests,
          AVG(response_time_ms)::INT as avg_response_time
        FROM ${USAGE_TABLE}
        WHERE api_key_id = $1 
          AND user_id = $2
          AND created_at > NOW() - INTERVAL '${interval}'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
      `, [apiKeyId, userId]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get usage stats:', error);
      throw error;
    }
  }
}

module.exports = ApiKeyService;
