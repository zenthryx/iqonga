const db = require('../database/connection');
const logger = require('../utils/logger');

const SNAPSHOT_LIMIT = 50;

const KeywordRepository = {
  async getActiveMonitors() {
    const result = await db.query(
      `SELECT * FROM keyword_monitors WHERE is_active = TRUE ORDER BY created_at DESC`,
    );
    return result.rows;
  },

  async getMonitorsByUser(userId) {
    const result = await db.query(
      `SELECT * FROM keyword_monitors WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows;
  },

  async getMonitorById(id, userId) {
    const result = await db.query(
      `SELECT * FROM keyword_monitors WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return result.rows[0] || null;
  },

  async createMonitor(userId, payload) {
    const {
      keyword,
      monitor_type = 'keyword',
      platform = 'twitter',
      sentiment_threshold = 5.0,
      mention_spike_threshold = 5,
      track_influencers = true,
      influencer_handles = [],
      monitoring_frequency = '15min',
      exclude_keywords = [],
      auto_post_enabled = false,
      post_channels = [],
      content_style = 'professional',
      tags = [],
      notes = null,
      collection_id = null,
    } = payload;

    const result = await db.query(
      `INSERT INTO keyword_monitors
        (user_id, keyword, monitor_type, platform, sentiment_threshold, mention_spike_threshold,
         track_influencers, influencer_handles, monitoring_frequency, exclude_keywords,
         auto_post_enabled, post_channels, content_style, tags, notes, collection_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        userId,
        keyword,
        monitor_type,
        platform,
        sentiment_threshold,
        mention_spike_threshold,
        track_influencers,
        influencer_handles,
        monitoring_frequency,
        exclude_keywords,
        auto_post_enabled,
        post_channels,
        content_style,
        tags,
        notes,
        collection_id,
      ],
    );
    return result.rows[0];
  },

  async updateMonitor(id, userId, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = $${idx++}`);
      values.push(value);
    });

    if (!fields.length) return this.getMonitorById(id, userId);

    values.push(id);
    values.push(userId);

    const result = await db.query(
      `UPDATE keyword_monitors
         SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx++} AND user_id = $${idx}
       RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  },

  async setMonitorActive(id, userId, isActive) {
    const result = await db.query(
      `UPDATE keyword_monitors
         SET is_active = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [isActive, id, userId],
    );
    return result.rows[0] || null;
  },

  async deleteMonitor(id, userId) {
    const result = await db.query(
      `DELETE FROM keyword_monitors WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId],
    );
    return result.rows[0] || null;
  },

  async insertSnapshot(monitorId, snapshotData) {
    const {
      keyword,
      sentiment_score,
      mention_count = 0,
      positive_count = 0,
      negative_count = 0,
      neutral_count = 0,
      total_likes = 0,
      total_retweets = 0,
      total_replies = 0,
      total_views = 0,
      engagement_rate = 0.00,
      trending_phrases = [],
      related_keywords = [],
      influencer_mentions = 0,
      top_influencer_sentiment = null,
      top_influencers = [],
      top_locations = [],
      sample_posts = [],
      raw_data = {},
    } = snapshotData;

    const result = await db.query(
      `INSERT INTO keyword_snapshots
        (monitor_id, keyword, sentiment_score, mention_count, positive_count, negative_count, neutral_count,
         total_likes, total_retweets, total_replies, total_views, engagement_rate,
         trending_phrases, related_keywords, influencer_mentions, top_influencer_sentiment,
         top_influencers, top_locations, sample_posts, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`,
      [
        monitorId,
        keyword,
        sentiment_score,
        mention_count,
        positive_count,
        negative_count,
        neutral_count,
        total_likes,
        total_retweets,
        total_replies,
        total_views,
        engagement_rate,
        trending_phrases,
        related_keywords,
        influencer_mentions,
        top_influencer_sentiment,
        JSON.stringify(top_influencers),
        top_locations,
        JSON.stringify(sample_posts),
        JSON.stringify(raw_data),
      ],
    );
    return result.rows[0];
  },

  async getRecentSnapshots(monitorId, limit = SNAPSHOT_LIMIT) {
    const result = await db.query(
      `SELECT * FROM keyword_snapshots
       WHERE monitor_id = $1
       ORDER BY snapshot_time DESC
       LIMIT $2`,
      [monitorId, limit],
    );
    return result.rows;
  },

  async getSnapshotsByDateRange(monitorId, startDate, endDate) {
    const result = await db.query(
      `SELECT * FROM keyword_snapshots
       WHERE monitor_id = $1
         AND snapshot_time >= $2
         AND snapshot_time <= $3
       ORDER BY snapshot_time ASC`,
      [monitorId, startDate, endDate],
    );
    return result.rows;
  },

  async insertAlert(alertData) {
    const {
      monitor_id,
      user_id,
      alert_type,
      severity = 'medium',
      title,
      message,
      data = {},
      previous_value = null,
      current_value = null,
      change_percent = null,
      channels_sent = [],
      content_generated_id = null,
    } = alertData;

    const result = await db.query(
      `INSERT INTO keyword_alerts
        (monitor_id, user_id, alert_type, severity, title, message, data,
         previous_value, current_value, change_percent, channels_sent, content_generated_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        monitor_id,
        user_id,
        alert_type,
        severity,
        title,
        message,
        JSON.stringify(data),
        previous_value,
        current_value,
        change_percent,
        channels_sent,
        content_generated_id,
      ],
    );
    return result.rows[0];
  },

  async getAlertsByUser(userId, limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT ka.*, km.keyword, km.monitor_type
       FROM keyword_alerts ka
       INNER JOIN keyword_monitors km ON ka.monitor_id = km.id
       WHERE ka.user_id = $1
       ORDER BY ka.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return result.rows;
  },

  async getUnreadAlertsCount(userId) {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM keyword_alerts WHERE user_id = $1 AND is_read = FALSE`,
      [userId],
    );
    return parseInt(result.rows[0].count, 10);
  },

  async markAlertAsRead(alertId, userId) {
    const result = await db.query(
      `UPDATE keyword_alerts
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [alertId, userId],
    );
    return result.rows[0] || null;
  },

  async insertUsage(userId, usageData) {
    const {
      operation_type,
      tokens_used = 0,
      api_calls = 1,
      grok_model = null,
      sources_used = 0,
      estimated_cost_usd = null,
      credits_deducted = 0,
      monitor_id = null,
      keyword = null,
    } = usageData;

    const result = await db.query(
      `INSERT INTO keyword_api_usage
        (user_id, operation_type, tokens_used, api_calls, grok_model, sources_used,
         estimated_cost_usd, credits_deducted, monitor_id, keyword)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        operation_type,
        tokens_used,
        api_calls,
        grok_model,
        sources_used,
        estimated_cost_usd,
        credits_deducted,
        monitor_id,
        keyword,
      ],
    );
    return result.rows[0];
  },

  async getUsageSummary(userId, startDate = null, endDate = null) {
    let query = `
      SELECT 
        operation_type,
        COUNT(*) as operation_count,
        SUM(api_calls) as total_api_calls,
        SUM(tokens_used) as total_tokens,
        SUM(credits_deducted) as total_credits
      FROM keyword_api_usage
      WHERE user_id = $1
    `;
    const params = [userId];

    if (startDate) {
      query += ` AND created_at >= $${params.length + 1}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` GROUP BY operation_type ORDER BY total_credits DESC`;

    const result = await db.query(query, params);
    return result.rows;
  },

  // Collection management
  async createCollection(userId, payload) {
    const { name, description = null, color = null, tags = [] } = payload;

    const result = await db.query(
      `INSERT INTO keyword_collections (user_id, name, description, color, tags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, name, description, color, tags],
    );
    return result.rows[0];
  },

  async getCollectionsByUser(userId) {
    const result = await db.query(
      `SELECT * FROM keyword_collections WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows;
  },

  async getCollectionById(id, userId) {
    const result = await db.query(
      `SELECT * FROM keyword_collections WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return result.rows[0] || null;
  },

  async updateCollection(id, userId, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = $${idx++}`);
      values.push(value);
    });

    if (!fields.length) return this.getCollectionById(id, userId);

    values.push(id);
    values.push(userId);

    const result = await db.query(
      `UPDATE keyword_collections
         SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx++} AND user_id = $${idx}
       RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  },

  async deleteCollection(id, userId) {
    const result = await db.query(
      `DELETE FROM keyword_collections WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId],
    );
    return result.rows[0] || null;
  },

  // Research management
  async saveResearch(userId, payload) {
    const {
      research_type,
      query,
      platform = 'twitter',
      results = {},
      trending_keywords = [],
      related_keywords = [],
      suggested_hashtags = [],
      competitor_keywords = [],
      search_volume = null,
      competition_level = null,
      trend_direction = null,
      notes = null,
      saved = false,
    } = payload;

    const result = await db.query(
      `INSERT INTO keyword_research
        (user_id, research_type, query, platform, results, trending_keywords, related_keywords,
         suggested_hashtags, competitor_keywords, search_volume, competition_level,
         trend_direction, notes, saved)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        userId,
        research_type,
        query,
        platform,
        JSON.stringify(results),
        trending_keywords,
        related_keywords,
        suggested_hashtags,
        competitor_keywords,
        search_volume,
        competition_level,
        trend_direction,
        notes,
        saved,
      ],
    );
    return result.rows[0];
  },

  async getSavedResearch(userId, limit = 50) {
    const result = await db.query(
      `SELECT * FROM keyword_research
       WHERE user_id = $1 AND saved = TRUE
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit],
    );
    return result.rows;
  },
};

module.exports = KeywordRepository;

