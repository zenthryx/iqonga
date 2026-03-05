const jwt = require('jsonwebtoken');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { isWhitelisted } = require('./whitelist');

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    // First check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check if user is admin
    const userResult = await database.query(`
      SELECT id, role, is_admin, admin_permissions, wallet_address, username
      FROM users 
      WHERE id = $1
    `, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    if (!user.is_admin || user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }

    // Check if wallet is whitelisted for admin access (optional - can be disabled via env)
    const requireWhitelist = process.env.REQUIRE_ADMIN_WHITELIST !== 'false';
    
    if (requireWhitelist) {
      if (!user.wallet_address) {
        return res.status(403).json({ 
          error: 'Wallet address required for admin access',
          code: 'WALLET_REQUIRED'
        });
      }

      const walletIsWhitelisted = await isWhitelisted(user.wallet_address);
      if (!walletIsWhitelisted) {
        logger.warn(`Admin access denied for user ${user.id} - wallet not whitelisted: ${user.wallet_address}`);
        return res.status(403).json({ 
          error: 'Admin access requires whitelisted wallet',
          code: 'WHITELIST_REQUIRED',
          message: 'Your wallet must be whitelisted to access the admin section.'
        });
      }
    }

    // Add admin info to request
    req.admin = {
      id: user.id,
      role: user.role,
      permissions: user.admin_permissions || {},
      wallet_address: user.wallet_address,
      username: user.username
    };

    next();

  } catch (error) {
    logger.error('Admin authentication error:', error);
    logger.error('Admin auth error stack:', error.stack);
    res.status(500).json({ 
      error: 'Admin authentication failed',
      code: 'ADMIN_AUTH_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Middleware to check specific admin permissions
const requireAdminPermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ 
        error: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED'
      });
    }

    if (!req.admin.permissions[permission]) {
      return res.status(403).json({ 
        error: `Permission '${permission}' required`,
        code: 'PERMISSION_REQUIRED',
        required_permission: permission
      });
    }

    next();
  };
};

// Log admin actions
const logAdminAction = async (adminId, actionType, description, targetUserId = null, metadata = {}) => {
  try {
    await database.query(`
      INSERT INTO admin_actions 
      (admin_user_id, action_type, target_user_id, description, metadata, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      adminId,
      actionType,
      targetUserId,
      description,
      JSON.stringify(metadata),
      null, // Will be set by the route handler
      null  // Will be set by the route handler
    ]);
  } catch (error) {
    logger.error('Failed to log admin action:', error);
  }
};

// Enhanced system logging
const logSystemEvent = async (level, category, message, userId = null, metadata = {}) => {
  try {
    await database.query(`
      INSERT INTO system_logs 
      (level, category, message, user_id, metadata)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      level,
      category,
      message,
      userId,
      JSON.stringify(metadata)
    ]);
  } catch (error) {
    logger.error('Failed to log system event:', error);
  }
};

module.exports = {
  requireAdmin,
  requireAdminPermission,
  logAdminAction,
  logSystemEvent
};
