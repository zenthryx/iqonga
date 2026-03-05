const express = require('express');
const router = express.Router();
const TelegramWebhookService = require('../services/TelegramWebhookService');

// Webhook endpoint to receive Telegram updates
router.post('/webhook/:botToken', async (req, res) => {
  try {
    const { botToken } = req.params;
    const update = req.body;

    console.log(`📨 Received webhook for bot token: ${botToken.substring(0, 10)}...`);

    // Process the update
    const result = await TelegramWebhookService.processUpdate(update, botToken);

    if (result.success) {
      res.status(200).json({ ok: true });
    } else {
      console.error('Webhook processing failed:', result.error);
      res.status(500).json({ ok: false, error: result.error });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Platform bot webhook endpoint (primary endpoint)
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    const platformBotToken = TelegramWebhookService.getPlatformBotToken();
    
    if (!platformBotToken) {
      console.log('❌ Platform bot token not configured');
      return res.status(400).json({ ok: false, error: 'Platform bot not configured' });
    }

    console.log(`📨 Received platform bot webhook for chat: ${update.message?.chat?.id || 'unknown'}`);

    // Process the update with platform bot token
    const result = await TelegramWebhookService.processUpdate(update, platformBotToken);

    if (result.success) {
      res.status(200).json({ ok: true });
    } else {
      console.error('Webhook processing failed:', result.error);
      res.status(500).json({ ok: false, error: result.error });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint to set webhook for a bot
router.post('/set-webhook', async (req, res) => {
  try {
    const { botToken, webhookUrl } = req.body;

    if (!botToken || !webhookUrl) {
      return res.status(400).json({ 
        error: 'Bot token and webhook URL are required' 
      });
    }

    const result = await TelegramWebhookService.setWebhook(botToken, webhookUrl);
    
    res.json({
      success: result.ok,
      message: result.ok ? 'Webhook set successfully' : 'Failed to set webhook',
      details: result
    });
  } catch (error) {
    console.error('Error setting webhook:', error);
    res.status(500).json({ 
      error: 'Failed to set webhook',
      details: error.message 
    });
  }
});

// Endpoint to get webhook info
router.get('/webhook-info/:botToken', async (req, res) => {
  try {
    const { botToken } = req.params;
    const result = await TelegramWebhookService.getWebhookInfo(botToken);
    
    res.json({
      success: result.ok,
      webhookInfo: result
    });
  } catch (error) {
    console.error('Error getting webhook info:', error);
    res.status(500).json({ 
      error: 'Failed to get webhook info',
      details: error.message 
    });
  }
});

// Endpoint to reload bot tokens (useful for development)
router.post('/reload-tokens', async (req, res) => {
  try {
    await TelegramWebhookService.loadBotTokens();
    res.json({
      success: true,
      message: 'Bot tokens reloaded successfully',
      tokenCount: TelegramWebhookService.botTokens.size
    });
  } catch (error) {
    console.error('Error reloading tokens:', error);
    res.status(500).json({ 
      error: 'Failed to reload bot tokens',
      details: error.message 
    });
  }
});

module.exports = router;
