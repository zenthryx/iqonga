const express = require('express');
const router = express.Router();
const DiscordService = require('../services/DiscordService');
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const database = require('../database/connection');

// Initialize Discord service
const discordService = new DiscordService();

/**
 * Connect Discord bot (requires ZTR tokens)
 */
router.post('/connect', authenticateToken, requireTokenAccess, async (req, res) => {
    try {
        const { bot_token } = req.body;
        const userId = req.user.id;

        if (!bot_token) {
            return res.status(400).json({
                success: false,
                message: 'Bot token is required'
            });
        }

        // Initialize Discord bot
        const result = await discordService.initialize(bot_token);

        if (result.success) {
            // Save bot token for user
            await database.query(
                'INSERT INTO discord_bot_configs (user_id, bot_token, is_active, created_at) VALUES ($1, $2, true, NOW()) ON CONFLICT (user_id) DO UPDATE SET bot_token = $2, is_active = true, updated_at = NOW()',
                [userId, bot_token]
            );

            res.json({
                success: true,
                message: 'Discord bot connected successfully',
                data: {
                    botId: discordService.client?.user?.id,
                    botUsername: discordService.client?.user?.username,
                    guilds: discordService.client?.guilds?.cache?.size || 0
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('Discord connect error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to connect Discord bot'
        });
    }
});

/**
 * Disconnect Discord bot
 */
router.post('/disconnect', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Disconnect bot
        await discordService.disconnect();

        // Update database
        await database.query(
            'UPDATE discord_bot_configs SET is_active = false, updated_at = NOW() WHERE user_id = $1',
            [userId]
        );

        res.json({
            success: true,
            message: 'Discord bot disconnected successfully'
        });
    } catch (error) {
        console.error('Discord disconnect error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to disconnect Discord bot'
        });
    }
});

/**
 * Reconnect Discord bot
 */
router.post('/reconnect', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get stored bot token
        const result = await database.query(
            'SELECT bot_token FROM discord_bot_configs WHERE user_id = $1 AND is_active = true',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No active Discord configuration found'
            });
        }

        const token = result.rows[0].bot_token;
        
        // Reinitialize connection
        const connectionResult = await discordService.initialize(token);

        if (connectionResult.success) {
            res.json({
                success: true,
                message: 'Discord bot reconnected successfully',
                data: {
                    botId: discordService.client?.user?.id,
                    botUsername: discordService.client?.user?.username,
                    guilds: discordService.client?.guilds?.cache?.size || 0
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: connectionResult.message
            });
        }
    } catch (error) {
        console.error('Discord reconnect error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reconnect Discord bot'
        });
    }
});

/**
 * Get Discord bot status
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Ensure connection is active
        await discordService.ensureConnection();

        const result = await database.query(
            'SELECT * FROM discord_bot_configs WHERE user_id = $1',
            [userId]
        );

        const config = result.rows[0];
        const isConnected = discordService.isConnected && config?.is_active;

        res.json({
            success: true,
            data: {
                isConnected,
                botId: discordService.client?.user?.id,
                botUsername: discordService.client?.user?.username,
                guilds: discordService.client?.guilds?.cache?.size || 0,
                uptime: discordService.getUptime(),
                memoryUsage: discordService.getMemoryUsage()
            }
        });
    } catch (error) {
        console.error('Discord status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get Discord status'
        });
    }
});

/**
 * Configure agent for Discord server/channel (requires ZTR tokens)
 */
router.post('/configure', authenticateToken, requireTokenAccess, async (req, res) => {
    try {
        const { guild_id, channel_id, agent_id, priority = 1 } = req.body;
        const userId = req.user.id;

        if (!agent_id) {
            return res.status(400).json({
                success: false,
                message: 'Agent ID is required'
            });
        }

        // Verify agent belongs to user
        const agentResult = await database.query(
            'SELECT id FROM ai_agents WHERE id = $1 AND user_id = $2',
            [agent_id, userId]
        );

        if (agentResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Agent not found or access denied'
            });
        }

        // Insert or update configuration
        await database.query(
            'INSERT INTO discord_agent_configs (user_id, guild_id, channel_id, agent_id, priority, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT (guild_id, channel_id) DO UPDATE SET agent_id = $4, priority = $5, updated_at = NOW()',
            [userId, guild_id, channel_id, agent_id, priority]
        );

        res.json({
            success: true,
            message: 'Discord agent configuration saved successfully'
        });
    } catch (error) {
        console.error('Discord configure error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to configure Discord agent'
        });
    }
});

/**
 * Get Discord configurations
 */
router.get('/configurations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await database.query(
            'SELECT dac.*, aa.name as agent_name FROM discord_agent_configs dac LEFT JOIN ai_agents aa ON dac.agent_id = aa.id WHERE dac.user_id = $1 ORDER BY dac.priority DESC, dac.created_at DESC',
            [userId]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Discord configurations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get Discord configurations'
        });
    }
});

/**
 * Delete Discord configuration
 */
router.delete('/configurations/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await database.query(
            'DELETE FROM discord_agent_configs WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Configuration not found'
            });
        }

        res.json({
            success: true,
            message: 'Discord configuration deleted successfully'
        });
    } catch (error) {
        console.error('Discord delete configuration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete Discord configuration'
        });
    }
});

/**
 * Get Discord analytics
 */
