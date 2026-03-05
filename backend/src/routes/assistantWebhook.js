/**
 * AI Assistant webhook: receive channel messages and dispatch to AssistantOrchestrationService.
 * Telegram: POST /api/assistant-webhook/telegram/:connectionId
 * Body: Telegram update object (message.text, message.chat.id, or message.voice for voice messages).
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const axios = require('axios');
const OpenAI = require('openai');
const AssistantOrchestrationService = require('../services/AssistantOrchestrationService');
const ChannelConnectionService = require('../services/ChannelConnectionService');
const logger = require('../utils/logger');

const orchestration = new AssistantOrchestrationService();
const connectionService = new ChannelConnectionService();
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Download Telegram voice file and transcribe to text using Whisper.
 * Telegram sends .oga (opus); we convert to .mp3 via ffmpeg if needed for Whisper.
 */
async function transcribeTelegramVoice(botToken, fileId) {
  if (!botToken || !fileId || !openai) return null;
  const getFileRes = await axios.get(`https://api.telegram.org/bot${botToken}/getFile`, { params: { file_id: fileId } });
  const filePath = getFileRes.data?.result?.file_path;
  if (!filePath) return null;
  const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  const { data: audioBuffer } = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
  const ext = path.extname(filePath) || '.oga';
  const tempDir = os.tmpdir();
  const tempInput = path.join(tempDir, `tg_voice_${Date.now()}${ext}`);
  const tempMp3 = path.join(tempDir, `tg_voice_${Date.now()}.mp3`);
  try {
    fs.writeFileSync(tempInput, Buffer.from(audioBuffer));
    let fileToTranscribe = tempInput;
    if (ext.toLowerCase() === '.oga' || ext.toLowerCase() === '.ogg') {
      try {
        execSync(`ffmpeg -y -i "${tempInput}" -acodec libmp3lame -q:a 2 "${tempMp3}"`, { stdio: 'pipe' });
        fileToTranscribe = tempMp3;
      } catch (_) {
        // ffmpeg not available or failed; try sending oga anyway (Whisper may reject)
      }
    }
    const fileStream = fs.createReadStream(fileToTranscribe);
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      response_format: 'text'
    });
    return typeof transcription === 'string' ? transcription : (transcription?.text || null);
  } finally {
    try { if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput); } catch (_) {}
    try { if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3); } catch (_) {}
  }
}

/** Cache bot username by token (TTL 1 hour) so we only call getMe once per token. */
const botUsernameByToken = new Map();
const BOT_USERNAME_TTL_MS = 60 * 60 * 1000;

async function getBotUsername(botToken) {
  if (!botToken) return null;
  const cached = botUsernameByToken.get(botToken);
  if (cached && Date.now() - cached.ts < BOT_USERNAME_TTL_MS) return cached.username;
  try {
    const res = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 5000 });
    const username = res.data?.result?.username || null;
    if (username) botUsernameByToken.set(botToken, { username, ts: Date.now() });
    return username;
  } catch (_) {
    return null;
  }
}

/** In group/supergroup, only process if message mentions the bot (@username) or is a reply to the bot. */
async function shouldProcessGroupMessage(message, botToken) {
  const chatType = message.chat?.type;
  if (chatType !== 'group' && chatType !== 'supergroup') return true;
  if (!botToken) return false;
  const botUsername = await getBotUsername(botToken);
  if (!botUsername) return true; // if we can't get username, allow to avoid blocking
  const mention = '@' + botUsername.toLowerCase();
  const text = (message.text || message.caption || '').toLowerCase();
  if (text.includes(mention)) return true;
  if (message.reply_to_message?.from?.is_bot) return true;
  return false;
}

