const logger = require('../utils/logger');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

/**
 * Music Generation Service
 * Supports multiple music generation APIs with automatic fallback:
 * - MusicAPI.ai (Primary) - Full songs with vocals
 * - Stability Audio (Secondary) - Instrumental and sound design
 * - sunoapi.org (Tertiary) - Fast streaming music generation
 */
class MusicGenerationService {
  constructor() {
    this.providers = {
      musicgpt: {
        enabled: !!process.env.MUSICGPT_API_KEY,
        apiKey: process.env.MUSICGPT_API_KEY,
        baseUrl: 'https://api.musicgpt.com'
      },
      musicapi: {
        enabled: !!process.env.MUSICAPI_API_KEY,
        apiKey: process.env.MUSICAPI_API_KEY,
        baseUrl: 'https://api.musicapi.ai'
      },
      stability: {
        enabled: !!process.env.STABILITY_API_KEY,
        apiKey: process.env.STABILITY_API_KEY,
        baseUrl: 'https://api.stability.ai'
      },
      sunoapi: {
        enabled: !!process.env.SUNOAPI_API_KEY,
        apiKey: process.env.SUNOAPI_API_KEY,
        baseUrl: 'https://api.sunoapi.org'
      }
    };

    // Provider priority order (fallback chain) - MusicGPT first
    this.providerPriority = ['musicgpt', 'musicapi', 'stability', 'sunoapi'];
    this.defaultProvider = process.env.MUSIC_GENERATION_PROVIDER || 'musicgpt';
    this.uploadsDir = path.join(__dirname, '../../uploads/music/generated');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Check if any music generation provider is available
   */
  isAvailable() {
    return Object.values(this.providers).some(provider => provider.enabled);
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return Object.entries(this.providers)
      .filter(([_, provider]) => provider.enabled)
      .map(([name, _]) => name);
  }

  /**
   * Generate music from prompt with automatic provider fallback
   * @param {string} prompt - Music generation prompt/description
   * @param {object} options - Generation options
   * @returns {Promise<object>} Music generation result with URL
   */
  async generateMusic(prompt, options = {}) {
    const {
      provider = null, // If null, use automatic fallback
      duration = 30, // seconds
      style = 'pop',
      genre = null,
      instrumental = false,
      model = null, // Provider-specific model selection
      lyrics = null, // Optional lyrics for vocal tracks
      tempo = null, // BPM
      mood = null,
      voiceType = null, // Voice type: male, female, neutral, auto, or specific styles
      language = null // Language code: en, es, fr, de, it, pt, ja, ko, zh, etc.
    } = options;

    // If provider specified, use it; otherwise try providers in priority order
    const providersToTry = provider 
      ? [provider]
      : this.providerPriority.filter(p => this.providers[p]?.enabled);

    if (providersToTry.length === 0) {
      throw new Error('No music generation providers are configured. Please set API keys in environment variables.');
    }

    let lastError = null;

    // Try each provider in priority order until one succeeds
    for (const providerName of providersToTry) {
      if (!this.providers[providerName]?.enabled) {
        logger.warn(`Provider ${providerName} is not enabled, skipping...`);
        continue;
      }

      try {
        logger.info(`Attempting music generation with ${providerName} provider`);
        const result = await this.generateWithProvider(providerName, prompt, {
          duration,
          style,
          genre,
          instrumental,
          model,
          lyrics,
          tempo,
          mood,
          voiceType,
          language
        });
        
        logger.info(`Successfully generated music with ${providerName}`);
        return result;
      } catch (error) {
        // Safely extract error information without circular references
        const errorInfo = {
          message: error.message,
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          } : undefined
        };
        logger.warn(`Music generation failed with ${providerName}:`, errorInfo);
        lastError = error;
        
        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw new Error(`All music generation providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Generate music with specific provider
   */
  async generateWithProvider(provider, prompt, options) {
    switch (provider) {
      case 'musicgpt':
        return await this.generateWithMusicGPT(prompt, options);
      case 'musicapi':
        return await this.generateWithMusicAPI(prompt, options);
      case 'stability':
        return await this.generateWithStability(prompt, options);
      case 'sunoapi':
        return await this.generateWithSunoAPI(prompt, options);
      default:
        throw new Error(`Unsupported music generation provider: ${provider}`);
    }
  }

  /**
   * Generate music using MusicGPT (Primary Provider)
   * Documentation: https://docs.musicgpt.com/api-documentation/conversions/musicai
   */
  async generateWithMusicGPT(prompt, options) {
    const { duration, style, genre, instrumental, lyrics, tempo, mood, webhookUrl, voiceType, language } = options;
    
    try {
      // Build request data according to MusicGPT API documentation
      const requestData = {
        prompt: prompt || '',
        make_instrumental: instrumental || false
      };

      // Add optional parameters
      if (lyrics) {
        requestData.lyrics = lyrics;
      }

      // MusicGPT uses 'music_style' parameter for style/genre
      // Build music_style from genre, style, mood
      const styleElements = [];
      if (genre) styleElements.push(genre);
      if (style) styleElements.push(style);
      if (mood) styleElements.push(mood);
      if (tempo) styleElements.push(`${tempo} BPM`);
      
      // Important: Voice type handling in MusicGPT
      // MusicGPT accepts 'voice_id' parameter, not voice type in tags
      // For generic voice preferences, we add it to the prompt instead
      if (voiceType && !instrumental) {
        // Add voice preference to prompt for better AI understanding
        requestData.prompt = `[${voiceType} voice] ${requestData.prompt}`;
        styleElements.push(`${voiceType} vocals`);
      }
      
      if (language && !instrumental) {
        styleElements.push(`${language} language`);
      }
      
      if (styleElements.length > 0) {
        requestData.music_style = styleElements.join(', ');
      }

      // Add webhook if provided
      if (webhookUrl) {
        requestData.webhook_url = webhookUrl;
      }

      // MusicGPT V1 endpoint (non-streaming) - compatible with all plan levels
      // Use V1 instead of V2 to avoid "Upgrade Plans to access Streaming" error
      const endpoint = `${this.providers.musicgpt.baseUrl}/api/public/v1/MusicAI`;
      logger.info(`MusicGPT request URL: ${endpoint}`);
      logger.info(`MusicGPT request data: ${JSON.stringify(requestData, null, 2)}`);
      
      const response = await axios.post(
        endpoint,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.providers.musicgpt.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 300000 // 5 minutes timeout
        }
      );

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`MusicGPT API error: ${response.data?.error || response.data?.message || 'Unknown error'}`);
      }

      const result = response.data;
      logger.info(`MusicGPT response: ${JSON.stringify(result, null, 2)}`);
      
      // MusicGPT returns task_id and TWO conversion_ids (generates 2 versions)
      const taskId = result.task_id || result.data?.task_id;
      const conversionId1 = result.conversion_id_1 || result.data?.conversion_id_1;
      const conversionId2 = result.conversion_id_2 || result.data?.conversion_id_2;
      const eta = result.eta; // Estimated time in seconds
      const audioUrl = result.audio_url || result.url || result.data?.audio_url;

      if (!taskId && !audioUrl) {
        logger.error(`MusicGPT response structure: ${JSON.stringify(result, null, 2)}`);
        throw new Error('MusicGPT did not return a task_id or audio URL');
      }

      logger.info(`MusicGPT generation started - Task ID: ${taskId}, ETA: ${eta}s`);
      logger.info(`Conversion IDs: v1=${conversionId1}, v2=${conversionId2}`);

      // If we have an audio URL directly (unlikely for MusicAI), download it
      if (audioUrl) {
        const localAudioPath = await this.downloadAndStoreAudio(audioUrl, 'musicgpt');
        return {
          provider: 'musicgpt',
          audioUrl: `/uploads/music/generated/${path.basename(localAudioPath)}`,
          localPath: localAudioPath,
          generationId: taskId || conversionId1 || uuidv4(),
          status: 'completed',
          duration: result.duration || duration,
          metadata: {
            task_id: taskId,
            conversion_id_1: conversionId1,
            conversion_id_2: conversionId2,
            eta: eta,
            ...result
          }
        };
      }

      // Return processing status - we'll poll using conversion_id_1 (first version)
      return {
        provider: 'musicgpt',
        generationId: taskId,
        status: 'processing',
        taskId: taskId,
        conversionId: conversionId1, // Use first conversion for polling
        metadata: {
          task_id: taskId,
          conversion_id_1: conversionId1,
          conversion_id_2: conversionId2,
          eta: eta,
          credit_estimate: result.credit_estimate,
          ...result
        }
      };
    } catch (error) {
      // Safely extract error information without circular references
      const errorUrl = error.config?.url || 'unknown';
      const errorStatus = error.response?.status || 'no status';
      const errorData = error.response?.data || {};
      const errorInfo = {
        message: error.message,
        url: errorUrl,
        status: errorStatus,
        responseData: errorData,
        stack: error.stack
      };
      logger.error('MusicGPT generation error:', errorInfo);
      throw new Error(`MusicGPT error: ${error.response?.data?.error || error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Generate music using MusicAPI.ai (Secondary Provider)
   * Documentation: https://docs.musicapi.ai/sonic-instructions
   */
  async generateWithMusicAPI(prompt, options) {
    const { duration, style, genre, instrumental, lyrics, tempo, mood, webhookUrl, webhookSecret, voiceType, language } = options;
    
    try {
      // MusicAPI.ai uses custom_mode for custom songs with lyrics
      // If lyrics provided, use custom mode; otherwise use description mode
      const useCustomMode = !!lyrics || !!prompt;
      
      // Build request data according to MusicAPI.ai documentation
      // https://docs.musicapi.ai/sonic-instructions
      const requestData = {
        task_type: 'create_music', // Required field
        mv: options.model || 'sonic-v4-5', // Model version: sonic-v3-5, sonic-v4, sonic-v4-5, sonic-v4-5-plus, sonic-v5
        custom_mode: useCustomMode,
        make_instrumental: instrumental || false
      };

      // Add webhook parameters if provided (recommended for async operations)
      if (webhookUrl) {
        requestData.webhook_url = webhookUrl;
        if (webhookSecret) {
          requestData.webhook_secret = webhookSecret;
        }
      }

      if (useCustomMode) {
        // Custom mode: requires prompt (lyrics), optional title and tags
        requestData.prompt = lyrics || prompt; // Lyrics/prompt (required in custom mode)
        if (style || genre) {
          requestData.tags = [style, genre].filter(Boolean).join(', '); // Style/genre tags
        }
        if (prompt && lyrics) {
          // If both prompt and lyrics exist, use prompt as title
          requestData.title = prompt.substring(0, 80); // Max 80 characters
        }
        // Add voice type and language hints to tags if provided
        if (voiceType && !instrumental) {
          requestData.tags = (requestData.tags || '').split(', ').concat([`${voiceType} voice`]).filter(Boolean).join(', ');
        }
        // Note: Language is handled in the lyrics themselves (they should already be in the correct language)
      } else {
        // Non-custom mode: requires gpt_description_prompt
        let description = prompt;
        if (genre) description += `, ${genre} genre`;
        if (style) description += `, ${style} style`;
        if (mood) description += `, ${mood} mood`;
        if (tempo) description += `, ${tempo} BPM`;
        if (voiceType && !instrumental) {
          description += `, ${voiceType} voice`;
        }
        if (language && !instrumental) {
          description += `, ${language} language`;
        }
        requestData.gpt_description_prompt = description.substring(0, 400); // Max 400 characters
      }

      // MusicAPI.ai uses /api/v1/sonic/create endpoint for Sonic model
      const endpoint = `${this.providers.musicapi.baseUrl}/api/v1/sonic/create`;
      logger.info(`MusicAPI.ai request URL: ${endpoint}`);
      logger.info(`MusicAPI.ai request data: ${JSON.stringify(requestData, null, 2)}`);
      
      const response = await axios.post(
        endpoint,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.providers.musicapi.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 300000 // 5 minutes timeout
        }
      );

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`MusicAPI.ai API error: ${response.data?.error || response.data?.message || 'Unknown error'}`);
      }

      const result = response.data;
      logger.info(`MusicAPI.ai response: ${JSON.stringify(result, null, 2)}`);
      
      // MusicAPI.ai returns a task_id, then you need to poll or use webhook to get the result
      // The response structure may include audio_url directly or require polling
      const taskId = result.task_id || result.id;
      const audioUrl = result.audio_url || result.url || result.output || result.data?.audio_url;

      if (!taskId && !audioUrl) {
        logger.error(`MusicAPI.ai response structure: ${JSON.stringify(result, null, 2)}`);
        throw new Error('MusicAPI.ai did not return a task_id or audio URL');
      }

      // If we have an audio URL directly, download it
      if (audioUrl) {
        const localAudioPath = await this.downloadAndStoreAudio(audioUrl, 'musicapi');
        return {
          provider: 'musicapi',
          audioUrl: `/uploads/music/generated/${path.basename(localAudioPath)}`,
          localPath: localAudioPath,
          generationId: taskId || uuidv4(),
          status: 'completed',
          duration: result.duration || duration,
          metadata: {
            model: requestData.mv,
            task_id: taskId,
            ...result
          }
        };
      }

      // If we only have a task_id, we need to poll for results
      // For now, return the task_id and status - the caller can poll later
      return {
        provider: 'musicapi',
        generationId: taskId,
        status: 'processing',
        taskId: taskId,
        metadata: {
          model: requestData.mv,
          ...result
        }
      };
    } catch (error) {
      // Safely extract error information without circular references
      const errorUrl = error.config?.url || 'unknown';
      const errorStatus = error.response?.status || 'no status';
      const errorData = error.response?.data || {};
      const errorInfo = {
        message: error.message,
        url: errorUrl,
        status: errorStatus,
        responseData: errorData,
        stack: error.stack
      };
      logger.error('MusicAPI.ai generation error:', errorInfo);
      throw new Error(`MusicAPI.ai error: ${error.response?.data?.error || error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Generate music using Stability Audio (Secondary Provider)
   * Documentation: https://platform.stability.ai/docs/api-reference
   */
  async generateWithStability(prompt, options) {
    const { duration, style, genre, instrumental, tempo, mood } = options;
    
    try {
      // Build prompt with additional parameters
      let enhancedPrompt = prompt;
      if (genre) enhancedPrompt += `, ${genre} genre`;
      if (style) enhancedPrompt += `, ${style} style`;
      if (mood) enhancedPrompt += `, ${mood} mood`;
      if (tempo) enhancedPrompt += `, ${tempo} BPM`;
      if (instrumental) enhancedPrompt += ', instrumental only';

      // Stability Audio API call
      const requestData = {
        prompt: enhancedPrompt,
        duration: Math.min(Math.max(duration || 30, 1), 45), // Stability typically supports 1-45 seconds
        mode: instrumental ? 'instrumental' : 'music',
        seed: Math.floor(Math.random() * 4294967295) // Random seed for variation
      };

      // Stability Audio API - try /v2alpha/generation/text-to-audio endpoint
      const endpoint = `${this.providers.stability.baseUrl}/v2alpha/generation/text-to-audio`;
      logger.info(`Stability Audio request URL: ${endpoint}`);
      
      const response = await axios.post(
        endpoint,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.providers.stability.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 300000 // 5 minutes timeout
        }
      );

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Stability API error: ${response.data?.errors?.[0]?.message || response.data?.message || 'Unknown error'}`);
      }

      const result = response.data;
      
      // Stability may return base64 audio or URL
      let audioUrl = result.audio || result.url || result.output;
      
      // If base64, save directly
      if (audioUrl && audioUrl.startsWith('data:audio')) {
        const base64Data = audioUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `stability_${uuidv4()}.mp3`;
        const localPath = path.join(this.uploadsDir, filename);
        fs.writeFileSync(localPath, buffer);
        
        return {
          provider: 'stability',
          audioUrl: `/uploads/music/generated/${filename}`,
          localPath: localPath,
          generationId: result.id || uuidv4(),
          status: 'completed',
          duration: result.duration || duration,
          metadata: {
            prompt: enhancedPrompt,
            ...result
          }
        };
      }

      if (!audioUrl) {
        throw new Error('Stability API did not return audio data or URL');
      }

      // Download and store audio locally
      const localAudioPath = await this.downloadAndStoreAudio(audioUrl, 'stability');

      return {
        provider: 'stability',
        audioUrl: `/uploads/music/generated/${path.basename(localAudioPath)}`,
        localPath: localAudioPath,
        generationId: result.id || uuidv4(),
        status: 'completed',
        duration: result.duration || duration,
        metadata: {
          prompt: enhancedPrompt,
          ...result
        }
      };
    } catch (error) {
      // Safely extract error information without circular references
      const errorUrl = error.config?.url || 'unknown';
      const errorStatus = error.response?.status || 'no status';
      const errorData = error.response?.data || {};
      const errorInfo = {
        message: error.message,
        url: errorUrl,
        status: errorStatus,
        responseData: errorData,
        stack: error.stack
      };
      logger.error('Stability Audio generation error:', errorInfo);
      throw new Error(`Stability Audio error: ${error.response?.data?.errors?.[0]?.message || error.message}`);
    }
  }

  /**
   * Generate music using sunoapi.org (Tertiary Provider)
   * Documentation: https://docs.sunoapi.org/
   */
  async generateWithSunoAPI(prompt, options) {
    const { duration, style, genre, instrumental, lyrics, tempo, mood } = options;
    
    try {
      // Build prompt with additional parameters
      let enhancedPrompt = prompt;
      if (genre) enhancedPrompt += `, ${genre} genre`;
      if (style) enhancedPrompt += `, ${style} style`;
      if (mood) enhancedPrompt += `, ${mood} mood`;
      if (tempo) enhancedPrompt += `, ${tempo} BPM`;

      // sunoapi.org API call
      const requestData = {
        prompt: enhancedPrompt,
        duration: Math.min(Math.max(duration || 30, 10), 120), // Clamp between 10-120 seconds
        instrumental: instrumental || false,
        lyrics: lyrics || null
      };

      // sunoapi.org uses /v1/music/generate endpoint
      const endpoint = `${this.providers.sunoapi.baseUrl}/v1/music/generate`;
      logger.info(`sunoapi.org request URL: ${endpoint}`);
      
      const response = await axios.post(
        endpoint,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.providers.sunoapi.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 300000 // 5 minutes timeout
        }
      );

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`sunoapi.org API error: ${response.data?.error || response.data?.message || 'Unknown error'}`);
      }

