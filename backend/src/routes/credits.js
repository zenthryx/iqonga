const express = require('express');
const router = express.Router();
const CreditService = require('../services/CreditService');
const { SimpleSolanaService } = require('../services/SimpleSolanaService');
const { authenticateToken } = require('../middleware/auth');
const database = require('../database/connection');

const creditService = new CreditService();
const solanaService = new SimpleSolanaService();

// GET /api/credits/balance - Get user credit balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Credit balance request - User ID:', userId, 'Full user object:', req.user);
    const credits = await creditService.getUserCredits(userId);
    
    res.json({
      success: true,
      data: {
        creditBalance: credits.credit_balance || 0,
        totalPurchased: credits.total_purchased || 0,
        totalUsed: credits.total_used || 0,
        debtBalance: credits.debt_balance || 0,
        autoRechargeEnabled: credits.auto_recharge_enabled || false,
        autoRechargeThreshold: credits.auto_recharge_threshold || 100,
        autoRechargeAmount: credits.auto_recharge_amount || 1000,
        lastPurchaseAt: credits.last_purchase_at || null,
        lastUsedAt: credits.last_used_at || null
      }
    });
  } catch (error) {
    console.error('Error getting credit balance:', error);
    res.status(500).json({ 
      error: 'Failed to get credit balance',
      details: error.message 
    });
  }
});

// GET /api/credits/packages - Get available credit packages
router.get('/packages', async (req, res) => {
  try {
    const packages = await creditService.getCreditPackages();
    
    res.json({
      success: true,
        data: packages.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          credits: pkg.credits,
          bonusCredits: pkg.bonus_credits || 0,
          totalCredits: pkg.credits + (pkg.bonus_credits || 0),
          priceSol: parseFloat(pkg.price_sol || 0),
          priceUsdc: parseFloat(pkg.price_usdc || 0),
          sortOrder: pkg.sort_order,
          // Make USDC the primary display price
          primaryPrice: parseFloat(pkg.price_usdc || 0),
          primaryCurrency: 'USDC'
        }))
    });
  } catch (error) {
    console.error('Error getting credit packages:', error);
    res.status(500).json({ 
      error: 'Failed to get credit packages',
      details: error.message 
    });
  }
});

// POST /api/credits/purchase-ztr - Purchase credits with ZTR token (20% bonus)
router.post('/purchase-ztr', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { packageId } = req.body;

    if (!packageId) {
      return res.status(400).json({ error: 'Package ID is required' });
    }

    if (!req.user.wallet_address) {
      return res.status(400).json({ 
        error: 'Wallet address required for ZTR payments. Please connect a wallet.' 
      });
    }

    console.log(`Purchasing credits with ZTR for user ${userId}, package ${packageId}`);

    // Purchase credits with ZTR (includes 20% bonus)
    const result = await creditService.purchaseCreditsWithZTR(userId, packageId);

    res.json({
      success: true,
      message: result.message,
      data: {
        credits: result.credits,
        baseCredits: result.baseCredits,
        bonusCredits: result.bonusCredits,
        creditsAdded: result.creditsAdded,
        debtPaid: result.debtPaid,
        balance: result.balance,
        debtBalance: result.debtBalance,
        ztrAmountPaid: result.ztrAmountPaid,
        usdPrice: result.usdPrice,
        transactionSignature: result.transactionSignature,
        requiresSigning: true,
        transactionData: result.transactionData // This contains transactionBase64
      }
    });
  } catch (error) {
    console.error('Error purchasing credits with ZTR:', error);
    res.status(500).json({ 
      error: 'Failed to purchase credits with ZTR',
      details: error.message 
    });
  }
});

