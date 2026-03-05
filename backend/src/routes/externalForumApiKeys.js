const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ApiKeyService = require('../services/ApiKeyService');
const logger = require('../utils/logger');

/** Developer access limits (non-admin users) */
const MAX_KEYS_PER_USER = 20;
const MAX_KEYS_PER_HOUR = 5;
const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

/**
 * External Forum API Key management (for users/admins to create keys for external platforms)
 * All routes require JWT authentication
 */

function getClientIp(req) {
  return req.ip || req.connection?.remoteAddress || req.get?.('x-forwarded-for')?.split(',')[0] || 'unknown';
}

// GET /api/external-forum-api-keys - List current user's external forum API keys
router.get('/external-forum-api-keys', authenticateToken, async (req, res) => {
  try {
    const keys = await ApiKeyService.getUserApiKeys(req.user.id);
    res.json({
      success: true,
      data: keys
    });
  } catch (error) {
    logger.error('List external forum API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API keys'
    });
  }
});

// POST /api/external-forum-api-keys - Create a new external forum API key
router.post('/external-forum-api-keys', authenticateToken, async (req, res) => {
  try {
    const isAdmin = !!(req.user && (req.user.is_admin === true || req.user.role === 'admin'));
    const {
      name,
      description,
      tier = 'free',
      rateLimit,
      maxAgents,
      webhookUrl,
      webhookSecret,
      webhookEvents
    } = req.body;

    const trimmedName = name != null ? String(name).trim() : '';
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }
    if (trimmedName.length > NAME_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Name must be ${NAME_MAX_LENGTH} characters or fewer`
      });
    }
    const trimmedDesc = description != null ? String(description).trim() : '';
    if (trimmedDesc.length > DESCRIPTION_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer`
      });
    }

    if (!isAdmin) {
      const totalKeys = await ApiKeyService.countUserKeys(req.user.id);
      if (totalKeys >= MAX_KEYS_PER_USER) {
        return res.status(403).json({
          success: false,
          error: `Maximum of ${MAX_KEYS_PER_USER} API keys per account. Revoke an existing key to create a new one.`
        });
      }
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const createdLastHour = await ApiKeyService.countKeysCreatedSince(req.user.id, oneHourAgo);
      if (createdLastHour >= MAX_KEYS_PER_HOUR) {
        return res.status(429).json({
          success: false,
          error: `You can create up to ${MAX_KEYS_PER_HOUR} keys per hour. Try again later.`
        });
      }
    }

    const effectiveTier = isAdmin && ['free', 'pro', 'enterprise', 'custom'].includes(tier) ? tier : 'free';
    const effectiveRateLimit = isAdmin && rateLimit != null ? parseInt(rateLimit, 10) : null;
    const effectiveMaxAgents = isAdmin && maxAgents != null ? parseInt(maxAgents, 10) : null;

    const keyData = await ApiKeyService.createApiKey(req.user.id, {
      name: trimmedName,
      description: trimmedDesc || null,
      tier: effectiveTier,
      rateLimit: effectiveRateLimit,
      maxAgents: effectiveMaxAgents,
      permissions: ['forum:read', 'forum:write', 'agent:create', 'agent:update'],
      webhookUrl: webhookUrl || null,
      webhookSecret: webhookSecret || null,
      webhookEvents: Array.isArray(webhookEvents) ? webhookEvents : []
    });

    const ip = getClientIp(req);
    logger.info('External forum API key created', {
      keyId: keyData.id,
      userId: req.user.id,
      tier: effectiveTier,
      ip,
      userAgent: req.get('user-agent') || undefined
    });

    res.status(201).json({
      success: true,
      data: keyData,
      message: 'API key created. Copy it now — it won’t be shown again.'
    });
  } catch (error) {
    logger.error('Create external forum API key:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create API key'
    });
  }
});

// GET /api/external-forum-api-keys/:id/usage - Get usage stats for a key
router.get('/external-forum-api-keys/:id/usage', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const timeframe = req.query.timeframe || '7d';

    const stats = await ApiKeyService.getUsageStats(id, req.user.id, timeframe);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get API key usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage'
    });
  }
});

// PATCH /api/external-forum-api-keys/:id - Update key (name, webhook, etc.)
router.patch('/external-forum-api-keys/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const allowedKeys = ['name', 'description', 'webhook_url', 'webhook_events'];
    const updates = {};
    for (const k of allowedKeys) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    if (updates.name !== undefined) {
      const trimmed = String(updates.name).trim();
      if (trimmed.length > NAME_MAX_LENGTH) {
        return res.status(400).json({ success: false, error: `Name must be ${NAME_MAX_LENGTH} characters or fewer` });
      }
      updates.name = trimmed;
    }
    if (updates.description !== undefined) {
      const trimmed = String(updates.description).trim();
      if (trimmed.length > DESCRIPTION_MAX_LENGTH) {
        return res.status(400).json({ success: false, error: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer` });
      }
      updates.description = trimmed;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    const updated = await ApiKeyService.updateApiKey(id, req.user.id, updates);
    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    logger.error('Update external forum API key:', error);
    res.status(error.message?.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message || 'Failed to update API key'
    });
  }
});

// DELETE /api/external-forum-api-keys/:id - Revoke (deactivate) API key
router.delete('/external-forum-api-keys/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const revoked = await ApiKeyService.revokeApiKey(id, req.user.id);
    const ip = getClientIp(req);
    logger.info('External forum API key revoked', {
      keyId: id,
      keyName: revoked?.name,
      userId: req.user.id,
      ip,
      userAgent: req.get('user-agent') || undefined
    });
    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    logger.error('Revoke external forum API key:', error);
    res.status(error.message?.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message || 'Failed to revoke API key'
    });
  }
});

module.exports = router;
