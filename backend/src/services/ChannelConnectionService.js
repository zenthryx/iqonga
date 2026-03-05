/**
 * ChannelConnectionService – CRUD for AI Assistant channel connections.
 * Resolves (channel, channel_connection_id) to a connection (agent_id, user_id, etc.).
 */

const database = require('../database/connection');
const logger = require('../utils/logger');

class ChannelConnectionService {
  async create(data) {
    const {
      userId,
      agentId,
      channel,
      channelConnectionId,
      channelMetadata = {},
      enabledToolCategories = [],
      sessionPolicy = 'per_peer',
      allowedPeerIds = []
    } = data;

    const result = await database.query(`
      INSERT INTO channel_connections (user_id, agent_id, channel, channel_connection_id, channel_metadata, enabled_tool_categories, session_policy, allowed_peer_ids)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (channel, channel_connection_id) DO UPDATE SET
        agent_id = EXCLUDED.agent_id,
        user_id = EXCLUDED.user_id,
        channel_metadata = EXCLUDED.channel_metadata,
        enabled_tool_categories = EXCLUDED.enabled_tool_categories,
        session_policy = EXCLUDED.session_policy,
        allowed_peer_ids = COALESCE(EXCLUDED.allowed_peer_ids, channel_connections.allowed_peer_ids),
        is_active = true,
        updated_at = NOW()
      RETURNING *
    `, [
      userId,
      agentId,
      channel,
      channelConnectionId,
      JSON.stringify(channelMetadata),
      enabledToolCategories,
      sessionPolicy,
      Array.isArray(allowedPeerIds) ? allowedPeerIds : []
    ]);

    return result.rows[0];
  }

  async findByChannelAndConnectionId(channel, channelConnectionId) {
    const result = await database.query(`
      SELECT * FROM channel_connections
      WHERE channel = $1 AND channel_connection_id = $2 AND is_active = true
      LIMIT 1
    `, [channel, channelConnectionId]);
    return result.rows[0] || null;
  }

  /** For webhook: resolve connection by id (no user check). */
  async findByIdForWebhook(id) {
    const result = await database.query(`
      SELECT * FROM channel_connections WHERE id = $1 AND is_active = true
    `, [id]);
    return result.rows[0] || null;
  }

  async listByUserId(userId) {
    const result = await database.query(`
      SELECT cc.*, a.name as agent_name
      FROM channel_connections cc
      JOIN ai_agents a ON a.id = cc.agent_id
      WHERE cc.user_id = $1
      ORDER BY cc.updated_at DESC
    `, [userId]);
    return result.rows;
  }

  async getById(id, userId) {
    const result = await database.query(`
      SELECT * FROM channel_connections WHERE id = $1 AND user_id = $2
    `, [id, userId]);
    return result.rows[0] || null;
  }

  async update(id, userId, updates) {
    const allowed = ['agent_id', 'channel_metadata', 'channel_connection_id', 'enabled_tool_categories', 'session_policy', 'is_active', 'allowed_peer_ids', 'receive_scheduled_signals'];
    const setClause = [];
    const values = [];
    let i = 1;
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        if (key === 'channel_metadata') {
          setClause.push(`channel_metadata = $${i}`);
          values.push(JSON.stringify(updates[key]));
        } else {
          setClause.push(`${key} = $${i}`);
          values.push(updates[key]);
        }
        i++;
      }
    }
    if (setClause.length === 0) return this.getById(id, userId);
    setClause.push('updated_at = NOW()');
    values.push(id, userId);
    const result = await database.query(`
      UPDATE channel_connections SET ${setClause.join(', ')}
      WHERE id = $${i} AND user_id = $${i + 1}
      RETURNING *
    `, values);
    return result.rows[0] || null;
  }

  async delete(id, userId) {
    const result = await database.query(`
      DELETE FROM channel_connections WHERE id = $1 AND user_id = $2 RETURNING id
    `, [id, userId]);
    return result.rowCount > 0;
  }
}

module.exports = ChannelConnectionService;
