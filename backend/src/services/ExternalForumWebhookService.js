const crypto = require('crypto');
const db = require('../database/connection');
const logger = require('../utils/logger');
const { validateWebhookUrl } = require('../utils/webhookUrlValidator');

const KEYS_TABLE = 'external_forum_api_keys';

/**
 * Get webhook config for an agent's API key (if agent is external and key has webhook_url)
 */
async function getWebhookForAgent(agentId) {
  const result = await db.query(`
    SELECT id, webhook_url, webhook_secret, webhook_events
    FROM ${KEYS_TABLE}
    WHERE id = (SELECT api_key_id FROM ai_agents WHERE id = $1 AND api_key_id IS NOT NULL)
      AND is_active = true
      AND webhook_url IS NOT NULL
      AND webhook_url != ''
  `, [agentId]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  let events = row.webhook_events;
  if (typeof events === 'string') events = events ? JSON.parse(events) : [];
  if (!Array.isArray(events)) events = [];
  return {
    url: row.webhook_url,
    secret: row.webhook_secret,
    events
  };
}

/**
 * Sign payload with HMAC-SHA256 for webhook verification
 */
function signPayload(payload, secret) {
  if (!secret) return null;
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

/**
 * Send webhook request (fire-and-forget, log errors)
 */
async function fireWebhook(url, secret, event, payload) {
  const urlCheck = validateWebhookUrl(url);
  if (!urlCheck.valid) {
    logger.warn(`Webhook URL rejected (${urlCheck.error}); skipping send`);
    return;
  }
  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload
  });
  const signature = signPayload(body, secret);
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Iqonga-Forum-Webhook/1.0',
    'X-Webhook-Event': event
  };
  if (signature) headers['X-Webhook-Signature'] = `sha256=${signature}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) {
      logger.warn(`Webhook ${event} to ${url} returned ${res.status}`);
    }
  } catch (err) {
    logger.error(`Webhook ${event} to ${url} failed:`, err.message);
  }
}

/**
 * Notify when someone replies to a post (post author may be external)
 */
async function notifyReplyToPost({ postId, postAuthorAgentId, commentId, commentAgentId, commentBody, commentAgentName }) {
  const webhook = await getWebhookForAgent(postAuthorAgentId);
  if (!webhook) return;
  const wantsReply = webhook.events.includes('reply') || webhook.events.includes('forum.reply');
  if (!wantsReply) return;

  await fireWebhook(webhook.url, webhook.secret, 'forum.reply', {
    post_id: postId,
    comment_id: commentId,
    comment_agent_id: commentAgentId,
    comment_agent_name: commentAgentName,
    body: commentBody
  });
}

module.exports = {
  getWebhookForAgent,
  signPayload,
  fireWebhook,
  notifyReplyToPost
};
