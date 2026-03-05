/**
 * Email Template Service
 * Manages email templates for sales communications
 */

const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class EmailTemplateService {
  /**
   * Get all email templates for a user
   * @param {number} userId 
   * @param {object} filters 
   * @returns {Promise<Array>}
   */
  async getTemplates(userId, filters = {}) {
    try {
      let query = `
        SELECT 
          t.*,
          u.username as created_by_name
        FROM email_templates t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      // Filter by category
      if (filters.category) {
        query += ` AND t.template_category = $${paramIndex}`;
        params.push(filters.category);
        paramIndex++;
      }

      // Filter by active status
      if (filters.isActive !== undefined) {
        query += ` AND t.is_active = $${paramIndex}`;
        params.push(filters.isActive);
        paramIndex++;
      }

      // Search by name
      if (filters.search) {
        query += ` AND (
          t.template_name ILIKE $${paramIndex} OR 
          t.subject ILIKE $${paramIndex}
        )`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      query += ` ORDER BY t.is_default DESC, t.use_count DESC, t.created_at DESC`;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get email templates:', error);
      throw error;
    }
  }

  /**
   * Get a single template by ID
   * @param {string} templateId 
   * @param {number} userId 
   * @returns {Promise<object>}
   */
  async getTemplateById(templateId, userId) {
    try {
      const result = await database.query(
        `SELECT t.*, u.username as created_by_name
         FROM email_templates t
         LEFT JOIN users u ON t.created_by = u.id
         WHERE t.id = $1 AND t.user_id = $2`,
        [templateId, userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get email template:', error);
      throw error;
    }
  }

  /**
   * Create a new email template
   * @param {number} userId 
   * @param {object} templateData 
   * @returns {Promise<object>}
   */
  async createTemplate(userId, templateData) {
    try {
      const templateId = uuidv4();
      
      const result = await database.query(
        `INSERT INTO email_templates (
          id, user_id, company_profile_id, template_name, template_category,
          subject, body_text, body_html, is_default, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          templateId,
          userId,
          templateData.company_profile_id || null,
          templateData.template_name,
          templateData.template_category || 'custom',
          templateData.subject,
          templateData.body_text || null,
          templateData.body_html,
          templateData.is_default || false,
          templateData.is_active !== false, // Default to true
          userId
        ]
      );

      logger.info('Email template created', { templateId, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create email template:', error);
      throw error;
    }
  }

  /**
   * Update an email template
   * @param {string} templateId 
   * @param {number} userId 
   * @param {object} updates 
   * @returns {Promise<object>}
   */
  async updateTemplate(templateId, userId, updates) {
    try {
      const allowedFields = [
        'template_name', 'template_category', 'subject',
        'body_text', 'body_html', 'is_default', 'is_active'
      ];

      const setClause = [];
      const params = [templateId, userId];
      let paramIndex = 3;

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          setClause.push(`${field} = $${paramIndex}`);
          params.push(updates[field]);
          paramIndex++;
        }
      }

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      setClause.push(`updated_at = NOW()`);

      const query = `
        UPDATE email_templates
        SET ${setClause.join(', ')}
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await database.query(query, params);

      if (result.rows.length === 0) {
        throw new Error('Template not found or unauthorized');
      }

      logger.info('Email template updated', { templateId, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update email template:', error);
      throw error;
    }
  }

  /**
   * Delete an email template
   * @param {string} templateId 
   * @param {number} userId 
   * @returns {Promise<void>}
   */
  async deleteTemplate(templateId, userId) {
    try {
      const result = await database.query(
        'DELETE FROM email_templates WHERE id = $1 AND user_id = $2',
        [templateId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Template not found or unauthorized');
      }

      logger.info('Email template deleted', { templateId, userId });
    } catch (error) {
      logger.error('Failed to delete email template:', error);
      throw error;
    }
  }

  /**
   * Duplicate an existing template
   * @param {string} templateId 
   * @param {number} userId 
   * @returns {Promise<object>}
   */
  async duplicateTemplate(templateId, userId) {
    try {
      // Get original template
      const original = await this.getTemplateById(templateId, userId);
      if (!original) {
        throw new Error('Template not found');
      }

      // Create new template with "(Copy)" suffix
      const newTemplate = await this.createTemplate(userId, {
        ...original,
        template_name: `${original.template_name} (Copy)`,
        is_default: false // Copies are never default
      });

      logger.info('Email template duplicated', { originalId: templateId, newId: newTemplate.id, userId });
      return newTemplate;
    } catch (error) {
      logger.error('Failed to duplicate email template:', error);
      throw error;
    }
  }

  /**
   * Replace personalization tokens in template
   * @param {string} template - Template string with tokens
   * @param {object} data - Data to replace tokens with
   * @returns {string}
   */
  replaceTokens(template, data) {
    if (!template) return '';

    let result = template;

    // Replace each token
    const tokenMap = {
      '{{first_name}}': data.first_name || '',
      '{{last_name}}': data.last_name || '',
      '{{email}}': data.email || '',
      '{{company_name}}': data.company_name || '',
      '{{job_title}}': data.job_title || '',
      '{{phone}}': data.phone || '',
      '{{sender_name}}': data.sender_name || '',
      '{{sender_email}}': data.sender_email || '',
      '{{sender_company}}': data.sender_company || '',
      '{{sender_phone}}': data.sender_phone || ''
    };

    for (const [token, value] of Object.entries(tokenMap)) {
      result = result.replace(new RegExp(token, 'g'), value);
    }

    return result;
  }

  /**
   * Get available personalization tokens
   * @returns {Array<object>}
   */
  getAvailableTokens() {
    return [
      { token: '{{first_name}}', description: 'Recipient first name' },
      { token: '{{last_name}}', description: 'Recipient last name' },
      { token: '{{email}}', description: 'Recipient email' },
      { token: '{{company_name}}', description: 'Recipient company name' },
      { token: '{{job_title}}', description: 'Recipient job title' },
      { token: '{{phone}}', description: 'Recipient phone number' },
      { token: '{{sender_name}}', description: 'Your name' },
      { token: '{{sender_email}}', description: 'Your email' },
      { token: '{{sender_company}}', description: 'Your company name' },
      { token: '{{sender_phone}}', description: 'Your phone number' }
    ];
  }

  /**
   * Get template categories
   * @returns {Array<object>}
   */
  getCategories() {
    return [
      { value: 'introduction', label: 'Introduction', icon: '👋' },
      { value: 'follow_up', label: 'Follow-up', icon: '🔄' },
      { value: 'proposal', label: 'Proposal', icon: '📄' },
      { value: 'meeting_request', label: 'Meeting Request', icon: '📅' },
      { value: 'thank_you', label: 'Thank You', icon: '🙏' },
      { value: 'custom', label: 'Custom', icon: '✨' }
    ];
  }
}

module.exports = new EmailTemplateService();

