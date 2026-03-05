const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const database = require('../database/connection');

// Get engagement settings for an agent
router.get('/settings/:agentId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { agentId } = req.params;

    // Verify agent belongs to user
    const agentResult = await database.query(`
      SELECT id, name FROM ai_agents 
      WHERE id = $1 AND user_id = $2 AND is_active = true
    `, [agentId, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get engagement settings
    const settingsResult = await database.query(`
      SELECT * FROM telegram_engagement_settings 
      WHERE agent_id = $1
    `, [agentId]);

    const settings = settingsResult.rows[0] || {
      agent_id: agentId,
      mention_settings: { enabled: true, maxResponsesPerHour: 5 },
      reply_settings: { enabled: true, maxResponsesPerHour: 10 },
      keyword_settings: { enabled: false, maxResponsesPerHour: 3 },
      auto_reply_enabled: true,
      response_delay_seconds: 30
    };

    res.json({
      success: true,
      agent: agentResult.rows[0],
      settings
    });
  } catch (error) {
    console.error('Error getting engagement settings:', error);
    res.status(500).json({ 
      error: 'Failed to get engagement settings',
      details: error.message 
    });
  }
});

// Update engagement settings for an agent
router.put('/settings/:agentId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { agentId } = req.params;
    const {
      mention_settings,
      reply_settings,
      keyword_settings,
      auto_reply_enabled,
      response_delay_seconds
    } = req.body;

    // Verify agent belongs to user
    const agentResult = await database.query(`
      SELECT id FROM ai_agents 
      WHERE id = $1 AND user_id = $2 AND is_active = true
    `, [agentId, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Update or insert engagement settings
    const result = await database.query(`
      INSERT INTO telegram_engagement_settings 
      (agent_id, mention_settings, reply_settings, keyword_settings, auto_reply_enabled, response_delay_seconds, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (agent_id) 
      DO UPDATE SET 
        mention_settings = EXCLUDED.mention_settings,
        reply_settings = EXCLUDED.reply_settings,
        keyword_settings = EXCLUDED.keyword_settings,
        auto_reply_enabled = EXCLUDED.auto_reply_enabled,
        response_delay_seconds = EXCLUDED.response_delay_seconds,
        updated_at = NOW()
      RETURNING *
    `, [
      agentId,
      JSON.stringify(mention_settings || { enabled: true, maxResponsesPerHour: 5 }),
      JSON.stringify(reply_settings || { enabled: true, maxResponsesPerHour: 10 }),
      JSON.stringify(keyword_settings || { enabled: false, maxResponsesPerHour: 3 }),
      auto_reply_enabled !== undefined ? auto_reply_enabled : true,
      response_delay_seconds || 30
    ]);

    res.json({
      success: true,
      message: 'Engagement settings updated successfully',
      settings: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating engagement settings:', error);
    res.status(500).json({ 
      error: 'Failed to update engagement settings',
      details: error.message 
    });
  }
});

// Get keyword triggers for an agent
router.get('/triggers/:agentId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { agentId } = req.params;

    // Verify agent belongs to user
    const agentResult = await database.query(`
      SELECT id, name FROM ai_agents 
      WHERE id = $1 AND user_id = $2 AND is_active = true
    `, [agentId, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get keyword triggers
    const triggersResult = await database.query(`
      SELECT * FROM telegram_keyword_triggers 
      WHERE agent_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `, [agentId]);

    res.json({
      success: true,
      agent: agentResult.rows[0],
      triggers: triggersResult.rows
    });
  } catch (error) {
    console.error('Error getting keyword triggers:', error);
    res.status(500).json({ 
      error: 'Failed to get keyword triggers',
      details: error.message 
    });
  }
});

// Add keyword trigger for an agent
router.post('/triggers/:agentId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { agentId } = req.params;
    const { keyword, response_type = 'auto' } = req.body;

    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    // Verify agent belongs to user
    const agentResult = await database.query(`
      SELECT id FROM ai_agents 
      WHERE id = $1 AND user_id = $2 AND is_active = true
    `, [agentId, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Check if keyword already exists for this agent
    const existingResult = await database.query(`
      SELECT id FROM telegram_keyword_triggers 
      WHERE agent_id = $1 AND LOWER(keyword) = LOWER($2) AND is_active = true
    `, [agentId, keyword.trim()]);

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Keyword trigger already exists for this agent' });
    }

    // Insert new keyword trigger
    const result = await database.query(`
      INSERT INTO telegram_keyword_triggers 
      (user_id, agent_id, keyword, response_type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `, [userId, agentId, keyword.trim(), response_type]);

    res.json({
      success: true,
      message: 'Keyword trigger added successfully',
      trigger: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding keyword trigger:', error);
    res.status(500).json({ 
      error: 'Failed to add keyword trigger',
      details: error.message 
    });
  }
});

// Delete keyword trigger
router.delete('/triggers/:triggerId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { triggerId } = req.params;

    // Verify trigger belongs to user
    const triggerResult = await database.query(`
      SELECT id FROM telegram_keyword_triggers 
      WHERE id = $1 AND user_id = $2
    `, [triggerId, userId]);

    if (triggerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Keyword trigger not found' });
    }

    // Soft delete the trigger
    await database.query(`
      UPDATE telegram_keyword_triggers 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `, [triggerId]);

    res.json({
      success: true,
      message: 'Keyword trigger deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting keyword trigger:', error);
    res.status(500).json({ 
      error: 'Failed to delete keyword trigger',
      details: error.message 
    });
  }
});

// Get recent messages for a chat
router.get('/messages/:chatId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify user has access to this chat
    const groupResult = await database.query(`
      SELECT id FROM telegram_groups 
      WHERE chat_id = $1 AND user_id = $2 AND is_active = true
    `, [chatId, userId]);

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found or access denied' });
    }

    // Get recent messages
    const messagesResult = await database.query(`
      SELECT 
        tm.*,
        tg.title as chat_title
      FROM telegram_messages tm
      JOIN telegram_groups tg ON tm.chat_id = tg.chat_id
      WHERE tm.chat_id = $1 AND tm.user_id = $2
      ORDER BY tm.created_at DESC
      LIMIT $3 OFFSET $4
    `, [chatId, userId, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      messages: messagesResult.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: messagesResult.rows.length
      }
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ 
      error: 'Failed to get messages',
      details: error.message 
    });
  }
});

