const axios = require('axios');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { encrypt, decrypt } = require('../utils/encryption');

/**
 * WhatsApp Business API Service
 * Handles all interactions with WhatsApp Business API (Cloud API)
 */
class WhatsAppService {
  constructor() {
    this.baseURL = 'https://graph.facebook.com/v18.0';
    this.apiVersion = 'v18.0';
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Get access token for a WABA
   * @param {string|UUID} identifier - Can be database ID (UUID) or phone_number_id
   */
  async getAccessToken(identifier) {
    try {
      // Check if it's a UUID (database ID) or phone_number_id
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      
      let query, params;
      if (isUUID) {
        query = 'SELECT access_token, phone_number_id FROM whatsapp_business_accounts WHERE id = $1';
        params = [identifier];
      } else {
        query = 'SELECT access_token, phone_number_id FROM whatsapp_business_accounts WHERE phone_number_id = $1';
        params = [identifier];
      }

      const result = await database.query(query, params);

      if (result.rows.length === 0) {
        throw new Error('WhatsApp Business Account not found');
      }

      return {
        accessToken: decrypt(result.rows[0].access_token),
        phoneNumberId: result.rows[0].phone_number_id
      };
    } catch (error) {
      logger.error('Error getting access token:', error);
      throw error;
    }
  }

  /**
   * Make API request with retry logic
   */
  async makeRequest(method, url, data = null, accessToken, retries = 0) {
    try {
      const config = {
        method,
        url,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      // Handle rate limiting
      if (error.response?.status === 429 && retries < this.maxRetries) {
        const retryAfter = error.response.headers['retry-after'] || this.retryDelay;
        logger.warn(`Rate limited, retrying after ${retryAfter}ms`);
        await this.delay(retryAfter);
        return this.makeRequest(method, url, data, accessToken, retries + 1);
      }

      // Handle other errors
      if (error.response) {
        logger.error('WhatsApp API Error:', {
          status: error.response.status,
          data: error.response.data,
          url
        });
        throw new Error(`WhatsApp API Error: ${error.response.data?.error?.message || error.message}`);
      }

      throw error;
    }
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Send text message
   */
  async sendTextMessage(accountId, to, message, options = {}) {
    try {
      const { accessToken, phoneNumberId } = await this.getAccessToken(accountId);
      const url = `${this.baseURL}/${phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(to),
        type: 'text',
        text: {
          preview_url: options.previewUrl || false,
          body: message
        }
      };

      const response = await this.makeRequest('POST', url, payload, accessToken);
      
      // Store message in database
      await this.storeMessage({
        userId: options.userId,
        wabaId: accountId,
        contactPhone: to,
        direction: 'outbound',
        messageType: 'text',
        textContent: message,
        wamid: response.messages?.[0]?.id,
        status: 'sent'
      });

      return response;
    } catch (error) {
      logger.error('Error sending text message:', error);
      throw error;
    }
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(accountId, to, templateName, language, components = []) {
    try {
      const { accessToken, phoneNumberId } = await this.getAccessToken(accountId);
      const url = `${this.baseURL}/${phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(to),
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language || 'en'
          },
          components: components
        }
      };

      const response = await this.makeRequest('POST', url, payload, accessToken);
      
      // Store message in database
      await this.storeMessage({
        wabaId: accountId,
        contactPhone: to,
        direction: 'outbound',
        messageType: 'template',
        templateName: templateName,
        wamid: response.messages?.[0]?.id,
        status: 'sent'
      });

      return response;
    } catch (error) {
      logger.error('Error sending template message:', error);
      throw error;
    }
  }

  /**
   * Send media message (image, video, audio, document)
   */
  async sendMediaMessage(accountId, to, mediaType, mediaUrl, caption = '') {
    try {
      const { accessToken, phoneNumberId } = await this.getAccessToken(accountId);
      const url = `${this.baseURL}/${phoneNumberId}/messages`;

      // First, upload media if needed
      const mediaId = await this.uploadMedia(phoneNumberId, mediaUrl, mediaType, accessToken);

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(to),
        type: mediaType,
        [mediaType]: {
          id: mediaId,
          caption: caption || undefined
        }
      };

      const response = await this.makeRequest('POST', url, payload, accessToken);
      
      // Store message in database
      await this.storeMessage({
        wabaId: accountId,
        contactPhone: to,
        direction: 'outbound',
        messageType: mediaType,
        mediaUrl: mediaUrl,
        mediaId: mediaId,
        caption: caption,
        wamid: response.messages?.[0]?.id,
        status: 'sent'
      });

      return response;
    } catch (error) {
      logger.error('Error sending media message:', error);
      throw error;
    }
  }

