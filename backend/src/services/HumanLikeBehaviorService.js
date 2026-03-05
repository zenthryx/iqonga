const logger = require('../utils/logger');

/**
 * Human-Like Behavior Service
 * 
 * This service implements human-like behavior patterns to reduce bot detection:
 * - Random delays between actions
 * - Time-of-day patterns
 * - Session-based behavior
 * - Activity variety
 * - Natural engagement patterns
 */
class HumanLikeBehaviorService {
  constructor() {
    this.actionHistory = [];
    this.dailyLimits = {
      posts: 20,        // Max posts per day
      replies: 30,      // Max replies per day
      likes: 50,        // Max likes per day
      retweets: 20,     // Max retweets per day
      total: 100        // Max total actions per day
    };
    this.hourlyLimits = {
      posts: 3,         // Max posts per hour
      replies: 5,       // Max replies per hour
      likes: 10,        // Max likes per hour
      retweets: 3,      // Max retweets per hour
      total: 15         // Max total actions per hour
    };
  }

  /**
   * Get human-like delay between actions
   * Humans don't act at exact intervals - add randomness
   */
  getActionDelay(baseDelay, variationPercent = 0.3) {
    const variation = baseDelay * variationPercent;
    const randomVariation = (Math.random() - 0.5) * 2 * variation;
    const delay = Math.max(baseDelay + randomVariation, baseDelay * 0.5); // Minimum 50% of base
    
    logger.info(`Human-like delay: ${Math.round(delay / 1000)}s (base: ${Math.round(baseDelay / 1000)}s)`);
    return Math.round(delay);
  }

  /**
   * Check if action can be performed based on limits and patterns
   */
  canPerformAction(actionType) {
    const now = Date.now();
    
    // Get actions in last 24 hours
    const last24h = this.actionHistory.filter(
      record => now - record.timestamp < 24 * 60 * 60 * 1000
    );
    
    // Get actions in last hour
    const last1h = this.actionHistory.filter(
      record => now - record.timestamp < 60 * 60 * 1000
    );

    // Check daily limits
    const dailyCount = last24h.filter(r => r.type === actionType).length;
    const dailyLimit = this.dailyLimits[actionType] || this.dailyLimits.total;
    if (dailyCount >= dailyLimit) {
      logger.warn(`Daily limit reached for ${actionType}: ${dailyCount}/${dailyLimit}`);
      return false;
    }

    // Check hourly limits
    const hourlyCount = last1h.filter(r => r.type === actionType).length;
    const hourlyLimit = this.hourlyLimits[actionType] || this.hourlyLimits.total;
    if (hourlyCount >= hourlyLimit) {
      logger.warn(`Hourly limit reached for ${actionType}: ${hourlyCount}/${hourlyLimit}`);
      return false;
    }

    // Check total daily limit
    if (last24h.length >= this.dailyLimits.total) {
      logger.warn(`Total daily limit reached: ${last24h.length}/${this.dailyLimits.total}`);
      return false;
    }

    // Check total hourly limit
    if (last1h.length >= this.hourlyLimits.total) {
      logger.warn(`Total hourly limit reached: ${last1h.length}/${this.hourlyLimits.total}`);
      return false;
    }

    // Check minimum cooldown since last action
    const lastAction = this.actionHistory[this.actionHistory.length - 1];
    if (lastAction) {
      const timeSinceLastAction = now - lastAction.timestamp;
      const minCooldown = this.getMinCooldown(actionType);
      
      if (timeSinceLastAction < minCooldown) {
        const remaining = Math.round((minCooldown - timeSinceLastAction) / 1000);
        logger.info(`Cooldown active for ${actionType}: ${remaining}s remaining`);
        return false;
      }
    }

    return true;
  }

  /**
   * Get minimum cooldown between actions (in milliseconds)
   */
  getMinCooldown(actionType) {
    const cooldowns = {
      post: 300000,      // 5 minutes between posts
      reply: 180000,     // 3 minutes between replies
      like: 60000,       // 1 minute between likes
      retweet: 120000,   // 2 minutes between retweets
      default: 120000    // 2 minutes default
    };

    return cooldowns[actionType] || cooldowns.default;
  }

