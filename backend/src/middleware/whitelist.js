const database = require('../database/connection');

const isWhitelisted = async (walletAddress) => {
  if (!walletAddress) {
    return false;
  }
  try {
    console.log(`[WHITELIST_DEBUG] Checking wallet: ${walletAddress}. Using case-insensitive query.`);
    const result = await database.query(
      'SELECT 1 FROM wallet_whitelist WHERE LOWER(wallet_address) = LOWER($1) AND is_active = TRUE',
      [walletAddress]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking whitelist:', error);
    return false;
  }
};

const checkWhitelist = async (req, res, next) => {
  const walletAddress = req.params.walletAddress || req.body.walletAddress || (req.user && req.user.wallet_address);

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required for whitelist check.' });
  }

  const isAllowed = await isWhitelisted(walletAddress);

  if (!isAllowed) {
    return res.status(403).json({ 
      error: 'Access Denied: Wallet not whitelisted.',
      whitelisted: false
    });
  }
  
  // Attach the whitelist status to the request object
  req.isWhitelisted = true;
  next();
};

module.exports = {
    checkWhitelist,
    isWhitelisted
}; 