const express = require('express');
const router = express.Router();
const database = require('../database/connection');
const jwt = require('jsonwebtoken');
const AIContentService = require('../services/AIContentService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');

// Auth middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const userResult = await database.query(
      'SELECT * FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get widget settings for an agent (public endpoint for widget)
router.get('/settings/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const result = await database.query(`
      SELECT 
        ws.*,
        aa.name as agent_name,
        aa.personality_type,
        aa.avatar_url,
        aa.description
      FROM widget_settings ws
      JOIN ai_agents aa ON ws.agent_id = aa.id
      WHERE ws.agent_id = $1 AND ws.is_active = true AND aa.is_active = true
    `, [agentId]);
    
    if (result.rows.length === 0) {
      // Create default widget settings if none exist
      const agentResult = await database.query(
        'SELECT * FROM ai_agents WHERE id = $1 AND is_active = true',
        [agentId]
      );
      
      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found or inactive' });
      }
      
      const agent = agentResult.rows[0];
      const defaultSettings = await database.query(`
        INSERT INTO widget_settings (agent_id, widget_title, widget_subtitle, primary_color, secondary_color,
        text_color, background_color, border_radius, position, show_agent_avatar,
        show_typing_indicator, enable_sound_notifications, max_messages_per_session,
        session_timeout_minutes, welcome_message, offline_message, voice_enabled, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `, [
        agentId, `Chat with ${agent.name}`, 'Ask me anything!', '#3B82F6', '#1E40AF', '#FFFFFF', '#1F2937', 12, 'bottom-right',
        true, true, true, 50, 30, `Hello! I'm ${agent.name}, your AI assistant. How can I help you today?`,
        'Sorry, I\'m currently offline. Please leave a message and I\'ll get back to you soon!', true, true
      ]);
      
      const widgetSettings = defaultSettings.rows[0];
      
      res.json({ 
        success: true, 
        data: {
          ...widgetSettings,
          agent_name: agent.name,
          personality_type: agent.personality_type,
          avatar_url: agent.avatar_url,
          description: agent.description
        }
      });
      return;
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error fetching widget settings:', error);
    res.status(500).json({ error: 'Failed to fetch widget settings' });
  }
});

// Update widget settings
router.put('/settings/:agentId', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const { agentId } = req.params;
    const userId = req.user.id;
    const settings = req.body;
    
    // Verify agent belongs to user
    const agentResult = await database.query(
      'SELECT id FROM ai_agents WHERE id = $1 AND user_id = $2',
      [agentId, userId]
    );
    
    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Update or insert widget settings
    const result = await database.query(`
      INSERT INTO widget_settings (
        agent_id, widget_title, widget_subtitle, primary_color, secondary_color,
        text_color, background_color, border_radius, position, show_agent_avatar,
        show_typing_indicator, enable_sound_notifications, max_messages_per_session,
        session_timeout_minutes, welcome_message, offline_message, voice_enabled, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (agent_id) 
      DO UPDATE SET
        widget_title = EXCLUDED.widget_title,
        widget_subtitle = EXCLUDED.widget_subtitle,
        primary_color = EXCLUDED.primary_color,
        secondary_color = EXCLUDED.secondary_color,
        text_color = EXCLUDED.text_color,
        background_color = EXCLUDED.background_color,
        border_radius = EXCLUDED.border_radius,
        position = EXCLUDED.position,
        show_agent_avatar = EXCLUDED.show_agent_avatar,
        show_typing_indicator = EXCLUDED.show_typing_indicator,
        enable_sound_notifications = EXCLUDED.enable_sound_notifications,
        max_messages_per_session = EXCLUDED.max_messages_per_session,
        session_timeout_minutes = EXCLUDED.session_timeout_minutes,
        welcome_message = EXCLUDED.welcome_message,
        offline_message = EXCLUDED.offline_message,
        voice_enabled = EXCLUDED.voice_enabled,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING *
    `, [
      agentId,
      settings.widget_title || 'Chat with our AI Assistant',
      settings.widget_subtitle || 'Ask me anything!',
      settings.primary_color || '#3B82F6',
      settings.secondary_color || '#1E40AF',
      settings.text_color || '#FFFFFF',
      settings.background_color || '#1F2937',
      settings.border_radius || 12,
      settings.position || 'bottom-right',
      settings.show_agent_avatar !== false,
      settings.show_typing_indicator !== false,
      settings.enable_sound_notifications !== false,
      settings.max_messages_per_session || 50,
      settings.session_timeout_minutes || 30,
      settings.welcome_message || 'Hello! I\'m here to help. How can I assist you today?',
      settings.offline_message || 'Sorry, I\'m currently offline. Please leave a message and I\'ll get back to you soon!',
      settings.voice_enabled !== false, // Enable voice by default
      settings.is_active !== false
    ]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error updating widget settings:', error);
    res.status(500).json({ error: 'Failed to update widget settings' });
  }
});

