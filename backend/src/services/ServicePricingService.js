const database = require('../database/connection');
const logger = require('../utils/logger');

class ServicePricingService {
  constructor() {
    this.pricingCache = null;
    this.cacheExpiry = null;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  // Get default pricing (fallback if database not available)
  getDefaultPricing() {
    return {
      'content_generation_post': { cost: 20, billing_unit: 'flat', rate: 20 },
      'content_generation_reply': { cost: 30, billing_unit: 'flat', rate: 30 },
      'image_generation': { cost: 100, billing_unit: 'flat', rate: 100 },
      'video_generation_script': { cost: 60, billing_unit: 'flat', rate: 60 },
      'video_generation_actual': { cost: 60, billing_unit: 'second', rate: 60 },
      'video_generation_extension': { cost: 60, billing_unit: 'second', rate: 60 },
      'video_generation_ingredients': { cost: 60, billing_unit: 'second', rate: 60 },
      'video_generation_frames': { cost: 60, billing_unit: 'second', rate: 60 },
      'music_generation': { cost: 50, billing_unit: 'flat', rate: 50 },
      'lyrics_generation': { cost: 20, billing_unit: 'flat', rate: 20 },
      'music_video_generation': { cost: 60, billing_unit: 'second', rate: 60 },
      'heygen_text_to_avatar': { cost: 150, billing_unit: 'minute', rate: 150 },
      'heygen_audio_lip_sync': { cost: 150, billing_unit: 'minute', rate: 150 },
      'heygen_video_translation_fast': { cost: 10, billing_unit: 'second', rate: 10 }, // per minute
      'heygen_video_translation_quality': { cost: 15, billing_unit: 'second', rate: 15 }, // per minute
      'veo_video_generation': { cost: 35, billing_unit: 'second', rate: 35 }, // veo3.1_fast: 20 credits/sec
      'veo_video_generation_standard': { cost: 60, billing_unit: 'second', rate: 60 }, // veo3/veo3.1: 40 credits/sec
      'long_form_content': { cost: 100, billing_unit: 'flat', rate: 100 }, // Long-form content (blogs, newsletters, articles)
      'creative_writing': { cost: 80, billing_unit: 'flat', rate: 80 }, // Creative writing (stories, poems, books)
      'smart_ad_generation': { cost: 150, billing_unit: 'flat', rate: 150 }, // Smart Ad generation (copy + images)
      'ugc_generation': { cost: 200, billing_unit: 'flat', rate: 200 }, // UGC video generation with AI avatars
      'content_generation': { cost: 20, billing_unit: 'flat', rate: 20 }, // Basic content/copy generation
      'ai_background_removal': { cost: 50, billing_unit: 'flat', rate: 50 }, // AI background removal
      'ai_object_removal': { cost: 50, billing_unit: 'flat', rate: 50 }, // AI object removal/inpainting
      'ai_smart_filter': { cost: 30, billing_unit: 'flat', rate: 30 }, // AI smart filter/style application
      'ai_image_upscale': { cost: 40, billing_unit: 'flat', rate: 40 }, // AI image upscaling
      'ai_retouching': { cost: 60, billing_unit: 'flat', rate: 60 }, // AI retouching (skin, blemishes, etc.)
      'ai_style_learning': { cost: 100, billing_unit: 'flat', rate: 100 }, // Learn style from editing history
      'ai_apply_style': { cost: 40, billing_unit: 'flat', rate: 40 }, // Apply learned style to image
      'ai_logo_generation': { cost: 150, billing_unit: 'flat', rate: 150 }, // AI logo generation

      // Crypto intelligence pricing (flat credit costs)
      'crypto_x_search': { cost: 2, billing_unit: 'flat', rate: 2 },
      'crypto_sentiment_analysis': { cost: 1, billing_unit: 'flat', rate: 1 },
      'crypto_content_generation': { cost: 5, billing_unit: 'flat', rate: 5 },
      'crypto_auto_post': { cost: 1, billing_unit: 'flat', rate: 1 },

      // Keyword & Hashtag intelligence pricing (flat credit costs)
      'keyword_x_search': { cost: 2, billing_unit: 'flat', rate: 2 },
      'hashtag_x_search': { cost: 2, billing_unit: 'flat', rate: 2 },
      'keyword_sentiment_analysis': { cost: 1, billing_unit: 'flat', rate: 1 },
      'keyword_research': { cost: 2, billing_unit: 'flat', rate: 2 },
      'keyword_trending_analysis': { cost: 3, billing_unit: 'flat', rate: 3 },
      'keyword_content_generation': { cost: 5, billing_unit: 'flat', rate: 5 },
      'keyword_auto_post': { cost: 1, billing_unit: 'flat', rate: 1 },

      // Chat messaging pricing (flat credit costs)
      'chat_message_send': { cost: 0.1, billing_unit: 'flat', rate: 0.1 },
      'chat_file_upload_small': { cost: 1, billing_unit: 'flat', rate: 1 }, // < 5MB
      'chat_file_upload_large': { cost: 3, billing_unit: 'flat', rate: 3 }, // > 5MB
      'chat_group_creation': { cost: 5, billing_unit: 'flat', rate: 5 },
      'chat_signal_share': { cost: 0, billing_unit: 'flat', rate: 0 }, // Free (bundled with monitoring)

      // Platform-specific posting costs (additional cost on top of content generation)
      'platform_posting_twitter_post': { cost: 10, billing_unit: 'flat', rate: 10 }, // Extra cost for posting to Twitter
      'platform_posting_twitter_reply': { cost: 10, billing_unit: 'flat', rate: 10 }, // Extra cost for replying on Twitter
      'platform_posting_telegram_post': { cost: 0, billing_unit: 'flat', rate: 0 }, // No extra cost for Telegram posts (cheaper platform)
      'platform_posting_telegram_reply': { cost: 0, billing_unit: 'flat', rate: 0 }, // No extra cost for Telegram replies (cheaper platform)

      // eBook pricing
      'ebook_outline_generation': { cost: 10, billing_unit: 'flat', rate: 10 },
      'ebook_chapter_generation': { cost: 15, billing_unit: 'flat', rate: 15 },
      'ebook_cover_generation': { cost: 100, billing_unit: 'flat', rate: 100 },
      'ebook_export_pdf': { cost: 0, billing_unit: 'flat', rate: 0 }, // Free
      'ebook_export_epub': { cost: 0, billing_unit: 'flat', rate: 0 }, // Free
      'ebook_export_flipbook': { cost: 0, billing_unit: 'flat', rate: 0 }, // Free
      'ebook_audiobook_generation': { cost: 50, billing_unit: 'minute', rate: 50 },
      'ebook_transcription': { cost: 20, billing_unit: 'minute', rate: 20 }
    };
  }

  // Get pricing for a service key (returns flat cost for backward compatibility)
  async getPricing(serviceKey) {
    try {
      const pricingInfo = await this.getPricingInfo(serviceKey);
      return pricingInfo.cost || 0;
    } catch (error) {
      logger.error(`Error getting pricing for ${serviceKey}:`, error);
      const defaultPricing = this.getDefaultPricing()[serviceKey];
      return defaultPricing?.cost || defaultPricing || 0;
    }
  }

  // Get full pricing info including billing unit and rate
  async getPricingInfo(serviceKey) {
    try {
      const allPricing = await this.getAllPricing();
      const pricing = allPricing[serviceKey];
      
      if (pricing) {
        // If it's already in the new format, return it
        if (typeof pricing === 'object' && pricing.cost !== undefined) {
          return pricing;
        }
        // If it's in old format (just a number), convert it
        return {
          cost: pricing,
          billing_unit: 'flat',
          rate: pricing
        };
      }
      
      // Fallback to defaults
      const defaultPricing = this.getDefaultPricing()[serviceKey];
      if (defaultPricing) {
        return typeof defaultPricing === 'object' ? defaultPricing : {
          cost: defaultPricing,
          billing_unit: 'flat',
          rate: defaultPricing
        };
      }
      
      return { cost: 0, billing_unit: 'flat', rate: 0 };
    } catch (error) {
      logger.error(`Error getting pricing info for ${serviceKey}:`, error);
      const defaultPricing = this.getDefaultPricing()[serviceKey];
      return defaultPricing || { cost: 0, billing_unit: 'flat', rate: 0 };
    }
  }

  // Calculate cost based on duration (for per-second or per-minute services)
  async calculateCost(serviceKey, durationInSeconds) {
    try {
      const pricingInfo = await this.getPricingInfo(serviceKey);
      
      if (pricingInfo.billing_unit === 'flat') {
        // Flat rate, return the cost regardless of duration
        return Math.ceil(pricingInfo.cost);
      } else if (pricingInfo.billing_unit === 'second') {
        // Per second: rate * duration
        return Math.ceil(pricingInfo.rate * durationInSeconds);
      } else if (pricingInfo.billing_unit === 'minute') {
        // Per minute: rate * (duration / 60), round up to nearest minute
        const minutes = Math.ceil(durationInSeconds / 60);
        return Math.ceil(pricingInfo.rate * minutes);
      } else {
        // Unknown billing unit, return flat cost
        return Math.ceil(pricingInfo.cost);
      }
    } catch (error) {
      logger.error(`Error calculating cost for ${serviceKey}:`, error);
      const defaultPricing = this.getDefaultPricing()[serviceKey];
      if (defaultPricing && typeof defaultPricing === 'object') {
        return defaultPricing.billing_unit === 'flat' 
          ? Math.ceil(defaultPricing.cost)
          : Math.ceil(defaultPricing.rate * (defaultPricing.billing_unit === 'minute' ? Math.ceil(durationInSeconds / 60) : durationInSeconds));
      }
      return 0;
    }
  }

  // Get all pricing (with caching)
  async getAllPricing() {
    // Check cache
    if (this.pricingCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      return this.pricingCache;
    }

    try {
      // Try to get from database
      const result = await database.query(`
        SELECT service_key, credit_cost, billing_unit, rate
        FROM service_pricing
      `);

      if (result.rows.length > 0) {
        // Build pricing object with new format
        const pricing = {};
        result.rows.forEach(row => {
          const billingUnit = row.billing_unit || 'flat';
          const rate = row.rate !== null ? parseFloat(row.rate) : row.credit_cost;
          const cost = billingUnit === 'flat' ? row.credit_cost : rate;
          
          pricing[row.service_key] = {
            cost: cost,
            billing_unit: billingUnit,
            rate: rate
          };
        });

        // Cache it
        this.pricingCache = pricing;
        this.cacheExpiry = Date.now() + this.cacheDuration;

        // Merge with defaults for any missing services
        const defaults = this.getDefaultPricing();
        Object.keys(defaults).forEach(key => {
          if (!pricing[key]) {
            pricing[key] = defaults[key];
          }
        });

        return pricing;
      } else {
        // No pricing in database, use defaults
        const defaults = this.getDefaultPricing();
        this.pricingCache = defaults;
        this.cacheExpiry = Date.now() + this.cacheDuration;
        return defaults;
      }
    } catch (error) {
      // Table doesn't exist or error, use defaults
      logger.warn('Service pricing table not available, using defaults:', error.message);
      const defaults = this.getDefaultPricing();
      this.pricingCache = defaults;
      this.cacheExpiry = Date.now() + this.cacheDuration;
      return defaults;
    }
  }

  // Clear cache (call this after updating pricing)
  clearCache() {
    this.pricingCache = null;
    this.cacheExpiry = null;
  }

  // Initialize pricing table if it doesn't exist and migrate if needed
  async initializePricingTable() {
    let tableExists = false;
    
    try {
      // Check if table exists
      await database.query('SELECT 1 FROM service_pricing LIMIT 1');
      tableExists = true;
    } catch (error) {
      // Table doesn't exist, create it
      tableExists = false;
    }

    try {
      if (!tableExists) {
        // Create table with all columns
        await database.query(`
          CREATE TABLE IF NOT EXISTS service_pricing (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            service_key VARCHAR(100) UNIQUE NOT NULL,
            service_name VARCHAR(200) NOT NULL,
            category VARCHAR(50) NOT NULL,
            credit_cost DECIMAL(10, 4) NOT NULL DEFAULT 0,
            billing_unit VARCHAR(20) NOT NULL DEFAULT 'flat' CHECK (billing_unit IN ('flat', 'second', 'minute')),
            rate DECIMAL(10, 4) DEFAULT NULL,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          )
        `);
        logger.info('Service pricing table created');
      }

      // Always check and add missing columns (for existing tables that need migration)
      try {
        // Check if billing_unit column exists
        await database.query('SELECT billing_unit FROM service_pricing LIMIT 1');
      } catch (e) {
        // Column doesn't exist, add it
        logger.info('Adding billing_unit column to service_pricing table');
        try {
          await database.query(`
            ALTER TABLE service_pricing 
            ADD COLUMN billing_unit VARCHAR(20) DEFAULT 'flat'
          `);
          // Update existing rows to have 'flat' as default
          await database.query(`
            UPDATE service_pricing SET billing_unit = 'flat' WHERE billing_unit IS NULL
          `);
          logger.info('billing_unit column added successfully');
        } catch (addError) {
          logger.error('Error adding billing_unit column:', addError);
          throw addError;
        }
      }

      try {
        // Check if rate column exists
        await database.query('SELECT rate FROM service_pricing LIMIT 1');
      } catch (e) {
        // Column doesn't exist, add it
        logger.info('Adding rate column to service_pricing table');
        try {
          await database.query(`
            ALTER TABLE service_pricing 
            ADD COLUMN rate DECIMAL(10, 4) DEFAULT NULL
          `);
          // Update existing rows to set rate = credit_cost for flat billing
          await database.query(`
            UPDATE service_pricing 
            SET rate = credit_cost 
            WHERE rate IS NULL AND billing_unit = 'flat'
          `);
          logger.info('rate column added successfully');
        } catch (addError) {
          logger.error('Error adding rate column:', addError);
          throw addError;
        }
      }

      // Check if credit_cost is INTEGER and migrate to DECIMAL if needed
      try {
        const columnInfo = await database.query(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = 'service_pricing' AND column_name = 'credit_cost'
        `);
        
        if (columnInfo.rows.length > 0 && columnInfo.rows[0].data_type === 'integer') {
          logger.info('Migrating credit_cost column from INTEGER to DECIMAL');
          await database.query(`
            ALTER TABLE service_pricing 
            ALTER COLUMN credit_cost TYPE DECIMAL(10, 4) USING credit_cost::DECIMAL(10, 4)
          `);
          logger.info('credit_cost column migrated to DECIMAL successfully');
        }
      } catch (migrateError) {
        logger.error('Error migrating credit_cost column:', migrateError);
        // Don't throw - this is a migration that might fail if already done
      }

      // Create indexes (always, regardless of whether table was just created)
      await database.query(`
        CREATE INDEX IF NOT EXISTS idx_service_pricing_key ON service_pricing(service_key);
        CREATE INDEX IF NOT EXISTS idx_service_pricing_category ON service_pricing(category);
      `);

      // Insert or update default pricing
      const defaults = [
        { service_key: 'content_generation_post', service_name: 'Content Generation (Post)', category: 'Content', credit_cost: 20, billing_unit: 'flat', rate: 20, description: 'Generate social media posts' },
        { service_key: 'content_generation_reply', service_name: 'Content Generation (Reply)', category: 'Content', credit_cost: 20, billing_unit: 'flat', rate: 20, description: 'Generate reply content' },
        { service_key: 'image_generation', service_name: 'Image Generation', category: 'Media', credit_cost: 100, billing_unit: 'flat', rate: 100, description: 'Generate images with DALL-E' },
        { service_key: 'video_generation_script', service_name: 'Video Script Generation', category: 'Media', credit_cost: 200, billing_unit: 'flat', rate: 200, description: 'Generate video script and storyboard' },
        { service_key: 'video_generation_actual', service_name: 'Video Generation (Actual)', category: 'Media', credit_cost: 500, billing_unit: 'flat', rate: 500, description: 'Generate actual video with Runway/Veo' },
        { service_key: 'video_generation_extension', service_name: 'Video Extension', category: 'Media', credit_cost: 300, billing_unit: 'flat', rate: 300, description: 'Extend existing video' },
        { service_key: 'video_generation_ingredients', service_name: 'Video from Ingredients', category: 'Media', credit_cost: 400, billing_unit: 'flat', rate: 400, description: 'Generate video from reference images' },
        { service_key: 'video_generation_frames', service_name: 'Video from Frames', category: 'Media', credit_cost: 400, billing_unit: 'flat', rate: 400, description: 'Generate video between two frames' },
        { service_key: 'music_generation', service_name: 'Music Generation', category: 'Media', credit_cost: 300, billing_unit: 'flat', rate: 300, description: 'Generate music tracks' },
        { service_key: 'lyrics_generation', service_name: 'Lyrics Generation', category: 'Media', credit_cost: 50, billing_unit: 'flat', rate: 50, description: 'Generate song lyrics' },
        { service_key: 'music_video_generation', service_name: 'Music Video Generation', category: 'Media', credit_cost: 500, billing_unit: 'flat', rate: 500, description: 'Generate music videos with lip-sync' },
        { service_key: 'heygen_text_to_avatar', service_name: 'HeyGen Text-to-Avatar', category: 'Media', credit_cost: 500, billing_unit: 'flat', rate: 500, description: 'Generate avatar video from text script' },
        { service_key: 'heygen_audio_lip_sync', service_name: 'HeyGen Audio Lip-Sync', category: 'Media', credit_cost: 500, billing_unit: 'flat', rate: 500, description: 'Generate avatar video with audio lip-sync' },
        { service_key: 'heygen_video_translation_fast', service_name: 'HeyGen Video Translation (Fast)', category: 'Media', credit_cost: 3, billing_unit: 'minute', rate: 3, description: 'Translate video with lip-sync (fast mode, per minute)' },
        { service_key: 'heygen_video_translation_quality', service_name: 'HeyGen Video Translation (Quality)', category: 'Media', credit_cost: 6, billing_unit: 'minute', rate: 6, description: 'Translate video with lip-sync (quality mode, per minute)' },
        { service_key: 'veo_video_generation', service_name: 'Veo Video Generation (Fast)', category: 'Media', credit_cost: 20, billing_unit: 'second', rate: 20, description: 'Generate video with Veo 3.1 Fast (20 credits/second)' },
        { service_key: 'veo_video_generation_standard', service_name: 'Veo Video Generation (Standard)', category: 'Media', credit_cost: 40, billing_unit: 'second', rate: 40, description: 'Generate video with Veo 3/3.1 Standard (40 credits/second)' },
        // Gmail Integration Services
        { service_key: 'gmail_categorize', service_name: 'Gmail AI Categorization', category: 'Integration', credit_cost: 5, billing_unit: 'flat', rate: 5, description: 'AI-powered email categorization' },
        { service_key: 'gmail_summarize', service_name: 'Gmail AI Summarization', category: 'Integration', credit_cost: 10, billing_unit: 'flat', rate: 10, description: 'AI-powered email summarization' },
        { service_key: 'gmail_draft_reply', service_name: 'Gmail AI Draft Reply', category: 'Integration', credit_cost: 15, billing_unit: 'flat', rate: 15, description: 'AI-generated email draft replies' },
        { service_key: 'gmail_spam_check', service_name: 'Gmail AI Spam Detection', category: 'Integration', credit_cost: 3, billing_unit: 'flat', rate: 3, description: 'AI-powered spam detection' },
        { service_key: 'gmail_sync', service_name: 'Gmail Email Sync', category: 'Integration', credit_cost: 1, billing_unit: 'flat', rate: 1, description: 'Sync emails from Gmail (per sync operation)' },
        // IMAP/SMTP Email Integration Services
        { service_key: 'email_categorize', service_name: 'Email AI Categorization', category: 'Integration', credit_cost: 5, billing_unit: 'flat', rate: 5, description: 'AI-powered email categorization (IMAP)' },
        { service_key: 'email_summarize', service_name: 'Email AI Summarization', category: 'Integration', credit_cost: 10, billing_unit: 'flat', rate: 10, description: 'AI-powered email summarization (IMAP)' },
        { service_key: 'email_draft_reply', service_name: 'Email AI Draft Reply', category: 'Integration', credit_cost: 15, billing_unit: 'flat', rate: 15, description: 'AI-generated email draft replies (IMAP)' },
        { service_key: 'email_spam_check', service_name: 'Email AI Spam Detection', category: 'Integration', credit_cost: 3, billing_unit: 'flat', rate: 3, description: 'AI-powered spam detection (IMAP)' },
        { service_key: 'email_batch_categorize', service_name: 'Email Batch Categorization', category: 'Integration', credit_cost: 5, billing_unit: 'per_email', rate: 5, description: 'Batch AI email categorization' },
        // Calendar Integration Services
        { service_key: 'calendar_create_event', service_name: 'Calendar Create Event', category: 'Integration', credit_cost: 5, billing_unit: 'flat', rate: 5, description: 'Create a new calendar event' },
        { service_key: 'calendar_update_event', service_name: 'Calendar Update Event', category: 'Integration', credit_cost: 3, billing_unit: 'flat', rate: 3, description: 'Update an existing calendar event' },
        { service_key: 'calendar_delete_event', service_name: 'Calendar Delete Event', category: 'Integration', credit_cost: 2, billing_unit: 'flat', rate: 2, description: 'Delete a calendar event' },
        { service_key: 'calendar_meeting_prep', service_name: 'Calendar AI Meeting Prep', category: 'Integration', credit_cost: 20, billing_unit: 'flat', rate: 20, description: 'AI-powered meeting preparation and insights' },
        { service_key: 'calendar_sync', service_name: 'Calendar Event Sync', category: 'Integration', credit_cost: 1, billing_unit: 'flat', rate: 1, description: 'Sync calendar events (per sync operation)' },
        // Long-form Content Services
        { service_key: 'long_form_content', service_name: 'Long-form Content Generation', category: 'Content', credit_cost: 100, billing_unit: 'flat', rate: 100, description: 'Generate long-form content (blogs, newsletters, articles, whitepapers, etc.)' },
        // Creative Writing Services
        { service_key: 'creative_writing', service_name: 'Creative Writing Generation', category: 'Content', credit_cost: 80, billing_unit: 'flat', rate: 80, description: 'Generate creative writing (stories, poems, books, screenplays, etc.)' },
        // AI Image Editing Services
        { service_key: 'ai_background_removal', service_name: 'AI Background Removal', category: 'Media', credit_cost: 50, billing_unit: 'flat', rate: 50, description: 'Remove background from images using AI' },
        { service_key: 'ai_object_removal', service_name: 'AI Object Removal', category: 'Media', credit_cost: 50, billing_unit: 'flat', rate: 50, description: 'Remove objects from images using AI inpainting' },
        { service_key: 'ai_smart_filter', service_name: 'AI Smart Filter', category: 'Media', credit_cost: 30, billing_unit: 'flat', rate: 30, description: 'Apply AI-powered style filters to images' },
        { service_key: 'ai_image_upscale', service_name: 'AI Image Upscaling', category: 'Media', credit_cost: 40, billing_unit: 'flat', rate: 40, description: 'Upscale images using AI with quality enhancement' },
        { service_key: 'ai_retouching', service_name: 'AI Retouching', category: 'Media', credit_cost: 60, billing_unit: 'flat', rate: 60, description: 'AI-powered photo retouching (skin smoothing, blemish removal, etc.)' },
        { service_key: 'ai_style_learning', service_name: 'AI Style Learning', category: 'Media', credit_cost: 100, billing_unit: 'flat', rate: 100, description: 'Learn personal editing style from editing history' },
        { service_key: 'ai_apply_style', service_name: 'AI Apply Learned Style', category: 'Media', credit_cost: 40, billing_unit: 'flat', rate: 40, description: 'Apply learned style profile to images' },
        { service_key: 'ai_logo_generation', service_name: 'AI Logo Generation', category: 'Media', credit_cost: 150, billing_unit: 'flat', rate: 150, description: 'Generate professional logos using AI' },
        // Platform-specific posting costs (additional cost on top of content generation)
        { service_key: 'platform_posting_twitter_post', service_name: 'Twitter Post Publishing', category: 'Platform Posting', credit_cost: 10, billing_unit: 'flat', rate: 10, description: 'Additional cost for posting content to Twitter/X (on top of content generation)' },
        { service_key: 'platform_posting_twitter_reply', service_name: 'Twitter Reply Publishing', category: 'Platform Posting', credit_cost: 10, billing_unit: 'flat', rate: 10, description: 'Additional cost for replying on Twitter/X (on top of content generation)' },
        { service_key: 'platform_posting_telegram_post', service_name: 'Telegram Post Publishing', category: 'Platform Posting', credit_cost: 0, billing_unit: 'flat', rate: 0, description: 'Additional cost for posting to Telegram groups (currently free - cheaper platform)' },
        { service_key: 'platform_posting_telegram_reply', service_name: 'Telegram Reply Publishing', category: 'Platform Posting', credit_cost: 0, billing_unit: 'flat', rate: 0, description: 'Additional cost for replying in Telegram groups (currently free - cheaper platform)' },
        // Chat & Messaging Services
        { service_key: 'chat_message_send', service_name: 'Chat Message Send', category: 'Chat & Messaging', credit_cost: 0.1, billing_unit: 'flat', rate: 0.1, description: 'Send a message in chat (0.1 credits per message)' },
        { service_key: 'chat_file_upload_small', service_name: 'Chat File Upload (Small)', category: 'Chat & Messaging', credit_cost: 1, billing_unit: 'flat', rate: 1, description: 'Upload file in chat (< 5MB)' },
        { service_key: 'chat_file_upload_large', service_name: 'Chat File Upload (Large)', category: 'Chat & Messaging', credit_cost: 3, billing_unit: 'flat', rate: 3, description: 'Upload file in chat (> 5MB)' },
        { service_key: 'chat_group_creation', service_name: 'Chat Group Creation', category: 'Chat & Messaging', credit_cost: 5, billing_unit: 'flat', rate: 5, description: 'Create a new chat group' },
        { service_key: 'chat_signal_share', service_name: 'Chat Signal Share', category: 'Chat & Messaging', credit_cost: 0, billing_unit: 'flat', rate: 0, description: 'Share crypto signal in chat (free - bundled with monitoring)' }
      ];

      for (const service of defaults) {
        // Only INSERT if service doesn't exist, don't update existing rows to preserve user changes
        await database.query(`
          INSERT INTO service_pricing (service_key, service_name, category, credit_cost, billing_unit, rate, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (service_key) DO NOTHING
        `, [
          service.service_key, 
          service.service_name, 
          service.category, 
          service.credit_cost, 
          service.billing_unit,
          service.rate,
          service.description || ''
        ]);
      }

      // Only update existing rows that have NULL values (for migration purposes)
      // This preserves any user changes that have been made
      await database.query(`
        UPDATE service_pricing 
        SET billing_unit = 'flat' 
        WHERE billing_unit IS NULL
      `);
      
      await database.query(`
        UPDATE service_pricing 
        SET rate = credit_cost 
        WHERE rate IS NULL AND billing_unit = 'flat'
      `);
      
      // For non-flat billing units, set rate if it's NULL
      await database.query(`
        UPDATE service_pricing 
        SET rate = credit_cost 
        WHERE rate IS NULL AND billing_unit != 'flat'
      `);

      logger.info('Service pricing table initialized and migrated successfully');
      return true;
    } catch (createError) {
      logger.error('Error initializing service_pricing table:', createError);
      return false;
    }
  }
}

module.exports = new ServicePricingService();

