const db = require('../database/connection');
const logger = require('../utils/logger');

const SNAPSHOT_LIMIT = 50;

const CryptoRepository = {
  async getActiveMonitors() {
    const result = await db.query(
      `SELECT * FROM crypto_monitors WHERE is_active = TRUE ORDER BY created_at DESC`,
    );
    return result.rows;
  },

  async getMonitorsByUser(userId) {
    const result = await db.query(
      `SELECT * FROM crypto_monitors WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows;
  },

  async getMonitorById(id, userId) {
    const result = await db.query(
      `SELECT * FROM crypto_monitors WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return result.rows[0] || null;
  },

  async createMonitor(userId, payload) {
    const {
      token_symbol,
      token_name,
      sentiment_threshold = 5.0,
      mention_spike_threshold = 5,
      track_influencers = true,
      influencer_handles = [],
      auto_post_enabled = false,
      post_channels = [],
      content_style = 'professional',
    } = payload;

    const result = await db.query(
      `INSERT INTO crypto_monitors
        (user_id, token_symbol, token_name, sentiment_threshold, mention_spike_threshold,
         track_influencers, influencer_handles, auto_post_enabled, post_channels, content_style)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        userId,
        token_symbol,
        token_name,
        sentiment_threshold,
        mention_spike_threshold,
        track_influencers,
        influencer_handles,
        auto_post_enabled,
        post_channels,
        content_style,
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
      `UPDATE crypto_monitors
         SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx++} AND user_id = $${idx}
       RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  },

  async setMonitorActive(id, userId, isActive) {
    const result = await db.query(
      `UPDATE crypto_monitors
         SET is_active = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [isActive, id, userId],
    );
    return result.rows[0] || null;
  },

  async deleteMonitor(id, userId) {
    const result = await db.query(
      `DELETE FROM crypto_monitors
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId],
    );
    return result.rows[0] || null;
  },

  async insertSnapshot(monitorId, snapshot) {
    const result = await db.query(
      `INSERT INTO sentiment_snapshots
        (monitor_id, token_symbol, sentiment_score, mention_count, positive_count,
         negative_count, neutral_count, market_moving_phrases, influencer_mentions, top_influencer_sentiment)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        monitorId,
        snapshot.token || snapshot.token_symbol,
        snapshot.score,
        snapshot.mentionCount,
        snapshot.positiveMentions,
        snapshot.negativeMentions,
        snapshot.neutralMentions,
        snapshot.keyPhrases,
        snapshot.influencerActivity?.count || 0,
        snapshot.influencerActivity?.sentiment || 'neutral',
      ],
    );
    return result.rows[0];
  },

  async getRecentSnapshots(monitorId, limit = SNAPSHOT_LIMIT) {
    const result = await db.query(
      `SELECT * FROM sentiment_snapshots
         WHERE monitor_id = $1
         ORDER BY snapshot_time DESC
         LIMIT $2`,
      [monitorId, limit],
    );
    return result.rows;
  },

  async getLatestSnapshotForToken(userId, tokenSymbol) {
    const result = await db.query(
      `SELECT s.*
         FROM sentiment_snapshots s
         JOIN crypto_monitors m ON m.id = s.monitor_id
        WHERE m.user_id = $1 AND s.token_symbol = $2
        ORDER BY s.snapshot_time DESC
        LIMIT 1`,
      [userId, tokenSymbol],
    );
    return result.rows[0] || null;
  },

  async listAlerts(userId, limit = 50) {
    const result = await db.query(
      `SELECT 
        ca.*,
        cm.token_symbol
      FROM crypto_alerts ca
      LEFT JOIN crypto_monitors cm ON ca.monitor_id = cm.id
      WHERE ca.user_id = $1
      ORDER BY ca.created_at DESC
      LIMIT $2`,
      [userId, limit],
    );
    return result.rows;
  },

  async markAlertRead(userId, alertId) {
    const result = await db.query(
      `UPDATE crypto_alerts
         SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [alertId, userId],
    );
    return result.rows[0] || null;
  },

  async insertAlert(userId, monitorId, alert) {
    const result = await db.query(
      `INSERT INTO crypto_alerts
        (user_id, monitor_id, alert_type, severity, title, message, data, channels_sent, content_generated_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        userId,
        monitorId,
        alert.type,
        alert.severity,
        alert.title,
        alert.message,
        alert.data || {},
        alert.channels_sent || [],
        alert.content_generated_id || null,
      ],
    );
    return result.rows[0];
  },

  async insertUsage(userId, payload) {
    const {
      operation_type,
      tokens_used = 0,
      api_calls = 1,
      grok_model = null,
      sources_used = 0,
      estimated_cost_usd = null,
      credits_deducted = null,
    } = payload;

    const result = await db.query(
      `INSERT INTO crypto_api_usage
        (user_id, operation_type, tokens_used, api_calls, grok_model, sources_used, estimated_cost_usd, credits_deducted)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
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
      ],
    );
    return result.rows[0];
  },

  async getUsageSummary(userId, period = 'month') {
    const window =
      period === 'week'
        ? "NOW() - INTERVAL '7 days'"
        : period === 'day'
        ? "NOW() - INTERVAL '1 day'"
        : "NOW() - INTERVAL '30 days'";

    const summaryQuery = `
      SELECT
        COUNT(*) AS total_operations,
        SUM(api_calls) AS total_calls,
        SUM(credits_deducted) AS credits_used,
        SUM(estimated_cost_usd) AS estimated_cost
      FROM crypto_api_usage
      WHERE user_id = $1 AND created_at >= ${window}
    `;

    const perOpQuery = `
      SELECT operation_type, COUNT(*) AS ops, SUM(api_calls) AS calls, SUM(credits_deducted) AS credits
      FROM crypto_api_usage
      WHERE user_id = $1 AND created_at >= ${window}
      GROUP BY operation_type
    `;

    const [summary, perOp] = await Promise.all([
      db.query(summaryQuery, [userId]),
      db.query(perOpQuery, [userId]),
    ]);

    return {
      total_operations: Number(summary.rows[0]?.total_operations || 0),
      total_calls: Number(summary.rows[0]?.total_calls || 0),
      credits_used: Number(summary.rows[0]?.credits_used || 0),
      estimated_cost: Number(summary.rows[0]?.estimated_cost || 0),
      by_operation: perOp.rows || [],
    };
  },
};

module.exports = CryptoRepository;