// GET /api/credits/ztr-price - Get current ZTR price and purchase info
router.get('/ztr-price', authenticateToken, async (req, res) => {
  try {
    const ZTRPriceService = require('../services/ZTRPriceService');
    const TokenAccessService = require('../services/TokenAccessService');
    
    const userId = req.user.id;
    const userWallet = req.user.wallet_address;

    if (!userWallet) {
      return res.status(400).json({ 
        error: 'Wallet address required' 
      });
    }

    // Get ZTR price info (with fallback to default price)
    let priceInfo;
    try {
      priceInfo = await ZTRPriceService.getPriceInfo();
    } catch (error) {
      console.error('Error getting ZTR price info, using default:', error);
      // Use default price if fetch fails - the getPriceInfo() method already handles this
      // But if it still fails, use a hardcoded default
      priceInfo = {
        priceUSD: 0.001, // Default fallback price
        tokenAddress: 'AwJpEPLHaTHHSzfrt3AFu3kcuwSozudvQ1RaU1Fq9ray',
        lastUpdated: null,
        cacheAge: null,
        isDefaultPrice: true
      };
    }
    
    // Get user's ZTR balance
    let userBalance = 0;
    try {
      userBalance = await TokenAccessService.getZTRBalance(userWallet);
    } catch (error) {
      console.error('Error fetching ZTR balance:', error);
      // Continue with 0 balance if fetch fails
    }

    // Get credit packages for calculation example
    const packages = await creditService.getCreditPackages();
    const examplePackage = packages.find(p => p.is_active) || packages[0];
    
    let exampleCalculation = null;
    if (examplePackage) {
      try {
        const usdPrice = examplePackage.price_usdc || examplePackage.price_sol * 150;
        const ztrNeeded = await ZTRPriceService.calculateZTRAmountNeeded(usdPrice);
        const baseCredits = examplePackage.credits;
        const bonusCredits = Math.floor(baseCredits * 0.2);
        
        exampleCalculation = {
          packageName: examplePackage.name,
          usdPrice: usdPrice,
          baseCredits: baseCredits,
          bonusCredits: bonusCredits,
          totalCredits: baseCredits + bonusCredits,
          ztrNeeded: ztrNeeded,
          hasEnoughBalance: userBalance >= ztrNeeded
        };
      } catch (error) {
        console.error('Error calculating example:', error);
        // Still return price info even if calculation fails
      }
    }

    res.json({
      success: true,
      data: {
        ztrPriceUSD: priceInfo.priceUSD,
        userBalance: userBalance,
        tokenAddress: priceInfo.tokenAddress,
        lastUpdated: priceInfo.lastUpdated,
        isDefaultPrice: priceInfo.isDefaultPrice || false,
        bonusPercentage: 20,
        exampleCalculation: exampleCalculation
      }
    });
  } catch (error) {
    console.error('Error fetching ZTR price:', error);
    // Return error response - frontend will not show ZTR option if price fetch fails
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch ZTR price',
      details: error.message 
    });
  }
});

// POST /api/credits/purchase - Purchase credits
router.post('/purchase', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userWallet = req.user.wallet_address;
    const { packageId, paymentMethod = 'SOL' } = req.body;

    if (!packageId) {
      return res.status(400).json({ error: 'Package ID is required' });
    }

    if (!userWallet) {
      return res.status(400).json({ error: 'User wallet address not found in authentication token' });
    }

    console.log(`Purchasing ${packageId} credits for user ${userId} with wallet ${userWallet}`);
    console.log(`Payment method: ${paymentMethod}`);

    // Get credit package details
    const package = await creditService.getCreditPackage(packageId);
    if (!package) {
      return res.status(404).json({ error: 'Credit package not found' });
    }

    // Display cost based on payment method
    if (paymentMethod.toUpperCase() === 'USDC') {
      console.log(`Cost: ${package.price_usdc || 1.00} USDC`);
    } else {
      console.log(`Cost: ${package.price_sol || 0.0001} SOL`);
    }

    // Process SOL payment
    const { PublicKey } = require('@solana/web3.js');
    const userWalletPubkey = new PublicKey(userWallet);
    
    const transactionResult = await solanaService.purchaseCredits(
      userWalletPubkey, 
      package.credits, 
      paymentMethod.toUpperCase()
    );

    // Check if this is a mock/development transaction
    if (typeof transactionResult === 'string' && (transactionResult.startsWith('mock_') || transactionResult.startsWith('tx_'))) {
      // Development mode: update credits immediately
      const result = await creditService.addCredits(userId, package.credits, transactionResult);
      
      res.json({
        success: true,
        message: 'Credits purchased successfully (Development Mode)',
        data: {
          creditsPurchased: package.credits,
          newBalance: result.balance,
          transactionSignature: transactionResult,
          cost: package.price_sol || package.price_usdc || 0.0001,
          isDevelopment: true
        }
      });
    } else {
      // Production mode: return transaction for frontend signing
      res.json({
        success: true,
        message: 'Transaction created, please sign with your wallet',
        data: {
          creditsPurchased: package.credits,
          cost: package.price_sol || package.price_usdc || 0.0001,
          isDevelopment: false,
          requiresSigning: true,
          transactionData: transactionResult,
          packageId: packageId
        }
      });
    }
  } catch (error) {
    console.error('Error purchasing credits:', error);
    res.status(500).json({ 
      error: 'Failed to purchase credits',
      details: error.message 
    });
  }
});

