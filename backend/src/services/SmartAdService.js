const OpenAI = require('openai');
const logger = require('../utils/logger');
const database = require('../database/connection');
const AIContentService = require('./AIContentService');
const VideoGenerationService = require('./VideoGenerationService');
const GeminiService = require('./GeminiService');
const ReplicateService = require('./ReplicateService');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const MediaService = require('./MediaService');
const BrandBookService = require('./BrandBookService');
const ProductImageService = require('./ProductImageService');

/**
 * Smart Ad Service
 * AI-driven ad generator that creates platform-specific ad creatives
 * combining text, images, videos, and UGC content
 */
class SmartAdService {
  constructor() {
    // Lazy initialization of OpenAI client to avoid errors during route loading
    this._openai = null;
    
    // Ensure uploads directory exists for storing generated images
    this.uploadsDir = path.join(__dirname, '../../uploads/smart-ads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    
    // Platform-specific ad format configurations
    this.platformFormats = {
      facebook: {
        feed: { aspectRatio: '1:1', maxTextLength: 125, imageSize: '1080x1080', videoMaxDuration: 240 },
        story: { aspectRatio: '9:16', maxTextLength: 125, imageSize: '1080x1920', videoMaxDuration: 15 },
        carousel: { aspectRatio: '1:1', maxTextLength: 125, imageSize: '1080x1080', maxImages: 10 },
        reels: { aspectRatio: '9:16', maxTextLength: 2200, videoMaxDuration: 90 }
      },
      instagram: {
        feed: { aspectRatio: '1:1', maxTextLength: 2200, imageSize: '1080x1080', videoMaxDuration: 60 },
        story: { aspectRatio: '9:16', maxTextLength: 2200, imageSize: '1080x1920', videoMaxDuration: 15 },
        reels: { aspectRatio: '9:16', maxTextLength: 2200, videoMaxDuration: 90 },
        carousel: { aspectRatio: '1:1', maxTextLength: 2200, imageSize: '1080x1080', maxImages: 10 }
      },
      tiktok: {
        feed: { aspectRatio: '9:16', maxTextLength: 150, videoMaxDuration: 180 },
        spark: { aspectRatio: '9:16', maxTextLength: 150, videoMaxDuration: 60 }
      },
      twitter: {
        feed: { aspectRatio: '16:9', maxTextLength: 280, imageSize: '1200x675', videoMaxDuration: 140 },
        square: { aspectRatio: '1:1', maxTextLength: 280, imageSize: '1080x1080' }
      },
      linkedin: {
        feed: { aspectRatio: '1.91:1', maxTextLength: 700, imageSize: '1200x627', videoMaxDuration: 600 },
        square: { aspectRatio: '1:1', maxTextLength: 700, imageSize: '1080x1080' }
      },
      youtube: {
        shorts: { aspectRatio: '9:16', maxTextLength: 100, videoMaxDuration: 60 },
        video: { aspectRatio: '16:9', maxTextLength: 5000, videoMaxDuration: 3600 }
      },
      google: {
        display: { aspectRatio: '1.91:1', maxTextLength: 90, imageSize: '1200x628' },
        square: { aspectRatio: '1:1', maxTextLength: 90, imageSize: '1200x1200' },
        responsive: { aspectRatio: 'multiple', maxTextLength: 90 }
      }
    };

    // Ad types
    this.adTypes = [
      'product_showcase',      // Product-focused ads
      'brand_awareness',       // Brand building ads
      'testimonial',           // Customer testimonial/UGC style
      'promotional',           // Sale/discount focused
      'educational',           // How-to/educational content
      'storytelling',          // Narrative-driven ads
      'comparison',            // Us vs. competitors
      'social_proof',          // Reviews/ratings focused
      'urgency',               // Limited time offers
      'lifestyle'              // Lifestyle/aspirational content
    ];

    // Visual styles for image generation
    this.visualStyles = {
      modern: 'clean, minimalist, contemporary design with bold typography',
      luxury: 'premium, elegant, sophisticated with gold accents and serif fonts',
      playful: 'colorful, fun, energetic with rounded shapes and bright colors',
      professional: 'corporate, trustworthy, clean lines with blue tones',
      bold: 'high contrast, impactful, attention-grabbing with large text',
      lifestyle: 'authentic, natural lighting, lifestyle photography style',
      tech: 'futuristic, gradient backgrounds, neon accents, tech-forward',
      organic: 'natural, earthy tones, organic shapes, sustainable feel',
      vintage: 'retro aesthetics, nostalgic feel, vintage color grading',
      minimalist: 'simple, lots of white space, focus on product'
    };
  }

  /**
   * Lazy getter for OpenAI client
   * Initializes the client only when needed to avoid errors during route loading
   */
  get openai() {
    if (!this._openai) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required for ad generation');
      }
      this._openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this._openai;
  }

