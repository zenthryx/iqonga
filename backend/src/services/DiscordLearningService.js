const database = require('../database/connection');
const AIContentService = require('./AIContentService');
const logger = require('../utils/logger');

class DiscordLearningService {
    constructor() {
        this.aiService = AIContentService;
        this.learningEnabled = true;
        this.supportKeywords = [
            'help', 'support', 'issue', 'problem', 'error', 'bug', 'question',
            'how to', 'tutorial', 'guide', 'stuck', 'not working', 'broken',
            'can\'t', 'unable', 'trouble', 'assistance', 'advice', 'fix'
        ];
    }

    /**
     * Learn from Discord channel messages and extract knowledge
     */
    async learnFromChannel(guildId, channelId, messages) {
        try {
            if (!this.learningEnabled || !messages || messages.length === 0) {
                return;
            }

            // Extract conversations and Q&A patterns
            const conversations = this.extractConversations(messages);
            const qaPairs = this.extractQAPairs(conversations);
            const supportIssues = this.identifySupportIssues(messages);

            // Store learned knowledge
            await this.storeChannelKnowledge(guildId, channelId, {
                conversations,
                qaPairs,
                supportIssues,
                lastUpdated: new Date()
            });

            logger.info(`📚 Learned from ${messages.length} messages in channel ${channelId}`);
            return true;
        } catch (error) {
            logger.error('Discord learning error:', error);
            return false;
        }
    }

    /**
     * Extract meaningful conversations from messages
     */
    extractConversations(messages) {
        const conversations = [];
        let currentConversation = [];

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            
            // Skip bot messages and very short messages
            if (message.author?.bot || message.content?.length < 10) {
                continue;
            }

            currentConversation.push({
                author: message.author?.username || 'Unknown',
                content: message.content,
                timestamp: message.timestamp || new Date(),
                mentions: message.mentions || []
            });

            // End conversation if gap > 30 minutes or different topic
            const nextMessage = messages[i + 1];
            if (!nextMessage || this.isNewConversation(message, nextMessage)) {
                if (currentConversation.length >= 2) {
                    conversations.push({
                        participants: [...new Set(currentConversation.map(c => c.author))],
                        messages: currentConversation,
                        topic: this.extractTopic(currentConversation),
                        timestamp: currentConversation[0].timestamp
                    });
                }
                currentConversation = [];
            }
        }

