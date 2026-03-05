const OpenAI = require('openai');
const database = require('../database/connection');
const logger = require('../utils/logger');

/**
 * AI Email Service - Handles AI-powered email features
 * - Draft reply generation
 * - Email categorization
 * - Email summarization
 * - Spam/phishing detection
 */
class AIEmailService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate AI draft replies for an email
   * @param {number} emailId - Email message ID
   * @param {number} userId - User ID
   * @param {string} tone - Reply tone (professional, casual, friendly, brief)
   * @returns {Promise<Array>} Array of draft replies
   */
  async generateDraftReplies(emailId, userId, tone = 'professional') {
    try {
      // Fetch email details
      const emailResult = await database.query(
        `SELECT em.*, ea.email_address as user_email
         FROM email_messages em
         JOIN user_email_accounts ea ON em.account_id = ea.id
         WHERE em.id = $1 AND em.user_id = $2`,
        [emailId, userId]
      );

      if (emailResult.rows.length === 0) {
        throw new Error('Email not found');
      }

      const email = emailResult.rows[0];

      // Generate multiple draft replies with different approaches
      const drafts = await this.generateMultipleDrafts(email, tone);

      // Store drafts in database
      const storedDrafts = [];
      for (const draft of drafts) {
        const result = await database.query(
          `INSERT INTO email_draft_replies (
            message_id, user_id, draft_body, 
            tone, confidence_score
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *`,
          [emailId, userId, draft.content, tone, draft.confidence]
        );
        storedDrafts.push(result.rows[0]);
      }

      logger.info('AI draft replies generated', { emailId, userId, count: drafts.length });
      return storedDrafts;

    } catch (error) {
      logger.error('Error generating draft replies:', error);
      throw error;
    }
  }

  /**
   * Generate multiple draft variations
   * @private
   */
  async generateMultipleDrafts(email, tone) {
    const toneInstructions = {
      professional: 'Write a professional, formal business reply.',
      casual: 'Write a casual, friendly reply while remaining respectful.',
      friendly: 'Write a warm, personable reply that builds rapport.',
      brief: 'Write a concise, to-the-point reply in 2-3 sentences.'
    };

    const instruction = toneInstructions[tone] || toneInstructions.professional;

    const prompt = `You are an AI email assistant. Generate 3 different reply options for the following email.

Email Details:
From: ${email.from_name || email.from_email}
Subject: ${email.subject}
Content: ${email.body_text || email.snippet}

Instructions:
- ${instruction}
- Address the sender appropriately
- Respond to key points in their email
- Keep it natural and human-like
- Don't include email headers (To, From, Subject) - just the body content

Generate 3 variations of increasing length:
1. Brief reply (2-3 sentences)
2. Standard reply (1 paragraph)
3. Detailed reply (2-3 paragraphs)

Format your response as JSON with this structure:
{
  "drafts": [
    {"type": "brief", "content": "...", "confidence": 0.95},
    {"type": "standard", "content": "...", "confidence": 0.90},
    {"type": "detailed", "content": "...", "confidence": 0.85}
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages: [
          {
            role: 'system',
            content: 'You are an expert email communication assistant. Generate professional, helpful, and contextually appropriate email replies.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result.drafts || [];

    } catch (error) {
      logger.error('OpenAI API error for draft generation:', error);
      // Fallback to basic drafts if AI fails
      return this.generateFallbackDrafts(email);
    }
  }

  /**
   * Generate fallback drafts if AI fails
   * @private
   */
  generateFallbackDrafts(email) {
    const senderName = email.from_name || email.from_email.split('@')[0];
    
    return [
      {
        type: 'brief',
        content: `Hi ${senderName},\n\nThank you for your email. I'll review this and get back to you soon.\n\nBest regards`,
        confidence: 0.70
      },
      {
        type: 'standard',
        content: `Hi ${senderName},\n\nThank you for reaching out. I've received your email regarding "${email.subject}" and will review the details carefully.\n\nI'll get back to you with a response shortly.\n\nBest regards`,
        confidence: 0.65
      },
      {
        type: 'detailed',
        content: `Hi ${senderName},\n\nThank you for your email about "${email.subject}". I appreciate you taking the time to reach out.\n\nI've received your message and will review all the details you've provided. I'll make sure to get back to you with a thorough response as soon as possible.\n\nPlease let me know if you have any urgent questions in the meantime.\n\nBest regards`,
        confidence: 0.60
      }
    ];
  }

  /**
   * Categorize an email using AI
   * @param {number} emailId - Email message ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Category and metadata
   */
  async categorizeEmail(emailId, userId) {
    try {
      // Fetch email details
      const emailResult = await database.query(
        'SELECT * FROM email_messages WHERE id = $1 AND user_id = $2',
        [emailId, userId]
      );

      if (emailResult.rows.length === 0) {
        throw new Error('Email not found');
      }

      const email = emailResult.rows[0];

      const prompt = `Analyze this email and categorize it:

From: ${email.from_email}
Subject: ${email.subject}
Content: ${email.body_text || email.snippet}

Provide analysis as JSON:
{
  "category": "urgent|followup|newsletter|promotional|social|spam|personal|work",
  "priority": "high|medium|low",
  "sentiment": "positive|neutral|negative",
  "isSpam": false,
  "requiresAction": false,
  "suggestedLabels": ["label1", "label2"],
  "confidence": 0.95
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages: [
          {
            role: 'system',
            content: 'You are an email categorization expert. Analyze emails and provide accurate categorization.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(response.choices[0].message.content);

      // Update email with AI categorization
      await database.query(
        `UPDATE email_messages 
         SET ai_category = $1, 
             ai_priority = $2, 
             ai_sentiment = $3,
             ai_labels = $4,
             ai_confidence = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [
          analysis.category,
          analysis.priority,
          analysis.sentiment,
          JSON.stringify(analysis.suggestedLabels || []),
          analysis.confidence,
          emailId
        ]
      );

      // If spam detected, mark it
      if (analysis.isSpam) {
        await database.query(
          'UPDATE email_messages SET is_spam = true WHERE id = $1',
          [emailId]
        );
      }

      logger.info('Email categorized', { emailId, category: analysis.category });
      return analysis;

    } catch (error) {
      logger.error('Error categorizing email:', error);
      throw error;
    }
  }

  /**
   * Generate email summary
   * @param {number} emailId - Email message ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Summary data
   */
  async summarizeEmail(emailId, userId) {
    try {
      // Fetch email details
      const emailResult = await database.query(
        'SELECT * FROM email_messages WHERE id = $1 AND user_id = $2',
        [emailId, userId]
      );

      if (emailResult.rows.length === 0) {
        throw new Error('Email not found');
      }

      const email = emailResult.rows[0];

      // Skip summarization for very short emails
      const bodyLength = (email.body_text || email.snippet || '').length;
      if (bodyLength < 200) {
        return {
          summary: email.snippet,
          keyPoints: [],
          actionItems: [],
          skipReason: 'Email too short to summarize'
        };
      }

      const prompt = `Analyze and summarize this email:

From: ${email.from_email}
Subject: ${email.subject}
Content: ${email.body_text || email.snippet}

Provide a JSON response with:
{
  "summary": "2-3 sentence summary",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "actionItems": ["action 1", "action 2"],
  "urgency": "high|medium|low",
  "estimatedReadTime": 2
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at summarizing emails concisely while capturing all important information.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 400,
        response_format: { type: "json_object" }
      });

      const summary = JSON.parse(response.choices[0].message.content);

      // Store summary in database
      // Note: ai_key_points and ai_action_items are TEXT[] columns
      // Pass JavaScript arrays directly and PostgreSQL will handle the conversion
      await database.query(
        `UPDATE email_messages 
         SET ai_summary = $1, 
             ai_key_points = $2,
             ai_action_items = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [
          summary.summary,
          summary.keyPoints || [],
          summary.actionItems || [],
          emailId
        ]
      );

      logger.info('Email summarized', { emailId, userId });
      return summary;

    } catch (error) {
      logger.error('Error summarizing email:', error);
      throw error;
    }
  }

  /**
   * Batch categorize multiple emails
   * @param {number} userId - User ID
   * @param {number} limit - Max emails to categorize
   * @returns {Promise<Object>} Results
   */
  async batchCategorizeEmails(userId, limit = 50) {
    try {
      // Get uncategorized emails
      const result = await database.query(
        `SELECT id FROM email_messages 
         WHERE user_id = $1 
         AND ai_category IS NULL
         ORDER BY received_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      const categorized = [];
      const failed = [];

      for (const row of result.rows) {
        try {
          const analysis = await this.categorizeEmail(row.id, userId);
          categorized.push({ emailId: row.id, category: analysis.category });
        } catch (error) {
          failed.push(row.id);
        }
      }

      logger.info('Batch categorization completed', { 
        userId, 
        categorized: categorized.length, 
        failed: failed.length 
      });

      return {
        success: true,
        categorized: categorized.length,
        failed: failed.length,
        results: categorized
      };

    } catch (error) {
      logger.error('Error in batch categorization:', error);
      throw error;
    }
  }

  /**
   * Detect spam/phishing with advanced AI
   * @param {number} emailId - Email message ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Spam analysis
   */
  async detectSpam(emailId, userId) {
    try {
      const emailResult = await database.query(
        'SELECT * FROM email_messages WHERE id = $1 AND user_id = $2',
        [emailId, userId]
      );

      if (emailResult.rows.length === 0) {
        throw new Error('Email not found');
      }

      const email = emailResult.rows[0];

      const prompt = `Analyze this email for spam and phishing indicators:

From: ${email.from_email}
Subject: ${email.subject}
Content: ${email.body_text || email.snippet}

Analyze and provide JSON:
{
  "isSpam": false,
  "isPhishing": false,
  "spamScore": 0.05,
  "phishingScore": 0.02,
  "indicators": ["indicator 1", "indicator 2"],
  "recommendation": "safe|caution|danger",
  "explanation": "Brief explanation"
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages: [
          {
            role: 'system',
            content: 'You are a cybersecurity expert specializing in email spam and phishing detection. Analyze emails for malicious indicators.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 300,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(response.choices[0].message.content);

      // Update email with spam analysis
      if (analysis.isSpam || analysis.spamScore > 0.7) {
        await database.query(
          'UPDATE email_messages SET is_spam = true WHERE id = $1',
          [emailId]
        );
      }

      logger.info('Spam detection completed', { emailId, isSpam: analysis.isSpam });
      return analysis;

    } catch (error) {
      logger.error('Error detecting spam:', error);
      throw error;
    }
  }

  /**
   * Get AI insights for email thread
   * @param {string} threadId - Email thread ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Thread insights
   */
  async getThreadInsights(threadId, userId) {
    try {
      // Fetch all emails in thread
      const result = await database.query(
        `SELECT * FROM email_messages 
         WHERE thread_id = $1 AND user_id = $2
         ORDER BY received_at ASC`,
        [threadId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Thread not found');
      }

      const emails = result.rows;
      
      // Build conversation context
      const conversation = emails.map(e => 
        `From: ${e.from_email}\nDate: ${e.received_at}\nSubject: ${e.subject}\nContent: ${e.body_text || e.snippet}`
      ).join('\n\n---\n\n');

      const prompt = `Analyze this email conversation thread and provide insights:

${conversation}

Provide JSON analysis:
{
  "summary": "Overall conversation summary",
  "participants": ["email1", "email2"],
  "topic": "Main discussion topic",
  "status": "ongoing|resolved|needs_action",
  "nextSteps": ["suggested next action"],
  "sentiment": "positive|neutral|negative",
  "urgency": "high|medium|low"
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages: [
          {
            role: 'system',
            content: 'You are an email thread analyzer. Provide insights about email conversations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content);

    } catch (error) {
      logger.error('Error analyzing thread:', error);
      throw error;
    }
  }
}

module.exports = new AIEmailService();

