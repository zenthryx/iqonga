const express = require('express');
const router = express.Router();
const database = require('../database/connection');
const logger = require('../utils/logger');
const WhatsAppService = require('../services/WhatsAppService');
const WhatsAppCampaignService = require('../services/WhatsAppCampaignService');
const WhatsAppBotService = require('../services/WhatsAppBotService');

/**
 * WhatsApp Webhook Handler
 * Handles webhook events from WhatsApp Business API
 */

// GET /api/whatsapp/webhook - Webhook verification
router.get('/webhook', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('WhatsApp webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      logger.warn('WhatsApp webhook verification failed', { mode, token: token ? 'provided' : 'missing' });
      res.sendStatus(403);
    }
  } catch (error) {
    logger.error('Error verifying webhook:', error);
    res.sendStatus(500);
  }
});

// POST /api/whatsapp/webhook - Webhook events
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const body = req.body;

    // Log webhook event
    logger.info('WhatsApp webhook received', { object: body.object, entryCount: body.entry?.length });

    // Verify webhook signature (optional but recommended)
    // const signature = req.headers['x-hub-signature-256'];
    // if (!verifySignature(body, signature)) {
    //   return res.sendStatus(403);
    // }

    if (body.object === 'whatsapp_business_account') {
      // Process each entry
      for (const entry of body.entry || []) {
        const wabaId = entry.id;

        // Process each change
        for (const change of entry.changes || []) {
          await processWebhookEvent(wabaId, change);
        }
      }
    }

    // Always return 200 to acknowledge receipt
    res.sendStatus(200);
  } catch (error) {
    logger.error('Error processing webhook:', error);
    // Still return 200 to prevent retries
    res.sendStatus(200);
  }
});

/**
 * Process webhook event
 */
async function processWebhookEvent(wabaId, change) {
  try {
    const { field, value } = change;

    // Log event to database
    await database.query(
      `INSERT INTO whatsapp_webhook_events (waba_id, event_type, event_data)
       VALUES (
         (SELECT id FROM whatsapp_business_accounts WHERE waba_id = $1 LIMIT 1),
         $2,
         $3
       )`,
      [wabaId, field, JSON.stringify(value)]
    );

    // Process based on field type
    switch (field) {
      case 'messages':
        await handleMessageEvent(wabaId, value);
        break;
      case 'message_status':
        await handleStatusEvent(wabaId, value);
        break;
      case 'message_template_status_update':
        await handleTemplateStatusEvent(wabaId, value);
        break;
      default:
        logger.info(`Unhandled webhook field: ${field}`);
    }

    // Mark event as processed
    await database.query(
      `UPDATE whatsapp_webhook_events 
       SET processed = true, processed_at = NOW()
       WHERE event_type = $1 AND processed = false
       ORDER BY created_at DESC LIMIT 1`,
      [field]
    );
  } catch (error) {
    logger.error('Error processing webhook event:', error);
    throw error;
  }
}

/**
 * Handle incoming message event
 */
