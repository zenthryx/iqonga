const OpenAI = require('openai');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ElevenLabs is optional - only load if available
let ElevenLabs = null;
try {
  ElevenLabs = require('elevenlabs');
} catch (error) {
  console.log('ℹ️ ElevenLabs not available - using OpenAI TTS only');
}

class VoiceService {
  constructor() {
    this.openai = null;
    this.elevenlabs = null;
    this.initServices();
  }

  async initServices() {
    try {
      // OpenAI setup
      if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        console.log('✅ OpenAI initialized for voice services');
      } else {
        console.warn('⚠️ OPENAI_API_KEY not found - voice services disabled');
      }

      // ElevenLabs setup (optional)
      if (ElevenLabs && process.env.ELEVENLABS_API_KEY) {
        this.elevenlabs = new ElevenLabs({
          apiKey: process.env.ELEVENLABS_API_KEY
        });
        console.log('✅ ElevenLabs initialized for voice services');
      } else {
        console.log('ℹ️ ElevenLabs not configured - using OpenAI TTS only');
      }

      logger.info('✅ Voice services initialized');
    } catch (error) {
      logger.error('Failed to initialize voice services:', error);
    }
  }

  /**
   * Convert audio to text using OpenAI Whisper
   */
  async speechToText(audioBuffer, options = {}) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI service not available');
      }

      const {
        language = 'auto',
        model = 'whisper-1',
        prompt = null,
        response_format = 'text',
        temperature = 0.0
      } = options;

      console.log(`🎤 VoiceService.speechToText: audioBuffer length=${audioBuffer.length}, prompt=${prompt}, language=${language}`);

      // Validate audio buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Empty audio buffer');
      }

      // Check if it's a valid audio file by looking at the header
      const header = audioBuffer.slice(0, 4).toString('hex');
      console.log(`🎤 Audio header: ${header}`);
      
      // Check for common audio format headers
      const headerStr = audioBuffer.slice(0, 12).toString('ascii');
      console.log(`🎤 Audio header ASCII: ${headerStr}`);
      
      // WebM should start with 0x1A45DFA3
      if (header === '1a45dfa3') {
        console.log(`🎤 Detected WebM format`);
      } else {
        console.log(`⚠️ Unknown audio format header: ${header}`);
      }

      // Create a temporary file for OpenAI API
      // The OpenAI Node.js SDK works better with actual files
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `audio_${Date.now()}.webm`);
      
      try {
        // Write buffer to temporary file
        fs.writeFileSync(tempFilePath, audioBuffer);
        console.log(`🎤 Created temp file: ${tempFilePath}, size=${audioBuffer.length}`);

        // Create a proper File object using the temp file
        const audioFile = fs.createReadStream(tempFilePath);
        audioFile.name = 'audio.webm';
        audioFile.type = 'audio/webm';
        audioFile.size = audioBuffer.length;

        const transcriptionOptions = {
          file: audioFile,
          model: model,
          language: language === 'auto' ? undefined : language,
          response_format: response_format,
          temperature: temperature
        };

        // Only add prompt if it's not null
        if (prompt !== null) {
          transcriptionOptions.prompt = prompt;
        }

        const response = await this.openai.audio.transcriptions.create(transcriptionOptions);

        return {
          text: response,
          confidence: 0.95, // Whisper doesn't return confidence, use high default
          language: language === 'auto' ? 'en' : language,
          duration: audioBuffer.length // Approximate duration
        };
      } finally {
        // Clean up temporary file
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log(`🎤 Cleaned up temp file: ${tempFilePath}`);
          }
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup temp file: ${cleanupError.message}`);
        }
      }
    } catch (error) {
      logger.error('Speech to text failed:', error);
      throw new Error(`Speech to text failed: ${error.message}`);
    }
  }

  /**
   * Convert text to speech using OpenAI TTS
   */
  async textToSpeech(text, options = {}) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI service not available');
      }

      const {
        voice = 'alloy', // alloy, echo, fable, onyx, nova, shimmer
        model = 'tts-1',
        speed = 1.0,
        format = 'mp3'
      } = options;

      // Validate text length (OpenAI TTS limit)
      if (text.length > 4096) {
        throw new Error('Text too long for TTS (max 4096 characters)');
      }

      const response = await this.openai.audio.speech.create({
        model: model,
        voice: voice,
        input: text,
        speed: speed,
        response_format: format
      });

      // Convert response to buffer
      const audioBuffer = Buffer.from(await response.arrayBuffer());

      return {
        audioBuffer: audioBuffer,
        format: format,
        duration: this.estimateAudioDuration(text, speed),
        size: audioBuffer.length
      };
    } catch (error) {
      logger.error('Text to speech failed:', error);
      throw new Error(`Text to speech failed: ${error.message}`);
    }
  }

  /**
   * High-quality TTS using ElevenLabs (if available)
   */
  async textToSpeechPremium(text, voiceId, options = {}) {
    try {
      // Check if paid TTS service is available and user has credits
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: options.model || 'eleven_monolingual_v1',
          voice_settings: {
            stability: options.stability || 0.5,
            similarity_boost: options.similarityBoost || 0.75,
            style: options.style || 0.0,
            use_speaker_boost: options.speakerBoost || true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());

      return {
        audioBuffer: audioBuffer,
        format: 'mp3',
        duration: this.estimateAudioDuration(text, options.speed || 1.0),
        provider: 'elevenlabs',
        voiceId: voiceId
      };
    } catch (error) {
      logger.error('Premium text to speech failed:', error);
      // Fallback to OpenAI TTS
      return this.textToSpeech(text, options);
    }
  }

  /**
   * Estimate audio duration in seconds
   */
  estimateAudioDuration(text, speed = 1.0) {
    // Average speaking rate: ~150 words per minute / 60 seconds = 2.5 words per second
    const wordsPerSecond = 2.5 * speed;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerSecond);
  }

  /**
   * Validate audio file format and size
   */
  validateAudioFile(buffer, maxSizeBytes = 25 * 1024 * 1024) { // 25MB default
    return {
      isValid: buffer.length <= maxSizeBytes,
      size: buffer.length,
      maxSize: maxSizeBytes,
      sizeMB: (buffer.length / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * Get available voices
   */
  getAvailableVoices() {
    return {
      openai: [
        { id: 'alloy', name: 'Alloy', gender: 'neutral' },
        { id: 'echo', name: 'Echo', gender: 'male' },
        { id: 'fable', name: 'Fable', gender: 'male' },
        { id: 'onyx', name: 'Onyx', gender: 'male' },
        { id: 'nova', name: 'Nova', gender: 'female' },
        { id: 'shimmer', name: 'Shimmer', gender: 'female' }
      ],
      elevenlabs: [
        { id: 'premium', name: 'Premium Voice', requiresCredits: true }
      ]
    };
  }

  /**
   * Process voice message with agent personality
   */
  async processVoiceWithAgentPersonality(audioBuffer, agentPersonality, options = {}) {
    try {
      // Step 1: Speech to text
      const transcription = await this.speechToText(audioBuffer, options.stt);

      // Step 2: Process text with agent personality
      const agentPrompt = this.buildAgentPersonalityPrompt(
        transcription.text,
        agentPersonality,
        options.context
      );

      // Step 3: Generate response with personality
      const aiService = require('./AIContentService');
      const agentResponse = await aiService.generateContentWithPrompts(
        agentPrompt,
        { maxTokens: 150, temperature: 0.7 }
      );

      // Step 4: Convert response to speech
      const speechOptions = {
        voice: options.voice || agentPersonality.preferredVoice || 'alloy',
        speed: options.speed || agentPersonality.speechSpeed || 1.0,
        ...options.tts
      };

      const responseAudio = await this.textToSpeech(
        agentResponse.content,
        speechOptions
      );

      return {
        userMessage: transcription.text,
        agentResponse: agentResponse.content,
        responseAudio: responseAudio,
        confidence: transcription.confidence,
        processingTime: Date.now() - (options.startTime || Date.now())
      };
    } catch (error) {
      logger.error('Voice processing with agent personality failed:', error);
      throw error;
    }
  }

  /**
   * Build agent personality prompt for voice responses
   */
  buildAgentPersonalityPrompt(userMessage, agent, context = '') {
    const agentName = agent.name || 'an AI assistant';
    const personalityType = agent.personality_type || 'helpful and friendly';
    const description = agent.description || '';
    
    return `You are ${agentName}. 
    
