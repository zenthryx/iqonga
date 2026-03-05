/**
 * Send AI Assistant replies back to WhatsApp (Cloud API).
 * Uses connection.channel_metadata: access_token, phone_number_id.
 * peerId = recipient phone number (e.g. 447700900123).
 */

const axios = require('axios');
const logger = require('../utils/logger');

const BASE_URL = 'https://graph.facebook.com/v18.0';

function formatPhone(peerId) {
  const s = String(peerId).replace(/\D/g, '');
  return s.startsWith('0') ? s.slice(1) : s;
}

class WhatsAppAssistantConnector {
  async sendReply(connection, peerId, messageText) {
    const meta = connection.channel_metadata || {};
    const accessToken = meta.access_token || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = meta.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!accessToken || !phoneNumberId) {
      logger.warn('WhatsAppAssistantConnector: missing access_token or phone_number_id');
      return;
    }
    const to = formatPhone(peerId);
    try {
      await axios.post(
        `${BASE_URL}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body: messageText }
        },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, timeout: 10000 }
      );
    } catch (err) {
      logger.error('WhatsAppAssistantConnector send failed:', err.response?.data || err.message);
      throw err;
    }
  }
}

module.exports = WhatsAppAssistantConnector;
