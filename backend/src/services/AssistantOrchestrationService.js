/**
 * AssistantOrchestrationService – Handle incoming channel message: resolve session, run agent with optional tool loop, send reply.
 * Uses ConversationService session key; runs OpenAI chat.completions with tools when available.
 */

const OpenAI = require('openai');
const database = require('../database/connection');
const ConversationService = require('./ConversationService');
const AssistantToolRegistry = require('./AssistantToolRegistry');
const { getFormattedSkillsForPrompt } = require('./SkillLoader');
const logger = require('../utils/logger');

const MAX_TOOL_ITERATIONS = 5;

class AssistantOrchestrationService {
  constructor() {
    this.conversationService = new ConversationService();
    this.toolRegistry = new AssistantToolRegistry();
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  }

  /**
   * Handle one incoming message from a channel (Telegram/WhatsApp/Teams).
   * Telegram: chatType/isPrivate allow "group: anyone can chat; DM: only allowed users".
   */
  async handleIncomingMessage(connectionId, messagePayload) {
    const { text, peerId, chatType, isPrivate } = messagePayload;
    if (!text || !peerId) throw new Error('text and peerId required');

    const connection = await this.getConnectionById(connectionId);
    if (!connection) throw new Error('Connection not found or inactive');

    const allowedIds = connection.allowed_peer_ids || [];
    // In groups/supergroups: anyone can use the bot (when @mention or reply). In DM: only allowed users (when list is set).
    const enforceAllowed = isPrivate === true || (chatType !== 'group' && chatType !== 'supergroup');
    if (enforceAllowed && allowedIds.length > 0 && !allowedIds.includes(String(peerId))) {
      await this.sendReplyToChannel(connection, peerId, "You're not authorized to use this assistant. Only the owner can add allowed users in the dashboard.");
      return { unauthorized: true };
    }

    const agent = await database.query(
      'SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2',
      [connection.agent_id, connection.user_id]
    ).then(r => r.rows[0]);
    if (!agent) throw new Error('Agent not found');

    const channel = connection.channel;
    const conversation = await this.conversationService.getOrCreateBySessionKey(
      connection.agent_id,
      connection.user_id,
      channel,
      String(peerId),
      {}
    );

    await this.conversationService.addMessage(conversation.id, 'user', { content: text });

    let replyText = '';
    const tools = this.toolRegistry.getToolsForConnection(connection);
    const useTools = this.openai && tools.length > 0;

    if (useTools) {
      try {
        replyText = await this.runAgentWithTools(connection, agent, conversation.id, text);
      } catch (err) {
        logger.error('AssistantOrchestrationService runAgentWithTools failed:', err);
        replyText = 'Something went wrong. Please try again.';
      }
    } else {
      try {
        const AIContentService = require('./AIContentService');
        const result = await AIContentService.generateContent(agent, {
          content_type: 'conversation',
          topic: text
        });
        replyText = (result && result.content) ? result.content : 'I couldn’t generate a reply. Please try again.';
      } catch (err) {
        logger.error('AssistantOrchestrationService generateContent failed:', err);
        replyText = 'Something went wrong. Please try again.';
      }
    }

    await this.conversationService.addMessage(conversation.id, 'agent', { content: replyText });
    await this.sendReplyToChannel(connection, peerId, replyText);

    return { conversationId: conversation.id, replyText };
  }

