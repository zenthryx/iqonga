const logger = require('../utils/logger');
const AIContentService = require('./AIContentService');

class CryptoContentGenerator {
  constructor() {
    // AIContentService is exported as a singleton instance, not a class
    this.aiContentService = AIContentService;
  }

  async generateTextPost(tokenSymbol, sentiment, style = 'professional') {
    const prompt = this._buildPrompt(tokenSymbol, sentiment, style);
    try {
      const content = await this.aiContentService.generateWithOpenAI(prompt, {
        max_tokens: 180,
        temperature: 0.7,
      });
      return content?.trim() || prompt;
    } catch (err) {
      logger.warn(`AI content generation failed, using fallback: ${err.message}`);
      return this._fallbackText(tokenSymbol, sentiment);
    }
  }

  _fallbackText(tokenSymbol, sentiment) {
    return `${tokenSymbol} sentiment: ${sentiment.category} (${sentiment.score}/100). Mentions: ${
      sentiment.mentionCount || 0
    }. Key: ${(sentiment.keyPhrases || []).slice(0, 3).join(', ')}`;
  }

  _buildPrompt(token, sentiment, style) {
    const styleGuides = {
      professional: 'Write a professional market analysis post',
      casual: 'Write a casual, engaging social media post',
      technical: 'Write a technical analysis post with data',
    };

    const sentimentContext =
      sentiment.category === 'bullish'
        ? 'positive momentum and bullish sentiment'
        : sentiment.category === 'bearish'
        ? 'bearish pressure and negative sentiment'
        : 'neutral market conditions';

    return `${styleGuides[style] || styleGuides.professional} about ${token} showing ${sentimentContext}.
Sentiment score: ${sentiment.score}/100.
Key phrases: ${(sentiment.keyPhrases || []).join(', ')}.
Mention count: ${sentiment.mentionCount || 0}.
Keep it under 280 characters.`;
  }
}

module.exports = CryptoContentGenerator;

