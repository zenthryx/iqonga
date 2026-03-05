const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger');

/**
 * Shared authentication utilities for WebSocket connections
 */
class WebSocketAuth {
  /**
   * Verify JWT token from Socket.io handshake
   */
  static verifyToken(socket) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        throw new Error('Authentication token required');
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Return user ID (matching your JWT structure)
      return {
        userId: decoded.id || decoded.userId,
        user: decoded
      };
    } catch (error) {
      logger.warn('WebSocket authentication failed:', error.message);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Verify user is member of conversation
   */
  static async verifyMembership(userId, conversationId, database) {
    try {
      const result = await database.query(
        'SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error verifying membership:', error);
      return null;
    }
  }

  /**
   * Check if user has admin/owner role
   */
  static hasAdminRole(membership) {
    return membership && (membership.role === 'owner' || membership.role === 'admin');
  }
}

module.exports = WebSocketAuth;

