import OpenAI from 'openai';
import { TweetData } from './TwitterService';

export interface PersonalityConfig {
  name: string;
  personalityType: 'witty_troll' | 'tech_sage' | 'hype_beast' | 'honest_critic' | 'quirky_observer';
  voiceTone: string;
  humorStyle: string;
  intelligenceLevel: string;
  controversyComfort: number; // 0-100
  targetTopics: string[];
  avoidTopics: string[];
  behavioralGuidelines: string[];
  platforms: string[];
}

export interface ContentContext {
  type: 'original_post' | 'reply' | 'thread' | 'conversation_reply';
  platform: string;
  trends?: string[];
  originalTweet?: TweetData;
  conversationContext?: {
    previousReplies: TweetData[];
    conversationTone: 'friendly' | 'debate' | 'casual' | 'professional';
    userSentiment: 'positive' | 'neutral' | 'negative';
  };
  timeOfDay?: string;
  recentPerformance?: {
    avgEngagement: number;
    successfulPatterns: string[];
  };
}

export interface EngagementDecision {
  shouldEngage: boolean;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggestedResponse?: string;
}

export class PersonalityAgent {
  private openai: OpenAI;
  private personality: PersonalityConfig;
  private safetyFilter: ContentSafetyFilter;

  constructor(personality: PersonalityConfig) {
    this.personality = personality;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.safetyFilter = new ContentSafetyFilter(personality);
  }

  // Main content generation method
  async generateContent(context: ContentContext): Promise<string> {
    const personalityPrompt = this.buildPersonalityPrompt(context);
    
    if (context.type === 'original_post') {
      return await this.generateOriginalPost(personalityPrompt, context);
    } else if (context.type === 'reply') {
      return await this.generateReply(personalityPrompt, context);
    } else if (context.type === 'conversation_reply') {
      return await this.generateConversationReply(personalityPrompt, context);
    } else {
      return await this.generateThread(personalityPrompt, context);
    }
  }

  // Determine if agent should engage with a tweet
  async shouldEngageWithTweet(tweet: TweetData, agentConfig: any): Promise<EngagementDecision> {
    try {
      // Check if tweet is from a verified user or has high engagement
      const isHighValue = tweet.author.verified || 
                         (tweet.public_metrics?.like_count || 0) > 100;
      
      // Check topic relevance
      const relevanceScore = this.calculateTopicRelevance(tweet.text, agentConfig.target_topics);
      
      // Check engagement threshold
      const engagementThreshold = agentConfig.min_engagement_threshold || 50;
      const meetsEngagementThreshold = (tweet.public_metrics?.like_count || 0) >= engagementThreshold;
      
      // Check if we've already replied recently (this would need database integration)
      const hasRepliedRecently = false; // TODO: Implement database check
      
      // Calculate priority score
      let priority: 'high' | 'medium' | 'low' = 'low';
      let reason = '';
      
      if (relevanceScore > 0.8 && isHighValue && meetsEngagementThreshold) {
        priority = 'high';
        reason = 'High relevance, verified user, good engagement';
      } else if (relevanceScore > 0.6 && meetsEngagementThreshold) {
        priority = 'medium';
        reason = 'Good relevance and engagement';
      } else if (relevanceScore > 0.4 && isHighValue) {
        priority = 'medium';
        reason = 'Verified user with moderate relevance';
      } else {
        reason = 'Low relevance or engagement';
      }

      const shouldEngage = relevanceScore > 0.4 && meetsEngagementThreshold && !hasRepliedRecently;

      return {
        shouldEngage,
        reason,
        priority,
        suggestedResponse: shouldEngage ? await this.generateQuickResponse(tweet, agentConfig) : undefined
      };
    } catch (error) {
      console.error('Error in engagement decision:', error);
      return {
        shouldEngage: false,
        reason: 'Error processing tweet',
        priority: 'low'
      };
    }
  }

  // Generate quick response for engagement decision
  private async generateQuickResponse(tweet: TweetData, agentConfig: any): Promise<string> {
    try {
      const prompt = `
You are ${this.personality.name}, a ${this.personality.personalityType} AI agent.

QUICK RESPONSE GENERATION:
- Tweet: "${tweet.text}"
- Author: @${tweet.author.username}
- Your expertise: ${agentConfig.target_topics.join(', ')}

Generate a brief, engaging response (under 100 characters) that:
1. Acknowledges the tweet
2. Shows your personality
3. Encourages further conversation
4. Stays relevant to your expertise

Keep it short and impactful.
`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50,
        temperature: 0.7,
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      console.error('Failed to generate quick response:', error);
      return '';
    }
  }

