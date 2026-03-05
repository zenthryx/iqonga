const database = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

class PostQueueService {
  constructor() {
    this.processingInterval = null;
    this.startQueueProcessor();
  }

  // Add post to queue when rate limited
  async queuePost(userId, agentId, contentText, contentType = 'tweet', platform = 'twitter', rateLimitReset = null, originalError = null) {
    try {
      // Calculate when to schedule the post (after rate limit reset + buffer)
      let scheduledFor = new Date();
      if (rateLimitReset) {
        scheduledFor = new Date(rateLimitReset * 1000);
        // Add 5 minute buffer after reset
        scheduledFor.setMinutes(scheduledFor.getMinutes() + 5);
      } else {
        // Default: schedule for 1 hour later
        scheduledFor.setHours(scheduledFor.getHours() + 1);
      }

      const result = await database.query(`
        INSERT INTO post_queue 
        (user_id, agent_id, content_text, content_type, platform, scheduled_for, rate_limit_reset, original_error)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [userId, agentId, contentText, contentType, platform, scheduledFor, 
          rateLimitReset ? new Date(rateLimitReset * 1000) : null, originalError]);

      console.log(`📥 Post queued for user ${userId}, scheduled for: ${scheduledFor.toISOString()}`);
      
      return {
        success: true,
        queueId: result.rows[0].id,
        scheduledFor: scheduledFor,
        message: `Post queued successfully. Will attempt to post at ${scheduledFor.toLocaleString()}`
      };
    } catch (error) {
      console.error('Error queueing post:', error);
      throw error;
    }
  }

  // Get queued posts for a user
  async getQueuedPosts(userId, platform = null) {
    try {
      let query = `
        SELECT pq.*, aa.name as agent_name 
        FROM post_queue pq
        JOIN ai_agents aa ON pq.agent_id = aa.id
        WHERE pq.user_id = $1 AND pq.status IN ('queued', 'processing')
        ORDER BY pq.scheduled_for ASC
      `;
      let params = [userId];

      if (platform) {
        query = query.replace('WHERE pq.user_id = $1', 'WHERE pq.user_id = $1 AND pq.platform = $2');
        params.push(platform);
      }

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting queued posts:', error);
      throw error;
    }
  }

  // Cancel a queued post
  async cancelQueuedPost(userId, queueId) {
    try {
      const result = await database.query(`
        UPDATE post_queue 
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1 AND user_id = $2 AND status = 'queued'
        RETURNING *
      `, [queueId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Queued post not found or cannot be cancelled');
      }

      return {
        success: true,
        message: 'Post cancelled successfully'
      };
    } catch (error) {
      console.error('Error cancelling queued post:', error);
      throw error;
    }
  }

  // Update rate limit tracking
  async updateRateLimit(userId, platform, limitType, currentCount, limitMax, resetTime) {
    try {
      await database.query(`
        INSERT INTO rate_limit_tracking (user_id, platform, limit_type, current_count, limit_max, reset_time)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, platform, limit_type)
        DO UPDATE SET 
          current_count = $4,
          limit_max = $5,
          reset_time = $6,
          updated_at = NOW()
      `, [userId, platform, limitType, currentCount, limitMax, new Date(resetTime * 1000)]);

      console.log(`📊 Rate limit updated for user ${userId} on ${platform}: ${currentCount}/${limitMax}`);
    } catch (error) {
      console.error('Error updating rate limit:', error);
      throw error;
    }
  }

  // Check if user is rate limited
  async checkRateLimit(userId, platform, limitType = 'daily') {
    try {
      const result = await database.query(`
        SELECT * FROM rate_limit_tracking
        WHERE user_id = $1 AND platform = $2 AND limit_type = $3
        AND reset_time > NOW()
      `, [userId, platform, limitType]);

      if (result.rows.length === 0) {
        return { isLimited: false };
      }

      const limit = result.rows[0];
      const isLimited = limit.current_count >= limit.limit_max;

      return {
        isLimited,
        currentCount: limit.current_count,
        limitMax: limit.limit_max,
        resetTime: limit.reset_time,
        remainingPosts: Math.max(0, limit.limit_max - limit.current_count)
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { isLimited: false };
    }
  }

  // Start the queue processor (runs every 5 minutes)
  startQueueProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, 5 * 60 * 1000); // Every 5 minutes

    console.log('📨 Post queue processor started');
  }

  // Process queued posts
  async processQueue() {
    try {
      console.log('🔄 Processing post queue...');

      // Get posts ready to be processed
      const result = await database.query(`
        SELECT pq.*, aa.name as agent_name, u.wallet_address
        FROM post_queue pq
        JOIN ai_agents aa ON pq.agent_id = aa.id
        JOIN users u ON pq.user_id = u.id
        WHERE pq.status = 'queued' 
        AND pq.scheduled_for <= NOW()
        AND pq.retry_count < pq.max_retries
        ORDER BY pq.scheduled_for ASC
        LIMIT 10
      `);

      const postsToProcess = result.rows;
      console.log(`📋 Found ${postsToProcess.length} posts to process`);

      for (const post of postsToProcess) {
        await this.processQueuedPost(post);
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    }
  }

  // Process individual queued post
  async processQueuedPost(post) {
    try {
      console.log(`📤 Processing queued post ${post.id} for user ${post.user_id}`);

      // Mark as processing
      await database.query(`
        UPDATE post_queue 
        SET status = 'processing', updated_at = NOW()
        WHERE id = $1
      `, [post.id]);

      // Check rate limit before posting
      const rateLimitCheck = await this.checkRateLimit(post.user_id, post.platform);
      if (rateLimitCheck.isLimited) {
        console.log(`⏳ User ${post.user_id} still rate limited, rescheduling...`);
        
        // Reschedule for later
        const newScheduledTime = new Date(rateLimitCheck.resetTime);
        newScheduledTime.setMinutes(newScheduledTime.getMinutes() + 5);
        
        await database.query(`
          UPDATE post_queue 
          SET status = 'queued', 
              scheduled_for = $2,
              retry_count = retry_count + 1,
              updated_at = NOW()
          WHERE id = $1
        `, [post.id, newScheduledTime]);
        
        return;
      }

      // Attempt to post
      const success = await this.attemptPost(post);
      
      if (success) {
        await database.query(`
          UPDATE post_queue 
          SET status = 'posted', 
              posted_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
        `, [post.id]);
        
        console.log(`✅ Successfully posted queued content for user ${post.user_id}`);
      } else {
        await database.query(`
          UPDATE post_queue 
          SET status = 'failed',
              retry_count = retry_count + 1,
              updated_at = NOW()
          WHERE id = $1
        `, [post.id]);
        
        console.log(`❌ Failed to post queued content for user ${post.user_id}`);
      }
      
    } catch (error) {
      console.error(`Error processing queued post ${post.id}:`, error);
      
      await database.query(`
        UPDATE post_queue 
        SET status = 'failed',
            retry_count = retry_count + 1,
            updated_at = NOW()
        WHERE id = $1
      `, [post.id]);
    }
  }

  // Attempt to post content
  async attemptPost(post) {
    try {
      // Import the agents route handler
      const agentsService = require('./TwitterPostService');
      
      return await agentsService.postToTwitter(
        post.user_id,
        post.agent_id,
        post.content_text,
        post.content_type
      );
    } catch (error) {
      console.error('Error attempting to post:', error);
      return false;
    }
  }

  // Delete a queued post (admin only - can delete any status)
  async deleteQueuedPost(queueId) {
    try {
      const result = await database.query(`
        DELETE FROM post_queue 
        WHERE id = $1
        RETURNING *
      `, [queueId]);

      if (result.rows.length === 0) {
        throw new Error('Queued post not found');
      }

      console.log(`🗑️ Deleted queued post ${queueId}`);
      
      return {
        success: true,
        message: 'Post deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting queued post:', error);
      throw error;
    }
  }

  // Stop the queue processor
  stopQueueProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('📨 Post queue processor stopped');
    }
  }
}

module.exports = new PostQueueService();
