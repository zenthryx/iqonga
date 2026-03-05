const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const database = require('../database/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');
const WhatsAppService = require('../services/WhatsAppService');
const WhatsAppContactService = require('../services/WhatsAppContactService');
const WhatsAppTemplateService = require('../services/WhatsAppTemplateService');
const WhatsAppCampaignService = require('../services/WhatsAppCampaignService');
const WhatsAppBotService = require('../services/WhatsAppBotService');

/**
 * WhatsApp Business API Routes
 * Phase 1: Account Management & Basic Messaging
 */

// ====================================
// ACCOUNT MANAGEMENT
// ====================================

/**
 * Connect WhatsApp Business Account
 * POST /api/whatsapp/accounts
 */
router.post('/accounts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      wabaId,
      phoneNumberId,
      phoneNumber,
      accessToken,
      appId,
      appSecret,
      companyProfileId
    } = req.body;

    // Validate required fields
    if (!wabaId || !phoneNumberId || !phoneNumber || !accessToken) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['wabaId', 'phoneNumberId', 'phoneNumber', 'accessToken']
      });
    }

    // Encrypt sensitive data
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedAppSecret = appSecret ? encrypt(appSecret) : null;

    // Check if account already exists
    const existingResult = await database.query(
      'SELECT id FROM whatsapp_business_accounts WHERE user_id = $1 AND phone_number_id = $2',
      [userId, phoneNumberId]
    );

    let accountId;
    if (existingResult.rows.length > 0) {
      // Update existing account
      accountId = existingResult.rows[0].id;
      await database.query(
        `UPDATE whatsapp_business_accounts 
         SET waba_id = $1,
             phone_number = $2,
             access_token = $3,
             app_id = $4,
             app_secret = $5,
             company_profile_id = $6,
             status = 'active',
             updated_at = NOW()
         WHERE id = $7`,
        [wabaId, phoneNumber, encryptedAccessToken, appId, encryptedAppSecret, companyProfileId, accountId]
      );
    } else {
      // Create new account
      const result = await database.query(
        `INSERT INTO whatsapp_business_accounts 
         (user_id, company_profile_id, waba_id, phone_number_id, phone_number, access_token, app_id, app_secret, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
         RETURNING id`,
        [userId, companyProfileId, wabaId, phoneNumberId, phoneNumber, encryptedAccessToken, appId, encryptedAppSecret]
      );
      accountId = result.rows[0].id;
    }

    // Get account details
    const accountResult = await database.query(
      'SELECT id, waba_id, phone_number_id, phone_number, status, created_at, updated_at FROM whatsapp_business_accounts WHERE id = $1',
      [accountId]
    );

    res.json({
      success: true,
      account: accountResult.rows[0]
    });
  } catch (error) {
    logger.error('Error connecting WhatsApp account:', error);
    res.status(500).json({ error: 'Failed to connect WhatsApp account' });
  }
});

/**
 * List WhatsApp Business Accounts
 * GET /api/whatsapp/accounts
 */
