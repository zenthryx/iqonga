const logger = require('../utils/logger');
const database = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const CreditService = require('./CreditService');
const ServicePricingService = require('./ServicePricingService');

/**
 * EBook Cover Design Service
 * Generates eBook covers using AI image generation
 */
class EBookCoverService {
  constructor() {
    this.creditService = new CreditService();
    this.coversDir = path.join(__dirname, '../../uploads/ebook-covers');
    if (!fs.existsSync(this.coversDir)) {
      fs.mkdirSync(this.coversDir, { recursive: true });
    }
  }

  /**
   * Generate cover image using AI
   */
  async generateCover(projectId, userId, options = {}) {
    try {
      logger.info(`Generating cover for project ${projectId}`);

      const {
        title,
        subtitle,
        author,
        genre,
        style = 'modern',
        colorScheme = 'auto',
        template = null,
        customPrompt = null
      } = options;

      // Calculate credit cost
      const creditCost = await ServicePricingService.getPricing('ebook_cover_generation') || 100;

      // Deduct credits
      const generationId = uuidv4();
      try {
        await this.creditService.deductCredits(userId, 'ebook_cover_generation', creditCost, generationId);
      } catch (creditError) {
        throw new Error(`Insufficient credits: ${creditError.message}`);
      }

      // Generate cover prompt
      const prompt = this.buildCoverPrompt(title, subtitle, author, genre, style, colorScheme, customPrompt);

      // Generate image using DALL-E or similar
      const coverImage = await this.generateCoverImage(prompt, style);

      // Save cover image
      const coverId = uuidv4();
      const fileName = `cover_${coverId}.png`;
      const filePath = path.join(this.coversDir, fileName);
      
      // Download and save image
      const imageResponse = await axios.get(coverImage.url, { responseType: 'arraybuffer' });
      fs.writeFileSync(filePath, imageResponse.data);

      const coverUrl = `/api/uploads/ebook-covers/${fileName}`;

      // Update project with cover
      await database.query(`
        UPDATE ebook_projects
        SET cover_image_url = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3
      `, [coverUrl, projectId, userId]);

      // Save cover metadata
      await database.query(`
        INSERT INTO ebook_covers (
          id, project_id, user_id, cover_url, style, color_scheme,
          prompt_used, credits_used, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        coverId,
        projectId,
        userId,
        coverUrl,
        style,
        colorScheme,
        prompt,
        creditCost,
        JSON.stringify({
          title,
          subtitle,
          author,
          genre,
          generationId
        })
      ]);

      logger.info(`Cover generated successfully: ${coverId}`);

      return {
        success: true,
        cover: {
          id: coverId,
          url: coverUrl,
          style,
          colorScheme
        },
        creditsUsed: creditCost
      };
    } catch (error) {
      logger.error('Failed to generate cover:', error);
      throw error;
    }
  }

  /**
   * Build cover generation prompt
   */
  buildCoverPrompt(title, subtitle, author, genre, style, colorScheme, customPrompt) {
    if (customPrompt) {
      return customPrompt;
    }

    const styleDescriptions = {
      modern: 'modern, clean, minimalist design with bold typography',
      classic: 'classic, elegant design with traditional typography',
      artistic: 'artistic, creative design with unique visual elements',
      minimalist: 'minimalist design with simple, clean lines',
      bold: 'bold, eye-catching design with vibrant colors',
      professional: 'professional, corporate design suitable for business books'
    };

    const genreKeywords = {
      fiction: 'literary, storytelling, narrative',
      'science-fiction': 'futuristic, space, technology, sci-fi',
      fantasy: 'magical, mystical, fantasy elements',
      mystery: 'suspenseful, mysterious, detective',
      romance: 'romantic, passionate, emotional',
      thriller: 'intense, suspenseful, action-packed',
      horror: 'dark, eerie, frightening',
      business: 'professional, corporate, business-oriented',
      'self-help': 'inspirational, motivational, self-improvement',
      biography: 'personal, biographical, historical'
    };

    const colorDescriptions = {
      warm: 'warm color palette with oranges, reds, and yellows',
      cool: 'cool color palette with blues, greens, and purples',
      vibrant: 'vibrant, saturated colors',
      muted: 'muted, pastel colors',
      monochrome: 'black and white or grayscale',
      auto: 'appropriate colors for the genre'
    };

    let prompt = `eBook cover design for "${title}"`;
    
    if (subtitle) {
      prompt += ` - ${subtitle}`;
    }
    
    if (author) {
      prompt += ` by ${author}`;
    }

    prompt += `. ${styleDescriptions[style] || styleDescriptions.modern}`;

    if (genre && genreKeywords[genre.toLowerCase()]) {
      prompt += `, ${genreKeywords[genre.toLowerCase()]}`;
    }

    prompt += `. ${colorDescriptions[colorScheme] || colorDescriptions.auto}`;
    prompt += `. Professional eBook cover, high quality, 3D book cover mockup, suitable for Amazon Kindle and other platforms.`;

    return prompt;
  }

  /**
   * Generate cover image using DALL-E
   */
  async generateCoverImage(prompt, style) {
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      // Generate image using DALL-E 3
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        size: '1024x1024', // Square format for eBook covers
        quality: 'hd',
        n: 1
      });

      return {
        url: response.data[0].url
      };
    } catch (error) {
      logger.error('DALL-E image generation error:', error);
      throw new Error(`Failed to generate cover image: ${error.message}`);
    }
  }

  /**
   * Get cover templates
   */
  getCoverTemplates() {
    return [
      {
        id: 'modern-minimal',
        name: 'Modern Minimalist',
        description: 'Clean, simple design with bold typography',
        style: 'modern',
        colorScheme: 'auto'
      },
      {
        id: 'classic-elegant',
        name: 'Classic Elegant',
        description: 'Traditional, sophisticated design',
        style: 'classic',
        colorScheme: 'warm'
      },
      {
        id: 'artistic-creative',
        name: 'Artistic Creative',
        description: 'Unique, creative visual design',
        style: 'artistic',
        colorScheme: 'vibrant'
      },
      {
        id: 'professional-business',
        name: 'Professional Business',
        description: 'Corporate, business-oriented design',
        style: 'professional',
        colorScheme: 'cool'
      },
      {
        id: 'bold-vibrant',
        name: 'Bold Vibrant',
        description: 'Eye-catching, colorful design',
        style: 'bold',
        colorScheme: 'vibrant'
      }
    ];
  }

  /**
   * Get project covers
   */
  async getProjectCovers(projectId, userId) {
    try {
      const result = await database.query(`
        SELECT * FROM ebook_covers
        WHERE project_id = $1 AND user_id = $2
        ORDER BY created_at DESC
      `, [projectId, userId]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get project covers:', error);
      throw error;
    }
  }
}

module.exports = new EBookCoverService();