  // Generate contextual reply for conversation
  async generateConversationReply(prompt: string, context: ContentContext): Promise<string> {
    if (!context.originalTweet || !context.conversationContext) {
      throw new Error('Conversation context required for conversation reply');
    }

    const conversationPrompt = `
${prompt}

CONVERSATION CONTEXT:
- Original tweet: "${context.originalTweet.text}" by @${context.originalTweet.author.username}
- Conversation tone: ${context.conversationContext.conversationTone}
- User sentiment: ${context.conversationContext.userSentiment}
- Previous replies: ${context.conversationContext.previousReplies.length} replies

Previous conversation context:
${context.conversationContext.previousReplies.map((reply, index) => 
  `${index + 1}. @${reply.author.username}: "${reply.text}"`
).join('\n')}

Create a reply that:
1. Builds on the conversation naturally
2. Maintains the established tone
3. Adds value or insight
4. Encourages continued engagement
5. Stays true to your personality
6. Is under 280 characters

Make it feel like a natural part of the conversation.
`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: conversationPrompt
        },
        {
          role: "user",
          content: `Generate a conversation reply that continues the discussion naturally.`
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content || '';
    return await this.safetyFilter.validate(content, context);
  }

  private buildPersonalityPrompt(context: ContentContext): string {
    return `
You are ${this.personality.name}, a ${this.personality.personalityType} AI agent.

CORE PERSONALITY:
- Voice Tone: ${this.personality.voiceTone}
- Humor Style: ${this.personality.humorStyle}
- Intelligence Level: ${this.personality.intelligenceLevel}
- Controversy Comfort: ${this.personality.controversyComfort}/100

BEHAVIORAL GUIDELINES:
${this.personality.behavioralGuidelines.map(rule => `- ${rule}`).join('\n')}

TARGET TOPICS: ${this.personality.targetTopics.join(', ')}
AVOID TOPICS: ${this.personality.avoidTopics.join(', ')}

PLATFORM: ${context.platform}
CONTENT TYPE: ${context.type}

${context.trends ? `CURRENT TRENDS: ${context.trends.join(', ')}` : ''}

${context.conversationContext ? `
CONVERSATION CONTEXT:
- Tone: ${context.conversationContext.conversationTone}
- User Sentiment: ${context.conversationContext.userSentiment}
- Previous Replies: ${context.conversationContext.previousReplies.length}
` : ''}

Remember: Stay true to your personality while being engaging and appropriate.
Keep responses under ${context.platform === 'twitter' ? '280' : '2200'} characters.
`;
  }