router.get('/accounts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await database.query(
      `SELECT id, waba_id, phone_number_id, phone_number, status, webhook_verified, created_at, updated_at
       FROM whatsapp_business_accounts 
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      accounts: result.rows
    });
  } catch (error) {
    logger.error('Error fetching WhatsApp accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

/**
 * Get WhatsApp Business Account
 * GET /api/whatsapp/accounts/:id
 */
router.get('/accounts/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;

    const result = await database.query(
      `SELECT id, waba_id, phone_number_id, phone_number, status, webhook_verified, webhook_url, created_at, updated_at
       FROM whatsapp_business_accounts 
       WHERE id = $1 AND user_id = $2`,
      [accountId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      success: true,
      account: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching WhatsApp account:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

/**
 * Update WhatsApp Business Account
 * PUT /api/whatsapp/accounts/:id
 */
router.put('/accounts/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;
    const { accessToken, appSecret, webhookUrl, status } = req.body;

    // Check ownership
    const checkResult = await database.query(
      'SELECT id FROM whatsapp_business_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (accessToken) {
      updates.push(`access_token = $${paramCount++}`);
      values.push(encrypt(accessToken));
    }

    if (appSecret) {
      updates.push(`app_secret = $${paramCount++}`);
      values.push(encrypt(appSecret));
    }

    if (webhookUrl !== undefined) {
      updates.push(`webhook_url = $${paramCount++}`);
      values.push(webhookUrl);
    }

    if (status) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(accountId);
    values.push(userId);

    await database.query(
      `UPDATE whatsapp_business_accounts 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount++} AND user_id = $${paramCount++}`,
      values
    );

    // Get updated account
    const accountResult = await database.query(
      'SELECT id, waba_id, phone_number_id, phone_number, status, webhook_verified, webhook_url, updated_at FROM whatsapp_business_accounts WHERE id = $1',
      [accountId]
    );

    res.json({
      success: true,
      account: accountResult.rows[0]
    });
  } catch (error) {
    logger.error('Error updating WhatsApp account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

/**
 * Delete/Disconnect WhatsApp Business Account
 * DELETE /api/whatsapp/accounts/:id
 */
router.delete('/accounts/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;

    // Check ownership
    const checkResult = await database.query(
      'SELECT id FROM whatsapp_business_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Soft delete (set status to inactive)
    await database.query(
      'UPDATE whatsapp_business_accounts SET status = $1, updated_at = NOW() WHERE id = $2',
      ['inactive', accountId]
    );

    res.json({
      success: true,
      message: 'Account disconnected successfully'
    });
  } catch (error) {
    logger.error('Error disconnecting WhatsApp account:', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

/**
 * Verify Phone Number
 * POST /api/whatsapp/accounts/:id/verify
 */
router.post('/accounts/:id/verify', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;
    const { code } = req.body;

    // Check ownership
    const accountResult = await database.query(
      'SELECT id, phone_number_id FROM whatsapp_business_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // TODO: Implement phone number verification with WhatsApp API
    // For now, just return success
    res.json({
      success: true,
      message: 'Phone number verification initiated'
    });
  } catch (error) {
    logger.error('Error verifying phone number:', error);
    res.status(500).json({ error: 'Failed to verify phone number' });
  }
});

// ====================================
// MESSAGING
// ====================================

/**
 * Send Text Message
 * POST /api/whatsapp/messages
 */
router.post('/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountId, to, message, previewUrl } = req.body;

    if (!accountId || !to || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['accountId', 'to', 'message']
      });
    }

    // Check account ownership
    const accountResult = await database.query(
      'SELECT id, phone_number_id FROM whatsapp_business_accounts WHERE id = $1 AND user_id = $2 AND status = $3',
      [accountId, userId, 'active']
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found or inactive' });
    }

    const phoneNumberId = accountResult.rows[0].phone_number_id;

    // Send message
    const response = await WhatsAppService.sendTextMessage(
      accountId,
      to,
      message,
      { previewUrl, userId }
    );

    res.json({
      success: true,
      message: response
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

/**
 * Get Messages
 * GET /api/whatsapp/messages
 */
router.get('/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountId, contactId, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT m.id, m.wamid, m.direction, m.message_type, m.text_content, 
             m.media_url, m.media_id, m.caption, m.status, m.sent_at, 
             m.delivered_at, m.read_at, m.created_at,
             c.phone_number, c.name as contact_name
      FROM whatsapp_messages m
      LEFT JOIN whatsapp_contacts c ON m.contact_id = c.id
      WHERE m.user_id = $1
    `;
    const params = [userId];
    let paramCount = 1;

    if (accountId) {
      paramCount++;
      query += ` AND m.waba_id = $${paramCount}`;
      params.push(accountId);
    }

    if (contactId) {
      paramCount++;
      query += ` AND m.contact_id = $${paramCount}`;
      params.push(contactId);
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await database.query(query, params);

    res.json({
      success: true,
      messages: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * Get Conversations
 * GET /api/whatsapp/conversations
 */
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountId, status = 'open', limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT c.id, c.phone_number, c.status, c.unread_count, 
             c.last_message_at, c.last_message_preview, c.created_at, c.updated_at,
             contact.name as contact_name, contact.profile_name,
             account.phone_number as account_phone
      FROM whatsapp_conversations c
      LEFT JOIN whatsapp_contacts contact ON c.contact_id = contact.id
      LEFT JOIN whatsapp_business_accounts account ON c.waba_id = account.id
      WHERE c.user_id = $1
    `;
    const params = [userId];
    let paramCount = 1;

    if (accountId) {
      paramCount++;
      query += ` AND c.waba_id = $${paramCount}`;
      params.push(accountId);
    }

    if (status) {
      paramCount++;
      query += ` AND c.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY c.last_message_at DESC NULLS LAST LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await database.query(query, params);

    res.json({
      success: true,
      conversations: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// ====================================
// CONTACT MANAGEMENT
// ====================================

/**
 * Create Contact
 * POST /api/whatsapp/contacts
 */
router.post('/contacts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { wabaId, phoneNumber, name, tags, customFields } = req.body;

    if (!wabaId || !phoneNumber) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['wabaId', 'phoneNumber']
      });
    }

    // Check account ownership
    const accountCheck = await database.query(
      'SELECT id FROM whatsapp_business_accounts WHERE id = $1 AND user_id = $2',
      [wabaId, userId]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'WhatsApp account not found' });
    }

    const contact = await WhatsAppContactService.createOrUpdateContact(userId, wabaId, {
      phoneNumber,
      name,
      tags: tags || [],
      customFields: customFields || {}
    });

    res.json({
      success: true,
      contact
    });
  } catch (error) {
    logger.error('Error creating contact:', error);
    res.status(500).json({ error: error.message || 'Failed to create contact' });
  }
});

