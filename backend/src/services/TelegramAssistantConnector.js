/**
 * Send AI Assistant replies back to Telegram.
 * Uses bot token from connection.channel_metadata.bot_token or env TELEGRAM_BOT_TOKEN.
 */

const TelegramBot = require('node-telegram-bot-api');
const logger = require('../utils/logger');

const botInstances = new Map();

function getBot(token) {
  if (!token) return null;
  if (!botInstances.has(token)) {
    botInstances.set(token, new TelegramBot(token, { polling: false }));
  }
  return botInstances.get(token);
}

class TelegramAssistantConnector {
  async sendReply(connection, peerId, messageText) {
    const token = (connection.channel_metadata && connection.channel_metadata.bot_token) || process.env.TELEGRAM_BOT_TOKEN;
    const bot = getBot(token);
    if (!bot) {
      logger.warn('TelegramAssistantConnector: no bot token for connection');
      return;
    }
    const chatId = String(peerId);
    const opts = { parse_mode: 'HTML' };
    const threadId = connection.channel_metadata && connection.channel_metadata.telegram_message_thread_id;
    if (threadId != null && threadId !== '') opts.message_thread_id = Number(threadId);
    try {
      await bot.sendMessage(chatId, messageText, opts);
    } catch (err) {
      const msg = err.response?.body?.description || err.message || String(err);
      logger.error('TelegramAssistantConnector sendMessage failed: ' + msg, { chatId, code: err.code });
      throw err;
    }
  }
}

module.exports = TelegramAssistantConnector;
