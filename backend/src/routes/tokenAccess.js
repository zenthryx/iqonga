const express = require('express');
const router = express.Router();
const TokenAccessService = require('../services/TokenAccessService');

// Get access requirements (public endpoint)
router.get('/requirements', async (req, res) => {
  try {
    const requirements = TokenAccessService.getAccessRequirements();
    
    res.json({
      success: true,
      data: requirements
    });
  } catch (error) {
    console.error('Error getting access requirements:', error);
    res.status(500).json({ 
      error: 'Failed to get access requirements',
      details: error.message 
    });
  }
});

// Check wallet access (public endpoint for frontend validation)
router.post('/check-wallet', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    const accessResult = await TokenAccessService.checkTokenAccess(walletAddress);
    
    res.json({
      success: true,
      data: accessResult
    });
  } catch (error) {
    console.error('Error checking wallet access:', error);
    res.status(500).json({ 
      error: 'Failed to check wallet access',
      details: error.message 
    });
  }
});

module.exports = router;