  /**
   * Build system prompt for the assistant (personality + skills + current date/time).
   */
  async buildSystemPrompt(agent) {
    const skillsText = await getFormattedSkillsForPrompt({});
    const personality = agent.personality_type || 'helpful';
    const name = agent.name || 'Assistant';
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const dayName = now.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });
    const timeStr = now.toISOString().slice(11, 19);
    const currentDateTime = `Current date and time (UTC): ${dayName}, ${dateStr} at ${timeStr} UTC. ISO: ${now.toISOString()}.`;
    return `You are ${name}, a personal assistant. Be concise and helpful.
Personality: ${personality}

**IMPORTANT – Dates and scheduling:** ${currentDateTime}
When the user says "Friday", "next week", "tomorrow", etc., you MUST interpret this relative to TODAY (the current date above). Always use the current year and compute the correct future date. Never book meetings in the past or use outdated years (e.g. 2023 when today is 2026).

${skillsText}
Reply in plain text. When you use a tool, summarize the result for the user in a short reply.`;
  }

  /**
   * Run agent with tool loop: conversation history + latest user message, then OpenAI with tools until no more tool_calls or limit.
   */
  async runAgentWithTools(connection, agent, conversationId, latestUserText) {
    const history = await this.conversationService.getConversationContext(conversationId, 15);
    const messages = history
      .filter(m => m.role === 'user' || m.role === 'agent')
      .map(m => ({ role: m.role === 'agent' ? 'assistant' : m.role, content: m.content || '' }));
    messages.push({ role: 'user', content: latestUserText });

    const systemPrompt = await this.buildSystemPrompt(agent);
    const tools = this.toolRegistry.getToolsForConnection(connection);
    const openaiMessages = [{ role: 'system', content: systemPrompt }, ...messages];

    let iteration = 0;
    while (iteration < MAX_TOOL_ITERATIONS) {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        tools: tools.length ? tools : undefined,
        tool_choice: tools.length ? 'auto' : undefined,
        max_tokens: 1024
      });

      const choice = response.choices && response.choices[0];
      if (!choice || !choice.message) {
        return 'I couldn’t generate a reply. Please try again.';
      }

      const msg = choice.message;
      openaiMessages.push(msg);

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const tc of msg.tool_calls) {
          const name = tc.function?.name;
          let args = {};
          try {
            if (tc.function?.arguments) args = JSON.parse(tc.function.arguments);
          } catch (_) {}
          const result = await this.toolRegistry.runTool(name, args, {
            userId: connection.user_id,
            agent
          });
          openaiMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: String(result)
          });
        }
        iteration++;
        continue;
      }

      return (msg.content && msg.content.trim()) || 'Done.';
    }

    const lastAssistant = openaiMessages.filter(m => m.role === 'assistant').pop();
    return (lastAssistant && lastAssistant.content && lastAssistant.content.trim()) || 'Done.';
  }

  /**
   * Run one turn headless (no channel): for workflow/multi-agent. Uses same tool loop, returns reply text.
   * @param {Object} agent - ai_agents row
   * @param {string} userId - user id
   * @param {string} inputText - user message for this step
   * @param {{ previousContext?: string }} options - optional context from previous workflow steps
   */
  async runOneTurnHeadless(agent, userId, inputText, options = {}) {
    if (!this.openai || !agent) throw new Error('OpenAI or agent missing');
    const previousContext = options.previousContext || '';
    const connection = {
      agent_id: agent.id,
      user_id: userId,
      channel: 'workflow',
      enabled_tool_categories: agent.enabled_tool_categories || []
    };
    const systemPrompt = await this.buildSystemPrompt(agent);
    const tools = this.toolRegistry.getToolsForConnection(connection);
    const messages = [];
    if (previousContext.trim()) {
      messages.push({ role: 'user', content: `Context from previous steps:\n${previousContext}` });
      messages.push({ role: 'assistant', content: 'Understood. I have the context.' });
    }
    messages.push({ role: 'user', content: inputText });
    const openaiMessages = [{ role: 'system', content: systemPrompt }, ...messages];

    let iteration = 0;
    while (iteration < MAX_TOOL_ITERATIONS) {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        tools: tools.length ? tools : undefined,
        tool_choice: tools.length ? 'auto' : undefined,
        max_tokens: 1024
      });

      const choice = response.choices && response.choices[0];
      if (!choice || !choice.message) return 'I couldn’t generate a reply.';

      const msg = choice.message;
      openaiMessages.push(msg);

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const tc of msg.tool_calls) {
          const name = tc.function?.name;
          let args = {};
          try { if (tc.function?.arguments) args = JSON.parse(tc.function.arguments); } catch (_) {}
          const result = await this.toolRegistry.runTool(name, args, { userId, agent });
          openaiMessages.push({ role: 'tool', tool_call_id: tc.id, content: String(result) });
        }
        iteration++;
        continue;
      }

      return (msg.content && msg.content.trim()) || 'Done.';
    }

    const lastAssistant = openaiMessages.filter(m => m.role === 'assistant').pop();
    return (lastAssistant && lastAssistant.content && lastAssistant.content.trim()) || 'Done.';
  }

  async getConnectionById(connectionId) {
    const ChannelConnectionService = require('./ChannelConnectionService');
    const svc = new ChannelConnectionService();
    return svc.findByIdForWebhook(connectionId);
  }

  async sendReplyToChannel(connection, peerId, messageText) {
    if (connection.channel === 'telegram') {
      const TelegramAssistantConnector = require('./TelegramAssistantConnector');
      const connector = new TelegramAssistantConnector();
      await connector.sendReply(connection, peerId, messageText);
    } else if (connection.channel === 'whatsapp') {
      const WhatsAppAssistantConnector = require('./WhatsAppAssistantConnector');
      const connector = new WhatsAppAssistantConnector();
      await connector.sendReply(connection, peerId, messageText);
    } else if (connection.channel === 'teams') {
      logger.warn('Teams connector not implemented yet');
    } else if (connection.channel === 'discord') {
      const DiscordAssistantConnector = require('./DiscordAssistantConnector');
      const connector = new DiscordAssistantConnector();
      await connector.sendReply(connection, peerId, messageText);
    } else if (connection.channel === 'slack') {
      const SlackAssistantConnector = require('./SlackAssistantConnector');
      const connector = new SlackAssistantConnector();
      await connector.sendReply(connection, peerId, messageText);
    }
  }
}

module.exports = AssistantOrchestrationService;
