const database = require('../database/connection');
const logger = require('../utils/logger');
const TokenAccessService = require('./TokenAccessService');

class TokenHolderRewardService {
  constructor() {
    // TokenAccessService is exported as a singleton instance, not a class
    this.tokenAccessService = TokenAccessService;
  }

  /**
   * Take daily snapshot of token balances for all active users
   * This should be run once per day (e.g., via cron job)
   */
  async takeDailySnapshot() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const snapshotDate = today.toISOString().split('T')[0];

      logger.info(`📸 Taking daily token balance snapshot for ${snapshotDate}`);

      // Get all users with wallet addresses
      const usersResult = await database.query(`
        SELECT id, wallet_address, ztr_balance
        FROM users
        WHERE wallet_address IS NOT NULL 
          AND wallet_address != ''
      `);

      let snapshotsCreated = 0;
      let snapshotsSkipped = 0;
      let errors = 0;

      for (const user of usersResult.rows) {
        try {
          // Check if snapshot already exists for today
          const existingSnapshot = await database.query(`
            SELECT id FROM token_balance_snapshots
            WHERE user_id = $1 AND snapshot_date = $2
          `, [user.id, snapshotDate]);

          if (existingSnapshot.rows.length > 0) {
            snapshotsSkipped++;
            continue;
          }

          // Fetch current ZTR balance from blockchain
          let currentBalance = 0;
          try {
            currentBalance = await this.tokenAccessService.getZTRBalance(user.wallet_address);
          } catch (error) {
            logger.warn(`Failed to fetch balance for user ${user.id}: ${error.message}`);
            // Use cached balance if available
            currentBalance = parseFloat(user.ztr_balance) || 0;
          }

          // Create snapshot
          await database.query(`
            INSERT INTO token_balance_snapshots (user_id, wallet_address, ztr_balance, snapshot_date)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
              ztr_balance = EXCLUDED.ztr_balance,
              snapshot_time = NOW()
          `, [user.id, user.wallet_address, currentBalance, snapshotDate]);

          // Update user's cached balance
          await database.query(`
            UPDATE users SET ztr_balance = $1, last_token_check = NOW()
            WHERE id = $2
          `, [currentBalance, user.id]);

          snapshotsCreated++;
        } catch (error) {
          logger.error(`Error creating snapshot for user ${user.id}:`, error);
          errors++;
        }
      }

