const cron = require('node-cron');
const GrokApiService = require('./grokApiService');
const KeywordSentimentAnalyzer = require('./keywordSentimentAnalyzer');
const AlertManager = require('./alertManager');
const logger = require('../utils/logger');
const KeywordRepository = require('./keywordRepository');
const ServicePricingService = require('./ServicePricingService');
const CreditService = require('./CreditService');
const PostQueueService = require('./PostQueueService');
const database = require('../database/connection');

class KeywordMonitoringScheduler {
  constructor(options = {}) {
    this.grok = new GrokApiService(options.grok);
    this.analyzer = new KeywordSentimentAnalyzer();
    this.alerts = new AlertManager();
    this.interval = options.cron || process.env.KEYWORD_MONITOR_CRON || '*/15 * * * *';
    this.pricing = ServicePricingService;
    this.creditService = new CreditService();
    this.wsServer = null; // Will be set when WebSocket server is initialized
  }

  /**
   * Set WebSocket server instance (called from server.js)
   */
  setWebSocketServer(wsServer) {
    this.wsServer = wsServer;
  }

  start() {
    cron.schedule(this.interval, async () => {
      logger.info('[Keyword Monitor] Scheduled run started');
      await this.runOnce();
    });
    logger.info(`[Keyword Monitor] Scheduler started with interval ${this.interval}`);
  }

  async runOnce() {
    const monitors = await this._getActiveMonitors();
    logger.info(`[Keyword Monitor] Processing ${monitors.length} active monitors`);
    for (const monitor of monitors) {
      await this._processMonitor(monitor);
    }
  }

  async _processMonitor(monitor) {
    try {
      // Build search query based on monitor type
      let searchQuery = monitor.keyword;
      if (monitor.monitor_type === 'hashtag') {
        // Ensure hashtag has # prefix
        searchQuery = monitor.keyword.startsWith('#') ? monitor.keyword : `#${monitor.keyword}`;
      }

      // Add exclude keywords if any
      if (monitor.exclude_keywords && monitor.exclude_keywords.length > 0) {
        const excludeQuery = monitor.exclude_keywords.map(k => `-${k}`).join(' ');
        searchQuery = `${searchQuery} ${excludeQuery}`;
      }

      // Search X/Twitter via Grok
      const grokResults = await this.grok.searchX({
        query: searchQuery,
        allowedXHandles: monitor.influencer_handles || [],
      });

      // Track API usage
      const operationType = monitor.monitor_type === 'hashtag' 
        ? 'hashtag_x_search' 
        : 'keyword_x_search';
      await this._trackApiUsage(monitor.user_id, operationType, monitor.id, monitor.keyword);

      // Analyze sentiment
      const currentSentiment = await this.analyzer.analyzeSentiment(
        monitor.keyword,
        grokResults,
      );

      // Save snapshot
      const snapshot = await this._saveSentimentSnapshot(monitor.id, currentSentiment, grokResults);

      // Push snapshot update via WebSocket
      this._pushSnapshotUpdate(monitor.user_id, monitor.id, snapshot);

      // Get historical data for comparison
      const historical = await this._getHistoricalSnapshots(monitor.id);
      const comparison = await this.analyzer.compareSentiment(currentSentiment, historical);

      // Check if alerts should be triggered
      const shouldAlert = comparison.shouldAlert || await this._shouldTriggerAlert(monitor, currentSentiment, comparison);
      if (shouldAlert) {
        const triggeredAlerts = await this.alerts.checkAndTriggerAlerts(
          {
            monitorId: monitor.id,
            userId: monitor.user_id,
            keyword: monitor.keyword,
            sentimentThreshold: monitor.sentiment_threshold,
            mentionSpikeThreshold: monitor.mention_spike_threshold,
            channels: monitor.post_channels || [],
          },
          currentSentiment,
          comparison,
        );

        // Push alerts via WebSocket
        if (triggeredAlerts && Array.isArray(triggeredAlerts)) {
          triggeredAlerts.forEach(alert => {
            this._pushAlertUpdate(monitor.user_id, alert);
          });
        }

        // Auto-post if enabled
        if (monitor.auto_post_enabled) {
          await this._autoPost(monitor, currentSentiment);
        }
      }

      // Track sentiment analysis usage
      await this._trackApiUsage(monitor.user_id, 'keyword_sentiment_analysis', monitor.id, monitor.keyword);

    } catch (err) {
      logger.error(`[Keyword Monitor] ${monitor.keyword} error: ${err.message}`, err);
    }
  }

