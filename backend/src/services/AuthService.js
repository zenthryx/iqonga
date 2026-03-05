/**
 * Authentication Service
 * Handles email/password and Google OAuth authentication
 * Migrates Privy users to new authentication system
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const database = require('../database/connection');
const crypto = require('crypto');
const TokenAccessService = require('./TokenAccessService');

class AuthService {
  /**
   * Register new user with email/password
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} username - Optional username
   * @returns {Promise<Object>} Created user
   */
  async register(email, password, username) {
    try {
      // Validate email format
      if (!this.validateEmail(email)) {
        throw new Error('Invalid email format');
      }
      
      // Validate password strength
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      
      // Check if user exists
      const existing = await database.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (existing.rows.length > 0) {
        throw new Error('Email already registered');
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user (user_tier and pricing_multiplier will be added via payment migration)
      const result = await database.query(`
        INSERT INTO users (
          email, 
          username, 
          password_hash, 
          auth_method, 
          email_verified,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, 'email', false, NOW(), NOW())
        RETURNING id, email, username
      `, [
        email.toLowerCase(), 
        username || email.split('@')[0], 
        passwordHash
      ]);
      
      console.log(`✅ New user registered: ${email}`);
      
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Registration error:', error.message);
      throw error;
    }
  }
  
  /**
   * Login with email/password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} JWT token and user data
   */
  async login(email, password) {
    try {
      // Get user
      const result = await database.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Invalid credentials');
      }
      
      const user = result.rows[0];
      
      // Check if user has password (might be Google-only or Privy user)
      if (!user.password_hash) {
        throw new Error('Please use social login or reset your password');
      }
      
      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!validPassword) {
        throw new Error('Invalid credentials');
      }
      
      // Note: last_login_at column doesn't exist yet - can be added later if needed
      // Update updated_at instead
      await database.query(
        'UPDATE users SET updated_at = NOW() WHERE id = $1',
        [user.id]
      );
      
      // Generate JWT
      const token = jwt.sign(
        { 
          userId: user.id,
          email: user.email,
          user_tier: user.user_tier
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );
      
      console.log(`✅ User logged in: ${email}`);
      
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          wallet_address: user.wallet_address,
          user_tier: user.user_tier || 'standard',
          pricing_multiplier: user.pricing_multiplier || 1.20
        }
      };
      
    } catch (error) {
      console.error('❌ Login error:', error.message);
      throw error;
    }
  }
  
  /**
   * Google OAuth login
   * Reuses existing Google OAuth setup from Gmail/Calendar
   * @param {Object} googleUser - Google user data
   * @returns {Promise<Object>} JWT token and user data
   */
  async googleLogin(googleUser) {
    try {
      const { email, name, google_id, email_verified } = googleUser;
      
      if (!email) {
        throw new Error('No email provided by Google');
      }
      
      // Check if user exists
      let result = await database.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      let user;
      
      if (result.rows.length === 0) {
        // Create new user (user_tier and pricing_multiplier will be added via payment migration)
        const insertResult = await database.query(`
          INSERT INTO users (
            email, 
            username, 
            auth_method, 
            email_verified,
            created_at,
            updated_at
          )
          VALUES ($1, $2, 'google', $3, NOW(), NOW())
          RETURNING *
        `, [
          email.toLowerCase(), 
          name || email.split('@')[0],
          email_verified || true
        ]);
        
        user = insertResult.rows[0];
        console.log(`✅ New Google user created: ${email}`);
        
      } else {
        user = result.rows[0];
        
        // Update auth_method if was Privy before (migration)
        if (user.auth_method === 'privy' || user.privy_user_id) {
          await database.query(
            'UPDATE users SET auth_method = $1, email_verified = true WHERE id = $2',
            ['google', user.id]
          );
          console.log(`✅ Migrated Privy user to Google: ${email}`);
        }
        
        // Update last login
        await database.query(
          'UPDATE users SET last_login_at = NOW() WHERE id = $1',
          [user.id]
        );
      }
      
      // Generate JWT
      const token = jwt.sign(
        { 
          userId: user.id,
          email: user.email,
          user_tier: user.user_tier
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );
      
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          wallet_address: user.wallet_address,
          user_tier: user.user_tier || 'standard',
          pricing_multiplier: user.pricing_multiplier || 1.20
        }
      };
      
    } catch (error) {
      console.error('❌ Google login error:', error.message);
      throw error;
    }
  }
  
  /**
   * Migrate Privy user to email/password
   * @param {string} email - User email
   * @param {string} newPassword - New password to set
   * @returns {Promise<Object>} Success status
   */
  async migratePrivyUser(email, newPassword) {
    try {
      // Validate password
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      
      // Find user by email
      const result = await database.query(
        'SELECT * FROM users WHERE email = $1 AND privy_user_id IS NOT NULL',
        [email.toLowerCase()]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Privy user not found. Please contact support.');
      }
      
      const user = result.rows[0];
      
      // Set new password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      await database.query(`
        UPDATE users 
        SET password_hash = $1,
            auth_method = 'email',
            email_verified = true,
            updated_at = NOW()
        WHERE id = $2
      `, [passwordHash, user.id]);
      
      console.log(`✅ Migrated Privy user: ${email}`);
      
      return {
        success: true,
        message: 'Account migrated successfully. You can now login with your email and password.'
      };
      
    } catch (error) {
      console.error('❌ Migration error:', error.message);
      throw error;
    }
  }
  
  /**
   * Check if wallet has 1M+ ZTR tokens and upgrade user tier
   * @param {number} userId - User ID
   * @param {string} walletAddress - Solana wallet address
   * @returns {Promise<Object>} Updated user tier info
   */
  async checkAndUpgradeUserTier(userId, walletAddress) {
    try {
      // Check token balance
      const tokenAccess = await TokenAccessService.checkTokenAccess(walletAddress);
      
      if (tokenAccess.hasAccess && tokenAccess.balance >= 1000000) {
        // Upgrade to token_holder tier (standard pricing, no premium)
        // Note: user_tier and pricing_multiplier columns added via payment migration
        await database.query(`
          UPDATE users 
          SET ztr_balance = $1,
              token_tier = $2,
              wallet_address = $3
          WHERE id = $4
        `, [
          tokenAccess.balance,
          tokenAccess.tier,
          walletAddress,
          userId
        ]);
        
        // Try to update user_tier and pricing_multiplier if columns exist
        try {
          await database.query(`
            UPDATE users 
            SET user_tier = 'token_holder',
                pricing_multiplier = 1.00
            WHERE id = $1
          `, [userId]);
        } catch (e) {
          // Columns don't exist yet - will be added via payment migration
          console.log('Note: user_tier and pricing_multiplier columns will be added via payment migration');
        }
        
        console.log(`✅ Upgraded user ${userId} to token_holder tier`);
        
        return {
          upgraded: true,
          user_tier: 'token_holder',
          pricing_multiplier: 1.00,
          ztr_balance: tokenAccess.balance,
          token_tier: tokenAccess.tier
        };
      }
      
      return {
        upgraded: false,
        user_tier: 'standard',
        pricing_multiplier: 1.20,
        message: 'Hold 1M+ ZTR tokens to get standard pricing'
      };
      
    } catch (error) {
      console.error('❌ Tier check error:', error.message);
      throw error;
    }
  }
  
  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<Object>} Reset token (in production, send via email)
   */
  async requestPasswordReset(email) {
    try {
      const result = await database.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (result.rows.length === 0) {
        // Don't reveal if email exists
        return { 
          success: true, 
          message: 'If the email exists, a reset link has been sent.' 
        };
      }
      
      const user = result.rows[0];
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour
      
      await database.query(`
        UPDATE users 
        SET reset_token = $1,
            reset_token_expires = $2
        WHERE id = $3
      `, [resetToken, resetTokenExpires, user.id]);
      
      console.log(`✅ Password reset requested for: ${email}`);
      console.log(`Reset token: ${resetToken} (expires in 1 hour)`);
      
      // TODO: Send email with reset link
      // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      return {
        success: true,
        message: 'Password reset link sent to your email.',
        // In development, return token directly
        ...(process.env.NODE_ENV === 'development' && { resetToken })
      };
      
    } catch (error) {
      console.error('❌ Password reset error:', error.message);
      throw error;
    }
  }
  
  /**
   * Reset password using token
   * @param {string} resetToken - Password reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Success status
   */
  async resetPassword(resetToken, newPassword) {
    try {
      // Validate password
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      
      // Find user with valid reset token
      const result = await database.query(`
        SELECT id FROM users 
        WHERE reset_token = $1 
        AND reset_token_expires > NOW()
      `, [resetToken]);
      
      if (result.rows.length === 0) {
        throw new Error('Invalid or expired reset token');
      }
      
      const user = result.rows[0];
      
      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      // Update password and clear reset token
      await database.query(`
        UPDATE users 
        SET password_hash = $1,
            reset_token = NULL,
            reset_token_expires = NULL,
            updated_at = NOW()
        WHERE id = $2
      `, [passwordHash, user.id]);
      
      console.log(`✅ Password reset successful for user ${user.id}`);
      
      return {
        success: true,
        message: 'Password reset successful. You can now login with your new password.'
      };
      
    } catch (error) {
      console.error('❌ Password reset error:', error.message);
      throw error;
    }
  }
  
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = new AuthService();

