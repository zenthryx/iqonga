const GrokApiService = require('./grokApiService');

/**
 * Service for using Grok AI to analyze Twitter content and provide insights
 */
class TwitterAnalyticsGrokService {
  constructor() {
    this.grok = new GrokApiService();
  }

  /**
   * Analyze sentiment of mentions using Grok
   */
  async analyzeMentionsSentiment(mentions) {
    try {
      if (!mentions || mentions.length === 0) {
        return {
          overallSentiment: 'neutral',
          sentimentScore: 0,
          positiveCount: 0,
          negativeCount: 0,
          neutralCount: 0,
          insights: [],
        };
      }

      // Combine mention texts
      const mentionTexts = mentions
        .map((m) => m.text)
        .slice(0, 50) // Limit to avoid token limits
        .join('\n\n');

      const prompt = `Analyze the sentiment of these Twitter mentions. 
Provide:
1. Overall sentiment (positive, negative, or neutral)
2. Sentiment score (-100 to 100)
3. Count of positive, negative, and neutral mentions
4. Key insights (3-5 bullet points)

Mentions:
${mentionTexts}

Respond in JSON format:
{
  "overallSentiment": "positive|negative|neutral",
  "sentimentScore": number,
  "positiveCount": number,
  "negativeCount": number,
  "neutralCount": number,
  "insights": ["insight1", "insight2", ...]
}`;

      // Use Grok's responses method for text generation
      const response = await this.grok.client.responses({
        model: this.grok.model,
        messages: [{ role: 'user', content: prompt }],
      });
      
      const parsed = this.grok._parseResponse(response);
      const responseText = parsed.rawText || JSON.stringify(parsed);
      
      // Try to parse JSON response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('Failed to parse Grok JSON response, using fallback');
      }

      // Fallback: simple analysis
      const positiveWords = ['great', 'love', 'amazing', 'awesome', 'excellent', 'good', 'best', 'fantastic'];
      const negativeWords = ['bad', 'hate', 'terrible', 'awful', 'worst', 'disappointed', 'fail'];

      let positiveCount = 0;
      let negativeCount = 0;

      (mentionTexts || '').toLowerCase().split(/\s+/).forEach((word) => {
        if (positiveWords.some((w) => word.includes(w))) positiveCount++;
        if (negativeWords.some((w) => word.includes(w))) negativeCount++;
      });

      const total = positiveCount + negativeCount;
      const sentimentScore = total > 0 ? ((positiveCount - negativeCount) / total) * 100 : 0;

      return {
        overallSentiment: sentimentScore > 20 ? 'positive' : sentimentScore < -20 ? 'negative' : 'neutral',
        sentimentScore: Math.round(sentimentScore),
        positiveCount,
        negativeCount,
        neutralCount: mentions.length - positiveCount - negativeCount,
        insights: [
          `Analyzed ${mentions.length} mentions`,
          sentimentScore > 20 ? 'Overall positive sentiment detected' : sentimentScore < -20 ? 'Overall negative sentiment detected' : 'Mixed sentiment',
        ],
      };
    } catch (error) {
      console.error('Grok sentiment analysis failed:', error);
      throw error;
    }
  }

  /**
   * Suggest hashtags and topics based on top posts
   */
  async suggestHashtagsAndTopics(posts, mentions) {
    try {
      const postTexts = posts
        .map((p) => p.text)
        .slice(0, 20)
        .join('\n\n');

      const mentionTexts = mentions
        .map((m) => m.text)
        .slice(0, 20)
        .join('\n\n');

      const prompt = `Based on these Twitter posts and mentions, suggest:
1. 10 relevant hashtags (without # symbol)
2. 5 trending topics/keywords
3. 3 content themes

Posts:
${postTexts}

Mentions:
${mentionTexts}

Respond in JSON format:
{
  "hashtags": ["hashtag1", "hashtag2", ...],
  "topics": ["topic1", "topic2", ...],
  "themes": ["theme1", "theme2", "theme3"]
}`;

      // Use Grok's responses method for text generation
      const response = await this.grok.client.responses({
        model: this.grok.model,
        messages: [{ role: 'user', content: prompt }],
      });
      
      const parsed = this.grok._parseResponse(response);
      const responseText = parsed.rawText || JSON.stringify(parsed);

      // Try to parse JSON response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('Failed to parse Grok JSON response, using fallback');
      }

      // Fallback: extract hashtags from content
      const allText = postTexts + ' ' + mentionTexts;
      const hashtagRegex = /#(\w+)/g;
      const foundHashtags = [...new Set(allText.match(hashtagRegex)?.map((h) => h.slice(1)) || [])];

      return {
        hashtags: foundHashtags.slice(0, 10),
        topics: ['Content Strategy', 'Engagement', 'Community'],
        themes: ['Growth', 'Engagement', 'Community Building'],
      };
    } catch (error) {
      console.error('Grok hashtag suggestions failed:', error);
      throw error;
    }
  }

  /**
   * Generate content suggestions based on analytics
   */
  async generateContentSuggestions(overview, topPosts) {
    try {
      const prompt = `Based on this Twitter analytics data, provide content strategy suggestions:

Follower Count: ${overview.followerCount}
Engagement Rate: ${overview.engagementRate}%
Best Posting Hour: ${overview.bestHourLabel}
Total Impressions: ${overview.impressions}

Top Performing Posts (sample):
${topPosts.slice(0, 3).map((p) => `- ${p.text.substring(0, 100)}...`).join('\n')}

Provide 5 actionable content suggestions in JSON format:
{
  "suggestions": [
    {
      "title": "Suggestion title",
      "description": "Detailed description",
      "priority": "high|medium|low"
    }
  ]
}`;

      // Use Grok's responses method for text generation
      const response = await this.grok.client.responses({
        model: this.grok.model,
        messages: [{ role: 'user', content: prompt }],
      });
      
      const parsed = this.grok._parseResponse(response);
      const responseText = parsed.rawText || JSON.stringify(parsed);

      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('Failed to parse Grok JSON response');
      }

      // Fallback suggestions
      return {
        suggestions: [
          {
            title: 'Post during best hours',
            description: `Your best engagement time is ${overview.bestHourLabel}. Schedule more posts during this window.`,
            priority: 'high',
          },
          {
            title: 'Increase posting frequency',
            description: `You have ${overview.totalTweets} tweets analyzed. Consider posting more regularly to increase impressions.`,
            priority: 'medium',
          },
          {
            title: 'Engage with top-performing content',
            description: 'Analyze your top posts to identify patterns and replicate successful content types.',
            priority: 'high',
          },
        ],
      };
    } catch (error) {
      console.error('Grok content suggestions failed:', error);
      throw error;
    }
  }
}

module.exports = TwitterAnalyticsGrokService;

