const database = require('../database/connection');
const { decrypt } = require('../utils/encryption');

class TelegramWebhookService {
  constructor() {
    this.botTokens = new Map(); // Cache bot tokens for quick access
    this.tokensLoaded = false;
    // Defer loading tokens until database is connected
    this.initializeTokens();
  }

  // Initialize tokens with retry logic
  async initializeTokens() {
    let retries = 0;
    const maxRetries = 30; // Wait up to 30 seconds
    
    while (retries < maxRetries) {
      try {
        // Check if database is connected
        if (database.isConnected) {
          await this.loadBotTokens();
          this.tokensLoaded = true;
          return;
        }
      } catch (error) {
        // If it's a "Database not connected" error, retry
        if (error.message === 'Database not connected') {
          retries++;
          if (retries >= maxRetries) {
            console.error('Failed to load bot tokens: Database connection timeout');
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          continue;
        }
        // Other errors, log and return
        console.error('Error initializing bot tokens:', error);
        return;
      }
      
      retries++;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }
    
    console.error('Failed to load bot tokens: Max retries reached');
  }

  // Load all bot tokens from database
  async loadBotTokens() {
    try {
      // Ensure database is connected
      if (!database.isConnected) {
        throw new Error('Database not connected');
      }

      // Try to load platform-wide bot token (optional - columns may not exist)
      // Note: bot_token_encrypted and bot_username don't exist in platform_connections
      // They are stored in telegram_groups table instead
      try {
        // Check if columns exist first by querying information_schema
        const columnCheck = await database.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'platform_connections' 
          AND column_name IN ('bot_token_encrypted', 'bot_username')
        `);
        
        if (columnCheck.rows.length === 2) {
          // Columns exist, try to load platform token
          const platformResult = await database.query(`
            SELECT bot_token_encrypted, bot_username 
            FROM platform_connections 
            WHERE platform = 'telegram' AND bot_token_encrypted IS NOT NULL
            LIMIT 1
          `);
          
          if (platformResult.rows.length > 0) {
            const token = this.decryptToken(platformResult.rows[0].bot_token_encrypted);
            this.botTokens.set('platform', {
              token,
              username: platformResult.rows[0].bot_username
            });
          }
        }
      } catch (platformError) {
        // Platform token query failed - this is okay, tokens are in telegram_groups
        console.log('ℹ️ Platform-wide bot token not available (using telegram_groups tokens)');
      }

      // Load user-specific bot tokens from telegram_groups
      const userResult = await database.query(`
        SELECT DISTINCT bot_token_encrypted, bot_username, user_id
        FROM telegram_groups 
        WHERE bot_token_encrypted IS NOT NULL AND is_active = true
      `);

      userResult.rows.forEach(row => {
        const token = this.decryptToken(row.bot_token_encrypted);
        if (token) {
          this.botTokens.set(`user_${row.user_id}`, {
            token,
            username: row.bot_username,
            userId: row.user_id
          });
        }
      });

      console.log(`📱 Loaded ${this.botTokens.size} Telegram bot tokens`);
    } catch (error) {
      // Don't throw error - just log it and continue without tokens
      // The service can still function, tokens will be loaded on-demand
      console.error('Error loading bot tokens:', error.message);
      // Don't rethrow - allow service to continue
    }
  }

  // Decrypt bot token using standard encryption utility
  decryptToken(encryptedToken) {
    try {
      // Use the standard encryption utility which handles IV:encryptedData format
      // This matches how tokens are encrypted in TelegramService
      return decrypt(encryptedToken);
    } catch (error) {
      console.error('Error decrypting token:', error.message);
      return null;
    }
  }

  // Process incoming webhook update
  async processUpdate(update, botToken) {
    try {
      console.log('📨 Processing Telegram update:', JSON.stringify(update, null, 2));

      if (update.message) {
        await this.processMessage(update.message, botToken);
      } else if (update.edited_message) {
        await this.processMessage(update.edited_message, botToken);
      } else if (update.channel_post) {
        await this.processMessage(update.channel_post, botToken);
      } else if (update.edited_channel_post) {
        await this.processMessage(update.edited_channel_post, botToken);
      }

      return { success: true };
    } catch (error) {
      console.error('Error processing Telegram update:', error);
      return { success: false, error: error.message };
    }
  }

  // Get platform bot token (primary method)
  getPlatformBotToken() {
    const platformBot = this.botTokens.get('platform');
    return platformBot ? platformBot.token : null;
  }

  // Process individual message
  async processMessage(message, botToken) {
    const chatId = message.chat.id;
    const messageId = message.message_id;
    const text = message.text || '';
    const from = message.from;
    const replyToMessage = message.reply_to_message;

    console.log(`📝 Processing message in chat ${chatId}: "${text}"`);

    // Check if this is a group we're monitoring
    const groupInfo = await this.getGroupInfo(chatId);
    if (!groupInfo) {
      console.log(`❌ Chat ${chatId} not found in our database`);
      return;
    }

    // Store the message in database
    await this.storeMessage(groupInfo.user_id, chatId, messageId, text, from, replyToMessage);

    // Check for mentions of our bot
    const botUsername = this.getBotUsername(botToken);
    if (botUsername && text.includes(`@${botUsername}`)) {
      console.log(`🎯 Bot mentioned in chat ${chatId}`);
      await this.triggerAgentResponse(groupInfo.user_id, chatId, text, 'mention', message);
    }

    // Check if this is a reply to our bot's message
    if (replyToMessage && replyToMessage.from.username === botUsername) {
      console.log(`💬 Reply to bot message in chat ${chatId}`);
      await this.triggerAgentResponse(groupInfo.user_id, chatId, text, 'reply', message);
    }

    // Check for keywords that might trigger responses
    await this.checkKeywordTriggers(groupInfo.user_id, chatId, text, message);
  }

  // Get group information from database
  async getGroupInfo(chatId) {
    try {
      const result = await database.query(`
        SELECT user_id, title, bot_username
        FROM telegram_groups 
        WHERE chat_id = $1 AND is_active = true
      `, [chatId]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting group info:', error);
      return null;
    }
  }

  // Store message in database for analysis
  async storeMessage(userId, chatId, messageId, text, from, replyToMessage) {
    try {
      await database.query(`
        INSERT INTO telegram_messages 
        (user_id, chat_id, message_id, text, from_user, reply_to_message_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (chat_id, message_id) DO NOTHING
      `, [
        userId,
        chatId,
        messageId,
        text,
        JSON.stringify(from),
        replyToMessage ? replyToMessage.message_id : null
      ]);
    } catch (error) {
      console.error('Error storing message:', error);
    }
  }

  // Get bot username from token
  getBotUsername(botToken) {
    for (const [key, botInfo] of this.botTokens) {
      if (botInfo.token === botToken) {
        return botInfo.username;
      }
    }
    return null;
  }

  // Trigger agent response
  async triggerAgentResponse(userId, chatId, text, triggerType, originalMessage) {
    try {
      console.log(`🤖 Triggering agent response for user ${userId}, trigger: ${triggerType}`);

      // Get user's agents that have Telegram engagement enabled
      const agentsResult = await database.query(`
        SELECT id, name, personality_type, engagement_settings
        FROM ai_agents 
        WHERE user_id = $1 AND is_active = true
      `, [userId]);

      for (const agent of agentsResult.rows) {
        const engagementSettings = agent.engagement_settings || {};
        
        // Check if agent should respond to this trigger type
        if (this.shouldAgentRespond(agent, triggerType, engagementSettings)) {
          await this.generateAndSendResponse(agent, chatId, text, triggerType, originalMessage);
        }
      }
    } catch (error) {
      console.error('Error triggering agent response:', error);
    }
  }

  // Check if agent should respond
  shouldAgentRespond(agent, triggerType, engagementSettings) {
    const settings = engagementSettings[triggerType] || {};
    
    // Check if this trigger type is enabled
    if (!settings.enabled) {
      return false;
    }

    // Check response frequency limits
    if (settings.maxResponsesPerHour && settings.maxResponsesPerHour > 0) {
      // TODO: Implement rate limiting check
    }

    return true;
  }

  // Generate and send agent response
  async generateAndSendResponse(agent, chatId, originalText, triggerType, originalMessage) {
    try {
      console.log(`🎭 Generating response for agent ${agent.name}`);

      // Generate contextual response
      const responseText = await this.generateContextualResponse(agent, originalText, triggerType, originalMessage);
      
      if (responseText) {
        // Send the response
        const telegramService = require('./TelegramService');
        const result = await telegramService.postToTelegram(
          agent.user_id,
          chatId,
          responseText,
          { agentId: agent.id, contentType: 'engagement_response' }
        );

        console.log(`✅ Sent response from ${agent.name}: ${responseText}`);
        return result;
      }
    } catch (error) {
      console.error(`Error generating response for agent ${agent.name}:`, error);
    }
  }

  // Generate contextual response based on agent personality and trigger
  async generateContextualResponse(agent, originalText, triggerType, originalMessage) {
    try {
      const AIContentService = require('./AIContentService');
      
      // Try to generate AI-powered response with company data
      if (AIContentService.isAIAvailable()) {
        console.log(`🤖 Generating AI response for ${agent.name}...`);
        const aiResponse = await AIContentService.generateContextualResponse(
          agent, 
          originalMessage, 
          triggerType, 
          originalMessage.chat.id
        );
        
        if (aiResponse) {
          console.log(`✅ AI response generated: ${aiResponse.substring(0, 100)}...`);
          return aiResponse;
        }
      }
      
      // Fallback to generic responses if AI is not available
      console.log(`⚠️ Using fallback response for ${agent.name}`);
      return AIContentService.getFallbackResponse(agent.personality_type, triggerType);
    } catch (error) {
      console.error('Error generating contextual response:', error);
      // Final fallback
      const AIContentService = require('./AIContentService');
      return AIContentService.getFallbackResponse(agent.personality_type, triggerType);
    }
  }

  // Check for keyword triggers
  async checkKeywordTriggers(userId, chatId, text, message) {
    try {
      // Get user's keyword triggers
      const triggersResult = await database.query(`
        SELECT keyword, response_type, agent_id
        FROM telegram_keyword_triggers 
        WHERE user_id = $1 AND is_active = true
      `, [userId]);

      for (const trigger of triggersResult.rows) {
        if (text.toLowerCase().includes(trigger.keyword.toLowerCase())) {
          console.log(`🔍 Keyword trigger activated: "${trigger.keyword}"`);
          
          // Get the specific agent for this trigger
          const agentResult = await database.query(`
            SELECT id, name, personality_type, user_id
            FROM ai_agents 
            WHERE id = $1 AND is_active = true
          `, [trigger.agent_id]);

          if (agentResult.rows.length > 0) {
            const agent = agentResult.rows[0];
            await this.generateAndSendResponse(agent, chatId, text, 'keyword', message);
          }
        }
      }
    } catch (error) {
      console.error('Error checking keyword triggers:', error);
    }
  }

  // Set webhook for a bot
  async setWebhook(botToken, webhookUrl) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
      });

      const result = await response.json();
      console.log(`📡 Webhook set for bot: ${result.ok ? 'Success' : 'Failed'}`);
      return result;
    } catch (error) {
      console.error('Error setting webhook:', error);
      return { ok: false, error: error.message };
    }
  }

  // Get webhook info
  async getWebhookInfo(botToken) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting webhook info:', error);
      return { ok: false, error: error.message };
    }
  }
}

module.exports = new TelegramWebhookService();
