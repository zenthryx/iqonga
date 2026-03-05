const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const WordPressService = require('../services/WordPressService');

// Test connection endpoint
router.get('/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await WordPressService.getUserById(req.user.id);
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        wallet_address: user.wallet_address,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('WordPress API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

// Get user's agents
router.get('/agents', authenticateToken, async (req, res) => {
  try {
    const agents = await WordPressService.getAgentsByUserId(req.user.id);
    res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('WordPress API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agents'
    });
  }
});

// Get specific agent
router.get('/agents/:id', authenticateToken, async (req, res) => {
  try {
    const agent = await WordPressService.getAgentById(req.params.id, req.user.id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('WordPress API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agent'
    });
  }
});

// Start chat session (requires ZTR tokens)
router.post('/chat/start', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const { agent_id, user_data } = req.body;
    
    // Validate agent belongs to user
    const agent = await WordPressService.getAgentById(agent_id, req.user.id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    // Create chat session
    const sessionId = WordPressService.generateSessionId();
    const userData = { user_id: req.user.id, ...user_data };
    await WordPressService.createChatSession(sessionId, agent_id, userData);
    
    res.json({
      success: true,
      data: {
        session_id: sessionId,
        agent_id: agent_id,
        agent_name: agent.name,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('WordPress API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start chat session'
    });
  }
});

// Send message (requires ZTR tokens)
router.post('/chat/message', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const { session_id, message, message_type } = req.body;
    
    // Validate session
    const session = await WordPressService.getChatSession(session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Process message
    const response = await WordPressService.processMessage(session_id, message, message_type);
    
    // Handle voice responses differently
    if (message_type === 'voice' && typeof response === 'object' && response.messageType === 'voice') {
      res.json({
        success: true,
        data: {
          message: response.text,
          transcription: response.transcription,
          audio: response.audio,
          session_id: session_id,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          message: response,
          session_id: session_id,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('WordPress API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

// Get chat history
router.get('/chat/history/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50 } = req.query;
    
    const history = await WordPressService.getChatHistory(sessionId, parseInt(limit));
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('WordPress API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat history'
    });
  }
});

// Get analytics
router.get('/analytics/:agentId', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { range = '7d' } = req.query;
    
    // Validate agent belongs to user
    const agent = await WordPressService.getAgentById(agentId, req.user.id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    const analytics = await WordPressService.getAgentAnalytics(agentId, range);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('WordPress API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics'
    });
  }
});

module.exports = router;