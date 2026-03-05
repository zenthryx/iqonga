const { google } = require('googleapis');
const axios = require('axios');
const logger = require('../utils/logger');
const database = require('../database/connection');

class GmailService {
  constructor() {
    // Support both service-specific and shared Google OAuth credentials
    this.clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.GMAIL_REDIRECT_URI || 'https://www.iqonga.org/api/gmail/auth/callback';
    
    // Gmail API scopes
    this.scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];
  }

  /**
   * Create OAuth2 client
   */
  createOAuth2Client() {
    // Always use fresh env vars in case they changed
    const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GMAIL_REDIRECT_URI || 'https://www.iqonga.org/api/gmail/auth/callback';
    
    if (!clientId || !clientSecret) {
      throw new Error('Gmail OAuth credentials not configured. Please set GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET or GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in .env');
    }
    
    return new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(state) {
    const oauth2Client = this.createOAuth2Client();
    
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      state: state,
      prompt: 'consent' // Force consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code) {
    try {
      const oauth2Client = this.createOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);
      
      return tokens;
    } catch (error) {
      logger.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Get user info from Gmail API
   */
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error getting user info:', error);
      throw new Error('Failed to get user information');
    }
  }

  /**
   * Initialize Gmail API client with user credentials
   */
  async initializeForUser(userId) {
    try {
      // Get user's Gmail account from database
      const result = await database.query(
        'SELECT * FROM user_email_accounts WHERE user_id = $1 AND provider = $2 AND is_active = true',
        [userId, 'gmail']
      );

      if (result.rows.length === 0) {
        throw new Error('No active Gmail account found for user');
      }

      const account = result.rows[0];
      
      // Check if token is expired and refresh if needed
      if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
        logger.info('Access token expired, refreshing...', { userId, accountId: account.id });
        await this.refreshAccessToken(account.id, account.refresh_token);
        
        // Re-fetch account with new token
        const refreshedResult = await database.query(
          'SELECT * FROM user_email_accounts WHERE id = $1',
          [account.id]
        );
        return refreshedResult.rows[0];
      }

      return account;
    } catch (error) {
      logger.error('Failed to initialize Gmail for user:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(accountId, refreshToken) {
    try {
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Calculate expiry time (expiry_date is timestamp in ms, or default to 1 hour)
      const expiryDate = credentials.expiry_date 
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600000); // 1 hour from now
      
      // Update tokens in database
      await database.query(
        `UPDATE user_email_accounts 
         SET access_token = $1, 
             token_expires_at = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [
          credentials.access_token,
          expiryDate,
          accountId
        ]
      );

      logger.info('Access token refreshed successfully', { accountId });
      return credentials.access_token;
    } catch (error) {
      logger.error('Failed to refresh access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Sync emails from Gmail for a user
   */
  async syncEmailsForUser(userId, maxResults = 100) {
    try {
      const account = await this.initializeForUser(userId);
      
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({
        access_token: account.access_token
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Get list of messages
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults: maxResults,
        q: 'in:inbox' // Start with inbox only
      });

      if (!listResponse.data.messages) {
        logger.info('No messages found', { userId, accountId: account.id });
        return { synced: 0, failed: 0 };
      }

      let synced = 0;
      let failed = 0;

      // Fetch and store each message
      for (const message of listResponse.data.messages) {
        try {
          await this.fetchAndStoreMessage(userId, account.id, gmail, message.id);
          synced++;
        } catch (error) {
          logger.error('Failed to fetch message:', { messageId: message.id, error });
          failed++;
        }
      }

      // Update last sync time
      await database.query(
        'UPDATE user_email_accounts SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1',
        [account.id]
      );

      logger.info('Email sync completed', { userId, accountId: account.id, synced, failed });
      return { synced, failed };
    } catch (error) {
      logger.error('Failed to sync emails for user:', error);
      throw error;
    }
  }

  /**
   * Fetch and store a single message
   */
  async fetchAndStoreMessage(userId, accountId, gmail, messageId) {
    try {
      const messageResponse = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = messageResponse.data;
      const headers = message.payload.headers;

      // Extract header values
      const getHeader = (name) => {
        const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return header ? header.value : null;
      };

      const subject = getHeader('Subject');
      const from = getHeader('From');
      const to = getHeader('To');
      const cc = getHeader('Cc');
      const bcc = getHeader('Bcc');
      const date = getHeader('Date');

      // Parse from email
      const fromMatch = from?.match(/<(.+)>/);
      const fromEmail = fromMatch ? fromMatch[1] : from;
      const fromName = from?.replace(/<.+>/, '').trim();

      // Parse recipients
      const parseEmails = (str) => {
        if (!str) return [];
        return str.split(',').map(email => {
          const match = email.match(/<(.+)>/);
          return match ? match[1] : email.trim();
        });
      };

      // Get email body
      const { text, html } = this.extractEmailBody(message.payload);

      // Get snippet
      const snippet = message.snippet;

      // Get labels
      const labels = message.labelIds || [];

      // Check if read
      const isRead = !labels.includes('UNREAD');
      const isStarred = labels.includes('STARRED');
      const isImportant = labels.includes('IMPORTANT');
      const isSpam = labels.includes('SPAM');

      // Count attachments
      const attachmentCount = this.countAttachments(message.payload);
      const hasAttachments = attachmentCount > 0;

      // Store in database
      const insertResult = await database.query(
        `INSERT INTO email_messages (
          account_id, user_id, provider_message_id, thread_id,
          subject, from_email, from_name, 
          to_emails, cc_emails, bcc_emails,
          body_text, body_html, snippet,
          labels, is_read, is_starred, is_important, is_spam,
          has_attachments, attachment_count,
          received_at, sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        ON CONFLICT (account_id, provider_message_id) 
        DO UPDATE SET
          is_read = EXCLUDED.is_read,
          is_starred = EXCLUDED.is_starred,
          labels = EXCLUDED.labels,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id`,
        [
          accountId, userId, messageId, message.threadId,
          subject, fromEmail, fromName,
          parseEmails(to), parseEmails(cc), parseEmails(bcc),
          text, html, snippet,
          labels, isRead, isStarred, isImportant, isSpam,
          hasAttachments, attachmentCount,
          new Date(parseInt(message.internalDate)), new Date(date)
        ]
      );

      logger.info('Message stored successfully', { 
        messageId, 
        emailMessageId: insertResult.rows[0].id 
      });

      return insertResult.rows[0].id;
    } catch (error) {
      logger.error('Failed to fetch and store message:', { messageId, error });
      throw error;
    }
  }

  /**
   * Extract email body from message payload
   */
  extractEmailBody(payload) {
    let text = '';
    let html = '';

    const getPart = (part, mimeType) => {
      if (part.mimeType === mimeType && part.body.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }

      if (part.parts) {
        for (const subPart of part.parts) {
          const result = getPart(subPart, mimeType);
          if (result) return result;
        }
      }

      return null;
    };

    text = getPart(payload, 'text/plain') || '';
    html = getPart(payload, 'text/html') || '';

    return { text, html };
  }

  /**
   * Count attachments in message
   */
  countAttachments(payload) {
    let count = 0;

    const countParts = (part) => {
      if (part.filename && part.filename.length > 0) {
        count++;
      }

      if (part.parts) {
        part.parts.forEach(countParts);
      }
    };

    countParts(payload);
    return count;
  }

  /**
   * Send an email (or reply)
   * @param {number} userId - User ID
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.body - Plain text body
   * @param {string} options.html - HTML body
   * @param {string} [options.threadId] - Thread ID for replies
   * @param {string} [options.inReplyTo] - Message ID being replied to
   * @param {string} [options.references] - References header for threading
   * @param {string} [options.cc] - CC recipients
   * @param {string} [options.bcc] - BCC recipients
   * @returns {Promise<Object>} Sent message data
   */
  async sendEmail(userId, { to, subject, body, html, threadId, inReplyTo, references, cc, bcc }) {
    try {
      const account = await this.initializeForUser(userId);
      
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({
        access_token: account.access_token
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Create email message
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const messageParts = [
        `From: ${account.email_address}`,
        `To: ${to}`,
        ...(cc ? [`Cc: ${cc}`] : []),
        ...(bcc ? [`Bcc: ${bcc}`] : []),
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`] : []),
        ...(references ? [`References: ${references}`] : []),
        '',
        html || body
      ];

      const message = messageParts.join('\n');
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const requestBody = {
        raw: encodedMessage
      };

      // If threadId is provided, include it for proper threading
      if (threadId) {
        requestBody.threadId = threadId;
      }

      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody
      });

      logger.info('Email sent successfully', { 
        userId, 
        accountId: account.id, 
        messageId: result.data.id,
        isReply: !!threadId 
      });
      
      return result.data;
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Delete email (move to trash)
   * @param {number} userId - User ID
   * @param {number} emailId - Email message ID from database
   * @returns {Promise<Object>} Result
   */
  async deleteEmail(userId, emailId) {
    try {
      // Get email message
      const emailResult = await database.query(
        'SELECT * FROM email_messages WHERE id = $1 AND user_id = $2',
        [emailId, userId]
      );

      if (emailResult.rows.length === 0) {
        throw new Error('Email not found');
      }

      const email = emailResult.rows[0];
      
      // Initialize Gmail API
      const account = await this.initializeForUser(userId);
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({
        access_token: account.access_token
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Move to trash in Gmail (soft delete)
      await gmail.users.messages.trash({
        userId: 'me',
        id: email.provider_message_id
      });

      // Update database
      await database.query(
        'UPDATE email_messages SET is_spam = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [emailId]
      );

      logger.info('Email moved to trash', { userId, emailId, messageId: email.provider_message_id });
      return { success: true, message: 'Email moved to trash' };
    } catch (error) {
      logger.error('Failed to delete email:', error);
      throw error;
    }
  }

  /**
   * Get messages for user with pagination
   */
  async getMessages(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        category = 'all',
        search = '',
        isRead = null,
        isStarred = null
      } = options;

      const offset = (page - 1) * limit;

      // Get user's Gmail account
      const accountResult = await database.query(
        'SELECT id FROM user_email_accounts WHERE user_id = $1 AND provider = $2 AND is_active = true',
        [userId, 'gmail']
      );

      if (accountResult.rows.length === 0) {
        return { messages: [], total: 0, page, limit };
      }

      const accountId = accountResult.rows[0].id;

      // Build query
      let query = 'SELECT * FROM email_messages WHERE account_id = $1';
      const params = [accountId];
      let paramIndex = 2;

      // Add filters
      if (category && category !== 'all') {
        query += ` AND ai_category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      if (search) {
        query += ` AND (subject ILIKE $${paramIndex} OR from_email ILIKE $${paramIndex} OR body_text ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (isRead !== null) {
        query += ` AND is_read = $${paramIndex}`;
        params.push(isRead);
        paramIndex++;
      }

      if (isStarred !== null) {
        query += ` AND is_starred = $${paramIndex}`;
        params.push(isStarred);
        paramIndex++;
      }

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
      const countResult = await database.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Add pagination
      query += ` ORDER BY received_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      // Get messages
      const result = await database.query(query, params);

      return {
        messages: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Failed to get messages:', error);
      throw error;
    }
  }
}

module.exports = new GmailService();

