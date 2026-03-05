/**
 * Email ID Helper
 * Converts Gmail message IDs (strings) to internal database IDs
 */

const database = require('../database/connection');

/**
 * Get internal email ID from Gmail message ID or return if already internal
 * @param {number|string} emailIdOrProviderId - Internal ID (number) or Gmail message ID (string)
 * @param {number} userId - User ID
 * @returns {Promise<number|null>} Internal database ID
 */
async function getInternalEmailId(emailIdOrProviderId, userId) {
  try {
    // If it's already a number, return it
    if (!isNaN(emailIdOrProviderId) && Number.isInteger(Number(emailIdOrProviderId))) {
      return parseInt(emailIdOrProviderId);
    }

    // Otherwise, look up by provider_message_id
    const result = await database.query(
      `SELECT id FROM email_messages 
       WHERE provider_message_id = $1 AND user_id = $2`,
      [emailIdOrProviderId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].id;
  } catch (error) {
    console.error('Error getting internal email ID:', error);
    return null;
  }
}

module.exports = {
  getInternalEmailId
};

