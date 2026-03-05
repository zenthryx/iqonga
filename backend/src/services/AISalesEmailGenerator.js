/**
 * AI Sales Email Generator Service
 * Generates personalized sales emails using OpenAI GPT-4
 * Integrates with company context and lead/deal data
 */

const OpenAI = require('openai');
const database = require('../database/connection');
const logger = require('../utils/logger');

class AISalesEmailGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.model = 'gpt-4';
  }

  /**
   * Generate personalized email content
   * @param {Object} params - Generation parameters
   * @param {string} params.userId - User ID
   * @param {string} params.leadId - Lead ID (optional)
   * @param {string} params.dealId - Deal ID (optional)
   * @param {string} params.emailType - Email type: 'introduction', 'follow_up', 'proposal', 'thank_you', 'meeting_request'
   * @param {string} params.tone - Tone: 'professional', 'friendly', 'casual', 'formal'
   * @param {string} params.length - Length: 'short', 'medium', 'long'
   * @param {Array<string>} params.keyPoints - Key points to include
   * @param {string} params.context - Additional context
   * @returns {Promise<Object>} Generated email with subject and body
   */
  async generateEmail(params) {
    try {
      const {
        userId,
        leadId,
        dealId,
        emailType = 'introduction',
        tone = 'professional',
        length = 'medium',
        keyPoints = [],
        context = ''
      } = params;

      // Fetch user's company profile
      const companyResult = await database.query(
        `SELECT cp.* FROM company_profiles cp
         WHERE cp.user_id = $1
         ORDER BY cp.created_at DESC
         LIMIT 1`,
        [userId]
      );
      const companyProfile = companyResult.rows[0];

      // Fetch lead data if provided
      let leadData = null;
      if (leadId) {
        const leadResult = await database.query(
          `SELECT * FROM leads WHERE id = $1 AND user_id = $2`,
          [leadId, userId]
        );
        leadData = leadResult.rows[0];
      }

      // Fetch deal data if provided
      let dealData = null;
      if (dealId) {
        const dealResult = await database.query(
          `SELECT * FROM deals WHERE id = $1 AND user_id = $2`,
          [dealId, userId]
        );
        dealData = dealResult.rows[0];
      }

      // Build context for AI
      const aiContext = this.buildEmailContext({
        companyProfile,
        leadData,
        dealData,
        emailType,
        tone,
        length,
        keyPoints,
        context
      });

      // Generate email using OpenAI
      const prompt = this.buildEmailPrompt(aiContext);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales email writer. You create personalized, engaging emails that convert leads into customers. You understand sales psychology, email best practices, and how to craft compelling messages.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const generatedContent = completion.choices[0].message.content;

      // Parse the response (expecting JSON format)
      const emailContent = this.parseEmailResponse(generatedContent);

      // Log the generation
      await this.logEmailGeneration(userId, leadId, dealId, emailType, emailContent);

      return {
        success: true,
        data: {
          subject: emailContent.subject,
          body: emailContent.body,
          suggestions: emailContent.suggestions || [],
          metadata: {
            emailType,
            tone,
            length,
            model: this.model,
            tokensUsed: completion.usage.total_tokens
          }
        }
      };

    } catch (error) {
      logger.error('AI email generation error:', error);
      throw error;
    }
  }

  /**
   * Generate multiple subject line options
   * @param {Object} params - Generation parameters
   * @returns {Promise<Array<string>>} Array of subject lines
   */
  async generateSubjectLines(params) {
    try {
      const { userId, leadId, dealId, emailType = 'introduction', count = 3 } = params;

      // Fetch context (simplified)
      const leadResult = leadId 
        ? await database.query('SELECT * FROM leads WHERE id = $1', [leadId])
        : { rows: [null] };
      const leadData = leadResult.rows[0];

      const prompt = `Generate ${count} compelling email subject lines for a ${emailType} email.
      
Recipient: ${leadData?.first_name || 'Prospect'} at ${leadData?.company_name || 'their company'}
Purpose: ${emailType.replace('_', ' ')}

Requirements:
- Personalized and specific
- Attention-grabbing but not spammy
- Under 60 characters
- Action-oriented
- Professional tone

Return ONLY a JSON array of subject lines: ["subject 1", "subject 2", "subject 3"]`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are an expert at writing email subject lines that get opened.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 200
      });

      const response = completion.choices[0].message.content;
      const subjectLines = JSON.parse(response.trim());

      return {
        success: true,
        data: subjectLines,
        metadata: {
          tokensUsed: completion.usage.total_tokens
        }
      };

    } catch (error) {
      logger.error('Subject line generation error:', error);
      throw error;
    }
  }

  /**
   * Build email context from available data
   */
  buildEmailContext(data) {
    const {
      companyProfile,
      leadData,
      dealData,
      emailType,
      tone,
      length,
      keyPoints,
      context
    } = data;

    return {
      sender: {
        company: companyProfile?.company_name || 'Our Company',
        industry: companyProfile?.industry || '',
        description: companyProfile?.company_description || '',
        valueProposition: companyProfile?.value_proposition || ''
      },
      recipient: {
        firstName: leadData?.first_name || '',
        lastName: leadData?.last_name || '',
        company: leadData?.company_name || '',
        jobTitle: leadData?.job_title || '',
        industry: leadData?.industry || ''
      },
      deal: dealData ? {
        name: dealData.deal_name,
        amount: dealData.amount,
        stage: dealData.stage
      } : null,
      emailType,
      tone,
      length,
      keyPoints,
      additionalContext: context
    };
  }

  /**
   * Build prompt for email generation
   */
  buildEmailPrompt(context) {
    const lengthGuidelines = {
      short: '50-100 words',
      medium: '100-200 words',
      long: '200-300 words'
    };

    return `Generate a sales email with the following requirements:

SENDER CONTEXT:
- Company: ${context.sender.company}
- Industry: ${context.sender.industry || 'Not specified'}
- Value Proposition: ${context.sender.valueProposition || 'Professional services'}

RECIPIENT:
- Name: ${context.recipient.firstName} ${context.recipient.lastName}
- Company: ${context.recipient.company || 'their company'}
- Job Title: ${context.recipient.jobTitle || 'Professional'}

EMAIL TYPE: ${context.emailType.replace('_', ' ')}
TONE: ${context.tone}
LENGTH: ${context.length} (${lengthGuidelines[context.length]})

${context.keyPoints.length > 0 ? `KEY POINTS TO INCLUDE:\n${context.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : ''}

${context.additionalContext ? `ADDITIONAL CONTEXT:\n${context.additionalContext}` : ''}

${context.deal ? `DEAL CONTEXT:\nDeal Name: ${context.deal.name}\nValue: $${context.deal.amount}\nStage: ${context.deal.stage}` : ''}

REQUIREMENTS:
1. Write a compelling subject line (under 60 characters)
2. Personalize based on recipient information
3. Include a clear call-to-action
4. Match the specified tone and length
5. Be professional and error-free
6. Include 2-3 actionable suggestions for improving the email

Return your response in this EXACT JSON format:
{
  "subject": "Your subject line here",
  "body": "Your email body here with proper formatting and line breaks",
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}`;
  }

  /**
   * Parse AI response into structured format
   */
  parseEmailResponse(response) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      return parsed;
    } catch (error) {
      // If not valid JSON, try to extract subject and body
      const subjectMatch = response.match(/subject["\s:]+([^\n]+)/i);
      const bodyMatch = response.match(/body["\s:]+([^}]+)/i);

      return {
        subject: subjectMatch ? subjectMatch[1].replace(/["]/g, '').trim() : 'Your Message',
        body: bodyMatch ? bodyMatch[1].replace(/["]/g, '').trim() : response,
        suggestions: []
      };
    }
  }

  /**
   * Log email generation for analytics
   */
  async logEmailGeneration(userId, leadId, dealId, emailType, content) {
    try {
      await database.query(
        `INSERT INTO ai_email_generations (user_id, lead_id, deal_id, email_type, subject, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT DO NOTHING`,
        [userId, leadId, dealId, emailType, content.subject]
      );
    } catch (error) {
      // Table might not exist yet, log and continue
      logger.warn('Could not log AI email generation:', error.message);
    }
  }

  /**
   * Generate A/B test variants
   * @param {string} baseEmail - Original email body
   * @param {number} variantCount - Number of variants to generate (1-3)
   * @returns {Promise<Array>} Array of email variants
   */
  async generateABTestVariants(baseEmail, variantCount = 2) {
    try {
      const prompt = `Given this email, generate ${variantCount} alternative versions for A/B testing.
      
Original Email:
${baseEmail}

For each variant:
1. Change the opening hook
2. Adjust the call-to-action
3. Modify the tone slightly
4. Keep the core message the same

Return ONLY a JSON array of variant objects:
[
  {"subject": "...", "body": "...", "changes": "What was changed"},
  {"subject": "...", "body": "...", "changes": "What was changed"}
]`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are an expert at creating A/B test variants for sales emails.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 1500
      });

      const response = completion.choices[0].message.content;
      const variants = JSON.parse(response.trim());

      return {
        success: true,
        data: variants
      };

    } catch (error) {
      logger.error('A/B variant generation error:', error);
      throw error;
    }
  }
}

module.exports = new AISalesEmailGenerator();

