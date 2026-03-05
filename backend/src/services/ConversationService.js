const database = require('../database/connection');
const logger = require('../utils/logger');

class ConversationService {
  constructor() {
    this.activeConversations = new Map(); // Cache active conversations
  }

  /**
   * Create a new conversation between user and agent.
   * Options: title, voiceSettings, sourceChannel ('telegram'|'whatsapp'|'teams'|'widget'|'api'), sourcePeerId (channel peer id).
   */
  async createConversation(userId, agentId, options = {}) {
    try {
      const conversationData = {
        user_id: userId,
        agent_id: agentId,
        status: 'active',
        title: options.title || null,
        voice_settings: options.voiceSettings || {},
        source_channel: options.sourceChannel || null,
        source_peer_id: options.sourcePeerId || null
      };

      // Verify agent belongs to user
      const agentCheck = await database.query(`
        SELECT id, name FROM ai_agents 
        WHERE id = $1 AND user_id = $2
      `, [agentId, userId]);

      if (agentCheck.rows.length === 0) {
        throw new Error('Agent not found or access denied');
      }

      const result = await database.query(`
        INSERT INTO conversations (user_id, agent_id, status, title, voice_settings, source_channel, source_peer_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        conversationData.user_id,
        conversationData.agent_id,
        conversationData.status,
        conversationData.title,
        JSON.stringify(conversationData.voice_settings),
        conversationData.source_channel,
        conversationData.source_peer_id
      ]);

      const conversation = result.rows[0];
      
      // Add system message to start conversation
      await this.addMessage(conversation.id, 'system', { 
        content: `Conversation started with agent "${agentCheck.rows[0].name}"`
      });

      logger.info(`Created conversation ${conversation.id} for user ${userId} with agent ${agentId}`);
      
      return conversation;
    } catch (error) {
      logger.error('Failed to create conversation:', error);
      throw error;
    }
  }

  /**
   * Get agent by ID (for anonymous users)
   */
  async getAgent(agentId) {
    try {
      const result = await database.query(
        'SELECT * FROM ai_agents WHERE id = $1 AND is_active = true',
        [agentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Agent not found or inactive');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get agent:', error);
      throw error;
    }
  }

  /**
   * Get or create a conversation by session key (agent + channel + peer).
   * Used by AI Assistant: one conversation per (agent, telegram/whatsapp/teams, peer_id).
   * userId = connection owner (agent's user); sourcePeerId = e.g. Telegram chat/user id.
   */
  async getOrCreateBySessionKey(agentId, userId, sourceChannel, sourcePeerId, options = {}) {
    if (!sourceChannel || !sourcePeerId) {
      throw new Error('sourceChannel and sourcePeerId are required for session key');
    }
    try {
      const agentCheck = await database.query(`
        SELECT id, name FROM ai_agents WHERE id = $1 AND user_id = $2
      `, [agentId, userId]);
      if (agentCheck.rows.length === 0) {
        throw new Error('Agent not found or access denied');
      }
      const existing = await database.query(`
        SELECT * FROM conversations
        WHERE agent_id = $1 AND source_channel = $2 AND source_peer_id = $3 AND status = 'active'
        LIMIT 1
      `, [agentId, sourceChannel, sourcePeerId]);
      if (existing.rows.length > 0) {
        return existing.rows[0];
      }
      return await this.createConversation(userId, agentId, {
        ...options,
        sourceChannel,
        sourcePeerId
      });
    } catch (error) {
      logger.error('Failed getOrCreateBySessionKey:', error);
      throw error;
    }
  }

  /**
   * Get conversation with full history
   */
  async getConversation(conversationId, userId) {
    try {
      // Get conversation details
      const conversation = await database.query(`
        SELECT c.*, a.name as agent_name, a.personality_type, a.voice_tone
        FROM conversations c
        JOIN ai_agents a ON c.agent_id = a.id
        WHERE c.id = $1 AND c.user_id = $2
      `, [conversationId, userId]);

      if (conversation.rows.length === 0) {
        throw new Error('Conversation not found');
      }

      // Get message history
      const messages = await database.query(`
        SELECT *
        FROM conversation_messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
      `, [conversationId]);

      return {
        conversation: conversation.rows[0],
        messages: messages.rows
      };
    } catch (error) {
      logger.error('Failed to get conversation:', error);
      throw error;
    }
  }

  /**
   * Add a message to conversation
   */
  async addMessage(conversationId, role, message) {
    try {
      const result = await database.query(`
        INSERT INTO conversation_messages (conversation_id, role, content, audio_url, audio_duration_ms, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        conversationId,
        role,
        message.content,
        message.audioUrl || null,
        message.audioDurationMs || null,
        JSON.stringify(message.metadata || {})
      ]);

      const newMessage = result.rows[0];
      
      // Cache recent conversations for quick access
      this.cacheConversationMessage(conversationId, newMessage);

      logger.info(`Added message to conversation ${conversationId}: ${role}`);
      return newMessage;
    } catch (error) {
      logger.error('Failed to add message:', error);
      throw error;
    }
  }

  /**
   * Get user's conversation list
   */
  async getUserConversations(userId, limit = 20, offset = 0) {
    try {
      const conversations = await database.query(`
        SELECT 
          c.id,
          c.title,
          c.status,
          c.created_at,
          c.updated_at,
          a.name as agent_name,
          a.id as agent_id,
          COUNT(cm.id) as message_count,
          MAX(cm.created_at) as last_message_at
        FROM conversations c
        JOIN ai_agents a ON c.agent_id = a.id
        LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id
        WHERE c.user_id = $1
        GROUP BY c.id, a.name, a.id
        ORDER BY c.updated_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return conversations.rows;
    } catch (error) {
      logger.error('Failed to get user conversations:', error);
      throw error;
    }
  }

  /**
   * End a conversation
   */
  async endConversation(conversationId, userId) {
    try {
      const result = await database.query(`
        UPDATE conversations 
        SET status = 'ended', updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [conversationId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Conversation not found or access denied');
      }

      // Add system message
      await this.addMessage(conversationId, 'system', { content: 'Conversation ended' });

      // Remove from cache
      this.activeConversations.delete(conversationId);

      logger.info(`Ended conversation ${conversationId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to end conversation:', error);
      throw error;
    }
  }

  /**
   * Cache conversation message for quick access
   */
  cacheConversationMessage(conversationId, message) {
    if (!this.activeConversations.has(conversationId)) {
      this.activeConversations.set(conversationId, {
        messages: [],
        lastAccessed: Date.now()
      });
    }

    const cached = this.activeConversations.get(conversationId);
    cached.messages.push(message);
    
    // Keep only last 50 messages in cache
    if (cached.messages.length > 50) {
      cached.messages = cached.messages.slice(-50);
    }
  }

  /**
   * Get conversation context for AI processing
   */
  async getConversationContext(conversationId, maxMessages = 10) {
    try {
      const messages = await database.query(`
        SELECT role, content, audio_url, metadata, created_at
        FROM conversation_messages
        WHERE conversation_id = $1 AND role != 'system'
        ORDER BY created_at DESC
        LIMIT $2
      `, [conversationId, maxMessages]);

      return messages.rows.reverse(); // Return in chronological order
    } catch (error) {
      logger.error('Failed to get conversation context:', error);
      return [];
    }
  }
}

module.exports = ConversationService;
