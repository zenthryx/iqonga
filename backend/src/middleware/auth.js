const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const database = require('../database/connection');
const logger = require('../utils/logger');

// Middleware to authenticate JWT tokens or API keys
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    // Check if it's an API key (starts with 'ak_')
    if (token.startsWith('ak_')) {
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');
      
      const apiKeyResult = await database.query(
        `SELECT ak.id, ak.user_id, ak.name, ak.is_active, u.id, u.wallet_address, u.username, u.email, u.created_at, u.updated_at, u.role, u.is_admin, u.admin_permissions
         FROM api_keys ak
         JOIN users u ON ak.user_id = u.id
         WHERE ak.key_hash = $1 AND ak.is_active = true`,
        [keyHash]
      );

      if (apiKeyResult.rows.length === 0) {
        return res.status(401).json({ 
          error: 'Invalid API key',
          code: 'API_KEY_INVALID'
        });
      }

      // Update last used timestamp
      await database.query(
        'UPDATE api_keys SET last_used = NOW() WHERE id = $1',
        [apiKeyResult.rows[0].id]
      );

      req.user = {
        id: apiKeyResult.rows[0].user_id,
        wallet_address: apiKeyResult.rows[0].wallet_address,
        username: apiKeyResult.rows[0].username,
        email: apiKeyResult.rows[0].email,
        created_at: apiKeyResult.rows[0].created_at,
        updated_at: apiKeyResult.rows[0].updated_at,
        role: apiKeyResult.rows[0].role,
        is_admin: apiKeyResult.rows[0].is_admin,
        admin_permissions: apiKeyResult.rows[0].admin_permissions
      };
      
      return next();
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Select only columns that exist in the users table
    const userResult = await database.query(
      'SELECT id, wallet_address, username, email, created_at, updated_at, role, is_admin, admin_permissions FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = userResult.rows[0];

    // // Check if token is for a valid session
    // const sessionResult = await database.query(`
    //   SELECT id FROM user_sessions 
    //   WHERE user_id = $1 AND access_token_hash = $2 AND expires_at > NOW() AND is_active = true
    // `, [decoded.userId, token.substring(0, 64)]); // Use first 64 chars as identifier

    // if (sessionResult.rows.length === 0) {
    //   return res.status(401).json({ 
    //     error: 'Invalid token - session expired or invalid',
    //     code: 'SESSION_INVALID'
    //   });
    // }

    next();

  } catch (error) {
    logger.error('Authentication error:', error);
    
    // Log additional details for debugging
    if (error.name === 'JsonWebTokenError') {
      const authHeader = req.headers['authorization'];
      const tokenFromHeader = authHeader && authHeader.split(' ')[1];
      logger.error('JWT Error details:', {
        message: error.message,
        token: tokenFromHeader ? `${tokenFromHeader.substring(0, 20)}...` : 'undefined',
        header: req.headers['authorization'] ? `${req.headers['authorization'].substring(0, 30)}...` : 'undefined'
      });
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      logger.error('Token expired:', {
        message: error.message,
        expiredAt: error.expiredAt
      });
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

// Middleware to check if user has specific subscription tier
const requireSubscription = (requiredTier = 'basic') => {
  const tierLevels = {
    'basic': 1,
    'pro': 2,
    'enterprise': 3
  };

  return (req, res, next) => {
    const userTier = req.user?.subscription_tier || 'basic';
    const userLevel = tierLevels[userTier] || 0;
    const requiredLevel = tierLevels[requiredTier] || 1;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: `${requiredTier} subscription required`,
        code: 'SUBSCRIPTION_REQUIRED',
        currentTier: userTier,
        requiredTier
      });
    }

    next();
  };
};

// Middleware to check if user has sufficient token balance
const requireTokenBalance = (minimumBalance) => {
  return (req, res, next) => {
    const userBalance = req.user?.token_balance || 0;

    if (userBalance < minimumBalance) {
      return res.status(402).json({
        error: 'Insufficient token balance',
        code: 'INSUFFICIENT_TOKENS',
        currentBalance: userBalance,
        required: minimumBalance
      });
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const userResult = await database.query(`
      SELECT id, wallet_address, email, username, subscription_tier, token_balance, reputation_score
      FROM users 
      WHERE id = $1
    `, [decoded.userId || decoded.id]);

    if (userResult.rows.length > 0) {
      req.user = userResult.rows[0];
      req.tokenData = decoded;
    } else {
      req.user = null;
    }

    next();

  } catch (error) {
    // If optional auth fails, just continue without user
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  requireSubscription,
  requireTokenBalance,
  optionalAuth
}; 