// Get engagement statistics for an agent
router.get('/stats/:agentId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { agentId } = req.params;
    const { days = 7 } = req.query;

    // Verify agent belongs to user
    const agentResult = await database.query(`
      SELECT id, name FROM ai_agents 
      WHERE id = $1 AND user_id = $2 AND is_active = true
    `, [agentId, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get engagement statistics
    const statsResult = await database.query(`
      SELECT 
        trigger_type,
        COUNT(*) as response_count,
        COUNT(DISTINCT chat_id) as unique_chats
      FROM telegram_response_tracking 
      WHERE agent_id = $1 
        AND created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY trigger_type
    `, [agentId]);

    // Get total messages processed
    const messagesResult = await database.query(`
      SELECT COUNT(*) as total_messages
      FROM telegram_messages tm
      JOIN telegram_groups tg ON tm.chat_id = tg.chat_id
      WHERE tg.user_id = $1 
        AND tm.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
    `, [userId]);

    res.json({
      success: true,
      agent: agentResult.rows[0],
      period: `${days} days`,
      statistics: {
        totalMessages: parseInt(messagesResult.rows[0].total_messages),
        responses: statsResult.rows.reduce((acc, row) => {
          acc[row.trigger_type] = {
            count: parseInt(row.response_count),
            uniqueChats: parseInt(row.unique_chats)
          };
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error getting engagement stats:', error);
    res.status(500).json({ 
      error: 'Failed to get engagement statistics',
      details: error.message 
    });
  }
});

module.exports = router;