/**
 * Get Contacts
 * GET /api/whatsapp/contacts
 */
router.get('/contacts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      wabaId,
      search,
      tags,
      isOptedIn,
      groupId,
      limit = 50,
      offset = 0
    } = req.query;

    const filters = {
      wabaId,
      search,
      tags: tags ? tags.split(',') : undefined,
      isOptedIn: isOptedIn !== undefined ? isOptedIn === 'true' : undefined,
      groupId,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const result = await WhatsAppContactService.getContacts(userId, filters);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

/**
 * Get Contact by ID
 * GET /api/whatsapp/contacts/:id
 */
router.get('/contacts/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;

    const contact = await WhatsAppContactService.getContactById(contactId, userId);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({
      success: true,
      contact
    });
  } catch (error) {
    logger.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

/**
 * Update Contact
 * PUT /api/whatsapp/contacts/:id
 */
router.put('/contacts/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    const { name, tags, customFields, isOptedIn } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (tags !== undefined) updates.tags = tags;
    if (customFields !== undefined) updates.customFields = customFields;
    if (isOptedIn !== undefined) updates.isOptedIn = isOptedIn === true || isOptedIn === 'true';

    const contact = await WhatsAppContactService.updateContact(contactId, userId, updates);

    res.json({
      success: true,
      contact
    });
  } catch (error) {
    logger.error('Error updating contact:', error);
    res.status(500).json({ error: error.message || 'Failed to update contact' });
  }
});

/**
 * Delete Contact
 * DELETE /api/whatsapp/contacts/:id
 */
router.delete('/contacts/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;

    await WhatsAppContactService.deleteContact(contactId, userId);

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting contact:', error);
    res.status(500).json({ error: error.message || 'Failed to delete contact' });
  }
});

/**
 * Find Duplicate Contacts
 * GET /api/whatsapp/contacts/duplicates
 */
router.get('/contacts/duplicates', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { phoneNumber } = req.query;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const duplicates = await WhatsAppContactService.findDuplicates(userId, phoneNumber);

    res.json({
      success: true,
      duplicates
    });
  } catch (error) {
    logger.error('Error finding duplicates:', error);
    res.status(500).json({ error: 'Failed to find duplicates' });
  }
});

// ====================================
// CONTACT GROUPS
// ====================================

/**
 * Create Contact Group
 * POST /api/whatsapp/groups
 */
