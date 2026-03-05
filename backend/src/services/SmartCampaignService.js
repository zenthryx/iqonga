const OpenAI = require('openai');
const logger = require('../utils/logger');
const database = require('../database/connection');
const SmartAdService = require('./SmartAdService');
const AIContentService = require('./AIContentService');
const SchedulerService = require('./SchedulerService');
const BrandBookService = require('./BrandBookService');
const ProductImageService = require('./ProductImageService');
const { v4: uuidv4 } = require('uuid');

/**
 * Smart Campaign Service
 * AI-driven campaign generator that creates multi-platform, multi-day campaigns
 * with cohesive themes, content calendars, and automated scheduling
 */
class SmartCampaignService {
  constructor() {
    // Lazy initialization of OpenAI client to avoid errors during route loading
    this._openai = null;

    // Campaign objectives
    this.campaignObjectives = {
      awareness: {
        name: 'Brand Awareness',
        description: 'Increase brand visibility and recognition',
        defaultDuration: 14, // days
        recommendedFrequency: 2 // posts per day
      },
      engagement: {
        name: 'Engagement',
        description: 'Drive likes, comments, shares, and interactions',
        defaultDuration: 7,
        recommendedFrequency: 3
      },
      conversion: {
        name: 'Conversion',
        description: 'Drive sales, sign-ups, or other conversions',
        defaultDuration: 10,
        recommendedFrequency: 2
      },
      launch: {
        name: 'Product Launch',
        description: 'Announce and promote a new product or service',
        defaultDuration: 21,
        recommendedFrequency: 2
      },
      retention: {
        name: 'Customer Retention',
        description: 'Re-engage existing customers',
        defaultDuration: 7,
        recommendedFrequency: 2
      }
    };

    // Campaign types
    this.campaignTypes = {
      multi_platform: 'Multi-Platform Campaign',
      single_platform: 'Single Platform Focus',
      sequential: 'Sequential Story Campaign',
      thematic: 'Thematic Content Series',
      seasonal: 'Seasonal/Holiday Campaign',
      event_based: 'Event-Based Campaign'
    };
  }

