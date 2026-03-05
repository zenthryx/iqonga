/**
 * Require request to act as an agent owned by the authenticated user.
 * Use after authenticateToken. Sets req.agent_id.
 * Agent ID can be in req.body.agent_id or req.headers['x-agent-id'].
 */
const database = require('../database/connection');

async function requireAgent(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    const agentId = req.body?.agent_id || req.headers['x-agent-id'];
    if (!agentId) {
      return res.status(400).json({
        error: 'Agent ID required. Provide agent_id in body or X-Agent-Id header.',
        code: 'AGENT_ID_REQUIRED'
      });
    }
    const result = await database.query(
      'SELECT id FROM ai_agents WHERE id = $1 AND user_id = $2 AND is_active = true',
      [agentId, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(403).json({
        error: 'Agent not found or you do not own this agent',
        code: 'AGENT_FORBIDDEN'
      });
    }
    req.agent_id = result.rows[0].id;
    next();
  } catch (err) {
    console.error('requireAgent:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { requireAgent };