      logger.info(`✅ Daily snapshot complete: ${snapshotsCreated} created, ${snapshotsSkipped} skipped, ${errors} errors`);
      return {
        success: true,
        snapshotsCreated,
        snapshotsSkipped,
        errors
      };
    } catch (error) {
      logger.error('Error taking daily snapshot:', error);
      throw error;
    }
  }

  /**
   * Calculate monthly rewards for a specific month
   * This checks:
   * 1. Average balance over the month
   * 2. Minimum holding days requirement
   * 3. Qualifying tier
   */
  async calculateMonthlyRewards(year, month) {
    try {
      const rewardMonth = `${year}-${String(month).padStart(2, '0')}-01`;
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month

      logger.info(`💰 Calculating monthly rewards for ${rewardMonth}`);

      // Get all reward tiers
      const tiersResult = await database.query(`
        SELECT * FROM token_reward_tiers
        WHERE is_active = true
        ORDER BY min_balance ASC
      `);

      const tiers = tiersResult.rows;
      if (tiers.length === 0) {
        throw new Error('No active reward tiers configured');
      }

      // Get all users who have snapshots for this month
      const usersResult = await database.query(`
        SELECT DISTINCT user_id, wallet_address
        FROM token_balance_snapshots
        WHERE snapshot_date >= $1 AND snapshot_date <= $2
      `, [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);

      let rewardsCalculated = 0;
      let rewardsSkipped = 0;

      for (const user of usersResult.rows) {
        try {
          // Check if reward already calculated for this month
          const existingReward = await database.query(`
            SELECT id FROM token_holder_rewards
            WHERE user_id = $1 AND reward_month = $2
          `, [user.user_id, rewardMonth]);

          if (existingReward.rows.length > 0) {
            rewardsSkipped++;
            continue;
          }

          // Get all snapshots for this user in this month
          const snapshotsResult = await database.query(`
            SELECT ztr_balance, snapshot_date
            FROM token_balance_snapshots
            WHERE user_id = $1 
              AND snapshot_date >= $2 
              AND snapshot_date <= $3
            ORDER BY snapshot_date ASC
          `, [user.user_id, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);

          if (snapshotsResult.rows.length === 0) {
            continue;
          }

          const snapshots = snapshotsResult.rows;
          const balances = snapshots.map(s => parseFloat(s.ztr_balance) || 0);

          // Calculate average balance
          const avgBalance = balances.reduce((sum, b) => sum + b, 0) / balances.length;
          const minBalance = Math.min(...balances);

          // Determine which tier the user qualifies for (based on average balance)
          let qualifyingTier = null;
          let creditsAwarded = 0;

          // Check tiers from highest to lowest
          for (let i = tiers.length - 1; i >= 0; i--) {
            const tier = tiers[i];
            if (avgBalance >= parseFloat(tier.min_balance)) {
              // Check minimum holding days requirement
              const daysAboveThreshold = balances.filter(b => b >= parseFloat(tier.min_balance)).length;
              
              if (daysAboveThreshold >= tier.min_holding_days) {
                qualifyingTier = tier.tier_name;
                creditsAwarded = tier.credits_per_month;
                break;
              }
            }
          }

          // Create reward record (even if no tier qualified)
          await database.query(`
            INSERT INTO token_holder_rewards (
              user_id, reward_month, ztr_balance_avg, ztr_balance_min,
              days_held, reward_tier, credits_awarded, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (user_id, reward_month) DO UPDATE SET
              ztr_balance_avg = EXCLUDED.ztr_balance_avg,
              ztr_balance_min = EXCLUDED.ztr_balance_min,
              days_held = EXCLUDED.days_held,
              reward_tier = EXCLUDED.reward_tier,
              credits_awarded = EXCLUDED.credits_awarded,
              updated_at = NOW()
          `, [
            user.user_id,
            rewardMonth,
            avgBalance,
            minBalance,
            snapshots.length,
            qualifyingTier,
            creditsAwarded,
            qualifyingTier ? 'pending' : 'skipped'
          ]);

          if (qualifyingTier) {
            rewardsCalculated++;
          } else {
            rewardsSkipped++;
          }
        } catch (error) {
          logger.error(`Error calculating reward for user ${user.user_id}:`, error);
        }
      }

      logger.info(`✅ Monthly reward calculation complete: ${rewardsCalculated} qualified, ${rewardsSkipped} skipped`);
      return {
        success: true,
        rewardsCalculated,
        rewardsSkipped
      };
    } catch (error) {
      logger.error('Error calculating monthly rewards:', error);
      throw error;
    }
  }

  /**
   * Distribute monthly rewards (add credits to user accounts)
   * This should be run after calculateMonthlyRewards
   */
  async distributeMonthlyRewards(year, month) {
    try {
      const rewardMonth = `${year}-${String(month).padStart(2, '0')}-01`;

      logger.info(`🎁 Distributing monthly rewards for ${rewardMonth}`);

      // Get all pending rewards for this month
      const rewardsResult = await database.query(`
        SELECT * FROM token_holder_rewards
        WHERE reward_month = $1 AND status = 'pending'
        ORDER BY credits_awarded DESC
      `, [rewardMonth]);

      let distributed = 0;
      let failed = 0;

      for (const reward of rewardsResult.rows) {
        try {
          // Add credits to user account
          // Use addCredits method (requires transaction signature, but we'll use a reference ID)
          const client = await database.getClient();
          try {
            await client.query('BEGIN');
            
            // Get current balance
            const balanceResult = await client.query(
              'SELECT credit_balance FROM user_credits WHERE user_id = $1 FOR UPDATE',
              [reward.user_id]
            );

            if (balanceResult.rows.length === 0) {
              throw new Error('User credit account not found');
            }

            const currentBalance = balanceResult.rows[0].credit_balance;
            const newBalance = currentBalance + reward.credits_awarded;

            // Update balance
            await client.query(`
              UPDATE user_credits 
              SET 
                credit_balance = $1,
                total_purchased = total_purchased + $2,
                updated_at = NOW()
              WHERE user_id = $3
            `, [newBalance, reward.credits_awarded, reward.user_id]);

            // Log transaction
            await client.query(`
              INSERT INTO credit_transactions (
                user_id, transaction_type, amount, balance_before, balance_after, 
                description, reference_id
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
              reward.user_id,
              'bonus',
              reward.credits_awarded,
              currentBalance,
              newBalance,
              `Monthly token holder reward (${reward.reward_tier}) - ${rewardMonth}`,
              `token_holder_reward_${rewardMonth}`
            ]);

            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }

          // Update reward status
          await database.query(`
            UPDATE token_holder_rewards
            SET status = 'distributed',
                distribution_date = NOW(),
                updated_at = NOW()
            WHERE id = $1
          `, [reward.id]);

          logger.info(`✅ Distributed ${reward.credits_awarded} credits to user ${reward.user_id} (Tier: ${reward.reward_tier})`);
          distributed++;
        } catch (error) {
          logger.error(`Error distributing reward ${reward.id}:`, error);
          
          // Mark as failed
          await database.query(`
            UPDATE token_holder_rewards
            SET status = 'failed',
                notes = $1,
                updated_at = NOW()
            WHERE id = $2
          `, [error.message, reward.id]);
          
          failed++;
        }
      }

      logger.info(`✅ Reward distribution complete: ${distributed} distributed, ${failed} failed`);
      return {
        success: true,
        distributed,
        failed
      };
    } catch (error) {
      logger.error('Error distributing monthly rewards:', error);
      throw error;
    }
  }

  /**
   * Get reward statistics for a specific month
   */
  async getRewardStats(year, month) {
    try {
      const rewardMonth = `${year}-${String(month).padStart(2, '0')}-01`;

      const statsResult = await database.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN status = 'distributed' THEN 1 END) as distributed_count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped_count,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
          SUM(CASE WHEN status = 'distributed' THEN credits_awarded ELSE 0 END) as total_credits_distributed,
          SUM(CASE WHEN status = 'pending' THEN credits_awarded ELSE 0 END) as total_credits_pending
        FROM token_holder_rewards
        WHERE reward_month = $1
      `, [rewardMonth]);

      const tierStatsResult = await database.query(`
        SELECT 
          reward_tier,
          COUNT(*) as user_count,
          SUM(credits_awarded) as total_credits
        FROM token_holder_rewards
        WHERE reward_month = $1 AND status = 'distributed'
        GROUP BY reward_tier
        ORDER BY reward_tier
      `, [rewardMonth]);

      return {
        stats: statsResult.rows[0] || {},
        tierStats: tierStatsResult.rows
      };
    } catch (error) {
      logger.error('Error getting reward stats:', error);
      throw error;
    }
  }
}

module.exports = new TokenHolderRewardService();

