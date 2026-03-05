const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Database = require('../database/connection');
const logger = require('../utils/logger');

const router = express.Router();

// Shopify OAuth configuration
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const SHOPIFY_SCOPES = 'read_products,read_customers,read_orders';
// OAuth callback must point to BACKEND API, not frontend
const OAUTH_REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI || `https://www.iqonga.org/api/shopify/auth/callback`;

// Middleware to authenticate user
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        logger.info('Auth header received:', authHeader);
        
        const token = authHeader?.replace('Bearer ', '');
        if (!token) {
            logger.error('No token provided in authorization header');
            return res.status(401).json({ error: 'No token provided' });
        }

        logger.info('Token extracted (first 20 chars):', token.substring(0, 20));
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        logger.info('Token decoded successfully, userId:', decoded.userId);
        
        // Fetch full user from database
        const userResult = await Database.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
        if (userResult.rows.length === 0) {
            logger.error('User not found in database:', decoded.userId);
            return res.status(401).json({ error: 'User not found' });
        }
        req.user = userResult.rows[0];
        logger.info('User authenticated successfully:', req.user.id);
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        return res.status(401).json({ error: 'Invalid token', details: error.message });
    }
};

// Generate OAuth state for security
const generateOAuthState = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Start OAuth flow - redirect user to Shopify
router.get('/auth', authenticateUser, async (req, res) => {
    try {
        const { shop } = req.query;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop domain is required' });
        }

        // Validate shop domain format
        const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
        
        // Generate secure state
        const state = generateOAuthState();
        
        // Store state in database with expiration (5 minutes)
        await Database.query(
            'INSERT INTO user_shopify_oauth_states (user_id, state, shop_domain, expires_at) VALUES ($1, $2, $3, $4)',
            [req.user.id, state, shopDomain, new Date(Date.now() + 5 * 60 * 1000)]
        );

        // Build OAuth URL
        const oauthUrl = `https://${shopDomain}/admin/oauth/authorize?` +
            `client_id=${SHOPIFY_CLIENT_ID}&` +
            `scope=${SHOPIFY_SCOPES}&` +
            `redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}&` +
            `state=${state}`;

        logger.info(`OAuth initiated for user ${req.user.id}, shop: ${shopDomain}`);
        
        res.json({ 
            success: true, 
            oauth_url: oauthUrl,
            message: 'Redirect user to this URL to authorize Shopify access'
        });

    } catch (error) {
        logger.error('OAuth initiation error:', error);
        res.status(500).json({ error: 'Failed to initiate OAuth flow' });
    }
});

// Handle OAuth callback from Shopify
router.get('/auth/callback', async (req, res) => {
    try {
        const { code, state, shop } = req.query;
        
        if (!code || !state || !shop) {
            logger.error('Missing OAuth parameters:', { code: !!code, state: !!state, shop: !!shop });
            return res.redirect(`${process.env.FRONTEND_URL}/shopify?error=missing_parameters`);
        }

        // Verify state exists and hasn't expired
        const stateResult = await Database.query(
            'SELECT user_id, shop_domain FROM user_shopify_oauth_states WHERE state = $1 AND expires_at > NOW()',
            [state]
        );

        if (stateResult.rows.length === 0) {
            logger.error('Invalid or expired OAuth state:', state);
            return res.redirect(`${process.env.FRONTEND_URL}/shopify?error=invalid_state`);
        }

        const { user_id, shop_domain } = stateResult.rows[0];

        // Exchange code for access token
        const tokenResponse = await fetch(`https://${shop_domain}/admin/oauth/access_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: SHOPIFY_CLIENT_ID,
                client_secret: SHOPIFY_CLIENT_SECRET,
                code: code
            })
        });

        if (!tokenResponse.ok) {
            logger.error('Failed to exchange code for token:', await tokenResponse.text());
            return res.redirect(`${process.env.FRONTEND_URL}/shopify?error=token_exchange_failed`);
        }

        const tokenData = await tokenResponse.json();
        const { access_token, scope } = tokenData;

        // Store user's Shopify configuration
        await Database.query(`
            INSERT INTO user_shopify_configs (user_id, shop_domain, access_token, scope, is_active)
            VALUES ($1, $2, $3, $4, true)
            ON CONFLICT (user_id, shop_domain) 
            DO UPDATE SET 
                access_token = EXCLUDED.access_token,
                scope = EXCLUDED.scope,
                is_active = true,
                updated_at = CURRENT_TIMESTAMP
        `, [user_id, shop_domain, access_token, scope]);

        // Clean up OAuth state
        await Database.query('DELETE FROM user_shopify_oauth_states WHERE state = $1', [state]);

        logger.info(`Shopify OAuth completed for user ${user_id}, shop: ${shop_domain}`);

        // Redirect back to frontend with success
        res.redirect(`${process.env.FRONTEND_URL}/shopify?success=true&shop=${shop_domain}`);

    } catch (error) {
        logger.error('OAuth callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/shopify?error=callback_failed`);
    }
});

// Get user's Shopify configuration
router.get('/config', authenticateUser, async (req, res) => {
    try {
        const result = await Database.query(
            'SELECT shop_domain, scope, is_active, last_sync_at, created_at FROM user_shopify_configs WHERE user_id = $1 AND is_active = true',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.json({
                connected: false,
                message: 'No Shopify store connected'
            });
        }

        const config = result.rows[0];
        res.json({
            connected: true,
            shop_domain: config.shop_domain,
            scope: config.scope,
            last_sync_at: config.last_sync_at,
            connected_at: config.created_at
        });

    } catch (error) {
        logger.error('Error fetching Shopify config:', error);
        res.status(500).json({ error: 'Failed to fetch Shopify configuration' });
    }
});

// Disconnect Shopify store
router.delete('/disconnect', authenticateUser, async (req, res) => {
    try {
        await Database.query(
            'UPDATE user_shopify_configs SET is_active = false WHERE user_id = $1',
            [req.user.id]
        );

        logger.info(`Shopify disconnected for user ${req.user.id}`);
        res.json({ success: true, message: 'Shopify store disconnected successfully' });

    } catch (error) {
        logger.error('Error disconnecting Shopify:', error);
        res.status(500).json({ error: 'Failed to disconnect Shopify store' });
    }
});

// Test connection to user's Shopify store
router.post('/test-connection', authenticateUser, async (req, res) => {
    try {
        const result = await Database.query(
            'SELECT shop_domain, access_token FROM user_shopify_configs WHERE user_id = $1 AND is_active = true',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'No Shopify store connected' });
        }

        const { shop_domain, access_token } = result.rows[0];

        // Test API connection
        const testResponse = await fetch(`https://${shop_domain}/admin/api/2025-10/shop.json`, {
            headers: {
                'X-Shopify-Access-Token': access_token
            }
        });

        if (testResponse.ok) {
            const shopData = await testResponse.json();
            res.json({
                success: true,
                shop: shopData.shop,
                message: 'Connection successful'
            });
        } else {
            res.json({
                success: false,
                error: 'Failed to connect to Shopify store'
            });
        }

    } catch (error) {
        logger.error('Connection test error:', error);
        res.status(500).json({ error: 'Failed to test connection' });
    }
});

module.exports = router;
