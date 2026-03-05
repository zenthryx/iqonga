const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const database = require('../database/connection');
const logger = require('../utils/logger');
const MusicGenerationService = require('../services/MusicGenerationService');
const path = require('path');

// GET /api/webhooks
router.get('/', async (req, res) => {
  try {
    res.json({ message: 'Webhooks endpoint working' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/webhooks/musicapi/test - Test endpoint to simulate MusicAPI.ai webhook
// This allows testing the webhook handler without actually generating music
router.post('/musicapi/test', express.json(), async (req, res) => {
  try {
    const { taskId, musicId, event = 'song.completed', testAudioUrl } = req.body;
    
    if (!taskId && !musicId) {
      return res.status(400).json({ 
        error: 'Missing required parameter',
        message: 'Please provide either taskId or musicId'
      });
    }
    
    // Find the music record
    let result;
    if (musicId) {
      result = await database.query(`
        SELECT id, metadata, provider, status, user_id
        FROM generated_music
        WHERE id = $1
        LIMIT 1
      `, [musicId]);
    } else {
      result = await database.query(`
        SELECT id, metadata, provider, status, user_id
        FROM generated_music
        WHERE metadata->>'task_id' = $1
        LIMIT 1
      `, [taskId]);
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Music record not found',
        message: 'No music record found with the provided ID'
      });
    }
    
    const music = result.rows[0];
    const metadata = typeof music.metadata === 'string' 
      ? JSON.parse(music.metadata) 
      : music.metadata;
    
    const actualTaskId = taskId || metadata?.task_id;
    
    // Create a mock webhook payload based on the platform
    // Default to Suno format since that's what MusicAPI.ai uses for sonic model
    const mockPayload = {
      code: 200,
      data: [
        {
          clip_id: actualTaskId || uuidv4(),
          state: 'succeeded',
          title: 'Test Song',
          tags: 'test, pop',
          lyrics: '[Verse]\nThis is a test song\nGenerated for webhook testing\n\n[Chorus]\nTesting webhooks\nTo make sure they work\n',
          image_url: null,
          audio_url: testAudioUrl || 'https://example.com/test-audio.mp3',
          video_url: null,
          created_at: new Date().toISOString(),
          duration: '30.0',
          mv: metadata?.model || 'sonic-v4-5',
          state: 'succeeded'
        }
      ],
      message: 'success',
      task_id: actualTaskId,
      platform: 'suno',
      event: event
    };
    
    // Create mock headers
    const mockHeaders = {
      'x-webhook-id': `test-${Date.now()}`,
      'x-webhook-event': event,
      'x-webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
    };
    
    // Generate signature if webhook_secret exists
    if (metadata?.webhook_secret) {
      const secret = metadata.webhook_secret;
      const rawBody = JSON.stringify(mockPayload);
      const message = `${mockHeaders['x-webhook-timestamp']}.${rawBody}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(message)
        .digest('hex');
      mockHeaders['x-webhook-signature'] = `sha256=${signature}`;
    }
    
    // Simulate the webhook by calling the handler logic directly
    logger.info(`Testing webhook for task_id: ${actualTaskId}, event: ${event}`);
    
    // Extract audio URL from mock payload
    let audioUrl = null;
    if (mockPayload.platform === 'suno') {
      const clips = mockPayload.data || [];
      if (clips.length > 0) {
        const completedClip = clips.find(clip => clip.state === 'succeeded') || clips[0];
        audioUrl = completedClip.audio_url || completedClip.url;
      }
    } else {
      audioUrl = mockPayload.audio_url || mockPayload.url;
    }
    
    if (event === 'song.completed' || event === 'song.streaming') {
      if (audioUrl && !testAudioUrl) {
        // If no test audio URL provided, we'll just update the status
        // without downloading (since the URL might not be real)
        logger.info(`Test webhook: Would download from ${audioUrl} (skipping actual download in test mode)`);
        
        return res.json({
          success: true,
          message: 'Test webhook processed (simulation mode)',
          note: 'In test mode, audio download is skipped. Provide testAudioUrl to test full flow.',
          music_id: music.id,
          task_id: actualTaskId,
          event: event,
          mock_payload: mockPayload
        });
      } else if (testAudioUrl) {
        // If test audio URL provided, try to download it
        try {
          const musicService = new MusicGenerationService();
          const localAudioPath = await musicService.downloadAndStoreAudio(testAudioUrl, 'musicapi');
          const relativePath = `/uploads/music/generated/${path.basename(localAudioPath)}`;
          
          await database.query(`
            UPDATE generated_music 
            SET audio_url = $1, 
                status = $2,
                metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{webhook_tested_at}', $3::jsonb),
                updated_at = NOW()
            WHERE id = $4
          `, [
            relativePath,
            'completed',
            JSON.stringify(new Date().toISOString()),
            music.id
          ]);
          
          return res.json({
            success: true,
            message: 'Test webhook processed successfully with audio download',
            music_id: music.id,
            task_id: actualTaskId,
            audio_url: relativePath,
            event: event
          });
        } catch (downloadError) {
          logger.error('Test webhook audio download failed:', downloadError);
          return res.status(500).json({
            error: 'Audio download failed',
            message: downloadError.message,
            note: 'Webhook handler logic worked, but audio download failed'
          });
        }
      }
    } else if (event === 'song.failed') {
      await database.query(`
        UPDATE generated_music 
        SET status = $1,
            metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{error}', $2::jsonb),
            updated_at = NOW()
        WHERE id = $3
      `, [
        'failed',
        JSON.stringify('Test failure from webhook test'),
        music.id
      ]);
      
      return res.json({
        success: true,
        message: 'Test failure webhook processed',
        music_id: music.id,
        task_id: actualTaskId,
        event: event
      });
    }
    
    return res.json({
      success: true,
      message: 'Test webhook received',
      music_id: music.id,
      task_id: actualTaskId,
      event: event,
      mock_payload: mockPayload
    });
    
  } catch (error) {
    logger.error('Test webhook error:', error);
    res.status(500).json({
      error: 'Test webhook failed',
      message: error.message
    });
  }
});

// POST /api/webhooks/musicapi - Receive MusicAPI.ai webhook callbacks
// Documentation: https://docs.musicapi.ai/webhook-guide
router.post('/musicapi', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Get raw body for signature verification (before parsing)
    const rawBody = req.body.toString('utf8');
    const payload = JSON.parse(rawBody);
    
    // Extract webhook headers
    const webhookId = req.headers['x-webhook-id'] || req.headers['idempotency-key'];
    const webhookEvent = req.headers['x-webhook-event'];
    const webhookTimestamp = req.headers['x-webhook-timestamp'];
    const webhookSignature = req.headers['x-webhook-signature'];
    
    logger.info(`Received MusicAPI.ai webhook: event=${webhookEvent}, task_id=${payload.task_id || payload.data?.[0]?.clip_id || 'unknown'}`);
    
    // Find the music record by task_id
    const taskId = payload.task_id;
    if (!taskId) {
      logger.warn('Webhook received without task_id');
      return res.status(400).json({ error: 'Missing task_id' });
    }
    
    // Find music record by task_id in metadata
    const result = await database.query(`
      SELECT id, metadata, provider, status, user_id
      FROM generated_music
      WHERE metadata->>'task_id' = $1
      LIMIT 1
    `, [taskId]);
    
    if (result.rows.length === 0) {
      logger.warn(`Music record not found for task_id: ${taskId}`);
      return res.status(404).json({ error: 'Music record not found' });
    }
    
    const music = result.rows[0];
    const metadata = typeof music.metadata === 'string' 
      ? JSON.parse(music.metadata) 
      : music.metadata;
    
    // Verify webhook signature if secret is stored
    if (webhookSignature && metadata?.webhook_secret) {
      const secret = metadata.webhook_secret;
      const message = `${webhookTimestamp}.${rawBody}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(message)
        .digest('hex');
      
      const providedSignature = webhookSignature.replace('sha256=', '');
      
      if (expectedSignature !== providedSignature) {
        logger.error('Webhook signature verification failed', {
          expected: expectedSignature.substring(0, 10) + '...',
          provided: providedSignature.substring(0, 10) + '...'
        });
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      // Check timestamp to prevent replay attacks (within 5 minutes)
      const timestamp = parseInt(webhookTimestamp);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > 300) {
        logger.warn('Webhook timestamp too old or too far in future');
        return res.status(400).json({ error: 'Timestamp out of range' });
      }
    }
    
    // Handle different event types
    if (webhookEvent === 'song.completed' || webhookEvent === 'song.streaming') {
      // Extract audio URL from payload
      let audioUrl = null;
      
      if (payload.platform === 'suno') {
        // Suno payload structure
        const clips = payload.data || [];
        if (clips.length > 0) {
          const completedClip = clips.find(clip => clip.state === 'succeeded') || clips[0];
          audioUrl = completedClip.audio_url || completedClip.url;
        }
      } else if (payload.platform === 'nuro') {
        // Nuro payload structure
        audioUrl = payload.audio_url || payload.url;
      } else if (payload.platform === 'producer') {
        // Producer payload structure
        const clips = payload.data || [];
        if (clips.length > 0) {
          const completedClip = clips.find(clip => clip.state === 'succeeded') || clips[0];
          audioUrl = completedClip.audio_url || completedClip.url;
        }
      } else {
        // Generic fallback
        audioUrl = payload.audio_url || payload.url || payload.output || payload.data?.[0]?.audio_url;
      }
      
      if (audioUrl) {
        // Download and store audio locally
        const musicService = new MusicGenerationService();
        const localAudioPath = await musicService.downloadAndStoreAudio(audioUrl, 'musicapi');
        const relativePath = `/uploads/music/generated/${path.basename(localAudioPath)}`;
        
        // Update database
        await database.query(`
          UPDATE generated_music 
          SET audio_url = $1, 
              status = $2,
              metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{webhook_received_at}', $3::jsonb),
              updated_at = NOW()
          WHERE id = $4
        `, [
          relativePath,
          'completed',
          JSON.stringify(new Date().toISOString()),
          music.id
        ]);
        
        logger.info(`Music generation completed via webhook: ${music.id}, audio_url: ${relativePath}`);
        
        return res.status(200).json({ 
          success: true, 
          message: 'Webhook processed successfully',
          music_id: music.id
        });
      } else {
        logger.warn(`Webhook received but no audio_url found in payload for task_id: ${taskId}`);
        // Still mark as processing if no audio URL yet
        return res.status(200).json({ 
          success: true, 
          message: 'Webhook received but audio not ready yet'
        });
      }
    } else if (webhookEvent === 'song.failed') {
      // Handle failure
      await database.query(`
        UPDATE generated_music 
        SET status = $1,
            metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{error}', $2::jsonb),
            updated_at = NOW()
        WHERE id = $3
      `, [
        'failed',
        JSON.stringify(payload.message || payload.error || 'Generation failed'),
        music.id
      ]);
      
      logger.error(`Music generation failed via webhook: ${music.id}, error: ${payload.message || payload.error}`);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Failure webhook processed'
      });
    } else {
      logger.warn(`Unknown webhook event type: ${webhookEvent}`);
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook received but event type not handled'
      });
    }
  } catch (error) {
    logger.error('Webhook processing error:', error);
    // Still return 200 to prevent retries for our errors
    res.status(200).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/webhooks/heygen - Receive HeyGen webhook callbacks
// Documentation: https://docs.heygen.com/docs/using-heygens-webhook-events
router.post('/heygen', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    // Get raw body for signature verification (before parsing)
    const contentStr = req.body.toString('utf8');
    const payload = JSON.parse(contentStr);
    
    // Extract webhook signature from headers
    const signature = req.headers['signature'] || req.headers['Signature'];
    
    logger.info(`Received HeyGen webhook: event_type=${payload.event_type}, video_id=${payload.event_data?.video_id || 'unknown'}`);
    
    // Extract event data
    const eventType = payload.event_type;
    const eventData = payload.event_data || {};
    const videoId = eventData.video_id;
    const callbackId = eventData.callback_id;
    
    if (!videoId && !callbackId) {
      logger.warn('HeyGen webhook received without video_id or callback_id');
      return res.status(400).json({ error: 'Missing video_id or callback_id' });
    }
    
    // Find the music video record by video_id or callback_id
    let result;
    if (callbackId) {
      // Try to find by callback_id first (more reliable)
      result = await database.query(`
        SELECT id, metadata, provider, status, user_id, video_id
        FROM generated_music_videos
        WHERE metadata->>'callback_id' = $1 OR id::text = $1
        LIMIT 1
      `, [callbackId]);
    }
    
    if (!result || result.rows.length === 0) {
      // Try to find by video_id
      result = await database.query(`
        SELECT id, metadata, provider, status, user_id, video_id
        FROM generated_music_videos
        WHERE video_id = $1 OR metadata->>'video_id' = $1
        LIMIT 1
      `, [videoId]);
    }
    
    if (!result || result.rows.length === 0) {
      logger.warn(`Music video record not found for video_id: ${videoId}, callback_id: ${callbackId}`);
      return res.status(404).json({ error: 'Music video record not found' });
    }
    
    const musicVideo = result.rows[0];
    const metadata = typeof musicVideo.metadata === 'string' 
      ? JSON.parse(musicVideo.metadata) 
      : musicVideo.metadata;
    
    // Verify webhook signature if secret is stored
    if (signature && metadata?.webhook_secret) {
      const secret = metadata.webhook_secret;
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(contentStr, 'utf8');
      const computedSignature = hmac.digest('hex');
      
      if (computedSignature !== signature) {
        logger.error('HeyGen webhook signature verification failed', {
          expected: computedSignature.substring(0, 10) + '...',
          provided: signature.substring(0, 10) + '...'
        });
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }
    
    // Handle different event types
    if (eventType === 'avatar_video.success') {
      const videoUrl = eventData.url;
      
      if (videoUrl) {
        // Download and store video locally
        const MusicVideoGenerationService = require('../services/MusicVideoGenerationService');
        const videoService = new MusicVideoGenerationService();
        const localVideoPath = await videoService.downloadAndStoreVideo(videoUrl, 'heygen', musicVideo.id);
        const relativePath = `/uploads/videos/music-videos/${path.basename(localVideoPath)}`;
        
        // Update database
        await database.query(`
          UPDATE generated_music_videos 
          SET video_url = $1, 
              status = $2,
              metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{webhook_received_at}', $3::jsonb),
              updated_at = NOW()
          WHERE id = $4
        `, [
          relativePath,
          'completed',
          JSON.stringify(new Date().toISOString()),
          musicVideo.id
        ]);
        
        logger.info(`Music video generation completed via webhook: ${musicVideo.id}, video_url: ${relativePath}`);
        
        return res.status(200).json({ 
          success: true, 
          message: 'Webhook processed successfully',
          video_id: musicVideo.id
        });
      } else {
        logger.warn(`HeyGen webhook received but no video URL found for video_id: ${videoId}`);
        // Still mark as processing if no video URL yet
        return res.status(200).json({ 
          success: true, 
          message: 'Webhook received but video not ready yet'
        });
      }
    } else if (eventType === 'avatar_video.fail') {
      // Handle failure
      const errorMessage = eventData.msg || eventData.message || 'Video generation failed';
      
      await database.query(`
        UPDATE generated_music_videos 
        SET status = $1,
            metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{error}', $2::jsonb),
            updated_at = NOW()
        WHERE id = $3
      `, [
        'failed',
        JSON.stringify(errorMessage),
        musicVideo.id
      ]);
      
      logger.error(`Music video generation failed via webhook: ${musicVideo.id}, error: ${errorMessage}`);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Failure webhook processed'
      });
    } else {
      logger.warn(`Unknown HeyGen webhook event type: ${eventType}`);
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook received but event type not handled'
      });
    }
  } catch (error) {
    logger.error('HeyGen webhook processing error:', error);
    // Still return 200 to prevent retries for our errors
    res.status(200).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/webhooks/musicgpt - Receive MusicGPT webhook callbacks
// Documentation: https://docs.musicgpt.com/api-documentation/index/webhook
router.post('/musicgpt', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Get raw body for signature verification (before parsing)
    const rawBody = req.body.toString('utf8');
    const payload = JSON.parse(rawBody);
    
    logger.info(`Received MusicGPT webhook:`, JSON.stringify(payload, null, 2));
    
    // Find the music record by task_id or conversion_id
    const taskId = payload.task_id;
    const conversionId = payload.conversion_id;
    
    if (!taskId && !conversionId) {
      logger.warn('Webhook received without task_id or conversion_id');
      return res.status(400).json({ error: 'Missing task_id or conversion_id' });
    }
    
    // Find music record by task_id or conversion_id in metadata
    let query;
    let params;
    if (taskId) {
      query = `
        SELECT id, metadata, provider, status, user_id
        FROM generated_music
        WHERE metadata->>'task_id' = $1
        LIMIT 1
      `;
      params = [taskId];
    } else {
      query = `
        SELECT id, metadata, provider, status, user_id
        FROM generated_music
        WHERE metadata->>'conversion_id' = $1
        LIMIT 1
      `;
      params = [conversionId];
    }
    
    const result = await database.query(query, params);
    
    if (result.rows.length === 0) {
      logger.warn(`Music record not found for task_id: ${taskId}, conversion_id: ${conversionId}`);
      return res.status(404).json({ error: 'Music record not found' });
    }
    
    const music = result.rows[0];
    
    // Handle completion or failure
    const status = payload.status || payload.state;
    // MusicGPT uses 'conversion_path_1' and 'conversion_path_2' (two versions)
    // We use the first version by default
    const audioUrl = payload.conversion_path_1 || payload.conversion_path || payload.audio_url || payload.url || payload.output;
    
    if (status === 'COMPLETED' || status === 'completed' || status === 'succeeded' || audioUrl) {
      if (audioUrl) {
        // Download and store audio locally
        const musicService = new MusicGenerationService();
        const localAudioPath = await musicService.downloadAndStoreAudio(audioUrl, 'musicgpt');
        const relativePath = `/uploads/music/generated/${path.basename(localAudioPath)}`;
        
        // Update database
        await database.query(`
          UPDATE generated_music 
          SET audio_url = $1, 
              status = $2,
              metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{webhook_received_at}', $3::jsonb),
              updated_at = NOW()
          WHERE id = $4
        `, [
          relativePath,
          'completed',
          JSON.stringify(new Date().toISOString()),
          music.id
        ]);
        
        logger.info(`MusicGPT generation completed via webhook: ${music.id}, audio_url: ${relativePath}`);
        
        return res.status(200).json({ 
          success: true, 
          message: 'Webhook processed successfully',
          music_id: music.id
        });
      } else {
        logger.warn(`Webhook received but no audio_url found in payload`);
        return res.status(200).json({ 
          success: true, 
          message: 'Webhook received but audio not ready yet'
        });
      }
    } else if (status === 'FAILED' || status === 'failed' || status === 'error') {
      // Handle failure
      await database.query(`
        UPDATE generated_music 
        SET status = $1,
            metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{error}', $2::jsonb),
            updated_at = NOW()
        WHERE id = $3
      `, [
        'failed',
        JSON.stringify(payload.message || payload.error || 'Generation failed'),
        music.id
      ]);
      
      logger.info(`MusicGPT generation failed via webhook: ${music.id}`);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook processed - generation failed',
        music_id: music.id
      });
    } else {
      // Still processing
      logger.info(`MusicGPT webhook received but still processing: ${music.id}`);
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook received - still processing'
      });
    }
    
  } catch (error) {
    logger.error('Error processing MusicGPT webhook:', error);
    return res.status(500).json({
      error: 'Failed to process webhook',
      message: error.message
    });
  }
});

module.exports = router;
