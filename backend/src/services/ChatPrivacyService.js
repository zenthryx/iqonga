const database = require('../database/connection');
const logger = require('../utils/logger');

class ChatPrivacyService {
  /**
   * Get user's chat privacy settings
   */
  async getPrivacySettings(userId) {
    try {
      const result = await database.query(
        `SELECT 
          chat_message_privacy,
          chat_show_online_status,
          chat_allow_friend_requests
        FROM user_preferences
        WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        // Return defaults if no preferences exist
        return {
          chat_message_privacy: 'contacts',
          chat_show_online_status: true,
          chat_allow_friend_requests: true
        };
      }

      return {
        chat_message_privacy: result.rows[0].chat_message_privacy || 'contacts',
        chat_show_online_status: result.rows[0].chat_show_online_status !== false,
        chat_allow_friend_requests: result.rows[0].chat_allow_friend_requests !== false
      };
    } catch (error) {
      logger.error('Error getting privacy settings:', error);
      throw error;
    }
  }

  /**
   * Update user's chat privacy settings
   */
  async updatePrivacySettings(userId, settings) {
    try {
      const {
        chat_message_privacy,
        chat_show_online_status,
        chat_allow_friend_requests
      } = settings;

      // Validate chat_message_privacy
      const validPrivacyLevels = ['everyone', 'friends', 'contacts', 'none'];
      if (chat_message_privacy && !validPrivacyLevels.includes(chat_message_privacy)) {
        throw new Error(`Invalid privacy level: ${chat_message_privacy}`);
      }

      // Upsert user preferences
      const result = await database.query(
        `INSERT INTO user_preferences (user_id, chat_message_privacy, chat_show_online_status, chat_allow_friend_requests, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id) 
         DO UPDATE SET 
           chat_message_privacy = COALESCE($2, user_preferences.chat_message_privacy),
           chat_show_online_status = COALESCE($3, user_preferences.chat_show_online_status),
           chat_allow_friend_requests = COALESCE($4, user_preferences.chat_allow_friend_requests),
           updated_at = NOW()
         RETURNING *`,
        [
          userId,
          chat_message_privacy,
          chat_show_online_status,
          chat_allow_friend_requests
        ]
      );

      return {
        chat_message_privacy: result.rows[0].chat_message_privacy,
        chat_show_online_status: result.rows[0].chat_show_online_status,
        chat_allow_friend_requests: result.rows[0].chat_allow_friend_requests
      };
    } catch (error) {
      logger.error('Error updating privacy settings:', error);
      throw error;
    }
  }

  /**
   * Check if user can message another user based on privacy settings
   */
  async canMessage(senderId, recipientId) {
    try {
      const settings = await this.getPrivacySettings(recipientId);

      // If privacy is 'none', no one can message
      if (settings.chat_message_privacy === 'none') {
        return { allowed: false, reason: 'User has disabled messages' };
      }

      // If privacy is 'everyone', anyone can message
      if (settings.chat_message_privacy === 'everyone') {
        return { allowed: true };
      }

      // Check if sender is a friend
      if (settings.chat_message_privacy === 'friends') {
        const friendCheck = await database.query(
          `SELECT 1 FROM friends 
           WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
           AND is_blocked = false
           LIMIT 1`,
          [senderId, recipientId]
        );

        if (friendCheck.rows.length > 0) {
          return { allowed: true };
        }

        return { allowed: false, reason: 'Only friends can message this user' };
      }

      // If privacy is 'contacts', check if they've chatted before
      if (settings.chat_message_privacy === 'contacts') {
        const contactCheck = await database.query(
          `SELECT 1 FROM conversation_members cm1
           INNER JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
           WHERE cm1.user_id = $1 AND cm2.user_id = $2
           LIMIT 1`,
          [senderId, recipientId]
        );

        if (contactCheck.rows.length > 0) {
          return { allowed: true };
        }

        return { allowed: false, reason: 'You need to have chatted with this user before' };
      }

      return { allowed: false, reason: 'Unknown privacy setting' };
    } catch (error) {
      logger.error('Error checking if user can message:', error);
      return { allowed: false, reason: 'Error checking permissions' };
    }
  }
}

module.exports = new ChatPrivacyService();

