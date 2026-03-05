const axios = require('axios');
const database = require('../database/connection');
const logger = require('../utils/logger');

class InstagramService {
    constructor() {
        this.baseURL = 'https://graph.facebook.com/v18.0';
        this.appId = process.env.FACEBOOK_APP_ID;
        this.appSecret = process.env.FACEBOOK_APP_SECRET;
        this.instagramAppId = process.env.INSTAGRAM_APP_ID || this.appId;
        this.instagramAppSecret = process.env.INSTAGRAM_APP_SECRET || this.appSecret;
        this.redirectUri = process.env.INSTAGRAM_REDIRECT_URI || process.env.FACEBOOK_REDIRECT_URI || 'https://www.iqonga.org/api/instagram/oauth/callback';
        this.frontendRedirectUri = process.env.FRONTEND_URL || 'https://www.iqonga.org';
    }

    /**
     * Connect Instagram Business account
     */
    async connectAccount(userId, accessToken, pageId) {
        try {
            // Exchange for long-lived token
            const longLivedToken = await this.exchangeForLongLivedToken(accessToken);
            
            // Get page info and Instagram Business account
            const pageInfo = await this.getPageInfo(pageId, longLivedToken);
            
            if (!pageInfo.instagram_business_account) {
                return {
                    success: false,
                    message: 'No Instagram Business account found for this page'
                };
            }

            const igAccountId = pageInfo.instagram_business_account.id;
            
            // Get Instagram account details
            const igAccountInfo = await this.getInstagramAccountInfo(igAccountId, longLivedToken);
            
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
                igAccountId,
                igAccountInfo.username,
                igAccountInfo.name,
                igAccountInfo.profile_picture_url,
                igAccountInfo.followers_count || 0,
                igAccountInfo.follows_count || 0,
                igAccountInfo.media_count || 0
            ]);

