const cron = require('node-cron');
const TokenHolderRewardService = require('../services/TokenHolderRewardService');
const logger = require('../utils/logger');

/**
 * Daily snapshot job - runs every day at 2 AM UTC
 * Takes a snapshot of all users' token balances
 */
function scheduleDailySnapshot() {
  // Run at 2 AM UTC every day
  cron.schedule('0 2 * * *', async () => {
    logger.info('🔄 Starting daily token balance snapshot job...');
    try {
      const result = await TokenHolderRewardService.takeDailySnapshot();
      logger.info(`✅ Daily snapshot job completed: ${result.snapshotsCreated} snapshots created`);
    } catch (error) {
      logger.error('❌ Daily snapshot job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });
  logger.info('📅 Daily token balance snapshot job scheduled (runs at 2 AM UTC)');
}

/**
 * Monthly reward calculation job - runs on the 1st of each month at 3 AM UTC
 * Calculates rewards for the previous month
 */
function scheduleMonthlyCalculation() {
  // Run on the 1st of each month at 3 AM UTC
  cron.schedule('0 3 1 * *', async () => {
    logger.info('🔄 Starting monthly reward calculation job...');
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = lastMonth.getFullYear();
      const month = lastMonth.getMonth() + 1;

      logger.info(`💰 Calculating rewards for ${year}-${String(month).padStart(2, '0')}`);
      const result = await TokenHolderRewardService.calculateMonthlyRewards(year, month);
      logger.info(`✅ Monthly calculation completed: ${result.rewardsCalculated} rewards calculated`);
    } catch (error) {
      logger.error('❌ Monthly calculation job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });
  logger.info('📅 Monthly reward calculation job scheduled (runs on 1st at 3 AM UTC)');
}

/**
 * Monthly reward distribution job - runs on the 2nd of each month at 4 AM UTC
 * Distributes credits to eligible users
 */
function scheduleMonthlyDistribution() {
  // Run on the 2nd of each month at 4 AM UTC
  cron.schedule('0 4 2 * *', async () => {
    logger.info('🔄 Starting monthly reward distribution job...');
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = lastMonth.getFullYear();
      const month = lastMonth.getMonth() + 1;

      logger.info(`🎁 Distributing rewards for ${year}-${String(month).padStart(2, '0')}`);
      const result = await TokenHolderRewardService.distributeMonthlyRewards(year, month);
      logger.info(`✅ Monthly distribution completed: ${result.distributed} rewards distributed`);
    } catch (error) {
      logger.error('❌ Monthly distribution job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });
  logger.info('📅 Monthly reward distribution job scheduled (runs on 2nd at 4 AM UTC)');
}

/**
 * Initialize all scheduled jobs
 */
function initializeTokenHolderRewardJobs() {
  scheduleDailySnapshot();
  scheduleMonthlyCalculation();
  scheduleMonthlyDistribution();
  logger.info('✅ Token holder reward jobs initialized');
}

module.exports = {
  initializeTokenHolderRewardJobs,
  scheduleDailySnapshot,
  scheduleMonthlyCalculation,
  scheduleMonthlyDistribution
};

