const database = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class ChatMessageService {
  /**
   * Create new message
   */
  async createMessage(data) {
    const messageId = uuidv4();
    const {
      conversation_id,
      sender_id,
      content,
      content_type = 'text',
      metadata = {},
      is_signal = false,
      signal_data = null,
      reply_to = null,
      has_attachments = false,
      attachment_count = 0
    } = data;

    try {
      const result = await database.query(`
        INSERT INTO messages (
          id, conversation_id, sender_id, content, content_type,
          metadata, is_signal, signal_data, reply_to,
          has_attachments, attachment_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        messageId,
        conversation_id,
        sender_id,
        content,
        content_type,
        JSON.stringify(metadata),
        is_signal,
        signal_data ? JSON.stringify(signal_data) : null,
        reply_to,
        has_attachments,
        attachment_count
      ]);

      const message = result.rows[0];
      
      // Parse JSONB fields
      if (message.metadata) {
        message.metadata = typeof message.metadata === 'string' 
          ? JSON.parse(message.metadata) 
          : message.metadata;
      }
      if (message.signal_data) {
        message.signal_data = typeof message.signal_data === 'string'
          ? JSON.parse(message.signal_data)
          : message.signal_data;
      }

      return message;
    } catch (error) {
      logger.error('Error creating message:', error);
      throw error;
    }
  }

  /**
   * Get messages for conversation (paginated)
   */
  async getMessages(conversationId, limit = 50, before = null) {
    try {
      let query = `
        SELECT m.*, u.username
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $1 AND m.deleted = false
      `;
      const params = [conversationId];

      if (before) {
        query += ` AND m.created_at < $2`;
        params.push(before);
      }

      query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await database.query(query, params);
      const messages = result.rows.reverse(); // Return chronological

      // Get attachments for all messages
      const messageIds = messages.map(m => m.id);
      let attachments = [];
      if (messageIds.length > 0) {
        const attachmentsResult = await database.query(
          `SELECT * FROM message_attachments WHERE message_id = ANY($1::uuid[]) ORDER BY uploaded_at ASC`,
          [messageIds]
        );
        attachments = attachmentsResult.rows;
      }

      // Group attachments by message_id
      const attachmentsByMessage = {};
      attachments.forEach(att => {
        if (!attachmentsByMessage[att.message_id]) {
          attachmentsByMessage[att.message_id] = [];
        }
        attachmentsByMessage[att.message_id].push(att);
      });

      // Get reply messages for messages that have reply_to
      const replyMessageIds = messages.filter(m => m.reply_to).map(m => m.reply_to);
      let replyMessages = {};
      if (replyMessageIds.length > 0) {
        const replyResult = await database.query(
          `SELECT id, content, sender_id, username 
           FROM messages m
           LEFT JOIN users u ON m.sender_id = u.id
           WHERE m.id = ANY($1::uuid[])`,
          [replyMessageIds]
        );
        replyResult.rows.forEach(reply => {
          replyMessages[reply.id] = reply;
        });
      }

      // Parse JSONB fields and attach attachments and reply data
      return messages.map(msg => {
        if (msg.metadata && typeof msg.metadata === 'string') {
          msg.metadata = JSON.parse(msg.metadata);
        }
        if (msg.signal_data && typeof msg.signal_data === 'string') {
          msg.signal_data = JSON.parse(msg.signal_data);
        }
        // Add attachments to message
        msg.attachments = attachmentsByMessage[msg.id] || [];
        // Add reply message data if exists
        if (msg.reply_to && replyMessages[msg.reply_to]) {
          msg.reply_message = replyMessages[msg.reply_to];
        }
        return msg;
      });
    } catch (error) {
      logger.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Get single message
   */
  async getMessage(messageId) {
    try {
      const result = await database.query(`
        SELECT m.*, u.username
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.id = $1
      `, [messageId]);

      if (result.rows.length === 0) {
        return null;
      }

      const message = result.rows[0];
      if (message.metadata && typeof message.metadata === 'string') {
        message.metadata = JSON.parse(message.metadata);
      }
      if (message.signal_data && typeof message.signal_data === 'string') {
        message.signal_data = JSON.parse(message.signal_data);
      }

      return message;
    } catch (error) {
      logger.error('Error getting message:', error);
      throw error;
    }
  }

  /**
   * Edit message
   */
  async editMessage(messageId, userId, newContent) {
    try {
      // Verify message belongs to user
      const message = await this.getMessage(messageId);
      if (!message || message.sender_id !== userId) {
        return null;
      }

      const result = await database.query(`
        UPDATE messages
        SET content = $1, edited = true, edited_at = NOW(), updated_at = NOW()
        WHERE id = $2 AND sender_id = $3
        RETURNING *
      `, [newContent, messageId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const updated = result.rows[0];
      if (updated.metadata && typeof updated.metadata === 'string') {
        updated.metadata = JSON.parse(updated.metadata);
      }

      return updated;
    } catch (error) {
      logger.error('Error editing message:', error);
      throw error;
    }
  }

  /**
   * Delete message (soft delete)
   */
  async deleteMessage(messageId, userId) {
    try {
      // Verify message belongs to user
      const message = await this.getMessage(messageId);
      if (!message || message.sender_id !== userId) {
        return false;
      }

      const result = await database.query(`
        UPDATE messages
        SET deleted = true, deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND sender_id = $2
        RETURNING id
      `, [messageId, userId]);

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Add reaction to message
   */
  async addReaction(messageId, userId, emoji) {
    try {
      // Get current message
      const message = await this.getMessage(messageId);
      if (!message) {
        return null;
      }

      // Get current reactions
      const metadata = message.metadata || {};
      const reactions = metadata.reactions || {};

      // Add user to reaction list
      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }
      if (!reactions[emoji].includes(userId)) {
        reactions[emoji].push(userId);
      }

      metadata.reactions = reactions;

      // Update message
      const result = await database.query(`
        UPDATE messages
        SET metadata = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [JSON.stringify(metadata), messageId]);

      const updated = result.rows[0];
      if (updated.metadata && typeof updated.metadata === 'string') {
        updated.metadata = JSON.parse(updated.metadata);
      }

      return updated;
    } catch (error) {
      logger.error('Error adding reaction:', error);
      throw error;
    }
  }

  /**
   * Remove reaction
   */
  async removeReaction(messageId, userId, emoji) {
    try {
      const message = await this.getMessage(messageId);
      if (!message) {
        return null;
      }

      const metadata = message.metadata || {};
      const reactions = metadata.reactions || {};

      if (reactions[emoji]) {
        reactions[emoji] = reactions[emoji].filter(id => id !== userId);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      }

      metadata.reactions = reactions;

      const result = await database.query(`
        UPDATE messages
        SET metadata = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [JSON.stringify(metadata), messageId]);

      const updated = result.rows[0];
      if (updated.metadata && typeof updated.metadata === 'string') {
        updated.metadata = JSON.parse(updated.metadata);
      }

      return updated;
    } catch (error) {
      logger.error('Error removing reaction:', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId, userId) {
    try {
      const result = await database.query(`
        UPDATE messages
        SET read_by = array_append(read_by, $1)
        WHERE id = $2 AND NOT ($1 = ANY(read_by))
        RETURNING *
      `, [userId, messageId]);

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error marking message as read:', error);
      throw error;
    }
  }

  /**
   * Search messages (full-text search)
   */
  async searchMessages(conversationId, query, limit = 20) {
    try {
      const result = await database.query(`
        SELECT m.*, u.username
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $1
          AND m.deleted = false
          AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $2)
        ORDER BY m.created_at DESC
        LIMIT $3
      `, [conversationId, query, limit]);

      return result.rows.map(msg => {
        if (msg.metadata && typeof msg.metadata === 'string') {
          msg.metadata = JSON.parse(msg.metadata);
        }
        return msg;
      });
    } catch (error) {
      logger.error('Error searching messages:', error);
      throw error;
    }
  }

  /**
   * Get signals in conversation
   */
  async getSignals(conversationId, limit = 50) {
    try {
      const result = await database.query(`
        SELECT m.*, u.username
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $1
          AND m.is_signal = true
          AND m.deleted = false
        ORDER BY m.created_at DESC
        LIMIT $2
      `, [conversationId, limit]);

      return result.rows.map(msg => {
        if (msg.metadata && typeof msg.metadata === 'string') {
          msg.metadata = JSON.parse(msg.metadata);
        }
        if (msg.signal_data && typeof msg.signal_data === 'string') {
          msg.signal_data = JSON.parse(msg.signal_data);
        }
        return msg;
      });
    } catch (error) {
      logger.error('Error getting signals:', error);
      throw error;
    }
  }
}

module.exports = new ChatMessageService();

