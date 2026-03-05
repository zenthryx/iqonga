const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const database = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const fs = require('fs');
const path = require('path');

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      logger.warn('GEMINI_API_KEY not found in environment variables');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    
    // Available models – default to the latest flash variant, fall back dynamically
    this.textModel = 'gemini-1.5-flash-latest'; // Fast and widely available
    this.imageModel = 'gemini-1.5-flash-latest'; // For image generation prompts
    this.videoModel = 'gemini-1.5-flash-latest'; // For video generation prompts (text-based)
    // For actual video generation, use Veo models: 'veo-3.1-generate-preview'
  }

  /**
   * Check if Gemini service is available
   */
  isAvailable() {
    return this.genAI !== null;
  }

  /**
   * List available models (for debugging)
   */
  async listAvailableModels() {
    try {
      if (!this.isAvailable()) {
        throw new Error('Gemini API key not configured');
      }

      // Try to get available models
      // Note: The SDK doesn't have a direct listModels method, so we'll try common models
      const commonModels = [
        'gemini-pro',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-1.5-pro-latest',
        'gemini-pro-vision'
      ];

      const availableModels = [];
      
      for (const modelName of commonModels) {
        try {
          const model = this.genAI.getGenerativeModel({ model: modelName });
          // Try a simple test to see if model works
          const testResult = await model.generateContent('test');
          await testResult.response;
          availableModels.push(modelName);
        } catch (error) {
          // Model not available, skip
          logger.debug(`Model ${modelName} not available: ${error.message}`);
        }
      }

      return availableModels;
    } catch (error) {
      logger.error('Error listing available models:', error);
      return [];
    }
  }

  /**
   * Generate text content using Gemini
   */
  async generateText(prompt, options = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Gemini API key not configured');
      }

      const {
        model = this.textModel,
        temperature = 0.7,
        maxTokens = 2048,
        systemInstruction,
        context = []
      } = options;

      // Try the requested model, fallback to gemini-pro if it fails
      let geminiModel;
      let modelToUse = model;
      
      // Build the prompt with context if provided
      let fullPrompt = prompt;
      if (context.length > 0) {
        const contextText = context.map(c => `Context: ${c}`).join('\n\n');
        fullPrompt = `${contextText}\n\n${prompt}`;
      }

      // Try to generate with the requested model first
      try {
        geminiModel = this.genAI.getGenerativeModel({ 
          model: modelToUse,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
          systemInstruction: systemInstruction || undefined
        });

        const result = await geminiModel.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        return {
          text,
          model: modelToUse,
          usage: {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata?.totalTokenCount || 0
          }
        };
      } catch (error) {
        // If model fails (404 or other error), try fallback models in order
        // Try models that work with @google/generative-ai v0.24.1
        const fallbackModels = [
          'gemini-1.5-flash-latest',
          'gemini-1.5-pro-latest',
          'gemini-1.5-flash',
          'gemini-1.5-pro',
          'gemini-2.0-flash-exp',
          'gemini-2.0-pro-exp',
          'gemini-2.5-flash',
          'gemini-2.5-pro'
        ];
        
        if (error.message && error.message.includes('not found')) {
          for (const fallbackModel of fallbackModels) {
            if (modelToUse === fallbackModel) continue; // Skip if already tried
            try {
              logger.warn(`Model ${modelToUse} not available, trying ${fallbackModel}:`, error.message);
              modelToUse = fallbackModel;
              
              geminiModel = this.genAI.getGenerativeModel({ 
                model: modelToUse,
                generationConfig: {
                  temperature,
                  maxOutputTokens: maxTokens,
                },
                systemInstruction: systemInstruction || undefined
              });

              const result = await geminiModel.generateContent(fullPrompt);
              const response = await result.response;
              const text = response.text();

              return {
                text,
                model: modelToUse,
                usage: {
                  promptTokens: response.usageMetadata?.promptTokenCount || 0,
                  completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
                  totalTokens: response.usageMetadata?.totalTokenCount || 0
                }
              };
            } catch (fallbackError) {
              // Try next fallback
              continue;
            }
          }
        }
        
        // If all fallbacks failed, re-throw the original error
        throw error;
      }

    } catch (error) {
      logger.error('Error generating text with Gemini:', error);
      throw error;
    }
  }

  /**
   * Generate image using Gemini (via Imagen API)
   * Note: Gemini itself doesn't generate images directly, but we can use it
   * to create prompts for image generation or use Imagen API
   */
  async generateImage(prompt, options = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Gemini API key not configured');
      }

      const {
        style = 'realistic',
        size = '1024x1024',
        negativePrompt,
        agentId,
        userId
      } = options;

      // Build enhanced prompt
      const stylePrompts = {
        'realistic': 'photorealistic, high quality, detailed, professional photography',
        'digital_art': 'digital art, concept art, artstation quality, vibrant colors',
        'cartoon': 'cartoon style, animated, colorful, friendly',
        'anime': 'anime style, manga inspired, detailed, vibrant',
        'cyberpunk': 'cyberpunk aesthetic, neon lights, futuristic, dark atmosphere',
        'minimalist': 'minimalist design, clean, simple, elegant'
      };

      const enhancedPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.realistic}`;
      const finalPrompt = negativePrompt 
        ? `${enhancedPrompt}. Avoid: ${negativePrompt}`
        : enhancedPrompt;

      // Use Gemini to enhance the prompt first (optional)
      const promptEnhancement = await this.generateText(
        `Enhance this image generation prompt to be more detailed and specific: "${finalPrompt}". Return only the enhanced prompt, nothing else.`,
        { temperature: 0.8, maxTokens: 200 }
      );

      const optimizedPrompt = promptEnhancement.text.trim();

      // For actual image generation, we'll use Imagen API
      // Since Imagen requires a separate API, we'll use Gemini's multimodal capabilities
      // or integrate with Google's Imagen API if available
      
      // For now, we'll use a workaround: generate image description and return it
      // In production, you'd integrate with Imagen API or use another image generation service
      
      logger.info(`Gemini image generation requested for prompt: ${optimizedPrompt}`);
      
      // Placeholder: In production, integrate with Imagen API
      // For now, return a structured response that can be used with other services
      const imageId = uuidv4();
      
      return {
        id: imageId,
        prompt: optimizedPrompt,
        originalPrompt: prompt,
        style,
        size,
        note: 'Image generation via Imagen API integration required. Using Gemini for prompt optimization.',
        enhancedPrompt: optimizedPrompt
      };
    } catch (error) {
      logger.error('Error generating image with Gemini:', error);
      throw error;
    }
  }

  /**
   * Generate video clip using Gemini
   * Gemini can help create video scripts and prompts for video generation
   */
  async generateVideo(prompt, options = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Gemini API key not configured');
      }

      const {
        duration = 5, // seconds
        style = 'cinematic',
        aspectRatio = '16:9',
        agentId,
        userId
      } = options;

      let scriptText = '';
      let storyboardText = '';
      let note = 'Video generation script created. Actual video rendering requires video generation API integration.';
      let usedFallback = false;

      try {
        // Use Gemini to create a detailed video script/prompt
        const videoPrompt = `Create a detailed video generation prompt for a ${duration}-second video clip. 
