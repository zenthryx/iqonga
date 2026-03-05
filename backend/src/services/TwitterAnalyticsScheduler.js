const cron = require('node-cron');
const database = require('../database/connection');
const TwitterAnalyticsService = require('./TwitterAnalyticsService');
const logger = require('../utils/logger');

/**
 * Background scheduler for Twitter Analytics daily snapshots
 */
class TwitterAnalyticsScheduler {
  constructor() {
    this.analyticsService = new TwitterAnalyticsService();
    this.isRunning = false;
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('Twitter Analytics Scheduler is already running');
      return;
    }

    // Run daily at 2 AM UTC
    cron.schedule('0 2 * * *', async () => {
      await this.collectDailySnapshots();
    });

    // Also run immediately on startup (for testing/initial data)
    // Comment out in production if you only want scheduled runs
    // this.collectDailySnapshots();

    this.isRunning = true;
    logger.info('Twitter Analytics Scheduler started - Daily snapshots at 2 AM UTC');
  }

  /**
   * Collect daily snapshots for all users with Twitter connections
   */
  async collectDailySnapshots() {
    try {
      logger.info('Starting daily Twitter analytics snapshot collection...');

      // Get all users with active Twitter connections
      const result = await database.query(
        `SELECT DISTINCT user_id FROM platform_connections 
         WHERE platform = 'twitter' AND connection_status = 'active'`
      );

      const userIds = result.rows.map((row) => row.user_id);
      logger.info(`Found ${userIds.length} users with Twitter connections`);

      let successCount = 0;
      let errorCount = 0;

      // Process each user (with rate limiting to avoid Twitter API limits)
      // Process in smaller batches with longer delays to respect rate limits
      const batchSize = 3; // Process 3 users at a time
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        for (const userId of batch) {
          try {
            await this.analyticsService.saveDailySnapshot(userId);
            successCount++;
            
            // Rate limiting: wait 5 seconds between users to avoid hitting Twitter limits (increased from 1 second)
            await new Promise((resolve) => setTimeout(resolve, 5000));
          } catch (error) {
            errorCount++;
            logger.error(`Failed to save snapshot for user ${userId}:`, error.message);
            
            // If rate limited, wait longer before continuing
            if (error.code === 429 || error.rateLimit) {
              const waitTime = error.rateLimit?.reset 
                ? (error.rateLimit.reset * 1000 - Date.now()) + 60000 // Wait until reset + 1 min
                : 900000; // Default 15 minutes
              logger.warn(`Rate limited. Waiting ${waitTime / 1000} seconds...`);
              await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 900000)));
              
              // Skip remaining users in this batch if rate limited
              break;
            }
          }
        }
        
        // Wait 30 seconds between batches to further reduce API pressure
        if (i + batchSize < userIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 30000));
        }
      }

      logger.info(
        `Daily snapshot collection complete. Success: ${successCount}, Errors: ${errorCount}`
      );
    } catch (error) {
      logger.error('Failed to collect daily snapshots:', error);
    }
  }

  /**
   * Manually trigger snapshot collection (for admin/testing)
   */
  async triggerNow() {
    await this.collectDailySnapshots();
  }

  /**
   * Stop the scheduler
   */
  stop() {
    // Note: node-cron doesn't have a built-in stop method for all jobs
    // In production, you'd want to store the cron job reference and cancel it
    this.isRunning = false;
    logger.info('Twitter Analytics Scheduler stopped');
  }
}

module.exports = TwitterAnalyticsScheduler;

