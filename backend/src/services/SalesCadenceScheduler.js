/**
 * Sales Cadence Scheduler
 * Executes pending cadence steps on a schedule
 */

const SalesCadenceService = require('./SalesCadenceService');
const logger = require('../utils/logger');

class SalesCadenceScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.intervalMinutes = 5; // Execute every 5 minutes
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('Sales Cadence Scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Sales Cadence Scheduler started', { intervalMinutes: this.intervalMinutes });

    // Execute immediately on start
    this.executePendingSteps();

    // Then execute on interval
    this.intervalId = setInterval(() => {
      this.executePendingSteps();
    }, this.intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    logger.info('Sales Cadence Scheduler stopped');
  }

  /**
   * Execute pending cadence steps
   */
  async executePendingSteps() {
    try {
      const result = await SalesCadenceService.executePendingSteps();
      if (result.executed > 0) {
        logger.info('Sales cadence steps executed', { count: result.executed });
      }
    } catch (error) {
      logger.error('Failed to execute pending cadence steps:', error);
    }
  }
}

module.exports = SalesCadenceScheduler;

