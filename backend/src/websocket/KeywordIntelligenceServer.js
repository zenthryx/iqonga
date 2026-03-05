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

// Global reference to KeywordIntelligenceServer instance
let keywordServerInstance = null;

class KeywordIntelligenceServer {
  constructor(httpServer) {
    // Store instance globally for access from scheduler
    keywordServerInstance = this;
    
    const allowedOrigins = [
      'https://ajentrix.com',
      'https://www.ajentrix.com',
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    this.io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
        methods: ['GET', 'POST']
      },
      path: '/socket.io/keyword-intelligence',
      transports: ['websocket', 'polling'],
      allowEIO3: true
    });

    // Setup Redis adapter if available
    this.setupRedisAdapter().catch(err => {
      logger.warn('Redis adapter setup failed, using in-memory mode:', err.message);
    });

    // Setup middleware and handlers
    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info('🔍 Keyword Intelligence WebSocket server initialized on /socket.io/keyword-intelligence');
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

      await Promise.all([pubClient.connect(), subClient.connect()]);

      this.io.adapter(createAdapter(pubClient, subClient));
      logger.info('✅ Redis adapter connected for Keyword Intelligence WebSocket');
    } catch (err) {
      logger.warn('Redis adapter connection failed:', err.message);
      throw err;
    }
  }

  /**
   * Setup authentication middleware
   */
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Attach user info to socket
        socket.userId = decoded.id;
        socket.user = decoded;
        
        next();
      } catch (error) {
        logger.warn('WebSocket authentication failed:', error.message);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.userId;
      logger.info(`[Keyword Intelligence] User ${userId} connected`);

      // Join user's room for targeted updates
      socket.join(`user:${userId}`);

      // Handle subscribe to monitor
      socket.on('subscribe-monitor', (monitorId) => {
        socket.join(`monitor:${monitorId}`);
        logger.info(`[Keyword Intelligence] User ${userId} subscribed to monitor ${monitorId}`);
      });

      // Handle unsubscribe from monitor
      socket.on('unsubscribe-monitor', (monitorId) => {
        socket.leave(`monitor:${monitorId}`);
        logger.info(`[Keyword Intelligence] User ${userId} unsubscribed from monitor ${monitorId}`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`[Keyword Intelligence] User ${userId} disconnected`);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`[Keyword Intelligence] Socket error for user ${userId}:`, error);
      });
    });
  }

  /**
   * Push monitor update to user
   */
  pushMonitorUpdate(userId, monitorId, data) {
    try {
      // Push to user's room
      this.io.to(`user:${userId}`).emit('monitor-update', {
        monitorId,
        ...data,
        timestamp: new Date().toISOString()
      });

      // Also push to monitor-specific room
      this.io.to(`monitor:${monitorId}`).emit('monitor-update', {
        monitorId,
        ...data,
        timestamp: new Date().toISOString()
      });

      logger.debug(`[Keyword Intelligence] Pushed update for monitor ${monitorId} to user ${userId}`);
    } catch (error) {
      logger.error(`[Keyword Intelligence] Error pushing update:`, error);
    }
  }

  /**
   * Push new snapshot to user
   */
  pushSnapshot(userId, monitorId, snapshot) {
    this.pushMonitorUpdate(userId, monitorId, {
      type: 'snapshot',
      snapshot
    });
  }

  /**
   * Push alert to user
   */
  pushAlert(userId, alert) {
    try {
      this.io.to(`user:${userId}`).emit('alert', {
        ...alert,
        timestamp: new Date().toISOString()
      });
      logger.debug(`[Keyword Intelligence] Pushed alert ${alert.id} to user ${userId}`);
    } catch (error) {
      logger.error(`[Keyword Intelligence] Error pushing alert:`, error);
    }
  }

  /**
   * Push monitor status change
   */
  pushMonitorStatusChange(userId, monitorId, status) {
    this.pushMonitorUpdate(userId, monitorId, {
      type: 'status-change',
      isActive: status
    });
  }

  /**
   * Get instance (for use in other modules)
   */
  static getInstance() {
    return keywordServerInstance;
  }
}

module.exports = KeywordIntelligenceServer;

