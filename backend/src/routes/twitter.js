const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Initialize Twitter client with OAuth 2.0 credentials
const twitterClient = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
});

// Import centralized encryption utility
const { encrypt, decrypt } = require('../utils/encryption');



// GET /api/twitter/auth/request - Start Twitter OAuth 2.0 flow
router.get('/auth/request', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const walletAddress = req.user.wallet_address;
    const callbackUrl = process.env.TWITTER_CALLBACK_URL || `${process.env.API_URL}/api/twitter/callback`;
    
    // Get redirect_uri from query params (for WordPress redirect)
    const redirectUri = req.query.redirect_uri || null;
    const source = req.query.source || null; // 'wordpress' or 'dashboard'
    
    console.log('Starting Twitter OAuth 2.0 flow for user:', userId, 'wallet:', walletAddress);
    console.log('Callback URL:', callbackUrl);
    console.log('Client ID:', process.env.TWITTER_CLIENT_ID ? 'Set' : 'Missing');
    console.log('Redirect URI (after OAuth):', redirectUri);
    console.log('Source:', source);
    
    // Generate OAuth 2.0 authorization URL with PKCE
    const requestedScopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];
    console.log('🔐 Requesting OAuth 2.0 scopes:', requestedScopes);
    
    const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(callbackUrl, {
      scope: requestedScopes
    });
    
    console.log('🔗 Generated OAuth 2.0 URL with scopes:', url);

    // Store the JWT token temporarily for callback authentication
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    
    // Store OAuth parameters with redirect URI and source for callback
    await database.query(`
      INSERT INTO oauth_temp_tokens (user_id, code_verifier, state, platform, expires_at, auth_token, metadata)
      VALUES ($1, $2, $3, 'twitter', NOW() + INTERVAL '15 minutes', $4, $5::jsonb)
      ON CONFLICT (user_id, platform) 
      DO UPDATE SET 
        code_verifier = $2, 
        state = $3, 
        expires_at = NOW() + INTERVAL '15 minutes',
        auth_token = $4,
        metadata = $5::jsonb
    `, [
      userId, 
      codeVerifier, 
      state, 
      authToken,
      JSON.stringify({ redirect_uri: redirectUri, source: source })
    ]);

    console.log('OAuth 2.0 URL generated successfully');
    console.log('Stored state:', state, 'for user:', userId);

    res.json({
      success: true,
      data: {
        authUrl: url,
        state: state
      }
    });

  } catch (error) {
    console.error('Twitter OAuth 2.0 request failed:', error);
    logger.error('Twitter OAuth request failed:', error);
    res.status(500).json({
      error: 'Failed to initiate Twitter authentication',
      details: error.message
    });
  }
});

