const cron = require('node-cron');
const TwitterServiceModule = require('./TwitterService');
const TwitterService = TwitterServiceModule.TwitterService;
const UnifiedTwitterService = require('./UnifiedTwitterService');
const { PersonalityAgent } = require('./PersonalityAgent');
const NFTPerformanceService = require('./NFTPerformanceService');
const WriteOperationsService = require('./WriteOperationsService');
const AgentForumEngagementService = require('./AgentForumEngagementService');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { decrypt, encrypt } = require('../utils/encryption');

class EngagementJobProcessor {
  constructor() {
    this.db = database;
    this.isRunning = false;
    this.nftPerformanceService = new NFTPerformanceService();
    this.engagementStats = {
      totalProcessed: 0,
      successfulEngagements: 0,
      failedEngagements: 0,
      lastRun: null
    };
    this.lastForumEngagementRun = null;
  }

  // Start all background jobs
  async start() {
    if (this.isRunning) {
      console.log('⚠️  Job processor already running');
      return;
    }

    try {
      // Ensure database is connected before starting
      console.log('🔌 Connecting to database...');
      await this.db.connect();
      console.log('✅ Database connected successfully');
      
      console.log('🚀 Starting SocialAI Engagement Job Processor...');
      this.isRunning = true;

      // Iqonga v1: scheduled content delivery only
      cron.schedule('*/5 * * * *', () => {
        this.processScheduledContent();
      });

      // Disabled for v1: topic engagement, mentions, performance metrics, NFT, daily content, agent forum
      // cron.schedule('0 */4 * * *', () => { this.processTopicBasedEngagement(); });
      // cron.schedule('0 */2 * * *', () => { this.processMentionsAndReplies(); });
      // cron.schedule('0 * * * *', () => { this.updatePerformanceMetrics(); });
      // cron.schedule('0 6 * * *', () => { this.nftPerformanceService.updateAllAgentPerformance(); });
      // cron.schedule('0 9 * * *', () => { this.generateDailyContent(); });
      // cron.schedule('0 2 * * *', () => { this.cleanupOldEngagements(); });
      // cron.schedule('* * * * *', () => { this.maybeRunAgentForumEngagement(); });

      console.log('✅ Iqonga v1 background jobs started (scheduled content only)');
      console.log('  - Scheduled content: Every 5 minutes');
      
    } catch (error) {
      console.error('❌ Failed to start JobProcessor:', error);
      this.isRunning = false;
      throw error;
    }
  }

