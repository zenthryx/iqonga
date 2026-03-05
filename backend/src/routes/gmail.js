const express = require('express');
const jwt = require('jsonwebtoken');
const database = require('../database/connection');
const logger = require('../utils/logger');
const GmailService = require('../services/GmailService');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');

const router = express.Router();

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

/**
 * Get inbox statistics
 * GET /api/gmail/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Get user's Gmail account
    const accountResult = await database.query(
      'SELECT id FROM user_email_accounts WHERE user_id = $1 AND provider = $2 AND is_active = true',
      [req.user.userId, 'gmail']
    );

    if (accountResult.rows.length === 0) {
      return res.json({
        totalEmails: 0,
        unreadEmails: 0,
        starredEmails: 0,
        categories: {}
      });
    }

    const accountId = accountResult.rows[0].id;

    // Get counts
    const totalResult = await database.query(
      'SELECT COUNT(*) FROM email_messages WHERE account_id = $1',
      [accountId]
    );

    const unreadResult = await database.query(
      'SELECT COUNT(*) FROM email_messages WHERE account_id = $1 AND is_read = false',
      [accountId]
    );

    const starredResult = await database.query(
      'SELECT COUNT(*) FROM email_messages WHERE account_id = $1 AND is_starred = true',
      [accountId]
    );

    // Get category counts
    const categoriesResult = await database.query(
      `SELECT ai_category, COUNT(*) as count 
       FROM email_messages 
       WHERE account_id = $1 AND ai_category IS NOT NULL 
       GROUP BY ai_category`,
      [accountId]
    );

    const categories = {};
    categoriesResult.rows.forEach(row => {
      categories[row.ai_category] = parseInt(row.count);
    });

    res.json({
      totalEmails: parseInt(totalResult.rows[0].count),
      unreadEmails: parseInt(unreadResult.rows[0].count),
      starredEmails: parseInt(starredResult.rows[0].count),
      categories
    });

  } catch (error) {
    logger.error('Error fetching Gmail stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * Get emails with filters and pagination
 * GET /api/gmail/messages
 */
router.get('/messages', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category = 'all',
      search = '',
      isRead,
      isStarred
    } = req.query;

    const result = await GmailService.getMessages(req.user.userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      search,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : null,
      isStarred: isStarred === 'true' ? true : isStarred === 'false' ? false : null
    });

    res.json(result);

  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * Get single email by ID (handles both internal ID and Gmail message ID)
 * GET /api/gmail/messages/:id
 */
router.get('/messages/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    let result;
    
    // Check if ID is numeric (internal database ID) or string (Gmail provider_message_id)
    if (!isNaN(id) && Number.isInteger(Number(id))) {
      // Internal database ID
      result = await database.query(
        `SELECT em.*, uea.email_address as account_email 
         FROM email_messages em
         JOIN user_email_accounts uea ON em.account_id = uea.id
         WHERE em.id = $1 AND em.user_id = $2`,
        [parseInt(id), req.user.userId]
      );
    } else {
      // Gmail provider_message_id (string)
      result = await database.query(
        `SELECT em.*, uea.email_address as account_email 
         FROM email_messages em
         JOIN user_email_accounts uea ON em.account_id = uea.id
         WHERE em.provider_message_id = $1 AND em.user_id = $2`,
        [id, req.user.userId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    logger.error('Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

/**
 * Mark email as read/unread
 * PATCH /api/gmail/messages/:id/read
 */
router.patch('/messages/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isRead } = req.body;

    const result = await database.query(
      'UPDATE email_messages SET is_read = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
      [isRead, id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true, message: result.rows[0] });

  } catch (error) {
    logger.error('Error updating message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

/**
 * Star/unstar email
 * PATCH /api/gmail/messages/:id/star
 */
router.patch('/messages/:id/star', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isStarred } = req.body;

    const result = await database.query(
      'UPDATE email_messages SET is_starred = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
      [isStarred, id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true, message: result.rows[0] });

  } catch (error) {
    logger.error('Error updating message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

/**
 * Delete email (move to trash)
 * DELETE /api/gmail/messages/:id
 */
router.delete('/messages/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Use GmailService to move to trash in Gmail and update database
    const result = await GmailService.deleteEmail(req.user.userId, parseInt(id));

    res.json({ 
      success: true, 
      message: 'Email moved to trash successfully' 
    });

  } catch (error) {
    logger.error('Error deleting message:', error);
    res.status(500).json({ 
      error: 'Failed to delete message', 
      details: error.message 
    });
  }
});

/**
 * Send email (requires ZTR tokens)
 * POST /api/gmail/send
 */
router.post('/send', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const { to, subject, body, html } = req.body;

    if (!to || !subject || (!body && !html)) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, and body/html' });
    }

    const result = await GmailService.sendEmail(req.user.userId, {
      to,
      subject,
      body,
      html
    });

    res.json({
      success: true,
      messageId: result.id,
      message: 'Email sent successfully'
    });

  } catch (error) {
    logger.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

/**
 * Get email contacts
 * GET /api/gmail/contacts
 */
router.get('/contacts', authenticateToken, async (req, res) => {
  try {
    const { search = '', limit = 50 } = req.query;

    let query = `
      SELECT * FROM email_contacts 
      WHERE user_id = $1
    `;
    const params = [req.user.userId];

    if (search) {
      query += ` AND (email_address ILIKE $2 OR display_name ILIKE $2)`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY email_count DESC, last_email_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await database.query(query, params);

    res.json({
      contacts: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    logger.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

/**
 * Get draft replies for an email
 * GET /api/gmail/messages/:id/drafts
 */
router.get('/messages/:id/drafts', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await database.query(
      `SELECT * FROM email_draft_replies 
       WHERE message_id = $1 AND user_id = $2 
       ORDER BY confidence_score DESC, created_at DESC`,
      [id, req.user.userId]
    );

    res.json({
      drafts: result.rows
    });

  } catch (error) {
    logger.error('Error fetching draft replies:', error);
    res.status(500).json({ error: 'Failed to fetch draft replies' });
  }
});

module.exports = router;

