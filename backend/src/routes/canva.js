const express = require('express');
const router = express.Router();
const CanvaService = require('../services/CanvaService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * GET /api/canva/auth-url
 * Get Canva authorization URL
 */
router.get('/auth-url', authenticateToken, async (req, res) => {
  try {
    if (!CanvaService.isConfigured()) {
      logger.warn('Canva integration not configured - missing credentials');
      return res.status(503).json({
        error: 'Canva integration is not configured',
        message: 'Please contact support to enable Canva integration'
      });
    }

    const userId = req.user.id;
    const state = req.query.state || null;
    
    // Log the configuration (without exposing secrets)
    const clientId = process.env.CANVA_CLIENT_ID;
    const redirectUri = process.env.CANVA_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/canva/callback`;
    
    logger.info('Generating Canva auth URL', {
      userId,
      clientId: clientId ? `${clientId.substring(0, 4)}...` : 'MISSING',
      redirectUri,
      hasClientSecret: !!process.env.CANVA_CLIENT_SECRET
    });
    
    const authUrl = CanvaService.getAuthorizationUrl(userId, state);
    
    logger.info('Canva auth URL generated successfully', {
      userId,
      authUrlLength: authUrl.length,
      redirectUri
    });

    res.json({
      authUrl,
      state
    });
  } catch (error) {
    logger.error('Failed to get Canva auth URL:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      error: 'Failed to generate authorization URL',
      message: error.message
    });
  }
});

/**
 * GET /api/canva/callback
 * Handle OAuth callback from Canva
 * NOTE: This route does NOT require authentication because Canva redirects here without a token
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Log callback attempt
    logger.info('Canva OAuth callback received', {
      hasCode: !!code,
      hasError: !!error,
      hasState: !!state,
      error,
      errorDescription: error_description
    });

    if (error) {
      logger.error('Canva OAuth error in callback:', {
        error,
        errorDescription: error_description,
        state
      });
      const errorMessage = error_description 
        ? `${error}: ${decodeURIComponent(error_description)}`
        : error;
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/company?tab=brand-book&canva_error=${encodeURIComponent(errorMessage)}`);
    }

    if (!code) {
      logger.warn('Canva callback missing authorization code', { state });
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/company?tab=brand-book&canva_error=no_code`);
    }

    if (!state) {
      logger.warn('Canva callback missing state parameter', { hasCode: !!code });
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/company?tab=brand-book&canva_error=no_state`);
    }

    // Get userId from state (stored during auth URL generation)
    const userId = CanvaService.getUserIdFromState(state);
    if (!userId) {
      logger.error('Cannot identify user from OAuth state', { state });
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/company?tab=brand-book&canva_error=invalid_state`);
    }

    logger.info('Exchanging Canva authorization code for token', { userId, state });
    await CanvaService.exchangeCodeForToken(code, userId, state);
    logger.info('Canva token exchange successful', { userId });

    // Redirect back to frontend with success
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/company?tab=brand-book&canva_connected=true`);
  } catch (error) {
    logger.error('Canva callback error:', {
      error: error.message,
      stack: error.stack,
      state: req.query.state
    });
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/company?tab=brand-book&canva_error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * GET /api/canva/status
 * Check if Canva is connected
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isConnected = await CanvaService.isConnected(userId);

    res.json({
      connected: isConnected,
      configured: CanvaService.isConfigured()
    });
  } catch (error) {
    logger.error('Failed to check Canva status:', error);
    res.status(500).json({
      error: 'Failed to check connection status',
      message: error.message
    });
  }
});

/**
 * GET /api/canva/debug-config
 * Debug endpoint to check Canva configuration (temporary, remove in production)
 */
