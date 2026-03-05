/**
 * Agent Teams API: CRUD teams and members.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const AgentTeamService = require('../services/AgentTeamService');

router.use(authenticateToken);

function getUserId(req) {
  return req.user?.id || req.user?.wallet_address;
}

// GET /api/agent-teams
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const list = await AgentTeamService.listByUser(userId);
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/agent-teams/:id
router.get('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const team = await AgentTeamService.getById(req.params.id, userId);
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });
    const members = await AgentTeamService.listMembers(req.params.id, userId);
    res.json({ success: true, data: { ...team, members: members || [] } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/agent-teams
router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, description } = req.body || {};
    const row = await AgentTeamService.create(userId, { name, description });
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/agent-teams/:id
router.put('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, description } = req.body || {};
    const row = await AgentTeamService.update(req.params.id, userId, { name, description });
    if (!row) return res.status(404).json({ success: false, error: 'Team not found' });
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/agent-teams/:id
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const ok = await AgentTeamService.delete(req.params.id, userId);
    if (!ok) return res.status(404).json({ success: false, error: 'Team not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/agent-teams/:id/members
router.get('/:id/members', async (req, res) => {
  try {
    const userId = getUserId(req);
    const members = await AgentTeamService.listMembers(req.params.id, userId);
    if (members === null) return res.status(404).json({ success: false, error: 'Team not found' });
    res.json({ success: true, data: members });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/agent-teams/:id/members
router.post('/:id/members', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { agent_id, sort_order, role_label } = req.body || {};
    const row = await AgentTeamService.addMember(req.params.id, userId, { agent_id, sort_order, role_label });
    if (!row) return res.status(404).json({ success: false, error: 'Team not found' });
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/agent-teams/:id/members/:agentId
router.delete('/:id/members/:agentId', async (req, res) => {
  try {
    const userId = getUserId(req);
    const ok = await AgentTeamService.removeMember(req.params.id, userId, req.params.agentId);
    if (!ok) return res.status(404).json({ success: false, error: 'Team or member not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
