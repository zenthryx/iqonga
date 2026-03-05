const logger = require('../utils/logger');
const CryptoRepository = require('./cryptoRepository');
const KeywordRepository = require('./keywordRepository');

// Try to load NotificationService if it exists, otherwise make it optional
let NotificationService = null;
try {
  NotificationService = require('./notificationService');
} catch (e) {
  logger.warn('NotificationService not found, notifications will be skipped');
}

class AlertManager {
  constructor() {
    this.notificationService = NotificationService ? new NotificationService() : null;
  }

  async checkAndTriggerAlerts(config, currentSentiment, sentimentComparison) {
    const alerts = [];
    const isKeyword = config.keyword !== undefined; // Check if this is a keyword alert
    const identifier = isKeyword ? config.keyword : config.tokenSymbol;

    if (Math.abs(sentimentComparison.changePercent) > config.sentimentThreshold) {
      alerts.push({
        type: 'sentiment_spike',
        severity: this._calculateSeverity(sentimentComparison.changePercent),
        title: `${identifier}: ${sentimentComparison.trend.toUpperCase()} Sentiment`,
        message: `Sentiment changed by ${sentimentComparison.changePercent.toFixed(
          1,
        )}% in the last window.`,
        data: {
          [isKeyword ? 'keyword' : 'token']: identifier,
          currentScore: currentSentiment.score,
          changePercent: sentimentComparison.changePercent,
          keyPhrases: currentSentiment.keyPhrases || currentSentiment.trendingPhrases || [],
        },
      });
    }

    if (currentSentiment.mentionCount > config.mentionSpikeThreshold) {
      alerts.push({
        type: 'mention_surge',
        severity: 'medium',
        title: `${identifier}: High Activity Detected`,
        message: `${currentSentiment.mentionCount} mentions vs threshold ${config.mentionSpikeThreshold}.`,
        data: {
          [isKeyword ? 'keyword' : 'token']: identifier,
          mentionCount: currentSentiment.mentionCount
        },
      });
    }

    if (currentSentiment.influencerActivity?.count > 3) {
      alerts.push({
        type: 'influencer_activity',
        severity: 'high',
        title: `${identifier}: Influencer Attention`,
        message: `${currentSentiment.influencerActivity.count} verified/high-engagement accounts discussing.`,
        data: {
          [isKeyword ? 'keyword' : 'token']: identifier,
          ...currentSentiment.influencerActivity
        },
      });
    }

    const persistedAlerts = [];
    for (const alert of alerts) {
      const persistedAlert = await this._persistAlert(config.userId, config.monitorId, alert, isKeyword);
      if (persistedAlert) {
        persistedAlerts.push(persistedAlert);
      }
      await this._sendNotifications(config.userId, alert, config.channels || []);
    }
    
    return persistedAlerts; // Return alerts for WebSocket push
  }

  _calculateSeverity(changePercent) {
    const absChange = Math.abs(changePercent);
    if (absChange > 50) return 'critical';
    if (absChange > 30) return 'high';
    if (absChange > 15) return 'medium';
    return 'low';
  }

  async _persistAlert(userId, monitorId, alert, isKeyword = false) {
    try {
      if (isKeyword) {
        // Use keyword repository for keyword alerts
        const alertData = {
          monitor_id: monitorId,
          user_id: userId,
          alert_type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          data: alert.data,
          previous_value: alert.data?.previousValue || null,
          current_value: alert.data?.currentScore || null,
          change_percent: alert.data?.changePercent || null,
          channels_sent: [],
        };
        const insertedAlert = await KeywordRepository.insertAlert(alertData);
        return insertedAlert; // Return the persisted alert
      } else {
        // Use crypto repository for crypto alerts
        const insertedAlert = await CryptoRepository.insertAlert(userId, monitorId, alert);
        return insertedAlert;
      }
    } catch (err) {
      logger.error(`Failed to persist alert: ${err.message}`);
      return null;
    }
  }

  async _sendNotifications(userId, alert, channels) {
    if (!this.notificationService || !channels?.length) {
      return;
    }

    for (const channel of channels) {
      try {
        await this.notificationService.send(userId, channel, {
          title: alert.title,
          message: alert.message,
          data: alert.data,
        });
      } catch (err) {
        logger.warn(`Notification send failed for channel=${channel}: ${err.message}`);
      }
    }
  }
}

module.exports = AlertManager;

