const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const database = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Verify Facebook signed request
 * @param {string} signedRequest
 * @returns {object} payload
 */
function verifySignedRequest(signedRequest) {
  if (!signedRequest) {
    throw new Error('signed_request missing');
  }

  const [encodedSignature, encodedPayload] = signedRequest.split('.');

  if (!encodedSignature || !encodedPayload) {
    throw new Error('Invalid signed_request format');
  }

  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) {
    throw new Error('FACEBOOK_APP_SECRET is not configured');
  }

  const signature = base64UrlDecode(encodedSignature);
  const payloadString = base64UrlDecode(encodedPayload).toString('utf-8');
  const payload = JSON.parse(payloadString);

  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(encodedPayload)
    .digest();

  if (!crypto.timingSafeEqual(signature, expectedSignature)) {
    throw new Error('Invalid signature');
  }

  return payload;
}

function base64UrlDecode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const buffer = Buffer.from(base64, 'base64');
  return buffer;
}

/**
 * POST /api/meta/facebook/data-deletion
 * Handles Facebook data deletion callbacks
 */
router.post('/facebook/data-deletion', async (req, res) => {
  try {
    const signedRequest = req.body.signed_request || req.body.signedRequest;

    if (!signedRequest) {
      return res.status(400).json({
        success: false,
        error: 'signed_request is required'
      });
    }

    let payload;
    try {
      payload = verifySignedRequest(signedRequest);
    } catch (error) {
      logger.error('Facebook data deletion verification failed:', error.message);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const platformUserId = payload.user_id || payload.user || null;
    const deletionId = uuidv4();

    // Attempt to delete user data if we can match the platform user ID
    // At this time we do not store Facebook user IDs, so we log and mark for manual review
    let status = 'pending_manual_review';
    let notes = platformUserId
      ? `Awaiting manual verification for Facebook user ${platformUserId}`
      : 'Awaiting manual verification (no platform user ID provided)';

    // Store request for audit/logging
    await database.query(
      `INSERT INTO facebook_data_deletion_requests 
        (id, platform_user_id, payload, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [deletionId, platformUserId, payload, status, notes]
    );

    const apiBase = process.env.FRONTEND_URL || 'https://www.iqonga.org';
    const statusUrl = `${apiBase}/api/meta/facebook/data-deletion-status/${deletionId}`;

    return res.json({
      url: statusUrl,
      confirmation_code: deletionId,
      status
    });
  } catch (error) {
    logger.error('Facebook data deletion callback error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process data deletion request'
    });
  }
});

/**
 * GET /api/meta/facebook/data-deletion-status/:id
 * Returns status of deletion request
 */
router.get('/facebook/data-deletion-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await database.query(
      `SELECT id, platform_user_id, status, notes, created_at, updated_at 
       FROM facebook_data_deletion_requests
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Deletion request not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Facebook data deletion status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch deletion status'
    });
  }
});

/**
 * POST /api/meta/facebook/deauthorize
 * Handles Facebook deauthorization callbacks
 */
router.post('/facebook/deauthorize', async (req, res) => {
  try {
    const signedRequest = req.body.signed_request || req.body.signedRequest;

    if (!signedRequest) {
      return res.status(400).json({
        success: false,
        error: 'signed_request is required'
      });
    }

    let payload;
    try {
      payload = verifySignedRequest(signedRequest);
    } catch (error) {
      logger.error('Facebook deauthorize verification failed:', error.message);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const platformUserId = payload.user_id || payload.user || null;
    const eventId = uuidv4();

    // Best-effort cleanup (log the event for manual processing)
    let notes = platformUserId
      ? `User ${platformUserId} revoked permissions`
      : 'User revoked permissions (platform user ID not provided)';

    await database.query(
      `INSERT INTO facebook_deauthorization_events 
        (id, platform_user_id, payload, notes, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [eventId, platformUserId, payload, notes]
    );

    logger.info(`Facebook deauthorization event logged: ${eventId}`);

    return res.json({
      success: true
    });
  } catch (error) {
    logger.error('Facebook deauthorization callback error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process deauthorization event'
    });
  }
});

module.exports = router;

