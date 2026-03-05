const database = require('../database/connection');
const logger = require('../utils/logger');
const WhatsAppService = require('./WhatsAppService');
const WhatsAppContactService = require('./WhatsAppContactService');
const { v4: uuidv4 } = require('uuid');

// Lazy load PersonalityAgent to avoid errors if not available
let PersonalityAgent = null;
function getPersonalityAgent() {
  if (!PersonalityAgent) {
    try {
      PersonalityAgent = require('./PersonalityAgent');
    } catch (error) {
      logger.warn('PersonalityAgent not available:', error.message);
    }
  }
  return PersonalityAgent;
}

/**
 * WhatsApp Bot Service
 * Handles automated replies, AI agent integration, and bot management
 */
class WhatsAppBotService {
  /**
   * Create bot
   */
  async createBot(userId, wabaId, botData) {
    try {
      const {
        name,
        triggerType,
        triggerText,
        replyType,
        replyText,
        templateId,
        flowId,
        aiAgentId,
        headerText,
        footerText,
        buttons = [],
        isActive = true,
        priority = 0
      } = botData;

      // Validate required fields
      if (!name || !triggerType || !replyType) {
        throw new Error('Bot name, trigger type, and reply type are required');
      }

      // Validate trigger type
      const validTriggerTypes = ['exact_match', 'contains', 'first_message', 'keyword'];
      if (!validTriggerTypes.includes(triggerType)) {
        throw new Error(`Invalid trigger type. Must be one of: ${validTriggerTypes.join(', ')}`);
      }

      // Validate reply type
      const validReplyTypes = ['text', 'template', 'flow', 'ai_agent'];
      if (!validReplyTypes.includes(replyType)) {
        throw new Error(`Invalid reply type. Must be one of: ${validReplyTypes.join(', ')}`);
      }

      // Validate trigger text for non-first_message triggers
      if (triggerType !== 'first_message' && !triggerText) {
        throw new Error('Trigger text is required for this trigger type');
      }

      // Validate reply content based on type
      if (replyType === 'text' && !replyText) {
        throw new Error('Reply text is required for text reply type');
      }

      if (replyType === 'template' && !templateId) {
        throw new Error('Template ID is required for template reply type');
      }

      if (replyType === 'ai_agent' && !aiAgentId) {
        throw new Error('AI Agent ID is required for AI agent reply type');
      }

      // Create bot
      const botId = uuidv4();
      const result = await database.query(
        `INSERT INTO whatsapp_bots 
         (id, user_id, waba_id, name, trigger_type, trigger_text, reply_type, reply_text, 
          template_id, flow_id, ai_agent_id, header_text, footer_text, buttons, is_active, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING *`,
        [
          botId,
          userId,
          wabaId,
          name,
          triggerType,
          triggerText || null,
          replyType,
          replyText || null,
          templateId || null,
          flowId || null,
          aiAgentId || null,
          headerText || null,
          footerText || null,
          JSON.stringify(buttons),
          isActive,
          priority
        ]
      );

      logger.info('Bot created', { botId, userId, name, triggerType, replyType });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating bot:', error);
      throw error;
    }
  }