            // Store access token
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
                pageId,
                igAccountId,
                longLivedToken,
                expiresAt,
                ['instagram_basic', 'pages_show_list', 'instagram_content_publish']
            ]);

            logger.info(`✅ Instagram account connected: ${igAccountInfo.username} (${igAccountId})`);

            return {
                success: true,
                data: {
                    account_id: igAccountId,
                    username: igAccountInfo.username,
                    name: igAccountInfo.name,
                    profile_picture_url: igAccountInfo.profile_picture_url,
                    followers_count: igAccountInfo.followers_count || 0
                }
            };
        } catch (error) {
            logger.error('Instagram connect account error:', error);
            return {
                success: false,
                message: error.response?.data?.error?.message || error.message
            };
        }
    }

    /**
     * Disconnect Instagram account
     */
    async disconnectAccount(userId, accountId) {
        try {
            await database.query(`
                UPDATE instagram_accounts 
                SET is_active = false, updated_at = NOW()
                WHERE user_id = $1 AND instagram_business_account_id = $2
            `, [userId, accountId]);

            await database.query(`
                DELETE FROM instagram_tokens 
                WHERE user_id = $1 AND instagram_business_account_id = $2
            `, [userId, accountId]);

            logger.info(`✅ Instagram account disconnected: ${accountId}`);
        } catch (error) {
            logger.error('Instagram disconnect account error:', error);
            throw error;
        }
    }

    /**
     * Publish post to Instagram
     */
    async publishPost(userId, accountId, postData) {
        try {
            // Get access token
            const tokenResult = await database.query(`
                SELECT access_token FROM instagram_tokens 
                WHERE user_id = $1 AND instagram_business_account_id = $2 AND expires_at > NOW()
            `, [userId, accountId]);

            if (tokenResult.rows.length === 0) {
                return {
                    success: false,
                    message: 'No valid access token found. Please reconnect your account.'
                };
            }

            const accessToken = tokenResult.rows[0].access_token;

            // Create media container
            const containerResponse = await axios.post(`${this.baseURL}/${accountId}/media`, {
                image_url: postData.media_url,
                caption: postData.caption || '',
                access_token: accessToken
            });

            const containerId = containerResponse.data.id;

            // Wait for container to be ready (optional)
            await this.waitForContainerReady(containerId, accessToken);

            // Publish the container
            const publishResponse = await axios.post(`${this.baseURL}/${accountId}/media_publish`, {
                creation_id: containerId,
                access_token: accessToken
            });

            const mediaId = publishResponse.data.id;

            // Get published post details
            const postDetails = await this.getMediaDetails(mediaId, accessToken);

            // Store post in database
            await database.query(`
                INSERT INTO instagram_posts 
                (user_id, instagram_business_account_id, instagram_media_id, media_type, 
                 media_url, caption, permalink, published_at, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
            `, [
                userId,
                accountId,
                mediaId,
                postData.media_type,
                postDetails.media_url,
                postData.caption,
                postDetails.permalink
            ]);

            logger.info(`✅ Instagram post published: ${mediaId}`);

            return {
                success: true,
                data: {
                    media_id: mediaId,
                    permalink: postDetails.permalink,
                    media_url: postDetails.media_url
                }
            };
        } catch (error) {
            logger.error('Instagram publish post error:', error);
            return {
                success: false,
                message: error.response?.data?.error?.message || error.message
            };
        }
    }

    /**
     * Refresh all tokens for a user
     */
    async refreshAllTokens(userId) {
        try {
            const tokensResult = await database.query(`
                SELECT id, access_token, instagram_business_account_id 
                FROM instagram_tokens 
                WHERE user_id = $1 AND expires_at > NOW() - INTERVAL '7 days'
            `, [userId]);

            let refreshed = 0;
            for (const token of tokensResult.rows) {
                try {
                    const newToken = await this.refreshToken(token.access_token);
                    const expiresAt = new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)); // 60 days

                    await database.query(`
                        UPDATE instagram_tokens 
                        SET access_token = $1, expires_at = $2, updated_at = NOW()
                        WHERE id = $3
                    `, [newToken, expiresAt, token.id]);

                    refreshed++;
                } catch (error) {
                    logger.error(`Failed to refresh token for account ${token.instagram_business_account_id}:`, error);
                }
            }

            return { refreshed, total: tokensResult.rows.length };
        } catch (error) {
            logger.error('Instagram refresh all tokens error:', error);
            throw error;
        }
    }

    /**
     * Exchange short-lived token for long-lived token
     */
    async exchangeForLongLivedToken(accessToken) {
        const response = await axios.get(`${this.baseURL}/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: this.appId,
                client_secret: this.appSecret,
                fb_exchange_token: accessToken
            }
        });

        return response.data.access_token;
    }

    /**
     * Refresh long-lived token
     */
    async refreshToken(accessToken) {
        const response = await axios.get(`${this.baseURL}/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: this.appId,
                client_secret: this.appSecret,
                fb_exchange_token: accessToken
            }
        });

        return response.data.access_token;
    }

    /**
     * Get page information
     */
    async getPageInfo(pageId, accessToken) {
        const response = await axios.get(`${this.baseURL}/${pageId}`, {
            params: {
                fields: 'instagram_business_account',
                access_token: accessToken
            }
        });

        return response.data;
    }

    /**
     * Get Instagram account information
     */
    async getInstagramAccountInfo(accountId, accessToken) {
        const response = await axios.get(`${this.baseURL}/${accountId}`, {
            params: {
                fields: 'username,name,profile_picture_url,followers_count,follows_count,media_count',
                access_token: accessToken
            }
        });

        return response.data;
    }

    /**
     * Get media details
     */
    async getMediaDetails(mediaId, accessToken) {
        const response = await axios.get(`${this.baseURL}/${mediaId}`, {
            params: {
                fields: 'media_url,permalink',
                access_token: accessToken
            }
        });

        return response.data;
    }

    /**
     * Wait for container to be ready
     */
    async waitForContainerReady(containerId, accessToken, maxAttempts = 10) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await axios.get(`${this.baseURL}/${containerId}`, {
                    params: {
                        fields: 'status_code',
                        access_token: accessToken
                    }
                });

                if (response.data.status_code === 'FINISHED') {
                    return true;
                }

                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            } catch (error) {
                logger.warn(`Container status check failed (attempt ${i + 1}):`, error.message);
            }
        }

        logger.warn(`Container ${containerId} not ready after ${maxAttempts} attempts`);
        return false;
    }

    /**
     * Generate OAuth authorization URL for Facebook Login
     */
    generateFacebookAuthUrl(state, scopes = ['instagram_basic', 'pages_show_list', 'instagram_content_publish']) {
        const scopeString = scopes.join(',');
        const redirectUri = this.redirectUri;
        
        // Log for debugging
        logger.info(`Facebook Login - App ID: ${this.appId}, Redirect URI: ${redirectUri}`);
        
        const params = new URLSearchParams({
            client_id: this.appId,
            redirect_uri: redirectUri,
            scope: scopeString,
            response_type: 'code',
            state: state,
            auth_type: 'rerequest' // Force re-request permissions if needed
        });

        return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    }

    /**
     * Generate OAuth authorization URL for Instagram Login (Business Login for Instagram)
     */
    generateInstagramAuthUrl(state, scopes = ['instagram_basic', 'instagram_content_publish']) {
        const scopeString = scopes.join(',');
        const redirectUri = this.redirectUri.replace('/callback', '/instagram-callback');
        
        // Log for debugging
        logger.info(`Instagram Login - App ID: ${this.instagramAppId}, Redirect URI: ${redirectUri}`);
        
        if (!this.instagramAppId || this.instagramAppId === this.appId) {
            logger.warn('Instagram App ID not set or same as Facebook App ID. Instagram Login may require separate app configuration.');
        }
        
        const params = new URLSearchParams({
            client_id: this.instagramAppId,
            redirect_uri: redirectUri,
            scope: scopeString,
            response_type: 'code',
            state: state
        });

        return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access token (Facebook Login)
     */
    async exchangeCodeForToken(code) {
        try {
            const response = await axios.get(`${this.baseURL}/oauth/access_token`, {
                params: {
                    client_id: this.appId,
                    client_secret: this.appSecret,
                    redirect_uri: this.redirectUri,
                    code: code
                }
            });

            return {
                access_token: response.data.access_token,
                token_type: response.data.token_type || 'bearer',
                expires_in: response.data.expires_in
            };
        } catch (error) {
            logger.error('Error exchanging code for token:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || 'Failed to exchange authorization code');
        }
    }

    /**
     * Exchange authorization code for access token (Instagram Login)
     */
    async exchangeInstagramCodeForToken(code) {
        try {
            const response = await axios.post('https://api.instagram.com/oauth/access_token', {
                client_id: this.instagramAppId,
                client_secret: this.instagramAppSecret,
                grant_type: 'authorization_code',
                redirect_uri: this.redirectUri.replace('/callback', '/instagram-callback'),
                code: code
            });

            return {
                access_token: response.data.access_token,
                user_id: response.data.user_id,
                token_type: 'bearer'
            };
        } catch (error) {
            logger.error('Error exchanging Instagram code for token:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error_message || 'Failed to exchange authorization code');
        }
    }

    /**
     * Get user's pages (for Facebook Login flow)
     */
    async getUserPages(accessToken) {
        try {
            const response = await axios.get(`${this.baseURL}/me/accounts`, {
                params: {
                    access_token: accessToken,
                    fields: 'id,name,access_token,instagram_business_account{id,username}'
                }
            });

            const pages = response.data.data || [];
            logger.info(`Retrieved ${pages.length} pages from Facebook API`);
            return pages;
        } catch (error) {
            logger.error('Error getting user pages:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || 'Failed to get user pages');
        }
    }

    /**
     * Get Instagram Business account from page
     */
    async getInstagramAccountFromPage(pageId, pageAccessToken) {
        try {
            const response = await axios.get(`${this.baseURL}/${pageId}`, {
                params: {
                    fields: 'instagram_business_account',
                    access_token: pageAccessToken
                }
            });

            if (!response.data.instagram_business_account) {
                return null;
            }

            const igAccountId = response.data.instagram_business_account.id;
            return igAccountId;
        } catch (error) {
            logger.error('Error getting Instagram account from page:', error.response?.data || error.message);
            return null;
        }
    }
}

module.exports = InstagramService;



