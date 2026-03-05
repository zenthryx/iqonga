const cron = require('node-cron');
const database = require('../database/connection');
const logger = require('../utils/logger');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      logger.info('Scheduler service is already running');
      return;
    }

    try {
      logger.info('Starting scheduler service...');
      
      // Wait for database to be connected
      let retries = 0;
      const maxRetries = 30; // Wait up to 30 seconds
      
      while (retries < maxRetries) {
        try {
          // Test database connection
          await database.query('SELECT 1');
          break; // Database is connected, exit the loop
        } catch (error) {
          retries++;
          if (retries >= maxRetries) {
            throw new Error('Database connection timeout - scheduler service cannot start');
          }
          logger.info(`Waiting for database connection... (attempt ${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        }
      }
      
      // Load all active scheduled posts from database
      await this.loadScheduledPosts();
      
      // Start the scheduler
      this.isRunning = true;
      
      // Schedule a job to check for new scheduled posts every minute
      cron.schedule('* * * * *', async () => {
        await this.checkForNewScheduledPosts();
      });

      // Scheduled trade signals: only send when there is a trade (no message if no setup)
      // Default every 15 min so 15m and 1h charts are checked on time; set SIGNAL_CRON=0 */4 * * * for every 4h only
      const signalCron = process.env.SIGNAL_CRON || '*/15 * * * *';
      if (process.env.SIGNAL_PAIRS) {
        cron.schedule(signalCron, async () => {
          try {
            const SignalJob = require('../jobs/SignalJob');
            await SignalJob.run();
          } catch (err) {
            logger.error('Scheduled signal job failed:', err);
          }
        });
        logger.info('Scheduled signal job registered:', signalCron);
      }

      logger.info('✅ Scheduler service started successfully');
    } catch (error) {
      logger.error('Failed to start scheduler service:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    try {
      logger.info('Stopping scheduler service...');
      
      // Stop all running jobs
      for (const [jobId, job] of this.jobs) {
        if (job.timeoutId) {
          clearTimeout(job.timeoutId);
        }
        this.jobs.delete(jobId);
      }
      
      this.isRunning = false;
      logger.info('✅ Scheduler service stopped successfully');
    } catch (error) {
      logger.error('Failed to stop scheduler service:', error);
      throw error;
    }
  }

  async loadScheduledPosts() {
    try {
      // Load posts that are active or scheduled and need to run
      const result = await database.query(`
        SELECT id, scheduled_time, frequency, frequency_config, status, agent_id, platform, content_text, next_run
        FROM scheduled_posts 
        WHERE (status = 'active' OR status = 'scheduled') 
        AND (next_run IS NULL OR next_run <= NOW())
      `);

      for (const post of result.rows) {
        await this.schedulePost(post);
      }

      logger.info(`Loaded ${result.rows.length} scheduled posts`);
    } catch (error) {
      logger.error('Failed to load scheduled posts:', error);
    }
  }

  async schedulePost(post) {
    try {
      if (this.jobs.has(post.id)) {
        // Job already exists, update it
        const existingJob = this.jobs.get(post.id);
        if (existingJob.timeoutId) {
          clearTimeout(existingJob.timeoutId);
        }
        this.jobs.delete(post.id);
      }

      // Calculate next run time based on frequency
      const nextRunTime = this.calculateNextRunTime(post.scheduled_time, post.frequency, post.frequency_config);
      
      if (nextRunTime <= new Date()) {
        // Post is overdue, execute immediately
        await this.executeScheduledPost(post);
        return;
      }

      // Calculate delay in milliseconds
      const delay = nextRunTime.getTime() - Date.now();
      
      // Schedule the job using setTimeout for specific dates
      const timeoutId = setTimeout(async () => {
        await this.executeScheduledPost(post);
      }, delay);

      // Store the job info
      this.jobs.set(post.id, {
        timeoutId: timeoutId,
        nextRunTime: nextRunTime
      });

      // Update the next_run time in database and set status to active
      await database.query(`
        UPDATE scheduled_posts 
        SET next_run = $1, status = 'active', updated_at = NOW() 
        WHERE id = $2
      `, [nextRunTime, post.id]);

      logger.info(`Scheduled post ${post.id} for ${nextRunTime} (in ${Math.round(delay/1000)} seconds)`);
    } catch (error) {
      logger.error(`Failed to schedule post ${post.id}:`, error);
    }
  }

  calculateNextRunTime(scheduledTime, frequency, frequencyConfig) {
    const baseTime = new Date(scheduledTime);
    const now = new Date();

    switch (frequency) {
      case 'once':
        return baseTime;
      
      case 'hourly':
        const nextHour = new Date(now);
        nextHour.setHours(nextHour.getHours() + 1);
        nextHour.setMinutes(baseTime.getMinutes(), 0, 0);
        return nextHour;
      
      case 'every_4_hours':
        const next4Hours = new Date(now);
        next4Hours.setHours(next4Hours.getHours() + 4);
        next4Hours.setMinutes(baseTime.getMinutes(), 0, 0);
        return next4Hours;
      
      case 'every_6_hours':
        const next6Hours = new Date(now);
        next6Hours.setHours(next6Hours.getHours() + 6);
        next6Hours.setMinutes(baseTime.getMinutes(), 0, 0);
        return next6Hours;
      
      case 'every_12_hours':
        const next12Hours = new Date(now);
        next12Hours.setHours(next12Hours.getHours() + 12);
        next12Hours.setMinutes(baseTime.getMinutes(), 0, 0);
        return next12Hours;
      
      case 'daily':
        let nextDaily = new Date(baseTime);
        while (nextDaily <= now) {
          nextDaily.setDate(nextDaily.getDate() + 1);
        }
        return nextDaily;
      
      case 'weekly':
        let nextWeekly = new Date(baseTime);
        while (nextWeekly <= now) {
          nextWeekly.setDate(nextWeekly.getDate() + 7);
        }
        return nextWeekly;
      
      case 'monthly':
        let nextMonthly = new Date(baseTime);
        while (nextMonthly <= now) {
          nextMonthly.setMonth(nextMonthly.getMonth() + 1);
        }
        return nextMonthly;
      
      default:
        return baseTime;
    }
  }

  async executeScheduledPost(post) {
    try {
      logger.info(`Executing scheduled post ${post.id}`);
      
      // Update status to running
      await database.query(`
        UPDATE scheduled_posts 
        SET status = 'running', last_run = NOW(), updated_at = NOW() 
        WHERE id = $1
      `, [post.id]);

      // Fetch full post data (content_config, media_urls, telegram_chat_id) for execution
      const fullPostResult = await database.query(`
        SELECT id, agent_id, user_id, platform, content_type, content_text, content_config,
               COALESCE(media_urls, '{}') as media_urls, telegram_chat_id,
               scheduled_time, frequency, frequency_config
        FROM scheduled_posts WHERE id = $1
      `, [post.id]);
      const fullPost = fullPostResult.rows[0] ? { ...post, ...fullPostResult.rows[0] } : post;

      // Actually post to the platform using the improved execution logic
      if (fullPost.platform === 'twitter') {
        await this.executeTwitterPost(fullPost);
      } else if (fullPost.platform === 'telegram') {
        await this.executeTelegramPost(fullPost);
      } else {
        logger.info(`Platform ${fullPost.platform} not yet implemented`);
      }
      
      // Update run count and status
      await database.query(`
        UPDATE scheduled_posts 
        SET run_count = run_count + 1, status = 'completed', updated_at = NOW() 
        WHERE id = $1
      `, [post.id]);

      // If it's a recurring post, check if we should continue
      if (post.frequency !== 'once') {
        // Get current run count and max runs
        const postResult = await database.query(`
          SELECT run_count, max_runs FROM scheduled_posts WHERE id = $1
        `, [post.id]);
        
        const currentRunCount = postResult.rows[0].run_count;
        const maxRuns = postResult.rows[0].max_runs;
        
        // Check if we've reached the maximum runs (0 means unlimited)
        if (maxRuns === 0 || currentRunCount < maxRuns) {
          const nextRunTime = this.calculateNextRunTime(post.scheduled_time, post.frequency, post.frequency_config);
          await database.query(`
            UPDATE scheduled_posts 
            SET next_run = $1, status = 'active', updated_at = NOW() 
            WHERE id = $2
          `, [nextRunTime, post.id]);
          
          // Reschedule the post
          await this.schedulePost({
            ...post,
            scheduled_time: nextRunTime
          });
          
          logger.info(`Rescheduled recurring post ${post.id} for ${nextRunTime} (run ${currentRunCount + 1}/${maxRuns === 0 ? '∞' : maxRuns})`);
        } else {
          logger.info(`Recurring post ${post.id} completed after ${currentRunCount} runs`);
          await database.query(`
            UPDATE scheduled_posts 
            SET status = 'completed', updated_at = NOW() 
            WHERE id = $1
          `, [post.id]);
        }
      }

      logger.info(`Successfully executed scheduled post ${post.id}`);
    } catch (error) {
      logger.error(`Failed to execute scheduled post ${post.id}:`, error);
      
      // Update status to failed
      await database.query(`
        UPDATE scheduled_posts 
        SET status = 'failed', updated_at = NOW() 
        WHERE id = $1
      `, [post.id]);
    }
  }

  async postToTwitter(post) {
    try {
      // Get the agent details to post as
      const agentResult = await database.query(`
        SELECT a.*, pc.access_token, pc.refresh_token
        FROM ai_agents a
        JOIN platform_connections pc ON a.user_id = pc.user_id AND pc.platform = 'twitter'
        WHERE a.id = $1
      `, [post.agent_id]);

      if (agentResult.rows.length === 0) {
        throw new Error('Agent or Twitter connection not found');
      }

      const agent = agentResult.rows[0];
      
      if (!agent.access_token) {
        throw new Error('Twitter access token not found for agent');
      }

      // Import required modules
      const { TwitterApi } = require('twitter-api-v2');
      const { decrypt, encrypt } = require('../utils/encryption');
      
      // Decrypt the access token (it's stored encrypted in the database)
      let currentAccessToken = decrypt(agent.access_token);
      let currentRefreshToken = agent.refresh_token ? decrypt(agent.refresh_token) : null;
      
      // Try to refresh the token if we have a refresh token
      if (currentRefreshToken) {
        try {
          logger.info(`Attempting to refresh OAuth 2.0 token for agent ${agent.id}`);
          const refreshClient = new TwitterApi({
            clientId: process.env.TWITTER_CLIENT_ID,
            clientSecret: process.env.TWITTER_CLIENT_SECRET,
          });
          
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshClient.refreshOAuth2Token(currentRefreshToken);
          
          logger.info(`Token refreshed successfully for agent ${agent.id}`);
          currentAccessToken = newAccessToken;
          currentRefreshToken = newRefreshToken;
          
          // Update the database with new tokens
          const encryptedNewAccessToken = encrypt(newAccessToken);
          const encryptedNewRefreshToken = newRefreshToken ? encrypt(newRefreshToken) : null;
          
          await database.query(`
            UPDATE platform_connections 
            SET access_token = $1, refresh_token = $2, updated_at = NOW()
            WHERE user_id = $3 AND platform = 'twitter'
          `, [encryptedNewAccessToken, encryptedNewRefreshToken, agent.user_id]);
          
          logger.info(`Updated database with new tokens for agent ${agent.id}`);
          
        } catch (refreshError) {
          logger.warn(`Token refresh failed for agent ${agent.id}, using existing token:`, refreshError.message);
          // Continue with existing token if refresh fails
        }
      }
      
      // Create Twitter client with current access token
      const userClient = new TwitterApi(currentAccessToken);
      
      // Verify credentials
      const verifyResult = await userClient.v2.me();
      if (!verifyResult.data) {
        throw new Error('Invalid Twitter credentials');
      }

      // Post the content to Twitter
      let tweetResult;
      if (post.content_text && post.content_text.trim()) {
        // Post with content
        tweetResult = await userClient.v2.tweet(post.content_text);
      } else {
        // Generate AI content if none provided
        const aiContent = await this.generateAIContent(agent, post);
        tweetResult = await userClient.v2.tweet(aiContent);
      }

      if (tweetResult.data) {
        logger.info(`Successfully posted to Twitter as ${agent.name}: Tweet ID ${tweetResult.data.id}`);
        
        // Update the post record with the tweet ID
        await database.query(`
          UPDATE scheduled_posts 
          SET last_tweet_id = $1, updated_at = NOW() 
          WHERE id = $2
        `, [tweetResult.data.id, post.id]);
        
        return tweetResult.data;
      } else {
        throw new Error('Failed to post to Twitter - no response data');
      }
      
    } catch (error) {
      logger.error(`Failed to post to Twitter:`, error);
      throw error;
    }
  }

  async generateAIContent(agent, post) {
    try {
      // Import AI content service
      const aiContentService = require('./AIContentService');
      
      // Generate content based on agent personality with company knowledge
      const result = await aiContentService.generateContent(agent, {
        content_type: post.content_type || 'tweet',
        topic: post.topic || 'general update',
        style: 'casual',
        length: 'short',
        hashtags: true,
        emojis: true
      });
      
      return result.content;
    } catch (error) {
      logger.error('Failed to generate AI content for scheduled post:', error);
      // Fallback to a simple message
      return `Hello from ${agent.name}! 🤖✨`;
    }
  }

  /**
   * Auto-generate image at publish time using company/agent context (no user present).
   * Uses content_config.auto_generate_image and optional image_prompt_hint.
   * Deducts credits and returns URL to attach to the post.
   */
  async autoGenerateImageForScheduledPost(agent, contentText, contentConfig) {
    if (!contentConfig?.auto_generate_image) return null;
    try {
      const aiService = require('./AIContentService');
      const CreditService = require('./CreditService');
      const ServicePricingService = require('./ServicePricingService');
      const { v4: uuidv4 } = require('uuid');

      const hint = contentConfig.image_prompt_hint && contentConfig.image_prompt_hint.trim();
      const prompt = hint || (contentText ? `${contentText.slice(0, 250)}. Professional, engaging social media image.` : 'Professional, engaging social media image for brand.');
      const style = contentConfig.image_style || 'realistic';
      const size = contentConfig.image_size || '1024x1024';

      const creditCost = await ServicePricingService.getPricing('image_generation');
      if (creditCost > 0) {
        const creditService = new CreditService();
        const imageId = uuidv4();
        try {
          await creditService.deductCredits(agent.user_id, 'image_generation', creditCost, imageId);
        } catch (creditError) {
          logger.warn('Scheduled post auto image: insufficient credits, skipping image', creditError.message);
          return null;
        }
      }

      const result = await aiService.generateImageForAgent(agent, prompt, { style, size });
      if (result && result.url) {
        logger.info(`Auto-generated image for scheduled post (agent ${agent.id})`);
        return result.url;
      }
      return null;
    } catch (error) {
      logger.warn('Scheduled post auto image generation failed:', error.message);
      return null;
    }
  }

  async checkForNewScheduledPosts() {
    try {
      // Check for posts that are active or scheduled and need to run
      const result = await database.query(`
        SELECT id, scheduled_time, frequency, frequency_config, status, agent_id, platform, content_text, next_run
        FROM scheduled_posts 
        WHERE (status = 'active' OR status = 'scheduled') 
        AND (next_run IS NULL OR next_run <= NOW())
      `);

      for (const post of result.rows) {
        if (!this.jobs.has(post.id)) {
          await this.schedulePost(post);
        }
      }
    } catch (error) {
      logger.error('Failed to check for new scheduled posts:', error);
    }
  }

  // Method to manually schedule a post (called when creating new scheduled posts)
  async addScheduledPost(postData) {
    try {
      const post = {
        id: postData.id,
        scheduled_time: postData.scheduled_time,
        frequency: postData.frequency || 'once',
        frequency_config: postData.frequency_config,
        status: 'active',
        agent_id: postData.agent_id,
        platform: postData.platform,
        content_text: postData.content_text
      };

      await this.schedulePost(post);
      logger.info(`Added new scheduled post ${post.id}`);
    } catch (error) {
      logger.error(`Failed to add scheduled post ${postData.id}:`, error);
      throw error;
    }
  }

  // Method to remove a scheduled post
  async removeScheduledPost(postId) {
    try {
      if (this.jobs.has(postId)) {
        const job = this.jobs.get(postId);
        if (job.timeoutId) {
          clearTimeout(job.timeoutId);
        }
        this.jobs.delete(postId);
        logger.info(`Removed scheduled post ${postId}`);
      }
    } catch (error) {
      logger.error(`Failed to remove scheduled post ${postId}:`, error);
      throw error;
    }
  }

  // Method to pause a scheduled post
  async pauseScheduledPost(postId) {
    try {
      if (this.jobs.has(postId)) {
        const job = this.jobs.get(postId);
        if (job.timeoutId) {
          clearTimeout(job.timeoutId);
        }
        this.jobs.delete(postId);
        
        await database.query(`
          UPDATE scheduled_posts 
          SET status = 'paused', updated_at = NOW() 
          WHERE id = $1
        `, [postId]);
        
        logger.info(`Paused scheduled post ${postId}`);
      }
    } catch (error) {
      logger.error(`Failed to pause scheduled post ${postId}:`, error);
      throw error;
    }
  }

  // Method to resume a paused scheduled post
  async resumeScheduledPost(postId) {
    try {
      const result = await database.query(`
        SELECT id, scheduled_time, frequency, frequency_config, status, agent_id, platform, content_text
        FROM scheduled_posts 
        WHERE id = $1
      `, [postId]);

      if (result.rows.length > 0) {
        const post = result.rows[0];
        await this.schedulePost(post);
        
        await database.query(`
          UPDATE scheduled_posts 
          SET status = 'active', updated_at = NOW() 
          WHERE id = $1
        `, [postId]);
        
        logger.info(`Resumed scheduled post ${postId}`);
      }
    } catch (error) {
      logger.error(`Failed to resume scheduled post ${postId}:`, error);
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: this.jobs.size,
      jobs: Array.from(this.jobs.entries()).map(([id, job]) => ({
        id,
        nextRunTime: job.nextRunTime,
        delaySeconds: job.nextRunTime ? Math.round((job.nextRunTime.getTime() - Date.now()) / 1000) : 0
      }))
    };
  }

  // Debug method to check scheduled posts
  async debugScheduledPosts() {
    try {
      const result = await database.query(`
        SELECT id, scheduled_time, next_run, frequency, status, run_count, max_runs, 
               EXTRACT(EPOCH FROM (next_run - NOW())) as seconds_until_next
        FROM scheduled_posts 
        WHERE status IN ('active', 'scheduled')
        ORDER BY next_run ASC
      `);

      logger.info('Current scheduled posts:', {
        total: result.rows.length,
        posts: result.rows.map(row => ({
          id: row.id,
          scheduled_time: row.scheduled_time,
          next_run: row.next_run,
          frequency: row.frequency,
          status: row.status,
          run_count: row.run_count,
          max_runs: row.max_runs,
          seconds_until_next: Math.round(row.seconds_until_next || 0)
        }))
      });

      return result.rows;
    } catch (error) {
      logger.error('Failed to debug scheduled posts:', error);
      return [];
    }
  }

  // Method to manually check scheduler health
  async checkSchedulerHealth() {
    try {
      const status = this.getStatus();
      logger.info('Scheduler Health Check:', status);
      
      // Check database connection
      await database.query('SELECT 1');
      logger.info('Database connection: OK');
      
      // Check active scheduled posts
      const result = await database.query(`
        SELECT COUNT(*) as total, 
               COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
               COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
               COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
               COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
               COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM scheduled_posts
      `);
      
      logger.info('Scheduled Posts Status:', result.rows[0]);
      
      return {
        scheduler: status,
        database: 'OK',
        posts: result.rows[0]
      };
    } catch (error) {
      logger.error('Scheduler health check failed:', error);
      return {
        scheduler: this.getStatus(),
        database: 'ERROR',
        error: error.message
      };
    }
  }

  // Method to check Twitter connection status for debugging
  async checkTwitterConnection(agentId) {
    try {
      const agentResult = await database.query(`
        SELECT a.*, pc.access_token, pc.refresh_token, pc.connection_status, pc.username
        FROM ai_agents a
        JOIN platform_connections pc ON a.user_id = pc.user_id AND pc.platform = 'twitter'
        WHERE a.id = $1
      `, [agentId]);

      if (agentResult.rows.length === 0) {
        return { error: 'Agent or Twitter connection not found' };
      }

      const agent = agentResult.rows[0];
      const { decrypt } = require('../utils/encryption');
      
      let accessToken = null;
      let refreshToken = null;
      
      try {
        accessToken = decrypt(agent.access_token);
        refreshToken = agent.refresh_token ? decrypt(agent.refresh_token) : null;
      } catch (decryptError) {
        return { error: 'Failed to decrypt tokens', details: decryptError.message };
      }

      return {
        agent: {
          id: agent.id,
          name: agent.name,
          user_id: agent.user_id
        },
        connection: {
          status: agent.connection_status,
          username: agent.username,
          access_token_length: accessToken ? accessToken.length : 0,
          refresh_token_available: !!refreshToken,
          access_token_preview: accessToken ? accessToken.substring(0, 10) + '...' : 'None'
        }
      };
    } catch (error) {
      logger.error(`Failed to check Twitter connection for agent ${agentId}:`, error);
      return { error: error.message };
    }
  }

  // Improved Twitter post execution with fresh content generation
  async executeTwitterPost(post) {
    try {
      logger.info(`Executing scheduled Twitter post for agent ${post.agent_id}`);
      
      // Get agent details
      const agentResult = await database.query(`
        SELECT id, name, user_id, personality_type, voice_tone, target_topics, platforms
        FROM ai_agents 
        WHERE id = $1
      `, [post.agent_id]);
      
      if (agentResult.rows.length === 0) {
        throw new Error('Agent not found');
      }
      
      const agent = agentResult.rows[0];
      
      // Check if user has Twitter connection
      const twitterConnection = await database.query(`
        SELECT username, connection_status, access_token, refresh_token
        FROM platform_connections 
        WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'
      `, [agent.user_id]);
      
      if (twitterConnection.rows.length === 0) {
        throw new Error('No active Twitter connection found');
      }
      
      const connection = twitterConnection.rows[0];
      
      // Use provided content or generate fresh content using AI
      let contentToPost;
      if (post.content_text && post.content_text.trim()) {
        contentToPost = post.content_text;
        logger.info(`Using provided content for scheduled Twitter post`);
      } else {
        const aiService = require('./AIContentService');
        logger.info(`Generating fresh content for scheduled Twitter post with company data`);
        const contentResult = await aiService.generateContent(agent, {
          content_type: post.content_type || 'tweet',
          topic: post.content_config?.topic || 'general',
          style: post.content_config?.style || post.content_config?.tone || 'engaging',
          length: 'medium',
          hashtags: post.content_config?.include_hashtags !== false,
          emojis: true
        });
        if (Array.isArray(contentResult.content)) {
          contentToPost = contentResult.content[0]?.content || contentResult.content[0] || 'Generated content';
        } else if (typeof contentResult.content === 'string') {
          contentToPost = contentResult.content;
        } else {
          contentToPost = contentResult.content?.content || 'Generated content';
        }
      }
      
      logger.info(`Content for Twitter: ${contentToPost.substring(0, 100)}...`);
      
      // Build media list: pre-attached URLs + optional auto-generated image at publish time
      let mediaUrls = Array.isArray(post.media_urls) ? [...post.media_urls] : [];
      const autoImageUrl = await this.autoGenerateImageForScheduledPost(agent, contentToPost, post.content_config || {});
      if (autoImageUrl) mediaUrls.push(autoImageUrl);
      
      const { TwitterApi } = require('twitter-api-v2');
      const { decrypt, encrypt } = require('../utils/encryption');
      const TwitterService = require('./TwitterService');
      
      let currentAccessToken = decrypt(connection.access_token);
      let currentRefreshToken = connection.refresh_token ? decrypt(connection.refresh_token) : null;
      
      if (currentRefreshToken) {
        try {
          logger.info(`Attempting to refresh OAuth 2.0 token for scheduled post`);
          const refreshClient = new TwitterApi({
            clientId: process.env.TWITTER_CLIENT_ID,
            clientSecret: process.env.TWITTER_CLIENT_SECRET,
          });
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshClient.refreshOAuth2Token(currentRefreshToken);
          currentAccessToken = newAccessToken;
          currentRefreshToken = newRefreshToken;
          const encryptedNewAccessToken = encrypt(newAccessToken);
          const encryptedNewRefreshToken = newRefreshToken ? encrypt(newRefreshToken) : null;
          await database.query(`
            UPDATE platform_connections 
            SET access_token = $1, refresh_token = $2, updated_at = NOW()
            WHERE user_id = $3 AND platform = 'twitter'
          `, [encryptedNewAccessToken, encryptedNewRefreshToken, agent.user_id]);
        } catch (refreshError) {
          logger.warn(`Token refresh failed for scheduled post, using existing token:`, refreshError.message);
        }
      }
      
      let tweetResult;
      if (mediaUrls.length > 0) {
        const twitterService = new TwitterService(currentAccessToken, currentRefreshToken);
        const tweetId = await twitterService.postTweet(contentToPost, mediaUrls);
        tweetResult = { data: { id: tweetId } };
      } else {
        const userClient = new TwitterApi(currentAccessToken);
        tweetResult = await userClient.v2.tweet({ text: contentToPost });
      }
      
      logger.info(`Successfully posted scheduled Twitter post: Tweet ID ${tweetResult.data.id}`);
      
      return {
        success: true,
        tweetId: tweetResult.data.id,
        content: contentToPost
      };
      
    } catch (error) {
      logger.error(`Failed to execute scheduled Twitter post:`, error);
      throw error;
    }
  }

  // Improved Telegram post execution with fresh content generation
  async executeTelegramPost(post) {
    try {
      logger.info(`Executing scheduled Telegram post for agent ${post.agent_id}`);
      
      // Get agent details
      const agentResult = await database.query(`
        SELECT id, name, user_id, personality_type, voice_tone, target_topics, platforms
        FROM ai_agents WHERE id = $1
      `, [post.agent_id]);
      
      if (agentResult.rows.length === 0) {
        throw new Error('Agent not found');
      }
      
      const agent = agentResult.rows[0];
      
      // Use provided content or generate fresh content using AI
      let contentToPost;
      if (post.content_text && post.content_text.trim()) {
        contentToPost = post.content_text;
        logger.info(`Using provided content for scheduled Telegram post`);
      } else {
        const aiService = require('./AIContentService');
        logger.info(`Generating fresh content for scheduled Telegram post with company data`);
        const contentResult = await aiService.generateContent(agent, {
          content_type: 'telegram',
          topic: post.content_config?.topic || 'general',
          style: post.content_config?.style || post.content_config?.tone || 'engaging',
          length: 'medium',
          hashtags: post.content_config?.include_hashtags !== false,
          emojis: true
        });
        if (Array.isArray(contentResult.content)) {
          contentToPost = contentResult.content[0]?.content || contentResult.content[0] || 'Generated content';
        } else if (typeof contentResult.content === 'string') {
          contentToPost = contentResult.content;
        } else {
          contentToPost = contentResult.content?.content || 'Generated content';
        }
      }
      
      logger.info(`Content for Telegram: ${contentToPost.substring(0, 100)}...`);
      
      // Build media list: pre-attached URLs + optional auto-generated image at publish time
      let mediaUrls = Array.isArray(post.media_urls) ? [...post.media_urls] : [];
      const autoImageUrl = await this.autoGenerateImageForScheduledPost(agent, contentToPost, post.content_config || {});
      if (autoImageUrl) mediaUrls.push(autoImageUrl);
      
      let chatId = post.telegram_chat_id;
      if (!chatId) {
        const groupsResult = await database.query(`
          SELECT chat_id FROM telegram_groups 
          WHERE user_id = $1 AND agent_id = $2 AND is_active = true
          LIMIT 1
        `, [agent.user_id, agent.id]);
        if (groupsResult.rows.length === 0) {
          throw new Error(`No active Telegram groups found for agent ${agent.name}`);
        }
        chatId = groupsResult.rows[0].chat_id;
      }
      
      const telegramService = require('./TelegramService');
      const firstMediaUrl = mediaUrls.length > 0 ? mediaUrls[0] : null;
      const isVideo = firstMediaUrl && /\.(mp4|webm|mov|gif)(\?|$)/i.test(firstMediaUrl);
      const postOptions = {
        contentType: post.content_type || 'message',
        agentId: agent.id
      };
      if (firstMediaUrl) {
        if (isVideo) {
          postOptions.videoData = { video_url: firstMediaUrl };
        } else {
          postOptions.imageData = { image_url: firstMediaUrl };
        }
      }
      const result = await telegramService.postToTelegram(
        agent.user_id,
        chatId,
        contentToPost,
        postOptions
      );
      
      logger.info(`Telegram post executed successfully:`, result);
      
      return result;
      
    } catch (error) {
      logger.error(`Failed to execute Telegram post:`, error);
      throw error;
    }
  }
}

let _schedulerInstance = null;
SchedulerService.getInstance = function () {
  if (!_schedulerInstance) _schedulerInstance = new SchedulerService();
  return _schedulerInstance;
};

module.exports = SchedulerService;