  private async generateOriginalPost(prompt: string, context: ContentContext): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: `Create an original ${context.platform} post that fits your personality and would engage your audience. Consider current trends but stay authentic to your character.`
        }
      ],
      max_tokens: 150,
      temperature: 0.8,
    });

    const content = completion.choices[0].message.content || '';
    return await this.safetyFilter.validate(content, context);
  }

  private async generateReply(prompt: string, context: ContentContext): Promise<string> {
    if (!context.originalTweet) throw new Error('Original tweet required for reply');

    // Check if we should reply to this tweet
    const shouldReply = await this.shouldReplyToTweet(context.originalTweet);
    if (!shouldReply) return '';

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: `Reply to this tweet: "${context.originalTweet.text}" by @${context.originalTweet.author.username}. 
          
          Create a response that fits your personality. Be witty and engaging but not mean-spirited.
          Consider the author's engagement level (${context.originalTweet.public_metrics?.like_count || 0} likes) and verification status (${context.originalTweet.author.verified ? 'verified' : 'not verified'}).`
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content || '';
    return await this.safetyFilter.validate(content, context);
  }

  private async generateThread(prompt: string, context: ContentContext): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: `Create a Twitter thread (2-3 tweets) about a topic you're passionate about. Each tweet should be under 280 characters and connected with "1/3", "2/3", etc.`
        }
      ],
      max_tokens: 300,
      temperature: 0.8,
    });

    const content = completion.choices[0].message.content || '';
    return await this.safetyFilter.validate(content, context);
  }

  private async shouldReplyToTweet(tweet: TweetData): Promise<boolean> {
    // Don't reply to viral tweets (> 10k engagements) to avoid drama
    if ((tweet.public_metrics?.like_count || 0) > 10000) return false;

    // Don't reply to obvious bait or controversial content
    const sensitivePatterns = [
      /\b(politics|election|vote|democrat|republican)\b/i,
      /\b(mental health|suicide|depression)\b/i,
      /\b(tragedy|disaster|death)\b/i
    ];

    const isSensitive = sensitivePatterns.some(pattern => pattern.test(tweet.text));
    if (isSensitive) return false;

    // Check relevance to our topics
    const relevanceScore = this.calculateRelevance(tweet.text);
    return relevanceScore > 0.6;
  }

  private calculateRelevance(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    const targetWords = this.personality.targetTopics.join(' ').toLowerCase().split(/\s+/);
    
    const matches = words.filter(word => 
      targetWords.some(target => target.includes(word) || word.includes(target))
    );

    return matches.length / words.length;
  }

  private calculateTopicRelevance(text: string, targetTopics: string[]): number {
    if (!targetTopics || targetTopics.length === 0) return 0;
    
    const words = text.toLowerCase().split(/\s+/);
    const targetWords = targetTopics.join(' ').toLowerCase().split(/\s+/);
    
    const matches = words.filter(word => 
      targetWords.some(target => target.includes(word) || word.includes(target))
    );

    return matches.length / words.length;
  }

  // Analyze conversation sentiment
  async analyzeConversationSentiment(tweets: TweetData[]): Promise<'positive' | 'neutral' | 'negative'> {
    try {
      const text = tweets.map(t => t.text).join(' ');
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Analyze the sentiment of this conversation. Return only: positive, neutral, or negative."
          },
          {
            role: "user",
            content: text
          }
        ],
        max_tokens: 10,
        temperature: 0.1,
      });

      const sentiment = completion.choices[0].message.content?.toLowerCase() || 'neutral';
      
      if (sentiment.includes('positive')) return 'positive';
      if (sentiment.includes('negative')) return 'negative';
      return 'neutral';
    } catch (error) {
      console.error('Failed to analyze sentiment:', error);
      return 'neutral';
    }
  }

  // Determine conversation tone
  async determineConversationTone(tweets: TweetData[]): Promise<'friendly' | 'debate' | 'casual' | 'professional'> {
    try {
      const text = tweets.map(t => t.text).join(' ');
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Analyze the tone of this conversation. Return only: friendly, debate, casual, or professional."
          },
          {
            role: "user",
            content: text
          }
        ],
        max_tokens: 10,
        temperature: 0.1,
      });

      const tone = completion.choices[0].message.content?.toLowerCase() || 'casual';
      
      if (tone.includes('friendly')) return 'friendly';
      if (tone.includes('debate')) return 'debate';
      if (tone.includes('professional')) return 'professional';
      return 'casual';
    } catch (error) {
      console.error('Failed to determine tone:', error);
      return 'casual';
    }
  }
}

// Content safety filter
class ContentSafetyFilter {
  private personality: PersonalityConfig;

  constructor(personality: PersonalityConfig) {
    this.personality = personality;
  }

  async validate(content: string, context: ContentContext): Promise<string> {
    // Check length limits
    const maxLength = context.platform === 'twitter' ? 280 : 2200;
    if (content.length > maxLength) {
      throw new Error(`Content too long: ${content.length}/${maxLength} characters`);
    }

    // Check for inappropriate content
    const toxicityScore = await this.analyzeToxicity(content);
    if (toxicityScore > 0.7) {
      throw new Error('Content flagged as potentially toxic');
    }

    // Check against avoid topics
    const containsAvoidTopics = this.personality.avoidTopics.some(topic =>
      content.toLowerCase().includes(topic.toLowerCase())
    );
    if (containsAvoidTopics) {
      throw new Error('Content contains avoided topics');
    }

    return content;
  }

  private async analyzeToxicity(content: string): Promise<number> {
    // Use OpenAI moderation API
    try {
      const moderation = await new OpenAI().moderations.create({
        input: content
      });

      const result = moderation.results[0];
      return Math.max(...Object.values(result.category_scores));
    } catch (error) {
      console.warn('Moderation API failed, using fallback');
      return this.basicToxicityCheck(content);
    }
  }

  private basicToxicityCheck(content: string): number {
    const toxicPatterns = [
      /\b(hate|kill|die|stupid|idiot)\b/gi,
      /f[*@#$%]ck/gi,
      /sh[*@#$%]t/gi
    ];

    const matches = toxicPatterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    return Math.min(matches * 0.3, 1.0);
  }
} 