// POST /api/credits/send-transaction - Send a signed transaction to blockchain
router.post('/send-transaction', authenticateToken, async (req, res) => {
  try {
    const { signedTransaction } = req.body;
    
    if (!signedTransaction) {
      return res.status(400).json({ error: 'Signed transaction is required' });
    }
    
    console.log('Sending transaction to blockchain...');
    
    // Send transaction through backend connection to avoid CORS
    const transactionBuffer = Buffer.from(signedTransaction, 'base64');
    const signature = await solanaService.connection.sendRawTransaction(
      transactionBuffer,
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      }
    );
    
    console.log('Transaction sent successfully, signature:', signature);
    
    res.json({
      success: true,
      signature: signature
    });
  } catch (error) {
    console.error('Error sending transaction:', error);
    res.status(500).json({ 
      error: 'Failed to send transaction',
      details: error.message 
    });
  }
});

// POST /api/credits/confirm-transaction - Confirm a transaction on blockchain
router.post('/confirm-transaction', authenticateToken, async (req, res) => {
  try {
    const { signature, packageId } = req.body;
    const userId = req.user.id;
    
    if (!signature) {
      return res.status(400).json({ error: 'Transaction signature is required' });
    }
    
    console.log('Confirming transaction:', signature);
    console.log('Request body:', JSON.stringify(req.body));
    console.log('PackageId received:', packageId, 'Type:', typeof packageId);
    
    // Try to confirm transaction with better timeout handling
    let confirmation;
    let transactionConfirmed = false;
    try {
      // First try with a shorter timeout
      confirmation = await solanaService.connection.confirmTransaction(signature, 'confirmed');
      console.log('Transaction confirmation:', confirmation);
      
      // Check if transaction failed
      if (confirmation.value.err) {
        console.error('Transaction failed with error:', confirmation.value.err);
        
        // Get more details about the failed transaction
        const transaction = await solanaService.connection.getTransaction(signature, {
          commitment: 'confirmed'
        });
        
        if (transaction && transaction.meta && transaction.meta.err) {
          console.error('Detailed transaction error:', transaction.meta.err);
          console.error('Transaction logs:', transaction.meta.logMessages);
        }
        
        return res.status(400).json({
          success: false,
          error: 'Transaction failed on blockchain',
          details: confirmation.value.err,
          signature: signature
        });
      }
      transactionConfirmed = true;
      
    } catch (timeoutError) {
      console.log('Confirmation timeout, checking transaction status...');
      
      // If timeout, check if transaction actually succeeded
      const transaction = await solanaService.connection.getTransaction(signature, {
        commitment: 'confirmed'
      });
      
      if (transaction) {
        if (transaction.meta && transaction.meta.err) {
          console.error('Transaction found but failed:', transaction.meta.err);
          console.error('Transaction logs:', transaction.meta.logMessages);
          
          return res.status(400).json({
            success: false,
            error: 'Transaction failed on blockchain',
            details: transaction.meta.err,
            signature: signature,
            logs: transaction.meta.logMessages
          });
        } else {
          console.log('Transaction found on blockchain and successful');
          confirmation = { value: { err: null } };
          transactionConfirmed = true;
        }
      } else {
        console.log('Transaction not found, may still be processing');
        // Return a "pending" status instead of failing
        return res.json({
          success: true,
          value: { err: null },
          status: 'pending',
          message: 'Transaction is still being processed'
        });
      }
    }
    
    // If transaction is confirmed and packageId is provided, add credits now
    if (transactionConfirmed) {
      if (packageId) {
        try {
          console.log(`✅ Transaction confirmed, adding credits for package ${packageId}...`);
          const creditService = new CreditService();
          // Pass signature to indicate transaction is confirmed
          // packageId can be UUID or number, pass as-is (don't parseInt for UUIDs)
          const result = await creditService.purchaseCreditsWithZTR(userId, packageId, signature);
          
          console.log(`✅ Credits added successfully: ${result.credits} credits (${result.baseCredits} base + ${result.bonusCredits} bonus)`);
          
          return res.json({
            success: true,
            value: confirmation.value,
            credits: result.credits,
            baseCredits: result.baseCredits,
            bonusCredits: result.bonusCredits,
            creditsAdded: result.creditsAdded,
            debtPaid: result.debtPaid,
            balance: result.balance,
            debtBalance: result.debtBalance,
            ztrAmountPaid: result.ztrAmountPaid,
            usdPrice: result.usdPrice,
            transactionSignature: signature,
            message: result.message
          });
        } catch (creditError) {
          console.error('❌ Error adding credits after confirmation:', creditError);
          console.error('Error stack:', creditError.stack);
          // Transaction is confirmed but credits failed to add - this is a problem
          // Return success for transaction but note the credit issue
          return res.status(500).json({
            success: true,
            value: confirmation.value,
            error: 'Transaction confirmed but failed to add credits',
            details: creditError.message
          });
        }
      } else {
        console.warn('⚠️ Transaction confirmed but no packageId provided - credits not added');
        console.warn('⚠️ This means credits were not added to the account!');
      }
    }
    
    res.json({
      success: true,
      value: confirmation.value
    });
  } catch (error) {
    console.error('Error confirming transaction:', error);
    res.status(500).json({ 
      error: 'Failed to confirm transaction',
      details: error.message 
    });
  }
});

