const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const database = require('../database/connection');
const logger = require('../utils/logger');
const SmartAdService = require('../services/SmartAdService');
const CreditService = require('../services/CreditService');
const creditService = new CreditService();
const ServicePricingService = require('../services/ServicePricingService');

/**
 * Smart Ad Generator Routes
 * AI-driven ad creation for multiple platforms
 */

// GET /api/smart-ads/platforms - Get available platforms and formats
router.get('/platforms', authenticateToken, (req, res) => {
  try {
    const platforms = SmartAdService.getAvailablePlatforms();
    res.json({
      success: true,
      data: platforms
    });
  } catch (error) {
    logger.error('Failed to get platforms:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-ads/ad-types - Get available ad types
router.get('/ad-types', authenticateToken, (req, res) => {
  try {
    const adTypes = SmartAdService.getAdTypes();
    res.json({
      success: true,
      data: adTypes
    });
  } catch (error) {
    logger.error('Failed to get ad types:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-ads/visual-styles - Get available visual styles
router.get('/visual-styles', authenticateToken, (req, res) => {
  try {
    const styles = SmartAdService.getVisualStyles();
    res.json({
      success: true,
      data: styles
    });
  } catch (error) {
    logger.error('Failed to get visual styles:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-ads/image-providers - Get available image generation providers
router.get('/image-providers', authenticateToken, (req, res) => {
  try {
    const providers = SmartAdService.getAvailableImageProviders();
    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    logger.error('Failed to get image providers:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/providers/replicate - Get Replicate model registry
router.get('/replicate-providers', authenticateToken, (req, res) => {
  try {
    const ReplicateService = require('../services/ReplicateService');
    const providers = ReplicateService.getProviderRegistry();
    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    logger.error('Failed to get Replicate providers:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-ads/templates - Get ad templates
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, type } = req.query;

    let query = `
      SELECT * FROM ad_templates 
      WHERE (user_id = $1 OR is_public = TRUE)
    `;
    const params = [userId];

    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    if (type) {
      query += ` AND template_type = $${params.length + 1}`;
      params.push(type);
    }

    query += ` ORDER BY is_system DESC, times_used DESC, created_at DESC`;

    const result = await database.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Failed to get templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/smart-ads/generate - Generate a new smart ad
router.post('/generate', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      agentId,
      productId,
      productName,
      productDescription,
      productImageUrl,
      targetPlatforms,
      adType,
      targetAudience,
      brandVoice,
      callToAction,
      promotionalDetails,
      visualStyle,
      generateVideo,
      generateUGC,
      variantCount,
      customInstructions,
      templateId,
      imageProvider, // 'openai', 'gemini', 'stability', 'replicate'
      videoProvider, // 'runwayml', 'veo', 'pika'
      replicateModel // Optional Replicate model slug
    } = req.body;

    // Validate required fields
    if (!productName) {
      return res.status(400).json({
        error: 'Product name is required'
      });
    }

    // Calculate credit cost based on actual resource usage
    const platformCount = (targetPlatforms || ['facebook', 'instagram']).length;
    const variants = variantCount || 2;
    
    // PRICING STRUCTURE (Dec 2025):
    // Base (1 platform, 2 variants): 250 credits
    //   - Includes ~3 images per platform (feed, story, carousel)
    //   - Includes AI-generated copy for 2 variants
    // Per additional platform: +150 credits
    //   - Each platform needs its own image formats
    // Per additional variant (per platform): +75 credits
    //   - Extra variants multiply across all platforms
    // Video per platform: +200 credits
    //   - ~5 seconds × ~40 credits/sec average
    // UGC per platform: +200 credits
    //   - HeyGen avatar video (~1 minute)
    
    const BASE_COST = 250;           // 1 platform, 2 variants
    const PER_PLATFORM = 150;        // Additional platform
    const PER_VARIANT_PER_PLATFORM = 75;  // Extra variant per platform
    const VIDEO_PER_PLATFORM = 200;  // Video generation per platform
    const UGC_PER_PLATFORM = 200;    // UGC content per platform
    
    // Start with base cost
    let creditCost = BASE_COST;
    
    // Additional platforms (first included in base)
    if (platformCount > 1) {
      creditCost += (platformCount - 1) * PER_PLATFORM;
    }
    
    // Additional variants (first 2 included in base)
    // Extra variants apply to ALL platforms
    if (variants > 2) {
      creditCost += (variants - 2) * platformCount * PER_VARIANT_PER_PLATFORM;
    }
    
    // Video generation cost per platform
    if (generateVideo) {
      creditCost += VIDEO_PER_PLATFORM * platformCount;
    }
    
    // UGC generation cost per platform
    if (generateUGC) {
      creditCost += UGC_PER_PLATFORM * platformCount;
    }
    
    logger.info(`Credit calculation: base=${BASE_COST}, platforms=${platformCount} (+${(platformCount-1)*PER_PLATFORM}), variants=${variants} (+${variants > 2 ? (variants-2)*platformCount*PER_VARIANT_PER_PLATFORM : 0}), video=${generateVideo} (+${generateVideo ? VIDEO_PER_PLATFORM*platformCount : 0}), ugc=${generateUGC} (+${generateUGC ? UGC_PER_PLATFORM*platformCount : 0}), total=${creditCost}`);

    // Check and deduct credits
    const adId = uuidv4();
    try {
      await creditService.deductCredits(userId, 'smart_ad_generation', creditCost, adId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    logger.info(`Starting Smart Ad generation for user ${userId}, estimated cost: ${creditCost} credits`);

    // Generate the ad
    const result = await SmartAdService.generateAd({
      userId,
      agentId,
      productId,
      productName,
      productDescription,
      productImageUrl,
      targetPlatforms: targetPlatforms || ['facebook', 'instagram'],
      adType: adType || 'product_showcase',
      targetAudience,
      brandVoice,
      callToAction: callToAction || 'Learn More',
      promotionalDetails,
      visualStyle: visualStyle || 'modern',
      generateVideo: generateVideo || false,
      generateUGC: generateUGC || false,
      ugcAvatarId: req.body.ugcAvatarId || null,
      ugcLookId: req.body.ugcLookId || null,
      variantCount: variantCount || 3,
      customInstructions,
      imageProvider: imageProvider || (process.env.GEMINI_API_KEY ? 'gemini' : 'openai'),
      videoProvider: videoProvider || 'runwayml',
      replicateModel
    });

    res.json({
      success: true,
      data: result,
      creditsUsed: creditCost
    });

  } catch (error) {
    logger.error('Smart Ad generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate ad',
      details: error.message
    });
  }
});

// POST /api/smart-ads/generate-copy-only - Generate just ad copy (cheaper)
router.post('/generate-copy-only', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      productName,
      productDescription,
      adType,
      targetAudience,
      brandVoice,
      callToAction,
      promotionalDetails,
      variantCount,
      platforms
    } = req.body;

    if (!productName) {
      return res.status(400).json({
        error: 'Product name is required'
      });
    }

    // Deduct credits (lower cost for copy only)
    const creditCost = await ServicePricingService.getPricing('content_generation');
    const operationId = uuidv4();

    try {
      await creditService.deductCredits(userId, 'content_generation', creditCost, operationId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Generate ad copy only
    const copyVariants = await SmartAdService.generateAdCopy({
      productName,
      productDescription,
      adType: adType || 'product_showcase',
      targetAudience,
      brandVoice,
      callToAction: callToAction || 'Learn More',
      promotionalDetails,
      variantCount: variantCount || 3,
      platforms: platforms || ['facebook', 'instagram']
    });

    res.json({
      success: true,
      data: {
        copyVariants
      },
      creditsUsed: creditCost
    });

  } catch (error) {
    logger.error('Ad copy generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate ad copy',
      details: error.message
    });
  }
});

// GET /api/smart-ads/pricing - Get pricing for ad generation
// NOTE: This MUST come before the /:id route to avoid "pricing" being treated as an ID
router.get('/pricing', authenticateToken, async (req, res) => {
  try {
    // PRICING STRUCTURE (Dec 2025)
    const BASE_COST = 250;           // 1 platform, 2 variants
    const PER_PLATFORM = 150;        // Additional platform
    const PER_VARIANT_PER_PLATFORM = 75;  // Extra variant per platform
    const VIDEO_PER_PLATFORM = 200;  // Video generation per platform
    const UGC_PER_PLATFORM = 200;    // UGC content per platform
    const COPY_ONLY = 50;            // Copy regeneration only

    res.json({
      success: true,
      data: {
        base: BASE_COST,
        copyOnly: COPY_ONLY,
        breakdown: {
          base: BASE_COST,
          baseDescription: '1 platform, 2 variants (includes ~3 images + AI copy)',
          perAdditionalPlatform: PER_PLATFORM,
          perAdditionalPlatformDescription: '~3 images per platform (feed, story, carousel)',
          perVariantPerPlatform: PER_VARIANT_PER_PLATFORM,
          perVariantDescription: 'Extra variant applies to all platforms',
          videoPerPlatform: VIDEO_PER_PLATFORM,
          videoDescription: '~5 sec video per platform',
          ugcPerPlatform: UGC_PER_PLATFORM,
          ugcDescription: 'HeyGen avatar video (~1 min)'
        },
        multipliers: {
          additionalPlatform: PER_PLATFORM,
          additionalVariantPerPlatform: PER_VARIANT_PER_PLATFORM,
          videoPerPlatform: VIDEO_PER_PLATFORM,
          ugcPerPlatform: UGC_PER_PLATFORM
        },
        examples: {
          '1 platform, 2 variants': BASE_COST,
          '2 platforms, 2 variants': BASE_COST + PER_PLATFORM,
          '3 platforms, 2 variants': BASE_COST + (2 * PER_PLATFORM),
          '3 platforms, 4 variants': BASE_COST + (2 * PER_PLATFORM) + (2 * 3 * PER_VARIANT_PER_PLATFORM),
          '3 platforms, 4 variants + video': BASE_COST + (2 * PER_PLATFORM) + (2 * 3 * PER_VARIANT_PER_PLATFORM) + (3 * VIDEO_PER_PLATFORM),
          '3 platforms, 4 variants + video + UGC': BASE_COST + (2 * PER_PLATFORM) + (2 * 3 * PER_VARIANT_PER_PLATFORM) + (3 * VIDEO_PER_PLATFORM) + (3 * UGC_PER_PLATFORM)
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get pricing:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-ads - Get user's ad history
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit, offset, status, adType } = req.query;

    let query = `
      SELECT 
        id, ad_type, platforms, visual_style,
        copy_variants, status, favorite, tags,
        times_used, created_at, updated_at
      FROM smart_ads
      WHERE user_id = $1
    `;
    const params = [userId];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    if (adType) {
      query += ` AND ad_type = $${params.length + 1}`;
      params.push(adType);
    }

    query += ` ORDER BY created_at DESC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit) || 20, parseInt(offset) || 0);

    const result = await database.query(query, params);

    // Get total count
    const countResult = await database.query(
      `SELECT COUNT(*) FROM smart_ads WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit) || 20,
        offset: parseInt(offset) || 0
      }
    });

  } catch (error) {
    logger.error('Failed to get ad history:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-ads/history - Get user's ad history (MUST come before /:id route)
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0, status, adType } = req.query;

    let query = `SELECT * FROM smart_ads WHERE user_id = $1`;
    const params = [userId];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    if (adType) {
      query += ` AND ad_type = $${params.length + 1}`;
      params.push(adType);
    }

    query += ` ORDER BY created_at DESC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit) || 50, parseInt(offset) || 0);

    const result = await database.query(query, params);

    // Get total count
    const countResult = await database.query(
      `SELECT COUNT(*) FROM smart_ads WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      }
    });

  } catch (error) {
    logger.error('Failed to get ad history:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-ads/:id/export - Export ad as ZIP package
router.get('/:id/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const adId = req.params.id;

    // Get ad data
    const result = await database.query(
      `SELECT * FROM smart_ads WHERE id = $1 AND user_id = $2`,
      [adId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Ad not found'
      });
    }

    const ad = result.rows[0];
    
    // Use SmartAdService to bundle the ad packages
    const adPackages = SmartAdService.bundleAdPackages({
      copyVariants: ad.copy_variants || [],
      visualAssets: ad.visual_assets || {},
      videoAssets: ad.video_assets || {},
      ugcAssets: ad.ugc_assets || {},
      platforms: ad.platforms || [],
      callToAction: ad.generation_options?.callToAction || 'Shop Now'
    });

    res.json({
      success: true,
      data: {
        adId: ad.id,
        adPackages,
        metadata: {
          adType: ad.ad_type,
          platforms: ad.platforms,
          visualStyle: ad.visual_style,
          createdAt: ad.created_at
        }
      }
    });

  } catch (error) {
    logger.error('Failed to export ad:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-ads/:id - Get single ad by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const adId = req.params.id;

    const result = await database.query(
      `SELECT * FROM smart_ads WHERE id = $1 AND user_id = $2`,
      [adId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Ad not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Failed to get ad:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/smart-ads/:id - Update ad (status, favorite, tags, notes)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const adId = req.params.id;
    const { status, favorite, tags, notes } = req.body;

    const updates = [];
    const params = [adId, userId];
    let paramIndex = 3;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (favorite !== undefined) {
      updates.push(`favorite = $${paramIndex++}`);
      params.push(favorite);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(JSON.stringify(tags));
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No update fields provided'
      });
    }

    const result = await database.query(
      `UPDATE smart_ads 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Ad not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Failed to update ad:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/smart-ads/:id - Delete ad
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const adId = req.params.id;

    const result = await database.query(
      `DELETE FROM smart_ads WHERE id = $1 AND user_id = $2 RETURNING id`,
      [adId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Ad not found'
      });
    }

    res.json({
      success: true,
      message: 'Ad deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete ad:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/smart-ads/:id/variations - Generate new variations of existing ad
router.post('/:id/variations', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const adId = req.params.id;
    const { variantCount } = req.body;

    // Get existing ad
    const adResult = await database.query(
      `SELECT * FROM smart_ads WHERE id = $1 AND user_id = $2`,
      [adId, userId]
    );

    if (adResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Ad not found'
      });
    }

    const existingAd = adResult.rows[0];
    const options = existingAd.generation_options || {};

    // Deduct credits
    const creditCost = await ServicePricingService.getPricing('content_generation');
    const operationId = uuidv4();

    try {
      await creditService.deductCredits(userId, 'content_generation', creditCost, operationId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Generate new copy variants
    const newVariants = await SmartAdService.generateAdCopy({
      productName: options.productName,
      productDescription: options.productDescription,
      adType: existingAd.ad_type,
      targetAudience: options.targetAudience,
      brandVoice: options.brandVoice,
      callToAction: options.callToAction,
      promotionalDetails: options.promotionalDetails,
      variantCount: variantCount || 3,
      platforms: existingAd.platforms
    });

    // Update ad with new variants
    const existingVariants = existingAd.copy_variants || [];
    const allVariants = [...existingVariants, ...newVariants];

    await database.query(
      `UPDATE smart_ads 
       SET copy_variants = $1, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(allVariants), adId]
    );

    res.json({
      success: true,
      data: {
        newVariants,
        totalVariants: allVariants.length
      },
      creditsUsed: creditCost
    });

  } catch (error) {
    logger.error('Failed to generate variations:', error);
    res.status(500).json({
      error: 'Failed to generate variations',
      details: error.message
    });
  }
});

// POST /api/smart-ads/:id/schedule - Schedule ad for posting
router.post('/:id/schedule', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const adId = req.params.id;
    const {
      platform,
      format,
      variantIndex,
      scheduledTime,
      agentId
    } = req.body;

    if (!platform || !scheduledTime) {
      return res.status(400).json({
        error: 'Platform and scheduled time are required'
      });
    }

    // Get the ad
    const adResult = await database.query(
      `SELECT * FROM smart_ads WHERE id = $1 AND user_id = $2`,
      [adId, userId]
    );

    if (adResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Ad not found'
      });
    }

    const ad = adResult.rows[0];
    const copyVariant = ad.copy_variants[variantIndex || 0] || ad.copy_variants[0];
    const adPackage = ad.ad_packages[platform];

    if (!adPackage) {
      return res.status(400).json({
        error: `No ad package available for platform: ${platform}`
      });
    }

    // Create scheduled post using existing scheduler
    const postId = uuidv4();
    const contentText = `${copyVariant.headline}\n\n${copyVariant.primaryText}${copyVariant.hashtags ? '\n\n' + copyVariant.hashtags.map(h => `#${h}`).join(' ') : ''}`;

    // Get image URL from ad package
    const formatData = adPackage.formats[format || 'feed'];
    const imageUrl = formatData?.imageUrl || null;

    await database.query(`
      INSERT INTO scheduled_posts (
        id, user_id, agent_id, platform, content_type,
        content_text, content_config, scheduled_time,
        status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
    `, [
      postId,
      userId,
      agentId || null,
      platform,
      'smart_ad',
      contentText,
      JSON.stringify({
        adId,
        variantIndex: variantIndex || 0,
        format: format || 'feed',
        imageUrl,
        callToAction: adPackage.callToAction
      }),
      new Date(scheduledTime),
      JSON.stringify({
        source: 'smart_ad',
        adType: ad.ad_type
      })
    ]);

    // Update ad usage count
    await database.query(
      `UPDATE smart_ads 
       SET times_used = times_used + 1, last_used_at = NOW()
       WHERE id = $1`,
      [adId]
    );

    res.json({
      success: true,
      data: {
        postId,
        scheduledTime,
        platform,
        format: format || 'feed'
      }
    });

  } catch (error) {
    logger.error('Failed to schedule ad:', error);
    res.status(500).json({
      error: 'Failed to schedule ad',
      details: error.message
    });
  }
});

// POST /api/smart-ads/templates - Create custom template
router.post('/templates', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      templateType,
      category,
      platforms,
      adType,
      visualStyle,
      defaultCta,
      headlineTemplate,
      bodyTemplate,
      imagePromptTemplate
    } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Template name is required'
      });
    }

    const templateId = uuidv4();
    
    await database.query(`
      INSERT INTO ad_templates (
        id, user_id, name, description, template_type, category,
        platforms, ad_type, visual_style, default_cta,
        headline_template, body_template, image_prompt_template
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      templateId,
      userId,
      name,
      description,
      templateType || 'custom',
      category,
      JSON.stringify(platforms || []),
      adType,
      visualStyle,
      defaultCta,
      headlineTemplate,
      bodyTemplate,
      imagePromptTemplate
    ]);

    res.json({
      success: true,
      data: {
        id: templateId,
        name
      }
    });

  } catch (error) {
    logger.error('Failed to create template:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/smart-ads/:id/check-ugc-status - Check and update UGC video status
router.post('/:id/check-ugc-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { platform } = req.body; // Optional: check specific platform

    // Get the ad
    const adResult = await database.query(
      'SELECT * FROM smart_ads WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (adResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    const ad = adResult.rows[0];
    const ugcAssets = ad.ugc_assets || {};

    const VideoGenerationService = require('../services/VideoGenerationService');
    const updatedAssets = { ...ugcAssets };

    // Check each platform's UGC video status
    for (const [platformKey, asset] of Object.entries(ugcAssets)) {
      if (platform && platformKey !== platform) continue; // Skip if specific platform requested
      
      if (asset.videoId && !asset.videoUrl && asset.status !== 'failed') {
        try {
          const statusResult = await VideoGenerationService.checkHeyGenVideoStatus(asset.videoId);
          
          if (statusResult.data?.status === 'completed' || statusResult.data?.video_url) {
            const videoUrl = statusResult.data.video_url || statusResult.data.videoUrl;
            
            if (videoUrl) {
              // Download and store the video
              const localVideoPath = await VideoGenerationService.downloadAndStoreVideo(videoUrl, 'heygen');
              const localVideoUrl = `/uploads/videos/generated/${require('path').basename(localVideoPath)}`;
              
              updatedAssets[platformKey] = {
                ...asset,
                videoUrl: localVideoUrl,
                status: 'completed',
                completedAt: new Date().toISOString()
              };
              
              logger.info(`UGC video ${asset.videoId} for ${platformKey} is now ready`);
            }
          } else if (statusResult.data?.status === 'failed' || statusResult.data?.status === 'error') {
            updatedAssets[platformKey] = {
              ...asset,
              status: 'failed',
              error: statusResult.data.error || 'Video generation failed'
            };
          }
        } catch (statusError) {
          logger.error(`Error checking UGC video status for ${platformKey}:`, statusError);
        }
      }
    }

    // Update the ad with new UGC asset statuses
    await database.query(
      'UPDATE smart_ads SET ugc_assets = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(updatedAssets), id]
    );

    res.json({
      success: true,
      data: {
        ugcAssets: updatedAssets,
        message: 'UGC status checked and updated'
      }
    });

  } catch (error) {
    logger.error('Failed to check UGC status:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

