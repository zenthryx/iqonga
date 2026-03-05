/**
 * Email/Password and Google OAuth Authentication Routes
 * Supplements existing Solana wallet authentication
 */

const express = require('express');
const router = express.Router();
const AuthService = require('../services/AuthService');
const { authenticateToken } = require('../middleware/auth');

/**
 * Register new user with email/password
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }
    
    const user = await AuthService.register(email, password, username);
    
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        user_tier: user.user_tier
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Login with email/password
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }
    
    const result = await AuthService.login(email, password);
    
    res.json({
      success: true,
      message: 'Login successful',
      ...result
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Google OAuth callback
 * GET /api/auth/google/callback
 * 
 * Note: This reuses your existing Google OAuth setup from Gmail/Calendar
 * Make sure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are in .env
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error) {
      console.error('Google OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=${error}`);
    }
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=no_code`);
    }
    
    // Get backend URL from env or construct from request
    // IMPORTANT: Use BACKEND_URL (www.iqonga.org), NOT API_URL
    let backendUrl = process.env.BACKEND_URL;
    
    // If BACKEND_URL not set, use request host (www.iqonga.org when accessed via frontend)
    if (!backendUrl) {
      backendUrl = `${req.protocol}://${req.get('host')}`;
      console.warn('⚠️ BACKEND_URL not set in .env, using request host:', backendUrl);
    }
    
    const redirectUri = `${backendUrl}/api/auth/google/callback`;
    console.log('🔐 Google OAuth callback redirect URI:', redirectUri);
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Token exchange failed:', tokenData);
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=token_exchange_failed`);
    }
    
    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    
    const googleUser = await userResponse.json();
    
    if (!googleUser || !googleUser.email) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=no_email`);
    }
    
    // Login or create user
    const result = await AuthService.googleLogin({
      email: googleUser.email,
      name: googleUser.name || googleUser.given_name || googleUser.email.split('@')[0],
      google_id: googleUser.id,
      email_verified: googleUser.verified_email || true
    });
    
    // Redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${result.token}`;
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=google_auth_failed`);
  }
});

/**
 * Initiate Google OAuth flow
 * GET /api/auth/google
 * 
 * This redirects to Google's OAuth consent screen
 */
router.get('/google', (req, res) => {
  // Check if required environment variables are set
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.error('❌ GOOGLE_CLIENT_ID is not set in environment variables');
    return res.status(500).json({ error: 'Google OAuth not configured' });
  }
  
  // Get backend URL from env or construct from request
  // IMPORTANT: Use BACKEND_URL, not API_URL (they serve different purposes)
  let backendUrl = process.env.BACKEND_URL;
  
  // If BACKEND_URL not set, try to get from request
  if (!backendUrl) {
    backendUrl = `${req.protocol}://${req.get('host')}`;
    console.warn('⚠️ BACKEND_URL not set in .env, using request host:', backendUrl);
  }
  
  if (!backendUrl) {
    console.error('❌ BACKEND_URL is not set and could not be determined from request');
    return res.status(500).json({ error: 'Backend URL not configured. Please set BACKEND_URL in .env' });
  }
  
  const redirectUri = `${backendUrl}/api/auth/google/callback`;
  
  console.log('🔐 Google OAuth redirect URI:', redirectUri);
  console.log('🔍 Environment check:', {
    BACKEND_URL: process.env.BACKEND_URL || 'NOT SET',
    API_URL: process.env.API_URL || 'NOT SET',
    using: backendUrl
  });
  
  // For manual implementation, redirect to Google OAuth URL:
  const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'profile email',
    access_type: 'offline',
    prompt: 'consent'
  });
  
  res.redirect(`${googleAuthUrl}?${params.toString()}`);
});

/**
 * Migrate Privy user to email/password
 * POST /api/auth/migrate-privy
 */
router.post('/migrate-privy', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }
    
    const result = await AuthService.migratePrivyUser(email, password);
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Connect wallet to existing email account
 * POST /api/auth/connect-wallet
 * 
 * Allows users to connect their Solana wallet to upgrade to token_holder tier
 */
router.post('/connect-wallet', authenticateToken, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const userId = req.user.id;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false,
        error: 'Wallet address is required' 
      });
    }
    
    // Check if wallet already connected to another account
    const database = require('../database/connection');
    const existing = await database.query(
      'SELECT id FROM users WHERE wallet_address = $1 AND id != $2',
      [walletAddress, userId]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'This wallet is already connected to another account'
      });
    }
    
    // Check token balance and upgrade tier if eligible
    const tierResult = await AuthService.checkAndUpgradeUserTier(userId, walletAddress);
    
    res.json({
      success: true,
      message: tierResult.upgraded 
        ? 'Wallet connected! Your account has been upgraded to token holder tier.' 
        : 'Wallet connected! Hold 1M+ ZTR tokens to get standard pricing.',
      ...tierResult
    });
    
  } catch (error) {
    console.error('Wallet connection error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email is required' 
      });
    }
    
    const result = await AuthService.requestPasswordReset(email);
    
    res.json(result);
    
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process password reset request' 
    });
  }
});

/**
 * Reset password using token
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    
    if (!resetToken || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Reset token and new password are required' 
      });
    }
    
    const result = await AuthService.resetPassword(resetToken, newPassword);
    
    res.json(result);
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Get current user info
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const database = require('../database/connection');
    const result = await database.query(
      'SELECT id, email, username, wallet_address, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get user info' 
    });
  }
});

/**
 * Logout (client-side token removal)
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Update last logout time
    const database = require('../database/connection');
    await database.query(
      'UPDATE users SET updated_at = NOW() WHERE id = $1',
      [req.user.id]
    );
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to logout' 
    });
  }
});

/**
 * Magic Code Authentication (Passwordless)
 * POST /api/auth/magic-code/request - Request 6-digit code
 * POST /api/auth/magic-code/verify - Verify code and login
 */
const MagicCodeAuthService = require('../services/MagicCodeAuthService');

router.post('/magic-code/request', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email is required' 
      });
    }
    
    const result = await MagicCodeAuthService.sendMagicCode(email);
    
    res.json(result);
    
  } catch (error) {
    console.error('Magic code request error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message || 'Failed to send code' 
    });
  }
});

router.post('/magic-code/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and code are required' 
      });
    }
    
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      return res.status(400).json({ 
        success: false,
        error: 'Code must be 6 digits' 
      });
    }
    
    const result = await MagicCodeAuthService.verifyCode(email, code);
    
    res.json({
      success: true,
      message: 'Login successful',
      ...result
    });
    
  } catch (error) {
    console.error('Magic code verify error:', error);
    res.status(401).json({ 
      success: false,
      error: error.message || 'Invalid or expired code' 
    });
  }
});

module.exports = router;