// GET /api/twitter/callback - Handle Twitter OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    console.log('Twitter OAuth 2.0 callback received:', { 
      code: code ? 'Present' : 'Missing', 
      state, 
      error,
      fullQuery: req.query 
    });

    // Check if user denied authorization or there was an error
    if (error) {
      console.log('Twitter OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/profile?twitter_auth=denied&error=${error}`);
    }

    if (!code || !state) {
      console.log('Missing OAuth 2.0 parameters:', { code: !!code, state: !!state });
      return res.redirect(`${process.env.FRONTEND_URL}/profile?twitter_auth=error`);
    }

    console.log('Looking for OAuth state in database:', state);

    // Retrieve stored OAuth parameters using Twitter's state
    console.log('Querying oauth_temp_tokens for state:', state);
    const tempTokenResult = await database.query(`
      SELECT user_id, code_verifier, auth_token, created_at, expires_at, metadata
      FROM oauth_temp_tokens 
      WHERE state = $1 AND platform = 'twitter' AND expires_at > NOW()
    `, [state]);

    console.log('Database query result:', {
      rowsFound: tempTokenResult.rows.length,
      state: state,
      platform: 'twitter'
    });

    if (tempTokenResult.rows.length === 0) {
      // Let's check what's actually in the database for debugging
      const debugResult = await database.query(`
        SELECT user_id, state, platform, created_at, expires_at
        FROM oauth_temp_tokens 
        WHERE platform = 'twitter'
        ORDER BY created_at DESC
        LIMIT 5
      `);
      
      console.log('Debug: Recent OAuth tokens in database:', debugResult.rows);
      console.log('No matching OAuth state found or expired');
      return res.redirect(`${process.env.FRONTEND_URL}/profile?twitter_auth=expired`);
    }

    const { user_id: dbUserId, code_verifier, auth_token, metadata } = tempTokenResult.rows[0];
    
    // Parse metadata to get redirect URI and source
    let redirectUri = null;
    let source = null;
    if (metadata) {
      try {
        const meta = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
        redirectUri = meta.redirect_uri || null;
        source = meta.source || null;
      } catch (e) {
        console.log('Failed to parse metadata:', e);
      }
    }
    
    // Verify JWT token if available
    let verifiedUserId = dbUserId;
    let jwtDecoded = null;
    
    if (auth_token) {
      try {
        jwtDecoded = jwt.verify(auth_token, process.env.JWT_SECRET);
        verifiedUserId = jwtDecoded.userId || jwtDecoded.id;
        console.log('JWT token verified for user:', verifiedUserId);
        
        // Double-check that the JWT user ID matches the database user ID
        if (verifiedUserId !== dbUserId) {
          console.log('JWT user ID mismatch:', { jwtUserId: verifiedUserId, dbUserId: dbUserId });
          return res.redirect(`${process.env.FRONTEND_URL}/profile?twitter_auth=error&message=Authentication mismatch`);
        }
      } catch (jwtError) {
        console.log('JWT verification failed:', jwtError.message);
        // Continue with database user ID if JWT verification fails
        verifiedUserId = dbUserId;
      }
    }
    
    console.log('Found user for OAuth callback:', verifiedUserId);
    
    // Get user's wallet address for better identification
    const userResult = await database.query(`
      SELECT wallet_address, wallet_hash FROM users WHERE id = $1
    `, [verifiedUserId]);
    
    if (userResult.rows.length === 0) {
      console.log('User not found in database');
      return res.redirect(`${process.env.FRONTEND_URL}/profile?twitter_auth=error&message=User not found`);
    }
    
    const userWallet = userResult.rows[0].wallet_address;
    console.log('User wallet address:', userWallet);

    // Exchange authorization code for access token
    console.log('🔄 Exchanging authorization code for tokens...');
    console.log('📋 Code verifier length:', code_verifier ? code_verifier.length : 'Missing');
    console.log('🔗 Redirect URI:', process.env.TWITTER_CALLBACK_URL || `${process.env.API_URL}/api/auth/twitter/callback`);
    
    const { client: loggedClient, accessToken, refreshToken } = await twitterClient.loginWithOAuth2({
      code,
      codeVerifier: code_verifier,
      redirectUri: process.env.TWITTER_CALLBACK_URL || `${process.env.API_URL}/api/auth/twitter/callback`
    });
    
    console.log('✅ Successfully exchanged code for tokens');
    console.log('🔑 Access token length:', accessToken ? accessToken.length : 'Missing');
    console.log('🔄 Refresh token length:', refreshToken ? refreshToken.length : 'Missing');
    
    // Get user info
    console.log('🔍 Testing Twitter client authentication after token exchange...');
    let twitterUser = null;
    try {
      twitterUser = await loggedClient.v2.me({
      'user.fields': ['id', 'username', 'name', 'profile_image_url', 'public_metrics']
    });
      console.log('✅ Twitter client authentication successful');
      console.log('👤 Retrieved Twitter user info:', twitterUser.data.username);
    } catch (authError) {
      console.log('❌ Twitter client authentication failed after token exchange:', authError.message);
      
      // Check if it's a rate limit error (429)
      if (authError.code === 429 || (authError.rateLimit && authError.rateLimit.remaining === 0)) {
        console.log('⚠️ Rate limit hit during authentication. This is likely due to Twitter API monthly limits.');
        console.log('💡 We will still store the connection, but user may need to wait before using Twitter features.');
        // For rate limit, we'll try to get minimal user info or use a fallback
        // Since we can't call the API, we'll need to extract username from the token or skip verification
        // For now, throw a more helpful error
        throw new Error(`Twitter API rate limit exceeded. Please try again later. The connection may still be saved, but verification failed due to rate limits.`);
      }
      
      // For other errors, check if it's a scope issue
      if (authError.code === 403 || authError.message.includes('scope')) {
        console.log('🔍 This suggests the OAuth 2.0 scopes were not properly granted');
        throw new Error(`OAuth 2.0 scopes not granted: ${authError.message}`);
      }
      
      // Generic error
      throw new Error(`Twitter authentication verification failed: ${authError.message}`);
    }
    
    // Verify twitterUser was retrieved successfully
    if (!twitterUser || !twitterUser.data) {
      throw new Error('Failed to retrieve Twitter user data');
    }
    
    console.log('🔍 Twitter user data verification:');
    console.log('   - twitterUser object:', typeof twitterUser);
    console.log('   - twitterUser.data:', typeof twitterUser.data);
    console.log('   - username:', twitterUser.data.username);
    console.log('   - user ID:', twitterUser.data.id);

    // Encrypt and store access tokens
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;

    // Store platform connection with username in metadata for TwitterAPI.io reads
    const username = twitterUser.data.username;
    const usernameText = String(username); // Ensure it's a string for JSONB
    await database.query(`
      INSERT INTO platform_connections 
      (user_id, platform, platform_user_id, username, display_name, profile_image_url, 
       access_token, refresh_token, connection_status, follower_count, last_sync, metadata)
      VALUES ($1, 'twitter', $2, $3, $4, $5, $6, $7, 'active', $8, NOW(), 
              jsonb_build_object('username', $9::text))
      ON CONFLICT (user_id, platform) 
      DO UPDATE SET 
        platform_user_id = $2,
        username = $3,
        display_name = $4,
        profile_image_url = $5,
        access_token = $6,
        refresh_token = $7,
        connection_status = 'active',
        follower_count = $8,
        last_sync = NOW(),
        metadata = COALESCE(platform_connections.metadata, '{}'::jsonb) || jsonb_build_object('username', $9::text)
    `, [
      verifiedUserId,
      twitterUser.data.id,
      username,
      twitterUser.data.name,
      twitterUser.data.profile_image_url,
      encryptedAccessToken,
      encryptedRefreshToken,
      twitterUser.data.public_metrics?.followers_count || 0,
      usernameText  // $9 - separate parameter for JSONB to avoid type conflict
    ]);

    console.log('Stored Twitter connection successfully');

    // Clean up temporary tokens
    await database.query(`
      DELETE FROM oauth_temp_tokens 
      WHERE state = $1 AND platform = 'twitter'
    `, [state]);

    console.log('Cleaned up temporary tokens');

    // Determine redirect URL based on source
    let redirectUrl;
    if (source === 'wordpress' && redirectUri) {
      // Redirect back to WordPress admin page
      redirectUrl = `${redirectUri}?twitter_auth=success&username=${twitterUser.data.username}`;
    } else {
      // Default redirect to Dashboard profile
      redirectUrl = `${process.env.FRONTEND_URL}/profile?twitter_auth=success&username=${twitterUser.data.username}`;
    }
    
    console.log('Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Twitter OAuth callback failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    logger.error('Twitter OAuth callback failed:', error);
    res.redirect(`${process.env.FRONTEND_URL}/profile?twitter_auth=error&message=${encodeURIComponent(error.message)}`);
  }
});

