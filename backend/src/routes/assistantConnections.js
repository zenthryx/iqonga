/**
 * AI Assistant: CRUD for channel connections (link agent to Telegram/WhatsApp/Teams).
 * Gate with ENABLE_PERSONAL_ASSISTANT if desired.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ChannelConnectionService = require('../services/ChannelConnectionService');
const logger = require('../utils/logger');

const connectionService = new ChannelConnectionService();

router.use(authenticateToken);

/** List current user's channel connections */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const list = await connectionService.listByUserId(userId);
    res.json({ success: true, data: list });
  } catch (err) {
    if (err.message && err.message.includes('does not exist')) {
      return res.json({ success: true, data: [] });
    }
    logger.error('List assistant connections failed:', err);
    res.status(500).json({ error: err.message });
  }
});

/** Create or update a channel connection */
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const {
      agentId,
      channel,
      channelConnectionId,
      channelMetadata,
      enabledToolCategories,
      sessionPolicy,
      allowedPeerIds
    } = req.body;
    if (!agentId || !channel || !channelConnectionId) {
      return res.status(400).json({ error: 'agentId, channel, and channelConnectionId are required' });
    }
    if (!['telegram', 'whatsapp', 'teams', 'discord', 'slack'].includes(channel)) {
      return res.status(400).json({ error: 'channel must be telegram, whatsapp, teams, discord, or slack' });
    }
    if (channel === 'telegram') {
      const token = channelMetadata?.bot_token;
      if (!token || !String(token).trim()) {
        return res.status(400).json({ error: 'Bot token is required for Telegram. Create a bot with @BotFather and provide the token in channelMetadata.bot_token.' });
      }
    }
    const row = await connectionService.create({
      userId,
      agentId,
      channel,
      channelConnectionId,
      channelMetadata: channelMetadata || {},
      enabledToolCategories: Array.isArray(enabledToolCategories) ? enabledToolCategories : [],
      sessionPolicy: sessionPolicy || 'per_peer',
      allowedPeerIds: Array.isArray(allowedPeerIds) ? allowedPeerIds : (typeof allowedPeerIds === 'string' ? allowedPeerIds.split(',').map(s => s.trim()).filter(Boolean) : [])
    });
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    logger.error('Create assistant connection failed:', err);
    res.status(500).json({ error: err.message });
  }
});

/** Get one connection */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const row = await connectionService.getById(req.params.id, userId);
    if (!row) return res.status(404).json({ error: 'Connection not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    logger.error('Get assistant connection failed:', err);
    res.status(500).json({ error: err.message });
  }
});

/** Update connection */
router.patch('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const row = await connectionService.update(req.params.id, userId, req.body);
    if (!row) return res.status(404).json({ error: 'Connection not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    logger.error('Update assistant connection failed:', err);
    res.status(500).json({ error: err.message });
  }
});

/** Delete connection */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const ok = await connectionService.delete(req.params.id, userId);
    if (!ok) return res.status(404).json({ error: 'Connection not found' });
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete assistant connection failed:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
