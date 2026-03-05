class SentimentAnalyzer {
  constructor() {
    this.BULLISH_PHRASES = [
      'floor is in',
      'to the moon',
      'breaking out',
      'whale buy',
      'accumulating',
      'bullish',
      'partnership',
      'listing',
    ];

    this.BEARISH_PHRASES = [
      'whale dump',
      'massive unlock',
      'rug pull',
      'exit scam',
      'dead cat bounce',
      'bearish',
      'dumping',
      'panic selling',
    ];
  }

  async analyzeSentiment(tokenSymbol, grokResults) {
    const rawText = grokResults?.rawText || '';
    const citations = grokResults?.citations || [];

    const bullishCount = this._countPhrases(rawText, this.BULLISH_PHRASES);
    const bearishCount = this._countPhrases(rawText, this.BEARISH_PHRASES);

    const totalSignals = bullishCount + bearishCount;
    const score =
      totalSignals === 0 ? 0 : ((bullishCount - bearishCount) / totalSignals) * 100;

    let category = 'neutral';
    if (score > 20) category = 'bullish';
    else if (score < -20) category = 'bearish';

    const keyPhrases = this._detectKeyPhrases(rawText);
    const influencerActivity = this._analyzeInfluencerActivity(citations);

    return {
      token: tokenSymbol,
      score: Math.round(score * 100) / 100,
      category,
      confidence: totalSignals > 5 ? 0.8 : 0.5,
      mentionCount: citations.length,
      positiveMentions: bullishCount,
      negativeMentions: bearishCount,
      neutralMentions: Math.max(0, citations.length - bullishCount - bearishCount),
      keyPhrases,
      influencerActivity,
    };
  }

  async compareSentiment(currentSentiment, historicalSnapshots) {
    if (!historicalSnapshots || historicalSnapshots.length === 0) {
      return { changePercent: 0, trend: 'stable', shouldAlert: false };
    }

    const recentSnapshots = historicalSnapshots.slice(0, 5);
    const avgHistoricalScore =
      recentSnapshots.reduce((sum, snap) => sum + (snap.sentiment_score || 0), 0) /
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
      const matches = lower.match(new RegExp(phrase, 'gi'));
      return count + (matches?.length || 0);
    }, 0);
  }

  _detectKeyPhrases(text) {
    const allPhrases = [...this.BULLISH_PHRASES, ...this.BEARISH_PHRASES];
    const lower = (text || '').toLowerCase();
    return allPhrases.filter((phrase) => lower.includes(phrase));
  }

  _analyzeInfluencerActivity(citations) {
    const influencerCitations =
      citations?.filter((c) => c.source?.includes('verified') || c.engagement > 1000) ||
      [];
    return {
      count: influencerCitations.length,
      sentiment: influencerCitations.length > 3 ? 'bullish' : 'neutral',
    };
  }
}

module.exports = SentimentAnalyzer;

