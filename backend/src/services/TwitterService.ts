import { TwitterApi } from 'twitter-api-v2';

export interface TweetData {
  id: string;
  text: string;
  author_id: string;
  author: {
    username: string;
    verified: boolean;
    public_metrics: {
      followers_count: number;
      following_count: number;
    };
  };
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
    impression_count: number;
  };
  created_at: string;
  context_annotations?: any[];
  referenced_tweets?: any[];
}

export interface EngagementMetrics {
  tweetId: string;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  engagementRate: number;
}

export class TwitterService {
  private client: TwitterApi;
  private userId: string;

  constructor(accessToken: string, accessSecret: string) {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken,
      accessSecret,
    });
  }

  // Post a tweet
  async postTweet(content: string, mediaUrls?: string[]): Promise<string> {
    try {
      let mediaIds: string[] = [];

      // Upload media if provided
      if (mediaUrls && mediaUrls.length > 0) {
        for (const url of mediaUrls) {
          const mediaId = await this.uploadMedia(url);
          mediaIds.push(mediaId);
        }
      }

      // Fix: Use proper Twitter API v2 method and handle media_ids type
      const tweetParams: any = { text: content };
      if (mediaIds.length > 0) {
        // Twitter API v2 expects media_ids as a tuple, not array
        tweetParams.media = { media_ids: mediaIds as [string, ...string[]] };
      }

      const tweet = await this.client.v2.tweet(content, tweetParams);
      return tweet.data.id;
    } catch (error) {
      console.error('Failed to post tweet:', error);
      throw error;
    }
  }

  // Reply to a tweet
  async replyToTweet(tweetId: string, content: string): Promise<string> {
    try {
      const reply = await this.client.v2.tweet(content, {
        reply: { in_reply_to_tweet_id: tweetId }
      });

      return reply.data.id;
    } catch (error) {
      console.error('Failed to reply to tweet:', error);
      throw error;
    }
  }

  // Find tweets related to agent's target topics
  async findRelevantTweets(agentConfig: any, maxResults: number = 20): Promise<TweetData[]> {
    try {
      const topics = agentConfig.target_topics || [];
      if (topics.length === 0) return [];

      // Build search query with topic relevance
      const topicQueries = topics.map(topic => `"${topic}"`).join(' OR ');
      const query = `(${topicQueries}) -is:retweet -is:reply lang:en`;
      
      console.log(`Searching for tweets with query: ${query}`);

      const tweets = await this.client.v2.search(query, {
        max_results: maxResults,
        'tweet.fields': ['author_id', 'created_at', 'public_metrics', 'context_annotations', 'referenced_tweets'],
        'user.fields': ['username', 'verified', 'public_metrics'],
        expansions: ['author_id']
      });

      if (!tweets.data?.data) return [];

      // Enrich tweets with author information
      const users = tweets.includes?.users || [];
      const enrichedTweets: TweetData[] = tweets.data.data.map(tweet => {
        const author = users.find(u => u.id === tweet.author_id);
        return {
          id: tweet.id,
          text: tweet.text,
          author_id: tweet.author_id || 'unknown', // Fix: Handle undefined author_id
          author: {
            username: author?.username || 'unknown',
            verified: author?.verified || false,
            public_metrics: {
              followers_count: author?.public_metrics?.followers_count || 0,
              following_count: author?.public_metrics?.following_count || 0
            }
          },
          public_metrics: tweet.public_metrics || {
            like_count: 0,
            retweet_count: 0,
            reply_count: 0,
            quote_count: 0,
            impression_count: 0
          },
          created_at: tweet.created_at || new Date().toISOString(),
          context_annotations: tweet.context_annotations,
          referenced_tweets: tweet.referenced_tweets
        };
      });

      return enrichedTweets;
    } catch (error) {
      console.error('Failed to find relevant tweets:', error);
      return [];
    }
  }

  // Get replies to agent's tweets
  async getRepliesToAgentTweets(tweetId: string): Promise<TweetData[]> {
    try {
      // Fix: Use correct Twitter API v2 method name
      const replies = await this.client.v2.search(`conversation_id:${tweetId}`, {
        'tweet.fields': ['author_id', 'created_at', 'public_metrics', 'in_reply_to_user_id'],
        'user.fields': ['username', 'verified', 'public_metrics'],
        expansions: ['author_id'],
        max_results: 100
      });

      if (!replies.data?.data) return [];

      // Enrich replies with author information
      const users = replies.includes?.users || [];
      return replies.data.data.map(reply => {
        const author = users.find(u => u.id === reply.author_id);
        return {
          id: reply.id,
          text: reply.text,
          author_id: reply.author_id || 'unknown', // Fix: Handle undefined author_id
          author: {
            username: author?.username || 'unknown',
            verified: author?.verified || false,
            public_metrics: {
              followers_count: author?.public_metrics?.followers_count || 0,
              following_count: author?.public_metrics?.following_count || 0
            }
          },
          public_metrics: reply.public_metrics || {
            like_count: 0,
            retweet_count: 0,
            reply_count: 0,
            quote_count: 0,
            impression_count: 0
          },
          created_at: reply.created_at || new Date().toISOString()
        };
      });
    } catch (error) {
      console.error('Failed to get replies to agent tweets:', error);
      return [];
    }
  }

  // Get mentions of the agent
  async getRecentMentions(maxResults: number = 50): Promise<TweetData[]> {
    try {
      const mentions = await this.client.v2.userMentionTimeline('me', {
        max_results: maxResults,
        'tweet.fields': ['author_id', 'created_at', 'public_metrics', 'referenced_tweets'],
        'user.fields': ['username', 'verified', 'public_metrics'],
        expansions: ['author_id', 'referenced_tweets.id']
      });

      if (!mentions.data?.data) return [];

      // Enrich mentions with author information
      const users = mentions.includes?.users || [];
      return mentions.data.data.map(mention => {
        const author = users.find(u => u.id === mention.author_id);
        return {
          id: mention.id,
          text: mention.text,
          author_id: mention.author_id || 'unknown', // Fix: Handle undefined author_id
          author: {
            username: author?.username || 'unknown',
            verified: author?.verified || false,
            public_metrics: {
              followers_count: author?.public_metrics?.followers_count || 0,
              following_count: author?.public_metrics?.following_count || 0
            }
          },
          public_metrics: mention.public_metrics || {
            like_count: 0,
            retweet_count: 0,
            reply_count: 0,
            quote_count: 0,
            impression_count: 0
          },
          created_at: mention.created_at || new Date().toISOString(),
          referenced_tweets: mention.referenced_tweets
        };
      });
    } catch (error) {
      console.error('Failed to get recent mentions:', error);
      return [];
    }
  }

  // Get tweet engagement metrics
  async getTweetMetrics(tweetId: string): Promise<EngagementMetrics | null> {
    try {
      const tweet = await this.client.v2.singleTweet(tweetId, {
        'tweet.fields': ['public_metrics', 'author_id']
      });

      if (!tweet.data?.public_metrics) return null;

      const metrics = tweet.data.public_metrics;
      const totalEngagements = (metrics.like_count || 0) + (metrics.retweet_count || 0) + (metrics.reply_count || 0);
      const engagementRate = metrics.impression_count ? (totalEngagements / metrics.impression_count) * 100 : 0;

      return {
        tweetId,
        likes: metrics.like_count || 0,
        retweets: metrics.retweet_count || 0,
        replies: metrics.reply_count || 0,
        impressions: metrics.impression_count || 0,
        engagementRate: Math.round(engagementRate * 100) / 100
      };
    } catch (error) {
      console.error('Failed to get tweet metrics:', error);
      return null;
    }
  }

  // Search for tweets to reply to
  async searchRelevantTweets(keywords: string[], maxResults: number = 10): Promise<any[]> {
    try {
      const query = keywords.join(' OR ');
      const tweets = await this.client.v2.search(query, {
        max_results: maxResults,
        'tweet.fields': ['author_id', 'created_at', 'public_metrics', 'context_annotations'],
        'user.fields': ['username', 'verified', 'public_metrics'],
        expansions: ['author_id']
      });

      return tweets.data?.data || [];
    } catch (error) {
      console.error('Failed to search tweets:', error);
      return [];
    }
  }

  // Upload media (images/videos)
  private async uploadMedia(mediaUrl: string): Promise<string> {
    try {
      // Download media first
      const response = await fetch(mediaUrl);
      const buffer = await response.arrayBuffer();

      // Upload to Twitter
      const mediaId = await this.client.v1.uploadMedia(Buffer.from(buffer), {
        mimeType: response.headers.get('content-type') || 'image/jpeg'
      });

      return mediaId;
    } catch (error) {
      console.error('Failed to upload media:', error);
      throw error;
    }
  }

  // Get user's timeline for analysis
  async getUserTimeline(count: number = 200): Promise<any[]> {
    try {
      const timeline = await this.client.v2.userTimeline('me', {
        max_results: count,
        'tweet.fields': ['created_at', 'public_metrics', 'context_annotations']
      });

      return timeline.data?.data || [];
    } catch (error) {
      console.error('Failed to get user timeline:', error);
      return [];
    }
  }

  // Get trending topics (simplified version)
  async getTrendingTopics(): Promise<string[]> {
    try {
      // For now, return some common tech/AI topics
      // In production, you could integrate with Twitter's trending API or external services
      return [
        'AI', 'artificial intelligence', 'machine learning', 'tech', 'startup', 
        'productivity', 'innovation', 'blockchain', 'crypto', 'web3'
      ];
    } catch (error) {
      console.error('Failed to get trending topics:', error);
      return [];
    }
  }
}

// Twitter OAuth flow for user connection
export class TwitterAuth {
  private client: TwitterApi;

  constructor() {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
    });
  }

  // Step 1: Generate auth URL
  async generateAuthUrl(callbackUrl: string): Promise<{ url: string; oauth_token: string; oauth_token_secret: string }> {
    const authLink = await this.client.generateAuthLink(callbackUrl, { linkMode: 'authorize' });
    
    return {
      url: authLink.url,
      oauth_token: authLink.oauth_token,
      oauth_token_secret: authLink.oauth_token_secret
    };
  }

  // Step 2: Exchange callback tokens for access tokens
  async getAccessTokens(oauth_token: string, oauth_token_secret: string, oauth_verifier: string): Promise<{
    accessToken: string;
    accessSecret: string;
    userId: string;
    screenName: string;
  }> {
    const tempClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: oauth_token,
      accessSecret: oauth_token_secret,
    });

    const { client, accessToken, accessSecret, userId, screenName } = 
      await tempClient.login(oauth_verifier);

    return { accessToken, accessSecret, userId, screenName };
  }
} 