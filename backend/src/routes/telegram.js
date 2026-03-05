const express = require('express');
const router = express.Router();
const telegramService = require('../services/TelegramService');
const { authenticateToken } = require('../middleware/auth');

// GET /api/telegram/groups - Get user's Telegram groups
router.get('/groups', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { agentId } = req.query;

    let groups;
    if (agentId) {
      // Get groups for specific agent
      groups = await telegramService.getAgentTelegramGroups(userId, agentId);
    } else {
      // Get all groups for user
      groups = await telegramService.getUserTelegramGroups(userId);
    }
    
    res.json({
      success: true,
      data: {
        groups: groups,
        totalGroups: groups.length
      }
    });
  } catch (error) {
    console.error('Error getting Telegram groups:', error);
    res.status(500).json({
      error: 'Failed to get Telegram groups',
      details: error.message
    });
  }
});

// POST /api/telegram/connect-platform - Connect using platform bot
router.post('/connect-platform', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({
        error: 'Chat ID is required'
      });
    }

    const parsedChatId = parseInt(chatId);
    if (isNaN(parsedChatId)) {
      return res.status(400).json({
        error: 'Invalid chat ID format'
      });
    }

    // Use platform bot if configured
    if (process.env.TELEGRAM_BOT_TOKEN) {
      const platformTelegramService = require('../services/PlatformTelegramService');
      const result = await platformTelegramService.addUserGroup(userId, parsedChatId);
      res.json(result);
    } else {
      return res.status(400).json({
        error: 'Platform Telegram bot not configured. Please use personal bot setup instead.'
      });
    }
  } catch (error) {
    console.error('Error connecting to Telegram group with platform bot:', error);
    res.status(500).json({
      error: 'Failed to connect to Telegram group',
      details: error.message
    });
  }
});

// POST /api/telegram/connect - Connect to a Telegram group
router.post('/connect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { botToken, chatId, agentId, groupInfo } = req.body;

    if (!botToken || !chatId || !agentId) {
      return res.status(400).json({
        error: 'Bot token, chat ID, and agent ID are required'
      });
    }

    // Validate chat ID format
    const parsedChatId = parseInt(chatId);
    if (isNaN(parsedChatId)) {
      return res.status(400).json({
        error: 'Invalid chat ID format'
      });
    }

    const result = await telegramService.addTelegramGroup(
      userId,
      agentId,
      botToken,
      parsedChatId,
      groupInfo || {}
    );

    res.json(result);
  } catch (error) {
    console.error('Error connecting to Telegram group:', error);
    res.status(500).json({
      error: 'Failed to connect to Telegram group',
      details: error.message
    });
  }
});

// DELETE /api/telegram/groups/:chatId - Remove Telegram group connection
router.delete('/groups/:chatId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const chatId = parseInt(req.params.chatId);
    const { agentId } = req.query;

    if (isNaN(chatId)) {
      return res.status(400).json({
        error: 'Invalid chat ID'
      });
    }

    const result = await telegramService.removeTelegramGroup(userId, chatId, agentId);
    res.json(result);
  } catch (error) {
    console.error('Error removing Telegram group:', error);
    res.status(500).json({
      error: 'Failed to remove Telegram group',
      details: error.message
    });
  }
});

// POST /api/telegram/test - Test bot permissions in a group
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { botToken, chatId } = req.body;

    if (!botToken || !chatId) {
      return res.status(400).json({
        error: 'Bot token and chat ID are required'
      });
    }

    const parsedChatId = parseInt(chatId);
    if (isNaN(parsedChatId)) {
      return res.status(400).json({
        error: 'Invalid chat ID format'
      });
    }

    const permissions = await telegramService.testBotPermissions(botToken, parsedChatId);
    
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error testing bot permissions:', error);
    res.status(500).json({
      error: 'Failed to test bot permissions',
      details: error.message
    });
  }
});

// POST /api/telegram/send - Send message to Telegram group
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId, message, options } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({
        error: 'Chat ID and message are required'
      });
    }

    const parsedChatId = parseInt(chatId);
    if (isNaN(parsedChatId)) {
      return res.status(400).json({
        error: 'Invalid chat ID format'
      });
    }

    const result = await telegramService.postToTelegram(
      userId,
      parsedChatId,
      message,
      options || {}
    );

    if (result.queued) {
      res.status(202).json(result);
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    res.status(500).json({
      error: 'Failed to send message',
      details: error.message
    });
  }
});

// GET /api/telegram/bot-info - Get bot information (for testing)
router.post('/bot-info', authenticateToken, async (req, res) => {
  try {
    const { botToken } = req.body;

    if (!botToken) {
      return res.status(400).json({
        error: 'Bot token is required'
      });
    }

    const botInfo = await telegramService.getBotInfo(botToken);
    
    if (botInfo.ok) {
      res.json({
        success: true,
        data: {
          id: botInfo.result.id,
          username: botInfo.result.username,
          firstName: botInfo.result.first_name,
          canJoinGroups: botInfo.result.can_join_groups,
          canReadAllGroupMessages: botInfo.result.can_read_all_group_messages,
          supportsInlineQueries: botInfo.result.supports_inline_queries
        }
      });
    } else {
      res.status(400).json({
        error: 'Invalid bot token',
        details: botInfo.description
      });
    }
  } catch (error) {
    console.error('Error getting bot info:', error);
    res.status(500).json({
      error: 'Failed to get bot information',
      details: error.message
    });
  }
});

module.exports = router;