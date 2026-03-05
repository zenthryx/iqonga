const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const database = require('../database/connection');
const InstagramService = require('../services/InstagramService');
const logger = require('../utils/logger');

// Initialize Instagram service
const instagramService = new InstagramService();

/**
 * Generate OAuth authorization URL (Facebook Login)
 */
router.get('/oauth/authorize', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { login_type = 'facebook' } = req.query; // 'facebook' or 'instagram'

        // Generate state token for security
        const crypto = require('crypto');
        const state = crypto.randomBytes(32).toString('hex');
        
        // Store state in session or database (for production, use Redis or database)
        // For now, we'll include userId in state (base64 encoded)
        const stateData = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
        const stateToken = `${stateData}.${state}`;

        let authUrl;
        if (login_type === 'instagram') {
            // Instagram Login (Business Login for Instagram)
            authUrl = instagramService.generateInstagramAuthUrl(stateToken);
            logger.info(`Instagram Login OAuth URL generated: ${authUrl}`);
        } else {
            // Facebook Login (default)
            authUrl = instagramService.generateFacebookAuthUrl(stateToken);
            logger.info(`Facebook Login OAuth URL generated: ${authUrl}`);
        }

        res.json({
            success: true,
            auth_url: authUrl,
            state: stateToken
        });
    } catch (error) {
        logger.error('Instagram OAuth authorize error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate authorization URL'
        });
    }
});

/**
 * OAuth callback handler (Facebook Login)
 */
router.get('/oauth/callback', async (req, res) => {
    try {
        const { code, state, error, error_reason, error_description } = req.query;

        if (error) {
            logger.error('OAuth error:', { error, error_reason, error_description });
            return res.redirect(`${instagramService.frontendRedirectUri}/instagram?error=${encodeURIComponent(error_description || error)}`);
        }

        if (!code || !state) {
            return res.redirect(`${instagramService.frontendRedirectUri}/instagram?error=${encodeURIComponent('Missing authorization code or state')}`);
        }

        // Verify and decode state
        let userId;
        try {
            const [stateData] = state.split('.');
            const decoded = JSON.parse(Buffer.from(stateData, 'base64').toString());
            userId = decoded.userId;
        } catch (e) {
            logger.error('Invalid state token:', e);
            return res.redirect(`${instagramService.frontendRedirectUri}/instagram?error=${encodeURIComponent('Invalid state token')}`);
        }

        // Exchange code for access token
        const tokenData = await instagramService.exchangeCodeForToken(code);
        const shortLivedToken = tokenData.access_token;

        // Exchange for long-lived token
        const longLivedToken = await instagramService.exchangeForLongLivedToken(shortLivedToken);

        // Get user's pages
        const pages = await instagramService.getUserPages(longLivedToken);
        
        logger.info(`Found ${pages.length} Facebook Pages for user ${userId}`);
        pages.forEach((page, index) => {
            logger.info(`Page ${index + 1}: ${page.name} (ID: ${page.id}), has Instagram: ${!!page.instagram_business_account}`);
        });

        if (pages.length === 0) {
            return res.redirect(`${instagramService.frontendRedirectUri}/instagram?error=${encodeURIComponent('No Facebook Pages found. Please create a Facebook Page and link it to your Instagram account.')}`);
        }

        // Find page with Instagram Business account
        let connectedPage = null;
        let igAccountId = null;

        for (const page of pages) {
            if (page.instagram_business_account) {
                connectedPage = page;
                igAccountId = page.instagram_business_account.id;
                logger.info(`Found Instagram Business account: ${igAccountId} on page: ${page.name}`);
                break;
            }
        }

        if (!connectedPage || !igAccountId) {
            const pageNames = pages.map(p => p.name).join(', ');
            logger.warn(`No Instagram Business account found on any of ${pages.length} pages: ${pageNames}`);
            return res.redirect(`${instagramService.frontendRedirectUri}/instagram?error=${encodeURIComponent('No Instagram Business account found. Please link your Instagram account to a Facebook Page. Go to your Facebook Page Settings > Instagram to connect your account.')}`);
        }

        // Connect the account
        const result = await instagramService.connectAccount(userId, longLivedToken, connectedPage.id);

        if (result.success) {
            return res.redirect(`${instagramService.frontendRedirectUri}/instagram?success=${encodeURIComponent('Instagram account connected successfully!')}`);
        } else {
            return res.redirect(`${instagramService.frontendRedirectUri}/instagram?error=${encodeURIComponent(result.message || 'Failed to connect account')}`);
        }
    } catch (error) {
        logger.error('Instagram OAuth callback error:', error);
        return res.redirect(`${instagramService.frontendRedirectUri}/instagram?error=${encodeURIComponent(error.message || 'Failed to complete authorization')}`);
    }
});