// POST /api/credits/verify-payment - Verify a payment transaction
router.post('/verify-payment', authenticateToken, async (req, res) => {
  try {
    const { signature } = req.body;
    
    if (!signature) {
      return res.status(400).json({ error: 'Transaction signature is required' });
    }
    
    const verification = await solanaService.verifyPayment(signature);
    
    res.json({
      success: verification.success,
      data: verification
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      error: 'Failed to verify payment',
      details: error.message 
    });
  }
});

// POST /api/credits/complete-purchase - Complete a credit purchase after transaction confirmation
router.post('/complete-purchase', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { transactionSignature, packageId, creditsAmount } = req.body;
    
    if (!transactionSignature || !packageId || !creditsAmount) {
      return res.status(400).json({ error: 'Transaction signature, package ID, and credits amount are required' });
    }
    
    console.log(`Completing purchase for user ${userId}, signature: ${transactionSignature}`);
    
    // Verify the payment first
    const verification = await solanaService.verifyPayment(transactionSignature);
    
    if (!verification.success) {
      return res.status(400).json({ 
        error: 'Payment verification failed',
        details: verification.error 
      });
    }
    
    // Add credits to user account
    const result = await creditService.addCredits(userId, creditsAmount, transactionSignature);
    
    res.json({
      success: true,
      message: 'Purchase completed successfully',
      data: {
        creditsPurchased: creditsAmount,
        newBalance: result.balance,
        transactionSignature: transactionSignature,
        verificationDetails: verification
      }
    });
  } catch (error) {
    console.error('Error completing purchase:', error);
    res.status(500).json({ 
      error: 'Failed to complete purchase',
      details: error.message 
    });
  }
});

// POST /api/credits/deduct - Deduct credits (internal use)
router.post('/deduct', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { actionType, amount, referenceId } = req.body;

    if (!actionType || !amount) {
      return res.status(400).json({ error: 'Action type and amount are required' });
    }

    const result = await creditService.deductCredits(userId, actionType, amount, referenceId);
    
    res.json({
      success: true,
      message: 'Credits deducted successfully',
      data: {
        creditsDeducted: result.creditsDeducted,
        newBalance: result.newBalance,
        debtBalance: result.debtBalance
      }
    });
  } catch (error) {
    console.error('Error deducting credits:', error);
    res.status(500).json({ 
      error: 'Failed to deduct credits',
      details: error.message 
    });
  }
});

