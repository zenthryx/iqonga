const database = require('../database/connection');
const AIContentService = require('./AIContentService');
const VideoGenerationService = require('./VideoGenerationService');
const CreditService = require('./CreditService');
const ServicePricingService = require('./ServicePricingService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Multi-Modal Content Service
 * Generates complete content packages: text + images + videos
 */
class MultiModalContentService {
  constructor() {
    this.contentService = AIContentService;
    this.videoService = VideoGenerationService; // VideoGenerationService is exported as an instance
    this.creditService = new CreditService();
  }

  /**
   * Generate a complete content package (text + image + video)
   * @param {object} agent - AI agent configuration
   * @param {object} options - Generation options
   * @returns {Promise<object>} Complete content package
   */
  async generateContentPackage(agent, options = {}) {
    try {
      const {
        content_type = 'tweet',
        topic,
        style,
        length = 'medium',
        context,
        hashtags = true,
        emojis = true,
        template_id = null,
        // Multi-modal options
        include_image = true,
        include_video = false,
        image_style = 'realistic',
        image_size = '1024x1024',
        video_duration = 15, // seconds
        video_provider = 'heygen', // or 'runwayml', 'pika', etc.
        platform = 'twitter' // for platform-specific optimization
      } = options;

      const userId = agent.user_id;
      const packageId = uuidv4();
      const results = {
        package_id: packageId,
        text: null,
        image: null,
        video: null,
        errors: [],
        credits_used: 0
      };

      // Step 1: Generate text content
      try {
        logger.info(`[MultiModal] Generating text content for package ${packageId}`);
        const textResult = await this.contentService.generateContent(agent, {
          content_type,
          topic,
          style,
          length,
          context,
          hashtags,
          emojis,
          template_id
        });

        results.text = {
          content: typeof textResult.content === 'string' 
            ? textResult.content 
            : textResult.content[0]?.content || textResult.content,
          model_used: textResult.model_used,
          generation_config: textResult.generation_config
        };
      } catch (error) {
        logger.error(`[MultiModal] Text generation failed:`, error);
        results.errors.push({ type: 'text', error: error.message });
      }

      // Step 2: Generate image (if requested)
      if (include_image && results.text) {
        try {
          logger.info(`[MultiModal] Generating image for package ${packageId}`);
          
          // Extract image prompt from text content
          const imagePrompt = this.extractImagePrompt(results.text.content, topic, agent);
          
          // Generate image
          const imageResult = await this.contentService.generateImageForAgent(agent, imagePrompt, {
            style: image_style,
            size: image_size
          });

          results.image = {
            id: imageResult.id,
            url: imageResult.image_url || imageResult.url,
            prompt: imagePrompt,
            style: image_style,
            size: image_size
          };
        } catch (error) {
          logger.error(`[MultiModal] Image generation failed:`, error);
          results.errors.push({ type: 'image', error: error.message });
        }
      }

      // Step 3: Generate video (if requested)
      if (include_video && results.text) {
        try {
          logger.info(`[MultiModal] Generating video for package ${packageId}`);
          
          // Extract video script from text content
          const videoScript = this.extractVideoScript(results.text.content, topic, agent, video_duration);
          
          // Generate video based on provider
          let videoResult;
          if (video_provider === 'heygen') {
            // HeyGen avatar video
            videoResult = await this.generateHeyGenVideo(agent, videoScript, {
              duration: video_duration
            });
          } else {
            // Other video providers (RunwayML, Pika, etc.)
            videoResult = await this.videoService.generateVideo({
              prompt: videoScript,
              duration: video_duration,
              provider: video_provider
            });
          }

          results.video = {
            id: videoResult.id || videoResult.video_id,
            url: videoResult.video_url || videoResult.url,
            script: videoScript,
            duration: video_duration,
            provider: video_provider
          };
        } catch (error) {
          logger.error(`[MultiModal] Video generation failed:`, error);
          results.errors.push({ type: 'video', error: error.message });
        }
      }

      // Calculate total credits used
      results.credits_used = this.calculateCreditsUsed(results, {
        include_image,
        include_video
      });

      // Save package to database
      try {
        await this.saveContentPackage(userId, agent.id, results, options);
      } catch (error) {
        logger.error(`[MultiModal] Failed to save package:`, error);
        // Don't fail the whole operation if save fails
      }

      return {
        success: true,
        package: results,
        platform_optimized: this.optimizeForPlatform(results, platform)
      };
    } catch (error) {
      logger.error('[MultiModal] Content package generation failed:', error);
      throw error;
    }
  }

  /**
   * Extract image prompt from text content
   */
  extractImagePrompt(textContent, topic, agent) {
    // Use AI to generate a visual description based on the text
    // For now, create a simple prompt from the content
    const cleanText = textContent.replace(/#\w+/g, '').replace(/@\w+/g, '').trim();
    const maxLength = 200;
    const truncated = cleanText.length > maxLength 
      ? cleanText.substring(0, maxLength) + '...'
      : cleanText;
    
    return `Visual representation of: ${truncated}. Style: ${agent.personality_type || 'professional'}, engaging, social media optimized`;
  }

  /**
   * Extract video script from text content
   */
  extractVideoScript(textContent, topic, agent, duration) {
    // Create a concise script for video narration
    const cleanText = textContent.replace(/#\w+/g, '').replace(/@\w+/g, '').trim();
    
    // For short videos, use the text directly or a summary
    if (duration <= 15) {
      return cleanText.length > 150 
        ? cleanText.substring(0, 150) + '...'
        : cleanText;
    }
    
    // For longer videos, create a more detailed script
    return `Video script about: ${topic}. Content: ${cleanText}`;
  }

  /**
   * Generate HeyGen avatar video
   */
  async generateHeyGenVideo(agent, script, options = {}) {
    // This would integrate with HeyGen API
    // For now, return a placeholder structure
    // TODO: Implement actual HeyGen integration
    logger.warn('[MultiModal] HeyGen video generation not yet fully implemented');
    
    return {
      id: uuidv4(),
      video_url: null, // Would be set after HeyGen generation
      script: script,
      duration: options.duration || 15,
      provider: 'heygen',
      status: 'pending'
    };
  }

  /**
   * Calculate total credits used
   */
  calculateCreditsUsed(results, options) {
    let total = 0;
    
    // Text generation credits
    if (results.text) {
      total += results.text.content_type === 'reply' ? 20 : 20; // Standard content generation cost
    }
    
    // Image generation credits
    if (options.include_image && results.image) {
      total += 50; // Approximate image generation cost
    }
    
    // Video generation credits
    if (options.include_video && results.video) {
      const duration = results.video.duration || 15;
      total += Math.ceil(duration / 60) * 150; // HeyGen costs ~150 credits per minute
    }
    
    return total;
  }

  /**
   * Optimize content package for specific platform
   */
  optimizeForPlatform(contentPackage, platform) {
    const optimized = { ...contentPackage };
    
    switch (platform.toLowerCase()) {
      case 'twitter':
        // Twitter-specific optimizations
        if (optimized.text) {
          // Ensure text fits Twitter character limits
          const maxLength = 280;
          if (optimized.text.content.length > maxLength) {
            optimized.text.content = optimized.text.content.substring(0, maxLength - 3) + '...';
          }
        }
        // Twitter prefers square or 16:9 images
        if (optimized.image && optimized.image.size !== '1024x1024') {
          optimized.image.recommended_size = '1024x1024';
        }
        break;
        
      case 'instagram':
        // Instagram-specific optimizations
        if (optimized.image) {
          optimized.image.recommended_size = '1080x1080'; // Square for Instagram
        }
        if (optimized.video) {
          optimized.video.recommended_duration = 15; // Instagram Reels prefer 15s
        }
        break;
        
      case 'linkedin':
        // LinkedIn-specific optimizations
        if (optimized.text) {
          // LinkedIn allows longer content
          optimized.text.max_length = 3000;
        }
        if (optimized.image) {
          optimized.image.recommended_size = '1200x627'; // LinkedIn image ratio
        }
        break;
    }
    
    return optimized;
  }

  /**
   * Save content package to database
   */
  async saveContentPackage(userId, agentId, packageData, options) {
    try {
      // Check if content_packages table exists, if not create it
      await database.query(`
        CREATE TABLE IF NOT EXISTS content_packages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
          package_type VARCHAR(50) DEFAULT 'multimodal',
          text_content TEXT,
          image_id UUID REFERENCES generated_images(id) ON DELETE SET NULL,
          video_id UUID REFERENCES generated_videos(id) ON DELETE SET NULL,
          platform VARCHAR(50),
          metadata JSONB,
          credits_used INTEGER DEFAULT 0,
          status VARCHAR(20) DEFAULT 'completed',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Insert package
      const result = await database.query(`
        INSERT INTO content_packages (
          id, user_id, agent_id, package_type, text_content, 
          image_id, video_id, platform, metadata, credits_used, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        packageData.package_id,
        userId,
        agentId,
        'multimodal',
        packageData.text?.content || null,
        packageData.image?.id || null,
        packageData.video?.id || null,
        options.platform || 'twitter',
        JSON.stringify({
          text: packageData.text,
          image: packageData.image,
          video: packageData.video,
          errors: packageData.errors,
          options: options
        }),
        packageData.credits_used,
        packageData.errors.length > 0 ? 'partial' : 'completed'
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error('[MultiModal] Failed to save content package:', error);
      throw error;
    }
  }

  /**
   * Get content packages for a user
   */
  async getUserPackages(userId, limit = 20, offset = 0) {
    try {
      const result = await database.query(`
        SELECT * FROM content_packages
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return result.rows;
    } catch (error) {
      logger.error('[MultiModal] Failed to fetch user packages:', error);
      return [];
    }
  }

  /**
   * Get a specific content package
   */
  async getPackage(packageId, userId) {
    try {
      const result = await database.query(`
        SELECT * FROM content_packages
        WHERE id = $1 AND user_id = $2
      `, [packageId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const contentPackage = result.rows[0];
      contentPackage.metadata = typeof contentPackage.metadata === 'string' 
        ? JSON.parse(contentPackage.metadata)
        : contentPackage.metadata;

      return contentPackage;
    } catch (error) {
      logger.error('[MultiModal] Failed to fetch package:', error);
      throw error;
    }
  }
}

module.exports = MultiModalContentService;