/**
 * OAuth callback handler (Instagram Login - Business Login for Instagram)
 */
router.get('/oauth/instagram-callback', async (req, res) => {
    try {
        const { code, state, error, error_reason, error_description } = req.query;

        if (error) {
            logger.error('Instagram OAuth error:', { error, error_reason, error_description });
            return res.redirect(`${instagramService.frontendRedirectUri}/instagram?error=${encodeURIComponent(error_description || error)}`);
        }

        if (!code || !state) {
            return res.redirect(`${instagramService.frontendRedirectUri}/instagram?error=${encodeURIComponent('Missing authorization code or state')}`);
        }

        // Verify and decode state
        let userId;
        try {
            const [stateData] = state.split('.');
            const decoded = JSON.parse(Buffer.from(stateData, 'base64').toString());
            userId = decoded.userId;
        } catch (e) {
            logger.error('Invalid state token:', e);
            return res.redirect(`${instagramService.frontendRedirectUri}/instagram?error=${encodeURIComponent('Invalid state token')}`);
        }

        // Exchange code for access token (Instagram Login returns Instagram User token)
        const tokenData = await instagramService.exchangeInstagramCodeForToken(code);
        const instagramToken = tokenData.access_token;
        const instagramUserId = tokenData.user_id;

        // For Instagram Login, we need to exchange for long-lived token
        // Note: Instagram Login tokens work differently - they're already Instagram-scoped
        const longLivedToken = await instagramService.exchangeForLongLivedToken(instagramToken);

        // Get Instagram account info directly (no page needed)
        const igAccountInfo = await instagramService.getInstagramAccountInfo(instagramUserId, longLivedToken);

        // Store account info
        await database.query(`
            INSERT INTO instagram_accounts 
            (user_id, instagram_business_account_id, username, name, profile_picture_url, 
             followers_count, follows_count, media_count, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
            ON CONFLICT (user_id, instagram_business_account_id)
            DO UPDATE SET 
                username = $3,
                name = $4,
                profile_picture_url = $5,
                followers_count = $6,
                follows_count = $7,
                media_count = $8,
                is_active = true,
                updated_at = NOW()
        `, [
            userId,
            instagramUserId,
            igAccountInfo.username,
            igAccountInfo.name,
            igAccountInfo.profile_picture_url,
            igAccountInfo.followers_count || 0,
            igAccountInfo.follows_count || 0,
            igAccountInfo.media_count || 0
        ]);

        // Store access token (no page_id for Instagram Login)
        const expiresAt = new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)); // 60 days
        await database.query(`
            INSERT INTO instagram_tokens 
            (user_id, page_id, instagram_business_account_id, access_token, token_type, 
             expires_at, scopes, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 'bearer', $5, $6, NOW(), NOW())
            ON CONFLICT (user_id, page_id, instagram_business_account_id)
            DO UPDATE SET 
                access_token = $4,
                expires_at = $5,
                scopes = $6,
                updated_at = NOW()
        `, [
            userId,
            'instagram_login', // Placeholder for Instagram Login (no page)
            instagramUserId,
            longLivedToken,
            expiresAt,
            ['instagram_basic', 'instagram_content_publish']
        ]);

        logger.info(`✅ Instagram account connected via Instagram Login: ${igAccountInfo.username} (${instagramUserId})`);

        return res.redirect(`${instagramService.frontendRedirectUri}/instagram?success=${encodeURIComponent('Instagram account connected successfully!')}`);
    } catch (error) {
        logger.error('Instagram Login OAuth callback error:', error);
        return res.redirect(`${instagramService.frontendRedirectUri}/instagram?error=${encodeURIComponent(error.message || 'Failed to complete authorization')}`);
    }
});

/**
 * Connect Instagram account (legacy - kept for backward compatibility)
 */
