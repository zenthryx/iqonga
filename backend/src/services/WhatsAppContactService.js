const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const WhatsAppService = require('./WhatsAppService');

/**
 * WhatsApp Contact Service
 * Handles contact management, groups, import/export, and enrichment
 */
class WhatsAppContactService {
  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add + if not present
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Create or update contact
   */
  async createOrUpdateContact(userId, wabaId, contactData) {
    try {
      const phoneNumber = this.formatPhoneNumber(contactData.phoneNumber);
      const { name, profileName, profilePictureUrl, tags, customFields } = contactData;

      // Check if contact exists
      const existingResult = await database.query(
        `SELECT id FROM whatsapp_contacts 
         WHERE user_id = $1 AND waba_id = $2 AND phone_number = $3`,
        [userId, wabaId, phoneNumber]
      );

      let contactId;
      if (existingResult.rows.length > 0) {
        // Update existing contact
        contactId = existingResult.rows[0].id;
        await database.query(
          `UPDATE whatsapp_contacts 
           SET name = COALESCE($1, name),
               profile_name = COALESCE($2, profile_name),
               profile_picture_url = COALESCE($3, profile_picture_url),
               tags = COALESCE($4, tags),
               custom_fields = COALESCE($5, custom_fields),
               updated_at = NOW()
           WHERE id = $6`,
          [name, profileName, profilePictureUrl, tags, JSON.stringify(customFields || {}), contactId]
        );
      } else {
        // Create new contact
        const result = await database.query(
          `INSERT INTO whatsapp_contacts 
           (user_id, waba_id, phone_number, name, profile_name, profile_picture_url, tags, custom_fields, is_opted_in, opt_in_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
           RETURNING id`,
          [userId, wabaId, phoneNumber, name, profileName, profilePictureUrl, tags, JSON.stringify(customFields || {})]
        );
        contactId = result.rows[0].id;
      }

      // Get updated contact
      const contactResult = await database.query(
        'SELECT * FROM whatsapp_contacts WHERE id = $1',
        [contactId]
      );

      return contactResult.rows[0];
    } catch (error) {
      logger.error('Error creating/updating contact:', error);
      throw error;
    }
  }