// POST /api/credits/repay-debt - Repay debt (with credits or payment)
router.post('/repay-debt', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userWallet = req.user.wallet_address;
    const { amount, paymentMethod = 'credits' } = req.body; // 'credits' or 'USDC'/'SOL'

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Get current credit balance and debt
    const currentResult = await database.query(
      'SELECT credit_balance, debt_balance FROM user_credits WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'User credit account not found' });
    }

    const currentBalance = parseFloat(currentResult.rows[0].credit_balance) || 0;
    const currentDebt = parseFloat(currentResult.rows[0].debt_balance) || 0;
    
    if (currentDebt <= 0) {
      return res.status(400).json({ error: 'No debt to repay' });
    }

    // Ensure amount doesn't exceed debt
    const debtToRepay = Math.min(amount, currentDebt);

    // If paying with credits
    if (paymentMethod === 'credits') {
      if (currentBalance < debtToRepay) {
        return res.status(400).json({ 
          error: 'Insufficient credits to pay debt',
          availableCredits: currentBalance,
          requiredCredits: debtToRepay
        });
      }

      // Deduct credits and reduce debt
      const newBalance = currentBalance - debtToRepay;
      const newDebt = currentDebt - debtToRepay;

      await database.query(`
        UPDATE user_credits 
        SET 
          credit_balance = $1,
          debt_balance = $2,
          updated_at = NOW()
        WHERE user_id = $3
      `, [newBalance, newDebt, userId]);

      // Log transaction
      await creditService.logCreditTransaction(
        userId,
        'debt_repayment',
        -debtToRepay,
        `Paid ${debtToRepay} credits of debt using available credits`
      );

      return res.json({
        success: true,
        message: 'Debt repaid successfully using credits',
        data: {
          debtRepaid: debtToRepay,
          remainingDebt: newDebt,
          creditsUsed: debtToRepay,
          newCreditBalance: newBalance,
          paymentMethod: 'credits'
        }
      });
    }

    // If paying with payment (USDC/SOL)
    if (!userWallet) {
      return res.status(400).json({ error: 'User wallet address not found' });
    }

    // Calculate payment cost (same rate as credit purchase: 1 credit = 0.01 USDC)
    const creditCostPerUnit = 0.01;
    const paymentAmount = debtToRepay * creditCostPerUnit;

    console.log(`Repaying ${debtToRepay} credits of debt for user ${userId}`);
    console.log(`Payment method: ${paymentMethod}, Amount: ${paymentAmount} ${paymentMethod}`);

    // Process payment via Solana
    const { PublicKey } = require('@solana/web3.js');
    const userWalletPubkey = new PublicKey(userWallet);
    
    const transactionSignature = await solanaService.purchaseCredits(
      userWalletPubkey,
      debtToRepay,
      paymentMethod.toUpperCase()
    );

    // Update debt balance after successful payment
    const result = await creditService.repayDebt(userId, debtToRepay);
    
    res.json({
      success: true,
      message: 'Debt repaid successfully',
      data: {
        debtRepaid: debtToRepay,
        remainingDebt: result.debt_balance,
        paymentAmount: paymentAmount,
        paymentMethod: paymentMethod,
        transactionSignature: transactionSignature
      }
    });
  } catch (error) {
    console.error('Error repaying debt:', error);
    res.status(500).json({ 
      error: 'Failed to repay debt',
      details: error.message 
    });
  }
});

// POST /api/credits/refund - Refund credits for failed operations
router.post('/refund', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, reason, originalReferenceId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Refund reason is required' });
    }

    const result = await creditService.refundCredits(userId, amount, reason, originalReferenceId);
    
    res.json({
      success: true,
      message: 'Credits refunded successfully',
      data: {
        creditsRefunded: result.creditsRefunded,
        newBalance: result.newBalance,
        reason: result.reason
      }
    });
  } catch (error) {
    console.error('Error refunding credits:', error);
    res.status(500).json({ 
      error: 'Failed to refund credits',
      details: error.message 
    });
  }
});

