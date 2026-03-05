const database = require('../database/connection');
const logger = require('../utils/logger');

const BLOCKCHAIN_DISABLED_MSG = 'Blockchain payments are not available in Iqonga v1.';

class CreditService {
  constructor() {
    // Maximum debt limit (can be overridden via environment variable)
    this.MAX_DEBT_LIMIT = parseInt(process.env.MAX_DEBT_LIMIT) || 200;
  }

  // Get user credit balance
  async getUserCredits(userId) {
    try {
      const result = await database.query(
        'SELECT * FROM user_credits WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        // Create credit account if it doesn't exist
        await this.createUserCreditAccount(userId);
        return await this.getUserCredits(userId);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting user credits:', error);
      throw error;
    }
  }

  // Get credit package by ID
  async getCreditPackage(packageId) {
    try {
      const result = await database.query(
        'SELECT * FROM credit_packages WHERE id = $1',
        [packageId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting credit package:', error);
      throw error;
    }
  }

  // Add credits to user account
  async addCredits(userId, credits, transactionSignature) {
    try {
      // Get current balance first
      const currentBalanceResult = await database.query(
        'SELECT credit_balance FROM user_credits WHERE user_id = $1',
        [userId]
      );

      if (currentBalanceResult.rows.length === 0) {
        throw new Error('User credit account not found');
      }

      const currentBalance = currentBalanceResult.rows[0].credit_balance;

      // Update user credits (use COALESCE to handle NULL values)
      const result = await database.query(
        `UPDATE user_credits 
         SET credit_balance = COALESCE(credit_balance, 0) + $1, 
             total_purchased = COALESCE(total_purchased, 0) + $1,
             last_purchase_at = NOW(),
             updated_at = NOW()
         WHERE user_id = $2
         RETURNING credit_balance`,
        [credits, userId]
      );

      // Log transaction using the correct schema
      await database.query(
        `INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_before, balance_after, description, reference_id)
         VALUES ($1, 'purchase', $2, $3, $4, $5, $6)`,
        [userId, credits, currentBalance, currentBalance + credits, 'Credit purchase via SOL payment', transactionSignature]
      );

      return {
        balance: result.rows[0].credit_balance,
        creditsAdded: credits
      };
    } catch (error) {
      console.error('Error adding credits:', error);
      throw error;
    }
  }

  // Create user credit account
  async createUserCreditAccount(userId) {
    try {
      // Get default credits from system config
      let defaultCredits = 100; // Default fallback
      try {
        const configResult = await database.query(
          `SELECT config_value FROM system_config WHERE config_key = 'default_credits'`
        );
        if (configResult.rows.length > 0) {
          defaultCredits = parseInt(configResult.rows[0].config_value) || 100;
        }
      } catch (configError) {
        logger.warn('Could not fetch default_credits from system_config, using default 100');
      }

      const result = await database.query(`
        INSERT INTO user_credits (user_id, credit_balance, total_purchased, total_used)
        VALUES ($1, $2, $2, 0)
        RETURNING *
      `, [userId, defaultCredits]);

      // Log the initial credit grant
      if (defaultCredits > 0) {
        await database.query(
          `INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_before, balance_after, description)
           VALUES ($1, 'grant', $2, 0, $2, 'Welcome bonus - new user credits')`,
          [userId, defaultCredits]
        );
      }

      logger.info(`Created credit account for user ${userId} with ${defaultCredits} default credits`);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user credit account:', error);
      throw error;
    }
  }

  // Purchase credits with ZTR token (20% bonus) — disabled in Iqonga v1 (no blockchain)
  async purchaseCreditsWithZTR(userId, packageId, confirmedSignature = null) {
    throw new Error(BLOCKCHAIN_DISABLED_MSG);
    try {
      const ZTRPriceService = require('./ZTRPriceService');
      const TokenAccessService = require('./TokenAccessService');
      
      // Get credit package
      const packageResult = await database.query(
        'SELECT * FROM credit_packages WHERE id = $1 AND is_active = true',
        [packageId]
      );

      if (packageResult.rows.length === 0) {
        throw new Error('Credit package not found');
      }

      const creditPackage = packageResult.rows[0];
      const baseCredits = creditPackage.credits;
      
      // Calculate 20% bonus credits
      const bonusPercentage = 20;
      const bonusCredits = Math.floor(baseCredits * (bonusPercentage / 100));
      const totalCredits = baseCredits + bonusCredits;

      // Get user wallet
      const userResult = await database.query(
        'SELECT wallet_address FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User wallet not found');
      }

      const userWallet = userResult.rows[0].wallet_address;
      
      if (!userWallet) {
        throw new Error('User wallet address not found. Please connect a wallet to purchase with ZTR.');
      }

      // Get USD price (use USDC price as USD equivalent)
      const usdPrice = creditPackage.price_usdc || creditPackage.price_sol * 150; // Fallback if no USDC price
      
      // Calculate ZTR amount needed (user pays FULL USD price in ZTR, gets bonus credits)
      // Example: Pay $10 worth of ZTR → Get 1,200 credits (1,000 base + 200 bonus)
      const ztrAmountNeeded = await ZTRPriceService.calculateZTRAmountNeeded(usdPrice);
      
      // Check user has enough ZTR
      const userZtrBalance = await TokenAccessService.getZTRBalance(userWallet);
      if (userZtrBalance < ztrAmountNeeded) {
        throw new Error(
          `Insufficient ZTR balance. Required: ${ztrAmountNeeded.toFixed(2)} ZTR, ` +
          `Available: ${userZtrBalance.toFixed(2)} ZTR`
        );
      }

      // If signature is provided, transaction is already confirmed - add credits now
      if (confirmedSignature) {
        console.log(`✅ Adding credits for confirmed ZTR transaction: ${confirmedSignature}`);
        
        // Verify the transaction actually transferred ZTR
        // (We'll trust the confirmation endpoint did this)
        
        // Get current user credits and debt
        const currentResult = await database.query(
          'SELECT credit_balance, debt_balance FROM user_credits WHERE user_id = $1 FOR UPDATE',
          [userId]
        );

        if (currentResult.rows.length === 0) {
          throw new Error('User credit account not found');
        }

        const currentBalance = currentResult.rows[0].credit_balance;
        const currentDebt = currentResult.rows[0].debt_balance;
        let newBalance = currentBalance;
        let newDebt = currentDebt;
        let debtPaid = 0;
        let creditsAdded = totalCredits;

        // Automatically pay off debt with new credits
        if (currentDebt > 0) {
          if (totalCredits >= currentDebt) {
            debtPaid = currentDebt;
            newBalance = currentBalance + (totalCredits - currentDebt);
            newDebt = 0;
            creditsAdded = totalCredits - currentDebt;
          } else {
            debtPaid = totalCredits;
            newBalance = currentBalance;
            newDebt = currentDebt - totalCredits;
            creditsAdded = 0;
          }
        } else {
          newBalance = currentBalance + totalCredits;
        }

        // Update user credits
        const updateResult = await database.query(`
          UPDATE user_credits 
          SET 
            credit_balance = $1,
            debt_balance = $2,
            total_purchased = total_purchased + $3,
            last_purchase_at = NOW(),
            updated_at = NOW()
          WHERE user_id = $4
          RETURNING *
        `, [newBalance, newDebt, totalCredits, userId]);

        // Log purchase transaction
        await this.logCreditTransaction(
          userId,
          'purchase',
          totalCredits,
          `Purchased ${creditPackage.name} with ZTR (${baseCredits} base + ${bonusCredits} bonus = ${totalCredits} total)`,
          packageId
        );

        // Log debt payment if applicable
        if (debtPaid > 0) {
          await this.logCreditTransaction(
            userId,
            'debt_repayment',
            debtPaid,
            `Automatic debt payment from ZTR credit purchase`
          );
        }

        return {
          success: true,
          credits: totalCredits,
          baseCredits: baseCredits,
          bonusCredits: bonusCredits,
          creditsAdded: creditsAdded,
          debtPaid: debtPaid,
          balance: updateResult.rows[0].credit_balance,
          debtBalance: updateResult.rows[0].debt_balance,
          ztrAmountPaid: ztrAmountNeeded,
          usdPrice: usdPrice,
          transactionSignature: confirmedSignature,
          message: `Purchased ${totalCredits} credits with $ZTR (${bonusCredits} bonus credits included!)`
        };
      }

      // Process ZTR payment via Solana service
      // For ZTR, we need to pass the amount and price info differently
      // Create a special method call for ZTR
      // IMPORTANT: Don't add credits yet - wait for transaction confirmation
      const paymentResult = await this.solanaService.purchaseCreditsWithZTR(
        userWallet,
        ztrAmountNeeded,
        usdPrice,
        totalCredits
      );

      // Get current user credits for display (but don't update yet)
      const currentResult = await database.query(
        'SELECT credit_balance, debt_balance FROM user_credits WHERE user_id = $1',
        [userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('User credit account not found');
      }

      const currentBalance = currentResult.rows[0].credit_balance;
      const currentDebt = currentResult.rows[0].debt_balance;

      // Return transaction data for frontend signing
      // Credits will be added after transaction is confirmed via /api/credits/confirm-transaction
      return {
        success: true,
        credits: totalCredits,
        baseCredits: baseCredits,
        bonusCredits: bonusCredits,
        creditsAdded: 0, // Will be set after confirmation
        debtPaid: 0, // Will be set after confirmation
        balance: currentBalance, // Current balance, not updated yet
        debtBalance: currentDebt, // Current debt, not updated yet
        ztrAmountPaid: ztrAmountNeeded,
        usdPrice: usdPrice,
        transactionSignature: 'pending', // Will be set after confirmation
        transactionData: paymentResult,
        requiresSigning: true,
        message: `Transaction created. Please sign to complete purchase of ${totalCredits} credits with $ZTR (${bonusCredits} bonus credits included!)`
      };

    } catch (error) {
      console.error('Error purchasing credits with ZTR:', error);
      throw error;
    }
  }

  // Purchase credits — disabled in Iqonga v1 (no blockchain)
  async purchaseCredits(userId, packageId, paymentMethod = 'sol') {
    throw new Error(BLOCKCHAIN_DISABLED_MSG);
    try {
      // Get credit package
      const packageResult = await database.query(
        'SELECT * FROM credit_packages WHERE id = $1 AND is_active = true',
        [packageId]
      );

      if (packageResult.rows.length === 0) {
        throw new Error('Credit package not found');
      }

      const creditPackage = packageResult.rows[0];
      const totalCredits = creditPackage.credits + creditPackage.bonus_credits;

      // Get user wallet
      const userResult = await database.query(
        'SELECT wallet_address FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User wallet not found');
      }

      const userWallet = userResult.rows[0].wallet_address;

      // Process payment via smart contract
      const paymentResult = await this.solanaService.purchaseCredits(
        userWallet,
        paymentMethod,
        totalCredits,
        creditPackage.price_sol,
        creditPackage.price_usdc
      );

      // Get current user credits and debt
      const currentResult = await database.query(
        'SELECT credit_balance, debt_balance FROM user_credits WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('User credit account not found');
      }

      const currentBalance = currentResult.rows[0].credit_balance;
      const currentDebt = currentResult.rows[0].debt_balance;
      let newBalance = currentBalance;
      let newDebt = currentDebt;
      let debtPaid = 0;
      let creditsAdded = totalCredits;

      // Automatically pay off debt with new credits
      if (currentDebt > 0) {
        if (totalCredits >= currentDebt) {
          // Pay off all debt
          debtPaid = currentDebt;
          newBalance = currentBalance + (totalCredits - currentDebt);
          newDebt = 0;
          creditsAdded = totalCredits - currentDebt;
        } else {
          // Pay off partial debt
          debtPaid = totalCredits;
          newBalance = currentBalance;
          newDebt = currentDebt - totalCredits;
          creditsAdded = 0;
        }
      } else {
        // No debt, add credits normally
        newBalance = currentBalance + totalCredits;
      }

      // Update user credits
      const updateResult = await database.query(`
        UPDATE user_credits 
        SET 
          credit_balance = $1,
          debt_balance = $2,
          total_purchased = total_purchased + $3,
          last_purchase_at = NOW(),
          updated_at = NOW()
        WHERE user_id = $4
        RETURNING *
      `, [newBalance, newDebt, totalCredits, userId]);

      // Log purchase transaction
      const transactionResult = await this.logCreditTransaction(
        userId,
        'purchase',
        totalCredits,
        `Purchased ${creditPackage.name} (${creditPackage.credits} + ${creditPackage.bonus_credits} bonus)`,
        packageId
      );

      // Log debt payment if applicable
      if (debtPaid > 0) {
        await this.logCreditTransaction(
          userId,
          'debt_repayment',
          debtPaid,
          `Automatic debt payment from credit purchase`
        );
      }

      // Process referral rewards (if applicable)
      try {
        const ReferralService = require('./ReferralService');
        const referralService = new ReferralService();
        await referralService.processReferralReward(
          userId,
          creditPackage.credits, // Purchase amount in credits
          transactionResult?.id || null
        );
      } catch (referralError) {
        // Don't fail the purchase if referral processing fails
        console.error('Error processing referral reward:', referralError);
      }

      return {
        success: true,
        credits: totalCredits,
        creditsAdded: creditsAdded,
        debtPaid: debtPaid,
        balance: updateResult.rows[0].credit_balance,
        debtBalance: updateResult.rows[0].debt_balance,
        transactionSignature: paymentResult.signature
      };

    } catch (error) {
      console.error('Error purchasing credits:', error);
      throw error;
    }
  }

  // Deduct credits for AI actions. Disabled in v1: no pay-as-you-go; adopters can add credit system as an add-on.
  async deductCredits(userId, actionType, amount, referenceId = null) {
    if (process.env.CREDITS_ENABLED !== 'true') {
      return { success: true, balance: 0, deducted: Number(amount) || 0 };
    }
    try {
      // Validate amount is a valid positive number
      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        console.error(`Invalid credit amount: ${amount} (type: ${typeof amount}) for action: ${actionType}`);
        throw new Error(`Invalid credit amount: ${amount}. Amount must be a positive number.`);
      }
      
      const client = await database.getClient();
      
      try {
        await client.query('BEGIN');

        // Get current balance and debt
        const balanceResult = await client.query(
          'SELECT credit_balance, debt_balance FROM user_credits WHERE user_id = $1 FOR UPDATE',
          [userId]
        );

        if (balanceResult.rows.length === 0) {
          throw new Error('User credit account not found');
        }

        const currentBalance = balanceResult.rows[0].credit_balance || 0;
        const currentDebt = balanceResult.rows[0].debt_balance || 0;

        if (currentBalance < numericAmount) {
          // Calculate how much debt would be created
          const debtToCreate = numericAmount - currentBalance;
          const newDebtTotal = currentDebt + debtToCreate;

          // Check if adding this debt would exceed the debt cap
          if (newDebtTotal > this.MAX_DEBT_LIMIT) {
            const availableDebtSpace = this.MAX_DEBT_LIMIT - currentDebt;
            const maxAllowedAmount = currentBalance + availableDebtSpace;
            
            // Create a friendly error with structured information
            const error = new Error(
              `You've reached your credit limit! 💳\n\n` +
              `You currently have ${currentDebt} credits in debt (out of a maximum of ${this.MAX_DEBT_LIMIT} credits). ` +
              `To continue using our services, please purchase more credits or wait for your debt to be repaid.\n\n` +
              `💡 Tip: You can purchase credits from your account dashboard to get back to creating amazing content!`
            );
            error.code = 'DEBT_LIMIT_REACHED';
            error.debtLimit = this.MAX_DEBT_LIMIT;
            error.currentDebt = currentDebt;
            error.availableDebtSpace = availableDebtSpace;
            error.maxAllowedAmount = maxAllowedAmount;
            error.currentBalance = currentBalance;
            throw error;
          }

          // Check if auto-recharge is enabled
          const autoRechargeResult = await client.query(
            'SELECT auto_recharge_enabled, auto_recharge_amount FROM user_credits WHERE user_id = $1',
            [userId]
          );

          if (autoRechargeResult.rows[0].auto_recharge_enabled) {
            // Auto-recharge
            const rechargeAmount = autoRechargeResult.rows[0].auto_recharge_amount;
            await this.autoRechargeCredits(userId, rechargeAmount, client);
          } else {
            // Create debt (within limit)
            await this.createDebt(userId, debtToCreate, client);
          }
        }

        // Deduct credits (use COALESCE to handle NULL values, use validated numericAmount)
        const updateResult = await client.query(`
          UPDATE user_credits 
          SET 
            credit_balance = GREATEST(0, COALESCE(credit_balance, 0) - $1),
            total_used = COALESCE(total_used, 0) + $1,
            last_used_at = NOW(),
            updated_at = NOW()
          WHERE user_id = $2
          RETURNING *
        `, [numericAmount, userId]);

        // Log transaction
        await this.logCreditTransaction(
          userId,
          'deduct',
          -numericAmount,
          `Used for ${actionType}`,
          referenceId,
          client
        );

        await client.query('COMMIT');

        return {
          success: true,
          creditsDeducted: numericAmount,
          newBalance: updateResult.rows[0].credit_balance,
          debtBalance: updateResult.rows[0].debt_balance
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error deducting credits:', error);
      throw error;
    }
  }

  // Auto-recharge credits
  async autoRechargeCredits(userId, amount, client = null) {
    try {
      const query = client || database;
      
      const updateResult = await query.query(`
        UPDATE user_credits 
        SET 
          credit_balance = COALESCE(credit_balance, 0) + $1,
          total_purchased = COALESCE(total_purchased, 0) + $1,
          updated_at = NOW()
        WHERE user_id = $2
        RETURNING *
      `, [amount, userId]);

      // Log transaction
      await this.logCreditTransaction(
        userId,
        'purchase',
        amount,
        'Auto-recharge',
        null,
        client
      );

      return updateResult.rows[0];
    } catch (error) {
      console.error('Error auto-recharging credits:', error);
      throw error;
    }
  }

  // Create debt for insufficient credits
  async createDebt(userId, amount, client = null) {
    try {
      const query = client || database;
      
      // Get current debt to check limit
      const currentResult = await query.query(
        'SELECT debt_balance FROM user_credits WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('User credit account not found');
      }

      const currentDebt = currentResult.rows[0].debt_balance || 0;
      const newDebtTotal = currentDebt + amount;

      // Double-check debt limit (safety check)
      if (newDebtTotal > this.MAX_DEBT_LIMIT) {
        const availableDebtSpace = this.MAX_DEBT_LIMIT - currentDebt;
        const error = new Error(
          `You've reached your credit limit! 💳\n\n` +
          `You currently have ${currentDebt} credits in debt (out of a maximum of ${this.MAX_DEBT_LIMIT} credits). ` +
          `To continue using our services, please purchase more credits or wait for your debt to be repaid.\n\n` +
          `💡 Tip: You can purchase credits from your account dashboard to get back to creating amazing content!`
        );
        error.code = 'DEBT_LIMIT_REACHED';
        error.debtLimit = this.MAX_DEBT_LIMIT;
        error.currentDebt = currentDebt;
        error.availableDebtSpace = availableDebtSpace;
        throw error;
      }
      
      const updateResult = await query.query(`
        UPDATE user_credits 
        SET 
          debt_balance = debt_balance + $1,
          updated_at = NOW()
        WHERE user_id = $2
        RETURNING *
      `, [amount, userId]);

      // Log transaction
      await this.logCreditTransaction(
        userId,
        'debt_repayment',
        -amount,
        'Debt created for insufficient credits',
        null,
        client
      );

      return updateResult.rows[0];
    } catch (error) {
      console.error('Error creating debt:', error);
      throw error;
    }
  }

  // Repay debt
  async repayDebt(userId, amount) {
    try {
      const result = await database.query(`
        UPDATE user_credits 
        SET 
          debt_balance = GREATEST(0, debt_balance - $1),
          updated_at = NOW()
        WHERE user_id = $2
        RETURNING *
      `, [amount, userId]);

      // Log transaction
      await this.logCreditTransaction(
        userId,
        'debt_repayment',
        amount,
        'Debt repayment'
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error repaying debt:', error);
      throw error;
    }
  }

  // Configure auto-recharge
  async configureAutoRecharge(userId, enabled, threshold = 100, amount = 500) {
    try {
      const result = await database.query(`
        UPDATE user_credits 
        SET 
          auto_recharge_enabled = $1,
          auto_recharge_threshold = $2,
          auto_recharge_amount = $3,
          updated_at = NOW()
        WHERE user_id = $4
        RETURNING *
      `, [enabled, threshold, amount, userId]);

      return result.rows[0];
    } catch (error) {
      console.error('Error configuring auto-recharge:', error);
      throw error;
    }
  }

  // Get credit packages
  async getCreditPackages() {
    try {
      const result = await database.query(
        'SELECT * FROM credit_packages WHERE is_active = true ORDER BY sort_order ASC'
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting credit packages:', error);
      throw error;
    }
  }

  // Get credit transaction history
  async getCreditTransactions(userId, limit = 50, offset = 0) {
    try {
      const result = await database.query(`
        SELECT * FROM credit_transactions 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return result.rows;
    } catch (error) {
      console.error('Error getting credit transactions:', error);
      throw error;
    }
  }

  // Refund credits for failed operations
  async refundCredits(userId, amount, reason, originalReferenceId = null) {
    try {
      const client = await database.getClient();
      
      try {
        await client.query('BEGIN');

        // Add credits back to user account (use COALESCE to handle NULL values)
        const updateResult = await client.query(`
          UPDATE user_credits 
          SET 
            credit_balance = COALESCE(credit_balance, 0) + $1,
            total_used = GREATEST(0, COALESCE(total_used, 0) - $1),
            updated_at = NOW()
          WHERE user_id = $2
          RETURNING *
        `, [amount, userId]);

        if (updateResult.rows.length === 0) {
          throw new Error('User credit account not found');
        }

        const newBalance = updateResult.rows[0].credit_balance;

        // Log refund transaction
        await this.logCreditTransaction(
          userId,
          'refund',
          amount,
          `Credit refund: ${reason}`,
          originalReferenceId,
          client
        );

        await client.query('COMMIT');

        return {
          success: true,
          creditsRefunded: amount,
          newBalance: newBalance,
          reason: reason
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error refunding credits:', error);
      throw error;
    }
  }

  // Admin debt management functions
  async adminAdjustDebt(userId, adjustmentType, amount, reason, adminId) {
    try {
      const client = await database.getClient();
      
      try {
        await client.query('BEGIN');

        // Get current user credits
        const userResult = await client.query(
          'SELECT credit_balance, debt_balance FROM user_credits WHERE user_id = $1 FOR UPDATE',
          [userId]
        );

        if (userResult.rows.length === 0) {
          throw new Error('User credit account not found');
        }

        const currentBalance = userResult.rows[0].credit_balance;
        const currentDebt = userResult.rows[0].debt_balance;
        let newDebt = currentDebt;

        // Apply debt adjustment
        switch (adjustmentType) {
          case 'wipe':
            newDebt = 0;
            break;
          case 'reduce':
            newDebt = Math.max(0, currentDebt - amount);
            break;
          case 'increase':
            newDebt = currentDebt + amount;
            // Warn if exceeding limit (but allow admin override)
            if (newDebt > this.MAX_DEBT_LIMIT) {
              logger.warn(`Admin debt adjustment would exceed limit: ${newDebt} > ${this.MAX_DEBT_LIMIT}`, {
                userId,
                adminId,
                currentDebt,
                newDebt,
                adjustmentType,
                amount
              });
            }
            break;
          case 'set':
            newDebt = amount;
            // Warn if exceeding limit (but allow admin override)
            if (newDebt > this.MAX_DEBT_LIMIT) {
              logger.warn(`Admin debt adjustment would exceed limit: ${newDebt} > ${this.MAX_DEBT_LIMIT}`, {
                userId,
                adminId,
                currentDebt,
                newDebt,
                adjustmentType,
                amount
              });
            }
            break;
          default:
            throw new Error('Invalid adjustment type');
        }

        // Update user credits
        const updateResult = await client.query(`
          UPDATE user_credits 
          SET 
            debt_balance = $1,
            updated_at = NOW()
          WHERE user_id = $2
          RETURNING *
        `, [newDebt, userId]);

        // Log admin action
        await client.query(`
          INSERT INTO admin_actions (
            admin_user_id, action_type, target_user_id, description, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
          adminId,
          'debt_adjustment',
          userId,
          `Admin ${adjustmentType}: ${reason}`,
          JSON.stringify({
            adjustmentType,
            amount,
            reason,
            previousDebt: currentDebt,
            newDebt: newDebt,
            debtChange: newDebt - currentDebt
          })
        ]);

        // Log credit transaction
        const debtChange = newDebt - currentDebt;
        if (debtChange !== 0) {
          await this.logCreditTransaction(
            userId,
            'debt_repayment',
            debtChange,
            `Admin ${adjustmentType}: ${reason}`,
            null,
            client
          );
        }

        await client.query('COMMIT');

        return {
          success: true,
          previousDebt: currentDebt,
          newDebt: newDebt,
          debtChange: debtChange,
          balance: updateResult.rows[0].credit_balance
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error adjusting debt:', error);
      throw error;
    }
  }

  async adminAddCredits(userId, amount, reason, adminId) {
    try {
      const client = await database.getClient();
      
      try {
        await client.query('BEGIN');

        // Get current user credits
        const userResult = await client.query(
          'SELECT credit_balance FROM user_credits WHERE user_id = $1 FOR UPDATE',
          [userId]
        );

        if (userResult.rows.length === 0) {
          throw new Error('User credit account not found');
        }

        const currentBalance = userResult.rows[0].credit_balance;

        // Update user credits (use COALESCE to handle NULL values)
        const updateResult = await client.query(`
          UPDATE user_credits 
          SET 
            credit_balance = COALESCE(credit_balance, 0) + $1,
            total_purchased = COALESCE(total_purchased, 0) + $1,
            updated_at = NOW()
          WHERE user_id = $2
          RETURNING *
        `, [amount, userId]);

        // Log admin action
        await client.query(`
          INSERT INTO admin_actions (
            admin_user_id, action_type, target_user_id, description, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
          adminId,
          'credit_adjustment',
          userId,
          `Admin credit addition: ${reason}`,
          JSON.stringify({
            amount,
            reason,
            previousBalance: currentBalance,
            newBalance: currentBalance + amount
          })
        ]);

        // Log credit transaction
        await this.logCreditTransaction(
          userId,
          'bonus',
          amount,
          `Admin credit addition: ${reason}`,
          null,
          client
        );

        await client.query('COMMIT');

        return {
          success: true,
          previousBalance: currentBalance,
          newBalance: currentBalance + amount,
          creditsAdded: amount
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error adding credits:', error);
      throw error;
    }
  }

  async adminDeductCredits(userId, amount, reason, adminId) {
    try {
      const client = await database.getClient();
      
      try {
        await client.query('BEGIN');

        // Get current user credits
        const userResult = await client.query(
          'SELECT credit_balance FROM user_credits WHERE user_id = $1 FOR UPDATE',
          [userId]
        );

        if (userResult.rows.length === 0) {
          throw new Error('User credit account not found');
        }

        const currentBalance = userResult.rows[0].credit_balance;

        if (currentBalance < amount) {
          throw new Error('Insufficient credits to deduct');
        }

        // Update user credits (use COALESCE to handle NULL values)
        const updateResult = await client.query(`
          UPDATE user_credits 
          SET 
            credit_balance = GREATEST(0, COALESCE(credit_balance, 0) - $1),
            total_used = COALESCE(total_used, 0) + $1,
            updated_at = NOW()
          WHERE user_id = $2
          RETURNING *
        `, [amount, userId]);

        // Log admin action
        await client.query(`
          INSERT INTO admin_actions (
            admin_user_id, action_type, target_user_id, description, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
          adminId,
          'credit_deduction',
          userId,
          `Admin credit deduction: ${reason}`,
          JSON.stringify({
            amount,
            reason,
            previousBalance: currentBalance,
            newBalance: currentBalance - amount
          })
        ]);

        // Log credit transaction
        await this.logCreditTransaction(
          userId,
          'deduct',
          -amount,
          `Admin credit deduction: ${reason}`,
          null,
          client
        );

        await client.query('COMMIT');

        return {
          success: true,
          previousBalance: currentBalance,
          newBalance: currentBalance - amount,
          creditsDeducted: amount
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error deducting credits:', error);
      throw error;
    }
  }

  // Add credits to agent owner when someone sends a gift of credits to their agent
  async addCreditsFromAgentGift(ownerUserId, amount, agentId, giverUserId) {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Invalid gift amount');
    }
    const client = await database.getClient();
    try {
      await client.query('BEGIN');
      const balanceResult = await client.query(
        'SELECT credit_balance FROM user_credits WHERE user_id = $1 FOR UPDATE',
        [ownerUserId]
      );
      if (balanceResult.rows.length === 0) {
        throw new Error('Agent owner credit account not found');
      }
      const balanceBefore = balanceResult.rows[0].credit_balance || 0;
      const balanceAfter = balanceBefore + numericAmount;
      await client.query(
        `UPDATE user_credits SET credit_balance = $1, updated_at = NOW() WHERE user_id = $2`,
        [balanceAfter, ownerUserId]
      );
      await client.query(
        `INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_before, balance_after, description, reference_id)
         VALUES ($1, 'bonus', $2, $3, $4, $5, $6)`,
        [ownerUserId, numericAmount, balanceBefore, balanceAfter, 'Credits received from agent gift (City)', agentId]
      );
      await client.query('COMMIT');
      return { balanceAfter, creditsAdded: numericAmount };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Log credit transaction
  async logCreditTransaction(userId, transactionType, amount, description, referenceId, client = null) {
    try {
      const query = client || database;
      
      // Get current balance
      const balanceResult = await query.query(
        'SELECT credit_balance FROM user_credits WHERE user_id = $1',
        [userId]
      );

      const currentBalance = balanceResult.rows[0]?.credit_balance || 0;
      const newBalance = currentBalance + amount;

      const result = await query.query(`
        INSERT INTO credit_transactions (
          user_id, transaction_type, amount, balance_before, balance_after, description, reference_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [userId, transactionType, amount, currentBalance, newBalance, description, referenceId]);

      return result.rows[0]; // Return transaction record with id

    } catch (error) {
      console.error('Error logging credit transaction:', error);
      throw error;
    }
  }

  // Get credit usage statistics
  async getCreditStats(userId) {
    try {
      const result = await database.query(`
        SELECT 
          uc.*,
          COUNT(ct.id) as transaction_count,
          SUM(CASE WHEN ct.transaction_type = 'purchase' THEN ct.amount ELSE 0 END) as total_purchased,
          SUM(CASE WHEN ct.transaction_type = 'deduct' THEN ABS(ct.amount) ELSE 0 END) as total_used,
          SUM(CASE WHEN ct.transaction_type = 'bonus' THEN ct.amount ELSE 0 END) as total_bonus
        FROM user_credits uc
        LEFT JOIN credit_transactions ct ON uc.user_id = ct.user_id
        WHERE uc.user_id = $1
        GROUP BY uc.id
      `, [userId]);

      return result.rows[0];
    } catch (error) {
      console.error('Error getting credit stats:', error);
      throw error;
    }
  }
}

module.exports = CreditService;