router.get('/debug-config', authenticateToken, (req, res) => {
  const clientId = process.env.CANVA_CLIENT_ID;
  const redirectUri = process.env.CANVA_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/canva/callback`;
  
  res.json({
    hasClientId: !!clientId,
    clientIdPrefix: clientId ? `${clientId.substring(0, 10)}...` : 'MISSING',
    clientIdLength: clientId ? clientId.length : 0,
    clientIdStartsWithOC: clientId ? clientId.startsWith('OC-') : false,
    hasClientSecret: !!process.env.CANVA_CLIENT_SECRET,
    redirectUri,
    frontendUrl: process.env.FRONTEND_URL,
    isConfigured: CanvaService.isConfigured(),
    authUrl: 'https://www.canva.com/api/oauth/authorize',
    tokenUrl: 'https://api.canva.com/rest/v1/oauth/token'
  });
});

/**
 * POST /api/canva/disconnect
 * Disconnect Canva account
 */
router.post('/disconnect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await CanvaService.disconnectCanva(userId);

    res.json({
      success: true,
      message: 'Canva account disconnected successfully'
    });
  } catch (error) {
    logger.error('Failed to disconnect Canva:', error);
    res.status(500).json({
      error: 'Failed to disconnect account',
      message: error.message
    });
  }
});

/**
 * GET /api/canva/designs
 * Get user's Canva designs
 */
router.get('/designs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit, continuation } = req.query;

    const result = await CanvaService.getUserDesigns(userId, {
      limit: limit ? parseInt(limit) : 50,
      continuation: continuation || null
    });

    res.json({
      success: true,
      designs: result.designs,
      continuation: result.continuation
    });
  } catch (error) {
    logger.error('Failed to get designs:', error);
    res.status(500).json({
      error: 'Failed to fetch designs',
      message: error.message
    });
  }
});

/**
 * GET /api/canva/designs/:designId
 * Get design details
 */
router.get('/designs/:designId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { designId } = req.params;

    const design = await CanvaService.getDesignDetails(userId, designId);

    res.json({
      success: true,
      design
    });
  } catch (error) {
    logger.error('Failed to get design details:', error);
    res.status(500).json({
      error: 'Failed to fetch design details',
      message: error.message
    });
  }
});

/**
 * POST /api/canva/designs/:designId/export
 * Export design (download as image/video)
 */
router.post('/designs/:designId/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { designId } = req.params;
    const { format = 'png', thumbnailUrl } = req.body; // Accept thumbnailUrl as fallback

    const exportResult = await CanvaService.exportDesign(userId, designId, format, thumbnailUrl);

    res.json({
      success: true,
      downloadUrl: exportResult.downloadUrl,
      format: exportResult.format,
      size: exportResult.size,
      isThumbnail: exportResult.isThumbnail || false
    });
  } catch (error) {
    logger.error('Failed to export design:', error);
    res.status(500).json({
      error: 'Failed to export design',
      message: error.message
    });
  }
});

/**
 * GET /api/canva/assets/search
 * Search Canva stock assets
 */
router.get('/assets/search', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { query, type, limit } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Query parameter is required'
      });
    }

    const assets = await CanvaService.searchStockAssets(userId, query, {
      type: type || 'image',
      limit: limit ? parseInt(limit) : 20
    });

    res.json({
      success: true,
      assets
    });
  } catch (error) {
    logger.error('Failed to search assets:', error);
    res.status(500).json({
      error: 'Failed to search assets',
      message: error.message
    });
  }
});

/**
 * POST /api/canva/assets/upload
 * Upload asset to Canva
 */
router.post('/assets/upload', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { filePath, name, type, mimeType } = req.body;

    if (!filePath) {
      return res.status(400).json({
        error: 'File path is required'
      });
    }

    const result = await CanvaService.uploadAsset(userId, filePath, {
      name,
      type: type || 'image',
      mimeType
    });

    res.json({
      success: true,
      asset: result
    });
  } catch (error) {
    logger.error('Failed to upload asset:', error);
    res.status(500).json({
      error: 'Failed to upload asset',
      message: error.message
    });
  }
});

module.exports = router;