// POST /api/credits/auto-recharge - Configure auto-recharge
router.post('/auto-recharge', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { enabled, threshold = 100, amount = 500 } = req.body;

    const result = await creditService.configureAutoRecharge(userId, enabled, threshold, amount);
    
    res.json({
      success: true,
      message: 'Auto-recharge configured successfully',
      data: {
        autoRechargeEnabled: result.auto_recharge_enabled,
        autoRechargeThreshold: result.auto_recharge_threshold,
        autoRechargeAmount: result.auto_recharge_amount
      }
    });
  } catch (error) {
    console.error('Error configuring auto-recharge:', error);
    res.status(500).json({ 
      error: 'Failed to configure auto-recharge',
      details: error.message 
    });
  }
});

// GET /api/credits/transactions - Get credit transaction history
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const transactions = await creditService.getCreditTransactions(
      userId, 
      parseInt(limit), 
      parseInt(offset)
    );
    
    res.json({
      success: true,
      data: transactions.map(tx => ({
        id: tx.id,
        transactionType: tx.transaction_type,
        amount: tx.amount,
        balanceBefore: tx.balance_before,
        balanceAfter: tx.balance_after,
        description: tx.description,
        referenceId: tx.reference_id,
        createdAt: tx.created_at
      }))
    });
  } catch (error) {
    console.error('Error getting credit transactions:', error);
    res.status(500).json({ 
      error: 'Failed to get credit transactions',
      details: error.message 
    });
  }
});

// GET /api/credits/stats - Get credit usage statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await creditService.getCreditStats(userId);
    
    res.json({
      success: true,
      data: {
        creditBalance: stats.credit_balance,
        totalPurchased: stats.total_purchased,
        totalUsed: stats.total_used,
        debtBalance: stats.debt_balance,
        transactionCount: parseInt(stats.transaction_count) || 0,
        totalBonus: stats.total_bonus || 0,
        autoRechargeEnabled: stats.auto_recharge_enabled,
        autoRechargeThreshold: stats.auto_recharge_threshold,
        autoRechargeAmount: stats.auto_recharge_amount
      }
    });
  } catch (error) {
    console.error('Error getting credit stats:', error);
    res.status(500).json({ 
      error: 'Failed to get credit stats',
      details: error.message 
    });
  }
});

// GET /api/credits/queue - Get queued posts
router.get('/queue', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { platform } = req.query;
    
    const postQueueService = require('../services/PostQueueService');
    const queuedPosts = await postQueueService.getQueuedPosts(userId, platform);
    
    res.json({
      success: true,
      data: {
        queuedPosts: queuedPosts,
        totalQueued: queuedPosts.length
      }
    });
  } catch (error) {
    console.error('Error getting queued posts:', error);
    res.status(500).json({ 
      error: 'Failed to get queued posts',
      details: error.message 
    });
  }
});

// DELETE /api/credits/queue/:queueId - Cancel queued post
router.delete('/queue/:queueId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { queueId } = req.params;
    
    const postQueueService = require('../services/PostQueueService');
    const result = await postQueueService.cancelQueuedPost(userId, queueId);
    
    res.json(result);
  } catch (error) {
    console.error('Error cancelling queued post:', error);
    res.status(500).json({ 
      error: 'Failed to cancel queued post',
      details: error.message 
    });
  }
});

// GET /api/credits/rate-limits - Get current rate limit status
router.get('/rate-limits', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { platform = 'twitter' } = req.query;
    
    const postQueueService = require('../services/PostQueueService');
    const rateLimitStatus = await postQueueService.checkRateLimit(userId, platform);
    
    res.json({
      success: true,
      data: {
        platform: platform,
        isLimited: rateLimitStatus.isLimited,
        currentCount: rateLimitStatus.currentCount || 0,
        limitMax: rateLimitStatus.limitMax || 25,
        remainingPosts: rateLimitStatus.remainingPosts || 25,
        resetTime: rateLimitStatus.resetTime || null
      }
    });
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    res.status(500).json({ 
      error: 'Failed to get rate limit status',
      details: error.message 
    });
  }
});

module.exports = router;
