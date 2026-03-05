/**
 * Iqonga v1: No credit/token system. Middleware only enforces authentication.
 */
const requireTokenAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }
  const userId = req.user.id || req.user.userId;
  if (!userId) {
    return res.status(401).json({ error: 'User ID not found', code: 'USER_ID_REQUIRED' });
  }
  req.tokenAccess = { hasAccess: true, balance: 0, threshold: 0, hasWallet: false };
  next();
};

module.exports = { requireTokenAccess };