router.post('/groups', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const group = await WhatsAppContactService.createGroup(userId, { name, description });

    res.json({
      success: true,
      group
    });
  } catch (error) {
    logger.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

/**
 * Get Contact Groups
 * GET /api/whatsapp/groups
 */
router.get('/groups', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const groups = await WhatsAppContactService.getGroups(userId);

    res.json({
      success: true,
      groups
    });
  } catch (error) {
    logger.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

/**
 * Get Contact Group by ID
 * GET /api/whatsapp/groups/:id
 */
router.get('/groups/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;

    const group = await WhatsAppContactService.getGroupById(groupId, userId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json({
      success: true,
      group
    });
  } catch (error) {
    logger.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

/**
 * Update Contact Group
 * PUT /api/whatsapp/groups/:id
 */
router.put('/groups/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;
    const { name, description } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    const group = await WhatsAppContactService.updateGroup(groupId, userId, updates);

    res.json({
      success: true,
      group
    });
  } catch (error) {
    logger.error('Error updating group:', error);
    res.status(500).json({ error: error.message || 'Failed to update group' });
  }
});

/**
 * Delete Contact Group
 * DELETE /api/whatsapp/groups/:id
 */
router.delete('/groups/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;

    await WhatsAppContactService.deleteGroup(groupId, userId);

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting group:', error);
    res.status(500).json({ error: error.message || 'Failed to delete group' });
  }
});

/**
 * Add Contacts to Group
 * POST /api/whatsapp/groups/:id/members
 */
router.post('/groups/:id/members', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;
    const { contactIds } = req.body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'contactIds array is required' });
    }

    const result = await WhatsAppContactService.addContactsToGroup(groupId, userId, contactIds);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error adding contacts to group:', error);
    res.status(500).json({ error: error.message || 'Failed to add contacts to group' });
  }
});

/**
 * Remove Contact from Group
 * DELETE /api/whatsapp/groups/:id/members/:contactId
 */
router.delete('/groups/:id/members/:contactId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;
    const contactId = req.params.contactId;

    await WhatsAppContactService.removeContactFromGroup(groupId, userId, contactId);

    res.json({
      success: true,
      message: 'Contact removed from group successfully'
    });
  } catch (error) {
    logger.error('Error removing contact from group:', error);
    res.status(500).json({ error: error.message || 'Failed to remove contact from group' });
  }
});

// ====================================
// CONTACT IMPORT/EXPORT
// ====================================

/**
 * Import Contacts (CSV/JSON)
 * POST /api/whatsapp/contacts/import
 */
router.post('/contacts/import', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { wabaId, contacts, format = 'json' } = req.body;

    if (!wabaId) {
      return res.status(400).json({ error: 'wabaId is required' });
    }

    // Check account ownership
    const accountCheck = await database.query(
      'SELECT id FROM whatsapp_business_accounts WHERE id = $1 AND user_id = $2',
      [wabaId, userId]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'WhatsApp account not found' });
    }

    let contactsData = [];

    if (format === 'json') {
      contactsData = Array.isArray(contacts) ? contacts : [contacts];
    } else if (format === 'csv') {
      // Parse CSV string
      const lines = contacts.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        return res.status(400).json({ error: 'CSV must have at least a header and one data row' });
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      contactsData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const contact = {};
        headers.forEach((header, idx) => {
          contact[header] = values[idx] || '';
        });
        return contact;
      });
    } else {
      return res.status(400).json({ error: 'Invalid format. Use "json" or "csv"' });
    }

    // Map CSV headers to contact fields
    const mappedContacts = contactsData.map(contact => ({
      phoneNumber: contact.phone_number || contact.phoneNumber || contact.phone,
      name: contact.name || contact.Name || '',
      tags: contact.tags ? contact.tags.split(';').filter(t => t) : [],
      customFields: {
        ...(contact.email && { email: contact.email }),
        ...(contact.company && { company: contact.company }),
        ...(contact.job_title && { job_title: contact.job_title })
      }
    }));

    const result = await WhatsAppContactService.bulkImportContacts(userId, wabaId, mappedContacts);

    res.json({
      success: true,
      imported: result.success.length,
      failed: result.failed.length,
      duplicates: result.duplicates.length,
      details: result
    });
  } catch (error) {
    logger.error('Error importing contacts:', error);
    res.status(500).json({ error: error.message || 'Failed to import contacts' });
  }
});