async function handleMessageEvent(wabaId, value) {
  try {
    const messages = value.messages || [];
    const contacts = value.contacts || [];
    const metadata = value.metadata || {};

    for (const message of messages) {
      const contact = contacts.find(c => c.wa_id === message.from);
      
      // Get WABA database ID
      const wabaResult = await database.query(
        'SELECT id, user_id FROM whatsapp_business_accounts WHERE waba_id = $1 LIMIT 1',
        [wabaId]
      );

      if (wabaResult.rows.length === 0) {
        logger.warn(`WABA not found: ${wabaId}`);
        continue;
      }

      const dbWabaId = wabaResult.rows[0].id;
      const userId = wabaResult.rows[0].user_id;

      // Get or create contact
      let contactId;
      const contactResult = await database.query(
        `INSERT INTO whatsapp_contacts (user_id, waba_id, phone_number, name, profile_name, last_message_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id, waba_id, phone_number) 
         DO UPDATE SET 
           profile_name = COALESCE(EXCLUDED.profile_name, whatsapp_contacts.profile_name),
           last_message_at = NOW(),
           updated_at = NOW()
         RETURNING id`,
        [
          userId,
          dbWabaId,
          message.from,
          contact?.profile?.name || null,
          contact?.profile?.name || null
        ]
      );
      contactId = contactResult.rows[0].id;

      // Determine message type and content
      let messageType = 'text';
      let textContent = null;
      let mediaUrl = null;
      let mediaId = null;
      let caption = null;

      if (message.type === 'text') {
        messageType = 'text';
        textContent = message.text?.body || null;
      } else if (message.type === 'image') {
        messageType = 'image';
        mediaId = message.image?.id;
        caption = message.image?.caption || null;
      } else if (message.type === 'video') {
        messageType = 'video';
        mediaId = message.video?.id;
        caption = message.video?.caption || null;
      } else if (message.type === 'audio') {
        messageType = 'audio';
        mediaId = message.audio?.id;
      } else if (message.type === 'document') {
        messageType = 'document';
        mediaId = message.document?.id;
        caption = message.document?.caption || null;
      } else if (message.type === 'location') {
        messageType = 'location';
        textContent = JSON.stringify({
          latitude: message.location?.latitude,
          longitude: message.location?.longitude,
          name: message.location?.name,
          address: message.location?.address
        });
      } else if (message.type === 'contacts') {
        messageType = 'contacts';
        textContent = JSON.stringify(message.contacts);
      }

      // Store message
      const messageResult = await database.query(
        `INSERT INTO whatsapp_messages 
         (user_id, waba_id, contact_id, wamid, direction, message_type, text_content, media_id, caption, status, sent_at)
         VALUES ($1, $2, $3, $4, 'inbound', $5, $6, $7, $8, 'delivered', NOW())
         RETURNING id`,
        [
          userId,
          dbWabaId,
          contactId,
          message.id,
          messageType,
          textContent,
          mediaId,
          caption
        ]
      );

      logger.info(`Incoming message stored: ${message.id} from ${message.from}`);

      // Check if this is the first message from this contact
      const isFirstMessage = await WhatsAppBotService.isFirstMessage(contactId);

      // Process bots for text messages only
      if (messageType === 'text' && textContent) {
        try {
          // Find matching bot
          const matchingBot = await WhatsAppBotService.processIncomingMessage(
            userId,
            dbWabaId,
            contactId,
            message.from,
            textContent,
            isFirstMessage
          );

          if (matchingBot) {
            // Execute bot response
            await WhatsAppBotService.executeBotResponse(
              matchingBot,
              userId,
              dbWabaId,
              contactId,
              message.from,
              textContent,
              {
                contactName: contact?.profile?.name || null,
                customFields: {}
              }
            );

            logger.info(`Bot response sent`, { botId: matchingBot.id, contactId, messageId: message.id });
          }
        } catch (botError) {
          // Don't fail message processing if bot fails
          logger.error('Error processing bot response:', botError);
        }
      }
    }
  } catch (error) {
    logger.error('Error handling message event:', error);
    throw error;
  }
}

/**
 * Handle message status event
 */
async function handleStatusEvent(wabaId, value) {
  try {
    const statuses = value.statuses || [];

    for (const status of statuses) {
      const wamid = status.id;
      const messageStatus = status.status; // sent, delivered, read, failed
      const timestamp = status.timestamp;

      // Update message status
      await WhatsAppService.updateMessageStatus(wamid, messageStatus, timestamp);

      // Update campaign recipient status if this is a campaign message
      await WhatsAppCampaignService.updateCampaignRecipientStatus(wamid, messageStatus, timestamp);

      // If failed, log error
      if (messageStatus === 'failed') {
        await database.query(
          `UPDATE whatsapp_messages 
           SET error_code = $1, error_message = $2
           WHERE wamid = $3`,
          [
            status.errors?.[0]?.code || null,
            status.errors?.[0]?.title || null,
            wamid
          ]
        );
      }

      logger.info(`Message status updated: ${wamid} -> ${messageStatus}`);
    }
  } catch (error) {
    logger.error('Error handling status event:', error);
    throw error;
  }
}

/**
 * Handle template status event
 */
async function handleTemplateStatusEvent(wabaId, value) {
  try {
    const event = value.event; // APPROVED, REJECTED, PENDING
    const messageTemplateId = value.message_template_id;
    const messageTemplateName = value.message_template_name;
    const reason = value.reason || null;

    // Update template status in database
    await database.query(
      `UPDATE whatsapp_templates 
       SET status = $1, 
           template_id = $2,
           rejection_reason = $3,
           updated_at = NOW()
       WHERE template_name = $4 
         AND waba_id = (SELECT id FROM whatsapp_business_accounts WHERE waba_id = $5 LIMIT 1)`,
      [
        event.toLowerCase(),
        messageTemplateId,
        reason,
        messageTemplateName,
        wabaId
      ]
    );

    logger.info(`Template status updated: ${messageTemplateName} -> ${event}`);
  } catch (error) {
    logger.error('Error handling template status event:', error);
    throw error;
  }
}

module.exports = router;
