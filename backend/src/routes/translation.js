const express = require('express');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// More lenient rate limiter for translation (batch requests are expensive but fewer)
const translationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute (should be enough for batch requests)
  message: 'Too many translation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for batch requests (they're more efficient)
    return req.path === '/batch';
  }
});

// Apply rate limiting to single translate endpoint only
router.post('/translate', translationLimiter);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Supported languages mapping
const LANGUAGE_NAMES = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'zh': 'Mandarin Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ar': 'Arabic',
  'pt': 'Portuguese',
  'it': 'Italian',
  'ru': 'Russian',
  'hi': 'Hindi',
  'nl': 'Dutch',
  'pl': 'Polish',
  'tr': 'Turkish',
  'rw': 'Kinyarwanda',
  'sw': 'Swahili'
};

// POST /api/translation/translate - Translate a single text
router.post('/translate', async (req, res) => {
  try {
    const { text, target_language, source_language = 'en', context } = req.body;

    if (!text || !target_language) {
      return res.status(400).json({ error: 'Text and target_language are required' });
    }

    if (target_language === source_language) {
      return res.json({
        success: true,
        data: { translated_text: text }
      });
    }

    const targetLangName = LANGUAGE_NAMES[target_language] || target_language;
    const sourceLangName = LANGUAGE_NAMES[source_language] || source_language;

    // Build translation prompt
    let prompt = `Translate the following text from ${sourceLangName} to ${targetLangName}.\n\n`;
    
    if (context) {
      prompt += `Context: ${context}\n\n`;
    }

    prompt += `Text to translate: "${text}"\n\n`;
    prompt += `Provide only the translated text, without any explanations or additional text.`;

    // Use OpenAI for translation
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate accurately while preserving the meaning, tone, and context. For technical terms and brand names, keep them in their original form unless there's a widely accepted translation.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent translations
      max_tokens: 1000
    });

    const translatedText = response.choices[0].message.content.trim();

    // Store translation in cache (optional - can add a translations table)
    // For now, we'll just return it

    res.json({
      success: true,
      data: {
        translated_text: translatedText,
        source_language: source_language,
        target_language: target_language
      }
    });
  } catch (error) {
    logger.error('Translation error:', error);
    res.status(500).json({
      error: 'Translation failed',
      details: error.message
    });
  }
});

// More lenient rate limiter for batch translation (fewer requests but larger payloads)
const batchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 batch requests per minute (each can contain many texts)
  message: 'Too many batch translation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/translation/batch - Translate multiple texts at once
router.post('/batch', batchLimiter, async (req, res) => {
  try {
    const { texts, target_language, source_language = 'en', context } = req.body;

    if (!texts || !Array.isArray(texts) || !target_language) {
      return res.status(400).json({ error: 'Texts array and target_language are required' });
    }

    if (target_language === source_language) {
      return res.json({
        success: true,
        data: { translations: texts }
      });
    }

    const targetLangName = LANGUAGE_NAMES[target_language] || target_language;
    const sourceLangName = LANGUAGE_NAMES[source_language] || source_language;

    // Build batch translation prompt
    let prompt = `Translate the following ${texts.length} texts from ${sourceLangName} to ${targetLangName}.\n\n`;
    
    if (context) {
      prompt += `Context: ${context}\n\n`;
    }

    prompt += `Texts to translate:\n`;
    texts.forEach((text, index) => {
      prompt += `${index + 1}. "${text}"\n`;
    });

    prompt += `\nProvide the translations in the same order, one per line, numbered 1-${texts.length}. Only provide the translated texts, no explanations.`;

    // Limit batch size to prevent token limits (max ~50 texts per batch)
    const maxBatchSize = 50;
    if (texts.length > maxBatchSize) {
      // Split into smaller batches
      const batches = [];
      for (let i = 0; i < texts.length; i += maxBatchSize) {
        batches.push(texts.slice(i, i + maxBatchSize));
      }

      const allTranslations = [];
      for (const batch of batches) {
        const batchPrompt = `Translate the following ${batch.length} texts from ${sourceLangName} to ${targetLangName}.\n\n${
          context ? `Context: ${context}\n\n` : ''
        }Texts to translate:\n${batch.map((text, idx) => `${idx + 1}. "${text}"`).join('\n')}\n\nProvide the translations in the same order, one per line, numbered 1-${batch.length}. Only provide the translated texts, no explanations.`;

        const batchResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate accurately while preserving meaning, tone, and context. Return only the numbered translations, one per line.`
            },
            {
              role: 'user',
              content: batchPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        });

        const batchTranslated = batchResponse.choices[0].message.content.trim()
          .split('\n')
          .map(line => line.replace(/^\d+[.)]\s*/, '').trim())
          .filter(t => t.length > 0);

        allTranslations.push(...batchTranslated);
      }

      return res.json({
        success: true,
        data: {
          translations: allTranslations,
          source_language: source_language,
          target_language: target_language
        }
      });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate accurately while preserving meaning, tone, and context. Return only the numbered translations, one per line.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: Math.min(2000, texts.length * 50) // Adjust max_tokens based on batch size
    });

    const translatedContent = response.choices[0].message.content.trim();
    
    // Parse the numbered translations
    const translations = translatedContent
      .split('\n')
      .map(line => {
        // Remove numbering (e.g., "1. " or "1) ")
        return line.replace(/^\d+[.)]\s*/, '').trim();
      })
      .filter(t => t.length > 0);

    // Ensure we have the same number of translations
    if (translations.length !== texts.length) {
      // Don't fall back to individual - that would cause rate limiting!
      // Instead, pad with original texts
      logger.warn(`Batch translation count mismatch: expected ${texts.length}, got ${translations.length}`);
      while (translations.length < texts.length) {
        translations.push(texts[translations.length]); // Use original text as fallback
      }
      translations = translations.slice(0, texts.length); // Trim if too many
    }

    res.json({
      success: true,
      data: {
        translations,
        source_language: source_language,
        target_language: target_language
      }
    });
  } catch (error) {
    logger.error('Batch translation error:', error);
    res.status(500).json({
      error: 'Batch translation failed',
      details: error.message
    });
  }
});

// GET /api/translation/languages - Get supported languages
router.get('/languages', (req, res) => {
  res.json({
    success: true,
    data: {
      languages: Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
        code,
        name
      }))
    }
  });
});

module.exports = router;