// GET /api/twitter/connection - Get user's Twitter connection status
router.get('/connection', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await database.query(`
      SELECT platform_user_id, username, display_name, profile_image_url, 
             connection_status, follower_count, last_sync, created_at
      FROM platform_connections 
      WHERE user_id = $1 AND platform = 'twitter'
    `, [userId]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
        connected: false,
        connection: null
        }
      });
    }

    const connection = result.rows[0];
    res.json({
      success: true,
      data: {
      connected: true,
      connection: {
        platformUserId: connection.platform_user_id,
        username: connection.username,
        displayName: connection.display_name,
        profileImageUrl: connection.profile_image_url,
        status: connection.connection_status,
        followerCount: connection.follower_count,
        lastSync: connection.last_sync,
        connectedAt: connection.created_at
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get Twitter connection:', error);
    res.status(500).json({
      error: 'Failed to retrieve Twitter connection status'
    });
  }
});

// DELETE /api/twitter/connection - Disconnect Twitter account
router.delete('/connection', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Remove platform connection
    await database.query(`
      DELETE FROM platform_connections 
      WHERE user_id = $1 AND platform = 'twitter'
    `, [userId]);

    // Update agents to remove Twitter platform
    await database.query(`
      UPDATE ai_agents 
      SET platforms = array_remove(platforms, 'twitter')
      WHERE user_id = $1
    `, [userId]);

    res.json({
      success: true,
      message: 'Twitter account disconnected successfully'
    });

  } catch (error) {
    logger.error('Failed to disconnect Twitter:', error);
    res.status(500).json({
      error: 'Failed to disconnect Twitter account'
    });
  }
});

