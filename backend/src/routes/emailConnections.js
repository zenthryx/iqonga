/**
 * Email Connections API Routes
 * Handles IMAP/SMTP email account connections
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const imapService = require('../services/IMAPService');
const smtpService = require('../services/SMTPService');
const database = require('../database/connection');
const logger = require('../utils/logger');

// GET /api/email-connections/presets - Get email provider presets
router.get('/presets', authenticateToken, async (req, res) => {
  try {
    const presets = await imapService.getProviderPresets();
    
    res.json({
      success: true,
      data: presets
    });
  } catch (error) {
    logger.error('Error fetching email presets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email provider presets'
    });
  }
});

// POST /api/email-connections/test - Test email connection
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const {
      email,
      password,
      provider,
      imapHost,
      imapPort,
      imapSecure,
      smtpHost,
      smtpPort,
      smtpSecure
    } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // If provider preset is specified, get its settings
    let imapConfig = { email, password, imapHost, imapPort, imapSecure };
    let smtpConfig = { email, password, smtpHost, smtpPort, smtpSecure };

    if (provider && provider !== 'custom') {
      const presetsResult = await database.query(
        'SELECT * FROM email_provider_presets WHERE name = $1',
        [provider]
      );

      if (presetsResult.rows.length > 0) {
        const preset = presetsResult.rows[0];
        imapConfig = {
          email,
          password,
          imapHost: preset.imap_host,
          imapPort: preset.imap_port,
          imapSecure: preset.imap_secure
        };
        smtpConfig = {
          email,
          password,
          smtpHost: preset.smtp_host,
          smtpPort: preset.smtp_port,
          smtpSecure: preset.smtp_secure
        };
      }
    }

    // Test IMAP connection
    let imapResult = { success: false, message: 'Not tested' };
    try {
      imapResult = await imapService.testConnection(imapConfig);
    } catch (imapError) {
      imapResult = { success: false, message: imapError.message };
    }

    // Test SMTP connection
    let smtpResult = { success: false, message: 'Not tested' };
    try {
      smtpResult = await smtpService.testConnection(smtpConfig);
    } catch (smtpError) {
      smtpResult = { success: false, message: smtpError.message };
    }

    const overallSuccess = imapResult.success && smtpResult.success;

    res.json({
      success: overallSuccess,
      data: {
        imap: imapResult,
        smtp: smtpResult,
        message: overallSuccess 
          ? 'Both IMAP and SMTP connections successful!'
          : `Connection issues: ${!imapResult.success ? `IMAP: ${imapResult.message}` : ''} ${!smtpResult.success ? `SMTP: ${smtpResult.message}` : ''}`
      }
    });
  } catch (error) {
    logger.error('Error testing email connection:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test connection'
    });
  }
});

// POST /api/email-connections - Add new email connection
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      email,
      password,
      displayName,
      provider,
      imapHost,
      imapPort,
      imapSecure,
      smtpHost,
      smtpPort,
      smtpSecure
    } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Build account config
    let accountConfig = {
      email,
      password,
      displayName,
      provider: provider || 'custom_imap',
      imapHost,
      imapPort: imapPort || 993,
      imapSecure: imapSecure !== false,
      smtpHost,
      smtpPort: smtpPort || 587,
      smtpSecure: smtpSecure !== false
    };

    // If provider preset is specified, use its settings
    if (provider && provider !== 'custom') {
      const presetsResult = await database.query(
        'SELECT * FROM email_provider_presets WHERE name = $1',
        [provider]
      );

      if (presetsResult.rows.length > 0) {
        const preset = presetsResult.rows[0];
        accountConfig = {
          ...accountConfig,
          imapHost: preset.imap_host,
          imapPort: preset.imap_port,
          imapSecure: preset.imap_secure,
          smtpHost: preset.smtp_host,
          smtpPort: preset.smtp_port,
          smtpSecure: preset.smtp_secure
        };
      }
    }

    // Add the account
    const account = await imapService.addAccount(userId, accountConfig);

    // Return success without sensitive data
    res.status(201).json({
      success: true,
      data: {
        id: account.id,
        email_address: account.email_address,
        provider: account.provider,
        display_name: account.display_name,
        connection_status: account.connection_status,
        is_active: account.is_active,
        created_at: account.created_at
      }
    });
  } catch (error) {
    logger.error('Error adding email connection:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add email connection'
    });
  }
});

// GET /api/email-connections - Get user's email connections
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await database.query(`
      SELECT 
        id, user_id, provider, connection_type, email_address, display_name,
        imap_host, imap_port, smtp_host, smtp_port,
        connection_status, is_active, is_primary, sync_enabled,
        last_sync_at, last_imap_check_at, last_smtp_check_at,
        last_connection_error, created_at, updated_at
      FROM user_email_accounts 
      WHERE user_id = $1
      ORDER BY is_primary DESC, created_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching email connections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email connections'
    });
  }
});

// GET /api/email-connections/:id - Get specific email connection
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await database.query(`
      SELECT 
        id, user_id, provider, connection_type, email_address, display_name,
        imap_host, imap_port, smtp_host, smtp_port,
        connection_status, is_active, is_primary, sync_enabled,
        last_sync_at, last_imap_check_at, last_smtp_check_at,
        last_connection_error, created_at, updated_at
      FROM user_email_accounts 
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email connection not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching email connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email connection'
    });
  }
});

// PUT /api/email-connections/:id - Update email connection
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { displayName, syncEnabled, isActive, isPrimary } = req.body;

    // Verify ownership
    const existing = await database.query(
      'SELECT id FROM user_email_accounts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email connection not found'
      });
    }

    // If setting as primary, unset other primary accounts
    if (isPrimary) {
      await database.query(
        'UPDATE user_email_accounts SET is_primary = false WHERE user_id = $1',
        [userId]
      );
    }

    // Update account
    const result = await database.query(`
      UPDATE user_email_accounts SET
        display_name = COALESCE($1, display_name),
        sync_enabled = COALESCE($2, sync_enabled),
        is_active = COALESCE($3, is_active),
        is_primary = COALESCE($4, is_primary),
        updated_at = NOW()
      WHERE id = $5 AND user_id = $6
      RETURNING id, email_address, display_name, is_active, is_primary, sync_enabled
    `, [displayName, syncEnabled, isActive, isPrimary, id, userId]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating email connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update email connection'
    });
  }
});

// DELETE /api/email-connections/:id - Remove email connection
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership and delete
    const result = await database.query(
      'DELETE FROM user_email_accounts WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email connection not found'
      });
    }

    res.json({
      success: true,
      message: 'Email connection removed successfully'
    });
  } catch (error) {
    logger.error('Error removing email connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove email connection'
    });
  }
});

// POST /api/email-connections/:id/sync - Trigger email sync
router.post('/:id/sync', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { 
      folder = 'INBOX', 
      limit = 100,  // Increased default limit
      days = 30     // Default to last 30 days
    } = req.body;

    // Verify ownership
    const existing = await database.query(
      'SELECT * FROM user_email_accounts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email connection not found'
      });
    }

    const account = existing.rows[0];

    // Only sync IMAP accounts
    if (account.connection_type !== 'imap_smtp') {
      return res.status(400).json({
        success: false,
        error: 'This account type does not support IMAP sync. Use Gmail OAuth sync instead.'
      });
    }

    logger.info(`Starting IMAP sync for account ${id}, folder: ${folder}, limit: ${limit}, days: ${days}`);

    // Fetch emails via IMAP (with date filter for recent emails)
    const emails = await imapService.fetchEmails(id, { folder, limit, days });

    logger.info(`Fetched ${emails.length} emails from IMAP`);

    // Sync to database
    const synced = await imapService.syncToDatabase(userId, id, emails);

    logger.info(`Synced ${synced.length} emails to database`);

    res.json({
      success: true,
      data: {
        fetched: emails.length,
        synced: synced.length,
        folder,
        days
      }
    });
  } catch (error) {
    logger.error('Error syncing emails:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync emails'
    });
  }
});

// GET /api/email-connections/:id/folders - Get email folders
router.get('/:id/folders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const existing = await database.query(
      'SELECT * FROM user_email_accounts WHERE id = $1 AND user_id = $2 AND connection_type = $3',
      [id, userId, 'imap_smtp']
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email connection not found or not an IMAP account'
      });
    }

    const folders = await imapService.fetchFolders(id);

    res.json({
      success: true,
      data: folders
    });
  } catch (error) {
    logger.error('Error fetching email folders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch folders'
    });
  }
});

// POST /api/email-connections/:id/send - Send email via SMTP
router.post('/:id/send', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { to, cc, bcc, subject, text, html, attachments } = req.body;

    // Verify ownership
    const existing = await database.query(
      'SELECT * FROM user_email_accounts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email connection not found'
      });
    }

    // Validate required fields
    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        error: 'Recipient (to) and subject are required'
      });
    }

    // Send email
    const result = await smtpService.sendEmail(id, {
      to,
      cc,
      bcc,
      subject,
      text,
      html,
      attachments
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
});

// GET /api/email-connections/:id/messages - Get synced emails for an account
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { 
      folder = 'INBOX', 
      limit = 50, 
      offset = 0,
      search = '',
      category = '',
      unread = false,
      starred = false
    } = req.query;

    // Verify ownership
    const existing = await database.query(
      'SELECT * FROM user_email_accounts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email connection not found'
      });
    }

    // Build query for emails
    let query = `
      SELECT 
        id, provider_message_id, thread_id, subject, 
        from_email, from_name, to_emails, cc_emails,
        body_text, snippet, labels, is_read, is_starred, is_important,
        has_attachments, attachment_count, received_at,
        ai_category, ai_priority, ai_sentiment, ai_summary, ai_action_items
      FROM email_messages 
      WHERE account_id = $1 AND user_id = $2
    `;
    const params = [id, userId];
    let paramIndex = 3;

    // Add filters
    if (search) {
      query += ` AND (subject ILIKE $${paramIndex} OR from_email ILIKE $${paramIndex} OR from_name ILIKE $${paramIndex} OR body_text ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      query += ` AND ai_category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (unread === 'true' || unread === true) {
      query += ` AND is_read = false`;
    }

    if (starred === 'true' || starred === true) {
      query += ` AND is_starred = true`;
    }

    query += ` ORDER BY received_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await database.query(query, params);

    // Get total count
    const countResult = await database.query(
      'SELECT COUNT(*) FROM email_messages WHERE account_id = $1 AND user_id = $2',
      [id, userId]
    );

    // Get unread count
    const unreadResult = await database.query(
      'SELECT COUNT(*) FROM email_messages WHERE account_id = $1 AND user_id = $2 AND is_read = false',
      [id, userId]
    );

    res.json({
      success: true,
      data: {
        emails: result.rows,
        total: parseInt(countResult.rows[0].count),
        unread: parseInt(unreadResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Error fetching emails:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch emails'
    });
  }
});

// GET /api/email-connections/:id/messages/:messageId - Get single email details
router.get('/:id/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, messageId } = req.params;

    // Verify ownership
    const existing = await database.query(
      'SELECT * FROM user_email_accounts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email connection not found'
      });
    }

    // Fetch email
    const result = await database.query(`
      SELECT * FROM email_messages 
      WHERE id = $1 AND account_id = $2 AND user_id = $3
    `, [messageId, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }

    // Mark as read
    await database.query(
      'UPDATE email_messages SET is_read = true WHERE id = $1',
      [messageId]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching email:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch email'
    });
  }
});

// PATCH /api/email-connections/:id/messages/:messageId/read - Mark email as read/unread
router.patch('/:id/messages/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, messageId } = req.params;
    const { is_read } = req.body;

    await database.query(
      'UPDATE email_messages SET is_read = $1 WHERE id = $2 AND account_id = $3 AND user_id = $4',
      [is_read, messageId, id, userId]
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating email read status:', error);
    res.status(500).json({ success: false, error: 'Failed to update email' });
  }
});

// PATCH /api/email-connections/:id/messages/:messageId/star - Star/unstar email
router.patch('/:id/messages/:messageId/star', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, messageId } = req.params;
    const { is_starred } = req.body;

    await database.query(
      'UPDATE email_messages SET is_starred = $1 WHERE id = $2 AND account_id = $3 AND user_id = $4',
      [is_starred, messageId, id, userId]
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating email star status:', error);
    res.status(500).json({ success: false, error: 'Failed to update email' });
  }
});

// POST /api/email-connections/:id/reply - Reply to an email
router.post('/:id/reply', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { messageId, text, html, attachments } = req.body;

    // Verify ownership
    const existing = await database.query(
      'SELECT * FROM user_email_accounts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email connection not found'
      });
    }

    if (!messageId || (!text && !html)) {
      return res.status(400).json({
        success: false,
        error: 'Message ID and reply content are required'
      });
    }

    const result = await smtpService.sendReply(id, messageId, { text, html, attachments });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error sending reply:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send reply'
    });
  }
});

// =============================================================================
// AI Features for Email Connections
// =============================================================================

const AIEmailService = require('../services/AIEmailService');
const CreditService = require('../services/CreditService');
const ServicePricingService = require('../services/ServicePricingService');

const creditService = new CreditService();

// POST /api/email-connections/:id/messages/:messageId/categorize - AI categorize email
router.post('/:id/messages/:messageId/categorize', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, messageId } = req.params;

    // Verify ownership
    const emailResult = await database.query(
      'SELECT em.* FROM email_messages em WHERE em.id = $1 AND em.account_id = $2 AND em.user_id = $3',
      [messageId, id, userId]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }

    // Get pricing and deduct credits (with fallback if pricing not found)
    const creditCost = await ServicePricingService.getPricing('email_categorize');
    const cost = creditCost?.cost || 5;
    try {
      await creditService.deductCredits(userId, 'email_categorize', cost, messageId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: cost
      });
    }

    const analysis = await AIEmailService.categorizeEmail(parseInt(messageId), userId);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Error categorizing email:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to categorize email'
    });
  }
});

// POST /api/email-connections/:id/messages/:messageId/summarize - AI summarize email
router.post('/:id/messages/:messageId/summarize', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, messageId } = req.params;

    // Verify ownership
    const emailResult = await database.query(
      'SELECT em.* FROM email_messages em WHERE em.id = $1 AND em.account_id = $2 AND em.user_id = $3',
      [messageId, id, userId]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }

    // Get pricing and deduct credits (with fallback if pricing not found)
    const creditCost = await ServicePricingService.getPricing('email_summarize');
    const cost = creditCost?.cost || 10;
    try {
      await creditService.deductCredits(userId, 'email_summarize', cost, messageId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: cost
      });
    }

    const summary = await AIEmailService.summarizeEmail(parseInt(messageId), userId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Error summarizing email:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to summarize email'
    });
  }
});

// POST /api/email-connections/:id/messages/:messageId/drafts - Generate AI draft replies
router.post('/:id/messages/:messageId/drafts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, messageId } = req.params;
    const { tone = 'professional' } = req.body;

    // Verify ownership
    const emailResult = await database.query(
      'SELECT em.* FROM email_messages em WHERE em.id = $1 AND em.account_id = $2 AND em.user_id = $3',
      [messageId, id, userId]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }

    // Validate tone
    const validTones = ['professional', 'casual', 'friendly', 'brief'];
    if (!validTones.includes(tone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tone',
        validTones
      });
    }

    // Get pricing and deduct credits (with fallback if pricing not found)
    const creditCost = await ServicePricingService.getPricing('email_draft_reply');
    const cost = creditCost?.cost || 15;
    try {
      await creditService.deductCredits(userId, 'email_draft_reply', cost, messageId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: cost
      });
    }

    const drafts = await AIEmailService.generateDraftReplies(parseInt(messageId), userId, tone);

    res.json({
      success: true,
      data: drafts,
      count: drafts.length
    });
  } catch (error) {
    logger.error('Error generating draft replies:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate drafts'
    });
  }
});

// POST /api/email-connections/:id/messages/:messageId/spam-check - AI spam detection
router.post('/:id/messages/:messageId/spam-check', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, messageId } = req.params;

    // Verify ownership
    const emailResult = await database.query(
      'SELECT em.* FROM email_messages em WHERE em.id = $1 AND em.account_id = $2 AND em.user_id = $3',
      [messageId, id, userId]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }

    // Get pricing and deduct credits (with fallback if pricing not found)
    const creditCost = await ServicePricingService.getPricing('email_spam_check');
    const cost = creditCost?.cost || 3;
    try {
      await creditService.deductCredits(userId, 'email_spam_check', cost, messageId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: cost
      });
    }

    const analysis = await AIEmailService.detectSpam(parseInt(messageId), userId);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Error checking spam:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check spam'
    });
  }
});

// POST /api/email-connections/:id/batch-categorize - Batch categorize uncategorized emails
router.post('/:id/batch-categorize', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { limit = 10 } = req.body;

    // Verify ownership
    const existing = await database.query(
      'SELECT * FROM user_email_accounts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email connection not found'
      });
    }

    // Get uncategorized emails for this account
    const uncategorized = await database.query(
      `SELECT id FROM email_messages 
       WHERE account_id = $1 AND user_id = $2 AND ai_category IS NULL
       ORDER BY received_at DESC
       LIMIT $3`,
      [id, userId, limit]
    );

    if (uncategorized.rows.length === 0) {
      return res.json({
        success: true,
        data: { categorized: 0, message: 'All emails are already categorized' }
      });
    }

    // Get pricing per email (default to 5 credits if not found)
    const creditCost = await ServicePricingService.getPricing('email_categorize');
    const costPerEmail = creditCost?.cost || 5;
    const totalCost = costPerEmail * uncategorized.rows.length;

    // Validate totalCost is a valid number
    if (isNaN(totalCost) || totalCost <= 0) {
      logger.error('Invalid credit cost calculation', { costPerEmail, emailCount: uncategorized.rows.length, totalCost });
      return res.status(500).json({
        success: false,
        error: 'Invalid credit cost calculation'
      });
    }

    // Check if user has enough credits
    try {
      await creditService.deductCredits(userId, 'email_batch_categorize', totalCost, id);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: totalCost,
        emailCount: uncategorized.rows.length
      });
    }

    // Categorize emails
    const results = [];
    const errors = [];

    for (const row of uncategorized.rows) {
      try {
        const analysis = await AIEmailService.categorizeEmail(row.id, userId);
        results.push({ emailId: row.id, category: analysis.category, priority: analysis.priority });
      } catch (error) {
        errors.push({ emailId: row.id, error: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        categorized: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    logger.error('Error in batch categorize:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to batch categorize'
    });
  }
});

// POST /api/email-connections/:id/send - Send a new email
router.post('/:id/send', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { to, cc, bcc, subject, text, html, attachments } = req.body;

    // Verify ownership
    const existing = await database.query(
      'SELECT * FROM user_email_accounts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email connection not found'
      });
    }

    if (!to || (!text && !html)) {
      return res.status(400).json({
        success: false,
        error: 'Recipient (to) and content (text or html) are required'
      });
    }

    const result = await smtpService.sendEmail(id, { to, cc, bcc, subject, text, html, attachments });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
});

// GET /api/email-connections/:id/folders - Get available folders
router.get('/:id/folders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const existing = await database.query(
      'SELECT * FROM user_email_accounts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email connection not found'
      });
    }

    const folders = await imapService.fetchFolders(id);

    res.json({
      success: true,
      data: folders
    });
  } catch (error) {
    logger.error('Error fetching folders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch folders'
    });
  }
});

module.exports = router;

