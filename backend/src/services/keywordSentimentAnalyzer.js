class KeywordSentimentAnalyzer {
  constructor() {
    // Positive sentiment phrases (general, not crypto-specific)
    this.POSITIVE_PHRASES = [
      'amazing', 'awesome', 'great', 'excellent', 'fantastic', 'love', 'best', 'perfect',
      'brilliant', 'outstanding', 'incredible', 'wonderful', 'impressive', 'recommend',
      'highly recommend', 'must try', 'game changer', 'breakthrough', 'innovative',
      'trending', 'viral', 'popular', 'hot', 'rising', 'growing', 'success',
      'winning', 'leading', 'top', 'premium', 'quality', 'expert', 'professional'
    ];

    // Negative sentiment phrases
    this.NEGATIVE_PHRASES = [
      'terrible', 'awful', 'horrible', 'worst', 'bad', 'disappointing', 'fail',
      'scam', 'fraud', 'waste', 'poor', 'cheap', 'low quality', 'broken',
      'doesn\'t work', 'not working', 'buggy', 'slow', 'crashed', 'error',
      'complaint', 'refund', 'cancel', 'avoid', 'warning', 'problem', 'issue',
      'outdated', 'obsolete', 'declining', 'falling', 'dropping', 'concern'
    ];
  }

  async analyzeSentiment(keyword, grokResults) {
    const rawText = grokResults?.rawText || '';
    const citations = grokResults?.citations || [];

    const positiveCount = this._countPhrases(rawText, this.POSITIVE_PHRASES);
    const negativeCount = this._countPhrases(rawText, this.NEGATIVE_PHRASES);

    const totalSignals = positiveCount + negativeCount;
    const score =
      totalSignals === 0 ? 0 : ((positiveCount - negativeCount) / totalSignals) * 100;

    let category = 'neutral';
    if (score > 20) category = 'positive';
    else if (score < -20) category = 'negative';

    const keyPhrases = this._detectKeyPhrases(rawText);
    const trendingPhrases = this._extractTrendingPhrases(rawText, citations);
    const relatedKeywords = this._extractRelatedKeywords(rawText, keyword);
    const influencerActivity = this._analyzeInfluencerActivity(citations);

    // Calculate engagement metrics from citations
    const engagementMetrics = this._calculateEngagementMetrics(citations);

    return {
      keyword,
      score: Math.round(score * 100) / 100,
      category,
      confidence: totalSignals > 5 ? 0.8 : 0.5,
      mentionCount: citations.length,
      positiveMentions: positiveCount,
      negativeMentions: negativeCount,
      neutralMentions: Math.max(0, citations.length - positiveCount - negativeCount),
      trendingPhrases,
      relatedKeywords,
      influencerActivity,
      engagementMetrics,
    };
  }

  async compareSentiment(currentSentiment, historicalSnapshots) {
    if (!historicalSnapshots || historicalSnapshots.length === 0) {
      return { changePercent: 0, trend: 'stable', shouldAlert: false };
    }

    const recentSnapshots = historicalSnapshots.slice(0, 5);
    const avgHistoricalScore =
      recentSnapshots.reduce((sum, snap) => sum + (parseFloat(snap.sentiment_score) || 0), 0) /
      recentSnapshots.length;

    const changePercent =
      ((currentSentiment.score - avgHistoricalScore) / Math.abs(avgHistoricalScore || 1)) *
      100;

    let trend = 'stable';
    if (changePercent > 10) trend = 'rising';
    else if (changePercent < -10) trend = 'falling';

    return { changePercent, trend, shouldAlert: Math.abs(changePercent) > 20 };
  }

  _countPhrases(text, phrases) {
    const lower = (text || '').toLowerCase();
    return phrases.reduce((count, phrase) => {
      const matches = lower.match(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
      return count + (matches?.length || 0);
    }, 0);
  }

  _detectKeyPhrases(text) {
    const allPhrases = [...this.POSITIVE_PHRASES, ...this.NEGATIVE_PHRASES];
    const lower = (text || '').toLowerCase();
    return allPhrases.filter((phrase) => lower.includes(phrase));
  }

  _extractTrendingPhrases(text, citations) {
    // Extract common phrases from citations
    const phrases = [];
    if (citations && citations.length > 0) {
      citations.slice(0, 10).forEach((citation) => {
        if (citation.text) {
          const words = citation.text.toLowerCase().split(/\s+/);
          // Extract 2-3 word phrases
          for (let i = 0; i < words.length - 1; i++) {
            const phrase = `${words[i]} ${words[i + 1]}`;
            if (phrase.length > 5 && !phrases.includes(phrase)) {
              phrases.push(phrase);
            }
          }
        }
      });
    }
    return phrases.slice(0, 10); // Return top 10 trending phrases
  }

  _extractRelatedKeywords(text, originalKeyword) {
    // Simple extraction - in production, could use AI to find semantically related keywords
    const keywords = [];
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    
    words.forEach((word) => {
      if (word.length > 3 && !stopWords.includes(word) && word !== originalKeyword.toLowerCase()) {
        if (!keywords.includes(word)) {
          keywords.push(word);
        }
      }
    });
    
    return keywords.slice(0, 10); // Return top 10 related keywords
  }

  _analyzeInfluencerActivity(citations) {
    const influencerCitations =
      citations?.filter((c) => {
        // Consider verified accounts or high engagement as influencers
        return (c.source?.includes('verified') || c.engagement > 1000 || c.followers > 10000) || false;
      }) || [];
    
    // Determine overall influencer sentiment
    let sentiment = 'neutral';
    if (influencerCitations.length > 3) {
      // Could analyze influencer citation content for sentiment
      sentiment = 'positive'; // Default to positive if many influencers mention
    }
    
    return {
      count: influencerCitations.length,
      sentiment,
      topInfluencers: influencerCitations.slice(0, 5).map(c => ({
        handle: c.source || c.handle,
        engagement: c.engagement || 0,
        followers: c.followers || 0
      }))
    };
  }

  _calculateEngagementMetrics(citations) {
    if (!citations || citations.length === 0) {
      return {
        total_likes: 0,
        total_retweets: 0,
        total_replies: 0,
        total_views: 0,
        engagement_rate: 0.00
      };
    }

    const metrics = citations.reduce((acc, citation) => {
      acc.total_likes += citation.likes || 0;
      acc.total_retweets += citation.retweets || 0;
      acc.total_replies += citation.replies || 0;
      acc.total_views += citation.views || 0;
      return acc;
    }, {
      total_likes: 0,
      total_retweets: 0,
      total_replies: 0,
      total_views: 0
    });

    // Calculate engagement rate (likes + retweets + replies) / views
    const totalEngagement = metrics.total_likes + metrics.total_retweets + metrics.total_replies;
    metrics.engagement_rate = metrics.total_views > 0 
      ? (totalEngagement / metrics.total_views) * 100 
      : 0.00;

    return {
      ...metrics,
      engagement_rate: Math.round(metrics.engagement_rate * 100) / 100
    };
  }
}

module.exports = KeywordSentimentAnalyzer;