  /**
   * Get bot by ID
   */
  async getBotById(botId, userId) {
    try {
      const result = await database.query(
        `SELECT b.*, 
                t.template_name, t.template_id as whatsapp_template_id,
                a.name as ai_agent_name
         FROM whatsapp_bots b
         LEFT JOIN whatsapp_templates t ON b.template_id = t.id
         LEFT JOIN ai_agents a ON b.ai_agent_id = a.id
         WHERE b.id = $1 AND b.user_id = $2`,
        [botId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting bot:', error);
      throw error;
    }
  }

  /**
   * Get bots with filters
   */
  async getBots(userId, filters = {}) {
    try {
      const {
        wabaId,
        triggerType,
        replyType,
        isActive,
        limit = 50,
        offset = 0
      } = filters;

      let query = `
        SELECT b.*, 
               t.template_name,
               a.name as ai_agent_name
        FROM whatsapp_bots b
        LEFT JOIN whatsapp_templates t ON b.template_id = t.id
        LEFT JOIN ai_agents a ON b.ai_agent_id = a.id
        WHERE b.user_id = $1
      `;
      const params = [userId];
      let paramCount = 1;

      if (wabaId) {
        paramCount++;
        query += ` AND b.waba_id = $${paramCount}`;
        params.push(wabaId);
      }

      if (triggerType) {
        paramCount++;
        query += ` AND b.trigger_type = $${paramCount}`;
        params.push(triggerType);
      }

      if (replyType) {
        paramCount++;
        query += ` AND b.reply_type = $${paramCount}`;
        params.push(replyType);
      }

      if (isActive !== undefined) {
        paramCount++;
        query += ` AND b.is_active = $${paramCount}`;
        params.push(isActive);
      }

      query += ` ORDER BY b.priority DESC, b.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await database.query(query, params);

      // Get total count
      let countQuery = `SELECT COUNT(*) as total FROM whatsapp_bots WHERE user_id = $1`;
      const countParams = [userId];
      let countParamCount = 1;

      if (wabaId) {
        countParamCount++;
        countQuery += ` AND waba_id = $${countParamCount}`;
        countParams.push(wabaId);
      }

      if (triggerType) {
        countParamCount++;
        countQuery += ` AND trigger_type = $${countParamCount}`;
        countParams.push(triggerType);
      }

      if (replyType) {
        countParamCount++;
        countQuery += ` AND reply_type = $${countParamCount}`;
        countParams.push(replyType);
      }

      if (isActive !== undefined) {
        countParamCount++;
        countQuery += ` AND is_active = $${countParamCount}`;
        countParams.push(isActive);
      }

      const countResult = await database.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return {
        bots: result.rows,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error getting bots:', error);
      throw error;
    }
  }

  /**
   * Update bot
   */
  async updateBot(botId, userId, updates) {
    try {
      // Check ownership
      const checkResult = await database.query(
        'SELECT id FROM whatsapp_bots WHERE id = $1 AND user_id = $2',
        [botId, userId]
      );

      if (checkResult.rows.length === 0) {
        throw new Error('Bot not found');
      }

      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(updates.name);
      }

      if (updates.triggerType !== undefined) {
        updateFields.push(`trigger_type = $${paramCount++}`);
        values.push(updates.triggerType);
      }

      if (updates.triggerText !== undefined) {
        updateFields.push(`trigger_text = $${paramCount++}`);
        values.push(updates.triggerText);
      }

      if (updates.replyType !== undefined) {
        updateFields.push(`reply_type = $${paramCount++}`);
        values.push(updates.replyType);
      }

      if (updates.replyText !== undefined) {
        updateFields.push(`reply_text = $${paramCount++}`);
        values.push(updates.replyText);
      }

      if (updates.templateId !== undefined) {
        updateFields.push(`template_id = $${paramCount++}`);
        values.push(updates.templateId);
      }

      if (updates.aiAgentId !== undefined) {
        updateFields.push(`ai_agent_id = $${paramCount++}`);
        values.push(updates.aiAgentId);
      }

      if (updates.headerText !== undefined) {
        updateFields.push(`header_text = $${paramCount++}`);
        values.push(updates.headerText);
      }

      if (updates.footerText !== undefined) {
        updateFields.push(`footer_text = $${paramCount++}`);
        values.push(updates.footerText);
      }

      if (updates.buttons !== undefined) {
        updateFields.push(`buttons = $${paramCount++}`);
        values.push(JSON.stringify(updates.buttons));
      }

      if (updates.isActive !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        values.push(updates.isActive);
      }

      if (updates.priority !== undefined) {
        updateFields.push(`priority = $${paramCount++}`);
        values.push(updates.priority);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(botId);

      await database.query(
        `UPDATE whatsapp_bots 
         SET ${updateFields.join(', ')}, updated_at = NOW()
         WHERE id = $${paramCount++}`,
        values
      );

      return await this.getBotById(botId, userId);
    } catch (error) {
      logger.error('Error updating bot:', error);
      throw error;
    }
  }

  /**
   * Delete bot
   */
  async deleteBot(botId, userId) {
    try {
      // Check ownership
      const checkResult = await database.query(
        'SELECT id FROM whatsapp_bots WHERE id = $1 AND user_id = $2',
        [botId, userId]
      );

      if (checkResult.rows.length === 0) {
        throw new Error('Bot not found');
      }

      await database.query(
        'DELETE FROM whatsapp_bots WHERE id = $1',
        [botId]
      );

      return { success: true };
    } catch (error) {
      logger.error('Error deleting bot:', error);
      throw error;
    }
  }

  /**
   * Process incoming message and find matching bot
   */
  async processIncomingMessage(userId, wabaId, contactId, phoneNumber, messageText, isFirstMessage = false) {
    try {
      // Get active bots for this WABA, ordered by priority
      const botsResult = await database.query(
        `SELECT * FROM whatsapp_bots 
         WHERE waba_id = $1 AND is_active = true
         ORDER BY priority DESC, created_at ASC`,
        [wabaId]
      );

      if (botsResult.rows.length === 0) {
        return null;
      }

      // Check each bot to find a match
      for (const bot of botsResult.rows) {
        if (await this.checkBotTrigger(bot, messageText, isFirstMessage)) {
          logger.info('Bot triggered', { botId: bot.id, botName: bot.name, triggerType: bot.trigger_type });
          return bot;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error processing incoming message:', error);
      throw error;
    }
  }

  /**
   * Check if bot trigger matches
   */
  async checkBotTrigger(bot, messageText, isFirstMessage) {
    try {
      const { triggerType, triggerText } = bot;

      switch (triggerType) {
        case 'exact_match':
          return messageText.toLowerCase().trim() === triggerText.toLowerCase().trim();

        case 'contains':
          return messageText.toLowerCase().includes(triggerText.toLowerCase());

        case 'first_message':
          return isFirstMessage;

        case 'keyword':
          // Check if message contains any of the keywords (comma-separated)
          const keywords = triggerText.split(',').map(k => k.trim().toLowerCase());
          const messageLower = messageText.toLowerCase();
          return keywords.some(keyword => messageLower.includes(keyword));

        default:
          return false;
      }
    } catch (error) {
      logger.error('Error checking bot trigger:', error);
      return false;
    }
  }

  /**
   * Execute bot response
   */
  async executeBotResponse(bot, userId, wabaId, contactId, phoneNumber, messageText, context = {}) {
    try {
      const { replyType, replyText, templateId, aiAgentId, headerText, footerText, buttons } = bot;

      let response = null;
      let responseType = 'text';

      switch (replyType) {
        case 'text':
          response = await this.executeTextResponse(bot, contactId, phoneNumber, messageText, context);
          break;

        case 'template':
          response = await this.executeTemplateResponse(bot, wabaId, phoneNumber, context);
          break;

        case 'flow':
          response = await this.executeFlowResponse(bot, wabaId, phoneNumber, context);
          break;

        case 'ai_agent':
          response = await this.executeAIAgentResponse(bot, userId, wabaId, contactId, phoneNumber, messageText, context);
          break;

        default:
          throw new Error(`Unsupported reply type: ${replyType}`);
      }

      if (!response) {
        logger.warn('Bot response was empty', { botId: bot.id });
        return null;
      }

      // Log bot execution
      await database.query(
        `INSERT INTO whatsapp_bot_executions 
         (bot_id, contact_id, phone_number, message_text, response_text, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [bot.id, contactId, phoneNumber, messageText, typeof response === 'string' ? response : JSON.stringify(response)]
      );

      return response;
    } catch (error) {
      logger.error('Error executing bot response:', error);
      throw error;
    }
  }

  /**
   * Execute text response
   */
  async executeTextResponse(bot, contactId, phoneNumber, messageText, context) {
    try {
      let responseText = bot.replyText;

      // Replace variables in response text
      responseText = this.replaceVariables(responseText, {
        name: context.contactName || phoneNumber,
        phone: phoneNumber,
        message: messageText,
        ...context.customFields
      });

      // Build message with header and footer
      let fullMessage = '';

      if (bot.headerText) {
        fullMessage += bot.headerText + '\n\n';
      }

      fullMessage += responseText;

      if (bot.footerText) {
        fullMessage += '\n\n' + bot.footerText;
      }

      // Get account details for sending
      const accountResult = await database.query(
        'SELECT phone_number_id FROM whatsapp_business_accounts WHERE id = $1',
        [bot.waba_id]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('WhatsApp Business Account not found');
      }

      // Send text message
      const response = await WhatsAppService.sendTextMessage(
        bot.waba_id, // This is the database UUID
        phoneNumber,
        fullMessage,
        { userId: bot.user_id }
      );

      // If buttons are provided, send them as a follow-up (WhatsApp doesn't support buttons in regular text messages)
      // Buttons would need to be sent via template or flow

      return response;
    } catch (error) {
      logger.error('Error executing text response:', error);
      throw error;
    }
  }

  /**
   * Execute template response
   */
  async executeTemplateResponse(bot, wabaId, phoneNumber, context) {
    try {
      // Get template
      const templateResult = await database.query(
        'SELECT * FROM whatsapp_templates WHERE id = $1',
        [bot.template_id]
      );

      if (templateResult.rows.length === 0) {
        throw new Error('Template not found');
      }

      const template = templateResult.rows[0];

      if (template.status !== 'approved') {
        throw new Error('Template must be approved before use');
      }

      // Build template components with variables
      const components = this.buildTemplateComponents(template, {
        name: context.contactName || phoneNumber,
        phone: phoneNumber,
        ...context.customFields
      });

      // Send template message
      const response = await WhatsAppService.sendTemplateMessage(
        wabaId,
        phoneNumber,
        template.template_id || template.template_name,
        template.language || 'en',
        components
      );

      return response;
    } catch (error) {
      logger.error('Error executing template response:', error);
      throw error;
    }
  }

  /**
   * Execute flow response
   */
  async executeFlowResponse(bot, wabaId, phoneNumber, context) {
    try {
      // Get flow
      const flowResult = await database.query(
        'SELECT * FROM whatsapp_flows WHERE id = $1',
        [bot.flow_id]
      );

      if (flowResult.rows.length === 0) {
        throw new Error('Flow not found');
      }

      const flow = flowResult.rows[0];

      if (!flow.flow_token) {
        throw new Error('Flow not published. Please publish the flow first.');
      }

      // Send flow message (would need WhatsApp Flow API integration)
      // For now, return a placeholder
      logger.info('Flow response triggered', { flowId: flow.id, flowToken: flow.flow_token });

      // TODO: Implement WhatsApp Flow message sending
      // This would require the WhatsApp Flow API which is more complex

      return { message: 'Flow response triggered', flowToken: flow.flow_token };
    } catch (error) {
      logger.error('Error executing flow response:', error);
      throw error;
    }
  }

  /**
   * Execute AI agent response
   */
  async executeAIAgentResponse(bot, userId, wabaId, contactId, phoneNumber, messageText, context) {
    try {
      // Get AI agent
      const agentResult = await database.query(
        'SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2 AND is_active = true',
        [bot.ai_agent_id, userId]
      );

      if (agentResult.rows.length === 0) {
        throw new Error('AI Agent not found or inactive');
      }

      const agent = agentResult.rows[0];

      // Get PersonalityAgent
      const PersonalityAgentClass = getPersonalityAgent();
      if (!PersonalityAgentClass) {
        throw new Error('PersonalityAgent not available');
      }

      // Get conversation history
      const conversationHistory = await this.getConversationHistory(contactId, 10);

      // Build context for AI agent
      const aiContext = {
        platform: 'whatsapp',
        originalMessage: messageText,
        author: context.contactName || phoneNumber,
        conversation: conversationHistory,
        agent: agent
      };

      // Generate response using PersonalityAgent
      // Note: This is a simplified version - you may need to adapt based on your PersonalityAgent implementation
      let response = null;

      try {
        // Try to use CompanyAwarePersonalityAgent if available
        const CompanyAwarePersonalityAgent = require('./CompanyAwarePersonalityAgent');
        const personalityAgent = new CompanyAwarePersonalityAgent(agent);
        response = await personalityAgent.generateContent({
          type: 'reply',
          platform: 'whatsapp',
          originalTweet: { text: messageText },
          conversationContext: {
            conversationTone: 'friendly',
            userSentiment: 'neutral',
            previousReplies: conversationHistory
          }
        });
      } catch (error) {
        // Fallback to basic PersonalityAgent
        logger.warn('CompanyAwarePersonalityAgent not available, using basic agent');
        const personalityAgent = new PersonalityAgentClass(agent);
        response = await personalityAgent.generateContent({
          type: 'reply',
          platform: 'whatsapp',
          originalTweet: { text: messageText }
        });
      }

      if (!response) {
        // Fallback to default response
        response = bot.replyText || "Thank you for your message! I'm here to help.";
      }

      // Add header and footer if provided
      let fullResponse = '';
      if (bot.headerText) {
        fullResponse += bot.headerText + '\n\n';
      }
      fullResponse += response;
      if (bot.footerText) {
        fullResponse += '\n\n' + bot.footerText;
      }

      // Send response
      const sendResponse = await WhatsAppService.sendTextMessage(
        wabaId,
        phoneNumber,
        fullResponse,
        { userId }
      );

      return sendResponse;
    } catch (error) {
      logger.error('Error executing AI agent response:', error);
      
      // Fallback to text response if AI fails
      if (bot.replyText) {
        return await this.executeTextResponse(bot, contactId, phoneNumber, messageText, context);
      }

      throw error;
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(contactId, limit = 10) {
    try {
      const result = await database.query(
        `SELECT text_content, direction, created_at
         FROM whatsapp_messages
         WHERE contact_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [contactId, limit]
      );

      return result.rows.reverse().map(msg => ({
        text: msg.text_content,
        direction: msg.direction,
        timestamp: msg.created_at
      }));
    } catch (error) {
      logger.error('Error getting conversation history:', error);
      return [];
    }
  }

  /**
   * Replace variables in text
   */
  replaceVariables(text, variables) {
    if (!text) return '';

    let result = text;

    // Replace {{variable}} format
    result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] || match;
    });

    // Replace ((variable)) format (alternative syntax)
    result = result.replace(/\(\((\w+)\)\)/g, (match, varName) => {
      return variables[varName] || match;
    });

    return result;
  }

  /**
   * Build template components with variables
   */
  buildTemplateComponents(template, variables) {
    const components = [];

    // Body component with variables
    if (template.body_text) {
      let bodyText = template.body_text;
      const bodyVars = [];

      // Extract variables from body text ({{1}}, {{2}}, etc.)
      const varMatches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
      for (const match of varMatches) {
        const varNum = parseInt(match.replace(/\{\{|\}\}/g, ''));
        const varValue = variables[`var${varNum}`] || variables[varNum] || variables.name || '';
        bodyText = bodyText.replace(match, varValue);
        bodyVars.push({ type: 'text', text: varValue });
      }

      if (bodyVars.length > 0) {
        components.push({
          type: 'body',
          parameters: bodyVars
        });
      }
    }

    return components;
  }

  /**
   * Test bot
   */
  async testBot(botId, userId, testMessage) {
    try {
      const bot = await this.getBotById(botId, userId);

      if (!bot) {
        throw new Error('Bot not found');
      }

      // Check if trigger matches
      const isFirstMessage = false; // For testing, assume not first message
      const matches = await this.checkBotTrigger(bot, testMessage, isFirstMessage);

      return {
        matches,
        triggerType: bot.trigger_type,
        triggerText: bot.trigger_text,
        wouldExecute: matches && bot.is_active
      };
    } catch (error) {
      logger.error('Error testing bot:', error);
      throw error;
    }
  }

  /**
   * Check if contact has sent first message
   */
  async isFirstMessage(contactId) {
    try {
      const result = await database.query(
        `SELECT COUNT(*) as message_count
         FROM whatsapp_messages
         WHERE contact_id = $1 AND direction = 'inbound'`,
        [contactId]
      );

      return parseInt(result.rows[0].message_count) === 1;
    } catch (error) {
      logger.error('Error checking first message:', error);
      return false;
    }
  }
}

module.exports = new WhatsAppBotService();