  async _shouldTriggerAlert(monitor, currentSentiment, comparison) {
    // Check mention spike - need to get historical data
    const historical = await this._getHistoricalSnapshots(monitor.id);
    if (historical && historical.length > 0) {
      const recentAvg = historical.slice(0, 3).reduce((sum, snap) => 
        sum + (parseInt(snap.mention_count) || 0), 0) / Math.min(3, historical.length);
      const currentMentions = currentSentiment.mentionCount || 0;
      const spikePercent = recentAvg > 0 
        ? ((currentMentions - recentAvg) / recentAvg) * 100 
        : 0;
      
      if (spikePercent >= monitor.mention_spike_threshold) {
        return true;
      }
    }

    // Check sentiment threshold
    if (Math.abs(comparison.changePercent) >= monitor.sentiment_threshold) {
      return true;
    }

    return false;
  }

  async _getActiveMonitors() {
    return KeywordRepository.getActiveMonitors();
  }

  async _saveSentimentSnapshot(monitorId, sentiment, grokResults) {
    const snapshotData = {
      keyword: sentiment.keyword,
      sentiment_score: sentiment.score,
      mention_count: sentiment.mentionCount,
      positive_count: sentiment.positiveMentions,
      negative_count: sentiment.negativeMentions,
      neutral_count: sentiment.neutralMentions,
      total_likes: sentiment.engagementMetrics?.total_likes || 0,
      total_retweets: sentiment.engagementMetrics?.total_retweets || 0,
      total_replies: sentiment.engagementMetrics?.total_replies || 0,
      total_views: sentiment.engagementMetrics?.total_views || 0,
      engagement_rate: sentiment.engagementMetrics?.engagement_rate || 0.00,
      trending_phrases: sentiment.trendingPhrases || [],
      related_keywords: sentiment.relatedKeywords || [],
      influencer_mentions: sentiment.influencerActivity?.count || 0,
      top_influencer_sentiment: sentiment.influencerActivity?.sentiment || 'neutral',
      top_influencers: sentiment.influencerActivity?.topInfluencers || [],
      sample_posts: grokResults?.citations?.slice(0, 10) || [],
      raw_data: grokResults || {},
    };

    return KeywordRepository.insertSnapshot(monitorId, snapshotData);
  }

  async _getHistoricalSnapshots(monitorId) {
    return KeywordRepository.getRecentSnapshots(monitorId, 10);
  }

  async _trackApiUsage(userId, operation, monitorId = null, keyword = null) {
    try {
      const cost = await this.pricing.getPricing(operation);
      if (cost > 0) {
        await this.creditService.deductCredits(userId, operation, cost);
      }

      await KeywordRepository.insertUsage(userId, {
        operation_type: operation,
        credits_deducted: cost,
        monitor_id: monitorId,
        keyword: keyword,
      });
    } catch (err) {
      logger.error(`[Keyword Monitor] Error tracking usage: ${err.message}`);
    }
  }

  async _autoPost(monitor, sentiment) {
    try {
      // Get default agent for user
      const agentId = await this._getDefaultAgentId(monitor.user_id);
      if (!agentId) {
        logger.warn(`Auto-post skipped: no agent found for user ${monitor.user_id}`);
        return;
      }

      // Generate content based on keyword and sentiment
      const contentGenerator = require('./keywordContentGenerator');
      const text = await contentGenerator.generateTextPost(
        monitor.keyword,
        sentiment,
        monitor.content_style || 'professional',
      );

      // Queue posts for each channel
      for (const channel of monitor.post_channels || []) {
        await PostQueueService.queuePost(
          monitor.user_id,
          agentId,
          text,
          'tweet',
          channel,
        );
      }

      await this._trackApiUsage(monitor.user_id, 'keyword_auto_post', monitor.id, monitor.keyword);
    } catch (err) {
      logger.warn(`Auto-post failed: ${err.message}`);
    }
  }

  async _getDefaultAgentId(userId) {
    const result = await database.query(
      `SELECT id FROM ai_agents WHERE user_id = $1 AND is_active = TRUE LIMIT 1`,
      [userId],
    );
    return result.rows[0]?.id || null;
  }

  /**
   * Push snapshot update via WebSocket
   */
  _pushSnapshotUpdate(userId, monitorId, snapshot) {
    if (this.wsServer) {
      try {
        this.wsServer.pushSnapshot(userId, monitorId, snapshot);
      } catch (error) {
        logger.warn(`[Keyword Monitor] Failed to push snapshot update: ${error.message}`);
      }
    }
  }

  /**
   * Push alert update via WebSocket
   */
  _pushAlertUpdate(userId, alert) {
    if (this.wsServer) {
      try {
        this.wsServer.pushAlert(userId, alert);
      } catch (error) {
        logger.warn(`[Keyword Monitor] Failed to push alert update: ${error.message}`);
      }
    }
  }
}

module.exports = KeywordMonitoringScheduler;