  // Stop all background jobs
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Job processor not running');
      return;
    }

    console.log('🛑 Stopping SocialAI Engagement Job Processor...');
    this.isRunning = false;
    
    // Stop all cron jobs
    cron.getTasks().forEach(task => task.stop());
    
    console.log('✅ Background jobs stopped');
  }

  // Process topic-based engagement for all active agents
  async processTopicBasedEngagement() {
    if (!this.isRunning) return;

    // Check if engagement is allowed
    const canEngage = await WriteOperationsService.canEngage();
    if (!canEngage) {
      console.log('⏸️  Topic-based engagement is disabled by admin settings. Skipping.');
      return;
    }

    try {
      console.log('🔍 Processing topic-based engagement...');
      
      // Find all active agents with Twitter connections
      const activeAgents = await this.db.query(`
        SELECT 
          a.*,
          pc.access_token,
          pc.refresh_token,
          pc.username as twitter_username
        FROM ai_agents a
        JOIN platform_connections pc ON a.user_id = pc.user_id
        WHERE a.is_active = true 
          AND pc.platform = 'twitter'
          AND pc.connection_status = 'active'
          AND a.auto_reply_enabled = true
          AND a.last_activity > NOW() - INTERVAL '7 days'
      `);

      console.log(`📊 Found ${activeAgents.rows.length} active agents for engagement`);

      for (const agent of activeAgents.rows) {
        try {
          await this.processAgentTopicEngagement(agent);
        } catch (error) {
          console.error(`❌ Failed to process agent ${agent.id}:`, error);
          this.engagementStats.failedEngagements++;
        }
      }

      this.engagementStats.lastRun = new Date();
      console.log('✅ Topic-based engagement processing completed');
      
    } catch (error) {
      console.error('❌ Topic-based engagement processing failed:', error);
      logger.error('Topic-based engagement failed:', error);
    }
  }

  // Process Agent Forum engagement: agents with agent_forums enabled post and reply automatically (no human in the loop)
  async maybeRunAgentForumEngagement() {
    if (!this.isRunning) return;
    try {
      const row = await this.db.query(`
        SELECT config_value FROM system_config WHERE config_key = 'agent_forum_engagement_interval_minutes'
      `);
      const intervalMinutes = Math.max(1, parseInt(row.rows[0]?.config_value, 10) || 5);
      const now = Date.now();
      const lastRun = this.lastForumEngagementRun ? this.lastForumEngagementRun.getTime() : 0;
      if (now - lastRun >= intervalMinutes * 60 * 1000) {
        this.lastForumEngagementRun = new Date();
        await this.processAgentForumEngagement();
      }
    } catch (error) {
      logger.error('Agent Forum engagement schedule check failed:', error);
    }
  }

  async processAgentForumEngagement() {
    if (!this.isRunning) return;
    try {
      const result = await AgentForumEngagementService.runEngagementCycle();
      if (result.agentsProcessed > 0) {
        logger.info(`Agent Forum engagement: ${result.agentsProcessed} agents, ${result.postsCreated} posts, ${result.commentsCreated} comments`);
      }
    } catch (error) {
      logger.error('Agent Forum engagement failed:', error);
    }
  }

  // Process engagement for a specific agent
  async processAgentTopicEngagement(agent) {
    try {
      // Check if platform connection is rate-limited
      const platformConn = await this.db.query(`
        SELECT COALESCE(metadata, '{}'::jsonb) as metadata FROM platform_connections 
        WHERE user_id = $1 AND platform = 'twitter' AND connection_status = 'active'
      `, [agent.user_id]);
      
      if (platformConn.rows.length > 0 && platformConn.rows[0].metadata?.rate_limit_reset) {
        const resetTime = new Date(platformConn.rows[0].metadata.rate_limit_reset);
        if (resetTime > new Date()) {
          console.log(`⏳ Agent ${agent.id} is rate-limited until ${resetTime.toISOString()}. Skipping topic engagement.`);
          return;
        }
      }
      
      // Check daily engagement limits
      const todayEngagements = await this.db.query(`
        SELECT COUNT(*) as count
        FROM agent_engagements 
        WHERE agent_id = $1 
          AND DATE(created_at) = CURRENT_DATE
          AND engagement_type = 'topic_reply'
      `, [agent.id]);

      const dailyCount = parseInt(todayEngagements.rows[0].count);
      const maxDaily = agent.max_replies_per_day || 20;

      if (dailyCount >= maxDaily) {
        console.log(`⚠️  Agent ${agent.id} has reached daily engagement limit (${dailyCount}/${maxDaily})`);
        return;
      }

      // Initialize Twitter service with decrypted tokens
      const decryptedAccessToken = decrypt(agent.access_token);
      const decryptedRefreshToken = agent.refresh_token ? decrypt(agent.refresh_token) : null;
      const twitterService = new TwitterService(decryptedAccessToken, decryptedRefreshToken);
      const personalityAgent = new PersonalityAgent(agent);

      // Validate and refresh token if needed
      try {
        const isTokenValid = await twitterService.validateToken();
        if (!isTokenValid && decryptedRefreshToken) {
          console.log(`🔄 Token expired for agent ${agent.id}, attempting refresh...`);
          const newTokens = await twitterService.refreshAccessToken();
          
          // Update database with new tokens
          const { encrypt } = require('../utils/encryption');
          const encryptedNewAccessToken = encrypt(newTokens.accessToken);
          const encryptedNewRefreshToken = newTokens.refreshToken ? encrypt(newTokens.refreshToken) : null;
          
          await this.db.query(`
            UPDATE platform_connections 
            SET access_token = $1, refresh_token = $2, updated_at = NOW()
            WHERE user_id = $3 AND platform = 'twitter'
          `, [encryptedNewAccessToken, encryptedNewRefreshToken, agent.user_id]);
          
          console.log(`✅ Token refreshed for agent ${agent.id}`);
        }
      } catch (tokenError) {
        // Check if it's a rate limit error (429)
        if (tokenError.code === 429 || (tokenError.rateLimit && tokenError.rateLimit.remaining === 0)) {
          const resetTime = tokenError.rateLimit?.reset 
            ? new Date(tokenError.rateLimit.reset * 1000) 
            : new Date(Date.now() + 15 * 60 * 1000); // Default to 15 minutes from now
          
          console.log(`⏳ Rate limit hit for agent ${agent.id} during token validation. Resets at ${resetTime.toISOString()}. Skipping topic engagement.`);
          
          // Mark the platform connection as rate-limited
          await this.db.query(`
            UPDATE platform_connections 
            SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('rate_limit_reset', $1::text, 'rate_limited_at', NOW()::text)
            WHERE user_id = $2 AND platform = 'twitter'
          `, [resetTime.toISOString(), agent.user_id]);
          
          return; // Skip this agent
        }
        
        // Check for invalid refresh token errors
        if (tokenError.message && (
          tokenError.message.includes('Cannot read properties') ||
          tokenError.message.includes('Invalid refresh token') ||
          tokenError.message.includes('Token refresh failed')
        )) {
          console.error(`❌ Token refresh failed for agent ${agent.id}: Invalid refresh token. User needs to reconnect.`);
          // Mark agent as needing reconnection
          await this.db.query(`
            UPDATE platform_connections 
            SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('needs_reconnect', true, 'last_error', $1::text)
            WHERE user_id = $2 AND platform = 'twitter'
          `, [tokenError.message, agent.user_id]);
          return; // Skip this agent
        }
        
        console.error(`❌ Token validation/refresh failed for agent ${agent.id}:`, tokenError.message);
        return; // Skip this agent if token issues persist
      }

      // Find relevant tweets to engage with using TwitterAPI.io (read operation)
      let relevantTweets;
      try {
        relevantTweets = await this.retryWithBackoff(async () => {
          // Use UnifiedTwitterService for reads (TwitterAPI.io)
          return await unifiedTwitterService.findRelevantTweets(agent, 10);
        });
      } catch (error) {
        if (error.code === 429) {
          console.log(`⏳ Rate limit hit for agent ${agent.id}, skipping topic engagement`);
          return;
        }
        throw error;
      }
      console.log(`🔍 Found ${relevantTweets.length} relevant tweets for agent ${agent.id} (via TwitterAPI.io)`);

      let engagementsProcessed = 0;
      const maxEngagementsPerRun = Math.min(2, maxDaily - dailyCount); // Reduced from 3 to 2

      for (const tweet of relevantTweets) {
        if (engagementsProcessed >= maxEngagementsPerRun) break;

        try {
          // Check if we should engage with this tweet
          const engagementDecision = await personalityAgent.shouldEngageWithTweet(tweet, agent);
          
          if (engagementDecision.shouldEngage) {
            console.log(`💬 Agent ${agent.id} engaging with tweet ${tweet.id} (${engagementDecision.priority} priority)`);
            
            // Generate contextual reply
            const reply = await personalityAgent.generateContent({
              type: 'reply',
              platform: 'twitter',
              originalTweet: tweet
            });

            if (reply) {
              // Check if replies are allowed
              const canReply = await WriteOperationsService.canReply();
              if (!canReply) {
                console.log(`⏸️  Replies are disabled by admin settings. Skipping reply to tweet ${tweet.id}.`);
                continue;
              }

              // Post reply with retry logic using Official Twitter API (write operation)
              const replyId = await this.retryWithBackoff(async () => {
                return await unifiedTwitterService.replyToTweet(tweet.id, reply);
              });
              
              // Log engagement
              await this.db.query(`
                INSERT INTO agent_engagements 
                (agent_id, tweet_id, reply_content, engagement_type, engagement_score, created_at)
                VALUES ($1, $2, $3, 'topic_reply', $4, NOW())
              `, [agent.id, tweet.id, reply, this.calculateEngagementScore(engagementDecision)]);

              // Update agent stats
              await this.db.query(`
                UPDATE ai_agents 
                SET total_replies_sent = total_replies_sent + 1,
                    last_activity = NOW()
                WHERE id = $1
              `, [agent.id]);

              engagementsProcessed++;
              this.engagementStats.successfulEngagements++;
              
              console.log(`✅ Successfully engaged with tweet ${tweet.id}`);
              
              // Rate limiting - wait between engagements (increased to 2 minutes to reduce API calls)
              await this.delay(120000); // 2 minutes (120 seconds)
            }
          }
        } catch (error) {
          if (error.code === 429) {
            console.log(`⏳ Rate limit hit for agent ${agent.id}, stopping topic engagement`);
            break;
          }
          console.error(`❌ Failed to engage with tweet ${tweet.id}:`, error);
          this.engagementStats.failedEngagements++;
        }
      }

      this.engagementStats.totalProcessed += relevantTweets.length;
      
    } catch (error) {
      console.error(`❌ Failed to process agent ${agent.id} topic engagement:`, error);
      throw error;
    }
  }

  // Process mentions and replies to agent tweets
  async processMentionsAndReplies() {
    if (!this.isRunning) return;

    // Check if replying to mentions is allowed
    const canReplyToMentions = await WriteOperationsService.canReplyToMentions();
    if (!canReplyToMentions) {
      console.log('⏸️  Replies to mentions are disabled by admin settings. Skipping.');
      return;
    }

    try {
      console.log('📨 Processing mentions and replies...');
      
      // Find all active agents with Twitter connections AND auto-reply enabled
      // Exclude agents that are currently rate-limited
      const activeAgents = await this.db.query(`
        SELECT 
          a.*,
          pc.access_token,
          pc.refresh_token,
          COALESCE(pc.metadata, '{}'::jsonb) as pc_metadata
        FROM ai_agents a
        JOIN platform_connections pc ON a.user_id = pc.user_id
        WHERE a.is_active = true 
          AND pc.platform = 'twitter'
          AND pc.connection_status = 'active'
          AND a.auto_reply_enabled = true
          AND a.reply_to_mentions = true
          AND (
            COALESCE(pc.metadata, '{}'::jsonb)->>'rate_limit_reset' IS NULL 
            OR (COALESCE(pc.metadata, '{}'::jsonb)->>'rate_limit_reset')::timestamp < NOW()
          )
      `);

      console.log(`🔍 Found ${activeAgents.rows.length} agents with auto-reply enabled`);

      for (const agent of activeAgents.rows) {
        try {
          await this.processAgentMentionsAndReplies(agent);
        } catch (error) {
          console.error(`❌ Failed to process agent ${agent.id} mentions:`, error);
        }
      }

      console.log('✅ Mentions and replies processing completed');
      
    } catch (error) {
      console.error('❌ Mentions and replies processing failed:', error);
      logger.error('Mentions processing failed:', error);
    }
  }

  // Process mentions and replies for a specific agent
  async processAgentMentionsAndReplies(agent) {
    try {
      // Check if platform connection is rate-limited
      if (agent.pc_metadata?.rate_limit_reset) {
        const resetTime = new Date(agent.pc_metadata.rate_limit_reset);
        if (resetTime > new Date()) {
          console.log(`⏳ Agent ${agent.id} is rate-limited until ${resetTime.toISOString()}. Skipping mentions/replies.`);
          return;
        }
      }
      
      // Initialize Twitter service with decrypted tokens
      const decryptedAccessToken = decrypt(agent.access_token);
      const decryptedRefreshToken = agent.refresh_token ? decrypt(agent.refresh_token) : null;
      const twitterService = new TwitterService(decryptedAccessToken, decryptedRefreshToken);
      const personalityAgent = new PersonalityAgent(agent);

      // Validate and refresh token if needed
      try {
        const isTokenValid = await twitterService.validateToken();
        if (!isTokenValid && decryptedRefreshToken) {
          console.log(`🔄 Token expired for agent ${agent.id}, attempting refresh...`);
          const newTokens = await twitterService.refreshAccessToken();
          
          // Update database with new tokens
          const { encrypt } = require('../utils/encryption');
          const encryptedNewAccessToken = encrypt(newTokens.accessToken);
          const encryptedNewRefreshToken = newTokens.refreshToken ? encrypt(newTokens.refreshToken) : null;
          
          await this.db.query(`
            UPDATE platform_connections 
            SET access_token = $1, refresh_token = $2, updated_at = NOW()
            WHERE user_id = $3 AND platform = 'twitter'
          `, [encryptedNewAccessToken, encryptedNewRefreshToken, agent.user_id]);
          
          console.log(`✅ Token refreshed for agent ${agent.id}`);
        }
      } catch (tokenError) {
        // Check if it's a rate limit error (429)
        if (tokenError.code === 429 || (tokenError.rateLimit && tokenError.rateLimit.remaining === 0)) {
          const resetTime = tokenError.rateLimit?.reset 
            ? new Date(tokenError.rateLimit.reset * 1000) 
            : new Date(Date.now() + 15 * 60 * 1000); // Default to 15 minutes from now
          
          console.log(`⏳ Rate limit hit for agent ${agent.id} during token validation (mentions). Resets at ${resetTime.toISOString()}. Skipping.`);
          
          // Mark the platform connection as rate-limited
          await this.db.query(`
            UPDATE platform_connections 
            SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('rate_limit_reset', $1::text, 'rate_limited_at', NOW()::text)
            WHERE user_id = $2 AND platform = 'twitter'
          `, [resetTime.toISOString(), agent.user_id]);
          
          return; // Skip this agent
        }
        
        // Check for invalid refresh token errors
        if (tokenError.message && (
          tokenError.message.includes('Cannot read properties') ||
          tokenError.message.includes('Invalid refresh token') ||
          tokenError.message.includes('Token refresh failed')
        )) {
          console.error(`❌ Token refresh failed for agent ${agent.id} (mentions): Invalid refresh token. User needs to reconnect.`);
          // Mark agent as needing reconnection
          await this.db.query(`
            UPDATE platform_connections 
            SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('needs_reconnect', true, 'last_error', $1::text)
            WHERE user_id = $2 AND platform = 'twitter'
          `, [tokenError.message, agent.user_id]);
          return; // Skip this agent
        }
        
        console.error(`❌ Token validation/refresh failed for agent ${agent.id}:`, tokenError.message);
        return; // Skip this agent if token issues persist
      }

      // Get recent mentions with rate limiting using TwitterAPI.io (read operation)
      let mentions;
      try {
        mentions = await this.retryWithBackoff(async () => {
          // Use UnifiedTwitterService for reads (TwitterAPI.io)
          return await unifiedTwitterService.getRecentMentions(20);
        });
      } catch (error) {
        if (error.code === 429) {
          console.log(`⏳ Rate limit hit for agent ${agent.id}, skipping mentions processing`);
          return;
        }
        throw error;
      }
      console.log(`📨 Retrieved ${mentions.length} mentions via TwitterAPI.io`);
      
      // Get agent's Twitter user ID and username to filter out own tweets
      let agentTwitterUserId;
      let agentTwitterUsername;
      try {
        const me = await twitterService.client.v2.me();
        agentTwitterUserId = me.data.id;
        agentTwitterUsername = me.data.username;
        console.log(`🔍 Agent ${agent.id} Twitter ID: ${agentTwitterUserId}, Username: @${agentTwitterUsername}`);
      } catch (error) {
        console.error(`❌ Failed to get agent's Twitter user ID:`, error);
        agentTwitterUserId = null;
        agentTwitterUsername = null;
      }
      
      // Filter mentions we haven't replied to yet AND exclude agent's own tweets
      const newMentions = [];
      for (const mention of mentions) {
        // Skip if this is the agent's own tweet (check both user ID and username)
        if ((agentTwitterUserId && mention.author_id === agentTwitterUserId) ||
            (agentTwitterUsername && mention.author?.username === agentTwitterUsername)) {
          console.log(`⏭️ Skipping agent's own tweet: ${mention.id} (author: @${mention.author?.username})`);
          continue;
        }
        
        // Skip if we've already replied to this mention
        const existingReply = await this.db.query(`
          SELECT id FROM agent_engagements 
          WHERE agent_id = $1 AND tweet_id = $2 AND engagement_type = 'mention_reply'
        `, [agent.id, mention.id]);

        if (existingReply.rows.length === 0) {
          console.log(`📝 Adding mention: "${mention.text.substring(0, 50)}..." from @${mention.author?.username}`);
          newMentions.push(mention);
        } else {
          console.log(`⏭️ Skipping already replied mention: ${mention.id}`);
        }
      }

      console.log(`📨 Found ${newMentions.length} new mentions for agent ${agent.id}`);

      // Process up to 3 new mentions per agent per run (reduced from 5)
      for (const mention of newMentions.slice(0, 3)) {
        try {
          console.log(`🤖 Generating reply to: "${mention.text.substring(0, 100)}..." from @${mention.author?.username}`);
          
          // Generate reply
          const replyContent = await personalityAgent.generateContent({
            type: 'reply',
            platform: 'twitter',
            originalTweet: mention
          });
          
          console.log(`💬 Generated reply: "${replyContent}"`);

          if (replyContent) {
            // Check if replies are allowed
            const canReply = await WriteOperationsService.canReply();
            if (!canReply) {
              console.log(`⏸️  Replies are disabled by admin settings. Skipping reply to mention ${mention.id}.`);
              continue;
            }

            // Post reply with retry logic using Official Twitter API (write operation)
            const replyId = await this.retryWithBackoff(async () => {
              return await unifiedTwitterService.replyToTweet(mention.id, replyContent);
            });
            
            // Log engagement
            await this.db.query(`
              INSERT INTO agent_engagements 
              (agent_id, tweet_id, reply_content, engagement_type, created_at)
              VALUES ($1, $2, $3, 'mention_reply', NOW())
            `, [agent.id, mention.id, replyContent]);

            // Update agent stats
            await this.db.query(`
              UPDATE ai_agents 
              SET total_replies_sent = total_replies_sent + 1,
                  last_activity = NOW()
              WHERE id = $1
            `, [agent.id]);

            console.log(`✅ Replied to mention for agent ${agent.id}: ${replyId}`);
            
            // Rate limiting - wait 2 minutes between replies (increased to reduce API calls)
            await this.delay(120000); // 2 minutes (120 seconds)
          }
        } catch (error) {
          if (error.code === 429) {
            console.log(`⏳ Rate limit hit for agent ${agent.id}, stopping mentions processing`);
            break;
          }
          console.error(`❌ Failed to reply to mention ${mention.id}:`, error);
        }
      }

      // Process replies to agent's tweets with rate limiting
      await this.processRepliesToAgentTweets(agent, twitterService, personalityAgent);
      
    } catch (error) {
      console.error(`❌ Failed to process agent ${agent.id} mentions:`, error);
      throw error;
    }
  }

  // Process replies to agent's tweets
  async processRepliesToAgentTweets(agent, twitterService, personalityAgent) {
    try {
      // Get agent's recent tweets
      const agentTweets = await this.db.query(`
        SELECT platform_post_id, content_text
        FROM generated_content 
        WHERE agent_id = $1 
          AND platform = 'twitter' 
          AND status = 'published'
          AND published_at > NOW() - INTERVAL '24 hours'
        ORDER BY published_at DESC
        LIMIT 5
      `, [agent.id]);

      for (const tweet of agentTweets.rows) {
        try {
          // Get replies to this tweet with rate limiting
          let replies;
          try {
            replies = await this.retryWithBackoff(async () => {
              return await twitterService.getRepliesToAgentTweets(tweet.platform_post_id);
            });
          } catch (error) {
            if (error.code === 429) {
              console.log(`⏳ Rate limit hit for agent ${agent.id}, skipping replies processing`);
              return;
            }
            throw error;
          }
          
          // Filter replies we haven't responded to
          for (const reply of replies.slice(0, 2)) { // Reduced to 2 replies per tweet
            const existingResponse = await this.db.query(`
              SELECT id FROM agent_engagements 
              WHERE agent_id = $1 AND tweet_id = $2 AND engagement_type = 'reply_to_reply'
            `, [agent.id, reply.id]);

            if (existingResponse.rows.length === 0) {
              // Analyze conversation context
              const conversationTweets = [reply];
              const sentiment = await personalityAgent.analyzeConversationSentiment(conversationTweets);
              const tone = await personalityAgent.determineConversationTone(conversationTweets);

              // Generate contextual reply
              const responseContent = await personalityAgent.generateContent({
                type: 'conversation_reply',
                platform: 'twitter',
                originalTweet: reply,
                conversationContext: {
                  previousReplies: conversationTweets,
                  conversationTone: tone,
                  userSentiment: sentiment
                }
              });

              if (responseContent) {
                // Check if replies are allowed
                const canReply = await WriteOperationsService.canReply();
                if (!canReply) {
                  console.log(`⏸️  Replies are disabled by admin settings. Skipping reply to reply ${reply.id}.`);
                  continue;
                }

                // Post reply with retry logic
                const responseId = await this.retryWithBackoff(async () => {
                  return await twitterService.replyToTweet(reply.id, responseContent);
                });
                
                // Log engagement
                await this.db.query(`
                  INSERT INTO agent_engagements 
                  (agent_id, tweet_id, reply_content, engagement_type, created_at)
                  VALUES ($1, $2, $3, 'reply_to_reply', NOW())
                `, [agent.id, reply.id, responseContent]);

                console.log(`✅ Replied to reply for agent ${agent.id}: ${responseId}`);
                
                // Rate limiting - wait 2 minutes between replies (increased to reduce API calls)
                await this.delay(120000); // 2 minutes (120 seconds)
              }
            }
          }
        } catch (error) {
          if (error.code === 429) {
            console.log(`⏳ Rate limit hit for agent ${agent.id}, stopping replies processing`);
            break;
          }
          console.error(`❌ Failed to process replies to tweet ${tweet.platform_post_id}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to process replies to agent tweets:`, error);
    }
  }

  // Process scheduled content for publishing
  async processScheduledContent() {
    if (!this.isRunning) return;

    // Check if posts are allowed
    const canPost = await WriteOperationsService.canPost();
    if (!canPost) {
      console.log('⏸️  Scheduled posts are disabled by admin settings. Skipping.');
      return;
    }

    try {
      // Check if the scheduled_for column exists, if not, skip this process
      const columnCheck = await this.db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'generated_content' 
        AND column_name = 'scheduled_for'
      `);

      if (columnCheck.rows.length === 0) {
        console.log('⚠️  scheduled_for column not found in generated_content table, skipping scheduled content processing');
        return;
      }

      // Check for rate-limited content that can now be retried
      await this.db.query(`
        UPDATE generated_content 
        SET status = 'scheduled',
            updated_at = NOW(),
            metadata = metadata - 'rate_limit_reset'
        WHERE status = 'rate_limited'
        AND (metadata->>'rate_limit_reset')::timestamp < NOW()
      `);

      const scheduledContent = await this.db.query(`
        SELECT gc.*, a.*, pc.access_token, pc.refresh_token, 
               COALESCE(pc.metadata, '{}'::jsonb) as pc_metadata,
               COALESCE(gc.metadata, '{}'::jsonb) as gc_metadata
        FROM generated_content gc
        JOIN ai_agents a ON gc.agent_id = a.id
        JOIN platform_connections pc ON a.user_id = pc.user_id AND gc.platform = pc.platform
        WHERE gc.status = 'scheduled' 
        AND gc.scheduled_for <= NOW()
        AND pc.connection_status = 'active'
        AND a.auto_reply_enabled = true
        AND (
          COALESCE(pc.metadata, '{}'::jsonb)->>'rate_limit_reset' IS NULL 
          OR (COALESCE(pc.metadata, '{}'::jsonb)->>'rate_limit_reset')::timestamp < NOW()
        )
        AND (
          COALESCE(gc.metadata, '{}'::jsonb)->>'rate_limit_reset' IS NULL 
          OR (COALESCE(gc.metadata, '{}'::jsonb)->>'rate_limit_reset')::timestamp < NOW()
        )
        LIMIT 50
      `);

      console.log(`📅 Found ${scheduledContent.rows.length} scheduled content items from agents with auto-reply enabled`);

      for (const content of scheduledContent.rows) {
        try {
          await this.publishContent(content);
        } catch (error) {
          // Don't mark as failed if it's rate-limited (already handled in publishContent)
          if (error.code === 429 || (error.rateLimit && error.rateLimit.remaining === 0)) {
            console.log(`⏳ Rate limit error for content ${content.id}, already handled. Skipping.`);
            continue;
          }
          
          console.error(`❌ Failed to publish content ${content.id}:`, error.message);
          
          // Mark as failed only for non-rate-limit errors
          await this.db.query(`
            UPDATE generated_content 
            SET status = 'failed', updated_at = NOW()
            WHERE id = $1
          `, [content.id]);
        }
      }

    } catch (error) {
      console.error('❌ Scheduled content processing failed:', error);
    }
  }

  // Publish content to social platform
  async publishContent(content) {
    // Check if content is already rate-limited (from gc_metadata)
    if (content.gc_metadata?.rate_limit_reset) {
      const resetTime = new Date(content.gc_metadata.rate_limit_reset);
      if (resetTime > new Date()) {
        console.log(`⏳ Content ${content.id} is rate-limited until ${resetTime.toISOString()}. Skipping.`);
        return;
      }
    }
    
    // Check if platform connection is rate-limited (from pc_metadata)
    if (content.pc_metadata?.rate_limit_reset) {
      const resetTime = new Date(content.pc_metadata.rate_limit_reset);
      if (resetTime > new Date()) {
        console.log(`⏳ Platform connection for content ${content.id} is rate-limited until ${resetTime.toISOString()}. Skipping.`);
        return;
      }
    }

    // Check admin settings for write operations
    const canPost = await WriteOperationsService.canPost();
    if (!canPost) {
      console.log(`⏸️  Posts are disabled by admin settings. Cancelling content ${content.id}.`);
      await this.db.query(`
        UPDATE generated_content 
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1
      `, [content.id]);
      return;
    }
    
    let platformService;
    
    switch (content.platform) {
      case 'twitter':
        // Decrypt tokens for Twitter service
        const decryptedAccessToken = decrypt(content.access_token);
        const decryptedRefreshToken = content.refresh_token ? decrypt(content.refresh_token) : null;
        
        // Use UnifiedTwitterService: TwitterAPI.io for reads, Official API for writes
        const twitterAPIIOKey = process.env.TWITTERAPIIO_API_KEY;
        platformService = new UnifiedTwitterService(decryptedAccessToken, twitterAPIIOKey, decryptedRefreshToken);
        
        // For token validation, we still need the base TwitterService
        const twitterServiceForValidation = new TwitterService(decryptedAccessToken, decryptedRefreshToken);
        
        // Validate and refresh token if needed
        try {
          // Don't try to validate/refresh if we're rate-limited (double-check)
          if (content.pc_metadata?.rate_limit_reset || content.gc_metadata?.rate_limit_reset) {
            const resetTime = content.pc_metadata?.rate_limit_reset 
              ? new Date(content.pc_metadata.rate_limit_reset)
              : new Date(content.gc_metadata.rate_limit_reset);
            if (resetTime > new Date()) {
              console.log(`⏳ Skipping token validation for content ${content.id} - rate-limited until ${resetTime.toISOString()}`);
              return;
            }
          }
          
          const isTokenValid = await twitterServiceForValidation.validateToken();
          if (!isTokenValid && decryptedRefreshToken) {
            console.log(`🔄 Token expired for content ${content.id}, attempting refresh...`);
            
            try {
              const newTokens = await twitterServiceForValidation.refreshAccessToken();
            
              // Update database with new tokens
              const { encrypt } = require('../utils/encryption');
              const encryptedNewAccessToken = encrypt(newTokens.accessToken);
              const encryptedNewRefreshToken = newTokens.refreshToken ? encrypt(newTokens.refreshToken) : null;
              
              await this.db.query(`
                UPDATE platform_connections 
                SET access_token = $1, refresh_token = $2, updated_at = NOW()
                WHERE user_id = $3 AND platform = 'twitter'
              `, [encryptedNewAccessToken, encryptedNewRefreshToken, content.user_id]);
              
              // Update UnifiedTwitterService with new tokens
              platformService = new UnifiedTwitterService(newTokens.accessToken, twitterAPIIOKey, newTokens.refreshToken);
              
              console.log(`✅ Token refreshed for content ${content.id}`);
            } catch (refreshError) {
              // Check if it's a rate limit error (429) - don't try to refresh when rate-limited
              if (refreshError.code === 429 || (refreshError.rateLimit && refreshError.rateLimit.remaining === 0)) {
                const resetTime = refreshError.rateLimit?.reset 
                  ? new Date(refreshError.rateLimit.reset * 1000) 
                  : new Date(Date.now() + 15 * 60 * 1000);
                
                console.log(`⏳ Rate limit hit during token refresh for content ${content.id} (Official Twitter API). Resets at ${resetTime.toISOString()}.`);
                
                // Mark content as rate-limited
                await this.db.query(`
                  UPDATE generated_content 
                  SET status = 'rate_limited', 
                      updated_at = NOW(),
                      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('rate_limit_reset', $1::text)
                  WHERE id = $2
                `, [resetTime.toISOString(), content.id]);
                
                // Mark platform connection as rate-limited
                await this.db.query(`
                  UPDATE platform_connections 
                  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('rate_limit_reset', $1::text, 'rate_limited_at', NOW()::text)
                  WHERE user_id = $2 AND platform = 'twitter'
                `, [resetTime.toISOString(), content.user_id]);
                
                return; // Skip this content
              }
              
              // If refresh fails with "Cannot read properties" or "Invalid refresh token", the refresh token might be invalid
              if (refreshError.message && (
                refreshError.message.includes('Cannot read properties') ||
                refreshError.message.includes('Invalid refresh token') ||
                refreshError.message.includes('Token refresh failed')
              )) {
                console.error(`❌ Token refresh failed for content ${content.id}: ${refreshError.message}. User needs to reconnect Twitter account.`);
                // Mark as failed - user will need to reconnect their Twitter account
                await this.db.query(`
                  UPDATE generated_content 
                  SET status = 'failed', 
                      updated_at = NOW(),
                      generation_error = $1
                  WHERE id = $2
                `, [`Token refresh failed: ${refreshError.message}. Please reconnect your Twitter account.`, content.id]);
                return;
              }
              
              // Re-throw other errors to be handled by outer catch
              throw refreshError;
            }
          }
        } catch (tokenError) {
          // Check if it's a rate limit error (429)
          if (tokenError.code === 429 || (tokenError.rateLimit && tokenError.rateLimit.remaining === 0)) {
            const resetTime = tokenError.rateLimit?.reset 
              ? new Date(tokenError.rateLimit.reset * 1000) 
              : new Date(Date.now() + 15 * 60 * 1000); // Default to 15 minutes from now
            
            console.log(`⏳ Rate limit hit for content ${content.id} (Official Twitter API - write operations). Resets at ${resetTime.toISOString()}. Skipping until then.`);
            
            // Mark content as rate-limited with retry_after timestamp
            await this.db.query(`
              UPDATE generated_content 
              SET status = 'rate_limited', 
                  updated_at = NOW(),
                  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('rate_limit_reset', $1::text)
              WHERE id = $2
            `, [resetTime.toISOString(), content.id]);
            
            // Also mark the platform connection as rate-limited
            await this.db.query(`
              UPDATE platform_connections 
              SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('rate_limit_reset', $1::text, 'rate_limited_at', NOW()::text)
              WHERE user_id = $2 AND platform = 'twitter'
            `, [resetTime.toISOString(), content.user_id]);
            
            return; // Skip this content
          }
          
          // Check if it's the "Cannot read properties" error (likely invalid refresh token structure)
          if (tokenError.message && tokenError.message.includes('Cannot read properties')) {
            console.error(`❌ Token refresh failed for content ${content.id}: Invalid refresh token response structure. Marking as failed.`);
            
            // Mark content as failed since we can't refresh the token
            await this.db.query(`
              UPDATE generated_content 
              SET status = 'failed', updated_at = NOW()
              WHERE id = $1
            `, [content.id]);
            
            return;
          }
          
          console.error(`❌ Token validation/refresh failed for content ${content.id}:`, tokenError.message);
          // Skip this content if token issues persist
          return;
        }
        break;
      default:
        throw new Error(`Unsupported platform: ${content.platform}`);
    }

    let postId;

    try {
      if (content.content_type === 'reply' && content.parent_post_id) {
        // Check if replies are allowed
        const canReply = await WriteOperationsService.canReply();
        if (!canReply) {
          console.log(`⏸️  Replies are disabled by admin settings. Cancelling reply content ${content.id}.`);
          await this.db.query(`
            UPDATE generated_content 
            SET status = 'cancelled', updated_at = NOW()
            WHERE id = $1
          `, [content.id]);
          return;
        }
        postId = await platformService.replyToTweet(content.parent_post_id, content.content_text);
      } else {
        postId = await platformService.postTweet(content.content_text, content.media_urls);
      }
    } catch (postError) {
      // Check if it's a rate limit error (429)
      if (postError.code === 429 || (postError.rateLimit && postError.rateLimit.remaining === 0)) {
        const resetTime = postError.rateLimit?.reset 
          ? new Date(postError.rateLimit.reset * 1000) 
          : new Date(Date.now() + 15 * 60 * 1000); // Default to 15 minutes from now
        
        console.log(`⏳ Rate limit hit when posting content ${content.id} (Official Twitter API - write operations). Resets at ${resetTime.toISOString()}. Skipping until then.`);
        
        // Mark content as rate-limited with retry_after timestamp
        await this.db.query(`
          UPDATE generated_content 
          SET status = 'rate_limited', 
              updated_at = NOW(),
              metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('rate_limit_reset', $1::text)
          WHERE id = $2
        `, [resetTime.toISOString(), content.id]);
        
        // Also mark the platform connection as rate-limited
        await this.db.query(`
          UPDATE platform_connections 
          SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('rate_limit_reset', $1::text, 'rate_limited_at', NOW()::text)
          WHERE user_id = $2 AND platform = 'twitter'
        `, [resetTime.toISOString(), content.user_id]);
        
        throw postError; // Re-throw to be caught by outer catch
      }
      throw postError; // Re-throw other errors
    }

    // Update database
    await this.db.query(`
      UPDATE generated_content 
      SET status = 'published', published_at = NOW(), platform_post_id = $1
      WHERE id = $2
    `, [postId, content.id]);

    // Update agent stats
    await this.db.query(`
      UPDATE ai_agents 
      SET total_posts_generated = total_posts_generated + 1,
          last_activity = NOW()
      WHERE id = $1
    `, [content.agent_id]);

    console.log(`✅ Published content ${content.id} to ${content.platform}: ${postId}`);
  }

  // Update performance metrics from platform APIs
  async updatePerformanceMetrics() {
    if (!this.isRunning) return;

    try {
      console.log('📊 Updating performance metrics...');

      const recentContent = await this.db.query(`
        SELECT gc.*, pc.access_token, pc.refresh_token
        FROM generated_content gc
        JOIN ai_agents a ON gc.agent_id = a.id
        JOIN platform_connections pc ON a.user_id = pc.user_id AND gc.platform = pc.platform
        WHERE gc.status = 'published' 
        AND gc.published_at > NOW() - INTERVAL '24 hours'
        AND gc.platform_post_id IS NOT NULL
        AND pc.connection_status = 'active'
        AND a.auto_reply_enabled = true
      `);

      console.log(`📊 Found ${recentContent.rows.length} published content items from agents with auto-reply enabled`);

      for (const content of recentContent.rows) {
        try {
          let metrics;

          switch (content.platform) {
            case 'twitter':
              // Decrypt tokens for Twitter service
              const decryptedAccessToken = decrypt(content.access_token);
              const decryptedRefreshToken = content.refresh_token ? decrypt(content.refresh_token) : null;
              
              // Use UnifiedTwitterService: TwitterAPI.io for reads, Official API for writes
              const twitterAPIIOKey = process.env.TWITTERAPIIO_API_KEY;
              const unifiedTwitterService = new UnifiedTwitterService(decryptedAccessToken, twitterAPIIOKey, decryptedRefreshToken);
              
              // For token validation, we still need the base TwitterService
              const twitterService = new TwitterService(decryptedAccessToken, decryptedRefreshToken);
          
          // Validate and refresh token if needed
          try {
            const isTokenValid = await twitterService.validateToken();
            if (!isTokenValid && decryptedRefreshToken) {
              console.log(`🔄 Token expired for content ${content.id}, attempting refresh...`);
              const newTokens = await twitterService.refreshAccessToken();
              
              // Update database with new tokens
              const { encrypt } = require('../utils/encryption');
              const encryptedNewAccessToken = encrypt(newTokens.accessToken);
              const encryptedNewRefreshToken = newTokens.refreshToken ? encrypt(newTokens.refreshToken) : null;
              
              await this.db.query(`
                UPDATE platform_connections 
                SET access_token = $1, refresh_token = $2, updated_at = NOW()
                WHERE user_id = $3 AND platform = 'twitter'
              `, [encryptedNewAccessToken, encryptedNewRefreshToken, content.user_id]);
              
              console.log(`✅ Token refreshed for content ${content.id}`);
            }
          } catch (tokenError) {
            // Check if it's a rate limit error (429)
            if (tokenError.code === 429 || (tokenError.rateLimit && tokenError.rateLimit.remaining === 0)) {
              const resetTime = tokenError.rateLimit?.reset 
                ? new Date(tokenError.rateLimit.reset * 1000) 
                : new Date(Date.now() + 15 * 60 * 1000);
              
              console.log(`⏳ Rate limit hit for content ${content.id} during metrics fetch. Resets at ${resetTime.toISOString()}. Skipping.`);
              
              // Mark content as rate-limited
              await this.db.query(`
                UPDATE generated_content 
                SET status = 'rate_limited', 
                    updated_at = NOW(),
                    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('rate_limit_reset', $1::text)
                WHERE id = $2
              `, [resetTime.toISOString(), content.id]);
              
              return; // Skip this content
            }
            
            // Check for invalid refresh token errors
            if (tokenError.message && (
              tokenError.message.includes('Cannot read properties') ||
              tokenError.message.includes('Invalid refresh token') ||
              tokenError.message.includes('Token refresh failed')
            )) {
              console.error(`❌ Token refresh failed for content ${content.id}: Invalid refresh token. User needs to reconnect.`);
              // Mark as failed
              await this.db.query(`
                UPDATE generated_content 
                SET status = 'failed', 
                    updated_at = NOW(),
                    generation_error = $1
                WHERE id = $2
              `, [`Token refresh failed: ${tokenError.message}. Please reconnect your Twitter account.`, content.id]);
              return; // Skip this content
            }
            
            console.error(`❌ Token validation/refresh failed for content ${content.id}:`, tokenError.message);
            // Skip this content if token issues persist
            return;
          }
          
          metrics = await twitterService.getTweetMetrics(content.platform_post_id);
              break;
            default:
              continue;
          }

          if (metrics) {
            const engagementRate = ((metrics.likes + metrics.retweets + metrics.replies) / 
                                   Math.max(metrics.impressions || 1, 1)) * 100;

            // Update content metrics
            await this.db.query(`
              UPDATE generated_content 
              SET likes_count = $1, retweets_count = $2, replies_count = $3,
                  engagement_rate = $4, is_viral = $5
              WHERE id = $6
            `, [
              metrics.likes || 0,
              metrics.retweets || 0,
              metrics.replies || 0,
              engagementRate,
              (metrics.likes + metrics.retweets + metrics.replies) > 1000,
              content.id
            ]);
          }
        } catch (error) {
          console.error(`❌ Failed to update metrics for content ${content.id}:`, error);
        }
      }

      // Update agent aggregate stats
      await this.db.query(`
        UPDATE ai_agents 
        SET average_engagement_rate = subquery.avg_engagement,
            viral_posts_count = subquery.viral_count
        FROM (
          SELECT agent_id, 
                 AVG(engagement_rate) as avg_engagement,
                 COUNT(CASE WHEN is_viral THEN 1 END) as viral_count
          FROM generated_content 
          WHERE status = 'published'
          GROUP BY agent_id
        ) AS subquery
        WHERE ai_agents.id = subquery.agent_id
      `);

      console.log('✅ Performance metrics updated');

    } catch (error) {
      console.error('❌ Performance metrics update failed:', error);
    }
  }

  // Generate daily content for active agents
  async generateDailyContent() {
    if (!this.isRunning) return;

    try {
      console.log('📝 Generating daily content...');

      const activeAgents = await this.db.query(`
        SELECT * FROM ai_agents 
        WHERE is_active = true 
        AND last_activity > NOW() - INTERVAL '7 days'
      `);

      for (const agent of activeAgents.rows) {
        try {
          // Get company knowledge for the agent
          const { CompanyKnowledgeService } = require('./CompanyKnowledgeService');
          const { CompanyAwarePersonalityAgent } = require('./CompanyAwarePersonalityAgent');
          
          const knowledgeService = new CompanyKnowledgeService();
          const companyKnowledge = await knowledgeService.getCompanyKnowledgeForAgent(agent.id);
          
          // Use company-aware agent if knowledge exists, otherwise fall back to regular agent
          let personalityAgent;
          if (companyKnowledge && companyKnowledge.companyProfile) {
            personalityAgent = new CompanyAwarePersonalityAgent(agent, companyKnowledge);
          } else {
            const { PersonalityAgent } = require('./PersonalityAgent');
            personalityAgent = new PersonalityAgent(agent);
          }
          
          // Generate 2-3 posts for the day
          const numPosts = Math.floor(Math.random() * 2) + 2; // 2-3 posts
          
          for (let i = 0; i < numPosts; i++) {
            const content = await personalityAgent.generateContent({
              type: 'original_post',
              platform: 'twitter',
              trends: await this.getTrendingTopics()
            });

            // Schedule throughout the day
            const scheduleTime = new Date();
            scheduleTime.setHours(9 + (i * 4)); // 9 AM, 1 PM, 5 PM
            scheduleTime.setMinutes(Math.floor(Math.random() * 60));

            // Save as scheduled content
            await this.db.query(`
              INSERT INTO generated_content 
              (agent_id, platform, content_type, content_text, scheduled_for, status, ai_model_used)
              VALUES ($1, 'twitter', 'original_post', $2, $3, 'scheduled', 'gpt-4')
            `, [agent.id, content, scheduleTime]);
          }

          console.log(`✅ Generated daily content for agent ${agent.id}`);
        } catch (error) {
          console.error(`❌ Failed to generate content for agent ${agent.id}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Daily content generation failed:', error);
    }
  }

  // Clean up old engagement data
  async cleanupOldEngagements() {
    if (!this.isRunning) return;

    try {
      console.log('🧹 Cleaning up old engagement data...');

      // Remove engagements older than 30 days
      const result = await this.db.query(`
        DELETE FROM agent_engagements 
        WHERE created_at < NOW() - INTERVAL '30 days'
      `);

      console.log(`✅ Cleaned up ${result.rowCount} old engagements`);

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  // Get engagement statistics
  getEngagementStats() {
    return {
      ...this.engagementStats,
      successRate: this.engagementStats.totalProcessed > 0 
        ? (this.engagementStats.successfulEngagements / this.engagementStats.totalProcessed * 100).toFixed(2)
        : 0
    };
  }

  // Helper methods
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  calculateEngagementScore(decision) {
    switch (decision.priority) {
      case 'high': return 0.9;
      case 'medium': return 0.7;
      case 'low': return 0.5;
      default: return 0.5;
    }
  }

  async getTrendingTopics() {
    // For now, return some common tech/AI topics
    // In production, you could integrate with Twitter's trending API or external services
    return [
      'AI', 'artificial intelligence', 'machine learning', 'tech', 'startup', 
      'productivity', 'innovation', 'blockchain', 'crypto', 'web3'
    ];
  }

  async retryWithBackoff(operation, maxRetries = 3, initialDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i); // Exponential backoff
          console.log(`Retrying in ${delay / 1000}s (Attempt ${i + 1}/${maxRetries})...`);
          await this.delay(delay);
        } else {
          console.error(`Max retries reached for operation. Error:`, error);
          throw error; // Re-throw the error after all retries fail
        }
      }
    }
  }
}

// Export singleton instance
const engagementJobProcessor = new EngagementJobProcessor();

module.exports = {
  EngagementJobProcessor,
  engagementJobProcessor
};