/**
 * Export Contacts to CSV
 * GET /api/whatsapp/contacts/export
 */
router.get('/contacts/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      wabaId,
      search,
      tags,
      isOptedIn,
      groupId
    } = req.query;

    const filters = {
      wabaId,
      search,
      tags: tags ? tags.split(',') : undefined,
      isOptedIn: isOptedIn !== undefined ? isOptedIn === 'true' : undefined,
      groupId
    };

    const csv = await WhatsAppContactService.exportContactsToCSV(userId, filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="whatsapp_contacts_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error('Error exporting contacts:', error);
    res.status(500).json({ error: 'Failed to export contacts' });
  }
});

/**
 * Sync Contact from WhatsApp
 * POST /api/whatsapp/contacts/sync
 */
router.post('/contacts/sync', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { wabaId, phoneNumber } = req.body;

    if (!wabaId || !phoneNumber) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['wabaId', 'phoneNumber']
      });
    }

    const contact = await WhatsAppContactService.syncContactFromWhatsApp(userId, wabaId, phoneNumber);

    res.json({
      success: true,
      contact
    });
  } catch (error) {
    logger.error('Error syncing contact:', error);
    res.status(500).json({ error: error.message || 'Failed to sync contact' });
  }
});

// ====================================
// TEMPLATE MANAGEMENT
// ====================================

/**
 * Create Template
 * POST /api/whatsapp/templates
 */
router.post('/templates', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      wabaId,
      templateName,
      category,
      language,
      headerType,
      headerContent,
      bodyText,
      footerText,
      buttons,
      variables
    } = req.body;

    if (!wabaId || !templateName || !category || !bodyText) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['wabaId', 'templateName', 'category', 'bodyText']
      });
    }

    // Check account ownership
    const accountCheck = await database.query(
      'SELECT id FROM whatsapp_business_accounts WHERE id = $1 AND user_id = $2',
      [wabaId, userId]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'WhatsApp account not found' });
    }

    const template = await WhatsAppTemplateService.createTemplate(userId, wabaId, {
      templateName,
      category,
      language,
      headerType,
      headerContent,
      bodyText,
      footerText,
      buttons,
      variables
    });

    res.json({
      success: true,
      template
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    res.status(500).json({ error: error.message || 'Failed to create template' });
  }
});

/**
 * Get Templates
 * GET /api/whatsapp/templates
 */
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      wabaId,
      status,
      category,
      language,
      limit = 50,
      offset = 0
    } = req.query;

    const filters = {
      wabaId,
      status,
      category,
      language,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const result = await WhatsAppTemplateService.getTemplates(userId, filters);

    res.json({
      success: true,
      data: result.templates || [],
      total: result.total || 0,
      limit: result.limit || parseInt(limit),
      offset: result.offset || parseInt(offset)
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Get Template by ID
 * GET /api/whatsapp/templates/:id
 */
router.get('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const templateId = req.params.id;

    const template = await WhatsAppTemplateService.getTemplateById(templateId, userId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    logger.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * Update Template
 * PUT /api/whatsapp/templates/:id
 */
router.put('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const templateId = req.params.id;
    const updates = req.body;

    const template = await WhatsAppTemplateService.updateTemplate(templateId, userId, updates);

    res.json({
      success: true,
      template
    });
  } catch (error) {
    logger.error('Error updating template:', error);
    res.status(500).json({ error: error.message || 'Failed to update template' });
  }
});

/**
 * Delete Template
 * DELETE /api/whatsapp/templates/:id
 */
router.delete('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const templateId = req.params.id;

    await WhatsAppTemplateService.deleteTemplate(templateId, userId);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting template:', error);
    res.status(500).json({ error: error.message || 'Failed to delete template' });
  }
});

/**
 * Submit Template for Approval
 * POST /api/whatsapp/templates/:id/submit
 */
router.post('/templates/:id/submit', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const templateId = req.params.id;

    const template = await WhatsAppTemplateService.submitTemplate(templateId, userId);

    res.json({
      success: true,
      template,
      message: 'Template submitted for approval'
    });
  } catch (error) {
    logger.error('Error submitting template:', error);
    res.status(500).json({ error: error.message || 'Failed to submit template' });
  }
});

