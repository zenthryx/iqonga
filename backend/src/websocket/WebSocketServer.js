const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const ConversationService = require('../services/ConversationService');
const VoiceService = require('../services/VoiceService');

class WebSocketServer {
  constructor(httpServer) {
    this.server = null;
    this.clients = new Map(); // Map of client connections
    this.conversationService = new ConversationService();
    this.voiceService = new VoiceService();
    
    this.initializeServer(httpServer);
  }

  initializeServer(httpServer) {
    this.server = new WebSocket.Server({
      server: httpServer,
      path: '/ws/voice-chat',
      verifyClient: this.verifyClient.bind(this)
    });

    // Add CORS headers for WebSocket upgrade requests
    this.server.on('headers', (headers, req) => {
      headers.push('Access-Control-Allow-Origin: *');
      headers.push('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
      headers.push('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
      headers.push('Access-Control-Allow-Credentials: true');
    });

    this.server.on('connection', this.handleConnection.bind(this));
    logger.info('✅ WebSocket server initialized on /ws/voice-chat');
  }

  async verifyClient(info) {
    try {
      console.log(`🔍 WebSocket connection attempt from: ${info.origin}`);
      console.log(`🔍 WebSocket request URL: ${info.req.url}`);
      
      // Parse URL parameters from the request URL
      const url = new URL(info.req.url, info.origin || 'http://localhost');
      const token = url.searchParams.get('token');
      const sessionId = url.searchParams.get('sessionId');

      console.log(`🔍 WebSocket params: token=${token ? 'present' : 'none'}, sessionId=${sessionId}`);

      // Allow connections either with JWT token (authenticated users) or with sessionId (widget)
      if (token) {
        // Authenticated user connection
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        info.req.user = decoded;
        info.req.type = 'user';
        console.log(`✅ WebSocket authenticated user: ${decoded.id}`);
        return true;
      } else if (sessionId) {
        // Widget session connection
        info.req.sessionId = sessionId;
        info.req.type = 'widget';
        console.log(`✅ WebSocket widget session: ${sessionId}`);
        return true;
      } else {
        console.log(`❌ WebSocket connection rejected: No token or sessionId provided`);
        logger.warn('WebSocket connection rejected: No token or sessionId provided');
        return false;
      }
    } catch (error) {
      console.log(`❌ WebSocket verification error: ${error.message}`);
      logger.warn('WebSocket connection rejected:', error.message);
      return false;
    }
  }

  handleConnection(ws, req) {
    console.log(`🔗 handleConnection called with req:`, {
      type: req.type,
      sessionId: req.sessionId,
      userId: req.user?.id
    });
    
    const connectionType = req.type;
    
    let userId, sessionId, agentId;
    
    if (connectionType === 'user') {
      userId = req.user.id;
      this.clients.set(userId, ws);
      console.log(`📝 Added user client: ${userId}`);
    } else if (connectionType === 'widget') {
      sessionId = req.sessionId;
      this.clients.set(sessionId, ws);
      console.log(`📝 Added widget client: ${sessionId}`);
    }

    logger.info(`New WebSocket connection: ${connectionType} - ${userId || sessionId}`);

    // Store connection metadata
    ws.userId = userId;
    ws.sessionId = sessionId;
    ws.connectionType = connectionType;

    console.log(`🔗 WebSocket connection setup: userId=${userId}, sessionId=${sessionId}, connectionType=${connectionType}`);

    // Send welcome message
    const identifier = userId || sessionId;
    this.sendMessage(identifier, {
      type: 'connection_established',
      timestamp: Date.now(),
      connectionType
    });

    // Handle different message types
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        logger.error('Invalid WebSocket message:', error);
        this.sendError(identifier, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      logger.info(`WebSocket connection closed: ${connectionType} - ${identifier}`);
      console.log(`🗑️ Removing client: ${identifier}`);
      this.clients.delete(identifier);
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket error for ${connectionType} ${identifier}:`, error);
      console.log(`🗑️ Removing client due to error: ${identifier}`);
      this.clients.delete(identifier);
    });
  }

  async handleMessage(ws, message) {
    const { type, ...data } = message;
    const identifier = ws.userId || ws.sessionId;

    try {
      switch (type) {
        case 'start_conversation':
          await this.handleStartConversation(ws, data);
          break;

        case 'voice_message':
          await this.handleVoiceMessage(ws, data);
          break;

        case 'voice_input':
          await this.handleVoiceInput(ws, data); // New for widget
          break;

        case 'text_message':
          await this.handleTextMessage(ws, data);
          break;

        case 'end_conversation':
          await this.handleEndConversation(ws, data);
          break;

        case 'get_conversation_history':
          await this.handleGetHistory(ws, data);
          break;

        case 'ping':
          // Respond to heartbeat ping
          this.sendMessage(identifier, { type: 'pong' });
          break;

        default:
          this.sendError(identifier, `Unknown message type: ${type}`);
      }
    } catch (error) {
      logger.error(`Error handling message type ${type}:`, error);
      this.sendError(identifier, error.message);
    }
  }

  async handleStartConversation(ws, data) {
    const { agentId, voiceSettings, isAnonymous, conversationId } = data;
    const identifier = ws.userId || ws.sessionId;

    try {
      let conversation;
      
      if (isAnonymous) {
        // For anonymous users, create a simple conversation object
        conversation = {
          id: conversationId,
          agentId: agentId,
          userId: null,
          status: 'active',
          voiceSettings: voiceSettings || {}
        };
      } else {
        // For authenticated users, create conversation in database
        conversation = await this.conversationService.createConversation(
          ws.userId,
          agentId,
          { voiceSettings }
        );
      }

      this.sendMessage(identifier, {
        type: 'conversation_started',
        conversationId: conversation.id,
        agentId: agentId,
        timestamp: Date.now()
      });

    } catch (error) {
      this.sendError(identifier, `Failed to start conversation: ${error.message}`);
    }
  }

  async handleVoiceMessage(ws, data) {
    const { conversationId, audioData, voiceOptions } = data;
    const identifier = ws.userId || ws.sessionId;

    try {
      // Convert base64 audio data to buffer
      const audioBuffer = Buffer.from(audioData, 'base64');

      // Validate audio file
      const validation = this.voiceService.validateAudioFile(audioBuffer);
      if (!validation.isValid) {
        this.sendError(identifier, `Audio file too large: ${validation.sizeMB}MB`);
        return;
      }

      // Send processing status
      this.sendMessage(identifier, {
        type: 'voice_processing',
        status: 'converting_audio',
        timestamp: Date.now()
      });

      // Get conversation context - handle both authenticated and anonymous users
      let conversation;
      if (ws.userId) {
        conversation = await this.conversationService.getConversation(conversationId, ws.userId);
      } else {
        // For anonymous users, get agent directly
        const agent = await this.conversationService.getAgent(data.agentId);
        conversation = {
          conversation: agent,
          agentId: data.agentId
        };
      }
      const agentPersonality = conversation.conversation;

      // Process voice message with agent
      const result = await this.voiceService.processVoiceWithAgentPersonality(
        audioBuffer,
        agentPersonality,
        {
          ...voiceOptions,
          startTime: Date.now()
        }
      );

      // Add messages to conversation (only for authenticated users)
      if (ws.userId) {
        await this.conversationService.addMessage(conversationId, 'user', {
          content: result.userMessage,
          audioUrl: null, // Would store audio URL if we had file storage
          audioDurationMs: result.responseAudio.duration * 1000,
          metadata: { confidence: result.confidence }
        });

        await this.conversationService.addMessage(conversationId, 'assistant', {
          content: result.agentResponse,
          audioUrl: null,
          audioDurationMs: result.responseAudio.duration * 1000,
          metadata: { 
            provider: result.responseAudio.provider || 'openai',
            voice: voiceOptions?.voice || 'alloy'
          }
        });
      }

      // Send response to client
      this.sendMessage(identifier, {
        type: 'voice_response',
        conversationId: conversationId,
        userMessage: result.userMessage,
        agentResponse: result.agentResponse,
        audioData: result.responseAudio.audioBuffer.toString('base64'),
        audioFormat: result.responseAudio.format,
        processingTime: result.processingTime,
        confidence: result.confidence,
        timestamp: Date.now()
      });

    } catch (error) {
      logger.error('Voice message processing failed:', error);
      this.sendError(identifier, `Voice processing failed: ${error.message}`);
    }
  }

  async handleTextMessage(ws, data) {
    const { conversationId, text } = data;
    const identifier = ws.userId || ws.sessionId;

    try {
      // Get conversation and generate response
      const conversation = await this.conversationService.getConversation(conversationId, ws.userId);
      
      // Generate AI response (using existing AIContentService)
      const aiService = require('../services/AIContentService');
      const agentResponse = await aiService.generateContent(
        conversation.conversation,
        { content_type: 'conversation', prompt: text }
      );

      // Add messages (only for authenticated users)
      if (ws.userId) {
        await this.conversationService.addMessage(conversationId, 'user', {
          content: text
        });

        await this.conversationService.addMessage(conversationId, 'assistant', {
          content: agentResponse.content
        });
      }

      // Send response
      this.sendMessage(identifier, {
        type: 'text_response',
        conversationId: conversationId,
        userMessage: text,
        agentResponse: agentResponse.content,
        timestamp: Date.now()
      });

    } catch (error) {
      logger.error('Text message processing failed:', error);
      this.sendError(identifier, `Text processing failed: ${error.message}`);
    }
  }

  // Handle voice input from widget (different from authenticated users)
  async handleVoiceInput(ws, data) {
    const { sessionId, agentId, audioData, mimeType, durationMs } = data;
    const identifier = sessionId || ws.sessionId; // Use sessionId from message first, fallback to ws.sessionId

    console.log(`🎤 handleVoiceInput: sessionId=${sessionId}, ws.sessionId=${ws.sessionId}, identifier=${identifier}`);

    try {
      // Get agent details
      const agent = await this.conversationService.getAgent(agentId);
      if (!agent) {
        this.sendError(identifier, 'Agent not found');
        return;
      }

      // Convert base64 audio to buffer
      const audioBuffer = Buffer.from(audioData, 'base64');
      
      console.log(`🎤 Processing voice input: audioBuffer length=${audioBuffer.length}, mimeType=${mimeType}, base64Length=${audioData.length}`);

      // Validate audio buffer size (should be at least 10KB for meaningful audio)
      if (audioBuffer.length < 10000) {
        console.log(`⚠️ Audio buffer too small: ${audioBuffer.length} bytes. This might be a test or incomplete recording.`);
        this.sendError(identifier, 'Audio recording too short. Please speak for at least 2-3 seconds.');
        return;
      }

      // Transcribe audio using OpenAI Whisper
      console.log(`🎤 Starting speech-to-text transcription...`);
      const transcription = await this.voiceService.speechToText(audioBuffer, {
        language: 'auto'
      });
      
      console.log(`🎤 Transcription result: "${transcription.text}"`);
      
      // Send transcription to chat
      this.sendMessage(identifier, {
        type: 'voice_transcription',
        transcript: transcription.text,
        sessionId: sessionId
      });

      // Generate AI response using the existing AIContentService
      console.log(`🤖 Generating AI response...`);
      const AIContentService = require('../services/AIContentService');
      const aiResponse = await AIContentService.generateContextualResponse(
        agent,
        { text: transcription.text, chat: { title: 'Voice Chat' } },
        'keyword',
        sessionId
      );
      
      console.log(`🤖 AI response generated: "${aiResponse}"`);
      
      // Generate speech from response
      console.log(`🔊 Converting response to speech...`);
      const audioResponse = await this.voiceService.textToSpeech(
        aiResponse.content || aiResponse,
        { voice: 'alloy', format: 'mp3' }
      );
      
      console.log(`🔊 Speech generated: ${audioResponse.audioBuffer.length} bytes`);

      // Send complete response
      this.sendMessage(identifier, {
        type: 'voice_response',
        transcript: transcription.text,
        response: aiResponse.content || aiResponse,
        audioData: audioResponse.audioBuffer.toString('base64'),
        audioFormat: audioResponse.format,
        sessionId: sessionId,
        timestamp: Date.now()
      });
      
      console.log(`✅ Voice response sent to client`);

      // Deduct credits for voice chat (if agent has a user_id)
      if (agent.user_id) {
        try {
          const CreditService = require('../services/CreditService');
          const creditService = new CreditService();
          
          // Deduct credits for voice chat (adjust amount as needed)
          const voiceChatCost = 40; // 40 credits per voice interaction
          await creditService.deductCredits(
            agent.user_id, 
            'voice_chat', 
            voiceChatCost, 
            `Voice chat session: ${sessionId}`
          );
          
          console.log(`💰 Deducted ${voiceChatCost} credit(s) for voice chat from user ${agent.user_id}`);
        } catch (creditError) {
          console.warn(`⚠️ Failed to deduct credits for voice chat: ${creditError.message}`);
          // Don't fail the voice chat if credit deduction fails
        }
      } else {
        console.log(`ℹ️ No user_id found for agent - skipping credit deduction`);
      }

    } catch (error) {
      logger.error('Voice input processing failed:', error);
      this.sendError(identifier, `Voice processing failed: ${error.message}`);
    }
  }

  async handleEndConversation(ws, data) {
    const { conversationId } = data;
    const identifier = ws.userId || ws.sessionId;

    try {
      // Only end conversation in database for authenticated users
      if (ws.userId) {
        await this.conversationService.endConversation(conversationId, ws.userId);
      }
      
      this.sendMessage(identifier, {
        type: 'conversation_ended',
        conversationId: conversationId,
        timestamp: Date.now()
      });

    } catch (error) {
      this.sendError(identifier, `Failed to end conversation: ${error.message}`);
    }
  }

  async handleGetHistory(ws, data) {
    const { conversationId } = data;
    const identifier = ws.userId || ws.sessionId;

    try {
      // Only get history for authenticated users
      if (!ws.userId) {
        this.sendError(identifier, 'History not available for anonymous users');
        return;
      }

      const conversation = await this.conversationService.getConversation(conversationId, ws.userId);
      
      this.sendMessage(identifier, {
        type: 'conversation_history',
        conversationId: conversationId,
        messages: conversation.messages,
        timestamp: Date.now()
      });

    } catch (error) {
      this.sendError(identifier, `Failed to get history: ${error.message}`);
    }
  }

  sendMessage(userId, message) {
    console.log(`📤 Attempting to send message to ${userId}:`, message.type);
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      try {
        const messageStr = JSON.stringify(message);
        console.log(`📤 Sending message to ${userId}, size: ${messageStr.length} chars`);
        client.send(messageStr);
        console.log(`✅ Message sent successfully to ${userId}`);
      } catch (error) {
        console.error(`❌ Error sending message to ${userId}:`, error);
      }
    } else {
      console.warn(`⚠️ Client ${userId} not found or connection not open. ReadyState: ${client ? client.readyState : 'not found'}`);
    }
  }

  sendError(userId, errorMessage) {
    this.sendMessage(userId, {
      type: 'error',
      error: errorMessage,
      timestamp: Date.now()
    });
  }

  // Utility method to get connected clients count
  getConnectedClientsCount() {
    return this.clients.size;
  }

  // Close server
  close() {
    if (this.server) {
      this.server.close();
      this.clients.clear();
    }
  }
}

module.exports = WebSocketServer;
