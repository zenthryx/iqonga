/**
 * Send AI Assistant replies back to Slack (Web API).
 * Uses connection.channel_metadata.bot_token (xoxb-...).
 * peerId = Slack channel ID to post to (or use channel from metadata if thread).
 */

const axios = require('axios');
const logger = require('../utils/logger');

class SlackAssistantConnector {
  async sendReply(connection, peerId, messageText) {
    const meta = connection.channel_metadata || {};
    const token = meta.bot_token || process.env.SLACK_BOT_TOKEN;
    if (!token) {
      logger.warn('SlackAssistantConnector: no bot token');
      return;
    }
    const channel = String(peerId);
    const payload = { channel, text: messageText };
    try {
      await axios.post(
        'https://slack.com/api/chat.postMessage',
        payload,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 10000 }
      );
    } catch (err) {
      logger.error('SlackAssistantConnector send failed:', err.response?.data || err.message);
      throw err;
    }
  }
}

module.exports = SlackAssistantConnector;
