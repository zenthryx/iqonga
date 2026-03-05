const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const database = require('../database/connection');

// GET /api/users/profile - Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await database.query(`
      SELECT id, email, username, wallet_address, profile_image, twitter_handle, telegram_handle, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        wallet_address: user.wallet_address,
        profile_image: user.profile_image,
        twitter_handle: user.twitter_handle,
        telegram_handle: user.telegram_handle,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });

  } catch (error) {
    console.error('Failed to get user profile:', error);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, email, profile_image, twitter_handle, telegram_handle } = req.body;
    
    // Validate required fields - only username is required, email is optional
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Get current user data to validate username
    const currentUserResult = await database.query(`
      SELECT username FROM users WHERE id = $1
    `, [userId]);
    
    if (currentUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentUsername = currentUserResult.rows[0].username;
    
    // Username cannot be changed - it's auto-generated and immutable
    if (username !== currentUsername) {
      return res.status(400).json({ error: 'Username cannot be changed' });
    }
    
    // Validate email format if provided
    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }
    
    // Update user profile (username cannot be changed, email is optional)
    const result = await database.query(`
      UPDATE users 
      SET email = $1, profile_image = $2, twitter_handle = $3, telegram_handle = $4, updated_at = NOW()
      WHERE id = $5 AND username = $6
      RETURNING id, email, username, wallet_address, profile_image, twitter_handle, telegram_handle, created_at, updated_at
    `, [email || null, profile_image || null, twitter_handle || null, telegram_handle || null, userId, username]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        wallet_address: user.wallet_address,
        profile_image: user.profile_image,
        twitter_handle: user.twitter_handle,
        telegram_handle: user.telegram_handle,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Failed to update user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// GET /api/users
router.get('/', async (req, res) => {
  try {
    res.json({ message: 'Users endpoint working', users: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
