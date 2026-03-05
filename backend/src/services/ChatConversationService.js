const database = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class ChatConversationService {
  /**
   * Create new conversation
   */
  async createConversation(data) {
    const {
      type,
      name = null,
      description = null,
      created_by,
      memberIds = [],
      associated_token = null,
      is_public = false,
      require_approval = true,
      max_members = 100
    } = data;

    // Validate required fields
    if (!type || !['direct', 'group'].includes(type)) {
      throw new Error('Invalid conversation type');
    }

    if (!created_by) {
      throw new Error('created_by is required');
    }

    // Ensure created_by is an integer
    const createdById = parseInt(created_by);
    if (!createdById || isNaN(createdById)) {
      throw new Error('created_by must be a valid integer');
    }

    try {

      // For direct chats, check if one already exists
      if (type === 'direct' && memberIds.length === 2) {
        const existing = await this.findDirectConversation(memberIds[0], memberIds[1]);
        if (existing) {
          return existing;
        }
      }

      const conversationId = uuidv4();

      // Create conversation
      const convResult = await database.query(`
        INSERT INTO conversations (
          id, type, name, description, created_by,
          associated_token, is_public, require_approval, max_members
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        conversationId,
        type,
        name,
        description,
        createdById,
        associated_token,
        is_public,
        require_approval,
        max_members
      ]);

      const conversation = convResult.rows[0];

      // Add members
      for (const userId of memberIds) {
        const userIdInt = parseInt(userId);
        if (!userIdInt || isNaN(userIdInt)) {
          logger.warn(`Skipping invalid user ID in memberIds: ${userId}`);
          continue;
        }
        await this.addMember(conversationId, userIdInt, {
          role: userIdInt === createdById ? 'owner' : 'member'
        });
      }

      const createdConversation = await this.getConversation(conversationId, createdById);

      // Send notification to other user(s) if this is a new direct conversation
      if (type === 'direct') {
        // Find the other user (not the creator)
        const otherUserIds = memberIds
          .map(id => parseInt(id))
          .filter(id => id !== createdById && !isNaN(id));
        
        if (otherUserIds.length > 0) {
          const otherUserId = otherUserIds[0]; // For direct, there should be only one
          
          try {
            // Get creator's username for the notification
            const creatorResult = await database.query(
              'SELECT username FROM users WHERE id = $1',
              [createdById]
            );
            const creatorUsername = creatorResult.rows[0]?.username || 'Someone';

            // Try to send WebSocket notification
            try {
              const { getChatServerInstance } = require('../websocket/ChatServer');
              const chatServer = getChatServerInstance();
              if (chatServer) {
                chatServer.sendNotification(otherUserId, {
                  type: 'new_conversation',
                  title: 'New Conversation',
                  message: `${creatorUsername} started a conversation with you`,
                  conversation_id: conversationId,
                  created_by: createdById,
                  created_by_username: creatorUsername,
                  timestamp: new Date().toISOString()
                });
              }
            } catch (wsError) {
              logger.warn('Failed to send WebSocket notification:', wsError.message);
            }

            // Optionally: Create in-app notification record if notifications table exists
            // This would require a notifications table, which we can add later if needed
          } catch (notifError) {
            logger.warn('Failed to send conversation notification:', notifError.message);
            // Don't fail conversation creation if notification fails
          }
        }
      }

      return createdConversation;
    } catch (error) {
      logger.error('Error creating conversation:', {
        error: error.message,
        stack: error.stack,
        data: {
          type,
          created_by: createdById,
          memberIds,
          name
        }
      });
      throw error;
    }
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(userId) {
    try {
      const result = await database.query(`
        SELECT 
          c.*,
          COUNT(DISTINCT cm.user_id) as member_count,
          (
            SELECT m.content
            FROM messages m
            WHERE m.conversation_id = c.id
              AND m.deleted = false
            ORDER BY m.created_at DESC
            LIMIT 1
          ) as last_message_content,
          (
            SELECT m.created_at
            FROM messages m
            WHERE m.conversation_id = c.id
              AND m.deleted = false
            ORDER BY m.created_at DESC
            LIMIT 1
          ) as last_message_at,
          (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.conversation_id = c.id
              AND m.deleted = false
              AND NOT ($1 = ANY(m.read_by))
          ) as unread_count,
          -- For direct messages, get the other user's info
          CASE 
            WHEN c.type = 'direct' THEN (
              SELECT u.username
              FROM conversation_members cm2
              INNER JOIN users u ON cm2.user_id = u.id
              WHERE cm2.conversation_id = c.id
                AND cm2.user_id != $1
              LIMIT 1
            )
            ELSE NULL
          END as other_user_username,
          CASE 
            WHEN c.type = 'direct' THEN (
              SELECT u.id
              FROM conversation_members cm2
              INNER JOIN users u ON cm2.user_id = u.id
              WHERE cm2.conversation_id = c.id
                AND cm2.user_id != $1
              LIMIT 1
            )
            ELSE NULL
          END as other_user_id
        FROM conversations c
        INNER JOIN conversation_members cm ON c.id = cm.conversation_id
        WHERE cm.user_id = $1
        GROUP BY c.id
        ORDER BY last_message_at DESC NULLS LAST, c.created_at DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting user conversations:', error);
      throw error;
    }
  }

  /**
   * Get conversation details
   */
  async getConversation(conversationId, userId) {
    try {
      // Verify user is member
      const isMember = await this.isMember(conversationId, userId);
      if (!isMember) {
        throw new Error('Not authorized - not a member of this conversation');
      }

      // Get conversation
      const convResult = await database.query(
        'SELECT * FROM conversations WHERE id = $1',
        [conversationId]
      );

      if (convResult.rows.length === 0) {
        throw new Error('Conversation not found');
      }

      const conversation = convResult.rows[0];

      // Get members
      const membersResult = await database.query(`
        SELECT cm.*, u.username, u.email
        FROM conversation_members cm
        LEFT JOIN users u ON cm.user_id = u.id
        WHERE cm.conversation_id = $1
        ORDER BY cm.joined_at ASC
      `, [conversationId]);

      conversation.members = membersResult.rows;

      return conversation;
    } catch (error) {
      logger.error('Error getting conversation:', error);
      throw error;
    }
  }

  /**
   * Add member to conversation
   */
  async addMember(conversationId, userId, options = {}) {
    try {
      const { role = 'member' } = options;

      const result = await database.query(`
        INSERT INTO conversation_members (conversation_id, user_id, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (conversation_id, user_id) DO NOTHING
        RETURNING *
      `, [conversationId, userId, role]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error adding member:', error);
      throw error;
    }
  }

  /**
   * Remove member from conversation
   */
  async removeMember(conversationId, userId, removedBy) {
    try {
      // Check permissions (must be owner/admin)
      const hasPermission = await this.checkAdminPermission(conversationId, removedBy);
      if (!hasPermission) {
        throw new Error('Not authorized - must be owner or admin');
      }

      const result = await database.query(`
        DELETE FROM conversation_members
        WHERE conversation_id = $1 AND user_id = $2
        RETURNING *
      `, [conversationId, userId]);

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error removing member:', error);
      throw error;
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(conversationId, userId, newRole, updatedBy) {
    try {
      // Verify updater has permission
      const hasPermission = await this.checkAdminPermission(conversationId, updatedBy);
      if (!hasPermission) {
        throw new Error('Not authorized - must be owner or admin');
      }

      const result = await database.query(`
        UPDATE conversation_members
        SET role = $1
        WHERE conversation_id = $2 AND user_id = $3
        RETURNING *
      `, [newRole, conversationId, userId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating member role:', error);
      throw error;
    }
  }

  /**
   * Update conversation
   */
  async updateConversation(conversationId, userId, updates) {
    try {
      // Verify user is owner/admin
      const hasPermission = await this.checkAdminPermission(conversationId, userId);
      if (!hasPermission) {
        throw new Error('Not authorized - must be owner or admin');
      }

      const allowedFields = ['name', 'description', 'avatar_url', 'is_public', 'require_approval', 'max_members', 'associated_token', 'auto_share_signals'];
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(conversationId);

      const result = await database.query(`
        UPDATE conversations
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating conversation:', error);
      throw error;
    }
  }

  /**
   * Check if user is member
   */
  async isMember(conversationId, userId) {
    try {
      const result = await database.query(
        'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking membership:', error);
      return false;
    }
  }

  /**
   * Check if user has admin/owner permission
   */
  async checkAdminPermission(conversationId, userId) {
    try {
      const result = await database.query(
        'SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const role = result.rows[0].role;
      return role === 'owner' || role === 'admin';
    } catch (error) {
      logger.error('Error checking admin permission:', error);
      return false;
    }
  }

  /**
   * Find existing direct conversation
   */
  async findDirectConversation(userId1, userId2) {
    try {
      const result = await database.query(`
        SELECT c.*
        FROM conversations c
        INNER JOIN conversation_members cm1 ON c.id = cm1.conversation_id
        INNER JOIN conversation_members cm2 ON c.id = cm2.conversation_id
        WHERE c.type = 'direct'
          AND cm1.user_id = $1
          AND cm2.user_id = $2
        LIMIT 1
      `, [userId1, userId2]);

      if (result.rows.length > 0) {
        return await this.getConversation(result.rows[0].id, userId1);
      }

      return null;
    } catch (error) {
      logger.error('Error finding direct conversation:', error);
      return null;
    }
  }

  /**
   * Mark all messages as read in conversation
   */
  async markAllAsRead(conversationId, userId) {
    try {
      await database.query(`
        UPDATE messages
        SET read_by = array_append(read_by, $1)
        WHERE conversation_id = $2
          AND NOT ($1 = ANY(read_by))
          AND deleted = false
      `, [userId, conversationId]);

      // Update last_read_at
      await database.query(`
        UPDATE conversation_members
        SET last_read_at = NOW()
        WHERE conversation_id = $1 AND user_id = $2
      `, [conversationId, userId]);

      return true;
    } catch (error) {
      logger.error('Error marking all as read:', error);
      throw error;
    }
  }
}

module.exports = new ChatConversationService();

