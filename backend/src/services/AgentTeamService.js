/**
 * AgentTeamService – CRUD for agent_teams and agent_team_members.
 */

const database = require('../database/connection');

class AgentTeamService {
  async listByUser(userId) {
    const r = await database.query(
      `SELECT id, user_id, name, description, created_at, updated_at
       FROM agent_teams WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );
    return r.rows;
  }

  async getById(teamId, userId) {
    const r = await database.query(
      'SELECT * FROM agent_teams WHERE id = $1 AND user_id = $2',
      [teamId, userId]
    );
    return r.rows[0] || null;
  }

  async create(userId, { name, description }) {
    const r = await database.query(
      `INSERT INTO agent_teams (user_id, name, description) VALUES ($1, $2, $3)
       RETURNING id, user_id, name, description, created_at, updated_at`,
      [userId, name || 'Untitled team', description || null]
    );
    return r.rows[0];
  }

  async update(teamId, userId, { name, description }) {
    const r = await database.query(
      `UPDATE agent_teams SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW()
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [name, description, teamId, userId]
    );
    return r.rows[0] || null;
  }

  async delete(teamId, userId) {
    const r = await database.query(
      'DELETE FROM agent_teams WHERE id = $1 AND user_id = $2 RETURNING id',
      [teamId, userId]
    );
    return r.rowCount > 0;
  }

  async listMembers(teamId, userId) {
    const t = await this.getById(teamId, userId);
    if (!t) return null;
    const r = await database.query(
      `SELECT atm.*, a.name AS agent_name, a.avatar_url
       FROM agent_team_members atm
       JOIN ai_agents a ON a.id = atm.agent_id
       WHERE atm.team_id = $1 ORDER BY atm.sort_order, atm.created_at`,
      [teamId]
    );
    return r.rows;
  }

  async addMember(teamId, userId, { agent_id, sort_order, role_label }) {
    const t = await this.getById(teamId, userId);
    if (!t) return null;
    const agents = await this.listMembers(teamId, userId);
    const order = sort_order != null ? sort_order : agents.length;
    const r = await database.query(
      `INSERT INTO agent_team_members (team_id, agent_id, sort_order, role_label)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (team_id, agent_id) DO UPDATE SET sort_order = EXCLUDED.sort_order, role_label = EXCLUDED.role_label
       RETURNING *`,
      [teamId, agent_id, order, role_label || null]
    );
    return r.rows[0];
  }

  async removeMember(teamId, userId, agentId) {
    const t = await this.getById(teamId, userId);
    if (!t) return false;
    const r = await database.query(
      'DELETE FROM agent_team_members WHERE team_id = $1 AND agent_id = $2 RETURNING id',
      [teamId, agentId]
    );
    return r.rowCount > 0;
  }
}

module.exports = new AgentTeamService();