Style: ${style}
Aspect Ratio: ${aspectRatio}
Main concept: ${prompt}

Provide:
1. A detailed scene-by-scene description
2. Visual style guidelines
3. Motion and camera movement instructions
4. Color palette and mood
5. Key visual elements

Format as a structured prompt suitable for video generation AI.`;

        const result = await this.generateText(videoPrompt, {
          temperature: 0.8,
          maxTokens: 1000
        });
        scriptText = (result.text || '').trim();

        // Generate storyboard descriptions
        const storyboardPrompt = `Based on this video concept: "${prompt}", create a storyboard with 5 key frames. 
For each frame, describe:
- Visual composition
- Camera angle
- Action/movement
- Duration in the ${duration}-second clip

Format as JSON array.`;

        const storyboardResult = await this.generateText(storyboardPrompt, {
          temperature: 0.7,
          maxTokens: 800
        });
        storyboardText = (storyboardResult.text || '').trim();
      } catch (error) {
        logger.error('Error generating video with Gemini:', error);
        logger.warn('Falling back to template-based video script.');
        const fallback = this.buildFallbackVideoPlan(prompt, { duration, style, aspectRatio });
        scriptText = fallback.videoScript;
        storyboardText = fallback.storyboard;
        note = fallback.note;
        usedFallback = true;
      }

      const videoId = uuidv4();

      // Save video generation request to database
      // userId is required, agentId is optional
      if (userId) {
        try {
          // Convert user_id to integer if it's UUID
          const userIdInt = typeof userId === 'string' ? parseInt(userId) : userId;
          
          // Build query with or without agent_id
          if (agentId) {
            await database.query(`
              INSERT INTO generated_videos (
                id, user_id, agent_id, prompt, style, duration, 
                aspect_ratio, video_script, storyboard, status, provider, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 'gemini', NOW())
            `, [
              videoId,
              userIdInt,
              agentId,
              prompt,
              style,
              duration,
              aspectRatio,
              scriptText,
              storyboardText
            ]);
          } else {
            await database.query(`
              INSERT INTO generated_videos (
                id, user_id, prompt, style, duration, 
                aspect_ratio, video_script, storyboard, status, provider, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'gemini', NOW())
            `, [
              videoId,
              userIdInt,
              prompt,
              style,
              duration,
              aspectRatio,
              scriptText,
              storyboardText
            ]);
          }
          
          logger.info(`Video generation record saved to database with ID: ${videoId}`);
        } catch (dbError) {
          logger.error('Failed to save video generation to database:', dbError);
          // Don't throw - allow video generation to continue even if DB save fails
        }
      } else {
        logger.warn('Video generation called without userId - skipping database save');
      }

      return {
        id: videoId,
        prompt,
        videoScript: scriptText,
        storyboard: storyboardText,
        duration,
        style,
        aspectRatio,
        status: 'pending',
        note,
        fallbackUsed: usedFallback,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error generating video with Gemini:', error);
      throw error;
    }
  }

  buildFallbackVideoPlan(prompt, options = {}) {
    const {
      duration = 5,
      style = 'cinematic',
      aspectRatio = '16:9'
    } = options;

    const sceneCount = Math.max(3, Math.min(6, Math.round(duration)));
    const sceneDuration = Math.max(1, (duration / sceneCount)).toFixed(1);

    const styleDescriptions = {
      cinematic: 'sweeping cinematic visuals with dramatic lighting',
      realistic: 'photorealistic shots with natural lighting',
      artistic: 'stylized artistic visuals with expressive colors',
      animated: 'playful animated styling with bold shapes',
      documentary: 'documentary style shots with handheld camera energy'
    };

    const cameraMoves = [
      'slow dolly forward',
      'wide establishing shot',
      'steady cam lateral move',
      'aerial reveal',
      'close-up focus pull'
    ];

    const scriptParts = [];
    const storyboard = [];

    for (let i = 0; i < sceneCount; i++) {
      const sceneNumber = i + 1;
      const cameraMove = cameraMoves[i % cameraMoves.length];
      const sceneDescription = `Scene ${sceneNumber} (${sceneDuration}s): ${styleDescriptions[style] || styleDescriptions.cinematic}. Highlight "${prompt}" with a ${cameraMove}.`;
      scriptParts.push(sceneDescription);

      storyboard.push({
        frame: sceneNumber,
        description: `Frame ${sceneNumber}: Focus on ${prompt} with ${cameraMove}.`,
        camera: cameraMove,
        durationSeconds: sceneDuration,
        aspectRatio
      });
    }

    return {
      videoScript: scriptParts.join('\n\n'),
      storyboard: JSON.stringify(storyboard, null, 2),
      note: 'Gemini service unavailable – using fallback storyboard template.'
    };
  }

  /**
   * Generate content for an agent (similar to AIContentService)
   */
  async generateContentForAgent(agent, options = {}) {
    try {
      const {
        content_type = 'tweet',
        topic,
        style,
        length = 'medium',
        context,
        hashtags = true,
        emojis = true
      } = options;

      // Build system instruction based on agent personality
      const systemInstruction = `You are ${agent.name}, a ${agent.personality_type} AI agent. 
