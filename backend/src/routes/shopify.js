const express = require('express');
const router = express.Router();
const ShopifyService = require('../services/ShopifyService');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const database = require('../database/connection');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');

// Middleware to authenticate requests
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = { userId: decoded.userId, ...decoded };
    next();
  });
};

// Get Shopify connection status/config
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const result = await database.query(
      'SELECT shop_domain, scope, is_active, last_sync_at, created_at FROM user_shopify_configs WHERE user_id = $1 AND is_active = true',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        connected: false,
        message: 'No Shopify store connected'
      });
    }

    const config = result.rows[0];
    res.json({
      connected: true,
      shop_domain: config.shop_domain,
      scope: config.scope,
      last_sync_at: config.last_sync_at,
      connected_at: config.created_at
    });

  } catch (error) {
    logger.error('Error fetching Shopify config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// Get Shopify integration stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const config = await database.query(
      'SELECT id FROM user_shopify_configs WHERE user_id = $1 AND is_active = true',
      [req.user.userId]
    );

    if (config.rows.length === 0) {
      return res.json({
        totalProducts: 0,
        totalCustomers: 0,
        totalOrders: 0,
        syncStatus: 'not_connected'
      });
    }

    const configId = config.rows[0].id;

    // Get counts from Shopify data tables
    const products = await database.query('SELECT COUNT(*) FROM shopify_products WHERE config_id = $1', [configId]);
    const customers = await database.query('SELECT COUNT(*) FROM shopify_customers WHERE config_id = $1', [configId]);
    const orders = await database.query('SELECT COUNT(*) FROM shopify_orders WHERE config_id = $1', [configId]);
    
    res.json({
      totalProducts: parseInt(products.rows[0].count) || 0,
      totalCustomers: parseInt(customers.rows[0].count) || 0,
      totalOrders: parseInt(orders.rows[0].count) || 0,
      syncStatus: 'connected'
    });
  } catch (error) {
    logger.error('Error fetching Shopify stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Sync Shopify data (requires ZTR tokens)
router.post('/sync', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    await ShopifyService.initializeForUser(req.user.userId);
    await ShopifyService.syncProductsForUser(req.user.userId);
    
    // Update last sync time
    await database.query(
      'UPDATE user_shopify_configs SET last_sync_at = NOW() WHERE user_id = $1',
      [req.user.userId]
    );
    
    res.json({ success: true, message: 'Data synced successfully' });
  } catch (error) {
    logger.error('Error syncing Shopify data:', error);
    res.status(500).json({ error: 'Failed to sync data', details: error.message });
  }
});

// Get products
router.get('/products', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 12, status = 'all', search = '' } = req.query;
    
    const config = await database.query(
      'SELECT id FROM user_shopify_configs WHERE user_id = $1 AND is_active = true',
      [req.user.userId]
    );

    if (config.rows.length === 0) {
      return res.json({ products: [], total: 0, page: parseInt(page), limit: parseInt(limit) });
    }

    const configId = config.rows[0].id;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT * FROM shopify_products WHERE config_id = $1';
    const params = [configId];

    if (search) {
      query += ' AND (title ILIKE $2 OR shopify_id ILIKE $2)';
      params.push(`%${search}%`);
    }

    if (status !== 'all') {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const products = await database.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM shopify_products WHERE config_id = $1';
    const countParams = [configId];
    if (search) {
      countQuery += ' AND (title ILIKE $2 OR shopify_id ILIKE $2)';
      countParams.push(`%${search}%`);
    }
    if (status !== 'all') {
      countQuery += ` AND status = $${countParams.length + 1}`;
      countParams.push(status);
    }
    const countResult = await database.query(countQuery, countParams);
    
    res.json({
      products: products.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error fetching Shopify products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get customers
router.get('/customers', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 12, state = 'all', search = '' } = req.query;
    
    const config = await database.query(
      'SELECT id FROM user_shopify_configs WHERE user_id = $1 AND is_active = true',
      [req.user.userId]
    );

    if (config.rows.length === 0) {
      return res.json({ customers: [], total: 0, page: parseInt(page), limit: parseInt(limit) });
    }

    const configId = config.rows[0].id;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT * FROM shopify_customers WHERE config_id = $1';
    const params = [configId];

    if (search) {
      query += ' AND (email ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2)';
      params.push(`%${search}%`);
    }

    if (state !== 'all') {
      query += ` AND state = $${params.length + 1}`;
      params.push(state);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const customers = await database.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM shopify_customers WHERE config_id = $1';
    const countParams = [configId];
    if (search) {
      countQuery += ' AND (email ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2)';
      countParams.push(`%${search}%`);
    }
    if (state !== 'all') {
      countQuery += ` AND state = $${countParams.length + 1}`;
      countParams.push(state);
    }
    const countResult = await database.query(countQuery, countParams);
    
    res.json({
      customers: customers.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error fetching Shopify customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get orders
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'all', search = '' } = req.query;
    
    const config = await database.query(
      'SELECT id FROM user_shopify_configs WHERE user_id = $1 AND is_active = true',
      [req.user.userId]
    );

    if (config.rows.length === 0) {
      return res.json({ orders: [], total: 0, page: parseInt(page), limit: parseInt(limit) });
    }

    const configId = config.rows[0].id;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT * FROM shopify_orders WHERE config_id = $1';
    const params = [configId];

    if (search) {
      query += ' AND (shopify_order_id ILIKE $2 OR customer_email ILIKE $2)';
      params.push(`%${search}%`);
    }

    if (status !== 'all') {
      query += ` AND financial_status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY order_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const orders = await database.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM shopify_orders WHERE config_id = $1';
    const countParams = [configId];
    if (search) {
      countQuery += ' AND (shopify_order_id ILIKE $2 OR customer_email ILIKE $2)';
      countParams.push(`%${search}%`);
    }
    if (status !== 'all') {
      countQuery += ` AND financial_status = $${countParams.length + 1}`;
      countParams.push(status);
    }
    const countResult = await database.query(countQuery, countParams);
    
    res.json({
      orders: orders.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error fetching Shopify orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Disconnect Shopify store
router.delete('/disconnect', authenticateToken, async (req, res) => {
  try {
    await database.query(
      'UPDATE user_shopify_configs SET is_active = false WHERE user_id = $1',
      [req.user.userId]
    );

    logger.info(`Shopify disconnected for user ${req.user.userId}`);
    res.json({ success: true, message: 'Shopify store disconnected successfully' });

  } catch (error) {
    logger.error('Error disconnecting Shopify:', error);
    res.status(500).json({ error: 'Failed to disconnect Shopify store' });
  }
});

module.exports = router;