// Start a new chat session
router.post('/chat/start', async (req, res) => {
  try {
    const { agentId, websiteUrl, referrer } = req.body;
    const visitorIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    // Generate unique session ID
    const sessionId = uuidv4();
    
    // Create new chat session
    const result = await database.query(`
      INSERT INTO widget_chat_sessions (
        agent_id, session_id, visitor_ip, visitor_user_agent, 
        visitor_referrer, website_url, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `, [agentId, sessionId, visitorIp, userAgent, referrer, websiteUrl]);
    
    // Get agent and widget settings
    const agentResult = await database.query(`
      SELECT 
        aa.*,
        ws.widget_title,
        ws.widget_subtitle,
        ws.welcome_message,
        ws.show_agent_avatar,
        ws.primary_color,
        ws.secondary_color,
        ws.text_color,
        ws.background_color,
        ws.border_radius,
        ws.position,
        ws.show_typing_indicator,
        ws.enable_sound_notifications,
        ws.voice_enabled
      FROM ai_agents aa
      LEFT JOIN widget_settings ws ON aa.id = ws.agent_id
      WHERE aa.id = $1 AND aa.is_active = true
    `, [agentId]);
    
    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found or inactive' });
    }
    
    const agent = agentResult.rows[0];
    
    res.json({
      success: true,
      data: {
        sessionId,
        agent: {
          id: agent.id,
          name: agent.name,
          personality_type: agent.personality_type,
          avatar_url: agent.avatar_url,
          description: agent.description,
          widget_title: agent.widget_title,
          widget_subtitle: agent.widget_subtitle,
          welcome_message: agent.welcome_message,
          show_agent_avatar: agent.show_agent_avatar,
          primary_color: agent.primary_color,
          secondary_color: agent.secondary_color,
          text_color: agent.text_color,
          background_color: agent.background_color,
          border_radius: agent.border_radius,
          position: agent.position,
          show_typing_indicator: agent.show_typing_indicator,
          enable_sound_notifications: agent.enable_sound_notifications,
          voice_enabled: agent.voice_enabled
        }
      }
    });
  } catch (error) {
    logger.error('Error starting chat session:', error);
    res.status(500).json({ error: 'Failed to start chat session' });
  }
});