  /**
   * Upload media to WhatsApp
   */
  async uploadMedia(phoneNumberId, mediaUrl, mediaType, accessToken = null) {
    try {
      if (!accessToken) {
        accessToken = await this.getAccessToken(phoneNumberId);
      }

      // For now, return the media URL directly
      // WhatsApp Cloud API can handle URLs directly for some media types
      // For production, you may want to download and re-upload to WhatsApp
      // This requires form-data package: npm install form-data
      
      // Download media from URL
      const mediaResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
      const mediaBuffer = Buffer.from(mediaResponse.data);

      // Use form-data for multipart upload
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', this.getMediaMimeType(mediaType));
      formData.append('file', mediaBuffer, {
        filename: `media.${this.getMediaExtension(mediaType)}`,
        contentType: this.getMediaMimeType(mediaType)
      });

      // Upload to WhatsApp
      const uploadUrl = `${this.baseURL}/${phoneNumberId}/media`;
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...formData.getHeaders()
        }
      });

      return response.data.id;
    } catch (error) {
      logger.error('Error uploading media:', error);
      throw error;
    }
  }

  /**
   * Get media MIME type
   */
  getMediaMimeType(mediaType) {
    const mimeTypes = {
      image: 'image/jpeg',
      video: 'video/mp4',
      audio: 'audio/mpeg',
      document: 'application/pdf'
    };
    return mimeTypes[mediaType] || 'application/octet-stream';
  }

  /**
   * Get media file extension
   */
  getMediaExtension(mediaType) {
    const extensions = {
      image: 'jpg',
      video: 'mp4',
      audio: 'mp3',
      document: 'pdf'
    };
    return extensions[mediaType] || 'bin';
  }

  /**
   * Get message status
   */
  async getMessageStatus(accountId, messageId) {
    try {
      const { accessToken } = await this.getAccessToken(accountId);
      const url = `${this.baseURL}/${messageId}`;

      const response = await this.makeRequest('GET', url, null, accessToken);
      return response;
    } catch (error) {
      logger.error('Error getting message status:', error);
      throw error;
    }
  }

  /**
   * Create message template
   */
  async createTemplate(wabaId, templateData) {
    try {
      const accessToken = await this.getAccessToken(wabaId);
      const url = `${this.baseURL}/${wabaId}/message_templates`;

      const payload = {
        name: templateData.name,
        category: templateData.category, // MARKETING, UTILITY, AUTHENTICATION
        language: templateData.language || 'en',
        components: templateData.components
      };

      const response = await this.makeRequest('POST', url, payload, accessToken);
      return response;
    } catch (error) {
      logger.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Get templates
   */
  async getTemplates(wabaId) {
    try {
      const accessToken = await this.getAccessToken(wabaId);
      const url = `${this.baseURL}/${wabaId}/message_templates`;

      const response = await this.makeRequest('GET', url, null, accessToken);
      return response.data || [];
    } catch (error) {
      logger.error('Error getting templates:', error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(wabaId, templateName) {
    try {
      const accessToken = await this.getAccessToken(wabaId);
      const url = `${this.baseURL}/${wabaId}/message_templates?name=${templateName}`;

      const response = await this.makeRequest('DELETE', url, null, accessToken);
      return response;
    } catch (error) {
      logger.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Verify webhook
   */
  verifyWebhook(mode, token, challenge, verifyToken) {
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return null;
  }

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
   * Store message in database
   */
  async storeMessage(messageData) {
    try {
      const {
        userId,
        wabaId,
        contactId,
        contactPhone,
        direction,
        messageType,
        textContent,
        mediaUrl,
        mediaId,
        caption,
        templateName,
        wamid,
        status
      } = messageData;

      // Get user_id and waba_id if not provided
      let finalUserId = userId;
      let finalWabaId = wabaId;

      if (!finalWabaId && contactPhone) {
        // Get waba_id from phone number
        const wabaResult = await database.query(
          'SELECT id, user_id FROM whatsapp_business_accounts WHERE phone_number = $1 LIMIT 1',
          [this.formatPhoneNumber(contactPhone)]
        );
        if (wabaResult.rows.length > 0) {
          finalWabaId = wabaResult.rows[0].id;
          finalUserId = finalUserId || wabaResult.rows[0].user_id;
        }
      }

      // Get or create contact
      let finalContactId = contactId;
      if (!finalContactId && contactPhone && finalWabaId) {
        const contactResult = await database.query(
          `INSERT INTO whatsapp_contacts (user_id, waba_id, phone_number, name)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, waba_id, phone_number) 
           DO UPDATE SET updated_at = NOW()
           RETURNING id`,
          [finalUserId, finalWabaId, this.formatPhoneNumber(contactPhone), null]
        );
        finalContactId = contactResult.rows[0]?.id;
      }

      // Insert message
      const result = await database.query(
        `INSERT INTO whatsapp_messages 
         (user_id, waba_id, contact_id, wamid, direction, message_type, text_content, media_url, media_id, caption, status, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         RETURNING id`,
        [
          finalUserId,
          finalWabaId,
          finalContactId,
          wamid,
          direction,
          messageType,
          textContent,
          mediaUrl,
          mediaId,
          caption,
          status
        ]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error storing message:', error);
      throw error;
    }
  }

  /**
   * Update message status
   */
  async updateMessageStatus(wamid, status, timestamp = null) {
    try {
      const updateFields = ['status = $2'];
      const values = [wamid, status];

      if (status === 'delivered' && timestamp) {
        updateFields.push('delivered_at = $3');
        values.push(new Date(timestamp * 1000));
      } else if (status === 'read' && timestamp) {
        updateFields.push('read_at = $3');
        values.push(new Date(timestamp * 1000));
      }

      await database.query(
        `UPDATE whatsapp_messages 
         SET ${updateFields.join(', ')}
         WHERE wamid = $1`,
        values
      );
    } catch (error) {
      logger.error('Error updating message status:', error);
      throw error;
    }
  }

  /**
   * Get phone number information
   */
  async getPhoneNumberInfo(accountId) {
    try {
      const { accessToken, phoneNumberId } = await this.getAccessToken(accountId);
      const url = `${this.baseURL}/${phoneNumberId}`;

      const response = await this.makeRequest('GET', url, null, accessToken);
      return response;
    } catch (error) {
      logger.error('Error getting phone number info:', error);
      throw error;
    }
  }
}

module.exports = new WhatsAppService();
