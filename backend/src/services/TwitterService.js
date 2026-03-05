const { TwitterApi } = require('twitter-api-v2');

class TwitterService {
  constructor(accessToken, refreshToken = null) {
    // For Twitter API v2 OAuth 2.0, we only need the access token
    // The refreshToken is stored for future token refresh operations
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    
    this.client = new TwitterApi(accessToken);
  }

  // Post a tweet
  async postTweet(content, mediaUrls) {
    try {
      let mediaIds = [];

      // Upload media if provided
      if (mediaUrls && mediaUrls.length > 0) {
        for (const url of mediaUrls) {
          const mediaId = await this.uploadMedia(url);
          mediaIds.push(mediaId);
        }
      }

      // Fix: Use proper Twitter API v2 method and handle media_ids type
      const tweetParams = { text: content };
      if (mediaIds.length > 0) {
        // Twitter API v2 expects media_ids as a tuple, not array
        tweetParams.media = { media_ids: mediaIds };
      }

      const tweet = await this.client.v2.tweet(content, tweetParams);
      return tweet.data.id;
    } catch (error) {
      console.error('Failed to post tweet:', error);
      throw error;
    }
  }

  // Reply to a tweet
  async replyToTweet(tweetId, content) {
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
  async findRelevantTweets(agentConfig, maxResults = 20) {
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
      const enrichedTweets = tweets.data.data.map(tweet => {
        const author = users.find(u => u.id === tweet.author_id);
        return {
          id: tweet.id,
          text: tweet.text,
          author_id: tweet.author_id || 'unknown',
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
  async getRepliesToAgentTweets(tweetId) {
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
          author_id: reply.author_id || 'unknown',
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

  // Get recent mentions of the agent
  async getRecentMentions(maxResults = 50) {
    try {
      // Get user's own user ID first
      const me = await this.client.v2.me();
      if (!me.data) {
        throw new Error('Could not get user information');
      }

      const userId = me.data.id;
      
      // Search for mentions
      const mentions = await this.client.v2.search(`@${me.data.username}`, {
        'tweet.fields': ['author_id', 'created_at', 'public_metrics', 'in_reply_to_user_id'],
        'user.fields': ['username', 'verified', 'public_metrics'],
        expansions: ['author_id'],
        max_results: maxResults
      });

      if (!mentions.data?.data) return [];

      // Enrich mentions with author information
      const users = mentions.includes?.users || [];
      return mentions.data.data.map(mention => {
        const author = users.find(u => u.id === mention.author_id);
        return {
          id: mention.id,
          text: mention.text,
          author_id: mention.author_id || 'unknown',
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
          created_at: mention.created_at || new Date().toISOString()
        };
      });
    } catch (error) {
      console.error('Failed to get recent mentions:', error);
      return [];
    }
  }

  // Get tweet metrics
  async getTweetMetrics(tweetId) {
    try {
      const tweet = await this.client.v2.singleTweet(tweetId, {
        'tweet.fields': ['public_metrics', 'created_at']
      });

      if (!tweet.data) return null;

      return {
        tweet_id: tweetId,
        likes_count: tweet.data.public_metrics?.like_count || 0,
        retweets_count: tweet.data.public_metrics?.retweet_count || 0,
        replies_count: tweet.data.public_metrics?.reply_count || 0,
        quote_count: tweet.data.public_metrics?.quote_count || 0,
        impression_count: tweet.data.public_metrics?.impression_count || 0,
        created_at: tweet.data.created_at
      };
    } catch (error) {
      console.error('Failed to get tweet metrics:', error);
      return null;
    }
  }

  // Upload media (images/videos)
  async uploadMedia(mediaUrl) {
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
  async getUserTimeline(count = 200) {
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
  async getTrendingTopics() {
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

  // Refresh OAuth 2.0 access token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const refreshClient = new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID,
        clientSecret: process.env.TWITTER_CLIENT_SECRET,
      });

      // Use direct destructuring like other services (this is the standard pattern)
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = 
        await refreshClient.refreshOAuth2Token(this.refreshToken);

      // Update the current tokens
      this.accessToken = newAccessToken;
      this.refreshToken = newRefreshToken || this.refreshToken; // Keep old refresh token if new one not provided
      
      // Create new client with refreshed token
      this.client = new TwitterApi(newAccessToken);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken || this.refreshToken
      };
    } catch (error) {
      // Check if it's a rate limit error (429)
      if (error.code === 429 || (error.rateLimit && error.rateLimit.remaining === 0)) {
        // Re-throw rate limit errors to be handled upstream
        throw error;
      }
      
      // Check for the "Cannot read properties" error - this happens when the library
      // tries to parse an error response that doesn't have the expected structure
      // This can happen with invalid refresh tokens or network issues
      if (error.message && error.message.includes('Cannot read properties')) {
        const enhancedError = new Error('Token refresh failed: Invalid refresh token or unexpected response structure. Please reconnect your Twitter account.');
        enhancedError.code = error.code;
        enhancedError.rateLimit = error.rateLimit;
        enhancedError.originalError = error.message;
        throw enhancedError;
      }
      
      // Log detailed error for debugging
      console.error('Failed to refresh access token:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack?.substring(0, 500)
      });
      throw error;
    }
  }

  // Check if current token is valid
  async validateToken() {
    try {
      const me = await this.client.v2.me();
      return me.data ? true : false;
    } catch (error) {
      if (error.code === 401) {
        return false; // Token is invalid/expired
      }
      throw error; // Other error
    }
  }
}

// Twitter OAuth flow for user connection
class TwitterAuth {
  constructor() {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
    });
  }

  // Step 1: Generate auth URL
  async generateAuthUrl(callbackUrl) {
    const authLink = await this.client.generateAuthLink(callbackUrl, { linkMode: 'authorize' });
    
    return {
      url: authLink.url,
      oauth_token: authLink.oauth_token,
      oauth_token_secret: authLink.oauth_token_secret
    };
  }

  // Step 2: Exchange callback tokens for access tokens
  async getAccessTokens(oauth_token, oauth_token_secret, oauth_verifier) {
    const tempClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: oauth_token,
      accessSecret: oauth_token_secret,
    });

    const { client, accessToken, accessSecret, userId, screenName } = 
      await tempClient.login(oauth_verifier);

    return { accessToken, accessSecret, userId, screenName };
  }
}

module.exports = {
  TwitterService,
  TwitterAuth
};