router.post('/connect', authenticateToken, async (req, res) => {
    try {
        const { access_token, page_id } = req.body;
        const userId = req.user.id;

        if (!access_token || !page_id) {
            return res.status(400).json({
                success: false,
                message: 'Access token and page ID are required'
            });
        }

        // Exchange for long-lived token and get Instagram Business account
        const result = await instagramService.connectAccount(userId, access_token, page_id);

        if (result.success) {
            res.json({
                success: true,
                message: 'Instagram account connected successfully',
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        logger.error('Instagram connect error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to connect Instagram account'
        });
    }
});

/**
 * Disconnect Instagram account
 */
router.post('/disconnect/:accountId', authenticateToken, async (req, res) => {
    try {
        const { accountId } = req.params;
        const userId = req.user.id;

        await instagramService.disconnectAccount(userId, accountId);

        res.json({
            success: true,
            message: 'Instagram account disconnected successfully'
        });
    } catch (error) {
        logger.error('Instagram disconnect error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to disconnect Instagram account'
        });
    }
});

/**
 * Get connected Instagram accounts (works for both authenticated and anonymous users)
 */
router.get('/accounts', async (req, res) => {
    try {
        // Try to get user ID from token, but don't require it
        let userId = null;
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            if (token && token !== 'null' && token !== 'undefined') {
                try {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    userId = decoded.userId;
                } catch (error) {
                    // Token is invalid, but that's okay for anonymous users
                    logger.warn('Invalid token for Instagram accounts:', error.message);
                }
            }
        }

        // If no user ID, return empty array for anonymous users
        if (!userId) {
            return res.json({
                success: true,
                data: []
            });
        }

        const result = await database.query(`
            SELECT 
                ia.id,
                ia.instagram_business_account_id,
                ia.username,
                ia.name,
                ia.profile_picture_url,
                ia.followers_count,
                ia.follows_count,
                ia.media_count,
                ia.is_active,
                ia.created_at,
                ia.updated_at
            FROM instagram_accounts ia
            WHERE ia.user_id = $1 AND ia.is_active = true
            ORDER BY ia.created_at DESC
        `, [userId]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error('Instagram accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch Instagram accounts'
        });
    }
});

/**
 * Publish post to Instagram (requires ZTR tokens)
 */
router.post('/publish', authenticateToken, requireTokenAccess, async (req, res) => {
    try {
        const { account_id, media_url, caption, media_type = 'IMAGE' } = req.body;
        const userId = req.user.id;

        if (!account_id || !media_url) {
            return res.status(400).json({
                success: false,
                message: 'Account ID and media URL are required'
            });
        }

        const result = await instagramService.publishPost(userId, account_id, {
            media_url,
            caption,
            media_type
        });

        if (result.success) {
            res.json({
                success: true,
                message: 'Post published successfully',
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        logger.error('Instagram publish error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to publish post'
        });
    }
});

/**
 * Get Instagram posts
 */
router.get('/posts/:accountId', authenticateToken, async (req, res) => {
    try {
        const { accountId } = req.params;
        const { limit = 25, offset = 0 } = req.query;
        const userId = req.user.id;

        const result = await database.query(`
            SELECT 
                ip.id,
                ip.instagram_media_id,
                ip.media_type,
                ip.media_url,
                ip.thumbnail_url,
                ip.caption,
                ip.permalink,
                ip.like_count,
                ip.comments_count,
                ip.reach,
                ip.impressions,
                ip.engagement,
                ip.published_at,
                ip.created_at
            FROM instagram_posts ip
            WHERE ip.user_id = $1 AND ip.instagram_business_account_id = $2
            ORDER BY ip.published_at DESC
            LIMIT $3 OFFSET $4
        `, [userId, accountId, parseInt(limit), parseInt(offset)]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error('Instagram posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch posts'
        });
    }
});

/**
 * Get Instagram analytics
 */
router.get('/analytics/:accountId', authenticateToken, async (req, res) => {
    try {
        const { accountId } = req.params;
        const { range = '30d' } = req.query;
        const userId = req.user.id;

        let dateFilter = '';
        switch (range) {
            case '7d':
                dateFilter = "AND date >= CURRENT_DATE - INTERVAL '7 days'";
                break;
            case '30d':
                dateFilter = "AND date >= CURRENT_DATE - INTERVAL '30 days'";
                break;
            case '90d':
                dateFilter = "AND date >= CURRENT_DATE - INTERVAL '90 days'";
                break;
        }

        const result = await database.query(`
            SELECT 
                date,
                followers_count,
                follows_count,
                media_count,
                impressions,
                reach,
                profile_views,
                website_clicks,
                email_contacts,
                phone_call_clicks,
                text_message_clicks
            FROM instagram_analytics
            WHERE instagram_business_account_id = $1
            ${dateFilter}
            ORDER BY date DESC
        `, [accountId]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error('Instagram analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics'
        });
    }
});

/**
 * Refresh Instagram tokens
 */
router.post('/refresh-tokens', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await instagramService.refreshAllTokens(userId);

        res.json({
            success: true,
            message: `Refreshed ${result.refreshed} tokens`,
            data: result
        });
    } catch (error) {
        logger.error('Instagram refresh tokens error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh tokens'
        });
    }
});

module.exports = router;



