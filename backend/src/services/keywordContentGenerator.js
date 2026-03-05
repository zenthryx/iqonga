const logger = require('../utils/logger');
const AIContentService = require('./AIContentService');

class KeywordContentGenerator {
  constructor() {
    this.aiContentService = new AIContentService();
  }

  async generateTextPost(keyword, sentiment, style = 'professional') {
    const prompt = this._buildPrompt(keyword, sentiment, style);
    try {
      const content = await this.aiContentService.generateWithOpenAI(prompt, {
        max_tokens: 180,
        temperature: 0.7,
      });
      return content?.trim() || prompt;
    } catch (err) {
      logger.warn(`AI content generation failed, using fallback: ${err.message}`);
      return this._fallbackText(keyword, sentiment);
    }
  }

  _fallbackText(keyword, sentiment) {
    const category = sentiment.category || 'neutral';
    const score = sentiment.score || 0;
    const mentions = sentiment.mentionCount || 0;
    
    return `${keyword} sentiment: ${category} (${score}/100). Mentions: ${mentions}. Key phrases: ${(sentiment.trendingPhrases || []).slice(0, 3).join(', ')}`;
  }

  _buildPrompt(keyword, sentiment, style) {
    const styleGuides = {
      professional: 'Write a professional social media post',
      casual: 'Write a casual, engaging social media post',
      technical: 'Write a technical analysis post with data',
      creative: 'Write a creative and engaging social media post',
    };

    const sentimentContext =
      sentiment.category === 'positive'
        ? 'positive sentiment and growing interest'
        : sentiment.category === 'negative'
        ? 'negative sentiment and concerns'
        : 'neutral sentiment and steady discussion';

    const mentionContext = sentiment.mentionCount > 100
      ? 'high volume of mentions'
      : sentiment.mentionCount > 50
      ? 'moderate volume of mentions'
      : 'growing discussion';

    return `${styleGuides[style] || styleGuides.professional} about ${keyword} showing ${sentimentContext}.
Sentiment score: ${sentiment.score}/100.
Mention count: ${sentiment.mentionCount || 0} (${mentionContext}).
Key phrases: ${(sentiment.trendingPhrases || []).slice(0, 5).join(', ')}.
Keep it under 280 characters for Twitter. Make it engaging and authentic.`;
  }
}

module.exports = KeywordContentGenerator;