  /**
   * Get contact by ID
   */
  async getContactById(contactId, userId) {
    try {
      const result = await database.query(
        `SELECT c.*, 
                (SELECT COUNT(*) FROM whatsapp_messages WHERE contact_id = c.id) as total_messages,
                (SELECT COUNT(*) FROM whatsapp_contact_group_members WHERE contact_id = c.id) as group_count
         FROM whatsapp_contacts c
         WHERE c.id = $1 AND c.user_id = $2`,
        [contactId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting contact:', error);
      throw error;
    }
  }

  /**
   * Get contacts with filters and pagination
   */
  async getContacts(userId, filters = {}) {
    try {
      const {
        wabaId,
        search,
        tags,
        isOptedIn,
        groupId,
        limit = 50,
        offset = 0
      } = filters;

      let query = `
        SELECT c.*,
               (SELECT COUNT(*) FROM whatsapp_messages WHERE contact_id = c.id) as total_messages,
               (SELECT MAX(created_at) FROM whatsapp_messages WHERE contact_id = c.id) as last_message_date
        FROM whatsapp_contacts c
        WHERE c.user_id = $1
      `;
      const params = [userId];
      let paramCount = 1;

      if (wabaId) {
        paramCount++;
        query += ` AND c.waba_id = $${paramCount}`;
        params.push(wabaId);
      }

      if (search) {
        paramCount++;
        query += ` AND (
          c.phone_number ILIKE $${paramCount} OR 
          c.name ILIKE $${paramCount} OR 
          c.profile_name ILIKE $${paramCount}
        )`;
        params.push(`%${search}%`);
      }

      if (tags && tags.length > 0) {
        paramCount++;
        query += ` AND c.tags && $${paramCount}`;
        params.push(tags);
      }

      if (isOptedIn !== undefined) {
        paramCount++;
        query += ` AND c.is_opted_in = $${paramCount}`;
        params.push(isOptedIn);
      }

      if (groupId) {
        paramCount++;
        query += ` AND c.id IN (
          SELECT contact_id FROM whatsapp_contact_group_members WHERE group_id = $${paramCount}
        )`;
        params.push(groupId);
      }

      query += ` ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await database.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM whatsapp_contacts c
        WHERE c.user_id = $1
      `;
      const countParams = [userId];
      let countParamCount = 1;

      if (wabaId) {
        countParamCount++;
        countQuery += ` AND c.waba_id = $${countParamCount}`;
        countParams.push(wabaId);
      }

      if (search) {
        countParamCount++;
        countQuery += ` AND (
          c.phone_number ILIKE $${countParamCount} OR 
          c.name ILIKE $${countParamCount} OR 
          c.profile_name ILIKE $${countParamCount}
        )`;
        countParams.push(`%${search}%`);
      }

      if (tags && tags.length > 0) {
        countParamCount++;
        countQuery += ` AND c.tags && $${countParamCount}`;
        countParams.push(tags);
      }

      if (isOptedIn !== undefined) {
        countParamCount++;
        countQuery += ` AND c.is_opted_in = $${countParamCount}`;
        countParams.push(isOptedIn);
      }

      if (groupId) {
        countParamCount++;
        countQuery += ` AND c.id IN (
          SELECT contact_id FROM whatsapp_contact_group_members WHERE group_id = $${countParamCount}
        )`;
        countParams.push(groupId);
      }

      const countResult = await database.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return {
        contacts: result.rows,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error getting contacts:', error);
      throw error;
    }
  }

  /**
   * Update contact
   */
  async updateContact(contactId, userId, updates) {
    try {
      // Check ownership
      const checkResult = await database.query(
        'SELECT id FROM whatsapp_contacts WHERE id = $1 AND user_id = $2',
        [contactId, userId]
      );

      if (checkResult.rows.length === 0) {
        throw new Error('Contact not found');
      }

      // Build update query
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(updates.name);
      }

      if (updates.tags !== undefined) {
        updateFields.push(`tags = $${paramCount++}`);
        values.push(updates.tags);
      }

      if (updates.customFields !== undefined) {
        updateFields.push(`custom_fields = $${paramCount++}`);
        values.push(JSON.stringify(updates.customFields));
      }

      if (updates.isOptedIn !== undefined) {
        updateFields.push(`is_opted_in = $${paramCount++}`);
        values.push(updates.isOptedIn);
        if (updates.isOptedIn) {
          updateFields.push(`opt_in_date = NOW()`);
        } else {
          updateFields.push(`opt_out_date = NOW()`);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(contactId);

      await database.query(
        `UPDATE whatsapp_contacts 
         SET ${updateFields.join(', ')}, updated_at = NOW()
         WHERE id = $${paramCount++}`,
        values
      );

      // Get updated contact
      return await this.getContactById(contactId, userId);
    } catch (error) {
      logger.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Delete contact
   */
  async deleteContact(contactId, userId) {
    try {
      // Check ownership
      const checkResult = await database.query(
        'SELECT id FROM whatsapp_contacts WHERE id = $1 AND user_id = $2',
        [contactId, userId]
      );

      if (checkResult.rows.length === 0) {
        throw new Error('Contact not found');
      }

      await database.query(
        'DELETE FROM whatsapp_contacts WHERE id = $1',
        [contactId]
      );

      return { success: true };
    } catch (error) {
      logger.error('Error deleting contact:', error);
      throw error;
    }
  }

  /**
   * Find duplicate contacts
   */
  async findDuplicates(userId, phoneNumber) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const result = await database.query(
        `SELECT * FROM whatsapp_contacts 
         WHERE user_id = $1 AND phone_number = $2`,
        [userId, formattedPhone]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error finding duplicates:', error);
      throw error;
    }
  }

  /**
   * Create contact group
   */
  async createGroup(userId, groupData) {
    try {
      const { name, description } = groupData;

      const result = await database.query(
        `INSERT INTO whatsapp_contact_groups (user_id, name, description)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, name, description || null]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating group:', error);
      throw error;
    }
  }

  /**
   * Get groups
   */
  async getGroups(userId) {
    try {
      const result = await database.query(
        `SELECT g.*,
                (SELECT COUNT(*) FROM whatsapp_contact_group_members WHERE group_id = g.id) as contact_count
         FROM whatsapp_contact_groups g
         WHERE g.user_id = $1
         ORDER BY g.created_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting groups:', error);
      throw error;
    }
  }

  /**
   * Get group by ID
   */
  async getGroupById(groupId, userId) {
    try {
      const result = await database.query(
        `SELECT g.*,
                (SELECT COUNT(*) FROM whatsapp_contact_group_members WHERE group_id = g.id) as contact_count
         FROM whatsapp_contact_groups g
         WHERE g.id = $1 AND g.user_id = $2`,
        [groupId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Get group members
      const membersResult = await database.query(
        `SELECT c.*, gm.added_at
         FROM whatsapp_contact_group_members gm
         JOIN whatsapp_contacts c ON gm.contact_id = c.id
         WHERE gm.group_id = $1
         ORDER BY gm.added_at DESC`,
        [groupId]
      );

      return {
        ...result.rows[0],
        members: membersResult.rows
      };
    } catch (error) {
      logger.error('Error getting group:', error);
      throw error;
    }
  }

  /**
   * Update group
   */
  async updateGroup(groupId, userId, updates) {
    try {
      // Check ownership
      const checkResult = await database.query(
        'SELECT id FROM whatsapp_contact_groups WHERE id = $1 AND user_id = $2',
        [groupId, userId]
      );

      if (checkResult.rows.length === 0) {
        throw new Error('Group not found');
      }

      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(updates.name);
      }

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        values.push(updates.description);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(groupId);

      await database.query(
        `UPDATE whatsapp_contact_groups 
         SET ${updateFields.join(', ')}, updated_at = NOW()
         WHERE id = $${paramCount++}`,
        values
      );

      return await this.getGroupById(groupId, userId);
    } catch (error) {
      logger.error('Error updating group:', error);
      throw error;
    }
  }

  /**
   * Delete group
   */
  async deleteGroup(groupId, userId) {
    try {
      // Check ownership
      const checkResult = await database.query(
        'SELECT id FROM whatsapp_contact_groups WHERE id = $1 AND user_id = $2',
        [groupId, userId]
      );

      if (checkResult.rows.length === 0) {
        throw new Error('Group not found');
      }

      await database.query(
        'DELETE FROM whatsapp_contact_groups WHERE id = $1',
        [groupId]
      );

      return { success: true };
    } catch (error) {
      logger.error('Error deleting group:', error);
      throw error;
    }
  }

  /**
   * Add contacts to group
   */
  async addContactsToGroup(groupId, userId, contactIds) {
    try {
      // Check group ownership
      const groupCheck = await database.query(
        'SELECT id FROM whatsapp_contact_groups WHERE id = $1 AND user_id = $2',
        [groupId, userId]
      );

      if (groupCheck.rows.length === 0) {
        throw new Error('Group not found');
      }

      const added = [];
      const skipped = [];

      for (const contactId of contactIds) {
        try {
          // Check contact ownership
          const contactCheck = await database.query(
            'SELECT id FROM whatsapp_contacts WHERE id = $1 AND user_id = $2',
            [contactId, userId]
          );

          if (contactCheck.rows.length === 0) {
            skipped.push({ contactId, reason: 'Contact not found' });
            continue;
          }

          // Add to group (ignore if already exists)
          await database.query(
            `INSERT INTO whatsapp_contact_group_members (group_id, contact_id)
             VALUES ($1, $2)
             ON CONFLICT (group_id, contact_id) DO NOTHING`,
            [groupId, contactId]
          );

          added.push(contactId);
        } catch (error) {
          skipped.push({ contactId, reason: error.message });
        }
      }

      return { added, skipped };
    } catch (error) {
      logger.error('Error adding contacts to group:', error);
      throw error;
    }
  }

  /**
   * Remove contact from group
   */
  async removeContactFromGroup(groupId, userId, contactId) {
    try {
      // Check ownership
      const checkResult = await database.query(
        `SELECT g.id FROM whatsapp_contact_groups g
         JOIN whatsapp_contact_group_members gm ON g.id = gm.group_id
         WHERE g.id = $1 AND g.user_id = $2 AND gm.contact_id = $3`,
        [groupId, userId, contactId]
      );

      if (checkResult.rows.length === 0) {
        throw new Error('Group or contact not found');
      }

      await database.query(
        'DELETE FROM whatsapp_contact_group_members WHERE group_id = $1 AND contact_id = $2',
        [groupId, contactId]
      );

      return { success: true };
    } catch (error) {
      logger.error('Error removing contact from group:', error);
      throw error;
    }
  }

  /**
   * Bulk import contacts from CSV/JSON
   */
  async bulkImportContacts(userId, wabaId, contactsData) {
    try {
      const results = {
        success: [],
        failed: [],
        duplicates: []
      };

      for (const contactData of contactsData) {
        try {
          // Validate required fields
          if (!contactData.phoneNumber) {
            results.failed.push({
              data: contactData,
              error: 'Phone number is required'
            });
            continue;
          }

          // Check for duplicates
          const duplicates = await this.findDuplicates(userId, contactData.phoneNumber);
          if (duplicates.length > 0) {
            results.duplicates.push({
              data: contactData,
              existingContactId: duplicates[0].id
            });
            continue;
          }

          // Create contact
          const contact = await this.createOrUpdateContact(userId, wabaId, {
            phoneNumber: contactData.phoneNumber,
            name: contactData.name,
            tags: contactData.tags || [],
            customFields: contactData.customFields || {}
          });

          results.success.push(contact);
        } catch (error) {
          results.failed.push({
            data: contactData,
            error: error.message
          });
        }
      }

      logger.info('Bulk import completed', {
        userId,
        wabaId,
        success: results.success.length,
        failed: results.failed.length,
        duplicates: results.duplicates.length
      });

      return results;
    } catch (error) {
      logger.error('Error bulk importing contacts:', error);
      throw error;
    }
  }

  /**
   * Export contacts to CSV
   */
  async exportContactsToCSV(userId, filters = {}) {
    try {
      const contactsData = await this.getContacts(userId, { ...filters, limit: 10000 });

      // CSV headers
      const headers = ['phone_number', 'name', 'profile_name', 'is_opted_in', 'message_count', 'last_message_at', 'tags', 'created_at'];
      
      // Build CSV
      let csv = headers.join(',') + '\n';

      for (const contact of contactsData.contacts) {
        const row = [
          contact.phone_number || '',
          contact.name || '',
          contact.profile_name || '',
          contact.is_opted_in ? 'true' : 'false',
          contact.total_messages || 0,
          contact.last_message_at || '',
          (contact.tags || []).join(';'),
          contact.created_at || ''
        ];
        csv += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
      }

      return csv;
    } catch (error) {
      logger.error('Error exporting contacts:', error);
      throw error;
    }
  }

  /**
   * Sync contacts from WhatsApp (get profile info)
   */
  async syncContactFromWhatsApp(userId, wabaId, phoneNumber) {
    try {
      // Get account details
      const accountResult = await database.query(
        'SELECT phone_number_id FROM whatsapp_business_accounts WHERE id = $1 AND user_id = $2',
        [wabaId, userId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('WhatsApp account not found');
      }

      // Note: WhatsApp Business API doesn't have a direct endpoint to get contact profile
      // This would typically be done via webhooks when messages are received
      // For now, we'll just ensure the contact exists in our database

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Get or create contact
      const contact = await this.createOrUpdateContact(userId, wabaId, {
        phoneNumber: formattedPhone
      });

      return contact;
    } catch (error) {
      logger.error('Error syncing contact from WhatsApp:', error);
      throw error;
    }
  }
}

module.exports = new WhatsAppContactService();
