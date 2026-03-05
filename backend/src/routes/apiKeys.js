const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const crypto = require('crypto');
const database = require('../database/connection');

// Get user's API keys
router.get('/api-keys', authenticateToken, async (req, res) => {
  try {
    const result = await database.query(
      'SELECT id, name, key_hash, created_at, last_used, is_active FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    const apiKeys = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      key: row.key_hash ? 'ak_' + '•'.repeat(32) : null, // Masked for security
      created_at: row.created_at,
      last_used: row.last_used,
      is_active: row.is_active
    }));
    
    res.json({
      success: true,
      data: apiKeys
    });
  } catch (error) {
    console.error('API Key Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API keys'
    });
  }
});

// Create new API key (requires ZTR tokens)
router.post('/api-keys', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'API key name is required'
      });
    }
    
    // Generate API key
    const keyValue = 'ak_' + crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(keyValue).digest('hex');
    
    const result = await database.query(
      'INSERT INTO api_keys (user_id, name, key_hash, created_at, is_active) VALUES ($1, $2, $3, NOW(), true) RETURNING id, name, created_at, is_active',
      [req.user.id, name.trim(), keyHash]
    );
    
    const apiKey = result.rows[0];
    
    res.json({
      success: true,
      data: {
        id: apiKey.id,
        name: apiKey.name,
        key: keyValue,
        created_at: apiKey.created_at,
        is_active: apiKey.is_active
      }
    });
  } catch (error) {
    console.error('API Key Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create API key'
    });
  }
});

// Update API key (toggle active/inactive or regenerate)
router.patch('/api-keys/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, regenerate } = req.body;
    
    if (regenerate) {
      // Generate new API key
      const keyValue = 'ak_' + crypto.randomBytes(32).toString('hex');
      const keyHash = crypto.createHash('sha256').update(keyValue).digest('hex');
      
      const result = await database.query(
        'UPDATE api_keys SET key_hash = $1 WHERE id = $2 AND user_id = $3 RETURNING id, name, created_at, is_active',
        [keyHash, id, req.user.id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'API key not found'
        });
      }
      
      const apiKey = result.rows[0];
      
      res.json({
        success: true,
        data: {
          id: apiKey.id,
          name: apiKey.name,
          key: keyValue,
          created_at: apiKey.created_at,
          is_active: apiKey.is_active
        }
      });
    } else {
      // Toggle active/inactive
      const result = await database.query(
        'UPDATE api_keys SET is_active = $1 WHERE id = $2 AND user_id = $3 RETURNING id, name, is_active',
        [is_active, id, req.user.id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'API key not found'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    }
  } catch (error) {
    console.error('API Key Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update API key'
    });
  }
});

// Delete API key
router.delete('/api-keys/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await database.query(
      'DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }
    
    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('API Key Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete API key'
    });
  }
});

module.exports = router;
