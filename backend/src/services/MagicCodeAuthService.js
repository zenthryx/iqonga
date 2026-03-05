/**
 * Magic Code Authentication Service
 * Passwordless authentication using 6-digit codes sent via email
 * Similar to Privy's approach - simpler and more secure
 */

const database = require('../database/connection');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

class MagicCodeAuthService {
  constructor() {
    // Email transporter (configure with your SMTP settings)
    // Support both variable naming conventions
    const smtpUser = process.env.SMTP_USERNAME || process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpHost = process.env.SMTP_SERVER || process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
    const smtpFrom = process.env.EMAIL_SENDER || process.env.SMTP_FROM || smtpUser;
    
    // Only create if SMTP is configured
    if (smtpUser && smtpPassword) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });
      console.log('✅ SMTP configured:', { host: smtpHost, port: smtpPort, user: smtpUser });
    } else {
      console.warn('⚠️ SMTP not configured - magic code emails will not be sent');
      this.transporter = null;
    }
    
    this.smtpFrom = smtpFrom;
  }

  /**
   * Generate a 6-digit code
   * @returns {string} 6-digit code
   */
  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send magic code to email
   * @param {string} email - User email
   * @returns {Promise<Object>} Code info (code only returned in dev mode)
   */
  async sendMagicCode(email) {
    try {
      // Validate email
      if (!this.validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Generate 6-digit code
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store code in database
      await database.query(`
        INSERT INTO magic_codes (email, code, expires_at, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (email) 
        DO UPDATE SET 
          code = $2,
          expires_at = $3,
          attempts = 0,
          created_at = NOW()
      `, [email.toLowerCase(), code, expiresAt]);

      // Send email (if SMTP configured)
      if (this.transporter) {
        const mailOptions = {
          from: this.smtpFrom,
          to: email,
          subject: 'Your Iqonga Login Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #6366f1;">Your Login Code</h2>
              <p>Use this code to sign in to your Iqonga account:</p>
              <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <h1 style="color: #6366f1; font-size: 36px; letter-spacing: 8px; margin: 0;">${code}</h1>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                This code expires in 15 minutes. If you didn't request this code, please ignore this email.
              </p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                Best regards,<br>
                Iqonga Team
              </p>
            </div>
          `,
          text: `Your Iqonga login code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this code, please ignore this email.`,
        };

        await this.transporter.sendMail(mailOptions);
        console.log(`✅ Magic code sent to: ${email}`);
      } else {
        console.warn(`⚠️ SMTP not configured - code generated but not sent: ${code}`);
      }

      // Return code in response when: (1) dev mode, or (2) SMTP not configured (so user can still log in)
      const includeCodeInResponse = process.env.NODE_ENV === 'development' || !this.transporter;

      return {
        success: true,
        message: this.transporter ? 'Code sent to your email' : 'Use the code below (SMTP not configured)',
        ...(includeCodeInResponse && { code }),
        expiresIn: '15 minutes',
      };

    } catch (error) {
      console.error('❌ Send magic code error:', error);
      throw error;
    }
  }

  /**
   * Verify magic code and login/register user
   * @param {string} email - User email
   * @param {string} code - 6-digit code
   * @returns {Promise<Object>} JWT token and user data
   */
  async verifyCode(email, code) {
    try {
      // Get code from database
      const result = await database.query(`
        SELECT * FROM magic_codes 
        WHERE email = $1 AND code = $2 AND expires_at > NOW()
      `, [email.toLowerCase(), code]);

      if (result.rows.length === 0) {
        // Increment attempts
        await database.query(`
          UPDATE magic_codes 
          SET attempts = attempts + 1 
          WHERE email = $1
        `, [email.toLowerCase()]);

        throw new Error('Invalid or expired code');
      }

      const codeRecord = result.rows[0];

      // Check if too many attempts
      if (codeRecord.attempts >= 5) {
        throw new Error('Too many failed attempts. Please request a new code.');
      }

      // Check if code is expired
      if (new Date(codeRecord.expires_at) < new Date()) {
        throw new Error('Code has expired. Please request a new code.');
      }

      // Code is valid! Now login or register user
      let userResult = await database.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      let user;

      if (userResult.rows.length === 0) {
        // Create new user
        const insertResult = await database.query(`
          INSERT INTO users (
            email, 
            username, 
            auth_method, 
            email_verified,
            created_at,
            updated_at
          )
          VALUES ($1, $2, 'magic_code', true, NOW(), NOW())
          RETURNING *
        `, [
          email.toLowerCase(),
          email.split('@')[0]
        ]);

        user = insertResult.rows[0];
        console.log(`✅ New user created via magic code: ${email}`);
      } else {
        user = userResult.rows[0];
        console.log(`✅ User logged in via magic code: ${email}`);
      }

      // Delete used code
      await database.query(
        'DELETE FROM magic_codes WHERE email = $1',
        [email.toLowerCase()]
      );

      // Update user's last login
      await database.query(
        'UPDATE users SET updated_at = NOW() WHERE id = $1',
        [user.id]
      );

      // Generate JWT
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          user_tier: user.user_tier || 'standard',
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
          pricing_multiplier: user.pricing_multiplier || 1.20,
        },
      };

    } catch (error) {
      console.error('❌ Verify code error:', error.message);
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

module.exports = new MagicCodeAuthService();