// Send a message in chat session
router.post('/chat/message', async (req, res) => {
  try {
    const { sessionId, message, agentId } = req.body;
    
    if (!sessionId || !message || !agentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify session exists and is active
    const sessionResult = await database.query(`
      SELECT * FROM widget_chat_sessions 
      WHERE session_id = $1 AND agent_id = $2 AND is_active = true
    `, [sessionId, agentId]);
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    
    const session = sessionResult.rows[0];
    
    // Save visitor message
    await database.query(`
      INSERT INTO widget_chat_messages (session_id, agent_id, message_type, content)
      VALUES ($1, $2, 'visitor', $3)
    `, [sessionId, agentId, message]);
    
    // Get agent details
    const agentResult = await database.query(`
      SELECT * FROM ai_agents WHERE id = $1 AND is_active = true
    `, [agentId]);
    
    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const agent = agentResult.rows[0];
    
    // Generate AI response
    let aiResponse;
    try {
      // Get recent conversation history for context
      const historyResult = await database.query(`
        SELECT message_type, content, created_at
        FROM widget_chat_messages
        WHERE session_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [sessionId]);
      
      const conversationHistory = historyResult.rows.reverse();
      
      // Build context for AI
      const context = conversationHistory.map(msg => 
        `${msg.message_type === 'visitor' ? 'Visitor' : 'Agent'}: ${msg.content}`
      ).join('\n');
      
      // Generate response using AIContentService
      const response = await AIContentService.generateContextualResponse(
        agent,
        { text: message, chat: { title: 'Website Chat' } },
        'keyword',
        sessionId
      );
      
      aiResponse = response;
    } catch (aiError) {
      logger.error('AI response generation failed:', aiError);
      // Fallback response
      aiResponse = "I'm here to help! Could you please rephrase your question?";
    }
    
    // Save AI response
    await database.query(`
      INSERT INTO widget_chat_messages (session_id, agent_id, message_type, content)
      VALUES ($1, $2, 'agent', $3)
    `, [sessionId, agentId, aiResponse]);
    
    // Update session activity
    await database.query(`
      UPDATE widget_chat_sessions 
      SET last_activity_at = NOW()
      WHERE session_id = $1
    `, [sessionId]);
    
    res.json({
      success: true,
      data: {
        response: aiResponse,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error processing chat message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get chat history for a session
router.get('/chat/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await database.query(`
      SELECT 
        message_type,
        content,
        created_at
      FROM widget_chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
    `, [sessionId]);
    
    res.json({
      success: true,
      data: {
        messages: result.rows,
        sessionId
      }
    });
  } catch (error) {
    logger.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// End chat session
router.post('/chat/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    await database.query(`
      UPDATE widget_chat_sessions 
      SET is_active = false, ended_at = NOW()
      WHERE session_id = $1
    `, [sessionId]);
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error ending chat session:', error);
    res.status(500).json({ error: 'Failed to end chat session' });
  }
});

// Get embed code for agent
router.get('/embed/:agentId', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const userId = req.user.id;
    
    // Verify agent belongs to user
    const agentResult = await database.query(`
      SELECT aa.*, ws.widget_title, ws.widget_subtitle
      FROM ai_agents aa
      LEFT JOIN widget_settings ws ON aa.id = ws.agent_id
      WHERE aa.id = $1 AND aa.user_id = $2 AND aa.is_active = true
    `, [agentId, userId]);
    
    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const agent = agentResult.rows[0];
    const baseUrl = process.env.FRONTEND_URL || 'https://www.iqonga.org';
    
    // Generate embed code
    const embedCode = `<!-- Iqonga Chat Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${baseUrl}/widget/chat.js?v=${Date.now()}';
    script.setAttribute('data-agent-id', '${agentId}');
    script.setAttribute('data-widget-title', '${agent.widget_title || agent.name}');
    script.setAttribute('data-widget-subtitle', '${agent.widget_subtitle || 'Ask me anything!'}');
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
    
    res.json({
      success: true,
      data: {
        agentId: agent.id,
        agentName: agent.name,
        embedCode,
        instructions: [
          'Copy the embed code above',
          'Paste it into your website\'s HTML before the closing </body> tag',
          'The chat widget will automatically appear on your website',
          'Visitors can click the widget to start chatting with your AI agent'
        ]
      }
    });
  } catch (error) {
    logger.error('Error generating embed code:', error);
    res.status(500).json({ error: 'Failed to generate embed code' });
  }
});

// Get widget analytics for an agent
router.get('/analytics/:agentId', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const userId = req.user.id;
    const { period = '7d' } = req.query;
    
    // Verify agent belongs to user
    const agentResult = await database.query(
      'SELECT id FROM ai_agents WHERE id = $1 AND user_id = $2',
      [agentId, userId]
    );
    
    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Calculate date range
    const now = new Date();
    let startDate;
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    // Get session statistics
    const sessionStats = await database.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN ended_at IS NOT NULL THEN 1 END) as completed_sessions,
        AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))/60) as avg_session_duration_minutes
      FROM widget_chat_sessions
      WHERE agent_id = $1 AND started_at >= $2
    `, [agentId, startDate]);
    
    // Get message statistics
    const messageStats = await database.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN message_type = 'visitor' THEN 1 END) as visitor_messages,
        COUNT(CASE WHEN message_type = 'agent' THEN 1 END) as agent_messages
      FROM widget_chat_messages wcm
      JOIN widget_chat_sessions wcs ON wcm.session_id = wcs.session_id
      WHERE wcs.agent_id = $1 AND wcm.created_at >= $2
    `, [agentId, startDate]);
    
    // Get daily activity
    const dailyActivity = await database.query(`
      SELECT 
        DATE(started_at) as date,
        COUNT(*) as sessions,
        COUNT(CASE WHEN ended_at IS NOT NULL THEN 1 END) as completed_sessions
      FROM widget_chat_sessions
      WHERE agent_id = $1 AND started_at >= $2
      GROUP BY DATE(started_at)
      ORDER BY date ASC
    `, [agentId, startDate]);
    
    res.json({
      success: true,
      data: {
        period,
        sessionStats: sessionStats.rows[0],
        messageStats: messageStats.rows[0],
        dailyActivity: dailyActivity.rows
      }
    });
  } catch (error) {
    logger.error('Error fetching widget analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