Personality: ${personalityType}
${description ? `Description: ${description}` : ''}

${context ? `Conversation context: ${context}\n` : ''}

User said: "${userMessage}"

Respond naturally in a conversational tone. Keep responses concise (2-3 sentences max) suitable for voice conversation.`;
  }

  /**
   * Process voice message for WordPress plugin
   */
  async processVoiceMessage(audioBuffer, agent) {
    try {
      logger.info('🎤 Processing voice message for agent:', agent.name || 'Unknown');
      
      // Convert speech to text using OpenAI Whisper (force English)
      const transcription = await this.speechToText(audioBuffer, 'en');
      logger.info('🎤 Transcription result:', transcription.text || transcription);
      
      // Generate contextual response using AI service
      const response = await this.generateContextualResponse(transcription.text || transcription, agent);
      logger.info('🎤 Generated response:', response);
      
      // Convert text response to speech
      const responseAudioBuffer = await this.textToSpeech(response);
      logger.info('🎤 Generated audio buffer length:', responseAudioBuffer.length);
      
      return {
        text: response,
        transcription: transcription,
        audio: responseAudioBuffer
      };
    } catch (error) {
      logger.error('Error processing voice message:', error);
      throw error;
    }
  }

  /**
   * Generate contextual response for voice
   */
  async generateContextualResponse(message, agent) {
    try {
      const prompt = this.buildAgentPersonalityPrompt(message, agent);
      logger.info('🎤 Generated prompt for AI:', prompt.substring(0, 200) + '...');
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });
      
      const response = completion.choices[0].message.content.trim();
      logger.info('🎤 AI completion result:', response);
      
      return response;
    } catch (error) {
      logger.error('Error generating contextual response:', error);
      throw error;
    }
  }
}

module.exports = VoiceService;
