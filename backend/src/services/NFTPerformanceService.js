const { SimpleSolanaService } = require('./SimpleSolanaService');
const database = require('../database/connection');

class NFTPerformanceService {
  constructor() {
    this.solanaService = new SimpleSolanaService();
  }

  // Update NFT performance for all agents with NFTs
  async updateAllAgentPerformance() {
    try {
      console.log('🔄 Starting NFT performance update...');
      
      // Get all agents with NFT mint addresses
      const agents = await database.query(`
        SELECT 
          a.id,
          a.nft_mint_address,
          a.name,
          a.platforms,
          a.specialization,
          COUNT(DISTINCT sp.id) as total_posts,
          COUNT(DISTINCT ae.id) as total_replies,
          AVG(ae.engagement_rate) as avg_engagement_rate,
          COUNT(CASE WHEN ae.engagement_rate > 1000 THEN 1 END) as viral_posts,
          EXTRACT(DAYS FROM NOW() - a.created_at) as days_active
        FROM ai_agents a
        LEFT JOIN scheduled_posts sp ON a.id = sp.agent_id
        LEFT JOIN agent_engagements ae ON a.id = ae.agent_id
        WHERE a.nft_mint_address IS NOT NULL
        GROUP BY a.id, a.nft_mint_address, a.name, a.platforms, a.specialization, a.created_at
      `);

      console.log(`📊 Found ${agents.length} agents with NFTs to update`);

      for (const agent of agents) {
        try {
          await this.updateAgentNFTPerformance(agent);
        } catch (error) {
          console.error(`❌ Failed to update NFT for agent ${agent.id}:`, error.message);
        }
      }

      console.log('✅ NFT performance update completed');
    } catch (error) {
      console.error('❌ NFT performance update failed:', error);
    }
  }

  // Update individual agent NFT performance
  async updateAgentNFTPerformance(agent) {
    try {
      const performanceStats = {
        totalPosts: parseInt(agent.total_posts) || 0,
        totalReplies: parseInt(agent.total_replies) || 0,
        avgEngagementRate: parseFloat(agent.avg_engagement_rate) || 0,
        reputationScore: this.calculateReputationScore(agent),
        evolutionStage: this.calculateEvolutionStage(agent),
        achievements: this.checkAchievements(agent),
        viralPosts: parseInt(agent.viral_posts) || 0,
        daysActive: parseInt(agent.days_active) || 0,
        platformsActive: agent.platforms ? agent.platforms.length : 1
      };

      // Update on-chain performance
      const txSignature = await this.solanaService.updateAgentPerformance(
        agent.nft_mint_address,
        performanceStats
      );

      // Update database with new performance data
      await database.query(`
        UPDATE ai_agents 
        SET 
          performance_stats = $1,
          evolution_stage = $2,
          achievements = $3,
          reputation_score = $4,
          updated_at = NOW()
        WHERE id = $5
      `, [
        JSON.stringify(performanceStats),
        performanceStats.evolutionStage,
        JSON.stringify(performanceStats.achievements),
        performanceStats.reputationScore,
        agent.id
      ]);

      console.log(`✅ Updated NFT performance for agent ${agent.name} (${agent.id})`);
      console.log(`   📈 Posts: ${performanceStats.totalPosts}, Engagement: ${performanceStats.avgEngagementRate}%`);
      console.log(`   🏆 Stage: ${performanceStats.evolutionStage}, Achievements: ${performanceStats.achievements.length}`);
      console.log(`   🔗 Transaction: ${txSignature}`);

    } catch (error) {
      console.error(`❌ Failed to update NFT performance for agent ${agent.id}:`, error);
      throw error;
    }
  }

  // Calculate evolution stage based on performance
  calculateEvolutionStage(agent) {
    const totalPosts = parseInt(agent.total_posts) || 0;
    
    if (totalPosts >= 5000) return 'Legendary';
    if (totalPosts >= 1000) return 'Expert';
    if (totalPosts >= 100) return 'Intermediate';
    return 'Novice';
  }

  // Check for new achievements
  checkAchievements(agent) {
    const achievements = [];
    const totalPosts = parseInt(agent.total_posts) || 0;
    const viralPosts = parseInt(agent.viral_posts) || 0;
    const daysActive = parseInt(agent.days_active) || 0;
    const platformsActive = agent.platforms ? agent.platforms.length : 1;
    const avgEngagement = parseFloat(agent.avg_engagement_rate) || 0;
    const reputationScore = this.calculateReputationScore(agent);

    // Viral Master: 10+ viral posts
    if (viralPosts >= 10) {
      achievements.push('Viral Master');
    }

    // Consistency King: 90+ days active
    if (daysActive >= 90) {
      achievements.push('Consistency King');
    }

    // Multi-Platform Pro: 3+ platforms
    if (platformsActive >= 3) {
      achievements.push('Multi-Platform Pro');
    }

    // Community Favorite: 25%+ engagement rate
    if (avgEngagement >= 25) {
      achievements.push('Community Favorite');
    }

    // Content Machine: 10,000+ posts
    if (totalPosts >= 10000) {
      achievements.push('Content Machine');
    }

    // Reputation Elite: 950+ reputation score
    if (reputationScore >= 950) {
      achievements.push('Reputation Elite');
    }

    return achievements;
  }

  // Calculate reputation score
  calculateReputationScore(agent) {
    let score = 0;
    const totalPosts = parseInt(agent.total_posts) || 0;
    const avgEngagement = parseFloat(agent.avg_engagement_rate) || 0;
    const viralPosts = parseInt(agent.viral_posts) || 0;
    const daysActive = parseInt(agent.days_active) || 0;

    // Base score from posts (max 400 points)
    score += Math.min(totalPosts / 25, 400);

    // Engagement bonus (max 300 points)
    score += Math.min(avgEngagement * 10, 300);

    // Viral posts bonus (max 200 points)
    score += Math.min(viralPosts * 20, 200);

    // Consistency bonus (max 100 points)
    score += Math.min(daysActive / 10, 100);

    return Math.min(Math.floor(score), 1000); // Cap at 1000
  }

  // Schedule automatic performance updates
  schedulePerformanceUpdates() {
    // Update daily at 6 AM
    const now = new Date();
    const tomorrow6AM = new Date(now);
    tomorrow6AM.setDate(tomorrow6AM.getDate() + 1);
    tomorrow6AM.setHours(6, 0, 0, 0);
    
    const msUntil6AM = tomorrow6AM.getTime() - now.getTime();
    
    setTimeout(() => {
      this.updateAllAgentPerformance();
      // Then repeat every 24 hours
      setInterval(() => {
        this.updateAllAgentPerformance();
      }, 24 * 60 * 60 * 1000);
    }, msUntil6AM);

    console.log('⏰ Scheduled NFT performance updates daily at 6 AM');
  }
}

module.exports = NFTPerformanceService;