  /**
   * Generate a complete ad creative package
   * @param {object} options - Ad generation options
   * @returns {Promise<object>} Generated ad package with all variants
   */
  async generateAd(options) {
    const {
      userId,
      agentId,
      productId,
      productName,
      productDescription,
      productImageUrl,
      targetPlatforms = ['facebook', 'instagram'],
      adType = 'product_showcase',
      targetAudience,
      brandVoice,
      callToAction = 'Shop Now',
      promotionalDetails,
      visualStyle = 'modern',
      generateVideo = false,
      generateUGC = false,
      ugcAvatarId = null,
      ugcLookId = null,
      variantCount = 3,
      customInstructions,
      imageProvider = process.env.GEMINI_API_KEY ? 'gemini' : 'openai' // Default to Google Imagen if available, otherwise OpenAI DALL-E
    } = options;

    const adId = uuidv4();
    logger.info(`Starting Smart Ad generation: ${adId}`);

    try {
      // Get company/brand context
      const companyData = await this.getCompanyData(userId);
      
      // Get brand guidelines
      const brandGuidelines = await BrandBookService.getBrandGuidelinesForAI(userId);
      
      // Get product images if productId is provided
      if (productId && !productImageUrl) {
        const primaryImage = await ProductImageService.getPrimaryProductImage(productId);
        if (primaryImage) {
          productImageUrl = primaryImage.file_url;
        }
      }
      
      // Generate ad copy variants
      const copyVariants = await this.generateAdCopy({
        productName,
        productDescription,
        adType,
        targetAudience: targetAudience || companyData.company?.target_audience,
        brandVoice: brandVoice || brandGuidelines?.brandVoice || companyData.company?.brand_voice,
        callToAction,
        promotionalDetails,
        variantCount,
        customInstructions: brandGuidelines ? 
          `${customInstructions || ''}\n\nBrand Guidelines:\n- Brand Voice: ${brandGuidelines.brandVoice || 'N/A'}\n- Brand Values: ${(brandGuidelines.brandValues || []).join(', ')}\n- Tone of Voice: ${brandGuidelines.toneOfVoice || 'N/A'}\n- Brand Messaging: ${brandGuidelines.brandMessaging || 'N/A'}`.trim() :
          customInstructions,
        platforms: targetPlatforms
      });

      // Generate visual assets for each platform with brand guidelines
      const visualAssets = await this.generateVisualAssets({
        productName,
        productDescription,
        productImageUrl,
        visualStyle: visualStyle || brandGuidelines?.imageStylePreferences?.preferredStyle || visualStyle,
        platforms: targetPlatforms,
        adType,
        brandVoice: brandVoice || brandGuidelines?.brandVoice || companyData.company?.brand_voice,
        companyName: companyData.company?.company_name,
        imageProvider,
        brandColors: brandGuidelines ? {
          primary: brandGuidelines.primaryColors || [],
          secondary: brandGuidelines.secondaryColors || [],
          accent: brandGuidelines.accentColors || []
        } : null,
        brandLogo: brandGuidelines?.primaryLogoUrl || null
      });

      // Generate video if requested
      let videoAssets = null;
      if (generateVideo) {
        videoAssets = await this.generateVideoAd({
          productName,
          productDescription,
          productImageUrl,
          adCopy: copyVariants[0],
          platforms: targetPlatforms,
          visualStyle,
          companyData,
          videoProvider: options.videoProvider || 'runwayml'
        });
      }

      // Generate UGC-style content if requested
      let ugcAssets = null;
      if (generateUGC) {
        ugcAssets = await this.generateUGCContent({
          productName,
          productDescription,
          targetAudience: targetAudience || companyData.company?.target_audience,
          adCopy: copyVariants[0],
          platforms: targetPlatforms,
          ugcAvatarId: options.ugcAvatarId || null,
          ugcLookId: options.ugcLookId || null
        });
      }

      // Bundle platform-specific ad packages
      const adPackages = this.bundleAdPackages({
        copyVariants,
        visualAssets,
        videoAssets,
        ugcAssets,
        platforms: targetPlatforms,
        callToAction
      });

      // Save to database
      await this.saveAdCreative({
        adId,
        userId,
        agentId,
        productId,
        adType,
        platforms: targetPlatforms,
        copyVariants,
        visualAssets,
        videoAssets,
        ugcAssets,
        adPackages,
        options
      });

      // Store generated assets in Media Library for user to reuse later
      try {
        // Store images
        for (const [platform, formats] of Object.entries(visualAssets)) {
          for (const [format, asset] of Object.entries(formats)) {
            if (asset.imageUrl && asset.imageUrl.startsWith('/uploads/')) {
              const fullPath = path.join(__dirname, '../../', asset.imageUrl);
              if (fs.existsSync(fullPath)) {
                await this.storeAssetInMediaLibrary(userId, fullPath, 'image', {
                  description: `Smart Ad - ${platform} ${format}`,
                  tags: ['smart-ad', platform, format],
                  adId
                });
              }
            }
          }
        }

        // Store videos
        if (videoAssets) {
          for (const [platform, formats] of Object.entries(videoAssets)) {
            for (const [format, asset] of Object.entries(formats)) {
              if (asset.videoUrl && asset.videoUrl.startsWith('/uploads/')) {
                const fullPath = path.join(__dirname, '../../', asset.videoUrl);
                if (fs.existsSync(fullPath)) {
                  await this.storeAssetInMediaLibrary(userId, fullPath, 'video', {
                    description: `Smart Ad Video - ${platform} ${format}`,
                    tags: ['smart-ad', 'video', platform, format],
                    adId
                  });
                }
              }
            }
          }
        }

        // Store UGC videos
        if (ugcAssets) {
          for (const [platform, asset] of Object.entries(ugcAssets)) {
            if (asset.videoUrl && asset.videoUrl.startsWith('/uploads/')) {
              const fullPath = path.join(__dirname, '../../', asset.videoUrl);
              if (fs.existsSync(fullPath)) {
                await this.storeAssetInMediaLibrary(userId, fullPath, 'video', {
                  description: `Smart Ad UGC - ${platform}`,
                  tags: ['smart-ad', 'ugc', 'video', platform],
                  adId
                });
              }
            }
          }
        }
      } catch (mediaError) {
        logger.warn('Failed to store assets in Media Library (non-critical):', mediaError);
        // Don't fail the entire ad generation if Media Library storage fails
      }

      return {
        success: true,
        adId,
        adType,
        platforms: targetPlatforms,
        copyVariants,
        visualAssets,
        videoAssets,
        ugcAssets,
        adPackages,
        metadata: {
          generatedAt: new Date().toISOString(),
          variantCount,
          visualStyle,
          includesVideo: generateVideo,
          includesUGC: generateUGC
        }
      };

    } catch (error) {
      // Extract error message to avoid circular structure issues
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      logger.error(`Smart Ad generation failed: ${adId} - ${errorMessage}`);
      throw new Error(`Failed to generate ad: ${errorMessage}`);
    }
  }