Your voice tone is: ${agent.voice_tone || 'professional'}
Your target topics: ${agent.target_topics || 'general'}

Generate ${content_type} content that matches your personality and voice.`;

      // Build the prompt
      let prompt = `Generate a ${content_type} about ${topic || 'general topics'}. `;
      prompt += `Style: ${style || 'engaging'}. `;
      prompt += `Length: ${length}. `;
      
      if (hashtags) {
        prompt += 'Include relevant hashtags. ';
      }
      if (emojis) {
        prompt += 'Use appropriate emojis. ';
      }

      const result = await this.generateText(prompt, {
        systemInstruction,
        temperature: this.getTemperature(style),
        maxTokens: this.getMaxTokens(length),
        context: context ? [context] : []
      });

      return {
        content: result.text,
        model: result.model,
        usage: result.usage,
        generation_config: {
          content_type,
          topic,
          style,
          length,
          hashtags,
          emojis,
          provider: 'gemini'
        }
      };
    } catch (error) {
      logger.error('Error generating content for agent with Gemini:', error);
      throw error;
    }
  }

  /**
   * Helper: Get temperature based on style
   */
  getTemperature(style) {
    const tempMap = {
      'creative': 0.9,
      'engaging': 0.8,
      'professional': 0.6,
      'casual': 0.7,
      'formal': 0.5
    };
    return tempMap[style] || 0.7;
  }

  /**
   * Helper: Get max tokens based on length
   */
  getMaxTokens(length) {
    const tokenMap = {
      'short': 150,
      'medium': 500,
      'long': 2000
    };
    return tokenMap[length] || 500;
  }

  /**
   * Generate image for agent (with company context)
   */
  async generateImageForAgent(agent, prompt, options = {}) {
    try {
      // Get company data for context
      const AIContentService = require('./AIContentService');
      const aiService = new AIContentService();
      const companyData = await aiService.getCompanyData(agent.user_id);

      let enhancedPrompt = prompt;
      if (companyData.company) {
        enhancedPrompt = `${prompt}. Style: ${agent.personality_type} AI agent representing ${companyData.company.company_name}. Brand: ${companyData.company.brand_voice || 'professional'}`;
      }

      const result = await this.generateImage(enhancedPrompt, {
        ...options,
        agentId: agent.id,
        userId: agent.user_id
      });

      // Save to database
      const imageId = result.id;
      try {
        // Convert user_id to integer if it's UUID
        const userId = typeof agent.user_id === 'string' ? parseInt(agent.user_id) : agent.user_id;
        
        await database.query(`
          INSERT INTO generated_images (
            id, user_id, agent_id, prompt, style, size, image_url, 
            metadata, provider, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'gemini', NOW())
          RETURNING id
        `, [
          imageId,
          userId,
          agent.id,
          result.enhancedPrompt || result.prompt,
          options.style || 'realistic',
          options.size || '1024x1024',
          null, // Will be set when image is actually generated
          JSON.stringify({
            agentName: agent.name,
            personalityType: agent.personality_type,
            generatedAt: new Date().toISOString(),
            originalPrompt: prompt,
            provider: 'gemini'
          })
        ]);
      } catch (dbError) {
        logger.warn('Failed to save Gemini image to database:', dbError);
      }

      return result;
    } catch (error) {
      logger.error('Error generating image for agent with Gemini:', error);
      throw error;
    }
  }
}

module.exports = new GeminiService();

