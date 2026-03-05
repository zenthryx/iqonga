/**
 * Gmail Quick Actions API Routes
 * Handles Archive, Star, Mark Read/Unread actions
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const database = require('../database/connection');
const GmailService = require('../services/GmailService');
const logger = require('../utils/logger');

/**
 * Archive email (remove from INBOX)
 * POST /api/gmail/actions/archive/:id
 */
router.post('/archive/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get email from database
    const emailResult = await database.query(
      'SELECT * FROM email_messages WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];

    // Get user's Gmail account
    const accountResult = await database.query(
      'SELECT * FROM user_email_accounts WHERE user_id = $1 AND provider = $2 AND is_active = true',
      [req.user.userId, 'gmail']
    );

    if (accountResult.rows.length === 0) {
      return res.status(400).json({ error: 'Gmail account not connected' });
    }

    const account = accountResult.rows[0];

    // Remove INBOX label from Gmail
    const oauth2Client = GmailService.createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token
    });

    const { google } = require('googleapis');
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    await gmail.users.messages.modify({
      userId: 'me',
      id: email.provider_message_id,
      requestBody: {
        removeLabelIds: ['INBOX']
      }
    });

    // Update database
    await database.query(
      'UPDATE email_messages SET labels = array_remove(labels, $1), updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['INBOX', id]
    );

    logger.info('Email archived successfully', { userId: req.user.userId, emailId: id });

    res.json({
      success: true,
      message: 'Email archived successfully'
    });

  } catch (error) {
    logger.error('Error archiving email:', error);
    res.status(500).json({ 
      error: 'Failed to archive email', 
      details: error.message 
    });
  }
});

/**
 * Toggle star on email
 * POST /api/gmail/actions/star/:id
 */
router.post('/star/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get email from database
    const emailResult = await database.query(
      'SELECT * FROM email_messages WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];
    const isStarred = email.is_starred;

    // Get user's Gmail account
    const accountResult = await database.query(
      'SELECT * FROM user_email_accounts WHERE user_id = $1 AND provider = $2 AND is_active = true',
      [req.user.userId, 'gmail']
    );

    if (accountResult.rows.length === 0) {
      return res.status(400).json({ error: 'Gmail account not connected' });
    }

    const account = accountResult.rows[0];

    // Toggle star in Gmail
    const oauth2Client = GmailService.createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token
    });

    const { google } = require('googleapis');
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    if (isStarred) {
      // Remove star
      await gmail.users.messages.modify({
        userId: 'me',
        id: email.provider_message_id,
        requestBody: {
          removeLabelIds: ['STARRED']
        }
      });
    } else {
      // Add star
      await gmail.users.messages.modify({
        userId: 'me',
        id: email.provider_message_id,
        requestBody: {
          addLabelIds: ['STARRED']
        }
      });
    }

    // Update database
    await database.query(
      'UPDATE email_messages SET is_starred = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [!isStarred, id]
    );

    logger.info('Email star toggled', { userId: req.user.userId, emailId: id, isStarred: !isStarred });

    res.json({
      success: true,
      message: isStarred ? 'Star removed' : 'Star added',
      isStarred: !isStarred
    });

  } catch (error) {
    logger.error('Error toggling star:', error);
    res.status(500).json({ 
      error: 'Failed to toggle star', 
      details: error.message 
    });
  }
});

/**
 * Mark email as read/unread
 * POST /api/gmail/actions/read/:id
 */
router.post('/read/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_read } = req.body;

    // Get email from database
    const emailResult = await database.query(
      'SELECT * FROM email_messages WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];

    // Get user's Gmail account
    const accountResult = await database.query(
      'SELECT * FROM user_email_accounts WHERE user_id = $1 AND provider = $2 AND is_active = true',
      [req.user.userId, 'gmail']
    );

    if (accountResult.rows.length === 0) {
      return res.status(400).json({ error: 'Gmail account not connected' });
    }

    const account = accountResult.rows[0];

    // Update read status in Gmail
    const oauth2Client = GmailService.createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token
    });

    const { google } = require('googleapis');
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    if (is_read) {
      // Mark as read (remove UNREAD label)
      await gmail.users.messages.modify({
        userId: 'me',
        id: email.provider_message_id,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });
    } else {
      // Mark as unread (add UNREAD label)
      await gmail.users.messages.modify({
        userId: 'me',
        id: email.provider_message_id,
        requestBody: {
          addLabelIds: ['UNREAD']
        }
      });
    }

    // Update database
    await database.query(
      'UPDATE email_messages SET is_read = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [is_read, id]
    );

    logger.info('Email read status updated', { userId: req.user.userId, emailId: id, isRead: is_read });

    res.json({
      success: true,
      message: is_read ? 'Marked as read' : 'Marked as unread',
      is_read
    });

  } catch (error) {
    logger.error('Error updating read status:', error);
    res.status(500).json({ 
      error: 'Failed to update read status', 
      details: error.message 
    });
  }
});

module.exports = router;

