const { TwitterApi } = require('twitter-api-v2');
const UnifiedTwitterService = require('./UnifiedTwitterService');
const database = require('../database/connection');
const { decrypt } = require('../utils/encryption');

/**
 * Twitter analytics service using hybrid approach:
 * - TwitterAPI.io for READ operations (cost-effective, no user auth needed)
 * - Official Twitter API for WRITE operations (OAuth, user-friendly)
 * 
 * For analytics, we primarily use TwitterAPI.io for reads.
 */
class TwitterAnalyticsService {
  /**
   * Get user's Twitter client from their stored OAuth tokens
   * Refreshes the token if needed before creating the client
   */
  async getUserClient(userId) {
    const result = await database.query(
      `SELECT access_token, refresh_token, connection_status 
       FROM platform_connections 
       WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Twitter account not connected. Please connect your Twitter account first.');
    }

    const connection = result.rows[0];
    
    // Decrypt tokens
    let accessToken = decrypt(connection.access_token);
    let refreshToken = decrypt(connection.refresh_token);
    
    // Try to refresh the token before using it (tokens expire after 2 hours)
    try {
      const refreshClient = new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID,
        clientSecret: process.env.TWITTER_CLIENT_SECRET,
      });

      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      } = await refreshClient.refreshOAuth2Token(refreshToken);

      accessToken = newAccessToken;
      refreshToken = newRefreshToken;

      // Update database with new tokens
      const { encrypt } = require('../utils/encryption');
      await database.query(
        `UPDATE platform_connections 
         SET access_token = $1, refresh_token = $2, updated_at = NOW()
         WHERE user_id = $3 AND platform = 'twitter'`,
        [encrypt(newAccessToken), encrypt(newRefreshToken), userId]
      );
    } catch (refreshError) {
      // If refresh fails, try using the existing token
      // This might fail if token is completely expired, but worth trying
      console.log('⚠️ Token refresh failed, using existing token:', refreshError.message);
    }
    
    // Create Twitter client with user's OAuth token (refreshed or existing)
    return new TwitterApi(accessToken);
  }

  /**
   * Get user's UnifiedTwitterService from their stored OAuth tokens
   * Uses TwitterAPI.io for reads, Official API for writes
   * Refreshes the token if needed before creating the service
   */
  async getUserService(userId) {
    const result = await database.query(
      `SELECT access_token, refresh_token, connection_status, metadata
       FROM platform_connections 
       WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Twitter account not connected. Please connect your Twitter account first.');
    }

    const connection = result.rows[0];
    
    // Decrypt tokens
    let accessToken = decrypt(connection.access_token);
    let refreshToken = decrypt(connection.refresh_token);
    
    // Try to refresh the token before using it (tokens expire after 2 hours)
    try {
      const refreshClient = new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID,
        clientSecret: process.env.TWITTER_CLIENT_SECRET,
      });

      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      } = await refreshClient.refreshOAuth2Token(refreshToken);

      accessToken = newAccessToken;
      refreshToken = newRefreshToken;

      // Update database with new tokens
      const { encrypt } = require('../utils/encryption');
      await database.query(
        `UPDATE platform_connections 
         SET access_token = $1, refresh_token = $2, updated_at = NOW()
         WHERE user_id = $3 AND platform = 'twitter'`,
        [encrypt(newAccessToken), encrypt(newRefreshToken), userId]
      );
    } catch (refreshError) {
      // If refresh fails, try using the existing token
      // This might fail if token is completely expired, but worth trying
      console.log('⚠️ Token refresh failed, using existing token:', refreshError.message);
    }
    
    // Create UnifiedTwitterService with user's OAuth token and TwitterAPI.io key
    // For reads, we use TwitterAPI.io (no OAuth needed, but we have it for writes)
    const twitterAPIIOKey = process.env.TWITTERAPIIO_API_KEY;
    if (!twitterAPIIOKey) {
      throw new Error('TwitterAPI.io API key not configured. Please set TWITTERAPIIO_API_KEY in environment variables.');
    }
    
    return new UnifiedTwitterService(accessToken, twitterAPIIOKey, refreshToken);
  }

  /**
   * Extract error details from Twitter API errors
   */
  extractTwitterError(error) {
    // TwitterApiError from twitter-api-v2 library (ApiResponseError)
    if (error.code !== undefined) {
      return {
        code: error.code,
        message: error.data?.detail || error.data?.title || error.message || 'Twitter API error',
        data: error.data,
        rateLimit: error.rateLimit,
        headers: error.headers,
      };
    }
    // Axios-style error
    if (error.response) {
      return {
        code: error.response.status,
        message: error.response.data?.detail || error.response.data?.title || error.message,
        data: error.response.data,
      };
    }
    // Generic error
    return {
      code: error.status || 500,
      message: error.message || 'Unknown error',
    };
  }

  /**
   * Get user profile using TwitterAPI.io (no OAuth needed for reads)
   */
  async getMeFromTwitterAPIIO(service, username) {
    try {
      const profile = await service.getUserProfile(username);
      
      // TwitterAPI.io returns data in different formats, handle all possibilities
      // Response might be: { data: {...} } or direct object
      const profileData = profile.data || profile;
      
      // Transform TwitterAPI.io response to match expected format
      // Check various possible field names
      const followersCount = profileData.followers_count || 
                            profileData.followers || 
                            profileData.public_metrics?.followers_count || 
                            profileData.metrics?.followers_count || 
                            0;
      
      const followingCount = profileData.following_count || 
                             profileData.following || 
                             profileData.public_metrics?.following_count || 
                             profileData.metrics?.following_count || 
                             0;
      
      const tweetCount = profileData.tweet_count || 
                        profileData.tweets || 
                        profileData.statuses_count || 
                        profileData.public_metrics?.tweet_count || 
                        profileData.metrics?.tweet_count || 
                        0;
      
      return {
        id: profileData.id || profileData.user_id || profileData.id_str,
        username: profileData.username || profileData.screen_name || username.replace('@', ''),
        public_metrics: {
          followers_count: parseInt(followersCount) || 0,
          following_count: parseInt(followingCount) || 0,
          tweet_count: parseInt(tweetCount) || 0,
        }
      };
    } catch (error) {
      const errorMsg = new Error(`Failed to fetch Twitter profile: ${error.message}`);
      errorMsg.code = error.code || 500;
      throw errorMsg;
    }
  }

  /**
   * Get user profile - tries TwitterAPI.io first, falls back to Official API only if needed for authenticated user info
   * @deprecated For reads, use getMeFromTwitterAPIIO instead
   */
  async getMe(client) {
    try {
      const me = await client.v2.me({
        'user.fields': ['username', 'public_metrics'],
      });
      return me.data;
    } catch (error) {
      const err = this.extractTwitterError(error);
      const errorMsg = new Error(`Failed to fetch Twitter profile: ${err.message}`);
      errorMsg.code = err.code;
      errorMsg.rateLimit = err.rateLimit;
      throw errorMsg;
    }
  }

  async getRecentTweets(client, userId, maxResults = 50) {
    try {
      const tweets = await client.v2.userTimeline(userId, {
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics', 'referenced_tweets'],
      });
      return tweets.data?.data || [];
    } catch (error) {
      const err = this.extractTwitterError(error);
      const errorMsg = new Error(`Failed to fetch tweets: ${err.message}`);
      errorMsg.code = err.code;
      errorMsg.rateLimit = err.rateLimit;
      throw errorMsg;
    }
  }

  async searchMentions(client, username, maxResults = 50) {
    try {
      const query = `@${username} -is:retweet`;
      const mentions = await client.v2.search(query, {
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
      });
      return mentions.data?.data || [];
    } catch (error) {
      const err = this.extractTwitterError(error);
      const errorMsg = new Error(`Failed to search mentions: ${err.message}`);
      errorMsg.code = err.code;
      errorMsg.rateLimit = err.rateLimit;
      throw errorMsg;
    }
  }

  /**
   * Build overview metrics
   */
  async getOverview(userId) {
    // Use UnifiedTwitterService for reads (TwitterAPI.io) - NO Official API for reads
    const service = await this.getUserService(userId);
    
    // Get username from database or use a default approach
    // For now, we'll need username - could store it in platform_connections metadata
    const connection = await database.query(
      `SELECT metadata FROM platform_connections 
       WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'`,
      [userId]
    );
    
    let username = connection.rows[0]?.metadata?.username;
    if (!username) {
      // NO FALLBACK to Official API - user must reconnect to store username
      throw new Error('Twitter username not found. Please reconnect your Twitter account to store your username. We cannot use Official Twitter API for reads as monthly limit has been reached.');
    }
    
    // Get user profile via TwitterAPI.io (no OAuth needed)
    const me = await this.getMeFromTwitterAPIIO(service, username);
    if (!me) throw new Error('Unable to fetch Twitter profile');

    const followerCount = me.public_metrics?.followers_count || 0;

    // Use UnifiedTwitterService for getting timeline (TwitterAPI.io)
    const timelineResult = await service.getUserTimeline(username, { maxResults: 50 });
    const tweets = timelineResult?.tweets || timelineResult || [];

    // Aggregate engagement
    const totals = tweets.reduce(
      (acc, t) => {
        const m = t.public_metrics || {};
        acc.impressions += m.impression_count || 0;
        acc.likes += m.like_count || 0;
        acc.retweets += m.retweet_count || 0;
        acc.replies += m.reply_count || 0;
        acc.quotes += m.quote_count || 0;
        return acc;
      },
      { impressions: 0, likes: 0, retweets: 0, replies: 0, quotes: 0 },
    );

    const engagementEvents = totals.likes + totals.retweets + totals.replies + totals.quotes;
    const avgEngagementRate =
      tweets.length > 0 && totals.impressions > 0
        ? (engagementEvents / totals.impressions) * 100
        : 0;

    // Best times: histogram by hour (UTC)
    const hourBuckets = Array.from({ length: 24 }, () => 0);
    tweets.forEach((t) => {
      if (t.created_at) {
        const hour = new Date(t.created_at).getUTCHours();
        hourBuckets[hour] += (t.public_metrics?.like_count || 0) + (t.public_metrics?.retweet_count || 0);
      }
    });
    const bestHour = hourBuckets.indexOf(Math.max(...hourBuckets));

    return {
      username: me.username,
      followerCount,
      followerChange: 0, // No historical yet
      totalTweets: tweets.length,
      impressions: totals.impressions,
      engagementRate: Number(avgEngagementRate.toFixed(2)),
      bestHour,
      bestHourLabel: `UTC ${bestHour}:00`,
    };
  }

  /**
   * Top posts by engagement
   */
  async getTopPosts(userId, limit = 10) {
    // Use UnifiedTwitterService for reads (TwitterAPI.io) - NO Official API for reads
    const service = await this.getUserService(userId);
    
    // Get username from database
    const connection = await database.query(
      `SELECT metadata FROM platform_connections 
       WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'`,
      [userId]
    );
    
    let username = connection.rows[0]?.metadata?.username;
    if (!username) {
      // Try to get from Official API just for username (one-time, minimal call)
      try {
        const client = await this.getUserClient(userId);
        const me = await this.getMe(client);
        username = me.username;
        await database.query(
          `UPDATE platform_connections 
           SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('username', $1)
           WHERE user_id = $2 AND platform = 'twitter'`,
          [username, userId]
        );
      } catch (error) {
        throw new Error('Unable to fetch Twitter username. Please reconnect your Twitter account.');
      }
    }

    // Get user profile via TwitterAPI.io (no OAuth needed)
    const me = await this.getMeFromTwitterAPIIO(service, username);
    if (!me) throw new Error('Unable to fetch Twitter profile');

    // Use UnifiedTwitterService for getting timeline (TwitterAPI.io)
    const timelineResult = await service.getUserTimeline(username, { maxResults: 100 });
    const tweets = timelineResult?.tweets || timelineResult || [];
    const scored = tweets
      .map((t) => {
        const m = t.public_metrics || {};
        const score =
          (m.like_count || 0) +
          (m.retweet_count || 0) * 2 +
          (m.reply_count || 0) * 3 +
          (m.quote_count || 0) * 2;
        return {
          id: t.id,
          text: t.text,
          created_at: t.created_at,
          metrics: m,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }

  /**
   * Mentions with basic metrics
   */
  async getMentions(userId, limit = 20) {
    // Use UnifiedTwitterService for reads (TwitterAPI.io) - NO Official API for reads
    const service = await this.getUserService(userId);
    
    // Get username from database
    const connection = await database.query(
      `SELECT metadata FROM platform_connections 
       WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'`,
      [userId]
    );
    
    let username = connection.rows[0]?.metadata?.username;
    if (!username) {
      // NO FALLBACK to Official API - user must reconnect to store username
      throw new Error('Twitter username not found. Please reconnect your Twitter account to store your username. We cannot use Official Twitter API for reads as monthly limit has been reached.');
    }

    // Use UnifiedTwitterService for getting mentions (TwitterAPI.io)
    const mentionsResult = await service.getMentions(username, { maxResults: limit });
    const mentions = mentionsResult?.tweets || mentionsResult || [];
    return mentions.map((m) => ({
      id: m.id,
      text: m.text,
      created_at: m.created_at,
      metrics: m.public_metrics || {},
      author_id: m.author_id,
    }));
  }

  /**
   * Best time heatmap (day x hour)
   */
  async getBestTimes(userId) {
    // Use UnifiedTwitterService for reads (TwitterAPI.io) - NO Official API for reads
    const service = await this.getUserService(userId);
    
    // Get username from database
    const connection = await database.query(
      `SELECT metadata FROM platform_connections 
       WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'`,
      [userId]
    );
    
    let username = connection.rows[0]?.metadata?.username;
    if (!username) {
      // NO FALLBACK to Official API - user must reconnect to store username
      throw new Error('Twitter username not found. Please reconnect your Twitter account to store your username. We cannot use Official Twitter API for reads as monthly limit has been reached.');
    }
    
    // Use UnifiedTwitterService for getting timeline (TwitterAPI.io)
    const timelineResult = await service.getUserTimeline(username, { maxResults: 200 });
    const tweets = timelineResult?.tweets || timelineResult || [];

    // 7 days x 24 hours heatmap (UTC)
    const heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    tweets.forEach((t) => {
      if (t.created_at) {
        const date = new Date(t.created_at);
        const dow = date.getUTCDay(); // 0-6
        const hour = date.getUTCHours();
        const engagement =
          (t.public_metrics?.like_count || 0) +
          (t.public_metrics?.retweet_count || 0) +
          (t.public_metrics?.reply_count || 0) +
          (t.public_metrics?.quote_count || 0);
        heatmap[dow][hour] += engagement;
      }
    });

    return heatmap;
  }

  /**
   * Save daily snapshot of Twitter metrics
   */
  async saveDailySnapshot(userId) {
    try {
      // Use UnifiedTwitterService for reads (TwitterAPI.io) - NO Official API for reads
      const service = await this.getUserService(userId);
      
      // Get username from database metadata
      const connection = await database.query(
        `SELECT metadata FROM platform_connections 
         WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'`,
        [userId]
      );
      
      let username = connection.rows[0]?.metadata?.username;
      if (!username) {
        // NO FALLBACK to Official API - user must reconnect to store username
        throw new Error('Twitter username not found. Please reconnect your Twitter account to store your username. We cannot use Official Twitter API for reads as monthly limit has been reached.');
      }
      
      // Get user profile via TwitterAPI.io (no OAuth needed, no fallback)
      const me = await this.getMeFromTwitterAPIIO(service, username);
      if (!me) throw new Error('Unable to fetch Twitter profile from TwitterAPI.io');

      const today = new Date().toISOString().split('T')[0];
      
      // Get current metrics using TwitterAPI.io
      const timelineResult = await service.getUserTimeline(username, { maxResults: 200 });
      const tweets = timelineResult?.tweets || timelineResult || [];
      
      const mentionsResult = await service.getMentions(username, { maxResults: 100 });
      const mentions = mentionsResult?.tweets || mentionsResult || [];

      // Calculate totals
      const totals = tweets.reduce(
        (acc, t) => {
          const m = t.public_metrics || {};
          acc.impressions += m.impression_count || 0;
          acc.likes += m.like_count || 0;
          acc.retweets += m.retweet_count || 0;
          acc.replies += m.reply_count || 0;
          acc.quotes += m.quote_count || 0;
          return acc;
        },
        { impressions: 0, likes: 0, retweets: 0, replies: 0, quotes: 0 },
      );

      const engagementEvents = totals.likes + totals.retweets + totals.replies + totals.quotes;
      const engagementRate =
        tweets.length > 0 && totals.impressions > 0
          ? (engagementEvents / totals.impressions) * 100
          : 0;

      // Get previous snapshot for follower change
      const prevSnapshot = await database.query(
        `SELECT follower_count FROM twitter_analytics_snapshots 
         WHERE user_id = $1 AND snapshot_date < $2 
         ORDER BY snapshot_date DESC LIMIT 1`,
        [userId, today]
      );

      const prevFollowerCount = prevSnapshot.rows[0]?.follower_count || me.public_metrics?.followers_count || 0;
      const followerChange = (me.public_metrics?.followers_count || 0) - prevFollowerCount;

      // Calculate best hour
      const hourBuckets = Array.from({ length: 24 }, () => 0);
      tweets.forEach((t) => {
        if (t.created_at) {
          const hour = new Date(t.created_at).getUTCHours();
          hourBuckets[hour] += (t.public_metrics?.like_count || 0) + (t.public_metrics?.retweet_count || 0);
        }
      });
      const bestHour = hourBuckets.indexOf(Math.max(...hourBuckets));

      // Calculate best day
      const dayBuckets = Array.from({ length: 7 }, () => 0);
      tweets.forEach((t) => {
        if (t.created_at) {
          const day = new Date(t.created_at).getUTCDay();
          dayBuckets[day] += (t.public_metrics?.like_count || 0) + (t.public_metrics?.retweet_count || 0);
        }
      });
      const bestDay = dayBuckets.indexOf(Math.max(...dayBuckets));

      // Save snapshot
      const result = await database.query(
        `INSERT INTO twitter_analytics_snapshots (
          user_id, snapshot_date, follower_count, follower_change,
          total_tweets, total_impressions, total_likes, total_retweets,
          total_replies, total_quotes, engagement_rate,
          avg_likes_per_tweet, avg_retweets_per_tweet, avg_replies_per_tweet,
          avg_impressions_per_tweet, best_hour, best_day,
          mention_count, username, platform_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (user_id, snapshot_date) 
        DO UPDATE SET
          follower_count = EXCLUDED.follower_count,
          follower_change = EXCLUDED.follower_change,
          total_tweets = EXCLUDED.total_tweets,
          total_impressions = EXCLUDED.total_impressions,
          total_likes = EXCLUDED.total_likes,
          total_retweets = EXCLUDED.total_retweets,
          total_replies = EXCLUDED.total_replies,
          total_quotes = EXCLUDED.total_quotes,
          engagement_rate = EXCLUDED.engagement_rate,
          avg_likes_per_tweet = EXCLUDED.avg_likes_per_tweet,
          avg_retweets_per_tweet = EXCLUDED.avg_retweets_per_tweet,
          avg_replies_per_tweet = EXCLUDED.avg_replies_per_tweet,
          avg_impressions_per_tweet = EXCLUDED.avg_impressions_per_tweet,
          best_hour = EXCLUDED.best_hour,
          best_day = EXCLUDED.best_day,
          mention_count = EXCLUDED.mention_count,
          username = EXCLUDED.username
        RETURNING *`,
        [
          userId,
          today,
          me.public_metrics?.followers_count || 0,
          followerChange,
          tweets.length,
          totals.impressions,
          totals.likes,
          totals.retweets,
          totals.replies,
          totals.quotes,
          Number(engagementRate.toFixed(2)),
          tweets.length > 0 ? Number((totals.likes / tweets.length).toFixed(2)) : 0,
          tweets.length > 0 ? Number((totals.retweets / tweets.length).toFixed(2)) : 0,
          tweets.length > 0 ? Number((totals.replies / tweets.length).toFixed(2)) : 0,
          tweets.length > 0 ? Math.round(totals.impressions / tweets.length) : 0,
          bestHour,
          bestDay,
          mentions.length,
          me.username,
          me.id,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Failed to save daily snapshot:', error);
      throw error;
    }
  }

  /**
   * Get historical data for charts
   */
  async getHistoricalData(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const result = await database.query(
        `SELECT * FROM twitter_analytics_snapshots 
         WHERE user_id = $1 AND snapshot_date >= $2 
         ORDER BY snapshot_date ASC`,
        [userId, startDateStr]
      );

      return result.rows;
    } catch (error) {
      console.error('Failed to get historical data:', error);
      throw error;
    }
  }

  /**
   * Get follower growth trend
   */
  async getFollowerGrowth(userId, days = 30) {
    const historical = await this.getHistoricalData(userId, days);
    return historical.map((snapshot) => ({
      date: snapshot.snapshot_date,
      followers: snapshot.follower_count,
      change: snapshot.follower_change,
    }));
  }

  /**
   * Get engagement trends
   */
  async getEngagementTrends(userId, days = 30) {
    const historical = await this.getHistoricalData(userId, days);
    return historical.map((snapshot) => ({
      date: snapshot.snapshot_date,
      engagementRate: parseFloat(snapshot.engagement_rate) || 0,
      impressions: parseInt(snapshot.total_impressions) || 0,
      likes: parseInt(snapshot.total_likes) || 0,
      retweets: parseInt(snapshot.total_retweets) || 0,
      replies: parseInt(snapshot.total_replies) || 0,
    }));
  }
}

module.exports = TwitterAnalyticsService;


