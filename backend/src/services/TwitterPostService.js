const database = require('../config/database');
const { TwitterApi } = require('twitter-api-v2');
const { decrypt } = require('../utils/encryption');

class TwitterPostService {
  // Post content to Twitter
  async postToTwitter(userId, agentId, contentText, contentType = 'tweet') {
    try {
      // Get user's Twitter connection
      const connectionResult = await database.query(`
        SELECT access_token, refresh_token, username
        FROM platform_connections 
        WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'
      `, [userId]);

      if (connectionResult.rows.length === 0) {
        throw new Error('No active Twitter connection found');
      }

      const connection = connectionResult.rows[0];
      
      // Decrypt tokens
      const accessToken = decrypt(connection.access_token);
      const refreshToken = decrypt(connection.refresh_token);

      // Check if we need to refresh the access token
      let currentAccessToken = accessToken;
      let currentRefreshToken = refreshToken;
      
      try {
        console.log('🔄 Attempting to refresh OAuth 2.0 token...');
        const { client_id, client_secret } = process.env;
        
        const refreshClient = new TwitterApi({
          clientId: process.env.TWITTER_CLIENT_ID,
          clientSecret: process.env.TWITTER_CLIENT_SECRET,
        });

        const {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        } = await refreshClient.refreshOAuth2Token(currentRefreshToken);

        currentAccessToken = newAccessToken;
        currentRefreshToken = newRefreshToken;

        console.log('✅ Token refreshed successfully');

        // Update database with new tokens
        const { encrypt } = require('../utils/encryption');
        await database.query(`
          UPDATE platform_connections 
          SET access_token = $1, refresh_token = $2, updated_at = NOW()
          WHERE user_id = $3 AND platform = 'twitter'
        `, [encrypt(newAccessToken), encrypt(newRefreshToken), userId]);

        console.log('💾 Updated database with new tokens');
      } catch (refreshError) {
        console.log('⚠️ Token refresh failed, using existing token:', refreshError.message);
      }

      // Create Twitter client
      const userClient = new TwitterApi(currentAccessToken);

      console.log('Creating Twitter client with:', {
        clientId: process.env.TWITTER_CLIENT_ID ? 'Set' : 'Not set',
        clientSecret: process.env.TWITTER_CLIENT_SECRET ? 'Set' : 'Not set',
        accessTokenLength: currentAccessToken ? currentAccessToken.length : 0,
        refreshTokenLength: currentRefreshToken ? currentRefreshToken.length : 0
      });

      // Test authentication
      console.log('🔐 Testing Twitter client authentication...');
      console.log('📡 Making request to Twitter API v2.me()...');
      console.log('🔍 Testing token scopes and permissions...');
      
      try {
        await userClient.v2.me();
        console.log('✅ Twitter client authenticated successfully');
      } catch (authError) {
        console.log('❌ Twitter client authentication failed:', authError.message);
        throw new Error(`Twitter authentication failed: ${authError.message}`);
      }

      // Post the content
      console.log('📝 Posting content to Twitter:', contentText);
      const tweet = await userClient.v2.tweet(contentText);

      // Store the generated content record
      await database.query(`
        INSERT INTO generated_content 
        (agent_id, platform, content_type, content_text, platform_post_id, published_at, status, ai_model_used)
        VALUES ($1, 'twitter', $2, $3, $4, NOW(), 'published', 'agent-generated')
      `, [agentId, contentType, contentText, tweet.data.id]);

      // Deduct platform-specific posting cost (on top of content generation cost)
      try {
        const ServicePricingService = require('./ServicePricingService');
        const CreditService = require('./CreditService');
        const creditService = new CreditService();
        
        const postingCostKey = contentType === 'reply' 
          ? 'platform_posting_twitter_reply' 
          : 'platform_posting_twitter_post';
        
        const postingCost = await ServicePricingService.getPricing(postingCostKey);
        
        if (postingCost > 0) {
          await creditService.deductCredits(
            userId, 
            postingCostKey, 
            postingCost, 
            `twitter_post_${tweet.data.id}`
          );
        }
      } catch (costError) {
        // Log error but don't fail the post if cost deduction fails
        console.error('Error deducting platform posting cost:', costError);
      }

      return {
        success: true,
        tweetId: tweet.data.id,
        url: `https://twitter.com/${connection.username}/status/${tweet.data.id}`
      };

    } catch (error) {
      console.error('Error posting to Twitter:', error);
      throw error;
    }
  }
}

module.exports = new TwitterPostService();