/**
 * Sync Templates from WhatsApp
 * POST /api/whatsapp/templates/sync
 */
router.post('/templates/sync', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { wabaId } = req.body;

    if (!wabaId) {
      return res.status(400).json({ error: 'wabaId is required' });
    }

    // Get WABA ID from database
    const accountResult = await database.query(
      'SELECT waba_id FROM whatsapp_business_accounts WHERE id = $1 AND user_id = $2',
      [wabaId, userId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: 'WhatsApp account not found' });
    }

    const result = await WhatsAppTemplateService.syncTemplatesFromWhatsApp(
      accountResult.rows[0].waba_id,
      userId
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error syncing templates:', error);
    res.status(500).json({ error: error.message || 'Failed to sync templates' });
  }
});

// ====================================
// CAMPAIGN MANAGEMENT
// ====================================

/**
 * Create Campaign
 * POST /api/whatsapp/campaigns
 */
router.post('/campaigns', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      wabaId,
      name,
      type,
      templateId,
      scheduledAt,
      variables,
      recipientIds,
      groupIds,
      contactPhones
    } = req.body;

    if (!wabaId || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['wabaId', 'name']
      });
    }

    // Check account ownership
    const accountCheck = await database.query(
      'SELECT id FROM whatsapp_business_accounts WHERE id = $1 AND user_id = $2',
      [wabaId, userId]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'WhatsApp account not found' });
    }

    const campaign = await WhatsAppCampaignService.createCampaign(userId, wabaId, {
      name,
      type,
      templateId,
      scheduledAt,
      variables,
      recipientIds,
      groupIds,
      contactPhones
    });

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    logger.error('Error creating campaign:', error);
    res.status(500).json({ error: error.message || 'Failed to create campaign' });
  }
});

/**
 * Get Campaigns
 * GET /api/whatsapp/campaigns
 */
router.get('/campaigns', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      wabaId,
      status,
      type,
      limit = 50,
      offset = 0
    } = req.query;

    const filters = {
      wabaId,
      status,
      type,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const result = await WhatsAppCampaignService.getCampaigns(userId, filters);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

/**
 * Get Campaign by ID
 * GET /api/whatsapp/campaigns/:id
 */
router.get('/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    const campaign = await WhatsAppCampaignService.getCampaignById(campaignId, userId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    logger.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

/**
 * Send Campaign
 * POST /api/whatsapp/campaigns/:id/send
 */
router.post('/campaigns/:id/send', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;
    const { sendNow = false } = req.body;

    const result = await WhatsAppCampaignService.sendCampaign(campaignId, userId, sendNow);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error sending campaign:', error);
    res.status(500).json({ error: error.message || 'Failed to send campaign' });
  }
});

/**
 * Get Campaign Statistics
 * GET /api/whatsapp/campaigns/:id/stats
 */
router.get('/campaigns/:id/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    const stats = await WhatsAppCampaignService.getCampaignStats(campaignId, userId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error fetching campaign stats:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch campaign stats' });
  }
});

/**
 * Get Campaign Recipients
 * GET /api/whatsapp/campaigns/:id/recipients
 */
router.get('/campaigns/:id/recipients', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;
    const { status, limit = 100, offset = 0 } = req.query;

    // Verify ownership
    const campaignCheck = await database.query(
      'SELECT id FROM whatsapp_campaigns WHERE id = $1 AND user_id = $2',
      [campaignId, userId]
    );

    if (campaignCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    let query = `
      SELECT cr.*, c.name as contact_name, c.phone_number as contact_phone
      FROM whatsapp_campaign_recipients cr
      LEFT JOIN whatsapp_contacts c ON cr.contact_id = c.id
      WHERE cr.campaign_id = $1
    `;
    const params = [campaignId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND cr.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY cr.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await database.query(query, params);

    res.json({
      success: true,
      recipients: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error fetching campaign recipients:', error);
    res.status(500).json({ error: 'Failed to fetch campaign recipients' });
  }
});

/**
 * Delete Campaign
 * DELETE /api/whatsapp/campaigns/:id
 */
router.delete('/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    await WhatsAppCampaignService.deleteCampaign(campaignId, userId);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting campaign:', error);
    res.status(500).json({ error: error.message || 'Failed to delete campaign' });
  }
});

