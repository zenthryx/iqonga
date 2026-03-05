const database = require('../database/connection');
const axios = require('axios');

class PlatformTelegramService {
  constructor() {
    this.baseURL = 'https://api.telegram.org/bot';
    this.platformBotToken = process.env.TELEGRAM_BOT_TOKEN; // Single bot for all users
  }

  // Add user's group to platform bot
  async addUserGroup(userId, chatId, groupInfo = {}) {
    try {
      if (!this.platformBotToken) {
        throw new Error('Platform Telegram bot not configured');
      }

      // Get chat info using platform bot
      const chatInfo = await this.getChatInfo(this.platformBotToken, chatId);
      if (!chatInfo.ok) {
        throw new Error('Cannot access chat or bot is not a member. Please add @your_platform_bot to the group first.');
      }

      const chat = chatInfo.result;
      
      // Check if bot has posting permissions
      const permissions = await this.testBotPermissions(this.platformBotToken, chatId);
      if (!permissions.canPost) {
        throw new Error(`Bot cannot post to this group. Please make @your_platform_bot an admin or ensure it has posting permissions.`);
      }

      // Store group connection
      const result = await database.query(`
        INSERT INTO telegram_groups 
        (user_id, chat_id, chat_type, title, username, description, member_count, 
         bot_token_encrypted, bot_username, permissions)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id, chat_id) 
        DO UPDATE SET 
          title = $4,
          username = $5,
          description = $6,
          member_count = $7,
          permissions = $10,
          is_active = true,
          updated_at = NOW()
        RETURNING *
      `, [
        userId,
        chat.id,
        chat.type,
        chat.title || chat.first_name || 'Private Chat',
        chat.username || null,
        chat.description || null,
        chat.members_count || null,
        'PLATFORM_BOT', // Indicator that this uses platform bot
        process.env.TELEGRAM_BOT_USERNAME || 'platform_bot',
        JSON.stringify(permissions)
      ]);

      return {
        success: true,
        group: result.rows[0],
        message: `Successfully connected to ${chat.title || 'Telegram chat'}`
      };
    } catch (error) {
      console.error('Error adding user group:', error);
      throw error;
    }
  }

  // Post message using platform bot
  async postToTelegram(userId, chatId, message, options = {}) {
    try {
      if (!this.platformBotToken) {
        throw new Error('Platform Telegram bot not configured');
      }

      // Verify user has access to this chat
      const groupResult = await database.query(`
        SELECT * FROM telegram_groups
        WHERE user_id = $1 AND chat_id = $2 AND is_active = true
      `, [userId, chatId]);

      if (groupResult.rows.length === 0) {
        throw new Error('Telegram group not found or not accessible');
      }

      // Check rate limits (platform-wide)
      const postQueueService = require('./PostQueueService');
      const rateLimitCheck = await postQueueService.checkRateLimit('platform', 'telegram', 'per_minute');
      
      if (rateLimitCheck.isLimited) {
        // Queue the message
        const queueResult = await postQueueService.queuePost(
          userId,
          options.agentId || null,
          message,
          options.contentType || 'message',
          'telegram',
          Math.floor(Date.now() / 1000) + 60,
          'Platform Telegram bot rate limited'
        );
        
        return {
          success: true,
          queued: true,
          queueId: queueResult.queueId,
          message: 'Message queued due to platform rate limit'
        };
      }

      // Send message
      const response = await this.sendMessage(this.platformBotToken, chatId, message, options);
      
      if (response.ok) {
        // Update platform rate limit counter
        await postQueueService.updateRateLimit(
          'platform',
          'telegram',
          'per_minute',
          (rateLimitCheck.currentCount || 0) + 1,
          30, // Higher limit for platform bot
          Math.floor((Date.now() + 60000) / 1000)
        );

        return {
          success: true,
          messageId: response.result.message_id,
          chatId: response.result.chat.id
        };
      } else {
        throw new Error(response.description || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error posting to Telegram:', error);
      throw error;
    }
  }

  // Send message via Telegram Bot API
  async sendMessage(botToken, chatId, text, options = {}) {
    try {
      const url = `${this.baseURL}${botToken}/sendMessage`;
      
      const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: options.parseMode || 'HTML',
        disable_web_page_preview: options.disableWebPagePreview || false,
        disable_notification: options.disableNotification || false,
        reply_to_message_id: options.replyToMessageId || undefined
      };

      const response = await axios.post(url, payload);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Get chat information
  async getChatInfo(botToken, chatId) {
    try {
      const url = `${this.baseURL}${botToken}/getChat`;
      const response = await axios.post(url, { chat_id: chatId });
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Test bot permissions
  async testBotPermissions(botToken, chatId) {
    try {
      const url = `${this.baseURL}${botToken}/getChatMember`;
      const botInfo = await axios.get(`${this.baseURL}${botToken}/getMe`);
      
      if (!botInfo.data.ok) return { canPost: false, error: 'Invalid bot token' };

      const response = await axios.post(url, {
        chat_id: chatId,
        user_id: botInfo.data.result.id
      });

      if (response.data.ok) {
        const member = response.data.result;
        const canPost = ['administrator', 'creator'].includes(member.status) || 
                       (member.status === 'member' && member.can_send_messages !== false);
        
        return {
          canPost,
          status: member.status,
          permissions: member
        };
      } else {
        return { canPost: false, error: response.data.description };
      }
    } catch (error) {
      return { canPost: false, error: error.message };
    }
  }
}

module.exports = new PlatformTelegramService();