router.get('/analytics', authenticateToken, async (req, res) => {
    try {
        const { guild_id, channel_id, range = '7d' } = req.query;
        const userId = req.user.id;

        let dateFilter = '';
        switch (range) {
            case '1d':
                dateFilter = "AND created_at >= CURRENT_DATE";
                break;
            case '7d':
                dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
                break;
            case '30d':
                dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'";
                break;
            case '90d':
                dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '90 days'";
                break;
        }

        const result = await database.query(`
            SELECT 
                COUNT(*) as total_interactions,
                COUNT(DISTINCT di.user_id) as unique_users,
                COUNT(DISTINCT di.guild_id) as active_servers,
                COUNT(DISTINCT di.channel_id) as active_channels,
                AVG(EXTRACT(EPOCH FROM (di.updated_at - di.created_at)) * 1000) as avg_response_time,
                COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_interactions,
                COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_interactions,
                COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_interactions
            FROM discord_interactions di
            JOIN discord_agent_configs dac ON di.agent_id = dac.agent_id
            WHERE dac.user_id = $1
            ${guild_id ? 'AND di.guild_id = $2' : ''}
            ${channel_id ? 'AND di.channel_id = $3' : ''}
            ${dateFilter}
        `, guild_id ? [userId, guild_id, channel_id] : [userId]);

        const data = result.rows[0];

        res.json({
            success: true,
            data: {
                totalInteractions: parseInt(data.total_interactions) || 0,
                uniqueUsers: parseInt(data.unique_users) || 0,
                activeServers: parseInt(data.active_servers) || 0,
                activeChannels: parseInt(data.active_channels) || 0,
                avgResponseTime: Math.round(parseFloat(data.avg_response_time) || 0),
                todayInteractions: parseInt(data.today_interactions) || 0,
                weekInteractions: parseInt(data.week_interactions) || 0,
                monthInteractions: parseInt(data.month_interactions) || 0
            }
        });
    } catch (error) {
        console.error('Discord analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get Discord analytics'
        });
    }
});

/**
 * Get Discord guilds (servers) where bot is present
 */
router.get('/guilds', authenticateToken, async (req, res) => {
    try {
        if (!discordService.isConnected) {
            return res.status(400).json({
                success: false,
                message: 'Discord bot is not connected'
            });
        }

        const guilds = discordService.client.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL(),
            memberCount: guild.memberCount,
            channels: guild.channels.cache.filter(channel => channel.type === 0).map(channel => ({
                id: channel.id,
                name: channel.name,
                type: channel.type
            }))
        }));

        res.json({
            success: true,
            data: guilds
        });
    } catch (error) {
        console.error('Discord guilds error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get Discord guilds'
        });
    }
});

// Learning and knowledge management routes
router.get('/learning/stats/:guildId', authenticateToken, async (req, res) => {
    try {
        const { guildId } = req.params;
        const userId = req.user.id;

        const result = await database.query(`
            SELECT 
                channel_id,
                total_messages_learned,
                total_conversations,
                total_qa_pairs,
                total_support_issues,
                last_learning_session,
                learning_enabled
            FROM discord_learning_stats
            WHERE guild_id = $1
            ORDER BY last_learning_session DESC
        `, [guildId]);

        res.json({
            success: true,
            stats: result.rows
        });
    } catch (error) {
        console.error('Discord learning stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch learning stats' });
    }
});

router.get('/knowledge/search/:guildId', authenticateToken, async (req, res) => {
    try {
        const { guildId } = req.params;
        const { query, channelId, type } = req.query;
        const userId = req.user.id;

        let whereClause = 'WHERE guild_id = $1';
        let params = [guildId];
        let paramIndex = 2;

        if (query) {
            whereClause += ` AND (content::text ILIKE $${paramIndex} OR metadata::text ILIKE $${paramIndex})`;
            params.push(`%${query}%`);
            paramIndex++;
        }

        if (channelId) {
            whereClause += ` AND channel_id = $${paramIndex}`;
            params.push(channelId);
            paramIndex++;
        }

        if (type) {
            whereClause += ` AND knowledge_type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        const result = await database.query(`
            SELECT 
                knowledge_type,
                content,
                metadata,
                created_at,
                updated_at
            FROM discord_knowledge
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT 20
        `, params);

        res.json({
            success: true,
            knowledge: result.rows.map(row => ({
                type: row.knowledge_type,
                content: JSON.parse(row.content),
                metadata: JSON.parse(row.metadata),
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }))
        });
    } catch (error) {
        console.error('Discord knowledge search error:', error);
        res.status(500).json({ success: false, message: 'Failed to search knowledge' });
    }
});

router.post('/learning/toggle/:guildId/:channelId', authenticateToken, requireTokenAccess, async (req, res) => {
    try {
        const { guildId, channelId } = req.params;
        const { enabled } = req.body;
        const userId = req.user.id;

        await database.query(`
            INSERT INTO discord_learning_stats 
            (guild_id, channel_id, learning_enabled, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            ON CONFLICT (guild_id, channel_id)
            DO UPDATE SET 
                learning_enabled = $3,
                updated_at = NOW()
        `, [guildId, channelId, enabled]);

        res.json({
            success: true,
            message: `Learning ${enabled ? 'enabled' : 'disabled'} for channel`
        });
    } catch (error) {
        console.error('Discord learning toggle error:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle learning' });
    }
});

router.get('/support/issues/:guildId', authenticateToken, async (req, res) => {
    try {
        const { guildId } = req.params;
        const { status, category, limit = 20 } = req.query;
        const userId = req.user.id;

        let whereClause = 'WHERE guild_id = $1';
        let params = [guildId];
        let paramIndex = 2;

        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (category) {
            whereClause += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        const result = await database.query(`
            SELECT 
                id,
                channel_id,
                user_id,
                issue_content,
                category,
                severity,
                status,
                resolution,
                resolved_by,
                resolved_at,
                created_at,
                updated_at
            FROM discord_support_issues
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex}
        `, [...params, parseInt(limit)]);

        res.json({
            success: true,
            issues: result.rows
        });
    } catch (error) {
        console.error('Discord support issues error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch support issues' });
    }
});

module.exports = router;
