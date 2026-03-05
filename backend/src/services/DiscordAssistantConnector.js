/**
 * Send AI Assistant replies back to Discord (REST API).
 * Uses connection.channel_metadata.bot_token.
 * peerId = Discord channel ID (or DM channel id) to send the message to.
 */

const axios = require('axios');
const logger = require('../utils/logger');

const BASE_URL = 'https://discord.com/api/v10';

class DiscordAssistantConnector {
  async sendReply(connection, peerId, messageText) {
    const token = (connection.channel_metadata && connection.channel_metadata.bot_token) || process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      logger.warn('DiscordAssistantConnector: no bot token');
      return;
    }
    const channelId = String(peerId);
    try {
      await axios.post(
        `${BASE_URL}/channels/${channelId}/messages`,
        { content: messageText },
        { headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' }, timeout: 10000 }
      );
    } catch (err) {
      logger.error('DiscordAssistantConnector send failed:', err.response?.data || err.message);
      throw err;
    }
  }
}

module.exports = DiscordAssistantConnector;