/** Telegram: connectionId in path (user sets webhook to this URL for their bot). */
router.post('/telegram/:connectionId', async (req, res) => {
  try {
    const update = req.body;
    const connectionId = req.params.connectionId;

    const message = update.message || update.edited_message;
    if (!message) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat?.id;
    let text = message.text || (message.caption && String(message.caption)) || '';

    if (!chatId) {
      return res.status(200).json({ ok: true });
    }

    const connection = await connectionService.findByIdForWebhook(connectionId);
    const botToken = connection?.channel_metadata?.bot_token || null;

    const chatType = message.chat?.type || 'private'; // 'private' | 'group' | 'supergroup' | 'channel'
    const isPrivate = chatType === 'private';

    const hasVoice = !text.trim() && message.voice?.file_id;
    if (hasVoice) {
      const processVoice = async () => {
        if (!botToken || !openai) return;
        const allowed = await shouldProcessGroupMessage(message, botToken);
        if (!allowed) return;
        try {
          const transcribed = await transcribeTelegramVoice(botToken, message.voice.file_id);
          if (!transcribed || !transcribed.trim()) return;
          await orchestration.handleIncomingMessage(connectionId, {
            text: transcribed.trim(),
            peerId: String(chatId),
            chatType,
            isPrivate
          });
        } catch (err) {
          logger.error('Assistant webhook voice handle failed:', err);
        }
      };
      setImmediate(processVoice);
      return res.status(200).json({ ok: true });
    }

    if (!text.trim()) {
      return res.status(200).json({ ok: true });
    }

    const allowed = await shouldProcessGroupMessage(message, botToken);
    if (!allowed) {
      return res.status(200).json({ ok: true });
    }

    setImmediate(() => {
      orchestration.handleIncomingMessage(connectionId, {
        text: text.trim(),
        peerId: String(chatId),
        chatType,
        isPrivate
      }).catch(err => {
        logger.error('Assistant webhook handleIncomingMessage failed:', err);
      });
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('Assistant webhook error:', err);
    if (!res.headersSent) res.status(500).json({ ok: false, error: err.message });
  }
});

/** WhatsApp Cloud API: GET = webhook verification (Meta sends hub.mode, hub.verify_token, hub.challenge). */
router.get('/whatsapp/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode !== 'subscribe' || !challenge) {
      return res.status(400).send();
    }
    let expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;
    try {
      const connection = await connectionService.findByIdForWebhook(connectionId);
      if (connection?.channel_metadata?.verify_token) expectedToken = connection.channel_metadata.verify_token;
    } catch (_) {}
    if (token !== expectedToken) {
      return res.status(403).send();
    }
    res.status(200).type('text/plain').send(challenge);
  } catch (err) {
    logger.error('Assistant webhook WhatsApp verification error:', err);
    if (!res.headersSent) res.status(500).send();
  }
});

/** WhatsApp Cloud API: POST = incoming messages. Body = WhatsApp webhook payload (entry[].changes[].value.messages). */
router.post('/whatsapp/:connectionId', async (req, res) => {
  try {
    const connectionId = req.params.connectionId;
    const body = req.body;
    if (body?.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) {
      return res.status(200).send();
    }
    for (const entry of body.entry) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;
        const value = change.value || {};
        const messages = value.messages || [];
        for (const msg of messages) {
          const from = msg.from;
          const text = (msg.type === 'text' && msg.text) ? (msg.text.body || '') : '';
          if (!from || !text.trim()) continue;
          setImmediate(() => {
            orchestration.handleIncomingMessage(connectionId, { text: text.trim(), peerId: String(from) })
              .catch(err => logger.error('Assistant webhook WhatsApp handleIncomingMessage failed:', err));
          });
        }
      }
    }
    res.status(200).send();
  } catch (err) {
    logger.error('Assistant webhook WhatsApp error:', err);
    if (!res.headersSent) res.status(500).json({ ok: false, error: err.message });
  }
});

/** Discord: connectionId in path. Body = { text, peerId } (e.g. from a gateway/bridge that receives Discord messages). */
router.post('/discord/:connectionId', async (req, res) => {
  try {
    const connectionId = req.params.connectionId;
    const text = String(req.body?.text || '').trim();
    const peerId = req.body?.peerId || req.body?.channel_id;
    if (!text || !peerId) return res.status(200).json({ ok: true });
    setImmediate(() => {
      orchestration.handleIncomingMessage(connectionId, { text, peerId: String(peerId) })
        .catch(err => logger.error('Assistant webhook Discord handleIncomingMessage failed:', err));
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('Assistant webhook Discord error:', err);
    if (!res.headersSent) res.status(500).json({ ok: false, error: err.message });
  }
});

/** Slack Events API: connectionId in path. Handles url_verification and message events. */
router.post('/slack/:connectionId', async (req, res) => {
  try {
    const connectionId = req.params.connectionId;
    const body = req.body;
    if (body?.type === 'url_verification') {
      return res.status(200).json({ challenge: body.challenge });
    }
    const event = body?.event;
    if (!event || event.type !== 'message' || event.bot_id) {
      return res.status(200).send();
    }
    const text = (event.text || '').trim();
    const channel = event.channel;
    if (!text || !channel) return res.status(200).send();
    setImmediate(() => {
      orchestration.handleIncomingMessage(connectionId, { text, peerId: String(channel) })
        .catch(err => logger.error('Assistant webhook Slack handleIncomingMessage failed:', err));
    });
    res.status(200).send();
  } catch (err) {
    logger.error('Assistant webhook Slack error:', err);
    if (!res.headersSent) res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
