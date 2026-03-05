/**
 * Sales Email Service
 * Handles sending emails from Sales & CRM with tracking capabilities
 */

const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const SMTPService = require('./SMTPService');
const GmailService = require('./GmailService');
const EmailTemplateService = require('./EmailTemplateService');
const ActivityTrackingService = require('./ActivityTrackingService');

class SalesEmailService {
  /**
   * Send an email from a lead or deal page
   * @param {number} userId 
   * @param {object} emailData 
   * @returns {Promise<object>}
   */
  async sendSalesEmail(userId, emailData) {
    try {
      const {
        leadId,
        dealId,
        emailAccountId,
        templateId,
        to,
        cc,
        bcc,
        subject,
        bodyHtml,
        bodyText,
        useTracking = true
      } = emailData;

      // Validate required fields
      if (!to || !subject || !bodyHtml) {
        throw new Error('Missing required fields: to, subject, bodyHtml');
      }

      if (!leadId && !dealId) {
        throw new Error('Either leadId or dealId must be provided');
      }

      // Generate tracking ID
      const trackingId = uuidv4();

      // Add tracking pixel to HTML if tracking is enabled
      let finalBodyHtml = bodyHtml;
      if (useTracking) {
        finalBodyHtml = this.addTrackingPixel(bodyHtml, trackingId);
        finalBodyHtml = await this.addLinkTracking(finalBodyHtml, trackingId);
      }

      // Get email account details
      const accountResult = await database.query(
        'SELECT * FROM user_email_accounts WHERE id = $1 AND user_id = $2',
        [emailAccountId, userId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Email account not found or unauthorized');
      }

      const emailAccount = accountResult.rows[0];

      // Send email via appropriate service
      let sendResult;
      if (emailAccount.provider === 'gmail' && emailAccount.access_token) {
        // Use Gmail API
        sendResult = await GmailService.sendEmail(userId, {
          to,
          cc,
          bcc,
          subject,
          body: bodyText || this.htmlToPlainText(bodyHtml),
          html: finalBodyHtml
        });
      } else {
        // Use SMTP
        sendResult = await SMTPService.sendEmail(emailAccountId, {
          to,
          cc: cc ? cc.join(', ') : null,
          bcc: bcc ? bcc.join(', ') : null,
          subject,
          text: bodyText || this.htmlToPlainText(bodyHtml),
          html: finalBodyHtml
        });
      }

      // Record sent email in database
      const sentEmailId = uuidv4();
      const sentEmailResult = await database.query(
        `INSERT INTO sales_emails_sent (
          id, user_id, lead_id, deal_id, email_account_id, template_id,
          to_email, cc_emails, bcc_emails, subject, body_text, body_html,
          tracking_id, message_id, sent_status, sent_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          sentEmailId,
          userId,
          leadId || null,
          dealId || null,
          emailAccountId,
          templateId || null,
          to,
          cc || [],
          bcc || [],
          subject,
          bodyText || this.htmlToPlainText(bodyHtml),
          bodyHtml,
          trackingId,
          sendResult.messageId || null,
          'sent',
          userId
        ]
      );

      const sentEmail = sentEmailResult.rows[0];

      // Log activity
      const activityData = {
        leadId,
        dealId,
        type: 'email',
        subject: `Email sent: ${subject}`,
        notes: `Sent to: ${to}`,
        status: 'completed',
        assignedTo: userId
      };

      const activity = await ActivityTrackingService.logActivity(userId, activityData);

      // Link activity to sent email
      await database.query(
        'UPDATE sales_emails_sent SET activity_id = $1 WHERE id = $2',
        [activity.id, sentEmailId]
      );

      await database.query(
        'UPDATE activities SET email_tracking_id = $1 WHERE id = $2',
        [sentEmailId, activity.id]
      );

      // Update lead/deal last_activity_at
      if (leadId) {
        await database.query(
          'UPDATE leads SET last_activity_at = NOW(), updated_at = NOW() WHERE id = $1',
          [leadId]
        );
      }

      if (dealId) {
        await database.query(
          'UPDATE deals SET last_activity_at = NOW(), updated_at = NOW() WHERE id = $1',
          [dealId]
        );
      }

      logger.info('Sales email sent successfully', {
        sentEmailId,
        userId,
        leadId,
        dealId,
        to
      });

      return {
        success: true,
        sentEmail,
        activity
      };
    } catch (error) {
      logger.error('Failed to send sales email:', error);

      // Log failed attempt if we have enough info
      if (emailData.leadId || emailData.dealId) {
        try {
          await database.query(
            `INSERT INTO sales_emails_sent (
              id, user_id, lead_id, deal_id, to_email, subject, body_html,
              sent_status, error_message, sent_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              uuidv4(),
              userId,
              emailData.leadId || null,
              emailData.dealId || null,
              emailData.to,
              emailData.subject,
              emailData.bodyHtml,
              'failed',
              error.message,
              userId
            ]
          );
        } catch (logError) {
          logger.error('Failed to log failed email attempt:', logError);
        }
      }

      throw error;
    }
  }

  /**
   * Track email open
   * @param {string} trackingId 
   * @param {string} ipAddress 
   * @param {string} userAgent 
   * @returns {Promise<void>}
   */
  async trackEmailOpen(trackingId, ipAddress, userAgent) {
    try {
      const result = await database.query(
        `UPDATE sales_emails_sent
         SET 
           opened_at = COALESCE(opened_at, NOW()),
           open_count = open_count + 1
         WHERE tracking_id = $1
         RETURNING id, lead_id, deal_id, opened_at`,
        [trackingId]
      );

      if (result.rows.length > 0) {
        const email = result.rows[0];
        logger.info('Email opened', {
          trackingId,
          emailId: email.id,
          leadId: email.lead_id,
          dealId: email.deal_id,
          firstOpen: email.opened_at
        });

        // If this is the first open, potentially increase lead score
        if (email.opened_at && email.lead_id) {
          // Lead score increase happens via trigger
        }
      }
    } catch (error) {
      logger.error('Failed to track email open:', error);
      // Don't throw - tracking failures shouldn't break email opens
    }
  }

  /**
   * Track email link click
   * @param {string} trackingId 
   * @param {string} originalUrl 
   * @param {string} ipAddress 
   * @param {string} userAgent 
   * @returns {Promise<string>} Original URL to redirect to
   */
  async trackEmailLinkClick(trackingId, originalUrl, ipAddress, userAgent) {
    try {
      // First, update the sent email
      const emailResult = await database.query(
        `UPDATE sales_emails_sent
         SET 
           clicked_at = COALESCE(clicked_at, NOW()),
           click_count = click_count + 1
         WHERE tracking_id = $1
         RETURNING id, lead_id, deal_id`,
        [trackingId]
      );

      if (emailResult.rows.length > 0) {
        const email = emailResult.rows[0];

        // Log the specific link click
        await database.query(
          `INSERT INTO sales_email_link_clicks (
            id, sent_email_id, original_url, tracked_url,
            ip_address, user_agent
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            uuidv4(),
            email.id,
            originalUrl,
            `${process.env.BACKEND_URL || 'https://api.iqonga.org'}/api/sales-email/click/${trackingId}?url=${encodeURIComponent(originalUrl)}`,
            ipAddress,
            userAgent
          ]
        );

        logger.info('Email link clicked', {
          trackingId,
          emailId: email.id,
          leadId: email.lead_id,
          dealId: email.deal_id,
          url: originalUrl
        });
      }

      return originalUrl;
    } catch (error) {
      logger.error('Failed to track email link click:', error);
      // Return original URL even if tracking fails
      return originalUrl;
    }
  }

  /**
   * Get email tracking stats
   * @param {string} sentEmailId 
   * @param {number} userId 
   * @returns {Promise<object>}
   */
  async getEmailStats(sentEmailId, userId) {
    try {
      const emailResult = await database.query(
        `SELECT 
          se.*,
          (SELECT COUNT(*) FROM sales_email_link_clicks WHERE sent_email_id = se.id) as total_link_clicks
         FROM sales_emails_sent se
         WHERE se.id = $1 AND se.user_id = $2`,
        [sentEmailId, userId]
      );

      if (emailResult.rows.length === 0) {
        throw new Error('Email not found or unauthorized');
      }

      const email = emailResult.rows[0];

      // Get link clicks
      const clicksResult = await database.query(
        `SELECT original_url, COUNT(*) as click_count
         FROM sales_email_link_clicks
         WHERE sent_email_id = $1
         GROUP BY original_url
         ORDER BY click_count DESC`,
        [sentEmailId]
      );

      return {
        ...email,
        link_clicks: clicksResult.rows
      };
    } catch (error) {
      logger.error('Failed to get email stats:', error);
      throw error;
    }
  }

  /**
   * Get sent emails for a lead or deal
   * @param {object} filters 
   * @returns {Promise<Array>}
   */
  async getSentEmails(filters = {}) {
    try {
      let query = `
        SELECT 
          se.*,
          u.username as sent_by_name,
          t.template_name,
          a.id as activity_id
        FROM sales_emails_sent se
        LEFT JOIN users u ON se.sent_by = u.id
        LEFT JOIN email_templates t ON se.template_id = t.id
        LEFT JOIN activities a ON se.activity_id = a.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (filters.userId) {
        query += ` AND se.user_id = $${paramIndex}`;
        params.push(filters.userId);
        paramIndex++;
      }

      if (filters.leadId) {
        query += ` AND se.lead_id = $${paramIndex}`;
        params.push(filters.leadId);
        paramIndex++;
      }

      if (filters.dealId) {
        query += ` AND se.deal_id = $${paramIndex}`;
        params.push(filters.dealId);
        paramIndex++;
      }

      if (filters.status) {
        query += ` AND se.sent_status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      query += ` ORDER BY se.sent_at DESC`;

      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
      }

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get sent emails:', error);
      throw error;
    }
  }

  /**
   * Add tracking pixel to email HTML
   * @param {string} html 
   * @param {string} trackingId 
   * @returns {string}
   */
  addTrackingPixel(html, trackingId) {
    const trackingPixel = `<img src="${process.env.BACKEND_URL || 'https://api.iqonga.org'}/api/sales-email/open/${trackingId}" width="1" height="1" style="display:none;" alt="" />`;
    
    // Add before closing body tag, or at the end if no body tag
    if (html.includes('</body>')) {
      return html.replace('</body>', `${trackingPixel}</body>`);
    } else {
      return html + trackingPixel;
    }
  }

  /**
   * Add tracking to all links in email HTML
   * @param {string} html 
   * @param {string} trackingId 
   * @returns {string}
   */
  async addLinkTracking(html, trackingId) {
    // Replace all href attributes with tracked versions
    const trackingBaseUrl = `${process.env.BACKEND_URL || 'https://api.iqonga.org'}/api/sales-email/click/${trackingId}`;
    
    return html.replace(
      /href=["']([^"']+)["']/g,
      (match, url) => {
        // Don't track internal links, mailto:, tel:, or javascript:
        if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('javascript:')) {
          return match;
        }
        
        const trackedUrl = `${trackingBaseUrl}?url=${encodeURIComponent(url)}`;
        return `href="${trackedUrl}"`;
      }
    );
  }

  /**
   * Convert HTML to plain text (simple version)
   * @param {string} html 
   * @returns {string}
   */
  htmlToPlainText(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}

module.exports = new SalesEmailService();