  /**
   * Generate ad copy variants
   */
  async generateAdCopy(options) {
    const {
      productName,
      productDescription,
      adType,
      targetAudience,
      brandVoice,
      callToAction,
      promotionalDetails,
      variantCount,
      customInstructions,
      platforms
    } = options;

    // Get platform-specific constraints
    const maxTextLength = Math.min(
      ...platforms.map(p => this.platformFormats[p]?.feed?.maxTextLength || 280)
    );

    const adTypePrompts = {
      product_showcase: 'Focus on product features and benefits. Highlight what makes this product unique.',
      brand_awareness: 'Focus on brand values and emotional connection. Tell a story about the brand.',
      testimonial: 'Write as if a satisfied customer is sharing their experience. Use first person.',
      promotional: 'Emphasize the deal/discount. Create urgency. Highlight savings.',
      educational: 'Teach something valuable. Position the product as the solution.',
      storytelling: 'Create a mini-narrative. Hook, tension, resolution with product.',
      comparison: 'Subtly highlight advantages over alternatives without naming competitors.',
      social_proof: 'Incorporate statistics, reviews, or social validation.',
      urgency: 'Create FOMO. Limited time, limited stock, exclusive access.',
      lifestyle: 'Paint a picture of the ideal life with this product. Aspirational.'
    };

    const prompt = `You are an expert advertising copywriter. Generate ${variantCount} distinct ad copy variants for the following:

PRODUCT: ${productName}
DESCRIPTION: ${productDescription}
AD TYPE: ${adType} - ${adTypePrompts[adType] || 'Create compelling ad copy'}
TARGET AUDIENCE: ${targetAudience || 'General consumers'}
BRAND VOICE: ${brandVoice || 'Professional and friendly'}
CALL TO ACTION: ${callToAction}
${promotionalDetails ? `PROMOTIONAL DETAILS: ${promotionalDetails}` : ''}
${customInstructions ? `SPECIAL INSTRUCTIONS: ${customInstructions}` : ''}

CONSTRAINTS:
- Maximum character count: ${maxTextLength} characters per variant
- Target platforms: ${platforms.join(', ')}
- Each variant should be distinctly different in approach
- Include relevant emojis where appropriate
- Make it scroll-stopping and engaging

Generate ${variantCount} ad copy variants in JSON format:
{
  "variants": [
    {
      "headline": "Short attention-grabbing headline (max 40 chars)",
      "primaryText": "Main ad body text",
      "description": "Optional secondary text for platforms that support it",
      "hashtags": ["relevant", "hashtags"],
      "approach": "Brief description of the creative approach used"
    }
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert advertising copywriter who creates high-converting ad copy. Always respond with valid JSON.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result.variants || [];

    } catch (error) {
      logger.error('Ad copy generation failed:', error);
      // Return fallback copy
      return [{
        headline: `Discover ${productName}`,
        primaryText: productDescription?.substring(0, maxTextLength) || `Check out ${productName}!`,
        description: callToAction,
        hashtags: ['ad', productName.toLowerCase().replace(/\s+/g, '')],
        approach: 'fallback'
      }];
    }
  }

  /**
   * Generate visual assets for ads
   * @param {Object} options - Generation options
   * @param {string} options.imageProvider - Image provider: 'openai', 'gemini', 'stability'
   */
  async generateVisualAssets(options) {
    const {
      productName,
      productDescription,
      productImageUrl,
      visualStyle,
      platforms,
      adType,
      brandVoice,
      companyName,
      imageProvider = 'gemini', // Default to Google Imagen (Gemini)
      brandColors = null,
      brandLogo = null
    } = options;

    const styleDescription = this.visualStyles[visualStyle] || this.visualStyles.modern;
    const assets = {};

    // Generate images for each platform format
    for (const platform of platforms) {
      const formats = this.platformFormats[platform];
      if (!formats) continue;

      assets[platform] = {};

      for (const [formatName, formatSpec] of Object.entries(formats)) {
        if (!formatSpec.imageSize) continue;

        const aspectRatio = formatSpec.aspectRatio;
        const imagePrompt = this.buildImagePrompt({
          productName,
          productDescription,
          visualStyle: styleDescription,
          aspectRatio,
          adType,
          brandVoice,
          companyName,
          formatName,
          brandColors: options.brandColors,
          brandLogo: options.brandLogo
        });

        try {
          let imageUrl;
          let originalUrl;
          let usedProvider = imageProvider;
          
          // Generate image based on selected provider
          if (imageProvider === 'gemini' && process.env.GEMINI_API_KEY) {
            // Use Google Gemini (Imagen 3) directly
            const geminiResult = await this.generateWithGemini(imagePrompt, aspectRatio, platform, formatName);
            imageUrl = geminiResult.imageUrl;
            originalUrl = geminiResult.originalUrl || imageUrl;
            usedProvider = geminiResult.provider || 'gemini';
            logger.info(`Generated Gemini image for ${platform}/${formatName}`);
          } else if (imageProvider === 'stability' && process.env.STABILITY_API_KEY) {
            // Use Stability AI
            const stabilityResult = await this.generateWithStability(imagePrompt, aspectRatio, platform, formatName);
            imageUrl = stabilityResult.imageUrl;
            originalUrl = stabilityResult.originalUrl || imageUrl;
            usedProvider = stabilityResult.provider || 'stability';
            logger.info(`Generated Stability AI image for ${platform}/${formatName}`);
          } else if (imageProvider === 'replicate' && ReplicateService.isAvailable()) {
            // Use Replicate (selectable model)
            try {
              const replicateResult = await this.generateWithReplicate(
                imagePrompt,
                aspectRatio,
                platform,
                formatName,
                options.replicateModel // allow caller to pick free-tier model
              );
              imageUrl = replicateResult.imageUrl;
              originalUrl = replicateResult.originalUrl || imageUrl;
              usedProvider = replicateResult.provider || 'replicate';
              logger.info(`Generated Replicate image for ${platform}/${formatName}`);
            } catch (replicateError) {
              // Extract error message to avoid circular structure
              const errorMsg = replicateError?.message || replicateError?.toString() || 'Replicate generation failed';
              logger.error(`Replicate image generation failed for ${platform}/${formatName}: ${errorMsg}`);

              // Prefer Gemini fallback if available, otherwise DALL-E
              if (process.env.GEMINI_API_KEY) {
                try {
                  const geminiResult = await this.generateWithGemini(imagePrompt, aspectRatio, platform, formatName);
                  imageUrl = geminiResult.imageUrl;
                  originalUrl = geminiResult.originalUrl || imageUrl;
                  usedProvider = geminiResult.provider || 'gemini';
                  logger.info(`Fell back to Gemini for ${platform}/${formatName} after Replicate failure`);
                } catch (geminiError) {
                  logger.error(`Gemini fallback failed for ${platform}/${formatName}: ${geminiError.message}`);
                  // Final fallback: DALL-E
                  usedProvider = 'openai';
                  const dalleSize = this.mapAspectRatioToDalleSize(aspectRatio);
                  const response = await this.openai.images.generate({
                    model: "dall-e-3",
                    prompt: imagePrompt,
                    n: 1,
                    size: dalleSize,
                    quality: "standard"
                  });
                  originalUrl = response.data[0].url;
                  imageUrl = await this.downloadAndStoreImage(originalUrl, platform, formatName);
                  logger.info(`Fell back to DALL-E 3 for ${platform}/${formatName} after Replicate and Gemini failures`);
                }
              } else {
                // No Gemini key, fall back directly to DALL-E
                usedProvider = 'openai';
                const dalleSize = this.mapAspectRatioToDalleSize(aspectRatio);
                const response = await this.openai.images.generate({
                  model: "dall-e-3",
                  prompt: imagePrompt,
                  n: 1,
                  size: dalleSize,
                  quality: "standard"
                });
                originalUrl = response.data[0].url;
                imageUrl = await this.downloadAndStoreImage(originalUrl, platform, formatName);
                logger.info(`Fell back to DALL-E 3 for ${platform}/${formatName} after Replicate failure (no Gemini key)`);
              }
            }
          } else {
            // Default: Use OpenAI DALL-E 3
            usedProvider = 'openai';
            const dalleSize = this.mapAspectRatioToDalleSize(aspectRatio);
            
            const response = await this.openai.images.generate({
              model: "dall-e-3",
              prompt: imagePrompt,
              n: 1,
              size: dalleSize,
              quality: "standard",
              style: visualStyle === 'playful' || visualStyle === 'bold' ? 'vivid' : 'natural'
            });

            originalUrl = response.data[0].url;
            // Download and store the image locally to prevent URL expiration
            imageUrl = await this.downloadAndStoreImage(originalUrl, platform, formatName);
            logger.info(`Generated DALL-E 3 image for ${platform}/${formatName}`);
          }

          assets[platform][formatName] = {
            imageUrl: imageUrl,
            originalUrl: originalUrl,
            aspectRatio,
            size: formatSpec.imageSize,
            prompt: imagePrompt,
            provider: usedProvider,
            generatedAt: new Date().toISOString()
          };

        } catch (error) {
          // Extract error message to avoid circular structure issues
          const errorMessage = error?.message || error?.toString() || 'Unknown error';
          logger.error(`Image generation failed for ${platform}/${formatName}: ${errorMessage}`);
          assets[platform][formatName] = {
            error: errorMessage,
            fallbackUrl: productImageUrl
          };
        }
      }
    }

    return assets;
  }

  /**
   * Download image from URL and store locally
   * DALL-E URLs expire after ~1 hour, so we store them permanently
   */
  async downloadAndStoreImage(imageUrl, platform, formatName) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      const timestamp = Date.now();
      const filename = `ad_${platform}_${formatName}_${timestamp}.png`;
      const filepath = path.join(this.uploadsDir, filename);

      fs.writeFileSync(filepath, Buffer.from(response.data));

      // Return relative URL that can be served by the backend
      const publicUrl = `/uploads/smart-ads/${filename}`;
      const fullPath = path.join(__dirname, '../../uploads/smart-ads', filename);
      
      logger.info(`Stored ad image: ${publicUrl}`);
      
      // Also store in Media Library (async, don't wait)
      // Note: userId and adId need to be passed through options
      // For now, we'll skip Media Library storage here and do it after ad generation
      
      return publicUrl;

    } catch (error) {
      logger.error(`Failed to download and store image: ${error.message}`);
      // Return the original URL as fallback (will expire but at least works initially)
      return imageUrl;
    }
  }

  /**
   * Build image generation prompt
   */
  buildImagePrompt(options) {
    const {
      productName,
      productDescription,
      visualStyle,
      aspectRatio,
      adType,
      brandVoice,
      companyName,
      formatName,
      brandColors = null,
      brandLogo = null
    } = options;

    const adTypeVisualGuidance = {
      product_showcase: 'Product hero shot, clean background, professional lighting',
      brand_awareness: 'Lifestyle imagery, emotional connection, brand colors',
      testimonial: 'Person using/enjoying the product, authentic feel',
      promotional: 'Bold sale graphics, discount badges, urgency elements',
      educational: 'Infographic style, step-by-step visual',
      storytelling: 'Cinematic composition, narrative moment',
      comparison: 'Before/after or side-by-side comparison',
      social_proof: 'Customer photos, review highlights, star ratings',
      urgency: 'Countdown timer visual, limited stock indicators',
      lifestyle: 'Aspirational scene, product in context of ideal life'
    };

    // Build color palette guidance if brand colors are provided
    let colorGuidance = '';
    if (options.brandColors) {
      const primaryColors = (options.brandColors.primary || []).map(c => c.hex || c).join(', ');
      const secondaryColors = (options.brandColors.secondary || []).map(c => c.hex || c).join(', ');
      const accentColors = (options.brandColors.accent || []).map(c => c.hex || c).join(', ');
      
      if (primaryColors || secondaryColors || accentColors) {
        colorGuidance = '\n\nBRAND COLOR PALETTE:\n';
        if (primaryColors) colorGuidance += `- Primary Colors: ${primaryColors}\n`;
        if (secondaryColors) colorGuidance += `- Secondary Colors: ${secondaryColors}\n`;
        if (accentColors) colorGuidance += `- Accent Colors: ${accentColors}\n`;
        colorGuidance += '- Use these brand colors prominently in the image design';
      }
    }

    return `Create a professional advertisement image for social media.

PRODUCT: ${productName}
${productDescription ? `DESCRIPTION: ${productDescription}` : ''}
${companyName ? `BRAND: ${companyName}` : ''}

VISUAL STYLE: ${visualStyle}
AD TYPE GUIDANCE: ${adTypeVisualGuidance[adType] || 'Professional product advertisement'}
FORMAT: ${formatName} (${aspectRatio} aspect ratio)
${colorGuidance}
CRITICAL REQUIREMENTS:
- ABSOLUTELY NO TEXT, WORDS, LETTERS, NUMBERS, OR TYPOGRAPHY IN THE IMAGE
- Do not include any written text, logos with text, signs, labels, or watermarks
- The image must be completely text-free - text will be added separately as an overlay
- High-quality, professional advertising photography
- Clean composition suitable for ${aspectRatio} aspect ratio
- ${brandVoice || 'Professional'} brand feel
- Attention-grabbing but not cluttered
- Focus on visual storytelling without any written elements
- Suitable for social media advertising`;
  }

  /**
   * Map aspect ratio to DALL-E compatible size
   */
  mapAspectRatioToDalleSize(aspectRatio) {
    const mapping = {
      '1:1': '1024x1024',
      '16:9': '1792x1024',
      '9:16': '1024x1792',
      '1.91:1': '1792x1024',
      '4:5': '1024x1024', // Closest match
      '3:4': '1024x1024'  // Closest match
    };
    return mapping[aspectRatio] || '1024x1024';
  }

  /**
   * Generate image using Google Imagen API
   * Documentation: https://ai.google.dev/gemini-api/docs/imagen
   * Models: imagen-4.0-generate-001, imagen-4.0-ultra-generate-001, imagen-4.0-fast-generate-001
   */
  async generateWithGemini(prompt, aspectRatio, platform, formatName) {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured');
      }

      // Map aspect ratio to Imagen supported values
      // Supported: "1:1", "3:4", "4:3", "9:16", "16:9"
      const imagenAspectRatioMap = {
        '1:1': '1:1',
        '16:9': '16:9',
        '9:16': '9:16',
        '1.91:1': '16:9', // Closest match
        '4:5': '4:3', // Closest match
        '3:4': '3:4'
      };
      const imagenAspectRatio = imagenAspectRatioMap[aspectRatio] || '1:1';

      // Enhanced prompt (max 480 tokens for Imagen)
      // Truncate if too long to avoid token limit
      let enhancedPrompt = prompt;
      if (enhancedPrompt.length > 2000) {
        enhancedPrompt = enhancedPrompt.substring(0, 2000) + '...';
      }

      // Use Imagen 4.0 Standard model via REST API
      // Model options: imagen-4.0-generate-001, imagen-4.0-ultra-generate-001, imagen-4.0-fast-generate-001
      const modelName = 'imagen-4.0-generate-001';
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict`;

      const requestBody = {
        instances: [
          {
            prompt: enhancedPrompt
          }
        ],
        parameters: {
          sampleCount: 1, // Generate 1 image (1-4 supported)
          aspectRatio: imagenAspectRatio,
          imageSize: '1K', // Options: '1K' or '2K' (default: '1K')
          personGeneration: 'allow_adult' // Options: 'dont_allow', 'allow_adult', 'allow_all'
        }
      };

      logger.info(`Calling Imagen API: ${modelName} with aspect ratio ${imagenAspectRatio}`);

      const response = await axios.post(apiUrl, requestBody, {
        headers: {
          'x-goog-api-key': process.env.GEMINI_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout
      });

      if (!response.data || !response.data.predictions || response.data.predictions.length === 0) {
        throw new Error('No image predictions returned from Imagen API');
      }

      // Imagen returns base64 encoded images in predictions[0].bytesBase64Encoded
      const prediction = response.data.predictions[0];
      const imageBase64 = prediction.bytesBase64Encoded || prediction.imageBytes;
      
      if (!imageBase64) {
        logger.error('Imagen API response structure:', JSON.stringify(response.data, null, 2));
        throw new Error('No image data in Imagen response');
      }

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      const filename = `ad_${platform}_${formatName}_${Date.now()}.png`;
      const localPath = path.join(__dirname, '../../uploads/smart-ads', filename);
      await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
      await fs.promises.writeFile(localPath, imageBuffer);

      logger.info(`Imagen image saved: ${filename}`);

      return {
        imageUrl: `/uploads/smart-ads/${filename}`,
        originalUrl: null,
        provider: 'gemini'
      };
    } catch (error) {
      logger.error('Gemini Imagen image generation failed, falling back to DALL-E:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      
      // Fall back to DALL-E
      const dalleSize = this.mapAspectRatioToDalleSize(aspectRatio);
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: dalleSize,
        quality: "standard"
      });
      const dalleUrl = response.data[0].url;
      const localUrl = await this.downloadAndStoreImage(dalleUrl, platform, formatName);
      return { imageUrl: localUrl, originalUrl: dalleUrl, provider: 'openai-fallback' };
    }
  }

  /**
   * Generate image with Replicate (Flux Schnell)
   */
  async generateWithReplicate(prompt, aspectRatio, platform, formatName, modelSlug) {
    if (!ReplicateService.isAvailable()) {
      throw new Error('Replicate API token not configured');
    }

    try {
      // Default to Google Imagen 4 (free tier) if no model specified
      const model = modelSlug || 'google/imagen-4';
      
      // Map aspect ratio to Replicate format (1:1, 16:9, 9:16, 21:9, 2:3, 3:2, 4:5, 5:4, 9:21)
      const aspectRatioMap = {
        '1:1': '1:1',
        '16:9': '16:9',
        '9:16': '9:16',
        '1.91:1': '16:9', // Closest match
        '4:5': '4:5',
        '3:4': '3:4'
      };
      const replicateAspectRatio = aspectRatioMap[aspectRatio] || '1:1';
      
      const input = {
        prompt,
        aspect_ratio: replicateAspectRatio,
        output_format: 'png',
        output_quality: 90
      };

      logger.info(`Calling Replicate model ${model} with aspect ratio ${replicateAspectRatio}`);
      
      const prediction = await ReplicateService.runModel(model, input, {
        pollIntervalMs: 2000,
        maxAttempts: 90 // ~3 minutes
      });

      const outputs = prediction?.output;
      if (!outputs || (Array.isArray(outputs) && outputs.length === 0)) {
        throw new Error('Replicate returned no output image');
      }

      // Handle both array and single string output
      const sourceUrl = Array.isArray(outputs) ? outputs[0] : outputs;
      if (!sourceUrl || typeof sourceUrl !== 'string') {
        throw new Error(`Invalid Replicate output format: ${JSON.stringify(outputs)}`);
      }

      const localPath = await this.downloadAndStoreImage(sourceUrl, platform, formatName);
      return {
        imageUrl: `/uploads/smart-ads/${path.basename(localPath)}`,
        originalUrl: sourceUrl,
        provider: 'replicate'
      };
    } catch (error) {
      // Extract error message to avoid circular structure
      const errorMsg = error?.message || error?.toString() || 'Unknown Replicate error';
      logger.error(`Replicate image generation error: ${errorMsg}`);
      throw new Error(`Replicate generation failed: ${errorMsg}`);
    }
  }

  // Note: Runway ML removed from image generation - it only supports video generation
  // According to https://docs.dev.runwayml.com/, Runway has:
  // - Gen-4 Aleph (video)
  // - Veo 3.1 (video)  
  // - Gen-4 Image (image-to-image only, not text-to-image)

  /**
   * Generate image using Stability AI (Stable Diffusion 3)
   */
  async generateWithStability(prompt, aspectRatio, platform, formatName) {
    try {
      const axios = require('axios');
      
      // Map aspect ratio to dimensions
      const dimensionMap = {
        '1:1': { width: 1024, height: 1024 },
        '16:9': { width: 1344, height: 768 },
        '9:16': { width: 768, height: 1344 },
        '1.91:1': { width: 1344, height: 704 },
        '4:5': { width: 896, height: 1120 },
        '3:4': { width: 896, height: 1152 }
      };

      const dimensions = dimensionMap[aspectRatio] || dimensionMap['1:1'];

      const response = await axios.post(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
        {
          text_prompts: [
            { text: prompt, weight: 1 },
            { text: 'blurry, bad quality, distorted, text, words, letters', weight: -1 }
          ],
          cfg_scale: 7,
          height: dimensions.height,
          width: dimensions.width,
          samples: 1,
          steps: 30
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
            'Accept': 'application/json'
          }
        }
      );

      // Save image locally
      const imageData = response.data.artifacts[0].base64;
      const imageBuffer = Buffer.from(imageData, 'base64');
      const filename = `ad_${platform}_${formatName}_${Date.now()}.png`;
      const localPath = path.join(__dirname, '../../uploads/smart-ads', filename);
      await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
      await fs.promises.writeFile(localPath, imageBuffer);

      logger.info(`Stability AI image saved: ${filename}`);

      return {
        imageUrl: `/uploads/smart-ads/${filename}`,
        originalUrl: null,
        provider: 'stability'
      };
    } catch (error) {
      logger.error('Stability AI generation failed, falling back to DALL-E:', error.message);
      // Fall back to DALL-E
      const dalleSize = this.mapAspectRatioToDalleSize(aspectRatio);
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: dalleSize,
        quality: "standard"
      });
      const dalleUrl = response.data[0].url;
      const localUrl = await this.downloadAndStoreImage(dalleUrl, platform, formatName);
      return { imageUrl: localUrl, originalUrl: dalleUrl, provider: 'openai-fallback' };
    }
  }

  /**
   * Get available image providers
   */
  getAvailableImageProviders() {
    // Note: Runway ML only supports video generation, not images
    // According to https://docs.dev.runwayml.com/, Runway has:
    // - Gen-4 Aleph (video)
    // - Veo 3.1 (video)
    // - Gen-4 Image (image-to-image only, not text-to-image)
    const providers = [
      { id: 'openai', name: 'OpenAI DALL-E 3', available: !!process.env.OPENAI_API_KEY, description: 'High-quality, creative images (default)' },
      { id: 'gemini', name: 'Google Imagen 4.0', available: !!process.env.GEMINI_API_KEY, description: 'Photorealistic, high-fidelity images via Imagen API' },
      { id: 'stability', name: 'Stability AI (SD3)', available: !!process.env.STABILITY_API_KEY, description: 'Artistic, stylized images' }
    ];
    if (ReplicateService.isAvailable()) {
      providers.push({
        id: 'replicate',
        name: 'Replicate (Flux Schnell)',
        available: true,
        description: 'Community models via Replicate, e.g. Flux Schnell'
      });
    }
    return providers;
  }

  /**
   * Generate video ad content
   */
  async generateVideoAd(options) {
    const {
      productName,
      productDescription,
      productImageUrl,
      adCopy,
      platforms,
      visualStyle,
      companyData,
      videoProvider = 'runwayml' // Allow provider selection: 'runwayml', 'veo', 'pika'
    } = options;

    const videoAssets = {};

    // Try to generate video using available providers
    for (const platform of platforms) {
      const formats = this.platformFormats[platform];
      if (!formats) continue;

      // Find video-capable format
      const videoFormat = Object.entries(formats).find(([_, spec]) => spec.videoMaxDuration);
      if (!videoFormat) continue;

      const [formatName, formatSpec] = videoFormat;
      const aspectRatio = formatSpec.aspectRatio;
      
      // Determine actual video duration (8 seconds max for most providers)
      const actualDuration = Math.min(8, formatSpec.videoMaxDuration || 8);

      // Generate video script for the ACTUAL duration
      const script = await this.generateVideoScript({
        productName,
        productDescription,
        adCopy,
        duration: actualDuration // Use actual video duration, not default 15
      });

      try {
        // Use VideoGenerationService
        if (VideoGenerationService.isAvailable()) {
          const videoResult = await VideoGenerationService.generateVideo(
            `${script.visualPrompt}. Product: ${productName}. Style: ${this.visualStyles[visualStyle] || 'professional advertising'}`,
            {
              provider: videoProvider, // Use selected provider
              duration: actualDuration,
              style: 'cinematic',
              aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
              videoScript: script.narration
            }
          );

          videoAssets[platform] = {
            [formatName]: {
              videoUrl: videoResult.videoUrl,
              localPath: videoResult.localPath,
              script: script,
              aspectRatio,
              duration: videoResult.duration,
              provider: videoResult.provider,
              generatedAt: new Date().toISOString()
            }
          };

          logger.info(`Generated video for ${platform}/${formatName}`);
        }
      } catch (error) {
        logger.error(`Video generation failed for ${platform}:`, error);

        // Fallback order for video when initial provider fails:
        // 1) If initial was replicate and Gemini (veo) is available, try veo
        // 2) Otherwise try runwayml, then pika
        const fallbackOrder = [];
        const available = VideoGenerationService.getAvailableProviders ? VideoGenerationService.getAvailableProviders() : [];

        if (videoProvider === 'replicate' && available.includes('veo')) {
          fallbackOrder.push('veo');
        }
        ['runwayml', 'pika'].forEach(p => {
          if (available.includes(p) && p !== videoProvider) fallbackOrder.push(p);
        });

        let fallbackSuccess = false;
        for (const fallback of fallbackOrder) {
          try {
            logger.info(`Attempting video fallback with provider ${fallback} for ${platform}/${formatName}`);
            const videoResult = await VideoGenerationService.generateVideo(
              `${script.visualPrompt}. Product: ${productName}. Style: ${this.visualStyles[visualStyle] || 'professional advertising'}`,
              {
                provider: fallback,
                duration: actualDuration,
                style: 'cinematic',
                aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
                videoScript: script.narration
              }
            );

            videoAssets[platform] = {
              [formatName]: {
                videoUrl: videoResult.videoUrl,
                localPath: videoResult.localPath,
                script: script,
                aspectRatio,
                duration: videoResult.duration,
                provider: videoResult.provider,
                generatedAt: new Date().toISOString()
              }
            };
            logger.info(`Video fallback succeeded with ${fallback} for ${platform}/${formatName}`);
            fallbackSuccess = true;
            break;
          } catch (fallbackError) {
            logger.error(`Video fallback with ${fallback} failed for ${platform}/${formatName}: ${fallbackError.message}`);
          }
        }

        if (!fallbackSuccess) {
          videoAssets[platform] = {
            [formatName]: {
              error: error.message,
              script: script
            }
          };
        }
      }
    }

    return videoAssets;
  }

  /**
   * Generate video script
   */
  async generateVideoScript(options) {
    const { productName, productDescription, adCopy, duration } = options;

    // Calculate word limit based on duration (average speaking pace: 2.5 words/second)
    const maxWords = Math.floor(duration * 2.5);
    const targetWords = Math.floor(duration * 2.0); // Aim for slightly slower pace for clarity

    const prompt = `Create a ${duration}-second video ad script for:

PRODUCT: ${productName}
DESCRIPTION: ${productDescription}
AD COPY TO INCORPORATE: ${adCopy.primaryText || adCopy}

CRITICAL REQUIREMENTS:
- The narration MUST be exactly ${targetWords}-${maxWords} words (${duration} seconds when spoken at normal pace)
- For an ${duration}-second video, this is approximately ${targetWords}-${maxWords} words maximum
- Keep it SHORT, PUNCHY, and FOCUSED on ONE key message
- Cut any unnecessary words - every word must count
- Start with a hook, deliver the benefit, end with a clear call-to-action

Generate a JSON response with:
{
  "narration": "Voice-over text (EXACTLY ${targetWords}-${maxWords} words for ${duration} seconds)",
  "visualPrompt": "Detailed description of what should be shown visually",
  "scenes": [
    {
      "timeStart": 0,
      "timeEnd": ${duration},
      "visual": "Scene description",
      "text": "Any on-screen text"
    }
  ],
  "mood": "Overall mood/tone",
  "musicStyle": "Suggested background music style"
}

IMPORTANT: Count the words in your narration and ensure it's between ${targetWords} and ${maxWords} words.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a video advertising expert specializing in ultra-short-form video scripts. You create scripts that fit EXACTLY within the specified duration. For a ${duration}-second video, the narration must be ${targetWords}-${maxWords} words. Always count your words and verify they fit the time constraint.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 800, // Reduced to encourage shorter responses
        response_format: { type: 'json_object' }
      });

      const script = JSON.parse(response.choices[0].message.content);
      
      // Validate and truncate narration if needed
      if (script.narration) {
        const words = script.narration.split(/\s+/).filter(w => w.length > 0);
        if (words.length > maxWords) {
          logger.warn(`Video script narration too long (${words.length} words, max ${maxWords}). Truncating...`);
          script.narration = words.slice(0, maxWords).join(' ') + '...';
        }
      }

      return script;

    } catch (error) {
      logger.error('Video script generation failed:', error);
      return {
        narration: adCopy.primaryText || `Discover ${productName}`,
        visualPrompt: `Professional product showcase of ${productName}`,
        scenes: [],
        mood: 'upbeat',
        musicStyle: 'modern pop'
      };
    }
  }

  /**
   * Generate UGC-style content using HeyGen avatars
   */
  async generateUGCContent(options) {
    const {
      productName,
      productDescription,
      targetAudience,
      adCopy,
      platforms,
      ugcAvatarId = null,
      ugcLookId = null
    } = options;

    const ugcAssets = {};

    // Generate UGC script
    const ugcScript = await this.generateUGCScript({
      productName,
      productDescription,
      targetAudience,
      adCopy
    });

    // Check if HeyGen is available
    if (!VideoGenerationService.providers?.heygen?.enabled) {
      logger.warn('HeyGen not available for UGC generation');
      return {
        script: ugcScript,
        note: 'HeyGen not configured. UGC video generation requires HEYGEN_API_KEY.'
      };
    }

    for (const platform of platforms) {
      try {
        const videoResult = await VideoGenerationService.generateWithHeyGen(
          ugcScript.script,
          {
            duration: 30,
            aspectRatio: platform === 'tiktok' || platform === 'instagram' ? '9:16' : '16:9',
            videoScript: ugcScript.script
          }
        );

        // If video is still processing (has videoId but no videoUrl), poll for completion
        let finalVideoUrl = videoResult.videoUrl;
        let finalStatus = videoResult.status || 'processing';
        
        if (videoResult.videoId && !videoResult.videoUrl) {
          logger.info(`HeyGen video ${videoResult.videoId} is processing, polling for completion...`);
          
          // Poll for up to 5 minutes (30 attempts × 10 seconds)
          const maxAttempts = 30;
          let attempts = 0;
          
          while (attempts < maxAttempts && !finalVideoUrl) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            
            try {
              const statusResult = await VideoGenerationService.checkHeyGenVideoStatus(videoResult.videoId);
              
              // Check if video is ready
              if (statusResult.data?.status === 'completed' || statusResult.data?.video_url) {
                finalVideoUrl = statusResult.data.video_url || statusResult.data.videoUrl;
                finalStatus = 'completed';
                
                // Download and store the video
                if (finalVideoUrl) {
                  const localVideoPath = await VideoGenerationService.downloadAndStoreVideo(finalVideoUrl, 'heygen');
                  finalVideoUrl = `/uploads/videos/generated/${path.basename(localVideoPath)}`;
                  
                  logger.info(`HeyGen video ${videoResult.videoId} completed and downloaded`);
                }
                break;
              } else if (statusResult.data?.status === 'failed' || statusResult.data?.status === 'error') {
                finalStatus = 'failed';
                logger.error(`HeyGen video ${videoResult.videoId} failed:`, statusResult.data);
                break;
              }
              
              attempts++;
              logger.info(`HeyGen video ${videoResult.videoId} still processing (attempt ${attempts}/${maxAttempts})...`);
            } catch (statusError) {
              logger.error(`Error checking HeyGen video status:`, statusError);
              attempts++;
            }
          }
          
          // If still processing after 30 attempts, start background polling
          if (!finalVideoUrl && finalStatus === 'processing') {
            logger.warn(`HeyGen video ${videoResult.videoId} still processing after ${maxAttempts} attempts. Starting background polling...`);
            
            // Start background polling (non-blocking)
            setImmediate(async () => {
              let bgAttempts = 0;
              const maxBgAttempts = 60; // Continue for up to 10 more minutes (60 × 10 seconds)
              
              while (bgAttempts < maxBgAttempts) {
                await new Promise(resolve => setTimeout(resolve, 30000)); // Check every 30 seconds in background
                bgAttempts++;
                
                try {
                  const statusResult = await VideoGenerationService.checkHeyGenVideoStatus(videoResult.videoId);
                  
                  if (statusResult.data?.status === 'completed' || statusResult.data?.video_url) {
                    const completedVideoUrl = statusResult.data.video_url || statusResult.data.videoUrl;
                    
                    if (completedVideoUrl) {
                      const localVideoPath = await VideoGenerationService.downloadAndStoreVideo(completedVideoUrl, 'heygen');
                      const localVideoUrl = `/uploads/videos/generated/${path.basename(localVideoPath)}`;
                      
                      // Update the ad in database with completed video URL
                      // Note: This requires the adId to be passed to this function
                      logger.info(`HeyGen video ${videoResult.videoId} completed in background and downloaded to ${localVideoUrl}`);
                      logger.info(`Note: Ad will need to be refreshed to see the completed video`);
                    }
                    break;
                  } else if (statusResult.data?.status === 'failed' || statusResult.data?.status === 'error') {
                    logger.error(`HeyGen video ${videoResult.videoId} failed in background:`, statusResult.data);
                    break;
                  }
                  
                  if (bgAttempts % 10 === 0) {
                    logger.info(`Background polling for HeyGen video ${videoResult.videoId}: attempt ${bgAttempts}/${maxBgAttempts}...`);
                  }
                } catch (bgError) {
                  logger.error(`Error in background polling for HeyGen video:`, bgError);
                  if (bgAttempts >= maxBgAttempts) break;
                }
              }
              
              if (bgAttempts >= maxBgAttempts) {
                logger.warn(`HeyGen video ${videoResult.videoId} still processing after ${maxAttempts + maxBgAttempts} total attempts. Manual check recommended.`);
              }
            });
          }
        }

        ugcAssets[platform] = {
          videoUrl: finalVideoUrl,
          videoId: videoResult.videoId,
          script: ugcScript,
          status: finalStatus,
          metadata: videoResult.metadata,
          generatedAt: new Date().toISOString()
        };

        logger.info(`Generated UGC video for ${platform} (status: ${finalStatus})`);

      } catch (error) {
        logger.error(`UGC generation failed for ${platform}:`, error);
        ugcAssets[platform] = {
          error: error.message,
          script: ugcScript
        };
      }
    }

    return ugcAssets;
  }

  /**
   * Generate UGC-style script (testimonial/review style)
   */
  async generateUGCScript(options) {
    const { productName, productDescription, targetAudience, adCopy } = options;

    const prompt = `Create a user-generated content (UGC) style script for a product testimonial video.

PRODUCT: ${productName}
DESCRIPTION: ${productDescription}
TARGET AUDIENCE: ${targetAudience || 'General consumers'}
KEY MESSAGE: ${adCopy.primaryText || 'Great product'}

The script should:
- Sound like a real customer sharing their experience
- Be authentic and conversational (not salesy)
- Be 6-8 seconds when spoken naturally (approximately 15-20 words)
- Include a hook, experience, and recommendation
- Keep it SHORT and punchy - focus on one key benefit

Generate JSON:
{
  "script": "The full spoken script",
  "hook": "Opening attention-grabber",
  "painPoint": "Problem they had before",
  "solution": "How product solved it",
  "benefit": "Key benefit they experienced",
  "recommendation": "Final endorsement",
  "tone": "Personality of the speaker",
  "suggestedAvatar": "Description of ideal avatar persona"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You create authentic-sounding UGC testimonial scripts. Make it sound real, not corporate.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);

    } catch (error) {
      logger.error('UGC script generation failed:', error);
      return {
        script: `I've been using ${productName} and honestly, it's been amazing. If you're looking for something that actually works, give this a try!`,
        tone: 'friendly',
        hook: 'Okay so...'
      };
    }
  }

  /**
   * Bundle ad packages for each platform
   */
  bundleAdPackages(options) {
    const {
      copyVariants,
      visualAssets,
      videoAssets,
      ugcAssets,
      platforms,
      callToAction
    } = options;

    const packages = {};

    for (const platform of platforms) {
      packages[platform] = {
        platform,
        formats: {},
        callToAction,
        generatedAt: new Date().toISOString()
      };

      // Add image formats
      if (visualAssets[platform]) {
        for (const [formatName, asset] of Object.entries(visualAssets[platform])) {
          packages[platform].formats[formatName] = {
            type: 'image',
            ...asset,
            copyVariants: copyVariants.map(cv => ({
              headline: cv.headline,
              primaryText: cv.primaryText,
              description: cv.description,
              hashtags: cv.hashtags
            }))
          };
        }
      }

      // Add video formats
      if (videoAssets && videoAssets[platform]) {
        for (const [formatName, asset] of Object.entries(videoAssets[platform])) {
          if (!packages[platform].formats[formatName]) {
            packages[platform].formats[formatName] = {};
          }
          packages[platform].formats[`${formatName}_video`] = {
            type: 'video',
            ...asset
          };
        }
      }

      // Add UGC
      if (ugcAssets && ugcAssets[platform]) {
        packages[platform].formats['ugc'] = {
          type: 'ugc',
          ...ugcAssets[platform]
        };
      }
    }

    return packages;
  }

  /**
   * Save ad creative to database
   */
  async saveAdCreative(data) {
    const {
      adId,
      userId,
      agentId,
      productId,
      adType,
      platforms,
      copyVariants,
      visualAssets,
      videoAssets,
      ugcAssets,
      adPackages,
      options
    } = data;

    try {
      await database.query(`
        INSERT INTO smart_ads (
          id, user_id, agent_id, product_id, ad_type, platforms,
          copy_variants, visual_assets, video_assets, ugc_assets,
          ad_packages, generation_options, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'completed', NOW())
      `, [
        adId,
        userId,
        agentId || null,
        productId || null,
        adType,
        JSON.stringify(platforms),
        JSON.stringify(copyVariants),
        JSON.stringify(visualAssets),
        JSON.stringify(videoAssets),
        JSON.stringify(ugcAssets),
        JSON.stringify(adPackages),
        JSON.stringify(options)
      ]);

      logger.info(`Saved ad creative: ${adId}`);
      return adId;

    } catch (error) {
      logger.error('Failed to save ad creative:', error);
      // Don't throw - ad was generated successfully even if save fails
    }
  }

  /**
   * Get company data for brand context
   */
  async getCompanyData(userId) {
    try {
      const companyResult = await database.query(`
        SELECT 
          company_name, company_description, industry,
          brand_voice, key_messages, target_audience,
          website_url
        FROM company_profiles
        WHERE user_id = $1
        LIMIT 1
      `, [userId]);

      const productsResult = await database.query(`
        SELECT name, category, description, key_features
        FROM company_products cp
        JOIN company_profiles prof ON cp.company_profile_id = prof.id
        WHERE prof.user_id = $1 AND cp.status = 'active'
        LIMIT 5
      `, [userId]);

      return {
        company: companyResult.rows[0] || null,
        products: productsResult.rows || []
      };

    } catch (error) {
      logger.error('Error getting company data:', error);
      return { company: null, products: [] };
    }
  }

  /**
   * Get user's ad history
   */
  async getAdHistory(userId, options = {}) {
    const { limit = 20, offset = 0, status } = options;

    try {
      let query = `
        SELECT id, ad_type, platforms, copy_variants, visual_assets,
               status, created_at
        FROM smart_ads
        WHERE user_id = $1
      `;
      const params = [userId];

      if (status) {
        query += ` AND status = $2`;
        params.push(status);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await database.query(query, params);
      return result.rows;

    } catch (error) {
      logger.error('Failed to get ad history:', error);
      return [];
    }
  }

  /**
   * Get single ad by ID
   */
  async getAdById(adId, userId) {
    try {
      const result = await database.query(`
        SELECT * FROM smart_ads WHERE id = $1 AND user_id = $2
      `, [adId, userId]);

      return result.rows[0] || null;

    } catch (error) {
      logger.error('Failed to get ad:', error);
      return null;
    }
  }

  /**
   * Generate ad variations from existing ad
   */
  async generateVariations(adId, userId, variantCount = 3) {
    const existingAd = await this.getAdById(adId, userId);
    if (!existingAd) {
      throw new Error('Ad not found');
    }

    // Re-generate with same options but new creative
    return await this.generateAd({
      ...existingAd.generation_options,
      userId,
      variantCount
    });
  }

  /**
   * Get available platforms and their formats
   */
  getAvailablePlatforms() {
    return Object.entries(this.platformFormats).map(([platform, formats]) => ({
      platform,
      formats: Object.keys(formats),
      formatDetails: formats
    }));
  }

  /**
   * Get available ad types
   */
  getAdTypes() {
    return this.adTypes;
  }

  /**
   * Get available visual styles
   */
  getVisualStyles() {
    return Object.entries(this.visualStyles).map(([name, description]) => ({
      name,
      description
    }));
  }

  /**
   * Store generated asset in Media Library for user to reuse later
   */
  async storeAssetInMediaLibrary(userId, filePath, fileType, options = {}) {
    try {
      const {
        description = null,
        tags = [],
        adId = null
      } = options;

      // Get file stats
      const stats = await fs.promises.stat(filePath);
      const fileName = path.basename(filePath);
      const fileUrl = filePath.replace(/\\/g, '/').replace(/.*\/uploads\//, '/uploads/');
      
      // Determine MIME type
      const ext = path.extname(fileName).toLowerCase();
      const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime'
      };
      const mimeType = mimeTypes[ext] || (fileType === 'image' ? 'image/png' : 'video/mp4');

      // Add tags
      const mediaTags = [
        'smart-ad',
        fileType,
        ...(adId ? [`ad-${adId.substring(0, 8)}`] : []),
        ...tags
      ];

      // Store in Media Library
      const mediaId = uuidv4();
      const result = await database.query(`
        INSERT INTO uploaded_media (
          id, user_id, file_name, original_name, file_path, file_url,
          file_type, mime_type, file_size, description, tags, is_public, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
        RETURNING *
      `, [
        mediaId,
        userId,
        fileName,
        fileName,
        filePath,
        fileUrl,
        fileType,
        mimeType,
        stats.size,
        description || `Generated ${fileType} from Smart Ad Generator`,
        mediaTags,
        false // Not public by default
      ]);

      logger.info(`Stored ${fileType} in Media Library: ${mediaId} - ${fileName}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Failed to store asset in Media Library:`, error);
      // Don't throw - this is optional functionality
      return null;
    }
  }
}

module.exports = new SmartAdService();

