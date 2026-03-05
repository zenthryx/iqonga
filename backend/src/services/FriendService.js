const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class FriendService {
  /**
   * Send a friend request
   */
  async sendFriendRequest(requesterId, recipientId, message = null) {
    try {
      // Validate users exist and are different
      if (requesterId === recipientId) {
        throw new Error('Cannot send friend request to yourself');
      }

      // Check if users exist
      const usersCheck = await database.query(
        'SELECT id FROM users WHERE id IN ($1, $2)',
        [requesterId, recipientId]
      );
      if (usersCheck.rows.length !== 2) {
        throw new Error('One or both users not found');
      }

      // Check if already friends
      const existingFriendship = await this.areFriends(requesterId, recipientId);
      if (existingFriendship) {
        throw new Error('Users are already friends');
      }

      // Check if request already exists
      const existingRequest = await database.query(
        `SELECT id, status FROM friend_requests 
         WHERE (requester_id = $1 AND recipient_id = $2)
            OR (requester_id = $2 AND recipient_id = $1)
         ORDER BY created_at DESC
         LIMIT 1`,
        [requesterId, recipientId]
      );

      if (existingRequest.rows.length > 0) {
        const request = existingRequest.rows[0];
        if (request.status === 'pending') {
          throw new Error('Friend request already pending');
        } else if (request.status === 'accepted') {
          throw new Error('Users are already friends');
        } else if (request.status === 'blocked') {
          throw new Error('Cannot send friend request - user is blocked');
        }
        // If declined, allow creating a new request
      }

      // Create new friend request
      const result = await database.query(
        `INSERT INTO friend_requests (requester_id, recipient_id, message, status)
         VALUES ($1, $2, $3, 'pending')
         RETURNING *`,
        [requesterId, recipientId, message]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error sending friend request:', error);
      throw error;
    }
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(requestId, userId) {
    try {
      // Get the request and verify it's for this user
      const requestResult = await database.query(
        'SELECT * FROM friend_requests WHERE id = $1 AND recipient_id = $2 AND status = $3',
        [requestId, userId, 'pending']
      );

      if (requestResult.rows.length === 0) {
        throw new Error('Friend request not found or already processed');
      }

      const request = requestResult.rows[0];

      // Create bidirectional friendship
      await database.query('SELECT create_friendship($1, $2)', [
        request.requester_id,
        request.recipient_id
      ]);

      // Update request status
      await database.query(
        'UPDATE friend_requests SET status = $1, updated_at = NOW() WHERE id = $2',
        ['accepted', requestId]
      );

      // Get friend details
      const friend = await this.getFriendDetails(userId, request.requester_id);

      return {
        request: { ...request, status: 'accepted' },
        friend
      };
    } catch (error) {
      logger.error('Error accepting friend request:', error);
      throw error;
    }
  }

  /**
   * Decline a friend request
   */
  async declineFriendRequest(requestId, userId) {
    try {
      const result = await database.query(
        'UPDATE friend_requests SET status = $1, updated_at = NOW() WHERE id = $2 AND recipient_id = $3 AND status = $4 RETURNING *',
        ['declined', requestId, userId, 'pending']
      );

      if (result.rows.length === 0) {
        throw new Error('Friend request not found or already processed');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error declining friend request:', error);
      throw error;
    }
  }

  /**
   * Cancel a friend request (by requester)
   */
  async cancelFriendRequest(requestId, userId) {
    try {
      const result = await database.query(
        'DELETE FROM friend_requests WHERE id = $1 AND requester_id = $2 AND status = $3 RETURNING *',
        [requestId, userId, 'pending']
      );

      if (result.rows.length === 0) {
        throw new Error('Friend request not found or already processed');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error canceling friend request:', error);
      throw error;
    }
  }

  /**
   * Get friend requests for a user (incoming and outgoing)
   */
  async getFriendRequests(userId, type = 'all') {
    try {
      let query;
      let params;

      if (type === 'incoming') {
        query = `
          SELECT fr.*, 
                 u.username as requester_username,
                 u.email as requester_email
          FROM friend_requests fr
          INNER JOIN users u ON fr.requester_id = u.id
          WHERE fr.recipient_id = $1 AND fr.status = 'pending'
          ORDER BY fr.created_at DESC
        `;
        params = [userId];
      } else if (type === 'outgoing') {
        query = `
          SELECT fr.*,
                 u.username as recipient_username,
                 u.email as recipient_email
          FROM friend_requests fr
          INNER JOIN users u ON fr.recipient_id = u.id
          WHERE fr.requester_id = $1 AND fr.status = 'pending'
          ORDER BY fr.created_at DESC
        `;
        params = [userId];
      } else {
        query = `
          SELECT fr.*,
                 CASE 
                   WHEN fr.requester_id = $1 THEN u2.username
                   ELSE u1.username
                 END as other_username,
                 CASE 
                   WHEN fr.requester_id = $1 THEN u2.email
                   ELSE u1.email
                 END as other_email,
                 CASE 
                   WHEN fr.requester_id = $1 THEN 'outgoing'
                   ELSE 'incoming'
                 END as request_type
          FROM friend_requests fr
          INNER JOIN users u1 ON fr.requester_id = u1.id
          INNER JOIN users u2 ON fr.recipient_id = u2.id
          WHERE (fr.requester_id = $1 OR fr.recipient_id = $1) AND fr.status = 'pending'
          ORDER BY fr.created_at DESC
        `;
        params = [userId];
      }

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting friend requests:', error);
      throw error;
    }
  }

  /**
   * Get user's friend list
   */
  async getFriends(userId, options = {}) {
    try {
      const { includeBlocked = false, favoritesOnly = false } = options;

      let query = `
        SELECT 
          f.id,
          f.friend_id,
          f.nickname,
          f.notes,
          f.is_favorite,
          f.is_blocked,
          f.created_at,
          f.updated_at,
          u.username,
          u.email
        FROM friends f
        INNER JOIN users u ON f.friend_id = u.id
        WHERE f.user_id = $1
      `;

      const params = [userId];

      if (!includeBlocked) {
        query += ' AND f.is_blocked = false';
      }

      if (favoritesOnly) {
        query += ' AND f.is_favorite = true';
      }

      query += ' ORDER BY f.is_favorite DESC, f.updated_at DESC';

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting friends:', error);
      throw error;
    }
  }

  /**
   * Check if two users are friends
   */
  async areFriends(userId1, userId2) {
    try {
      const result = await database.query(
        'SELECT id FROM friends WHERE user_id = $1 AND friend_id = $2 AND is_blocked = false',
        [userId1, userId2]
      );
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking friendship:', error);
      throw error;
    }
  }

  /**
   * Get friend details
   */
  async getFriendDetails(userId, friendId) {
    try {
      const result = await database.query(
        `SELECT 
          f.id,
          f.friend_id,
          f.nickname,
          f.notes,
          f.is_favorite,
          f.is_blocked,
          f.created_at,
          f.updated_at,
          u.username,
          u.email
        FROM friends f
        INNER JOIN users u ON f.friend_id = u.id
        WHERE f.user_id = $1 AND f.friend_id = $2`,
        [userId, friendId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting friend details:', error);
      throw error;
    }
  }

  /**
   * Remove a friend
   */
  async removeFriend(userId, friendId) {
    try {
      await database.query('SELECT remove_friendship($1, $2)', [userId, friendId]);
      return { success: true };
    } catch (error) {
      logger.error('Error removing friend:', error);
      throw error;
    }
  }

  /**
   * Update friend metadata (nickname, notes, favorite status)
   */
  async updateFriend(userId, friendId, updates) {
    try {
      const { nickname, notes, is_favorite } = updates;

      const setClauses = [];
      const params = [userId, friendId];
      let paramIndex = 3;

      if (nickname !== undefined) {
        setClauses.push(`nickname = $${paramIndex}`);
        params.push(nickname);
        paramIndex++;
      }

      if (notes !== undefined) {
        setClauses.push(`notes = $${paramIndex}`);
        params.push(notes);
        paramIndex++;
      }

      if (is_favorite !== undefined) {
        setClauses.push(`is_favorite = $${paramIndex}`);
        params.push(is_favorite);
        paramIndex++;
      }

      if (setClauses.length === 0) {
        throw new Error('No updates provided');
      }

      setClauses.push('updated_at = NOW()');

      const result = await database.query(
        `UPDATE friends 
         SET ${setClauses.join(', ')}
         WHERE user_id = $1 AND friend_id = $2
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new Error('Friend relationship not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating friend:', error);
      throw error;
    }
  }

  /**
   * Block a user
   */
  async blockUser(userId, targetUserId) {
    try {
      // Remove friendship if exists
      await database.query('SELECT remove_friendship($1, $2)', [userId, targetUserId]);

      // Create blocked relationship (one-way)
      const result = await database.query(
        `INSERT INTO friends (user_id, friend_id, is_blocked)
         VALUES ($1, $2, true)
         ON CONFLICT (user_id, friend_id) 
         DO UPDATE SET is_blocked = true, updated_at = NOW()
         RETURNING *`,
        [userId, targetUserId]
      );

      // Decline any pending friend requests
      await database.query(
        `UPDATE friend_requests 
         SET status = 'declined', updated_at = NOW()
         WHERE ((requester_id = $1 AND recipient_id = $2) OR (requester_id = $2 AND recipient_id = $1))
           AND status = 'pending'`,
        [userId, targetUserId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error blocking user:', error);
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId, targetUserId) {
    try {
      const result = await database.query(
        `UPDATE friends 
         SET is_blocked = false, updated_at = NOW()
         WHERE user_id = $1 AND friend_id = $2 AND is_blocked = true
         RETURNING *`,
        [userId, targetUserId]
      );

      if (result.rows.length === 0) {
        throw new Error('User is not blocked');
      }

      // Remove the blocked relationship entry
      await database.query(
        'DELETE FROM friends WHERE user_id = $1 AND friend_id = $2',
        [userId, targetUserId]
      );

      return { success: true };
    } catch (error) {
      logger.error('Error unblocking user:', error);
      throw error;
    }
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(userId) {
    try {
      const result = await database.query(
        `SELECT 
          f.friend_id,
          u.username,
          u.email,
          f.updated_at as blocked_at
        FROM friends f
        INNER JOIN users u ON f.friend_id = u.id
        WHERE f.user_id = $1 AND f.is_blocked = true
        ORDER BY f.updated_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting blocked users:', error);
      throw error;
    }
  }
}

module.exports = FriendService;

