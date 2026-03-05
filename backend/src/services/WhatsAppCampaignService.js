const database = require('../database/connection');
const logger = require('../utils/logger');
const WhatsAppService = require('./WhatsAppService');
const WhatsAppContactService = require('./WhatsAppContactService');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

/**
 * WhatsApp Campaign Service
 * Handles broadcast campaigns, scheduling, and tracking
 */
class WhatsAppCampaignService {
  constructor() {
    this.isSchedulerRunning = false;
  }

  /**
   * Create campaign
   */
  async createCampaign(userId, wabaId, campaignData) {
    try {
      const {
        name,
        type = 'broadcast',
        templateId,
        scheduledAt,
        variables = {},
        recipientIds = [],
        groupIds = [],
        contactPhones = []
      } = campaignData;

      if (!name) {
        throw new Error('Campaign name is required');
      }

      if (type === 'broadcast' && !templateId) {
        throw new Error('Template ID is required for broadcast campaigns');
      }

      // Get template if provided
      let template = null;
      if (templateId) {
        const templateResult = await database.query(
          'SELECT * FROM whatsapp_templates WHERE id = $1 AND user_id = $2',
          [templateId, userId]
        );

        if (templateResult.rows.length === 0) {
          throw new Error('Template not found');
        }

        template = templateResult.rows[0];

        if (template.status !== 'approved') {
          throw new Error('Template must be approved before use in campaigns');
        }
      }

      // Determine recipients
      const recipients = await this.determineRecipients(userId, wabaId, {
        recipientIds,
        groupIds,
        contactPhones
      });

      if (recipients.length === 0) {
        throw new Error('No recipients selected');
      }

      // Create campaign
      const campaignId = uuidv4();
      const result = await database.query(
        `INSERT INTO whatsapp_campaigns 
         (id, user_id, waba_id, name, type, template_id, status, scheduled_at, total_recipients, variables)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          campaignId,
          userId,
          wabaId,
          name,
          type,
          templateId || null,
          scheduledAt ? 'scheduled' : 'draft',
          scheduledAt || null,
          recipients.length,
          JSON.stringify(variables)
        ]
      );

      const campaign = result.rows[0];

      // Create campaign recipients
      await this.createCampaignRecipients(campaignId, recipients, variables);

      logger.info('Campaign created', { campaignId, userId, name, recipientCount: recipients.length });

      return campaign;
    } catch (error) {
      logger.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * Determine campaign recipients
   */
  async determineRecipients(userId, wabaId, options) {
    const { recipientIds, groupIds, contactPhones } = options;
    const recipients = [];

    // Add individual contacts
    if (recipientIds && recipientIds.length > 0) {
      const contactsResult = await database.query(
        `SELECT id, phone_number FROM whatsapp_contacts 
         WHERE id = ANY($1::uuid[]) AND user_id = $2 AND waba_id = $3 AND is_opted_in = true`,
        [recipientIds, userId, wabaId]
      );

      for (const contact of contactsResult.rows) {
        recipients.push({
          contactId: contact.id,
          phoneNumber: contact.phone_number
        });
      }
    }

    // Add contacts from groups
    if (groupIds && groupIds.length > 0) {
      const groupMembersResult = await database.query(
        `SELECT DISTINCT c.id, c.phone_number
         FROM whatsapp_contacts c
         JOIN whatsapp_contact_group_members gm ON c.id = gm.contact_id
         WHERE gm.group_id = ANY($1::uuid[]) 
           AND c.user_id = $2 
           AND c.waba_id = $3 
           AND c.is_opted_in = true`,
        [groupIds, userId, wabaId]
      );

      for (const contact of groupMembersResult.rows) {
        // Avoid duplicates
        if (!recipients.find(r => r.contactId === contact.id)) {
          recipients.push({
            contactId: contact.id,
            phoneNumber: contact.phone_number
          });
        }
      }
    }

    // Add direct phone numbers
    if (contactPhones && contactPhones.length > 0) {
      for (const phone of contactPhones) {
        const formattedPhone = WhatsAppContactService.formatPhoneNumber(phone);
        
        // Get or create contact
        const contactResult = await database.query(
          `INSERT INTO whatsapp_contacts (user_id, waba_id, phone_number, is_opted_in, opt_in_date)
           VALUES ($1, $2, $3, true, NOW())
           ON CONFLICT (user_id, waba_id, phone_number) 
           DO UPDATE SET is_opted_in = true, opt_in_date = NOW()
           RETURNING id, phone_number`,
          [userId, wabaId, formattedPhone]
        );

        recipients.push({
          contactId: contactResult.rows[0].id,
          phoneNumber: contactResult.rows[0].phone_number
        });
      }
    }

    return recipients;
  }

  /**
   * Create campaign recipients
   */
  async createCampaignRecipients(campaignId, recipients, variables) {
    try {
      for (const recipient of recipients) {
        // Get variables for this recipient (if personalized)
        const recipientVariables = variables[recipient.phoneNumber] || variables[recipient.contactId] || {};

        await database.query(
          `INSERT INTO whatsapp_campaign_recipients 
           (campaign_id, contact_id, phone_number, status, variables)
           VALUES ($1, $2, $3, 'pending', $4)`,
          [
            campaignId,
            recipient.contactId,
            recipient.phoneNumber,
            JSON.stringify(recipientVariables)
          ]
        );
      }
    } catch (error) {
      logger.error('Error creating campaign recipients:', error);
      throw error;
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId, userId) {
    try {
      const result = await database.query(
        `SELECT c.*, t.template_name, t.template_id as whatsapp_template_id
         FROM whatsapp_campaigns c
         LEFT JOIN whatsapp_templates t ON c.template_id = t.id
         WHERE c.id = $1 AND c.user_id = $2`,
        [campaignId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Get statistics
      const statsResult = await database.query(
        `SELECT 
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'sent') as sent,
           COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
           COUNT(*) FILTER (WHERE status = 'read') as read,
           COUNT(*) FILTER (WHERE status = 'failed') as failed
         FROM whatsapp_campaign_recipients
         WHERE campaign_id = $1`,
        [campaignId]
      );

      return {
        ...result.rows[0],
        stats: statsResult.rows[0]
      };
    } catch (error) {
      logger.error('Error getting campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaigns with filters
   */
  async getCampaigns(userId, filters = {}) {
    try {
      const {
        wabaId,
        status,
        type,
        limit = 50,
        offset = 0
      } = filters;

      let query = `
        SELECT c.*, t.template_name
        FROM whatsapp_campaigns c
        LEFT JOIN whatsapp_templates t ON c.template_id = t.id
        WHERE c.user_id = $1
      `;
      const params = [userId];
      let paramCount = 1;

      if (wabaId) {
        paramCount++;
        query += ` AND c.waba_id = $${paramCount}`;
        params.push(wabaId);
      }

      if (status) {
        paramCount++;
        query += ` AND c.status = $${paramCount}`;
        params.push(status);
      }

      if (type) {
        paramCount++;
        query += ` AND c.type = $${paramCount}`;
        params.push(type);
      }

      query += ` ORDER BY c.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await database.query(query, params);

      // Get total count
      let countQuery = `SELECT COUNT(*) as total FROM whatsapp_campaigns WHERE user_id = $1`;
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

      if (type) {
        countParamCount++;
        countQuery += ` AND type = $${countParamCount}`;
        countParams.push(type);
      }

      const countResult = await database.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return {
        campaigns: result.rows,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error getting campaigns:', error);
      throw error;
    }
  }

  /**
   * Send campaign
   */
  async sendCampaign(campaignId, userId, sendNow = false) {
    try {
      const campaign = await this.getCampaignById(campaignId, userId);

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status === 'sending' || campaign.status === 'completed') {
        throw new Error(`Campaign is already ${campaign.status}`);
      }

      // Check if scheduled
      if (campaign.scheduled_at && !sendNow) {
        const scheduledTime = new Date(campaign.scheduled_at);
        if (scheduledTime > new Date()) {
          // Schedule for later
          await database.query(
            `UPDATE whatsapp_campaigns 
             SET status = 'scheduled', updated_at = NOW()
             WHERE id = $1`,
            [campaignId]
          );

          // Start scheduler if not running
          this.startScheduler();

          return {
            ...campaign,
            status: 'scheduled',
            message: 'Campaign scheduled for later delivery'
          };
        }
      }

      // Get account details
      const accountResult = await database.query(
        'SELECT phone_number_id FROM whatsapp_business_accounts WHERE id = $1',
        [campaign.waba_id]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('WhatsApp Business Account not found');
      }

      // Update campaign status
      await database.query(
        `UPDATE whatsapp_campaigns 
         SET status = 'sending', started_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [campaignId]
      );

      // Get pending recipients
      const recipientsResult = await database.query(
        `SELECT * FROM whatsapp_campaign_recipients 
         WHERE campaign_id = $1 AND status = 'pending'
         ORDER BY created_at ASC
         LIMIT 100`,
        [campaignId]
      );

      // Send messages (process in batches to avoid rate limits)
      let sentCount = 0;
      let failedCount = 0;

      for (const recipient of recipientsResult.rows) {
        try {
          // Get template
          const templateResult = await database.query(
            'SELECT * FROM whatsapp_templates WHERE id = $1',
            [campaign.template_id]
          );

          if (templateResult.rows.length === 0) {
            throw new Error('Template not found');
          }

          const template = templateResult.rows[0];
          const recipientVariables = typeof recipient.variables === 'string' 
            ? JSON.parse(recipient.variables) 
            : recipient.variables || {};

          // Build template components with variables
          const components = this.buildTemplateComponents(template, recipientVariables);

          // Send template message
          // Note: sendTemplateMessage expects accountId (database UUID), not waba_id
          const response = await WhatsAppService.sendTemplateMessage(
            campaign.waba_id, // This is the database UUID
            recipient.phone_number,
            template.template_id || template.template_name,
            template.language || 'en',
            components
          );

          // Update recipient status
          await database.query(
            `UPDATE whatsapp_campaign_recipients 
             SET status = 'sent', 
                 sent_at = NOW(),
                 message_id = $1,
                 wamid = $2
             WHERE id = $3`,
            [
              response.messages?.[0]?.id,
              response.messages?.[0]?.id,
              recipient.id
            ]
          );

          sentCount++;

          // Rate limiting - wait 1 second between messages
          await this.delay(1000);
        } catch (error) {
          logger.error('Error sending campaign message:', { recipientId: recipient.id, error: error.message });

          // Update recipient status
          await database.query(
            `UPDATE whatsapp_campaign_recipients 
             SET status = 'failed', 
                 error_message = $1
             WHERE id = $2`,
            [error.message, recipient.id]
          );

          failedCount++;
        }
      }

      // Update campaign statistics
      await database.query(
        `UPDATE whatsapp_campaigns 
         SET sent_count = sent_count + $1,
             failed_count = failed_count + $2,
             updated_at = NOW()
         WHERE id = $3`,
        [sentCount, failedCount, campaignId]
      );

      // Check if all recipients are processed
      const remainingResult = await database.query(
        `SELECT COUNT(*) as remaining 
         FROM whatsapp_campaign_recipients 
         WHERE campaign_id = $1 AND status = 'pending'`,
        [campaignId]
      );

      const remaining = parseInt(remainingResult.rows[0].remaining);

      if (remaining === 0) {
        // All recipients processed
        await database.query(
          `UPDATE whatsapp_campaigns 
           SET status = 'completed', completed_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [campaignId]
        );
      }

      logger.info('Campaign sending progress', {
        campaignId,
        sent: sentCount,
        failed: failedCount,
        remaining
      });

      return {
        campaignId,
        sent: sentCount,
        failed: failedCount,
        remaining,
        status: remaining === 0 ? 'completed' : 'sending'
      };
    } catch (error) {
      logger.error('Error sending campaign:', error);
      
      // Update campaign status to failed
      await database.query(
        `UPDATE whatsapp_campaigns 
         SET status = 'failed', updated_at = NOW()
         WHERE id = $1`,
        [campaignId]
      );

      throw error;
    }
  }

  /**
   * Build template components with variables
   */
  buildTemplateComponents(template, variables) {
    const components = [];

    // Body component with variables
    if (template.body_text) {
      let bodyText = template.body_text;
      const bodyVars = [];

      // Extract variables from body text ({{1}}, {{2}}, etc.)
      const varMatches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
      for (const match of varMatches) {
        const varNum = parseInt(match.replace(/\{\{|\}\}/g, ''));
        const varValue = variables[`var${varNum}`] || variables[varNum] || '';
        bodyText = bodyText.replace(match, varValue);
        bodyVars.push({ type: 'text', text: varValue });
      }

      if (bodyVars.length > 0) {
        components.push({
          type: 'body',
          parameters: bodyVars
        });
      }
    }

    // Header component with variables (if applicable)
    if (template.header_type === 'TEXT' && template.header_content) {
      let headerText = template.header_content;
      const headerVars = [];

      const varMatches = headerText.match(/\{\{(\d+)\}\}/g) || [];
      for (const match of varMatches) {
        const varNum = parseInt(match.replace(/\{\{|\}\}/g, ''));
        const varValue = variables[`var${varNum}`] || variables[varNum] || '';
        headerText = headerText.replace(match, varValue);
        headerVars.push({ type: 'text', text: varValue });
      }

      if (headerVars.length > 0) {
        components.push({
          type: 'header',
          parameters: headerVars
        });
      }
    }

    return components;
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId, userId) {
    try {
      // Verify ownership
      const campaignCheck = await database.query(
        'SELECT id FROM whatsapp_campaigns WHERE id = $1 AND user_id = $2',
        [campaignId, userId]
      );

      if (campaignCheck.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      const statsResult = await database.query(
        `SELECT 
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'sent') as sent,
           COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
           COUNT(*) FILTER (WHERE status = 'read') as read,
           COUNT(*) FILTER (WHERE status = 'failed') as failed,
           COUNT(*) FILTER (WHERE status = 'pending') as pending
         FROM whatsapp_campaign_recipients
         WHERE campaign_id = $1`,
        [campaignId]
      );

      const stats = statsResult.rows[0];

      // Calculate percentages
      const total = parseInt(stats.total);
      const delivered = parseInt(stats.delivered);
      const read = parseInt(stats.read);

      return {
        total,
        sent: parseInt(stats.sent),
        delivered,
        read,
        failed: parseInt(stats.failed),
        pending: parseInt(stats.pending),
        deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(2) : 0,
        readRate: total > 0 ? ((read / total) * 100).toFixed(2) : 0,
        failureRate: total > 0 ? ((parseInt(stats.failed) / total) * 100).toFixed(2) : 0
      };
    } catch (error) {
      logger.error('Error getting campaign stats:', error);
      throw error;
    }
  }

  /**
   * Update campaign status from webhook
   */
  async updateCampaignRecipientStatus(wamid, status, timestamp) {
    try {
      // Find recipient by message ID
      const recipientResult = await database.query(
        `SELECT cr.*, c.id as campaign_id
         FROM whatsapp_campaign_recipients cr
         JOIN whatsapp_campaigns c ON cr.campaign_id = c.id
         WHERE cr.wamid = $1 OR cr.message_id = $1`,
        [wamid]
      );

      if (recipientResult.rows.length === 0) {
        return;
      }

      const recipient = recipientResult.rows[0];
      const updateFields = ['status = $1'];
      const values = [status];
      let paramCount = 2;

      if (status === 'delivered' && timestamp) {
        updateFields.push(`delivered_at = $${paramCount++}`);
        values.push(new Date(timestamp * 1000));
      } else if (status === 'read' && timestamp) {
        updateFields.push(`read_at = $${paramCount++}`);
        values.push(new Date(timestamp * 1000));
      }

      values.push(recipient.id);

      await database.query(
        `UPDATE whatsapp_campaign_recipients 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramCount++}`,
        values
      );

      // Update campaign statistics
      await database.query(
        `UPDATE whatsapp_campaigns 
         SET ${status === 'delivered' ? 'delivered_count = delivered_count + 1' : ''}
             ${status === 'read' ? 'read_count = read_count + 1' : ''}
             ${status === 'failed' ? 'failed_count = failed_count + 1' : ''},
             updated_at = NOW()
         WHERE id = $1`,
        [recipient.campaign_id]
      );
    } catch (error) {
      logger.error('Error updating campaign recipient status:', error);
    }
  }

  /**
   * Start scheduler for scheduled campaigns
   */
  startScheduler() {
    if (this.isSchedulerRunning) {
      return;
    }

    this.isSchedulerRunning = true;

    // Check for scheduled campaigns every minute
    cron.schedule('* * * * *', async () => {
      try {
        const scheduledCampaigns = await database.query(
          `SELECT * FROM whatsapp_campaigns 
           WHERE status = 'scheduled' 
             AND scheduled_at <= NOW()
           LIMIT 10`
        );

        for (const campaign of scheduledCampaigns.rows) {
          try {
            await this.sendCampaign(campaign.id, campaign.user_id, true);
          } catch (error) {
            logger.error('Error processing scheduled campaign:', { campaignId: campaign.id, error });
          }
        }
      } catch (error) {
        logger.error('Error in campaign scheduler:', error);
      }
    });

    logger.info('WhatsApp campaign scheduler started');
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId, userId) {
    try {
      // Check ownership
      const checkResult = await database.query(
        'SELECT id, status FROM whatsapp_campaigns WHERE id = $1 AND user_id = $2',
        [campaignId, userId]
      );

      if (checkResult.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      // Can't delete campaigns that are sending or completed
      if (checkResult.rows[0].status === 'sending') {
        throw new Error('Cannot delete campaign that is currently sending');
      }

      await database.query(
        'DELETE FROM whatsapp_campaigns WHERE id = $1',
        [campaignId]
      );

      return { success: true };
    } catch (error) {
      logger.error('Error deleting campaign:', error);
      throw error;
    }
  }
}

module.exports = new WhatsAppCampaignService();
