const cron = require('node-cron');
const GrokApiService = require('./grokApiService');
const SentimentAnalyzer = require('./sentimentAnalyzer');
const AlertManager = require('./alertManager');
const logger = require('../utils/logger');
const CryptoRepository = require('./cryptoRepository');
const ServicePricingService = require('./ServicePricingService');
const CreditService = require('./CreditService');
const PostQueueService = require('./PostQueueService');
const CryptoContentGenerator = require('./cryptoContentGenerator');
const database = require('../database/connection');

class CryptoMonitoringScheduler {
  constructor(options = {}) {
    this.grok = new GrokApiService(options.grok);
    this.analyzer = new SentimentAnalyzer();
    this.alerts = new AlertManager();
    this.interval = options.cron || process.env.CRYPTO_MONITOR_CRON || '*/15 * * * *';
    this.pricing = ServicePricingService; // Already a singleton instance
    this.creditService = new CreditService();
    this.contentGenerator = new CryptoContentGenerator();
  }

  start() {
    cron.schedule(this.interval, async () => {
      logger.info('[Crypto Monitor] Scheduled run started');
      await this.runOnce();
    });
    logger.info(`[Crypto Monitor] Scheduler started with interval ${this.interval}`);
  }

  async runOnce() {
    const monitors = await this._getActiveMonitors();
    for (const monitor of monitors) {
      await this._processMonitor(monitor);
    }
  }

  async _processMonitor(monitor) {
    try {
      logger.info(`[Crypto Monitor] Processing monitor for ${monitor.token_symbol} (ID: ${monitor.id})`);
      
      // Check if Grok API is configured
      if (!this.grok || !process.env.XAI_API_KEY) {
        logger.warn(`[Crypto Monitor] Grok API not configured. Skipping ${monitor.token_symbol}. Please set XAI_API_KEY.`);
        return;
      }

      const grokResults = await this.grok.searchX({
        query: `${monitor.token_symbol} crypto`,
        allowedXHandles: monitor.influencer_handles,
      });

      if (!grokResults || (Array.isArray(grokResults) && grokResults.length === 0)) {
        logger.warn(`[Crypto Monitor] No results from Grok API for ${monitor.token_symbol}. This may be normal if the token is not being discussed.`);
        // Still create a snapshot with zero data rather than failing
        const emptySentiment = {
          token: monitor.token_symbol,
          score: 0,
          mentionCount: 0,
          positiveMentions: 0,
          negativeMentions: 0,
          neutralMentions: 0,
          keyPhrases: [],
        };
        await this._saveSentimentSnapshot(monitor.id, emptySentiment);
        return;
      }

      await this._trackApiUsage(monitor.user_id, 'crypto_x_search');

      const currentSentiment = await this.analyzer.analyzeSentiment(
        monitor.token_symbol,
        grokResults,
      );

      logger.info(`[Crypto Monitor] ${monitor.token_symbol} sentiment: ${currentSentiment.score}, mentions: ${currentSentiment.mentionCount}`);

      await this._saveSentimentSnapshot(monitor.id, currentSentiment);
      logger.info(`[Crypto Monitor] Saved snapshot for ${monitor.token_symbol}`);
      
      const historical = await this._getHistoricalSnapshots(monitor.id);
      const comparison = await this.analyzer.compareSentiment(currentSentiment, historical);

      if (comparison.shouldAlert) {
        logger.info(`[Crypto Monitor] Alert triggered for ${monitor.token_symbol}`);
        await this.alerts.checkAndTriggerAlerts(
          {
            monitorId: monitor.id,
            userId: monitor.user_id,
            tokenSymbol: monitor.token_symbol,
            sentimentThreshold: monitor.sentiment_threshold,
            mentionSpikeThreshold: monitor.mention_spike_threshold,
            channels: monitor.post_channels,
          },
          currentSentiment,
          comparison,
        );

        if (monitor.auto_post_enabled) {
          await this._autoPost(monitor, currentSentiment);
        }
      }

      await this._trackApiUsage(monitor.user_id, 'crypto_sentiment_analysis');
    } catch (err) {
      logger.error(`[Crypto Monitor] ${monitor.token_symbol} error: ${err.message}`, {
        error: err.message,
        stack: err.stack,
        code: err.code,
        status: err.status
      });
      
      // If it's a Grok API 403 error, log it specifically
      if (err.code === 403 || err.status === 403 || err.message?.includes('Forbidden')) {
        logger.error(`[Crypto Monitor] Grok API access forbidden. Please check XAI_API_KEY configuration.`);
      }
    }
  }

  async _getActiveMonitors() {
    return CryptoRepository.getActiveMonitors();
  }

  async _saveSentimentSnapshot(_monitorId, _sentiment) {
    return CryptoRepository.insertSnapshot(_monitorId, _sentiment);
  }

  async _getHistoricalSnapshots(_monitorId) {
    return CryptoRepository.getRecentSnapshots(_monitorId, 10);
  }

  async _trackApiUsage(userId, operation) {
    try {
      const cost = await this.pricing.getPricing(operation);
      if (cost > 0) {
        await this.creditService.deductCredits(userId, operation, cost);
      }

      await CryptoRepository.insertUsage(userId, {
        operation_type: operation,
        credits_deducted: cost,
        grok_model: this.grok.model,
      });
    } catch (err) {
      logger.warn(`trackApiUsage failed: ${err.message}`);
    }
  }

  async _autoPost(monitor, sentiment) {
    try {
      const agentId = await this._getDefaultAgentId(monitor.user_id);
      if (!agentId) {
        logger.warn(`Auto-post skipped: no agent found for user ${monitor.user_id}`);
        return;
      }

      const text = await this.contentGenerator.generateTextPost(
        monitor.token_symbol,
        sentiment,
        monitor.content_style,
      );

      await PostQueueService.queuePost(
        monitor.user_id,
        agentId,
        text,
        'tweet',
        'twitter',
      );

      await this._trackApiUsage(monitor.user_id, 'crypto_auto_post');
    } catch (err) {
      logger.warn(`Auto-post failed: ${err.message}`);
    }
  }

  async _getDefaultAgentId(userId) {
    const result = await database.query(
      `SELECT id FROM ai_agents WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    return result.rows[0]?.id || null;
  }
}

module.exports = CryptoMonitoringScheduler;