      const result = response.data;
      // Log the full response to understand the structure
      logger.info(`sunoapi.org response data: ${JSON.stringify(result)}`);
      
      // Try multiple possible response field names
      const audioUrl = result.audio_url || result.audioUrl || result.url || result.output || result.audio || 
                       result.data?.audio_url || result.data?.url || result.result?.audio_url || result.result?.url;

      if (!audioUrl) {
        logger.error(`sunoapi.org response structure: ${JSON.stringify(result, null, 2)}`);
        throw new Error('sunoapi.org did not return an audio URL');
      }

      // Download and store audio locally
      const localAudioPath = await this.downloadAndStoreAudio(audioUrl, 'sunoapi');

      return {
        provider: 'sunoapi',
        audioUrl: `/uploads/music/generated/${path.basename(localAudioPath)}`,
        localPath: localAudioPath,
        generationId: result.id || result.task_id || uuidv4(),
        status: 'completed',
        duration: result.duration || duration,
        metadata: {
          prompt: enhancedPrompt,
          ...result
        }
      };
    } catch (error) {
      // Safely extract error information without circular references
      const errorUrl = error.config?.url || 'unknown';
      const errorStatus = error.response?.status || error.status || 'no status';
      const errorData = error.response?.data || error.data || {};
      const errorInfo = {
        message: error.message,
        url: errorUrl,
        status: errorStatus,
        responseData: errorData,
        stack: error.stack
      };
      logger.error('sunoapi.org generation error:', errorInfo);
      
      // If it's a successful response but parsing failed, log the full response
      if (error.response && error.response.status === 200) {
        logger.error(`sunoapi.org successful response but parsing failed. Full response:`, error.response.data);
      }
      
      throw new Error(`sunoapi.org error: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Download and store audio file locally
   */
  async downloadAndStoreAudio(audioUrl, provider) {
    try {
      const filename = `${provider}_${uuidv4()}.mp3`;
      const localPath = path.join(this.uploadsDir, filename);

      // Handle both HTTP and HTTPS
      const protocol = audioUrl.startsWith('https') ? https : http;

      return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(localPath);
        
        protocol.get(audioUrl, (response) => {
          // Handle redirects
          if (response.statusCode === 301 || response.statusCode === 302) {
            file.close();
            fs.unlinkSync(localPath);
            return this.downloadAndStoreAudio(response.headers.location, provider)
              .then(resolve)
              .catch(reject);
          }

          if (response.statusCode !== 200) {
            file.close();
            fs.unlinkSync(localPath);
            return reject(new Error(`Failed to download audio: ${response.statusCode}`));
          }

          response.pipe(file);

          file.on('finish', () => {
            file.close();
            logger.info(`Audio downloaded and stored: ${localPath}`);
            resolve(localPath);
          });
        }).on('error', (err) => {
          file.close();
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          }
          reject(new Error(`Failed to download audio: ${err.message}`));
        });
      });
    } catch (error) {
      logger.error('Error downloading audio:', error);
      throw error;
    }
  }

  /**
   * Get music generation status from MusicAPI.ai (for async operations)
   * Documentation: https://docs.musicapi.ai/sonic-instructions
   */
  async getMusicAPIStatus(taskId) {
    try {
      // Correct endpoint from MusicAPI.ai documentation:
      // GET /api/v1/sonic/task/{task_id}
      // Documentation: https://docs.musicapi.ai/sonic-instructions
      const endpoint = `${this.providers.musicapi.baseUrl}/api/v1/sonic/task/${taskId}`;
      
      logger.info(`MusicAPI.ai status check for task_id: ${taskId}`);
      logger.info(`Using endpoint: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${this.providers.musicapi.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.status !== 200) {
        throw new Error(`MusicAPI.ai status check error: ${response.data?.error || response.data?.message || 'Unknown error'}`);
      }

      logger.info(`MusicAPI.ai status response: ${JSON.stringify(response.data, null, 2)}`);
      
      // The response structure from /api/v1/sonic/task/{task_id} may vary
      // It could return the data directly or wrapped in a data array
      const result = response.data;
      
      // Handle different response structures
      // If it's an array, get the first item
      if (Array.isArray(result)) {
        return result[0] || result;
      }
      
      // If it has a data property with array
      if (result.data && Array.isArray(result.data)) {
        return result.data[0] || result;
      }
      
      // Otherwise return as-is
      return result;
    } catch (error) {
      // Safely extract error information without circular references
      const errorUrl = error.config?.url || 'unknown';
      const errorStatus = error.response?.status || error.status || 'no status';
      const errorMessage = error.message || 'Unknown error';
      const errorResponseData = error.response?.data ? 
        (typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)) : 
        'No response data';
      
      logger.error(`MusicAPI.ai status check error - URL: ${errorUrl}, Status: ${errorStatus}, Message: ${errorMessage}`);
      if (errorResponseData !== 'No response data') {
        logger.error(`MusicAPI.ai error response: ${errorResponseData}`);
      }
      
      // Re-throw with a clean error message
      const apiError = error.response?.data?.error || error.response?.data?.message || errorMessage;
      throw new Error(`MusicAPI.ai status check error: ${apiError}`);
    }
  }

  /**
   * Poll MusicAPI.ai for music generation completion
   */
  async pollMusicAPICompletion(taskId, maxAttempts = 60, interval = 5000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, interval));

      try {
        const status = await this.getMusicAPIStatus(taskId);
        logger.info(`MusicAPI.ai task ${taskId} status (attempt ${attempt + 1}/${maxAttempts}): ${JSON.stringify(status, null, 2)}`);
        
        // Check if music is ready
        // MusicAPI.ai returns audio_url when ready
        if (status.audio_url || status.url || status.output) {
          const audioUrl = status.audio_url || status.url || status.output;
          
          // Download and store audio locally
          const localAudioPath = await this.downloadAndStoreAudio(audioUrl, 'musicapi');
          
          return {
            provider: 'musicapi',
            audioUrl: `/uploads/music/generated/${path.basename(localAudioPath)}`,
            localPath: localAudioPath,
            generationId: taskId,
            status: 'completed',
            duration: status.duration,
            metadata: {
              ...status
            }
          };
        }
        
        // Check for error status
        if (status.status === 'failed' || status.error) {
          throw new Error(`MusicAPI.ai generation failed: ${status.error || status.message || 'Unknown error'}`);
        }
        
      } catch (error) {
        // Safely extract error message without circular references
        const errorMessage = error.message || 'Unknown error';
        const errorStatus = error.response?.status || error.status || 'no status';
        
        // If it's a final error (not a retry), throw it
        if (errorMessage.includes('failed') || attempt === maxAttempts - 1) {
          logger.error(`MusicAPI.ai polling failed after ${attempt + 1} attempts: ${errorMessage} (Status: ${errorStatus})`);
          throw error;
        }
        // Otherwise, log and continue polling
        logger.warn(`MusicAPI.ai polling error (attempt ${attempt + 1}/${maxAttempts}): ${errorMessage} (Status: ${errorStatus})`);
      }
    }
    
    throw new Error(`MusicAPI.ai polling timeout after ${maxAttempts} attempts`);
  }

  /**
   * Get MusicGPT generation status
   * Documentation: https://docs.musicgpt.com/api-documentation/endpoint/getById
   */
  async getMusicGPTStatus(taskId, conversionId) {
    try {
      // MusicGPT status endpoint: GET /api/public/v1/byId (correct endpoint from docs)
      const endpoint = `${this.providers.musicgpt.baseUrl}/api/public/v1/byId`;
      
      // Build query parameters - conversionType is REQUIRED
      const params = {
        conversionType: 'MUSIC_AI' // Required parameter
      };
      
      // Add either task_id OR conversion_id (not both)
      if (conversionId) {
        params.conversion_id = conversionId;
      } else if (taskId) {
        params.task_id = taskId;
      }
      
      logger.info(`MusicGPT status check for task_id: ${taskId}, conversion_id: ${conversionId}`);
      logger.info(`Using endpoint: ${endpoint} with params:`, JSON.stringify(params));
      
      const response = await axios.get(endpoint, {
        params: params,
        headers: {
          'Authorization': `Bearer ${this.providers.musicgpt.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.status !== 200) {
        throw new Error(`MusicGPT status check error: ${response.data?.error || response.data?.message || 'Unknown error'}`);
      }

      logger.info(`MusicGPT status response: ${JSON.stringify(response.data, null, 2)}`);
      
      // Return the conversion data from the response
      return response.data?.conversion || response.data;
    } catch (error) {
      const errorUrl = error.config?.url || 'unknown';
      const errorStatus = error.response?.status || 'no status';
      const errorMessage = error.message || 'Unknown error';
      const errorResponseData = error.response?.data ? 
        (typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)) : 
        'No response data';
      
      logger.error(`MusicGPT status check error - URL: ${errorUrl}, Status: ${errorStatus}, Message: ${errorMessage}`);
      if (errorResponseData !== 'No response data') {
        logger.error(`MusicGPT error response: ${errorResponseData}`);
      }
      
      const apiError = error.response?.data?.error || error.response?.data?.message || errorMessage;
      throw new Error(`MusicGPT status check error: ${apiError}`);
    }
  }

  /**
   * Poll MusicGPT for music generation completion
   * Note: MusicGPT generates 2 versions, we'll fetch the first conversion_id
   */
  async pollMusicGPTCompletion(taskId, conversionId, maxAttempts = 60, interval = 5000) {
    // Use conversion_id_1 for polling (first generated version)
    const targetConversionId = conversionId || taskId;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, interval));

      try {
        const status = await this.getMusicGPTStatus(taskId, targetConversionId);
        logger.info(`MusicGPT conversion ${targetConversionId} status (attempt ${attempt + 1}/${maxAttempts}): ${JSON.stringify(status, null, 2)}`);
        
        // Check status field - MusicGPT uses "COMPLETED" when ready
        const statusValue = status.status || status.state || '';
        
        if (statusValue === 'COMPLETED') {
          // MusicGPT returns conversion_path_1 and conversion_path_2 (two versions)
          // We'll use the first version (conversion_path_1) by default
          const audioUrl = status.conversion_path_1 || status.conversion_path || status.audio_url || status.url;
          const title = status.title_1 || status.title || 'Generated Music';
          
          if (audioUrl) {
            // Download and store audio locally
            const localAudioPath = await this.downloadAndStoreAudio(audioUrl, 'musicgpt');
            
            return {
              provider: 'musicgpt',
              audioUrl: `/uploads/music/generated/${path.basename(localAudioPath)}`,
              localPath: localAudioPath,
              generationId: taskId,
              status: 'completed',
              duration: status.conversion_duration_1 || status.conversion_duration || status.duration,
              metadata: {
                conversion_id: status.conversion_id,
                task_id: status.task_id,
                title: title,
                title_1: status.title_1,
                title_2: status.title_2,
                lyrics: status.lyrics_1 || status.lyrics,
                conversion_path_1: status.conversion_path_1,
                conversion_path_2: status.conversion_path_2,
                album_cover: status.album_cover_path,
                ...status
              }
            };
          } else {
            logger.warn(`MusicGPT status is COMPLETED but no audio URL found`);
          }
        }
        
        // Check for error/failed status
        if (statusValue === 'FAILED' || statusValue === 'ERROR' || status.error) {
          throw new Error(`MusicGPT generation failed: ${status.error || status.message || status.reason || 'Unknown error'}`);
        }
        
        // Still processing - continue polling
        logger.info(`MusicGPT still processing... Status: ${statusValue || 'PROCESSING'}`);
        
      } catch (error) {
        const errorMessage = error.message || 'Unknown error';
        const errorStatus = error.response?.status || error.status || 'no status';
        
        // If it's a final error (not a retry), throw it
        if (errorMessage.includes('failed') || errorMessage.includes('FAILED') || attempt === maxAttempts - 1) {
          logger.error(`MusicGPT polling failed after ${attempt + 1} attempts: ${errorMessage} (Status: ${errorStatus})`);
          throw error;
        }
        // Otherwise, log and continue polling
        logger.warn(`MusicGPT polling error (attempt ${attempt + 1}/${maxAttempts}): ${errorMessage} (Status: ${errorStatus})`);
      }
    }
    
    throw new Error(`MusicGPT polling timeout after ${maxAttempts} attempts (${(maxAttempts * interval) / 1000}s)`);
  }

  /**
   * Get music generation status (for async operations)
   */
  async getGenerationStatus(generationId, provider, conversionId = null) {
    if (provider === 'musicgpt') {
      return await this.getMusicGPTStatus(generationId, conversionId);
    }
    if (provider === 'musicapi') {
      return await this.getMusicAPIStatus(generationId);
    }
    // This would be implemented for other providers if they support status checking
    throw new Error(`Status checking not yet implemented for provider: ${provider}`);
  }
}

module.exports = MusicGenerationService;