  /**
   * Lazy getter for OpenAI client
   * Initializes the client only when needed to avoid errors during route loading
   */
  get openai() {
    if (!this._openai) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required for campaign generation');
      }
      this._openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this._openai;
  }

  /**
   * Generate a complete smart campaign
   */
  async generateCampaign(options) {
    const {
      userId,
      agentId,
      productId,
      campaignName,
      campaignDescription,
      campaignObjective = 'awareness',
      campaignType = 'multi_platform',
      targetPlatforms = ['facebook', 'instagram'],
      targetAudience,
      brandVoice,
      startDate,
      duration, // in days
      postFrequency, // posts per day
      budget,
      customInstructions,
      // Media type options
      imagesOnly = false, // Only generate images, no videos or UGC
      includeVideo = true, // Generate videos (if not imagesOnly)
      includeUGC = true, // Generate UGC videos (if not imagesOnly and includeVideo)
      // Use existing ads option
      useExistingAds = false, // Use pre-created ads instead of generating new ones
      existingAdIds = [] // Array of existing ad IDs to use
    } = options;

    // Use provided campaignId or generate new one
    const campaignId = options.campaignId || uuidv4();
    const objective = this.campaignObjectives[campaignObjective] || this.campaignObjectives.awareness;
    const campaignDuration = duration || objective.defaultDuration;
    const frequency = postFrequency || objective.recommendedFrequency;

    logger.info(`Starting Smart Campaign generation: ${campaignId}`, {
      userId,
      objective: campaignObjective,
      type: campaignType,
      platforms: targetPlatforms,
      duration: campaignDuration,
      frequency
    });

    try {
      // Step 1: Generate campaign strategy and theme
      const campaignStrategy = await this.generateCampaignStrategy({
        campaignName,
        campaignDescription,
        campaignObjective,
        campaignType,
        targetAudience,
        brandVoice,
        duration: campaignDuration,
        frequency,
        customInstructions,
        userId
      });

      // Step 2: Generate content calendar
      const contentCalendar = await this.generateContentCalendar({
        strategy: campaignStrategy,
        startDate: startDate || new Date(),
        duration: campaignDuration,
        frequency,
        platforms: targetPlatforms
      });

      // Step 3: Generate ads for each calendar entry
      const generatedAds = [];
      const campaignPosts = [];

      // Get brand guidelines and product image once for the campaign
      const brandGuidelines = await BrandBookService.getBrandGuidelinesForAI(userId);
      let productImageUrl = null;
      if (productId) {
        const primaryImage = await ProductImageService.getPrimaryProductImage(productId);
        if (primaryImage) {
          productImageUrl = primaryImage.file_url;
        }
      }

      for (const calendarEntry of contentCalendar) {
        try {
          // Determine if we should use an existing ad or generate a new one
          let adResult;
          
          if (useExistingAds && existingAdIds.length > 0) {
            // Use existing ad - cycle through provided ad IDs
            const adIndex = generatedAds.length % existingAdIds.length;
            const existingAdId = existingAdIds[adIndex];
            
            // Verify the ad exists and belongs to the user
            const existingAd = await SmartAdService.getAdById(existingAdId, userId);
            if (!existingAd) {
              throw new Error(`Existing ad ${existingAdId} not found or access denied`);
            }
            
            adResult = { adId: existingAdId };
            logger.info(`Using existing ad ${existingAdId} for campaign ${campaignId}`);
          } else {
            // Generate new ad for this calendar entry with brand guidelines
            // Apply media type restrictions
            const shouldGenerateVideo = !imagesOnly && includeVideo && (calendarEntry.includeVideo || false);
            const shouldGenerateUGC = !imagesOnly && includeVideo && includeUGC && (calendarEntry.includeUGC || false);
            
            adResult = await SmartAdService.generateAd({
              userId,
              agentId,
              productId,
              productName: campaignStrategy.productName || campaignName,
              productDescription: campaignStrategy.productDescription || campaignDescription,
              productImageUrl,
              targetPlatforms: calendarEntry.platforms,
              adType: calendarEntry.adType,
              visualStyle: calendarEntry.visualStyle || campaignStrategy.visualStyle || 'modern',
              targetAudience,
              brandVoice: brandVoice || brandGuidelines?.brandVoice,
              callToAction: calendarEntry.callToAction,
              promotionalDetails: calendarEntry.promotionalDetails,
              variantCount: 1, // Single variant per campaign post
              generateVideo: shouldGenerateVideo,
              generateUGC: shouldGenerateUGC,
              customInstructions: brandGuidelines ?
                `${campaignStrategy.themeGuidance}\n${calendarEntry.contentGuidance}\n\nBrand Guidelines:\n- Brand Voice: ${brandGuidelines.brandVoice || 'N/A'}\n- Brand Values: ${(brandGuidelines.brandValues || []).join(', ')}\n- Tone of Voice: ${brandGuidelines.toneOfVoice || 'N/A'}\n- Brand Messaging: ${brandGuidelines.brandMessaging || 'N/A'}`.trim() :
                `${campaignStrategy.themeGuidance}\n${calendarEntry.contentGuidance}`
            });
          }

          generatedAds.push(adResult.adId);

          // Create campaign post entries
          for (const platform of calendarEntry.platforms) {
            const postId = uuidv4();
            campaignPosts.push({
              id: postId,
              campaignId,
              smartAdId: adResult.adId,
              platform,
              format: calendarEntry.format || 'feed',
              contentVariant: 0,
              scheduledTime: calendarEntry.scheduledTime,
              status: 'pending'
            });
          }

          logger.info(`Generated ad ${adResult.adId} for campaign ${campaignId} - Day ${calendarEntry.day}, ${calendarEntry.platforms.join(', ')}`);
        } catch (adError) {
          logger.error(`Failed to generate ad for calendar entry:`, adError);
          // Continue with other entries
        }
      }

      // Step 4: Save campaign to database
      await this.saveCampaign({
        campaignId,
        userId,
        campaignName,
        campaignDescription,
        campaignType,
        campaignObjective,
        targetPlatforms,
        targetAudience,
        startDate: startDate || new Date(),
        endDate: new Date(Date.now() + campaignDuration * 24 * 60 * 60 * 1000),
        scheduleConfig: {
          duration: campaignDuration,
          frequency,
          totalPosts: campaignPosts.length
        },
        adIds: generatedAds,
        contentCalendar,
        strategy: campaignStrategy,
        status: 'completed'
      });

      // Step 5: Save campaign posts
      for (const post of campaignPosts) {
        await this.saveCampaignPost(post);
      }

      logger.info(`Campaign ${campaignId} generated successfully with ${generatedAds.length} ads and ${campaignPosts.length} posts`);

      return {
        success: true,
        campaignId,
        campaignName,
        campaignType,
        campaignObjective,
        platforms: targetPlatforms,
        duration: campaignDuration,
        totalAds: generatedAds.length,
        totalPosts: campaignPosts.length,
        contentCalendar,
        strategy: campaignStrategy,
        adIds: generatedAds,
        posts: campaignPosts,
        metadata: {
          generatedAt: new Date().toISOString(),
          startDate: startDate || new Date(),
          endDate: new Date(Date.now() + campaignDuration * 24 * 60 * 60 * 1000)
        }
      };

    } catch (error) {
      logger.error(`Smart Campaign generation failed: ${campaignId}`, error);
      throw new Error(`Failed to generate campaign: ${error.message}`);
    }
  }

  /**
   * Generate campaign strategy and theme
   */
  async generateCampaignStrategy(options) {
    const {
      campaignName,
      campaignDescription,
      campaignObjective,
      campaignType,
      targetAudience,
      brandVoice,
      duration,
      frequency,
      customInstructions,
      userId
    } = options;

    // Get brand guidelines if available
    let brandGuidelines = null;
    if (userId) {
      try {
        brandGuidelines = await BrandBookService.getBrandGuidelinesForAI(userId);
      } catch (error) {
        logger.warn('Failed to load brand guidelines for campaign strategy:', error);
      }
    }

    const objective = this.campaignObjectives[campaignObjective] || this.campaignObjectives.awareness;

    // Build brand guidelines section for prompt
    let brandGuidanceSection = '';
    if (brandGuidelines) {
      brandGuidanceSection = `\nBRAND GUIDELINES:
- Brand Name: ${brandGuidelines.brandName || 'N/A'}
- Brand Voice: ${brandGuidelines.brandVoice || 'N/A'}
- Brand Values: ${(brandGuidelines.brandValues || []).join(', ') || 'N/A'}
- Brand Personality: ${(brandGuidelines.brandPersonality || []).join(', ') || 'N/A'}
- Tone of Voice: ${brandGuidelines.toneOfVoice || 'N/A'}
- Brand Messaging: ${brandGuidelines.brandMessaging || 'N/A'}
- Primary Colors: ${(brandGuidelines.primaryColors || []).map(c => c.hex || c).join(', ') || 'N/A'}
- Visual Style Preferences: ${JSON.stringify(brandGuidelines.imageStylePreferences || {})}

IMPORTANT: All campaign content must align with these brand guidelines.`;
    }

    const prompt = `You are an expert marketing strategist. Create a comprehensive campaign strategy.

CAMPAIGN: ${campaignName}
DESCRIPTION: ${campaignDescription}
OBJECTIVE: ${objective.name} - ${objective.description}
TYPE: ${this.campaignTypes[campaignType] || campaignType}
DURATION: ${duration} days
FREQUENCY: ${frequency} posts per day
TARGET AUDIENCE: ${targetAudience || 'General audience'}
BRAND VOICE: ${brandVoice || brandGuidelines?.brandVoice || 'Professional and friendly'}
${brandGuidanceSection}
${customInstructions ? `CUSTOM INSTRUCTIONS: ${customInstructions}` : ''}

Create a campaign strategy that includes:
1. Core campaign theme and messaging
2. Key messages for each phase of the campaign
3. Content pillars (3-5 main topics/themes)
4. Visual style guidance
5. Call-to-action progression
6. Story arc (how the campaign tells a story over ${duration} days)

Return JSON:
{
  "theme": "Main campaign theme",
  "themeGuidance": "Detailed theme description for content generation",
  "productName": "Product/service name (if applicable)",
  "productDescription": "Product/service description",
  "keyMessages": ["Message 1", "Message 2", "Message 3"],
  "contentPillars": [
    {"name": "Pillar 1", "description": "...", "adTypes": ["product_showcase", "educational"]},
    {"name": "Pillar 2", "description": "...", "adTypes": ["testimonial", "social_proof"]}
  ],
  "visualStyle": "modern|bold|lifestyle|minimalist|playful",
  "ctaProgression": [
    {"phase": "Week 1", "cta": "Learn More", "focus": "Awareness"},
    {"phase": "Week 2", "cta": "Try Now", "focus": "Engagement"}
  ],
  "storyArc": {
    "act1": {"days": "1-${Math.ceil(duration/3)}", "focus": "Introduction and hook"},
    "act2": {"days": "${Math.ceil(duration/3)+1}-${Math.ceil(duration*2/3)}", "focus": "Development and engagement"},
    "act3": {"days": "${Math.ceil(duration*2/3)+1}-${duration}", "focus": "Conversion and action"}
  }
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert marketing strategist. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      });

      const strategy = JSON.parse(response.choices[0].message.content);
      logger.info(`Campaign strategy generated for: ${campaignName}`);
      return strategy;

    } catch (error) {
      logger.error('Campaign strategy generation failed:', error);
      // Return fallback strategy
      return {
        theme: campaignName,
        themeGuidance: campaignDescription,
        productName: campaignName,
        productDescription: campaignDescription,
        keyMessages: [campaignDescription],
        contentPillars: [
          { name: 'Main Message', description: campaignDescription, adTypes: ['product_showcase'] }
        ],
        visualStyle: 'modern',
        ctaProgression: [
          { phase: 'Entire Campaign', cta: 'Learn More', focus: campaignObjective }
        ],
        storyArc: {
          act1: { days: `1-${Math.ceil(duration/3)}`, focus: 'Introduction' },
          act2: { days: `${Math.ceil(duration/3)+1}-${Math.ceil(duration*2/3)}`, focus: 'Engagement' },
          act3: { days: `${Math.ceil(duration*2/3)+1}-${duration}`, focus: 'Action' }
        }
      };
    }
  }

  /**
   * Generate content calendar for the campaign
   */
  async generateContentCalendar(options) {
    const {
      strategy,
      startDate,
      duration,
      frequency,
      platforms
    } = options;

    const calendar = [];
    const start = new Date(startDate);
    let day = 1;
    let postIndex = 0;

    // Distribute content pillars across the campaign
    const pillarDistribution = this.distributeContentPillars(strategy.contentPillars, duration);

    for (let d = 0; d < duration; d++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + d);

      // Determine which content pillar to use for this day
      const pillarIndex = pillarDistribution[d] || 0;
      const pillar = strategy.contentPillars[pillarIndex] || strategy.contentPillars[0];

      // Determine which act of the story arc we're in
      const act = this.getCurrentAct(day, duration, strategy.storyArc);

      // Generate posts for this day
      for (let p = 0; p < frequency; p++) {
        const postTime = new Date(currentDate);
        // Distribute posts throughout the day (morning, afternoon, evening)
        const timeSlots = ['09:00', '14:00', '19:00'];
        const [hours, minutes] = timeSlots[p % timeSlots.length].split(':').map(Number);
        postTime.setHours(hours, minutes, 0, 0);

        // Select platforms for this post (can vary)
        const postPlatforms = this.selectPlatformsForPost(platforms, postIndex, duration * frequency);

        // Select ad type based on pillar
        const adType = this.selectAdType(pillar.adTypes || ['product_showcase']);

        // Determine visual style
        const visualStyle = strategy.visualStyle || 'modern';

        // Get CTA for current phase
        const cta = this.getCTAForPhase(day, duration, strategy.ctaProgression);

        // Generate content guidance
        const contentGuidance = this.generateContentGuidance({
          pillar,
          act,
          day,
          keyMessages: strategy.keyMessages,
          theme: strategy.theme
        });

        calendar.push({
          day,
          postIndex: postIndex++,
          scheduledTime: postTime.toISOString(),
          platforms: postPlatforms,
          adType,
          visualStyle,
          format: 'feed', // Can be enhanced to vary formats
          callToAction: cta,
          promotionalDetails: contentGuidance,
          contentGuidance,
          includeVideo: p === 0 && d % 3 === 0, // Include video every 3 days, first post
          includeUGC: p === 1 && d % 5 === 0 // Include UGC every 5 days, second post
        });
      }

      day++;
    }

    logger.info(`Generated content calendar with ${calendar.length} posts over ${duration} days`);
    return calendar;
  }

  /**
   * Distribute content pillars across campaign duration
   */
  distributeContentPillars(pillars, duration) {
    if (!pillars || pillars.length === 0) return new Array(duration).fill(0);
    
    const distribution = [];
    const postsPerPillar = Math.ceil(duration / pillars.length);
    
    for (let i = 0; i < duration; i++) {
      const pillarIndex = Math.floor(i / postsPerPillar) % pillars.length;
      distribution.push(pillarIndex);
    }
    
    return distribution;
  }

  /**
   * Get current act of story arc
   */
  getCurrentAct(day, duration, storyArc) {
    if (!storyArc) return { focus: 'Campaign content' };
    
    const act1Days = storyArc.act1?.days?.split('-')[1] || Math.ceil(duration/3);
    const act2Days = storyArc.act2?.days?.split('-')[1] || Math.ceil(duration*2/3);
    
    if (day <= parseInt(act1Days)) {
      return storyArc.act1 || { focus: 'Introduction' };
    } else if (day <= parseInt(act2Days)) {
      return storyArc.act2 || { focus: 'Engagement' };
    } else {
      return storyArc.act3 || { focus: 'Action' };
    }
  }

  /**
   * Select platforms for a post (can vary to optimize reach)
   */
  selectPlatformsForPost(platforms, postIndex, totalPosts) {
    // Vary platforms to ensure good distribution
    if (platforms.length === 1) return platforms;
    
    // Rotate platforms or use all for important posts
    if (postIndex % 3 === 0) {
      return platforms; // Use all platforms for every 3rd post
    } else {
      // Rotate between platforms
      const platformIndex = postIndex % platforms.length;
      return [platforms[platformIndex]];
    }
  }

  /**
   * Select ad type from available options
   */
  selectAdType(adTypes) {
    if (!adTypes || adTypes.length === 0) return 'product_showcase';
    // Randomly select from available types
    return adTypes[Math.floor(Math.random() * adTypes.length)];
  }

  /**
   * Get CTA for current phase
   */
  getCTAForPhase(day, duration, ctaProgression) {
    if (!ctaProgression || ctaProgression.length === 0) return 'Learn More';
    
    // Find matching phase
    for (const phase of ctaProgression) {
      const phaseDays = phase.phase.match(/\d+/g);
      if (phaseDays && phaseDays.length >= 2) {
        const startDay = parseInt(phaseDays[0]);
        const endDay = parseInt(phaseDays[1]);
        if (day >= startDay && day <= endDay) {
          return phase.cta || 'Learn More';
        }
      }
    }
    
    // Default to last phase or first CTA
    return ctaProgression[ctaProgression.length - 1]?.cta || ctaProgression[0]?.cta || 'Learn More';
  }

  /**
   * Generate content guidance for a specific post
   */
  generateContentGuidance(options) {
    const { pillar, act, day, keyMessages, theme } = options;
    
    return `Day ${day} of campaign. Focus: ${pillar.name} - ${pillar.description}. 
Campaign theme: ${theme}. 
Story arc: ${act.focus}. 
Key message: ${keyMessages[day % keyMessages.length] || keyMessages[0]}. 
Create engaging content that aligns with the campaign theme and progresses the story.`;
  }

  /**
   * Save campaign to database
   */
  async saveCampaign(campaign) {
    try {
      const {
        campaignId,
        userId,
        campaignName,
        campaignDescription,
        campaignType,
        campaignObjective,
        targetPlatforms,
        targetAudience,
        startDate,
        endDate,
        scheduleConfig,
        adIds,
        contentCalendar,
        strategy,
        status
      } = campaign;

      // Use INSERT ... ON CONFLICT to handle existing records (created by route)
      await database.query(`
        INSERT INTO ad_campaigns (
          id, user_id, name, description, campaign_type, objective,
          target_audience, target_platforms, start_date, end_date,
          schedule_config, ad_ids, content_calendar, strategy, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          campaign_type = EXCLUDED.campaign_type,
          objective = EXCLUDED.objective,
          target_audience = EXCLUDED.target_audience,
          target_platforms = EXCLUDED.target_platforms,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          schedule_config = EXCLUDED.schedule_config,
          ad_ids = EXCLUDED.ad_ids,
          content_calendar = EXCLUDED.content_calendar,
          strategy = EXCLUDED.strategy,
          status = EXCLUDED.status,
          updated_at = NOW()
      `, [
        campaignId,
        userId,
        campaignName,
        campaignDescription,
        campaignType,
        campaignObjective,
        JSON.stringify(targetAudience || {}),
        JSON.stringify(targetPlatforms || []),
        startDate,
        endDate,
        JSON.stringify(scheduleConfig || {}),
        JSON.stringify(adIds || []),
        JSON.stringify(contentCalendar || []),
        JSON.stringify(strategy || {}),
        status || 'completed'
      ]);

      logger.info(`Campaign ${campaignId} saved to database`);
    } catch (error) {
      logger.error('Failed to save campaign:', error);
      throw error;
    }
  }

  /**
   * Save campaign post to database
   */
  async saveCampaignPost(post) {
    try {
      const {
        id,
        campaignId,
        smartAdId,
        platform,
        format,
        contentVariant,
        scheduledTime,
        status
      } = post;

      await database.query(`
        INSERT INTO campaign_posts (
          id, campaign_id, smart_ad_id, platform, format, content_variant,
          scheduled_time, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        id,
        campaignId,
        smartAdId,
        platform,
        format,
        contentVariant,
        scheduledTime,
        status
      ]);

      logger.info(`Campaign post ${id} saved to database`);
    } catch (error) {
      logger.error('Failed to save campaign post:', error);
      throw error;
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId, userId) {
    try {
      const result = await database.query(`
        SELECT * FROM ad_campaigns 
        WHERE id = $1 AND user_id = $2
      `, [campaignId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const campaign = result.rows[0];
      
      // Get campaign posts
      const postsResult = await database.query(`
        SELECT * FROM campaign_posts 
        WHERE campaign_id = $1
        ORDER BY scheduled_time ASC
      `, [campaignId]);

      campaign.posts = postsResult.rows;
      return campaign;
    } catch (error) {
      logger.error('Failed to get campaign:', error);
      return null;
    }
  }

  /**
   * Get user's campaigns
   */
  async getUserCampaigns(userId, options = {}) {
    try {
      const { limit = 20, offset = 0, status } = options;

      let query = `
        SELECT * FROM ad_campaigns 
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get user campaigns:', error);
      throw error;
    }
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(campaignId, userId, status) {
    try {
      await database.query(`
        UPDATE ad_campaigns 
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3
      `, [status, campaignId, userId]);

      logger.info(`Campaign ${campaignId} status updated to ${status}`);
    } catch (error) {
      logger.error('Failed to update campaign status:', error);
      throw error;
    }
  }

  /**
   * Schedule campaign posts
   */
  async scheduleCampaignPosts(campaignId, userId) {
    try {
      // Get all pending campaign posts
      const postsResult = await database.query(`
        SELECT cp.*, sa.copy_variants, sa.visual_assets, sa.video_assets
        FROM campaign_posts cp
        LEFT JOIN smart_ads sa ON cp.smart_ad_id = sa.id
        WHERE cp.campaign_id = $1 AND cp.status = 'pending'
        ORDER BY cp.scheduled_time ASC
      `, [campaignId]);

      const scheduledCount = 0;

      for (const post of postsResult.rows) {
        try {
          // Create scheduled post entry
          const scheduledPostId = uuidv4();
          const ad = post.copy_variants?.[post.content_variant || 0];
          
          await database.query(`
            INSERT INTO scheduled_posts (
              id, agent_id, user_id, platform, content_type, content_text,
              content_config, scheduled_time, timezone, frequency, next_run, max_runs, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [
            scheduledPostId,
            null, // agent_id - can be linked if needed
            userId,
            post.platform,
            'ad_post',
            ad?.primaryText || ad?.headline || '',
            JSON.stringify({
              campaignId,
              campaignPostId: post.id,
              smartAdId: post.smart_ad_id,
              format: post.format,
              visualAssets: post.visual_assets,
              videoAssets: post.video_assets
            }),
            post.scheduled_time,
            'UTC',
            'once',
            post.scheduled_time,
            1,
            'scheduled'
          ]);

          // Update campaign post status
          await database.query(`
            UPDATE campaign_posts 
            SET status = 'scheduled', updated_at = NOW()
            WHERE id = $1
          `, [post.id]);

          scheduledCount++;
        } catch (postError) {
          logger.error(`Failed to schedule campaign post ${post.id}:`, postError);
        }
      }

      logger.info(`Scheduled ${scheduledCount} posts for campaign ${campaignId}`);
      return scheduledCount;
    } catch (error) {
      logger.error('Failed to schedule campaign posts:', error);
      throw error;
    }
  }

  /**
   * Get campaign performance summary
   */
  async getCampaignPerformance(campaignId, userId) {
    try {
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get performance from campaign_posts
      const performanceResult = await database.query(`
        SELECT 
          COUNT(*) as total_posts,
          SUM(impressions) as total_impressions,
          SUM(clicks) as total_clicks,
          SUM(engagement) as total_engagement,
          SUM(conversions) as total_conversions,
          COUNT(CASE WHEN status = 'posted' THEN 1 END) as posted_count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
        FROM campaign_posts
        WHERE campaign_id = $1
      `, [campaignId]);

      const stats = performanceResult.rows[0];

      return {
        campaignId,
        campaignName: campaign.name,
        status: campaign.status,
        totalPosts: parseInt(stats.total_posts) || 0,
        postedPosts: parseInt(stats.posted_count) || 0,
        pendingPosts: parseInt(stats.pending_count) || 0,
        totalImpressions: parseInt(stats.total_impressions) || 0,
        totalClicks: parseInt(stats.total_clicks) || 0,
        totalEngagement: parseInt(stats.total_engagement) || 0,
        totalConversions: parseInt(stats.total_conversions) || 0,
        clickThroughRate: stats.total_impressions > 0 
          ? (stats.total_clicks / stats.total_impressions * 100).toFixed(2) 
          : 0,
        engagementRate: stats.total_impressions > 0
          ? (stats.total_engagement / stats.total_impressions * 100).toFixed(2)
          : 0
      };
    } catch (error) {
      logger.error('Failed to get campaign performance:', error);
      throw error;
    }
  }

  /**
   * Get available campaign objectives
   */
  getCampaignObjectives() {
    return Object.entries(this.campaignObjectives).map(([key, value]) => ({
      id: key,
      ...value
    }));
  }

  /**
   * Get available campaign types
   */
  getCampaignTypes() {
    return Object.entries(this.campaignTypes).map(([key, value]) => ({
      id: key,
      name: value
    }));
  }
}

module.exports = new SmartCampaignService();

