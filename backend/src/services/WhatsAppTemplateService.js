const database = require('../database/connection');
const logger = require('../utils/logger');
const WhatsAppService = require('./WhatsAppService');
const { v4: uuidv4 } = require('uuid');

/**
 * WhatsApp Template Service
 * Handles message template creation, submission, and management
 */
class WhatsAppTemplateService {
  /**
   * Create template
   */
  async createTemplate(userId, wabaId, templateData) {
    try {
      const {
        templateName,
        category,
        language = 'en',
        headerType,
        headerContent,
        bodyText,
        footerText,
        buttons = [],
        variables = []
      } = templateData;

      // Validate required fields
      if (!templateName || !category || !bodyText) {
        throw new Error('Template name, category, and body text are required');
      }

      // Validate category
      const validCategories = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
      if (!validCategories.includes(category)) {
        throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
      }

      // Create template in database
      const result = await database.query(
        `INSERT INTO whatsapp_templates 
         (user_id, waba_id, template_name, category, language, header_type, header_content, 
          body_text, footer_text, buttons, variables, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft')
         RETURNING *`,
        [
          userId,
          wabaId,
          templateName,
          category,
          language,
          headerType || null,
          headerContent || null,
          bodyText,
          footerText || null,
          JSON.stringify(buttons),
          JSON.stringify(variables)
        ]
      );

      logger.info('Template created', { templateId: result.rows[0].id, userId, templateName });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId, userId) {
    try {
      const result = await database.query(
        `SELECT * FROM whatsapp_templates 
         WHERE id = $1 AND user_id = $2`,
        [templateId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting template:', error);
      throw error;
    }
  }

  /**
   * Get templates with filters
   */
  async getTemplates(userId, filters = {}) {
    try {
      const {
        wabaId,
        status,
        category,
        language,
        limit = 50,
        offset = 0
      } = filters;

      let query = `
        SELECT * FROM whatsapp_templates
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramCount = 1;

      if (wabaId) {
        paramCount++;
        query += ` AND waba_id = $${paramCount}`;
        params.push(wabaId);
      }

      if (status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(status);
      }

      if (category) {
        paramCount++;
        query += ` AND category = $${paramCount}`;
        params.push(category);
      }

      if (language) {
        paramCount++;
        query += ` AND language = $${paramCount}`;
        params.push(language);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await database.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total FROM whatsapp_templates WHERE user_id = $1
      `;
      const countParams = [userId];
      let countParamCount = 1;

      if (wabaId) {
        countParamCount++;
        countQuery += ` AND waba_id = $${countParamCount}`;
        countParams.push(wabaId);
      }

      if (status) {
        countParamCount++;
        countQuery += ` AND status = $${countParamCount}`;
        countParams.push(status);
      }

      if (category) {
        countParamCount++;
        countQuery += ` AND category = $${countParamCount}`;
        countParams.push(category);
      }

      if (language) {
        countParamCount++;
        countQuery += ` AND language = $${countParamCount}`;
        countParams.push(language);
      }

      const countResult = await database.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return {
        templates: result.rows,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error getting templates:', error);
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(templateId, userId, updates) {
    try {
      // Check ownership and status (can't update approved templates)
      const checkResult = await database.query(
        'SELECT id, status FROM whatsapp_templates WHERE id = $1 AND user_id = $2',
        [templateId, userId]
      );

      if (checkResult.rows.length === 0) {
        throw new Error('Template not found');
      }

      if (checkResult.rows[0].status === 'approved') {
        throw new Error('Cannot update approved template. Create a new version instead.');
      }

      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (updates.templateName !== undefined) {
        updateFields.push(`template_name = $${paramCount++}`);
        values.push(updates.templateName);
      }

      if (updates.headerType !== undefined) {
        updateFields.push(`header_type = $${paramCount++}`);
        values.push(updates.headerType);
      }

      if (updates.headerContent !== undefined) {
        updateFields.push(`header_content = $${paramCount++}`);
        values.push(updates.headerContent);
      }

      if (updates.bodyText !== undefined) {
        updateFields.push(`body_text = $${paramCount++}`);
        values.push(updates.bodyText);
      }

      if (updates.footerText !== undefined) {
        updateFields.push(`footer_text = $${paramCount++}`);
        values.push(updates.footerText);
      }

      if (updates.buttons !== undefined) {
        updateFields.push(`buttons = $${paramCount++}`);
        values.push(JSON.stringify(updates.buttons));
      }

      if (updates.variables !== undefined) {
        updateFields.push(`variables = $${paramCount++}`);
        values.push(JSON.stringify(updates.variables));
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(templateId);

      await database.query(
        `UPDATE whatsapp_templates 
         SET ${updateFields.join(', ')}, updated_at = NOW()
         WHERE id = $${paramCount++}`,
        values
      );

      return await this.getTemplateById(templateId, userId);
    } catch (error) {
      logger.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId, userId) {
    try {
      // Check ownership
      const checkResult = await database.query(
        'SELECT id, status FROM whatsapp_templates WHERE id = $1 AND user_id = $2',
        [templateId, userId]
      );

      if (checkResult.rows.length === 0) {
        throw new Error('Template not found');
      }

      // Can only delete draft or rejected templates
      if (checkResult.rows[0].status === 'approved') {
        throw new Error('Cannot delete approved template. Delete it from WhatsApp Business Manager first.');
      }

      await database.query(
        'DELETE FROM whatsapp_templates WHERE id = $1',
        [templateId]
      );

      return { success: true };
    } catch (error) {
      logger.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Submit template to WhatsApp for approval
   */
  async submitTemplate(templateId, userId) {
    try {
      const template = await this.getTemplateById(templateId, userId);

      if (!template) {
        throw new Error('Template not found');
      }

      if (template.status === 'approved') {
        throw new Error('Template is already approved');
      }

      if (template.status === 'pending') {
        throw new Error('Template is already pending approval');
      }

      // Get WABA ID
      const wabaResult = await database.query(
        'SELECT waba_id FROM whatsapp_business_accounts WHERE id = $1',
        [template.waba_id]
      );

      if (wabaResult.rows.length === 0) {
        throw new Error('WhatsApp Business Account not found');
      }

      const wabaId = wabaResult.rows[0].waba_id;

      // Build template components for WhatsApp API
      const components = [];

      // Header component
      if (template.header_type && template.header_content) {
        const headerComponent = {
          type: 'HEADER',
          format: template.header_type.toLowerCase(),
          text: template.header_type === 'TEXT' ? template.header_content : undefined,
          example: template.header_type === 'TEXT' ? {
            header_text: [template.header_content.split('{{1}}')[0] || template.header_content]
          } : undefined
        };

        if (template.header_type === 'IMAGE' || template.header_type === 'VIDEO' || template.header_type === 'DOCUMENT') {
          headerComponent.example = {
            header_handle: [template.header_content]
          };
        }

        components.push(headerComponent);
      }

      // Body component
      const bodyComponent = {
        type: 'BODY',
        text: template.body_text,
        example: {
          body_text: this.generateExampleBodyText(template.body_text, template.variables)
        }
      };
      components.push(bodyComponent);

      // Footer component
      if (template.footer_text) {
        components.push({
          type: 'FOOTER',
          text: template.footer_text
        });
      }

      // Button components
      if (template.buttons && Array.isArray(template.buttons) && template.buttons.length > 0) {
        for (const button of template.buttons) {
          if (button.type === 'QUICK_REPLY') {
            components.push({
              type: 'BUTTONS',
              buttons: [{
                type: 'QUICK_REPLY',
                text: button.text
              }]
            });
          } else if (button.type === 'URL' || button.type === 'PHONE_NUMBER') {
            components.push({
              type: 'BUTTONS',
              buttons: [{
                type: button.type,
                text: button.text,
                url: button.url,
                phone_number: button.phoneNumber
              }]
            });
          }
        }
      }

      // Submit to WhatsApp API
      const templateData = {
        name: template.template_name,
        category: template.category,
        language: template.language,
        components: components
      };

      const response = await WhatsAppService.createTemplate(wabaId, templateData);

      // Update template status
      await database.query(
        `UPDATE whatsapp_templates 
         SET status = 'pending', 
             template_id = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [response.id || response.message_template_id, templateId]
      );

      logger.info('Template submitted for approval', { templateId, templateName: template.template_name });

      return {
        ...template,
        status: 'pending',
        template_id: response.id || response.message_template_id
      };
    } catch (error) {
      logger.error('Error submitting template:', error);
      
      // Update template with rejection reason if available
      if (error.message && error.message.includes('rejected')) {
        await database.query(
          `UPDATE whatsapp_templates 
           SET status = 'rejected', 
               rejection_reason = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [error.message, templateId]
        );
      }

      throw error;
    }
  }

  /**
   * Generate example body text for template submission
   */
  generateExampleBodyText(bodyText, variables) {
    // Replace variables with example values
    let example = bodyText;
    const varCount = (bodyText.match(/\{\{(\d+)\}\}/g) || []).length;
    
    for (let i = 1; i <= varCount; i++) {
      const exampleValue = variables[i - 1]?.example || `Example${i}`;
      example = example.replace(new RegExp(`\\{\\{${i}\\}\\}`, 'g'), exampleValue);
    }

    return [example];
  }

  /**
   * Sync templates from WhatsApp (get approved templates)
   */
  async syncTemplatesFromWhatsApp(wabaId, userId) {
    try {
      // Get account database ID
      const accountResult = await database.query(
        'SELECT id FROM whatsapp_business_accounts WHERE waba_id = $1 AND user_id = $2',
        [wabaId, userId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('WhatsApp Business Account not found');
      }

      const dbWabaId = accountResult.rows[0].id;

      // Get templates from WhatsApp API
      const templates = await WhatsAppService.getTemplates(wabaId);

      let synced = 0;
      let updated = 0;

      for (const template of templates) {
        try {
          // Check if template exists
          const existingResult = await database.query(
            'SELECT id FROM whatsapp_templates WHERE template_id = $1 AND waba_id = $2',
            [template.id, dbWabaId]
          );

          if (existingResult.rows.length > 0) {
            // Update existing template
            await database.query(
              `UPDATE whatsapp_templates 
               SET status = $1, updated_at = NOW()
               WHERE id = $2`,
              [template.status?.toLowerCase() || 'approved', existingResult.rows[0].id]
            );
            updated++;
          } else {
            // Create new template record
            await database.query(
              `INSERT INTO whatsapp_templates 
               (user_id, waba_id, template_name, category, language, template_id, status, body_text)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                userId,
                dbWabaId,
                template.name,
                template.category,
                template.language,
                template.id,
                template.status?.toLowerCase() || 'approved',
                template.components?.find(c => c.type === 'BODY')?.text || ''
              ]
            );
            synced++;
          }
        } catch (error) {
          logger.warn('Error syncing template:', { templateId: template.id, error: error.message });
        }
      }

      logger.info('Templates synced from WhatsApp', { synced, updated, total: templates.length });

      return { synced, updated, total: templates.length };
    } catch (error) {
      logger.error('Error syncing templates from WhatsApp:', error);
      throw error;
    }
  }
}

module.exports = new WhatsAppTemplateService();