        return conversations;
    }

    /**
     * Extract Q&A pairs from conversations
     */
    extractQAPairs(conversations) {
        const qaPairs = [];

        conversations.forEach(conversation => {
            const messages = conversation.messages;
            
            for (let i = 0; i < messages.length - 1; i++) {
                const question = messages[i];
                const answer = messages[i + 1];

                // Check if this looks like a Q&A
                if (this.isQuestion(question.content) && this.isAnswer(answer.content)) {
                    qaPairs.push({
                        question: question.content,
                        answer: answer.content,
                        questionAuthor: question.author,
                        answerAuthor: answer.author,
                        topic: conversation.topic,
                        timestamp: question.timestamp
                    });
                }
            }
        });

        return qaPairs;
    }

    /**
     * Identify support-related issues and solutions
     */
    identifySupportIssues(messages) {
        const supportIssues = [];

        messages.forEach(message => {
            if (message.author?.bot) return;

            const content = message.content.toLowerCase();
            const isSupportRelated = this.supportKeywords.some(keyword => 
                content.includes(keyword)
            );

            if (isSupportRelated) {
                supportIssues.push({
                    issue: message.content,
                    author: message.author?.username || 'Unknown',
                    timestamp: message.timestamp || new Date(),
                    severity: this.assessSeverity(message.content),
                    category: this.categorizeIssue(message.content)
                });
            }
        });

        return supportIssues;
    }

    /**
     * Store learned knowledge in database
     */
    async storeChannelKnowledge(guildId, channelId, knowledge) {
        try {
            // Store conversations
            for (const conversation of knowledge.conversations) {
                await database.query(`
                    INSERT INTO discord_knowledge 
                    (guild_id, channel_id, knowledge_type, content, metadata, created_at)
                    VALUES ($1, $2, $3, $4, $5, NOW())
                    ON CONFLICT (guild_id, channel_id, knowledge_type, content_hash) 
                    DO UPDATE SET updated_at = NOW(), metadata = $5
                `, [
                    guildId,
                    channelId,
                    'conversation',
                    JSON.stringify(conversation),
                    JSON.stringify({
                        participants: conversation.participants,
                        topic: conversation.topic,
                        messageCount: conversation.messages.length
                    })
                ]);
            }

            // Store Q&A pairs
            for (const qa of knowledge.qaPairs) {
                await database.query(`
                    INSERT INTO discord_knowledge 
                    (guild_id, channel_id, knowledge_type, content, metadata, created_at)
                    VALUES ($1, $2, $3, $4, $5, NOW())
                    ON CONFLICT (guild_id, channel_id, knowledge_type, content_hash) 
                    DO UPDATE SET updated_at = NOW(), metadata = $5
                `, [
                    guildId,
                    channelId,
                    'qa_pair',
                    JSON.stringify(qa),
                    JSON.stringify({
                        topic: qa.topic,
                        questionAuthor: qa.questionAuthor,
                        answerAuthor: qa.answerAuthor
                    })
                ]);
            }

            // Store support issues
            for (const issue of knowledge.supportIssues) {
                await database.query(`
                    INSERT INTO discord_knowledge 
                    (guild_id, channel_id, knowledge_type, content, metadata, created_at)
                    VALUES ($1, $2, $3, $4, $5, NOW())
                    ON CONFLICT (guild_id, channel_id, knowledge_type, content_hash) 
                    DO UPDATE SET updated_at = NOW(), metadata = $5
                `, [
                    guildId,
                    channelId,
                    'support_issue',
                    JSON.stringify(issue),
                    JSON.stringify({
                        severity: issue.severity,
                        category: issue.category,
                        author: issue.author
                    })
                ]);
            }

            logger.info(`💾 Stored knowledge for channel ${channelId}`);
        } catch (error) {
            logger.error('Error storing Discord knowledge:', error);
        }
    }

    /**
     * Get relevant knowledge for a user query
     */
    async getRelevantKnowledge(guildId, channelId, query) {
        try {
            const results = await database.query(`
                SELECT knowledge_type, content, metadata, created_at
                FROM discord_knowledge
                WHERE guild_id = $1 
                AND (channel_id = $2 OR channel_id IS NULL)
                AND (
                    content::text ILIKE $3 OR
                    metadata::text ILIKE $3
                )
                ORDER BY 
                    CASE WHEN channel_id = $2 THEN 1 ELSE 2 END,
                    created_at DESC
                LIMIT 10
            `, [guildId, channelId, `%${query}%`]);

            return results.rows.map(row => ({
                type: row.knowledge_type,
                content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
                metadata: row.metadata && typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
                timestamp: row.created_at
            }));
        } catch (error) {
            logger.error('Error retrieving Discord knowledge:', error);
            return [];
        }
    }

    /**
     * Generate context-aware response using learned knowledge
     */
    async generateContextualResponse(agent, userMessage, guildId, channelId) {
        try {
            // Get relevant knowledge
            const knowledge = await this.getRelevantKnowledge(guildId, channelId, userMessage);
            
            // Check if this is a support question
            const isSupportQuestion = this.isSupportQuestion(userMessage);
            
            // Build context from knowledge
            let contextPrompt = '';
            if (knowledge.length > 0) {
                contextPrompt = '\n\nRelevant community knowledge:\n';
                knowledge.forEach(k => {
                    if (k.type === 'qa_pair') {
                        contextPrompt += `Q: ${k.content.question}\nA: ${k.content.answer}\n\n`;
                    } else if (k.type === 'support_issue') {
                        contextPrompt += `Support Issue: ${k.content.issue}\nCategory: ${k.content.category}\n\n`;
                    }
                });
            }

            // Add support context if it's a support question
            if (isSupportQuestion) {
                contextPrompt += '\nThis appears to be a support question. Provide helpful, detailed assistance.';
            }

            // Generate response with context
            const composedMessage = contextPrompt
                ? `${contextPrompt}\n\nUser: ${userMessage}`
                : userMessage;

            // Call AI service using the expected signature
            const response = await this.aiService.generateContextualResponse(
                agent,
                { text: composedMessage, chat: { title: 'Discord Chat' } },
                'keyword',
                `discord_${Date.now()}`
            );

            return {
                response,
                isSupportQuestion,
                knowledgeUsed: knowledge.length,
                context: contextPrompt
            };
        } catch (error) {
            logger.error('Error generating contextual response:', error);
            return {
                response: await this.aiService.generateContextualResponse(
                    agent,
                    { text: userMessage, chat: { title: 'Discord Chat' } },
                    'keyword',
                    `discord_${Date.now()}`
                ),
                isSupportQuestion: false,
                knowledgeUsed: 0,
                context: ''
            };
        }
    }

    /**
     * Helper methods
     */
    isNewConversation(current, next) {
        const timeDiff = new Date(next.timestamp) - new Date(current.timestamp);
        return timeDiff > 30 * 60 * 1000; // 30 minutes
    }

    extractTopic(conversation) {
        const words = conversation.map(c => c.content.toLowerCase()).join(' ');
        const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        const wordCount = {};
        
        words.split(/\s+/).forEach(word => {
            if (word.length > 3 && !commonWords.includes(word)) {
                wordCount[word] = (wordCount[word] || 0) + 1;
            }
        });

        return Object.keys(wordCount)
            .sort((a, b) => wordCount[b] - wordCount[a])
            .slice(0, 3)
            .join(', ');
    }

    isQuestion(content) {
        return content.includes('?') || 
               content.toLowerCase().startsWith('how') ||
               content.toLowerCase().startsWith('what') ||
               content.toLowerCase().startsWith('why') ||
               content.toLowerCase().startsWith('when') ||
               content.toLowerCase().startsWith('where');
    }

    isAnswer(content) {
        return content.length > 20 && !this.isQuestion(content);
    }

    isSupportQuestion(content) {
        const lowerContent = content.toLowerCase();
        return this.supportKeywords.some(keyword => lowerContent.includes(keyword));
    }

    assessSeverity(content) {
        const urgentKeywords = ['urgent', 'critical', 'broken', 'not working', 'error'];
        const urgent = urgentKeywords.some(keyword => 
            content.toLowerCase().includes(keyword)
        );
        return urgent ? 'high' : 'medium';
    }

    categorizeIssue(content) {
        const categories = {
            'technical': ['error', 'bug', 'not working', 'broken', 'crash'],
            'account': ['login', 'password', 'account', 'access', 'permission'],
            'billing': ['payment', 'billing', 'charge', 'refund', 'subscription'],
            'feature': ['how to', 'tutorial', 'guide', 'feature', 'functionality'],
            'general': ['help', 'support', 'question', 'assistance']
        };

        const lowerContent = content.toLowerCase();
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => lowerContent.includes(keyword))) {
                return category;
            }
        }
        return 'general';
    }
}

module.exports = new DiscordLearningService();
