const { xai } = require('@ai-sdk/xai');
const logger = require('../utils/logger');

let generateText;
try {
  generateText = require('ai').generateText;
} catch (err) {
  logger.warn('ai package not found. Grok API will use fallback method.');
  generateText = null;
}

class GrokApiService {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.XAI_API_KEY;
    this.model = options.model || process.env.GROK_MODEL || 'grok-2-1212';
    this.timeout = Number(process.env.GROK_TIMEOUT || 30000);
    this.maxRetries = Number(process.env.GROK_MAX_RETRIES || 3);

    if (!this.apiKey) {
      logger.warn('Grok API key not configured. Crypto intelligence calls will fail.');
    }

    // Note: xai provider is initialized per-call with model name
  }

  async searchX(params) {
    const { query, allowedXHandles, excludedXHandles, startDate, endDate } = params;
    
    if (!generateText) {
      throw new Error('ai package is required. Please install it: npm install ai');
    }
    
    if (!this.apiKey) {
      throw new Error('XAI_API_KEY is not configured. Please set XAI_API_KEY in your environment variables.');
    }
    
    return this._withRetry(async () => {
      try {
        const { text, toolCalls, toolResults } = await generateText({
          model: xai(this.model, { apiKey: this.apiKey }),
        messages: [
          {
            role: 'user',
            content: `Analyze recent X posts about ${query}.
Provide sentiment analysis, key themes, and notable influencer mentions.
Return structured data with sentiment score, mention count, and top posts in JSON format.`,
          },
        ],
        tools: {
          x_search: {
            description: 'Search X (Twitter) for posts',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                allowedXHandles: { type: 'array', items: { type: 'string' } },
                excludedXHandles: { type: 'array', items: { type: 'string' } },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
              },
            },
            execute: async (params) => {
              // This would call the actual X search API
              // For now, return mock data structure
              return {
                query: params.query,
                allowedXHandles,
                excludedXHandles,
                startDate,
                endDate,
              };
            },
          },
        },
        maxSteps: 5,
      });

        return this._parseResponse({ text, toolCalls, toolResults });
      } catch (error) {
        // Provide more detailed error information
        if (error.status === 403 || error.message?.includes('Forbidden')) {
          logger.error('XAI API Forbidden error. Possible causes:', {
            apiKeyPresent: !!this.apiKey,
            apiKeyLength: this.apiKey?.length || 0,
            model: this.model,
            hint: 'Check if XAI_API_KEY is valid and has proper permissions'
          });
          throw new Error(`XAI API authentication failed (403 Forbidden). Please verify your XAI_API_KEY is valid and has access to model: ${this.model}`);
        }
        throw error;
      }
    });
  }

  async searchWeb(params) {
    const { query, allowedDomains, excludedDomains } = params;
    
    if (!generateText) {
      throw new Error('ai package is required. Please install it: npm install ai');
    }
    
    if (!this.apiKey) {
      throw new Error('XAI_API_KEY is not configured. Please set XAI_API_KEY in your environment variables.');
    }
    
    return this._withRetry(async () => {
      try {
        const { text, toolCalls, toolResults } = await generateText({
          model: xai(this.model, { apiKey: this.apiKey }),
        messages: [
          {
            role: 'user',
            content: `Search for recent news and analysis about ${query}.
Focus on credible sources. Summarize key developments.`,
          },
        ],
        tools: {
          web_search: {
            description: 'Search the web for information',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                allowedDomains: { type: 'array', items: { type: 'string' } },
                excludedDomains: { type: 'array', items: { type: 'string' } },
              },
            },
            execute: async (params) => {
              // This would call the actual web search API
              return {
                query: params.query,
                allowedDomains,
                excludedDomains,
              };
            },
          },
        },
        maxSteps: 5,
      });

        return this._parseResponse({ text, toolCalls, toolResults });
      } catch (error) {
        // Provide more detailed error information
        if (error.status === 403 || error.message?.includes('Forbidden')) {
          logger.error('XAI API Forbidden error. Possible causes:', {
            apiKeyPresent: !!this.apiKey,
            apiKeyLength: this.apiKey?.length || 0,
            model: this.model,
            hint: 'Check if XAI_API_KEY is valid and has proper permissions'
          });
          throw new Error(`XAI API authentication failed (403 Forbidden). Please verify your XAI_API_KEY is valid and has access to model: ${this.model}`);
        }
        throw error;
      }
    });
  }

  _parseResponse(response) {
    const text = response?.text || '';
    const toolResults = response?.toolResults || [];

    try {
      // Try to parse JSON from the text response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      logger.debug('Grok response not JSON, falling back to raw text');
    }

    return {
      rawText: text,
      toolResults: toolResults,
      citations: response?.citations || [],
    };
  }

  async _withRetry(fn, attempt = 1) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.status || err?.response?.status || err?.statusCode;
      const errorMessage = err?.message || String(err);
      
      // Don't retry on authentication errors (401, 403)
      if ([401, 403].includes(status)) {
        logger.error(`Grok API authentication error (attempt ${attempt}): ${errorMessage}`, {
          status,
          apiKeyConfigured: !!this.apiKey,
          model: this.model
        });
        throw err;
      }
      
      // Retry on rate limits and server errors
      if (attempt < this.maxRetries && [429, 500, 502, 503].includes(status)) {
        const delay = Math.min(1000 * attempt ** 2, 5000);
        logger.warn(`Grok API error (attempt ${attempt}), retrying in ${delay}ms: ${errorMessage}`);
        await new Promise((res) => setTimeout(res, delay));
        return this._withRetry(fn, attempt + 1);
      }
      
      logger.error(`Grok API error (attempt ${attempt}): ${errorMessage}`, {
        status,
        fullError: err
      });
      throw err;
    }
  }
}

module.exports = GrokApiService;

