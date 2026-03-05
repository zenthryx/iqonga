/**
 * SMTP Email Service
 * Handles email sending via generic SMTP protocol
 * Supports Gmail (via app password), Outlook, Yahoo, iCloud, and custom SMTP servers
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const database = require('../database/connection');
const imapService = require('./IMAPService');

class SMTPService {
  constructor() {
    this.transporters = new Map(); // Cache transporters by account ID
  }

  /**
   * Test SMTP connection with provided credentials
   */
  async testConnection(config) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort || 587,
        secure: config.smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: config.email,
          pass: config.password
        },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      await transporter.verify();
      
      return { success: true, message: 'SMTP connection successful' };
    } catch (error) {
      logger.error('SMTP connection test failed:', error);
      throw new Error(error.message || 'SMTP connection failed');
    }
  }

  /**
   * Create or get cached transporter for an account
   */
  async getTransporter(accountId) {
    // Check cache first
    if (this.transporters.has(accountId)) {
      return this.transporters.get(accountId);
    }

    // Get account credentials
    const account = await imapService.getAccountCredentials(accountId);
    
    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port || 587,
      secure: account.smtp_port === 465,
      auth: {
        user: account.email_address,
        pass: account.password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Cache the transporter
    this.transporters.set(accountId, transporter);
    
    return transporter;
  }

  /**
   * Clear cached transporter (e.g., when credentials change)
   */
  clearTransporter(accountId) {
    this.transporters.delete(accountId);
  }

  /**
   * Send an email
   */
  async sendEmail(accountId, emailOptions) {
    try {
      const transporter = await this.getTransporter(accountId);
      
      // Get account for sender info
      const accountResult = await database.query(
        'SELECT email_address, display_name FROM user_email_accounts WHERE id = $1',
        [accountId]
      );
      
      if (accountResult.rows.length === 0) {
        throw new Error('Email account not found');
      }

      const account = accountResult.rows[0];

      // Build email options
      const mailOptions = {
        from: emailOptions.from || `"${account.display_name || account.email_address}" <${account.email_address}>`,
        to: emailOptions.to,
        cc: emailOptions.cc,
        bcc: emailOptions.bcc,
        subject: emailOptions.subject,
        text: emailOptions.text,
        html: emailOptions.html,
        replyTo: emailOptions.replyTo,
        inReplyTo: emailOptions.inReplyTo,
        references: emailOptions.references,
        attachments: emailOptions.attachments
      };

      // Send email
      const result = await transporter.sendMail(mailOptions);
      
      logger.info(`Email sent via SMTP from ${account.email_address} to ${emailOptions.to}`);

      // Update last SMTP check time
      await database.query(
        'UPDATE user_email_accounts SET last_smtp_check_at = NOW() WHERE id = $1',
        [accountId]
      );

      return {
        success: true,
        messageId: result.messageId,
        response: result.response
      };
    } catch (error) {
      logger.error('Error sending email via SMTP:', error);
      
      // Update connection status on error
      await database.query(
        'UPDATE user_email_accounts SET connection_status = $1, last_connection_error = $2 WHERE id = $3',
        ['error', error.message, accountId]
      );

      // Clear cached transporter
      this.clearTransporter(accountId);

      throw error;
    }
  }

  /**
   * Send a reply to an existing email
   */
  async sendReply(accountId, originalMessageId, replyOptions) {
    try {
      // Get original message for threading
      const originalMessage = await database.query(
        'SELECT * FROM email_messages WHERE id = $1',
        [originalMessageId]
      );

      if (originalMessage.rows.length === 0) {
        throw new Error('Original message not found');
      }

      const original = originalMessage.rows[0];

      // Build reply with proper threading headers
      const replyTo = original.from_email;
      const subject = original.subject.startsWith('Re:') 
        ? original.subject 
        : `Re: ${original.subject}`;

      return this.sendEmail(accountId, {
        to: replyTo,
        subject,
        text: replyOptions.text,
        html: replyOptions.html,
        inReplyTo: original.provider_message_id,
        references: original.provider_message_id,
        attachments: replyOptions.attachments
      });
    } catch (error) {
      logger.error('Error sending reply:', error);
      throw error;
    }
  }

  /**
   * Send a draft reply (AI-generated)
   */
  async sendDraftReply(draftId) {
    try {
      // Get draft
      const draftResult = await database.query(`
        SELECT dr.*, em.account_id
        FROM email_draft_replies dr
        JOIN email_messages em ON dr.message_id = em.id
        WHERE dr.id = $1
      `, [draftId]);

      if (draftResult.rows.length === 0) {
        throw new Error('Draft not found');
      }

      const draft = draftResult.rows[0];

      // Send the reply
      const result = await this.sendReply(draft.account_id, draft.message_id, {
        text: draft.draft_body,
        html: draft.draft_html
      });

      // Mark draft as used
      await database.query(
        'UPDATE email_draft_replies SET is_used = true, used_at = NOW() WHERE id = $1',
        [draftId]
      );

      return result;
    } catch (error) {
      logger.error('Error sending draft reply:', error);
      throw error;
    }
  }

  /**
   * Forward an email
   */
  async forwardEmail(accountId, originalMessageId, forwardOptions) {
    try {
      // Get original message
      const originalMessage = await database.query(
        'SELECT * FROM email_messages WHERE id = $1',
        [originalMessageId]
      );

      if (originalMessage.rows.length === 0) {
        throw new Error('Original message not found');
      }

      const original = originalMessage.rows[0];

      // Build forwarded message
      const subject = original.subject.startsWith('Fwd:') 
        ? original.subject 
        : `Fwd: ${original.subject}`;

      const forwardedText = `
${forwardOptions.message || ''}

---------- Forwarded message ---------
From: ${original.from_name || original.from_email} <${original.from_email}>
Date: ${new Date(original.received_at).toLocaleString()}
Subject: ${original.subject}
To: ${(original.to_emails || []).join(', ')}

${original.body_text || ''}
`.trim();

      const forwardedHtml = `
${forwardOptions.message ? `<p>${forwardOptions.message}</p><br>` : ''}
<hr>
<p><b>---------- Forwarded message ---------</b><br>
From: ${original.from_name || original.from_email} &lt;${original.from_email}&gt;<br>
Date: ${new Date(original.received_at).toLocaleString()}<br>
Subject: ${original.subject}<br>
To: ${(original.to_emails || []).join(', ')}</p>
<br>
${original.body_html || original.body_text || ''}
`;

      return this.sendEmail(accountId, {
        to: forwardOptions.to,
        cc: forwardOptions.cc,
        subject,
        text: forwardedText,
        html: forwardedHtml,
        attachments: forwardOptions.attachments
      });
    } catch (error) {
      logger.error('Error forwarding email:', error);
      throw error;
    }
  }

  /**
   * Save email to sent folder via IMAP (if supported)
   */
  async saveToSent(accountId, rawEmail) {
    // This would append the sent email to the Sent folder via IMAP
    // Implementation depends on server support
    // For now, we'll skip this as most SMTP servers auto-save to Sent
    logger.info(`Would save email to Sent folder for account ${accountId}`);
  }
}

module.exports = new SMTPService();

