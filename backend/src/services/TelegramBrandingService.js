const database = require('../database/connection');

class TelegramBrandingService {
  constructor() {
    this.botDisplayNames = new Map(); // Cache for bot display names per chat
  }

  // Get the appropriate display name for a bot in a specific chat
  async getBotDisplayName(chatId, userId) {
    try {
      // Check if we have a cached name for this chat
      const cacheKey = `${chatId}_${userId}`;
      if (this.botDisplayNames.has(cacheKey)) {
        return this.botDisplayNames.get(cacheKey);
      }

      // Get the primary agent for this user's Telegram group
      const result = await database.query(`
        SELECT 
          aa.name as agent_name,
          aa.personality_type,
          aa.description,
          tg.title as group_title
        FROM telegram_groups tg
        JOIN ai_agents aa ON aa.user_id = tg.user_id
        WHERE tg.chat_id = $1 AND tg.user_id = $2 AND tg.is_active = true
        ORDER BY aa.created_at ASC
        LIMIT 1
      `, [chatId, userId]);

      if (result.rows.length > 0) {
        const agent = result.rows[0];
        const displayName = `${agent.agent_name} AI`;
        
        // Cache the result
        this.botDisplayNames.set(cacheKey, displayName);
        
        return displayName;
      }

      // Fallback to default name
      return 'Iqonga';
    } catch (error) {
      console.error('Error getting bot display name:', error);
      return 'Iqonga';
    }
  }

  // Update bot's display name in a chat (if possible)
  async updateBotDisplayName(botToken, chatId, displayName) {
    try {
      // Note: Telegram Bot API doesn't allow changing bot display names dynamically
      // This is a limitation of the Telegram platform
      // We'll implement this through message formatting instead
      
      console.log(`📝 Bot display name for chat ${chatId}: ${displayName}`);
      return {
        success: true,
        displayName: displayName,
        note: 'Display name will be shown in message formatting'
      };
    } catch (error) {
      console.error('Error updating bot display name:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Format messages with branded display name
  formatBrandedMessage(originalMessage, agentName, chatId) {
    try {
      // Return the original message without branding prefix since agent name already appears in the chat interface
      return originalMessage;
    } catch (error) {
      console.error('Error formatting branded message:', error);
      return originalMessage;
    }
  }

  // Get agent branding info for a chat
  async getAgentBranding(chatId, userId, agentId = null) {
    try {
      let query, params;

      if (agentId) {
        // Get specific agent for this chat
        query = `
          SELECT 
            aa.id,
            aa.name as agent_name,
            aa.personality_type,
            aa.description,
            aa.avatar_url,
            tg.title as group_title
          FROM telegram_groups tg
          JOIN ai_agents aa ON aa.id = tg.agent_id
          WHERE tg.chat_id = $1 AND tg.user_id = $2 AND tg.agent_id = $3 AND tg.is_active = true
          LIMIT 1
        `;
        params = [chatId, userId, agentId];
      } else {
        // Get the most recent agent for this chat
        query = `
          SELECT 
            aa.id,
            aa.name as agent_name,
            aa.personality_type,
            aa.description,
            aa.avatar_url,
            tg.title as group_title
          FROM telegram_groups tg
          JOIN ai_agents aa ON aa.id = tg.agent_id
          WHERE tg.chat_id = $1 AND tg.user_id = $2 AND tg.is_active = true
          ORDER BY tg.created_at DESC
          LIMIT 1
        `;
        params = [chatId, userId];
      }

      const result = await database.query(query, params);

      if (result.rows.length > 0) {
        const agent = result.rows[0];
        return {
          agentId: agent.id,
          agentName: agent.agent_name,
          personalityType: agent.personality_type,
          description: agent.description,
          avatarUrl: agent.avatar_url,
          groupTitle: agent.group_title
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting agent branding:', error);
      return null;
    }
  }

  // Clear cache for a specific chat
  clearCache(chatId, userId) {
    const cacheKey = `${chatId}_${userId}`;
    this.botDisplayNames.delete(cacheKey);
  }

  // Clear all cache
  clearAllCache() {
    this.botDisplayNames.clear();
  }
}

module.exports = new TelegramBrandingService();
