import express from 'express';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import jwt from 'jsonwebtoken';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Solana wallet authentication
router.post('/solana', async (req, res) => {
  try {
    const { publicKey, signature, message } = req.body;

    if (!publicKey || !signature || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify the signature
    const publicKeyBytes = new PublicKey(publicKey).toBytes();
    const messageBytes = new Uint8Array(message);
    const signatureBytes = new Uint8Array(signature);

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check if user exists in database
    let user = await req.db.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [publicKey]
    );

    if (user.rows.length === 0) {
      // Create new user
      const newUser = await req.db.query(`
        INSERT INTO users (wallet_address, username, subscription_tier, token_balance, created_at)
        VALUES ($1, $2, 'basic', 1000, NOW())
        RETURNING *
      `, [publicKey, `user_${publicKey.slice(0, 8)}`]);
      
      user = newUser;
    }

    const userData = user.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: userData.id,
        publicKey: userData.wallet_address 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Get user's agents
    const agents = await req.db.query(`
      SELECT id, name, personality_type, nft_mint_address, evolution_stage, is_active
      FROM ai_agents 
      WHERE user_id = $1 AND is_active = true
    `, [userData.id]);

    res.json({
      success: true,
      token,
      user: {
        id: userData.id,
        walletAddress: userData.wallet_address,
        username: userData.username,
        tokenBalance: userData.token_balance,
        subscription: userData.subscription_tier,
        agents: agents.rows
      }
    });

  } catch (error) {
    console.error('Solana authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get current user profile
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const user = await req.db.query(`
      SELECT u.*, 
             COUNT(a.id) as total_agents,
             SUM(a.total_posts_generated) as total_posts,
             AVG(a.average_engagement_rate) as avg_engagement
      FROM users u
      LEFT JOIN ai_agents a ON u.id = a.user_id AND a.is_active = true
      WHERE u.id = $1
      GROUP BY u.id
    `, [req.user.id]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = user.rows[0];

    // Get recent activity
    const recentActivity = await req.db.query(`
      SELECT gc.content_text, gc.platform, gc.published_at, gc.engagement_rate,
             a.name as agent_name
      FROM generated_content gc
      JOIN ai_agents a ON gc.agent_id = a.id
      WHERE a.user_id = $1 AND gc.status = 'published'
      ORDER BY gc.published_at DESC
      LIMIT 10
    `, [req.user.id]);

    res.json({
      success: true,
      user: {
        id: userData.id,
        walletAddress: userData.wallet_address,
        username: userData.username,
        email: userData.email,
        tokenBalance: userData.token_balance,
        subscription: userData.subscription_tier,
        reputationScore: userData.reputation_score,
        totalAgents: parseInt(userData.total_agents) || 0,
        totalPosts: parseInt(userData.total_posts) || 0,
        avgEngagement: parseFloat(userData.avg_engagement) || 0,
        createdAt: userData.created_at
      },
      recentActivity: recentActivity.rows
    });

  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { username, email } = req.body;

    // Validate username uniqueness if provided
    if (username) {
      const existingUser = await req.db.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, req.user.id]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Update user profile
    const updatedUser = await req.db.query(`
      UPDATE users 
      SET username = COALESCE($1, username),
          email = COALESCE($2, email),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [username, email, req.user.id]);

    res.json({
      success: true,
      user: {
        id: updatedUser.rows[0].id,
        walletAddress: updatedUser.rows[0].wallet_address,
        username: updatedUser.rows[0].username,
        email: updatedUser.rows[0].email,
        tokenBalance: updatedUser.rows[0].token_balance,
        subscription: updatedUser.rows[0].subscription_tier
      }
    });

  } catch (error) {
    console.error('Failed to update profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SocialAI Authentication'
  });
});

export default router; 