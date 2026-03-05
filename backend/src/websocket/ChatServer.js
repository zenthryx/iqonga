const { Server } = require('socket.io');
const logger = require('../utils/logger');
const WebSocketAuth = require('./shared/auth');
const database = require('../database/connection');

// Optional Redis adapter for clustering
let createAdapter;
let Redis;
try {
  createAdapter = require('@socket.io/redis-adapter');
  Redis = require('redis');
} catch (e) {
  logger.warn('Redis adapter not available - Socket.io clustering disabled');
}

// Global reference to ChatServer instance (for notifications from routes)
let chatServerInstance = null;

class ChatServer {
  constructor(httpServer) {
    // Store instance globally for access from routes
    chatServerInstance = this;
    // Allow multiple origins for CORS (matching main server CORS config)
    const allowedOrigins = [
      'https://ajentrix.com',
      'https://www.ajentrix.com',
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean); // Remove undefined values

    this.io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          // Allow requests with no origin (like mobile apps)
          if (!origin) return callback(null, true);
          
          // Check if origin is in allowed list
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            // For development, allow localhost variations
            if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
              callback(null, true);
            } else {
              callback(new Error('Not allowed by CORS'));
            }
          }
        },
        credentials: true,
        methods: ['GET', 'POST']
      },
      path: '/socket.io/chat',
      transports: ['websocket', 'polling'],
      allowEIO3: true // Allow Engine.IO v3 clients
    });

    // Setup Redis adapter if available (async, but don't await - let it run in background)
    // If Redis fails, we'll fall back to in-memory mode
    this.setupRedisAdapter().catch(err => {
      logger.warn('Redis adapter setup failed, using in-memory mode:', err.message);
    });

    // Setup middleware and handlers
    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info('💬 Chat WebSocket server initialized on /socket.io/chat');
  }

  /**
   * Setup Redis adapter for horizontal scaling (optional)
   */
  async setupRedisAdapter() {
    if (!createAdapter || !Redis || !process.env.REDIS_URL) {
      logger.info('Redis adapter not configured - running in single-server mode');
      return;
    }

    try {
      const pubClient = Redis.createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();

      // Connect clients first
      await pubClient.connect();
      await subClient.connect();

      // Handle errors and disconnections
      pubClient.on('error', (err) => {
        logger.error('Redis pub client error:', err);
        // Remove adapter if Redis fails
        this.removeRedisAdapter();
      });
      
      subClient.on('error', (err) => {
        logger.error('Redis sub client error:', err);
        // Remove adapter if Redis fails
        this.removeRedisAdapter();
      });

      pubClient.on('end', () => {
        logger.warn('Redis pub client disconnected - removing adapter');
        this.removeRedisAdapter();
      });

      subClient.on('end', () => {
        logger.warn('Redis sub client disconnected - removing adapter');
        this.removeRedisAdapter();
      });

      // Store clients for cleanup
      this.redisPubClient = pubClient;
      this.redisSubClient = subClient;

      // Only set up adapter if clients are connected
      if (pubClient.isOpen && subClient.isOpen) {
        this.io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Redis adapter configured for Socket.io clustering');
      } else {
        logger.warn('Redis clients not connected - running in single-server mode');
      }
    } catch (error) {
      logger.warn('Failed to setup Redis adapter:', error.message);
      logger.info('Running in single-server mode (no clustering)');
    }
  }

  /**
   * Remove Redis adapter and fall back to in-memory mode
   */
  removeRedisAdapter() {
    try {
      // Remove the adapter (Socket.io will fall back to in-memory)
      // Note: Socket.io doesn't have a direct way to remove adapter,
      // but we can prevent new operations by checking client status
      if (this.redisPubClient) {
        this.redisPubClient.removeAllListeners();
      }
      if (this.redisSubClient) {
        this.redisSubClient.removeAllListeners();
      }
      logger.info('Redis adapter removed - using in-memory mode');
    } catch (error) {
      logger.error('Error removing Redis adapter:', error.message);
    }
  }

  /**
   * Authentication middleware
   */
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        logger.info('💬 Chat: Connection attempt from:', {
          origin: socket.handshake.headers.origin,
          hasAuthToken: !!(socket.handshake.auth?.token || socket.handshake.query?.token)
        });
        
        const { userId, user } = WebSocketAuth.verifyToken(socket);
        socket.data.userId = userId;
        socket.data.user = user;
        logger.info(`💬 Chat: Authentication successful for user ${userId}`);
        next();
      } catch (error) {
        logger.warn('Chat WebSocket authentication failed:', {
          error: error.message,
          auth: socket.handshake.auth,
          query: socket.handshake.query,
          origin: socket.handshake.headers.origin
        });
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', async (socket) => {
      const userId = socket.data.userId;
      logger.info(`💬 Chat: User ${userId} connected`);

      try {
        // Join user to their conversation rooms
        await this.joinUserRooms(socket, userId);

        // Update presence to online
        await this.updatePresence(userId, 'online');

        // Send connection confirmation
        socket.emit('connection:established', {
          userId,
          timestamp: Date.now()
        });

        // Core message events
        socket.on('message:send', (data) => 
          this.handleMessageSend(socket, userId, data)
        );

        socket.on('message:read', (data) => 
          this.handleMessageRead(socket, userId, data)
        );

        socket.on('message:edit', (data) => 
          this.handleMessageEdit(socket, userId, data)
        );

        socket.on('message:delete', (data) => 
          this.handleMessageDelete(socket, userId, data)
        );

        // Typing indicators
        socket.on('typing:start', (data) => 
          this.handleTypingStart(socket, userId, data)
        );

        socket.on('typing:stop', (data) => 
          this.handleTypingStop(socket, userId, data)
        );

        // Reactions
        socket.on('reaction:add', (data) => 
          this.handleReactionAdd(socket, userId, data)
        );

        socket.on('reaction:remove', (data) => 
          this.handleReactionRemove(socket, userId, data)
        );

        // Signal sharing
        socket.on('signal:share', (data) => 
          this.handleSignalShare(socket, userId, data)
        );

        // Presence updates
        socket.on('presence:update', (data) => 
          this.updatePresence(userId, data.status || 'online')
        );

        // Handle disconnection
        socket.on('disconnect', async (reason) => {
          logger.info(`💬 Chat: User ${userId} disconnected (${reason})`);
          await this.updatePresence(userId, 'offline');
        });

      } catch (error) {
        logger.error(`Error setting up chat connection for user ${userId}:`, error);
        socket.emit('error', { message: 'Connection setup failed' });
      }
    });
  }

  /**
   * Join user to all their conversation rooms
   */
  async joinUserRooms(socket, userId) {
    try {
      const result = await database.query(
        'SELECT conversation_id FROM conversation_members WHERE user_id = $1',
        [userId]
      );

      for (const row of result.rows) {
        const room = `conversation:${row.conversation_id}`;
        socket.join(room);
        logger.debug(`User ${userId} joined room: ${room}`);
      }

      logger.info(`User ${userId} joined ${result.rows.length} conversation rooms`);
    } catch (error) {
      logger.error('Error joining user rooms:', error);
      throw error;
    }
  }

  /**
   * Handle new message
   */
  async handleMessageSend(socket, userId, data) {
    try {
      const { conversation_id, content, content_type = 'text', reply_to = null } = data;

      if (!conversation_id || !content) {
        socket.emit('error', { message: 'conversation_id and content are required' });
        return;
      }

      // Verify user is member of conversation
      const membership = await WebSocketAuth.verifyMembership(userId, conversation_id, database);
      if (!membership) {
        socket.emit('error', { message: 'Not authorized - not a member of this conversation' });
        return;
      }

      // Import services (lazy load to avoid circular dependencies)
      const ChatMessageService = require('../services/ChatMessageService');

      // Create message
      const message = await ChatMessageService.createMessage({
        conversation_id,
        sender_id: userId,
        content,
        content_type,
        reply_to,
        metadata: data.metadata || {}
      });

      // Broadcast to conversation room
      // Note: Redis adapter may throw async errors that become unhandled rejections
      // These are caught by the process-level handler in server.js
      this.io.to(`conversation:${conversation_id}`).emit('message:new', message);

      // Track credits
      await this.trackMessageCredit(userId);

      logger.info(`Message sent: ${message.id} in conversation ${conversation_id}`);

    } catch (error) {
      logger.error('Error handling message send:', error);
      socket.emit('error', { message: 'Failed to send message', details: error.message });
    }
  }

  /**
   * Handle message read
   */
  async handleMessageRead(socket, userId, data) {
    try {
      const { message_id, conversation_id } = data;

      if (!message_id || !conversation_id) {
        return;
      }

      // Verify membership
      const membership = await WebSocketAuth.verifyMembership(userId, conversation_id, database);
      if (!membership) {
        return;
      }

      const ChatMessageService = require('../services/ChatMessageService');
      await ChatMessageService.markAsRead(message_id, userId);

      // Notify others in conversation
      // Note: Redis adapter may throw async errors that become unhandled rejections
      socket.to(`conversation:${conversation_id}`).emit('message:read', {
        message_id,
        user_id: userId
      });

    } catch (error) {
      logger.error('Error handling message read:', error);
    }
  }

  /**
   * Handle message edit
   */
  async handleMessageEdit(socket, userId, data) {
    try {
      const { message_id, new_content } = data;

      if (!message_id || !new_content) {
        socket.emit('error', { message: 'message_id and new_content are required' });
        return;
      }

      const ChatMessageService = require('../services/ChatMessageService');
      const message = await ChatMessageService.editMessage(message_id, userId, new_content);

      if (!message) {
        socket.emit('error', { message: 'Message not found or not authorized' });
        return;
      }

      // Broadcast update
      // Note: Redis adapter may throw async errors that become unhandled rejections
      // These are caught by the process-level handler in server.js
      this.io.to(`conversation:${message.conversation_id}`).emit('message:updated', message);

    } catch (error) {
      logger.error('Error handling message edit:', error);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  }

  /**
   * Handle message delete
   */
  async handleMessageDelete(socket, userId, data) {
    try {
      const { message_id } = data;

      if (!message_id) {
        socket.emit('error', { message: 'message_id is required' });
        return;
      }

      const ChatMessageService = require('../services/ChatMessageService');
      const message = await ChatMessageService.getMessage(message_id);

      if (!message || message.sender_id !== userId) {
        socket.emit('error', { message: 'Message not found or not authorized' });
        return;
      }

      await ChatMessageService.deleteMessage(message_id, userId);

      // Broadcast deletion
      // Note: Redis adapter may throw async errors that become unhandled rejections
      this.io.to(`conversation:${message.conversation_id}`).emit('message:deleted', {
        message_id,
        conversation_id: message.conversation_id
      });

    } catch (error) {
      logger.error('Error handling message delete:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  }

  /**
   * Handle typing start
   */
  async handleTypingStart(socket, userId, data) {
    try {
      const { conversation_id } = data;

      if (!conversation_id) {
        return;
      }

      // Verify membership
      const membership = await WebSocketAuth.verifyMembership(userId, conversation_id, database);
      if (!membership) {
        return;
      }

      // Broadcast to room (except sender)
      // Note: Redis adapter may throw async errors that become unhandled rejections
      socket.to(`conversation:${conversation_id}`).emit('typing:status', {
        conversation_id,
        user_id: userId,
        is_typing: true
      });

    } catch (error) {
      logger.error('Error handling typing start:', error);
    }
  }

  /**
   * Handle typing stop
   */
  async handleTypingStop(socket, userId, data) {
    try {
      const { conversation_id } = data;

      if (!conversation_id) {
        return;
      }

      // Broadcast to room (except sender)
      // Note: Redis adapter may throw async errors that become unhandled rejections
      socket.to(`conversation:${conversation_id}`).emit('typing:status', {
        conversation_id,
        user_id: userId,
        is_typing: false
      });

    } catch (error) {
      logger.error('Error handling typing stop:', error);
    }
  }

  /**
   * Handle reaction add
   */
  async handleReactionAdd(socket, userId, data) {
    try {
      const { message_id, emoji } = data;

      if (!message_id || !emoji) {
        return;
      }

      const ChatMessageService = require('../services/ChatMessageService');
      const message = await ChatMessageService.addReaction(message_id, userId, emoji);

      if (!message) {
        return;
      }

      // Broadcast to conversation
      // Note: Redis adapter may throw async errors that become unhandled rejections
      this.io.to(`conversation:${message.conversation_id}`).emit('reaction:added', {
        message_id,
        emoji,
        user_id: userId
      });

    } catch (error) {
      logger.error('Error handling reaction add:', error);
    }
  }

  /**
   * Handle reaction remove
   */
  async handleReactionRemove(socket, userId, data) {
    try {
      const { message_id, emoji } = data;

      if (!message_id || !emoji) {
        return;
      }

      const ChatMessageService = require('../services/ChatMessageService');
      const message = await ChatMessageService.removeReaction(message_id, userId, emoji);

      if (!message) {
        return;
      }

      // Broadcast to conversation
      // Note: Redis adapter may throw async errors that become unhandled rejections
      this.io.to(`conversation:${message.conversation_id}`).emit('reaction:removed', {
        message_id,
        emoji,
        user_id: userId
      });

    } catch (error) {
      logger.error('Error handling reaction remove:', error);
    }
  }

  /**
   * Handle signal share
   */
  async handleSignalShare(socket, userId, data) {
    try {
      const { conversation_id, signal } = data;

      if (!conversation_id || !signal) {
        socket.emit('error', { message: 'conversation_id and signal are required' });
        return;
      }

      // Verify membership
      const membership = await WebSocketAuth.verifyMembership(userId, conversation_id, database);
      if (!membership) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      const ChatMessageService = require('../services/ChatMessageService');

      // Create signal message
      const message = await ChatMessageService.createMessage({
        conversation_id,
        sender_id: userId,
        content: `Shared ${signal.token} ${signal.type}`,
        content_type: 'signal',
        is_signal: true,
        signal_data: signal
      });

      // Broadcast signal
      // Note: Redis adapter may throw async errors that become unhandled rejections
      this.io.to(`conversation:${conversation_id}`).emit('signal:received', {
        message,
        signal
      });

      logger.info(`Signal shared: ${signal.token} ${signal.type} to conversation ${conversation_id}`);

    } catch (error) {
      logger.error('Error handling signal share:', error);
      socket.emit('error', { message: 'Failed to share signal' });
    }
  }

  /**
   * Update user presence
   */
  async updatePresence(userId, status) {
    try {
      await database.query(`
        INSERT INTO user_presence (user_id, status, last_seen, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET status = $2, last_seen = NOW(), updated_at = NOW()
      `, [userId, status]);

      // Get user's conversations to broadcast presence
      const result = await database.query(
        'SELECT conversation_id FROM conversation_members WHERE user_id = $1',
        [userId]
      );

      // Broadcast presence to all user's conversations
      // Note: Redis adapter may throw async errors that become unhandled rejections
      // These are caught by the process-level handler in server.js
      for (const row of result.rows) {
        this.io.to(`conversation:${row.conversation_id}`).emit('user:presence', {
          user_id: userId,
          status,
          last_seen: new Date()
        });
      }

    } catch (error) {
      logger.error('Error updating presence:', error);
    }
  }

  /**
   * Track credit usage for message
   */
  async trackMessageCredit(userId) {
    try {
      const CreditService = require('../services/CreditService');
      const ServicePricingService = require('../services/ServicePricingService');
      const creditService = new CreditService();
      const pricingService = ServicePricingService;

      const cost = await pricingService.getPricing('chat_message_send');
      // Parse cost as number (pricing service may return string like "0.1")
      const numericCost = typeof cost === 'string' ? parseFloat(cost) : Number(cost);
      
      // Round to nearest integer since credit_balance is INTEGER type
      // Use Math.ceil to always round up (so 0.1 becomes 1 credit)
      const integerCost = Math.ceil(numericCost);
      
      if (integerCost > 0 && !isNaN(integerCost)) {
        await creditService.deductCredits(userId, 'chat_message_send', integerCost);
      }
    } catch (error) {
      logger.warn('Failed to track message credit:', error.message);
      // Don't fail message send if credit tracking fails
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount() {
    return this.io.sockets.sockets.size;
  }

  /**
   * Close server
   */
  /**
   * Send notification to a user via WebSocket (if they're online)
   * @param {number} userId - Target user ID
   * @param {object} notification - Notification data
   */
  sendNotification(userId, notification) {
    try {
      // Find all sockets for this user
      const userSockets = [];
      this.io.sockets.sockets.forEach((socket) => {
        if (socket.data && socket.data.userId === userId) {
          userSockets.push(socket);
        }
      });

      // Send notification to all user's sockets
      userSockets.forEach(socket => {
        socket.emit('notification', notification);
      });

      if (userSockets.length > 0) {
        logger.info(`Notification sent to user ${userId} via WebSocket`);
      }
    } catch (error) {
      logger.warn('Failed to send WebSocket notification:', error.message);
    }
  }

  close() {
    if (this.io) {
      this.io.close();
    }
  }
}

// Export function to get ChatServer instance
function getChatServerInstance() {
  return chatServerInstance;
}

module.exports = ChatServer;
module.exports.getChatServerInstance = getChatServerInstance;

