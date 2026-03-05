const database = require('../database/connection');
const AIContentService = require('./AIContentService');
const VoiceService = require('./VoiceService');

// Create VoiceService instance
const voiceService = new VoiceService();

// Get user by ID
async function getUserById(userId) {
  const result = await database.query(
    'SELECT id, email, username, wallet_address, created_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0];
}

// Get agents by user ID
async function getAgentsByUserId(userId) {
  const result = await database.query(
    'SELECT id, name, description, personality_type, is_active, created_at FROM ai_agents WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

// Get agent by ID and user ID
async function getAgentById(agentId, userId) {
  const result = await database.query(
    'SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2',
    [agentId, userId]
  );
  return result.rows[0];
}

// Generate session ID
function generateSessionId() {
  return 'wp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Create chat session
async function createChatSession(sessionId, agentId, userData) {
  const result = await database.query(
    'INSERT INTO wordpress_chat_sessions (session_id, user_id, agent_id, user_data, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
    [sessionId, userData.user_id, agentId, JSON.stringify(userData)]
  );
  return result.rows[0];
}

// Get chat session
async function getChatSession(sessionId) {
  const result = await database.query(
    'SELECT * FROM wordpress_chat_sessions WHERE session_id = $1',
    [sessionId]
  );
  return result.rows[0];
}

// Process message
async function processMessage(sessionId, message, messageType) {
  // Get session and agent
  const session = await getChatSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  
  const agent = await getAgentById(session.agent_id, session.user_id);
  if (!agent) {
    throw new Error('Agent not found');
  }
  
  let response;
  
  // Handle voice messages
  if (messageType === 'voice') {
    try {
      console.log('🎤 WordPress Service: Processing voice message for agent:', agent.name);
      console.log('🎤 WordPress Service: Audio buffer length:', message.length);
      
      // Convert base64 audio to buffer
      const audioBuffer = Buffer.from(message, 'base64');
      console.log('🎤 WordPress Service: Converted buffer length:', audioBuffer.length);

      // Process voice message
      const voiceResponse = await voiceService.processVoiceMessage(audioBuffer, agent);
      console.log('🎤 WordPress Service: Voice response received:', voiceResponse);
      console.log('🎤 WordPress Service: Audio object type:', typeof voiceResponse.audio);
      console.log('🎤 WordPress Service: Audio object keys:', voiceResponse.audio ? Object.keys(voiceResponse.audio) : 'null');
      console.log('🎤 WordPress Service: AudioBuffer type:', voiceResponse.audio && voiceResponse.audio.audioBuffer ? typeof voiceResponse.audio.audioBuffer : 'null');
      
      // For voice messages, we need to return both text and audio
      let audioBase64 = null;
      if (voiceResponse.audio && voiceResponse.audio.audioBuffer) {
        if (Buffer.isBuffer(voiceResponse.audio.audioBuffer)) {
          audioBase64 = voiceResponse.audio.audioBuffer.toString('base64');
        } else {
          console.log('🎤 WordPress Service: AudioBuffer is not a Buffer, it is:', typeof voiceResponse.audio.audioBuffer);
          audioBase64 = voiceResponse.audio.audioBuffer.toString();
        }
      }
      
      const result = {
        text: voiceResponse.text,
        transcription: voiceResponse.transcription,
        audio: audioBase64,
        messageType: 'voice'
      };
      console.log('🎤 WordPress Service: Returning result:', {
        text: result.text.substring(0, 100) + '...',
        audioLength: result.audio ? result.audio.length : 'null',
        messageType: result.messageType
      });
      return result;
    } catch (error) {
      console.error('Voice processing error:', error);
      response = 'Sorry, I had trouble processing your voice message. Please try typing your message instead.';
    }
  } else {
    // Process text message with AI service
    response = await AIContentService.generateContextualResponse(
      agent,
      { text: message, chat: { title: 'WordPress Chat' } },
      'keyword',
      sessionId
    );
  }
  
  // Save user message
  await database.query(
    'INSERT INTO wordpress_chat_messages (session_id, message, message_type, is_from_user, created_at) VALUES ($1, $2, $3, true, NOW())',
    [sessionId, message, messageType || 'text']
  );
  
  // Save AI response
  await database.query(
    'INSERT INTO wordpress_chat_messages (session_id, message, message_type, is_from_user, created_at) VALUES ($1, $2, $3, false, NOW())',
    [sessionId, response, 'text']
  );
  
  return response;
}

// Get chat history
async function getChatHistory(sessionId, limit) {
  const result = await database.query(
    'SELECT message, response, message_type, is_from_user, created_at FROM wordpress_chat_messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT $2',
    [sessionId, limit]
  );
  return result.rows;
}

// Get agent analytics
async function getAgentAnalytics(agentId, range) {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const result = await database.query(
    `SELECT 
      COUNT(DISTINCT wcs.session_id) as total_conversations,
      COUNT(wcm.id) as total_messages,
      AVG(EXTRACT(EPOCH FROM (wcm.created_at - wcs.created_at))) as avg_response_time
    FROM wordpress_chat_sessions wcs
    LEFT JOIN wordpress_chat_messages wcm ON wcs.session_id = wcm.session_id
    WHERE wcs.agent_id = $1 AND wcs.created_at >= $2`,
    [agentId, startDate]
  );
  
  return {
    total_conversations: parseInt(result.rows[0]?.total_conversations) || 0,
    total_messages: parseInt(result.rows[0]?.total_messages) || 0,
    avg_response_time: Math.round(result.rows[0]?.avg_response_time) || 0,
    satisfaction_rate: '95%' // Placeholder - could be calculated from user feedback
  };
}

module.exports = {
  getUserById,
  getAgentsByUserId,
  getAgentById,
  generateSessionId,
  createChatSession,
  getChatSession,
  processMessage,
  getChatHistory,
  getAgentAnalytics
};