// POST /api/twitter/post - Post content to Twitter (for testing)
router.post('/post', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { content, agentId } = req.body;

    if (!content || content.length > 280) {
      return res.status(400).json({
        error: 'Content is required and must be 280 characters or less'
      });
    }

    // Get user's Twitter connection
    const connectionResult = await database.query(`
      SELECT access_token, refresh_token, username
      FROM platform_connections 
      WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'
    `, [userId]);

    if (connectionResult.rows.length === 0) {
      return res.status(400).json({
        error: 'No active Twitter connection found'
      });
    }

    const connection = connectionResult.rows[0];
    
    // Decrypt tokens
    const accessToken = decrypt(connection.access_token);
    const refreshToken = decrypt(connection.refresh_token);

    // Create authenticated Twitter client
    const userClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: accessToken,        // OAuth 2.0 access token
      accessSecret: accessToken,      // For OAuth 2.0, use access token again
    });

    // Post tweet
    const tweet = await userClient.v2.tweet(content);

    // Store generated content record
    if (agentId) {
      await database.query(`
        INSERT INTO generated_content 
        (agent_id, platform, content_type, content_text, platform_post_id, published_at, status, ai_model_used)
        VALUES ($1, 'twitter', 'post', $2, $3, NOW(), 'published', 'manual')
      `, [agentId, content, tweet.data.id]);
    }

    res.json({
      success: true,
      tweet: {
        id: tweet.data.id,
        text: tweet.data.text,
        url: `https://twitter.com/${connection.username}/status/${tweet.data.id}`
      }
    });

  } catch (error) {
    logger.error('Failed to post to Twitter:', error);
    res.status(500).json({
      error: 'Failed to post to Twitter',
      details: error.message
    });
  }
});

// GET /api/twitter/analytics/:agentId - Get Twitter analytics for an agent
router.get('/analytics/:agentId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { agentId } = req.params;

    // Verify agent ownership
    const agentResult = await database.query(`
      SELECT id FROM ai_agents 
      WHERE id = $1 AND user_id = $2
    `, [agentId, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get Twitter analytics
    const analyticsResult = await database.query(`
      SELECT 
        COUNT(*) as total_posts,
        SUM(likes_count) as total_likes,
        SUM(retweets_count) as total_retweets,
        SUM(replies_count) as total_replies,
        AVG(engagement_rate) as avg_engagement_rate,
        COUNT(CASE WHEN is_viral = true THEN 1 END) as viral_posts
      FROM generated_content
      WHERE agent_id = $1 AND platform = 'twitter' AND status = 'published'
    `, [agentId]);

    const analytics = analyticsResult.rows[0];

    res.json({
      success: true,
      analytics: {
        totalPosts: parseInt(analytics.total_posts) || 0,
        totalLikes: parseInt(analytics.total_likes) || 0,
        totalRetweets: parseInt(analytics.total_retweets) || 0,
        totalReplies: parseInt(analytics.total_replies) || 0,
        averageEngagementRate: parseFloat(analytics.avg_engagement_rate) || 0,
        viralPosts: parseInt(analytics.viral_posts) || 0
      }
    });

  } catch (error) {
    logger.error('Failed to get Twitter analytics:', error);
    res.status(500).json({
      error: 'Failed to retrieve Twitter analytics'
    });
  }
});

module.exports = router; 