  /**
   * Record an action
   */
  recordAction(actionType, details = {}) {
    this.actionHistory.push({
      type: actionType,
      timestamp: Date.now(),
      details: details
    });

    // Keep only last 24 hours of history
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.actionHistory = this.actionHistory.filter(record => record.timestamp > cutoff);

    logger.info(`Recorded ${actionType} action. History: ${this.actionHistory.length} actions in last 24h`);
  }

  /**
   * Get time-of-day multiplier (humans are more active during certain hours)
   */
  getTimeOfDayMultiplier() {
    const hour = new Date().getHours();
    
    // More active during business hours (9 AM - 6 PM)
    if (hour >= 9 && hour < 18) {
      return 1.0; // Normal activity
    }
    // Less active in evening (6 PM - 11 PM)
    else if (hour >= 18 && hour < 23) {
      return 0.7; // 30% reduction
    }
    // Very low activity at night (11 PM - 6 AM)
    else if (hour >= 23 || hour < 6) {
      return 0.3; // 70% reduction
    }
    // Moderate activity in morning (6 AM - 9 AM)
    else {
      return 0.8; // 20% reduction
    }
  }

  /**
   * Get weekend multiplier (humans are less active on weekends)
   */
  getWeekendMultiplier() {
    const day = new Date().getDay();
    // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) {
      return 0.6; // 40% reduction on weekends
    }
    return 1.0; // Normal activity on weekdays
  }

  /**
   * Check if should perform action based on time patterns
   */
  shouldPerformActionBasedOnTime() {
    const timeMultiplier = this.getTimeOfDayMultiplier();
    const weekendMultiplier = this.getWeekendMultiplier();
    const combinedMultiplier = timeMultiplier * weekendMultiplier;

    // Random chance based on multiplier
    const random = Math.random();
    return random < combinedMultiplier;
  }

  /**
   * Get next action time with human-like variation
   */
  getNextActionTime(baseInterval) {
    const variation = baseInterval * 0.3; // ±30% variation
    const randomVariation = (Math.random() - 0.5) * 2 * variation;
    const nextTime = baseInterval + randomVariation;
    
    return Math.max(nextTime, baseInterval * 0.5); // Minimum 50% of base
  }

  /**
   * Simulate reading activity before posting (humans read before they post)
   */
  async simulateReadingActivity() {
    // Random delay to simulate reading (30 seconds to 5 minutes)
    const readingTime = Math.floor(Math.random() * (300000 - 30000) + 30000);
    logger.info(`Simulating reading activity: ${Math.round(readingTime / 1000)}s`);
    await new Promise(resolve => setTimeout(resolve, readingTime));
  }

  /**
   * Get action statistics
   */
  getStats() {
    const now = Date.now();
    const last24h = this.actionHistory.filter(
      record => now - record.timestamp < 24 * 60 * 60 * 1000
    );
    const last1h = this.actionHistory.filter(
      record => now - record.timestamp < 60 * 60 * 1000
    );

    const stats = {
      last24h: {
        total: last24h.length,
        byType: {}
      },
      last1h: {
        total: last1h.length,
        byType: {}
      }
    };

    // Count by type
    ['post', 'reply', 'like', 'retweet'].forEach(type => {
      stats.last24h.byType[type] = last24h.filter(r => r.type === type).length;
      stats.last1h.byType[type] = last1h.filter(r => r.type === type).length;
    });

    return stats;
  }

  /**
   * Reset limits (for testing or manual override)
   */
  resetLimits() {
    this.actionHistory = [];
    logger.info('Action history reset');
  }

  /**
   * Update limits (for customization)
   */
  updateLimits(dailyLimits, hourlyLimits) {
    if (dailyLimits) {
      this.dailyLimits = { ...this.dailyLimits, ...dailyLimits };
    }
    if (hourlyLimits) {
      this.hourlyLimits = { ...this.hourlyLimits, ...hourlyLimits };
    }
    logger.info('Limits updated', { dailyLimits: this.dailyLimits, hourlyLimits: this.hourlyLimits });
  }
}

module.exports = HumanLikeBehaviorService;

