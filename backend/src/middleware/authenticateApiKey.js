const ApiKeyService = require('../services/ApiKeyService');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate requests using API keys for external platforms
 * 
 * API key should be provided in Authorization header:
 * Authorization: Bearer aif_xxxxxxxxxxxxx
 */
const authenticateApiKey = async (req, res, next) => {
  const startTime = Date.now();

  try {
    // Extract API key from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid Authorization header',
        message: 'Please provide API key in format: Authorization: Bearer aif_xxxxxxxxxxxxx'
      });
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate API key
    const keyData = await ApiKeyService.validateApiKey(apiKey);

    if (!keyData) {
      await logFailedAttempt(req, startTime, 401, 'Invalid or expired API key');
      
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired API key',
        message: 'The provided API key is invalid, revoked, or expired'
      });
    }

    // Check rate limits
    const rateLimitCheck = await ApiKeyService.checkRateLimit(keyData.id);

    if (!rateLimitCheck.allowed) {
      await logFailedAttempt(req, startTime, 429, rateLimitCheck.reason, keyData);
      
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: rateLimitCheck.reason,
        limit: rateLimitCheck.limit,
        current: rateLimitCheck.current,
        resetAt: rateLimitCheck.resetAt
      });
    }

    // Attach API key data to request for use in route handlers
    req.apiKey = keyData;
    req.user = {
      id: keyData.userId,
      email: keyData.userEmail
    };
    req.isExternalRequest = true;

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit-Hourly': rateLimitCheck.hourlyLimit,
      'X-RateLimit-Remaining-Hourly': rateLimitCheck.hourlyRemaining,
      'X-RateLimit-Limit-Daily': rateLimitCheck.dailyLimit,
      'X-RateLimit-Remaining-Daily': rateLimitCheck.dailyRemaining
    });

    // Continue to route handler
    next();

    // Log successful request after response is sent
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      ApiKeyService.logUsage({
        apiKeyId: keyData.id,
        userId: keyData.userId,
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        responseTimeMs: responseTime,
        requestIp: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        agentId: req.params.agentId || req.body?.agentId || null,
        postId: req.params.postId || req.body?.postId || null,
        metadata: {
          tier: keyData.tier,
          keyName: keyData.name
        }
      });
    });

  } catch (error) {
    logger.error('API key authentication error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while authenticating your request'
    });
  }
};

/**
 * Log failed authentication attempt
 */
async function logFailedAttempt(req, startTime, statusCode, reason, keyData = null) {
  const responseTime = Date.now() - startTime;
  
  if (keyData) {
    await ApiKeyService.logUsage({
      apiKeyId: keyData.id,
      userId: keyData.userId,
      endpoint: req.originalUrl,
      method: req.method,
      statusCode,
      responseTimeMs: responseTime,
      errorMessage: reason,
      requestIp: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });
  }
  
  logger.warn(`API auth failed: ${reason} - ${req.method} ${req.originalUrl} from ${req.ip}`);
}

/**
 * Middleware to check if API key has specific permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.apiKey || !req.apiKey.permissions) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Missing permissions data'
      });
    }

    const hasPermission = req.apiKey.permissions.includes(permission);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This API key does not have the '${permission}' permission`,
        required: permission,
        available: req.apiKey.permissions
      });
    }

    next();
  };
};

module.exports = {
  authenticateApiKey,
  requirePermission
};