// ====================================
// BOT MANAGEMENT (Automation)
// ====================================

/**
 * Create Bot
 * POST /api/whatsapp/bots
 */
router.post('/bots', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      wabaId,
      name,
      triggerType,
      triggerText,
      replyType,
      replyText,
      templateId,
      flowId,
      aiAgentId,
      headerText,
      footerText,
      buttons,
      isActive,
      priority
    } = req.body;

    if (!wabaId || !name || !triggerType || !replyType) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['wabaId', 'name', 'triggerType', 'replyType']
      });
    }

    // Check account ownership
    const accountCheck = await database.query(
      'SELECT id FROM whatsapp_business_accounts WHERE id = $1 AND user_id = $2',
      [wabaId, userId]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'WhatsApp account not found' });
    }

    const bot = await WhatsAppBotService.createBot(userId, wabaId, {
      name,
      triggerType,
      triggerText,
      replyType,
      replyText,
      templateId,
      flowId,
      aiAgentId,
      headerText,
      footerText,
      buttons,
      isActive,
      priority
    });

    res.json({
      success: true,
      bot
    });
  } catch (error) {
    logger.error('Error creating bot:', error);
    res.status(500).json({ error: error.message || 'Failed to create bot' });
  }
});

/**
 * Get Bots
 * GET /api/whatsapp/bots
 */
router.get('/bots', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      wabaId,
      triggerType,
      replyType,
      isActive,
      limit = 50,
      offset = 0
    } = req.query;

    const filters = {
      wabaId,
      triggerType,
      replyType,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const result = await WhatsAppBotService.getBots(userId, filters);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error fetching bots:', error);
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

/**
 * Get Bot by ID
 * GET /api/whatsapp/bots/:id
 */
router.get('/bots/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const botId = req.params.id;

    const bot = await WhatsAppBotService.getBotById(botId, userId);

    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    res.json({
      success: true,
      bot
    });
  } catch (error) {
    logger.error('Error fetching bot:', error);
    res.status(500).json({ error: 'Failed to fetch bot' });
  }
});

/**
 * Update Bot
 * PUT /api/whatsapp/bots/:id
 */
router.put('/bots/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const botId = req.params.id;
    const updates = req.body;

    const bot = await WhatsAppBotService.updateBot(botId, userId, updates);

    res.json({
      success: true,
      bot
    });
  } catch (error) {
    logger.error('Error updating bot:', error);
    res.status(500).json({ error: error.message || 'Failed to update bot' });
  }
});

/**
 * Delete Bot
 * DELETE /api/whatsapp/bots/:id
 */
router.delete('/bots/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const botId = req.params.id;

    await WhatsAppBotService.deleteBot(botId, userId);

    res.json({
      success: true,
      message: 'Bot deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting bot:', error);
    res.status(500).json({ error: error.message || 'Failed to delete bot' });
  }
});

/**
 * Test Bot
 * POST /api/whatsapp/bots/:id/test
 */
router.post('/bots/:id/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const botId = req.params.id;
    const { testMessage } = req.body;

    if (!testMessage) {
      return res.status(400).json({ error: 'testMessage is required' });
    }

    const result = await WhatsAppBotService.testBot(botId, userId, testMessage);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error testing bot:', error);
    res.status(500).json({ error: error.message || 'Failed to test bot' });
  }
});

/**
 * Get Bot Executions (Log)
 * GET /api/whatsapp/bots/:id/executions
 */
router.get('/bots/:id/executions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const botId = req.params.id;
    const { limit = 50, offset = 0 } = req.query;

    // Verify ownership
    const botCheck = await database.query(
      'SELECT id FROM whatsapp_bots WHERE id = $1 AND user_id = $2',
      [botId, userId]
    );

    if (botCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    const result = await database.query(
      `SELECT * FROM whatsapp_bot_executions 
       WHERE bot_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [botId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      executions: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error fetching bot executions:', error);
    res.status(500).json({ error: 'Failed to fetch bot executions' });
  }
});

module.exports = router;
