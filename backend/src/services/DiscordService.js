const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../database/connection');
const AIContentService = require('./AIContentService');
const VoiceService = require('./VoiceService');
const DiscordLearningService = require('./DiscordLearningService');
const logger = require('../utils/logger');

class DiscordService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.voiceService = new VoiceService();
        // AIContentService exports a singleton instance, not a class
        this.aiService = AIContentService;
        this.startTime = Date.now();
        
        // Auto-reconnect on startup
        this.autoReconnect();
    }

    /**
     * Auto-reconnect to Discord on server startup
     */
    async autoReconnect() {
        try {
            const database = require('../database/connection');
            const result = await database.query(
                'SELECT bot_token FROM discord_bot_configs WHERE is_active = true ORDER BY updated_at DESC LIMIT 1'
            );

            if (result.rows.length > 0) {
                const token = result.rows[0].bot_token;
                logger.info('🔄 Auto-reconnecting Discord bot...');
                await this.initialize(token);
            }
        } catch (error) {
            logger.error('Auto-reconnect failed:', error);
        }
    }

    /**
     * Initialize Discord bot connection
     */
    async initialize(token) {
        try {
            this.client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.MessageContent,
                    GatewayIntentBits.DirectMessages
                ],
                partials: [Partials.Channel]
            });

            // Event handlers
            this.setupEventHandlers();

            // Login to Discord
            await this.client.login(token);
            this.isConnected = true;
            
            logger.info('🤖 Discord bot connected successfully');
            return { success: true, message: 'Discord bot connected' };
        } catch (error) {
            logger.error('Discord connection error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Setup Discord event handlers
     */
    setupEventHandlers() {
        this.client.once('ready', () => {
            logger.info(`🤖 Discord bot logged in as ${this.client.user.tag}`);
            this.client.user.setActivity('AI Agent | /help', { type: 'WATCHING' });
            // Ensure global slash commands are registered
            this.registerGlobalCommands().catch(err => logger.error('Register commands error:', err));
        });

        this.client.on('messageCreate', async (message) => {
            // Ignore bot messages
            if (message.author.bot) return;

            try {
                // Learn from the message first
                await this.learnFromMessage(message);
                
                // Then handle the message
                await this.handleMessage(message);
            } catch (error) {
                logger.error('Discord message handling error:', error);
            }
        });

        this.client.on('error', (error) => {
            logger.error('Discord client error:', error);
            this.isConnected = false;
        });

        this.client.on('disconnect', () => {
            logger.warn('Discord bot disconnected');
            this.isConnected = false;
        });

        this.client.on('reconnecting', () => {
            logger.info('Discord bot reconnecting...');
        });

        this.client.on('resume', () => {
            logger.info('Discord bot reconnected');
            this.isConnected = true;
        });
    }

    /**
     * Learn from Discord messages
     */
    async learnFromMessage(message) {
        try {
            if (!message.guild || !message.channel) return;

            const guildId = message.guild.id;
            const channelId = message.channel.id;

            // Get recent messages for learning context
            const recentMessages = await this.getRecentMessages(message.channel, 50);
            
            // Learn from the channel
            await DiscordLearningService.learnFromChannel(guildId, channelId, recentMessages);
            
            logger.info(`🧠 Learning from message in ${message.channel.name}`);
        } catch (error) {
            logger.error('Error learning from Discord message:', error);
        }
    }

    /**
     * Get recent messages from a channel
     */
    async getRecentMessages(channel, limit = 50) {
        try {
            const messages = await channel.messages.fetch({ limit });
            return messages.map(msg => ({
                id: msg.id,
                content: msg.content,
                author: {
                    id: msg.author.id,
                    username: msg.author.username,
                    bot: msg.author.bot
                },
                timestamp: msg.createdAt,
                mentions: msg.mentions.users.map(user => ({
                    id: user.id,
                    username: user.username
                }))
            }));
        } catch (error) {
            logger.error('Error fetching recent messages:', error);
            return [];
        }
    }

    /**
     * Handle incoming Discord messages
     */
    async handleMessage(message) {
        // Check if message mentions the bot or is in a configured channel
        const isMentioned = message.mentions.has(this.client.user);
        const isDirectMessage = message.channel.type === 1; // DM
        const isConfiguredChannel = await this.isConfiguredChannel(message.channel.id);

        if (!isMentioned && !isDirectMessage && !isConfiguredChannel) {
            return;
        }

        // Get agent configuration for this server/channel
        const agentConfig = await this.getAgentConfig(message.guild?.id, message.channel.id);
        if (!agentConfig) {
            return;
        }

        // Show typing indicator (ignore if missing permission)
        try {
            await message.channel.sendTyping();
        } catch (err) {
            // Missing Access or no permission to type in this channel – continue without typing
            logger.warn?.('Discord: sendTyping skipped due to permissions');
        }

        // Process message with AI
        const response = await this.processMessage(message.content, agentConfig, message);

        // Send response
        if (response) {
            await message.reply(response);
        }

        // Log interaction
        await this.logInteraction(message, response, agentConfig);
    }

    /**
     * Handle slash commands
     */
    async handleSlashCommand(interaction) {
        const { commandName } = interaction;

        switch (commandName) {
            case 'help':
                await this.handleHelpCommand(interaction);
                break;
            case 'about':
                await this.handleAboutCommand(interaction);
                break;
            case 'status':
                await this.handleStatusCommand(interaction);
                break;
            case 'chat':
                await this.handleChatCommand(interaction);
                break;
            case 'voice':
                await this.handleVoiceCommand(interaction);
                break;
            case 'analytics':
                await this.handleAnalyticsCommand(interaction);
                break;
            default:
                await interaction.reply({ content: 'Unknown command!', ephemeral: true });
        }
    }

    /**
     * Register global slash commands (/help, /about)
     */
    async registerGlobalCommands() {
        try {
            if (!this.client || !this.client.application) return;

            const commands = [
                {
                    name: 'help',
                    description: 'Show what the Iqonga AI bot can do'
                },
                {
                    name: 'about',
                    description: 'About this AI agent and helpful links'
                },
                {
                    name: 'status',
                    description: 'Show bot status information'
                }
            ];

            await this.client.application.commands.set(commands);
            logger.info('✅ Global slash commands registered');
        } catch (error) {
            logger.error('Failed to register global commands:', error);
        }
    }

    /**
     * /about command
     */
    async handleAboutCommand(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('Iqonga – About')
                .setDescription('Intelligent, context-aware AI agents for communities and customer support.')
                .addFields(
                    { name: 'Capabilities', value: '• Chat and Q&A\n• Context learning from channels\n• Support question detection\n• Multi‑language replies' },
                    { name: 'Helpful Links', value: '[Website](https://iqonga.org) • [Docs](https://docs.iqonga.org) • [Status](https://iqonga.org/status) • [Privacy](https://iqonga.org/privacy)' }
                )
                .setColor(0x00d084);

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            logger.error('About command error:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Failed to show about info.', ephemeral: true });
            }
        }
    }

    /**
     * Handle button interactions
     */
    async handleButtonInteraction(interaction) {
        const [action, data] = interaction.customId.split(':');

        switch (action) {
            case 'help':
                await this.showHelpMenu(interaction);
                break;
            case 'analytics':
                await this.showAnalytics(interaction, data);
                break;
            default:
                await interaction.reply({ content: 'Unknown action!', ephemeral: true });
        }
    }

    /**
     * Process message with AI agent
     */
    async processMessage(content, agentConfig, message) {
        try {
            // Clean message content (remove mentions)
            const cleanContent = content.replace(/<@!?\d+>/g, '').trim();
            
            if (!cleanContent) {
                return "Hello! I'm your AI agent. How can I help you today?";
            }

            // Get agent data
            const agent = await this.getAgentById(agentConfig.agent_id);
            if (!agent) {
                return "Sorry, I'm not properly configured. Please contact an administrator.";
            }

            // Create context for AI
            const context = {
                platform: 'discord',
                server: message.guild?.name || 'DM',
                channel: message.channel.name || 'Direct Message',
                user: message.author.username,
                userId: message.author.id,
                timestamp: new Date().toISOString()
            };

            // Generate AI response with learning context
            const guildId = message.guild?.id;
            const channelId = message.channel.id;
            
            let aiResponse;
            if (guildId && channelId) {
                // Use learning service for context-aware response
                const contextualResponse = await DiscordLearningService.generateContextualResponse(
                    agent,
                    cleanContent,
                    guildId,
                    channelId
                );
                aiResponse = contextualResponse.response;
                
                // Log if this was identified as a support question
                if (contextualResponse.isSupportQuestion) {
                    logger.info(`🎧 Support question detected: ${cleanContent.substring(0, 50)}...`);
                }
            } else {
                // Fallback to regular AI response
                aiResponse = await this.aiService.generateContextualResponse(
                    agent,
                    { text: cleanContent, chat: { title: 'Discord Chat' } },
                    'keyword',
                    `discord_${message.id}`
                );
            }

            return aiResponse;
        } catch (error) {
            logger.error('Discord AI processing error:', error);
            return "Sorry, I encountered an error processing your message. Please try again.";
        }
    }

    /**
     * Handle help command
     */
    async handleHelpCommand(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Iqonga AI Agent Help')
            .setDescription('I\'m your AI assistant! Here\'s what I can do:')
            .setColor('#10B981')
            .addFields(
                { name: '💬 Chat', value: 'Mention me or use `/chat` to start a conversation', inline: true },
                { name: '🎤 Voice', value: 'Use `/voice` for voice interactions', inline: true },
                { name: '📊 Analytics', value: 'Use `/analytics` to view usage stats', inline: true },
                { name: '❓ Help', value: 'Use `/help` to see this menu', inline: true },
                { name: '📈 Status', value: 'Use `/status` to check my status', inline: true }
            )
            .setFooter({ text: 'Powered by Iqonga' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help:commands')
                    .setLabel('Commands')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('analytics:server')
                    .setLabel('Server Analytics')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    /**
     * Handle status command
     */
    async handleStatusCommand(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Agent Status')
            .setColor('#10B981')
            .addFields(
                { name: 'Status', value: '🟢 Online', inline: true },
                { name: 'Uptime', value: this.getUptime(), inline: true },
                { name: 'Servers', value: this.client.guilds.cache.size.toString(), inline: true },
                { name: 'Memory Usage', value: this.getMemoryUsage(), inline: true },
                { name: 'Last Restart', value: new Date().toLocaleString(), inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    /**
     * Handle chat command
     */
    async handleChatCommand(interaction) {
        const message = interaction.options.getString('message');
        
        if (!message) {
            await interaction.reply({ content: 'Please provide a message to chat with me!', ephemeral: true });
            return;
        }

        await interaction.deferReply();

        // Get agent configuration
        const agentConfig = await this.getAgentConfig(interaction.guild?.id, interaction.channel.id);
        if (!agentConfig) {
            await interaction.editReply('Sorry, I\'m not configured for this server/channel.');
            return;
        }

        // Process message
        const response = await this.processMessage(message, agentConfig, interaction);
        await interaction.editReply(response);
    }

    /**
     * Handle voice command
     */
    async handleVoiceCommand(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🎤 Voice Chat')
            .setDescription('Voice chat is coming soon! For now, you can chat with me using text.')
            .setColor('#10B981')
            .addFields(
                { name: 'Current Features', value: '✅ Text chat\n✅ Slash commands\n✅ Analytics', inline: true },
                { name: 'Coming Soon', value: '🎤 Voice messages\n🎵 Audio responses\n📞 Voice calls', inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    /**
     * Handle analytics command
     */
    async handleAnalyticsCommand(interaction) {
        const guildId = interaction.guild?.id;
        const channelId = interaction.channel.id;

        const analytics = await this.getAnalytics(guildId, channelId);

        const embed = new EmbedBuilder()
            .setTitle('📊 Server Analytics')
            .setColor('#10B981')
            .addFields(
                { name: 'Total Messages', value: analytics.totalMessages.toString(), inline: true },
                { name: 'Unique Users', value: analytics.uniqueUsers.toString(), inline: true },
                { name: 'Avg Response Time', value: `${analytics.avgResponseTime}ms`, inline: true },
                { name: 'Today\'s Messages', value: analytics.todayMessages.toString(), inline: true },
                { name: 'This Week', value: analytics.weekMessages.toString(), inline: true },
                { name: 'This Month', value: analytics.monthMessages.toString(), inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    /**
     * Get agent configuration for server/channel
     */
    async getAgentConfig(guildId, channelId) {
        const result = await database.query(
            'SELECT * FROM discord_agent_configs WHERE (guild_id = $1 OR guild_id IS NULL) AND (channel_id = $2 OR channel_id IS NULL) ORDER BY priority DESC LIMIT 1',
            [guildId, channelId]
        );
        return result.rows[0];
    }

    /**
     * Get agent by ID
     */
    async getAgentById(agentId) {
        const result = await database.query(
            'SELECT * FROM ai_agents WHERE id = $1 AND is_active = true',
            [agentId]
        );
        return result.rows[0];
    }

    /**
     * Check if channel is configured
     */
    async isConfiguredChannel(channelId) {
        const result = await database.query(
            'SELECT 1 FROM discord_agent_configs WHERE channel_id = $1',
            [channelId]
        );
        return result.rows.length > 0;
    }

    /**
     * Log Discord interaction
     */
    async logInteraction(message, response, agentConfig) {
        try {
            await database.query(
                'INSERT INTO discord_interactions (guild_id, channel_id, user_id, message_content, ai_response, agent_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                [
                    message.guild?.id,
                    message.channel.id,
                    message.author.id,
                    message.content,
                    response,
                    agentConfig.agent_id
                ]
            );
        } catch (error) {
            logger.error('Discord logging error:', error);
        }
    }

    /**
     * Get analytics data
     */
    async getAnalytics(guildId, channelId) {
        const result = await database.query(`
            SELECT 
                COUNT(*) as total_messages,
                COUNT(DISTINCT user_id) as unique_users,
                AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) as avg_response_time,
                COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_messages,
                COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_messages,
                COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_messages
            FROM discord_interactions 
            WHERE ($1::text IS NULL OR guild_id = $1) 
            AND ($2::text IS NULL OR channel_id = $2)
        `, [guildId, channelId]);

        const data = result.rows[0];
        return {
            totalMessages: parseInt(data.total_messages) || 0,
            uniqueUsers: parseInt(data.unique_users) || 0,
            avgResponseTime: Math.round(parseFloat(data.avg_response_time) || 0),
            todayMessages: parseInt(data.today_messages) || 0,
            weekMessages: parseInt(data.week_messages) || 0,
            monthMessages: parseInt(data.month_messages) || 0
        };
    }

    /**
     * Ensure Discord connection is active
     */
    async ensureConnection() {
        if (!this.isConnected || !this.client) {
            logger.info('🔄 Discord connection lost, attempting to restore...');
            await this.autoReconnect();
        }
        return this.isConnected;
    }

    /**
     * Utility methods
     */
    getUptime() {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    }

    getMemoryUsage() {
        const used = process.memoryUsage();
        return `${Math.round(used.heapUsed / 1024 / 1024)}MB`;
    }

    /**
     * Disconnect bot
     */
    async disconnect() {
        if (this.client && this.isConnected) {
            await this.client.destroy();
            this.isConnected = false;
            logger.info('🤖 Discord bot disconnected');
        }
    }
}

module.exports = DiscordService;
