const database = require('../database/connection');
const { encrypt, decrypt } = require('../utils/encryption');
const axios = require('axios');

class TelegramService {
  constructor() {
    this.baseURL = 'https://api.telegram.org/bot';
  }

  // Add a Telegram group/channel connection
  async addTelegramGroup(userId, agentId, botToken, chatId, groupInfo = {}) {
    try {
      // Verify agent ownership
      const agentCheck = await database.query(`
        SELECT id, name FROM ai_agents 
        WHERE id = $1 AND user_id = $2 AND is_active = true
      `, [agentId, userId]);

      if (agentCheck.rows.length === 0) {
        throw new Error('Agent not found or you do not have permission to use this agent');
      }

      const agentName = agentCheck.rows[0].name;

      // Validate bot token by getting bot info
      const botInfo = await this.getBotInfo(botToken);
      if (!botInfo.ok) {
        throw new Error('Invalid bot token');
      }

      // Get chat info
      const chatInfo = await this.getChatInfo(botToken, chatId);
      if (!chatInfo.ok) {
        throw new Error('Cannot access chat or bot is not a member');
      }

      const chat = chatInfo.result;
      
      // Encrypt bot token
      const encryptedToken = encrypt(botToken);

      // Store in telegram_groups table with agent_id
      const result = await database.query(`
        INSERT INTO telegram_groups 
        (user_id, agent_id, agent_name, chat_id, chat_type, title, username, description, member_count, 
         bot_token_encrypted, bot_username, permissions)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        userId,
        agentId,
        agentName,
        chat.id,
        chat.type,
        chat.title || chat.first_name || 'Private Chat',
        chat.username || null,
        chat.description || null,
        chat.members_count || null,
        encryptedToken,
        botInfo.result.username,
        JSON.stringify(groupInfo.permissions || {})
      ]);

      // Note: Telegram groups are stored in telegram_groups table, not platform_connections
      // Each agent can have its own bot and connect to multiple groups

      return {
        success: true,
        group: result.rows[0],
        message: `Successfully connected ${agentName} to ${chat.title || 'Telegram chat'} via @${botInfo.result.username}`
      };
    } catch (error) {
      console.error('Error adding Telegram group:', error);
      throw error;
    }
  }

  // Get user's Telegram groups (with agent information)
  async getUserTelegramGroups(userId) {
    try {
      const result = await database.query(`
        SELECT 
          tg.*,
          aa.name as agent_display_name,
          aa.avatar_url as agent_avatar
        FROM telegram_groups tg
        LEFT JOIN ai_agents aa ON tg.agent_id = aa.id
        WHERE tg.user_id = $1 AND tg.is_active = true
        ORDER BY tg.title ASC
      `, [userId]);

      return result.rows.map(group => ({
        ...group,
        bot_token_encrypted: undefined // Don't expose encrypted token
      }));
    } catch (error) {
      console.error('Error getting user Telegram groups:', error);
      throw error;
    }
  }

  // Get Telegram groups for a specific agent
  async getAgentTelegramGroups(userId, agentId) {
    try {
      const result = await database.query(`
        SELECT 
          tg.*,
          aa.name as agent_display_name,
          aa.avatar_url as agent_avatar
        FROM telegram_groups tg
        LEFT JOIN ai_agents aa ON tg.agent_id = aa.id
        WHERE tg.user_id = $1 AND tg.agent_id = $2 AND tg.is_active = true
        ORDER BY tg.title ASC
      `, [userId, agentId]);

      return result.rows.map(group => ({
        ...group,
        bot_token_encrypted: undefined // Don't expose encrypted token
      }));
    } catch (error) {
      console.error('Error getting agent Telegram groups:', error);
      throw error;
    }
  }

  // Post message to Telegram group
  async postToTelegram(userId, chatId, message, options = {}) {
    try {
      // Get the bot token for this chat (with agent_id if provided)
      let query, params;
      
      if (options.agentId) {
        query = `
          SELECT bot_token_encrypted, agent_id, agent_name 
          FROM telegram_groups
          WHERE user_id = $1 AND chat_id = $2 AND agent_id = $3 AND is_active = true
          LIMIT 1
        `;
        params = [userId, chatId, options.agentId];
      } else {
        // Fallback: use any active connection for this chat
        query = `
          SELECT bot_token_encrypted, agent_id, agent_name 
          FROM telegram_groups
          WHERE user_id = $1 AND chat_id = $2 AND is_active = true
          ORDER BY created_at DESC
          LIMIT 1
        `;
        params = [userId, chatId];
      }

      const groupResult = await database.query(query, params);

      if (groupResult.rows.length === 0) {
        throw new Error('Telegram group not found or not active');
      }

      const botToken = decrypt(groupResult.rows[0].bot_token_encrypted);
      const agentId = groupResult.rows[0].agent_id;
      
      // Apply branding to the message using the agent from the connection
      const TelegramBrandingService = require('./TelegramBrandingService');
      const branding = await TelegramBrandingService.getAgentBranding(chatId, userId, agentId);
      
      let brandedMessage = message;
      if (branding) {
        brandedMessage = TelegramBrandingService.formatBrandedMessage(message, branding.agentName, chatId);
      }
      
      // Check rate limits
      const postQueueService = require('./PostQueueService');
      const rateLimitCheck = await postQueueService.checkRateLimit(userId, 'telegram', 'per_minute');
      
      if (rateLimitCheck.isLimited) {
        // Queue the message for later
        const queueResult = await postQueueService.queuePost(
          userId,
          options.agentId || null,
          brandedMessage, // Use branded message in queue
          options.contentType || 'message',
          'telegram',
          Math.floor(Date.now() / 1000) + 60, // 1 minute from now
          'Telegram rate limit exceeded'
        );
        
        return {
          success: true,
          queued: true,
          queueId: queueResult.queueId,
          message: 'Message queued due to rate limit'
        };
      }

      // Send message
      const response = await this.sendMessage(botToken, chatId, brandedMessage, options);
      
      if (response.ok) {
        // Update rate limit counter
        await postQueueService.updateRateLimit(
          userId,
          'telegram',
          'per_minute',
          (rateLimitCheck.currentCount || 0) + 1,
          20, // Telegram limit: 20 messages per minute per chat
          Math.floor((Date.now() + 60000) / 1000) // Reset in 1 minute
        );

        // Deduct platform-specific posting cost (on top of content generation cost)
        try {
          const ServicePricingService = require('./ServicePricingService');
          const CreditService = require('./CreditService');
          const creditService = new CreditService();
          
          const postingCostKey = (options.contentType === 'reply' || options.contentType === 'reply_message')
            ? 'platform_posting_telegram_reply' 
            : 'platform_posting_telegram_post';
          
          const postingCost = await ServicePricingService.getPricing(postingCostKey);
          
          if (postingCost > 0) {
            await creditService.deductCredits(
              userId, 
              postingCostKey, 
              postingCost, 
              `telegram_post_${response.result.message_id}`
            );
          }
        } catch (costError) {
          // Log error but don't fail the post if cost deduction fails
          console.error('Error deducting platform posting cost:', costError);
        }

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
      // If video is provided, send video with caption
      if (options.videoData && options.videoData.video_url) {
        return await this.sendVideo(botToken, chatId, text, options);
      }
      // If image is provided, send photo with caption
      if (options.imageData && options.imageData.image_url) {
        return await this.sendPhoto(botToken, chatId, text, options);
      }
      
      // Otherwise send regular message
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

  // Send photo via Telegram Bot API
  async sendPhoto(botToken, chatId, caption, options = {}) {
    try {
      const url = `${this.baseURL}${botToken}/sendPhoto`;
      
      // Convert relative URL to absolute URL
      const imageUrl = options.imageData.image_url.startsWith('http') 
        ? options.imageData.image_url 
        : `${process.env.API_BASE_URL || 'https://www.iqonga.org'}${options.imageData.image_url}`;
      
      const payload = {
        chat_id: chatId,
        photo: imageUrl,
        caption: caption,
        parse_mode: options.parseMode || 'HTML',
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

  // Send video via Telegram Bot API
  async sendVideo(botToken, chatId, caption, options = {}) {
    try {
      const url = `${this.baseURL}${botToken}/sendVideo`;
      
      // Convert relative URL to absolute URL
      const videoUrl = options.videoData.video_url.startsWith('http') 
        ? options.videoData.video_url 
        : `${process.env.API_BASE_URL || 'https://www.iqonga.org'}${options.videoData.video_url}`;
      
      const payload = {
        chat_id: chatId,
        video: videoUrl,
        caption: caption,
        parse_mode: options.parseMode || 'HTML',
        disable_notification: options.disableNotification || false,
        reply_to_message_id: options.replyToMessageId || undefined,
        supports_streaming: true // Allow streaming for better UX
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

  // Get bot information
  async getBotInfo(botToken) {
    try {
      const url = `${this.baseURL}${botToken}/getMe`;
      const response = await axios.get(url);
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

  // Test bot permissions in a chat
  async testBotPermissions(botToken, chatId) {
    try {
      // Try to get chat member info for the bot
      const botInfo = await this.getBotInfo(botToken);
      if (!botInfo.ok) return { canPost: false, error: 'Invalid bot token' };

      const url = `${this.baseURL}${botToken}/getChatMember`;
      const response = await axios.post(url, {
        chat_id: chatId,
        user_id: botInfo.result.id
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

  // Remove Telegram group connection (specific to an agent and chat)
  async removeTelegramGroup(userId, chatId, agentId = null) {
    try {
      let query, params;

      if (agentId) {
        // Remove specific agent's connection to this chat
        query = `
          UPDATE telegram_groups 
          SET is_active = false, updated_at = NOW()
          WHERE user_id = $1 AND chat_id = $2 AND agent_id = $3
        `;
        params = [userId, chatId, agentId];
      } else {
        // Remove all connections to this chat for this user
        query = `
          UPDATE telegram_groups 
          SET is_active = false, updated_at = NOW()
          WHERE user_id = $1 AND chat_id = $2
        `;
        params = [userId, chatId];
      }

      await database.query(query, params);

      return {
        success: true,
        message: 'Telegram group connection removed'
      };
    } catch (error) {
      console.error('Error removing Telegram group:', error);
      throw error;
    }
  }
}

module.exports = new TelegramService();
