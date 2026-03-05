const TelegramBot = require('node-telegram-bot-api');
const logger = require('../utils/logger');
const PersonalityAgent = require('./PersonalityAgent');
const SentimentAnalysis = require('./SentimentAnalysis');

class TelegramBotService {
  constructor(database, redis) {
    this.db = database;
    this.redis = redis;
    this.bot = null;
    this.isInitialized = false;
    this.agentInstances = new Map(); // Cache for agent instances
    this.messageQueue = []; // Queue for processing messages
    this.isProcessingQueue = false;
  }

  async initialize() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      logger.warn('Telegram bot token not provided, skipping Telegram service initialization');
      return;
    }

    try {
      // Initialize the bot
      this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
        polling: false, // We'll use webhooks instead
      });

      // Set up webhook
      await this.setupWebhook();

      // Set up bot commands
      await this.setupBotCommands();

      this.isInitialized = true;
      logger.info('✅ Telegram Bot Service initialized successfully');

      // Start processing queued messages
      this.startMessageProcessing();

    } catch (error) {
      logger.error('❌ Failed to initialize Telegram Bot Service:', error);
      throw error;
    }
  }

  async setupWebhook() {
    try {
      const webhookUrl = `${process.env.TELEGRAM_WEBHOOK_URL}`;
      await this.bot.setWebHook(webhookUrl);
      logger.info(`✅ Telegram webhook set to: ${webhookUrl}`);
    } catch (error) {
      logger.error('Failed to set up Telegram webhook:', error);
      throw error;
    }
  }

  async setupBotCommands() {
    const commands = [
      { command: 'start', description: 'Start interacting with the AI agent' },
      { command: 'help', description: 'Show available commands' },
      { command: 'agent', description: 'Get information about the current AI agent' },
      { command: 'stats', description: 'Show agent performance statistics' },
      { command: 'personality', description: 'Learn about the agent\'s personality' },
      { command: 'settings', description: 'Configure agent behavior (admin only)' }
    ];

    try {
      await this.bot.setMyCommands(commands);
      logger.info('✅ Telegram bot commands configured');
    } catch (error) {
      logger.error('Failed to set up bot commands:', error);
    }
  }

  // Handle incoming webhook messages
  async handleWebhook(req, res) {
    try {
      const update = req.body;
      
      if (update.message) {
        await this.queueMessage(update.message);
      } else if (update.edited_message) {
        // Handle edited messages if needed
        logger.debug('Received edited message, ignoring for now');
      }

      res.status(200).send('OK');
    } catch (error) {
      logger.error('Error handling Telegram webhook:', error);
      res.status(500).send('Error');
    }
  }

  async queueMessage(message) {
    this.messageQueue.push(message);
    
    // Start processing if not already running
    if (!this.isProcessingQueue) {
      this.startMessageProcessing();
    }
  }

  async startMessageProcessing() {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      try {
        await this.handleMessage(message);
      } catch (error) {
        logger.error('Error processing Telegram message:', error);
      }
      
      // Small delay to prevent overwhelming the system
      await this.sleep(100);
    }
    
    this.isProcessingQueue = false;
  }

  async handleMessage(message) {
    const chatId = message.chat.id;
    const messageId = message.message_id;
    const userId = message.from.id;
    const username = message.from.username;
    const firstName = message.from.first_name;
    const messageText = message.text || '';

    logger.debug(`Received Telegram message from ${username} in chat ${chatId}: ${messageText}`);

    // Store the message in database
    await this.storeMessage(message);

    // Check if this is a command
    if (messageText.startsWith('/')) {
      await this.handleCommand(message);
      return;
    }

    // Find active AI agent for this chat
    const agent = await this.getActiveAgentForChat(chatId);
    if (!agent) {
      logger.debug(`No active agent found for chat ${chatId}`);
      return;
    }

    // Check if agent should respond to this message
    const shouldRespond = await this.shouldAgentRespond(agent, message);
    if (!shouldRespond) {
      logger.debug(`Agent ${agent.id} decided not to respond to message in chat ${chatId}`);
      return;
    }

    // Generate and send response
    await this.generateAndSendResponse(agent, message);
  }

  async handleCommand(message) {
    const chatId = message.chat.id;
    const command = message.text.split(' ')[0].slice(1); // Remove '/' prefix
    const args = message.text.split(' ').slice(1);

    switch (command) {
      case 'start':
        await this.handleStartCommand(chatId, message.from);
        break;
      case 'help':
        await this.handleHelpCommand(chatId);
        break;
      case 'agent':
        await this.handleAgentCommand(chatId);
        break;
      case 'stats':
        await this.handleStatsCommand(chatId);
        break;
      case 'personality':
        await this.handlePersonalityCommand(chatId);
        break;
      case 'settings':
        await this.handleSettingsCommand(chatId, message.from, args);
        break;
      default:
        await this.bot.sendMessage(chatId, 
          `Unknown command: /${command}\nUse /help to see available commands.`);
    }
  }

  async handleStartCommand(chatId, user) {
    const agent = await this.getActiveAgentForChat(chatId);
    
    if (agent) {
      const welcomeMessage = `
👋 Hello ${user.first_name}! I'm ${agent.name}, your AI assistant in this group.

🎭 Personality: ${agent.personality_type.replace('_', ' ')}
🎯 Voice: ${agent.voice_tone}
📱 Platforms: ${agent.platforms.join(', ')}

I'm here to engage in conversations and provide helpful responses. Just mention me or use my keywords to get my attention!

Use /help to see what I can do.
      `;
      
      await this.bot.sendMessage(chatId, welcomeMessage);
    } else {
      await this.bot.sendMessage(chatId, 
        `Hi ${user.first_name}! No AI agent is currently active in this group. ` +
        `An admin needs to add an agent first.`);
    }
  }

  async handleHelpCommand(chatId) {
    const helpMessage = `
🤖 AI Agent Commands:

/start - Get started with the AI agent
/help - Show this help message  
/agent - Get information about the current agent
/stats - Show agent performance statistics
/personality - Learn about the agent's personality
/settings - Configure agent behavior (admin only)

💬 To interact with me naturally, just:
• Mention me in your message
• Ask questions about topics I know
• React to my messages for feedback

I'm always learning and improving! 🚀
    `;
    
    await this.bot.sendMessage(chatId, helpMessage);
  }

  async handleAgentCommand(chatId) {
    const agent = await this.getActiveAgentForChat(chatId);
    
    if (!agent) {
      await this.bot.sendMessage(chatId, 'No AI agent is currently active in this group.');
      return;
    }

    const agentInfo = `
🤖 Agent Information:

📛 Name: ${agent.name}
🎭 Personality: ${agent.personality_type.replace('_', ' ')}
🎵 Voice Tone: ${agent.voice_tone}
😄 Humor Style: ${agent.humor_style || 'Adaptive'}
🧠 Intelligence Level: ${agent.intelligence_level || 'Standard'}
🌶️ Controversy Comfort: ${agent.controversy_comfort}%

📊 Performance:
• Posts Generated: ${agent.total_posts_generated}
• Replies Sent: ${agent.total_replies_sent}  
• Average Engagement: ${agent.average_engagement_rate}%
• Evolution Stage: ${agent.evolution_stage}

🎯 Topics I discuss: ${agent.target_topics.join(', ') || 'General conversation'}
🚫 Topics I avoid: ${agent.avoid_topics.join(', ') || 'None specified'}

Last Active: ${new Date(agent.last_activity).toLocaleString()}
    `;
    
    await this.bot.sendMessage(chatId, agentInfo);
  }

  async handleStatsCommand(chatId) {
    const agent = await this.getActiveAgentForChat(chatId);
    
    if (!agent) {
      await this.bot.sendMessage(chatId, 'No AI agent is currently active in this group.');
      return;
    }

    // Get Telegram-specific stats
    const telegramStats = await this.getTelegramStats(agent.id, chatId);
    
    const statsMessage = `
📊 Agent Statistics for this Group:

📱 Telegram Performance:
• Messages Sent: ${telegramStats.messages_sent}
• Users Interacted: ${telegramStats.users_interacted}
• Response Rate: ${telegramStats.response_rate}%
• Average Response Time: ${telegramStats.avg_response_time}s

🎯 Engagement:
• Positive Reactions: ${telegramStats.positive_reactions}
• Negative Reactions: ${telegramStats.negative_reactions}
• Conversation Starters: ${telegramStats.conversation_starters}

📈 Trends (Last 7 Days):
• Daily Message Average: ${telegramStats.daily_average}
• Most Active Hour: ${telegramStats.peak_hour}:00
• Engagement Growth: ${telegramStats.engagement_growth}%

Evolution Progress: ${this.getEvolutionProgress(agent)}
    `;
    
    await this.bot.sendMessage(chatId, statsMessage);
  }

  async storeMessage(message) {
    try {
      await this.db.query(`
        INSERT INTO telegram_messages 
        (chat_id, message_id, user_id, username, first_name, message_text, message_type, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (chat_id, message_id) DO NOTHING
      `, [
        message.chat.id,
        message.message_id,
        message.from.id,
        message.from.username,
        message.from.first_name,
        message.text || '',
        this.getMessageType(message)
      ]);
    } catch (error) {
      logger.error('Failed to store Telegram message:', error);
    }
  }

  async getActiveAgentForChat(chatId) {
    try {
      const result = await this.db.query(`
        SELECT a.*, tg.chat_title, tg.agent_permissions
        FROM ai_agents a
        JOIN telegram_groups tg ON a.id = tg.agent_id
        WHERE tg.chat_id = $1 AND tg.is_active = true AND a.is_active = true
        LIMIT 1
      `, [chatId]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Failed to get active agent for chat:', error);
      return null;
    }
  }

  async shouldAgentRespond(agent, message) {
    const messageText = message.text || '';
    const chatId = message.chat.id;
    
    // Don't respond to bot messages
    if (message.from.is_bot) {
      return false;
    }

    // Always respond if mentioned
    const botUsername = await this.getBotUsername();
    if (messageText.includes(`@${botUsername}`)) {
      return true;
    }

    // Check if message contains agent's target topics
    const hasTargetTopics = agent.target_topics.some(topic => 
      messageText.toLowerCase().includes(topic.toLowerCase())
    );

    // Check if message contains avoided topics
    const hasAvoidedTopics = agent.avoid_topics.some(topic =>
      messageText.toLowerCase().includes(topic.toLowerCase())
    );

    if (hasAvoidedTopics) {
      return false;
    }

    // Respond with some probability based on agent settings
    const responseChance = hasTargetTopics ? 0.8 : 0.3;
    
    // Check recent activity to avoid spam
    const recentMessages = await this.getRecentAgentMessages(agent.id, chatId, 5);
    if (recentMessages.length >= 2) {
      return Math.random() < 0.1; // Very low chance if recently active
    }

    return Math.random() < responseChance;
  }

  async generateAndSendResponse(agent, message) {
    try {
      const chatId = message.chat.id;
      const messageText = message.text || '';

      // Get or create personality agent instance
      const personalityAgent = await this.getPersonalityAgent(agent);

      // Get conversation context
      const context = await this.getConversationContext(chatId, 5);

      // Generate response
      const response = await personalityAgent.generateTelegramResponse({
        originalMessage: messageText,
        author: message.from.first_name,
        context: context,
        chatType: message.chat.type,
        chatTitle: message.chat.title
      });

      if (!response) {
        logger.debug(`Agent ${agent.id} generated empty response for chat ${chatId}`);
        return;
      }

      // Send response
      const sentMessage = await this.bot.sendMessage(chatId, response, {
        reply_to_message_id: message.message_id,
        parse_mode: 'Markdown'
      });

      // Store the response
      await this.storeAgentResponse(agent.id, chatId, message.message_id, sentMessage.message_id, response);

      // Update agent performance
      await this.updateAgentPerformance(agent.id, 'telegram_response');

      logger.info(`Agent ${agent.name} responded in Telegram chat ${chatId}`);

    } catch (error) {
      logger.error('Failed to generate and send Telegram response:', error);
      
      // Send a fallback message
      try {
        await this.bot.sendMessage(chatId, 
          "Sorry, I'm having trouble processing that right now. Please try again later!");
      } catch (fallbackError) {
        logger.error('Failed to send fallback message:', fallbackError);
      }
    }
  }

  async getPersonalityAgent(agent) {
    // Check cache first
    if (this.agentInstances.has(agent.id)) {
      return this.agentInstances.get(agent.id);
    }

    // Create new personality agent instance
    const personalityAgent = new PersonalityAgent({
      name: agent.name,
      personalityType: agent.personality_type,
      voiceTone: agent.voice_tone,
      humorStyle: agent.humor_style,
      intelligenceLevel: agent.intelligence_level,
      controversyComfort: agent.controversy_comfort,
      targetTopics: agent.target_topics,
      avoidTopics: agent.avoid_topics,
      behavioralGuidelines: agent.behavioral_guidelines,
      platforms: agent.platforms
    });

    // Cache for future use
    this.agentInstances.set(agent.id, personalityAgent);
    
    return personalityAgent;
  }

  async getConversationContext(chatId, messageCount = 5) {
    try {
      const result = await this.db.query(`
        SELECT message_text, username, first_name, agent_response, created_at
        FROM telegram_messages 
        WHERE chat_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [chatId, messageCount]);

      return result.rows.reverse(); // Return in chronological order
    } catch (error) {
      logger.error('Failed to get conversation context:', error);
      return [];
    }
  }

  async storeAgentResponse(agentId, chatId, originalMessageId, responseMessageId, responseText) {
    try {
      // Update the original message record
      await this.db.query(`
        UPDATE telegram_messages 
        SET agent_response = $1, agent_responded = true
        WHERE chat_id = $2 AND message_id = $3
      `, [responseText, chatId, originalMessageId]);

      // Store the response as generated content
      await this.db.query(`
        INSERT INTO generated_content 
        (agent_id, platform, content_type, content_text, telegram_chat_id, telegram_message_id, 
         published_at, status, ai_model_used)
        VALUES ($1, 'telegram', 'reply', $2, $3, $4, NOW(), 'published', 'gpt-4')
      `, [agentId, responseText, chatId, responseMessageId]);

    } catch (error) {
      logger.error('Failed to store agent response:', error);
    }
  }

  async updateAgentPerformance(agentId, actionType) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Update daily analytics
      await this.db.query(`
        INSERT INTO daily_analytics 
        (agent_id, date, platform, telegram_messages_sent) 
        VALUES ($1, $2, 'telegram', 1)
        ON CONFLICT (agent_id, date, platform) 
        DO UPDATE SET telegram_messages_sent = daily_analytics.telegram_messages_sent + 1
      `, [agentId, today]);

      // Update agent totals
      await this.db.query(`
        UPDATE ai_agents 
        SET total_replies_sent = total_replies_sent + 1,
            last_activity = NOW()
        WHERE id = $1
      `, [agentId]);

    } catch (error) {
      logger.error('Failed to update agent performance:', error);
    }
  }

  async getTelegramStats(agentId, chatId) {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as messages_sent,
          COUNT(DISTINCT user_id) as users_interacted,
          AVG(CASE WHEN agent_responded THEN 1 ELSE 0 END) * 100 as response_rate
        FROM telegram_messages 
        WHERE chat_id = $1 
        AND agent_response IS NOT NULL
        AND created_at > NOW() - INTERVAL '30 days'
      `, [chatId]);

      const stats = result.rows[0] || {};
      
      return {
        messages_sent: parseInt(stats.messages_sent) || 0,
        users_interacted: parseInt(stats.users_interacted) || 0,
        response_rate: parseFloat(stats.response_rate) || 0,
        avg_response_time: 30, // Placeholder
        positive_reactions: 0, // Placeholder
        negative_reactions: 0, // Placeholder
        conversation_starters: 0, // Placeholder
        daily_average: 0, // Placeholder
        peak_hour: 14, // Placeholder
        engagement_growth: 5 // Placeholder
      };
    } catch (error) {
      logger.error('Failed to get Telegram stats:', error);
      return {};
    }
  }

  getEvolutionProgress(agent) {
    const stages = ['novice', 'intermediate', 'expert', 'legendary'];
    const currentIndex = stages.indexOf(agent.evolution_stage);
    const progress = Math.min((agent.total_replies_sent / 100) * 100, 100);
    return `${agent.evolution_stage} (${progress.toFixed(1)}% to next level)`;
  }

  async getBotUsername() {
    try {
      const me = await this.bot.getMe();
      return me.username;
    } catch (error) {
      logger.error('Failed to get bot username:', error);
      return 'socialai_bot';
    }
  }

  getMessageType(message) {
    if (message.photo) return 'photo';
    if (message.video) return 'video';
    if (message.document) return 'document';
    if (message.sticker) return 'sticker';
    if (message.voice) return 'voice';
    if (message.audio) return 'audio';
    return 'text';
  }

  async getRecentAgentMessages(agentId, chatId, limit = 5) {
    try {
      const result = await this.db.query(`
        SELECT * FROM telegram_messages 
        WHERE chat_id = $1 AND agent_responded = true
        ORDER BY created_at DESC 
        LIMIT $2
      `, [chatId, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get recent agent messages:', error);
      return [];
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    if (this.bot) {
      try {
        await this.bot.deleteWebHook();
        logger.info('✅ Telegram webhook deleted');
      } catch (error) {
        logger.error('Failed to delete Telegram webhook:', error);
      }
    }
    
    this.isInitialized = false;
    logger.info('✅ Telegram Bot Service stopped');
  }
}

module.exports = TelegramBotService; 