const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const { voiceSettingsLimiter } = require('../middleware/rateLimit');
const database = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Get voice chat settings (works for both authenticated and anonymous users)
 */
router.get('/settings', voiceSettingsLimiter, async (req, res) => {
    try {
        // Try to get user ID from token, but don't require it
        let userId = null;
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            if (token && token !== 'null' && token !== 'undefined') {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    userId = decoded.userId;
                } catch (error) {
                    // Token is invalid, but that's okay for anonymous users
                    logger.warn('Invalid token for voice settings:', error.message);
                }
            }
        }

        let settings = {
            voice_enabled: true,
            voice_language: 'en',
            voice_speed: 1.0,
            voice_volume: 0.8,
            auto_play_responses: true,
            voice_model: 'tts-1'
        };

        // If user is authenticated, try to get their preferences
        if (userId) {
            const result = await database.query(`
                SELECT 
                    voice_enabled,
                    voice_language,
                    voice_speed,
                    voice_volume,
                    auto_play_responses,
                    voice_model
                FROM user_preferences 
                WHERE user_id = $1
            `, [userId]);

            if (result.rows.length > 0) {
                settings = result.rows[0];
            }
        }

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        logger.error('Voice settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch voice settings'
        });
    }
});

/**
 * Update voice chat settings
 */
router.post('/settings', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            voice_enabled, 
            voice_language, 
            voice_speed, 
            voice_volume, 
            auto_play_responses, 
            voice_model 
        } = req.body;

        await database.query(`
            INSERT INTO user_preferences 
            (user_id, voice_enabled, voice_language, voice_speed, voice_volume, auto_play_responses, voice_model, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET 
                voice_enabled = $2,
                voice_language = $3,
                voice_speed = $4,
                voice_volume = $5,
                auto_play_responses = $6,
                voice_model = $7,
                updated_at = NOW()
        `, [userId, voice_enabled, voice_language, voice_speed, voice_volume, auto_play_responses, voice_model]);

        res.json({
            success: true,
            message: 'Voice settings updated successfully'
        });
    } catch (error) {
        logger.error('Voice settings update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update voice settings'
        });
    }
});

/**
 * Get available voice models
 */
router.get('/models', authenticateToken, async (req, res) => {
    try {
        const models = [
            {
                id: 'tts-1',
                name: 'TTS-1',
                description: 'Standard quality voice synthesis',
                languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh']
            },
            {
                id: 'tts-1-hd',
                name: 'TTS-1 HD',
                description: 'High definition voice synthesis',
                languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh']
            }
        ];

        res.json({
            success: true,
            data: models
        });
    } catch (error) {
        logger.error('Voice models error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch voice models'
        });
    }
});

/**
 * Get available languages for voice
 */
router.get('/languages', authenticateToken, async (req, res) => {
    try {
        const languages = [
            { code: 'en', name: 'English', native_name: 'English' },
            { code: 'es', name: 'Spanish', native_name: 'Español' },
            { code: 'fr', name: 'French', native_name: 'Français' },
            { code: 'de', name: 'German', native_name: 'Deutsch' },
            { code: 'it', name: 'Italian', native_name: 'Italiano' },
            { code: 'pt', name: 'Portuguese', native_name: 'Português' },
            { code: 'ru', name: 'Russian', native_name: 'Русский' },
            { code: 'ja', name: 'Japanese', native_name: '日本語' },
            { code: 'ko', name: 'Korean', native_name: '한국어' },
            { code: 'zh', name: 'Chinese', native_name: '中文' }
        ];

        res.json({
            success: true,
            data: languages
        });
    } catch (error) {
        logger.error('Voice languages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch voice languages'
        });
    }
});

/**
 * Create voice conversation
 */
router.post('/conversations', authenticateToken, async (req, res) => {
    try {
        const { agent_id, title, voice_settings } = req.body;
        const userId = req.user.id;

        if (!agent_id) {
            return res.status(400).json({
                success: false,
                message: 'Agent ID is required'
            });
        }

        // Generate conversation ID
        const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store conversation in database
        await database.query(`
            INSERT INTO voice_conversations 
            (id, user_id, agent_id, title, voice_settings, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `, [conversationId, userId, agent_id, title || 'Voice Chat', JSON.stringify(voice_settings || {})]);

        res.json({
            success: true,
            data: {
                conversationId,
                title: title || 'Voice Chat',
                voice_settings: voice_settings || {}
            }
        });
    } catch (error) {
        logger.error('Voice conversation creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create conversation'
        });
    }
});

/**
 * End voice conversation
 */
router.post('/conversations/:conversationId/end', authenticateToken, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        await database.query(`
            UPDATE voice_conversations 
            SET ended_at = NOW(), updated_at = NOW()
            WHERE id = $1 AND user_id = $2
        `, [conversationId, userId]);

        res.json({
            success: true,
            message: 'Conversation ended successfully'
        });
    } catch (error) {
        logger.error('Voice conversation end error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to end conversation'
        });
    }
});

/**
 * Send message to voice conversation
 */
router.post('/conversations/:conversationId/message', authenticateToken, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'Message content is required'
            });
        }

        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await database.query(`
            INSERT INTO voice_messages 
            (id, conversation_id, user_id, role, content, created_at)
            VALUES ($1, $2, $3, 'user', $4, NOW())
        `, [messageId, conversationId, userId, content]);

        res.json({
            success: true,
            data: {
                id: messageId,
                content,
                role: 'user',
                created_at: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Voice message send error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });
    }
});

/**
 * Get conversation messages
 */
router.get('/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        const result = await database.query(`
            SELECT 
                id,
                role,
                content,
                audio_url,
                audio_duration_ms,
                created_at
            FROM voice_messages 
            WHERE conversation_id = $1 AND user_id = $2
            ORDER BY created_at ASC
        `, [conversationId, userId]);

        res.json({
            success: true,
            data: {
                messages: result.rows
            }
        });
    } catch (error) {
        logger.error('Voice messages fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages'
        });
    }
});

/**
 * Test voice connection
 */
router.post('/test', authenticateToken, async (req, res) => {
    try {
        // Simple test endpoint to verify voice API is working
        res.json({
            success: true,
            message: 'Voice API is working correctly',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Voice test error:', error);
        res.status(500).json({
            success: false,
            message: 'Voice API test failed'
        });
    }
});

module.exports = router;