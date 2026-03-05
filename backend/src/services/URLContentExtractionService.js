const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const OpenAI = require('openai');

/**
 * Service for extracting and analyzing content from URLs
 * Used for generating music/lyrics based on website content
 */
class URLContentExtractionService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.defaultModel = 'gpt-4o-mini';
  }

  /**
   * Fetch and extract content from a URL
   * @param {string} url - The URL to fetch
   * @returns {Promise<object>} Extracted content with text, title, description
   */
  async extractContentFromURL(url) {
    try {
      // Validate URL
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided');
      }

      // Ensure URL has protocol
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }

      logger.info(`[URLContentExtraction] Fetching content from: ${normalizedUrl}`);

      // Fetch the URL with timeout and user agent
      const response = await axios.get(normalizedUrl, {
        timeout: 30000, // 30 seconds
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        validateStatus: (status) => status < 500, // Accept status codes less than 500
      });

      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: Failed to fetch URL`);
      }

      // Parse HTML content with cheerio
      const $ = cheerio.load(response.data);

      // Extract title
      const title = $('title').text().trim() || '';
      
      // Extract meta description
      const metaDescription = $('meta[name="description"]').attr('content')?.trim() || 
                             $('meta[property="og:description"]').attr('content')?.trim() || '';

      // Remove script and style elements
      $('script, style, noscript').remove();

      // Extract main content - try multiple selectors
      let mainContent = '';
      const contentSelectors = [
        'article',
        'main',
        '[role="main"]',
        '.content',
        '.post-content',
        '.entry-content',
        '#content',
        '.article-content',
        'main article',
      ];

      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          mainContent = element.text() || '';
          break;
        }
      }

      // If no main content found, get body text
      if (!mainContent || mainContent.trim().length < 100) {
        const body = $('body');
        if (body.length > 0) {
          // Remove navigation, footer, header elements
          body.find('nav, footer, header, aside, .sidebar, .navigation, .menu, .footer, .header').remove();
          
          mainContent = body.text() || '';
        }
      }

      // Clean up text
      mainContent = this.cleanText(mainContent);

      // Extract key information
      const extractedContent = {
        url: normalizedUrl,
        title: title,
        description: metaDescription,
        content: mainContent,
        contentLength: mainContent.length,
        extractedAt: new Date().toISOString(),
      };

      logger.info(`[URLContentExtraction] Extracted ${mainContent.length} characters from ${normalizedUrl}`);

      return extractedContent;
    } catch (error) {
      logger.error(`[URLContentExtraction] Error extracting content from URL:`, error);
      throw new Error(`Failed to extract content from URL: ${error.message}`);
    }
  }

  /**
   * Clean and normalize extracted text
   * @param {string} text - Raw text to clean
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
      .trim();
  }

  /**
   * Analyze website content using AI to extract themes, topics, and emotions
   * This helps generate music/lyrics that reflect the website's purpose and content
   * @param {object} extractedContent - Content extracted from URL
   * @param {object} options - Analysis options
   * @returns {Promise<object>} Analyzed content with themes, topics, mood, etc.
   */
  async analyzeContentForMusic(extractedContent, options = {}) {
    try {
      const { style = null, mood = null, genre = null } = options;

      // Prepare content for analysis (limit to avoid token limits)
      const contentToAnalyze = extractedContent.content.substring(0, 8000); // Limit to ~8000 chars
      const title = extractedContent.title || '';
      const description = extractedContent.description || '';

      const analysisPrompt = `You are analyzing a website to understand its content, purpose, and themes for music/lyrics generation.

Website Title: ${title}
Website Description: ${description}
Website Content (excerpt): ${contentToAnalyze}

Analyze this website and extract:
1. Main themes and topics (what is the website about?)
2. Emotional tone/mood (what emotions does the content convey?)
3. Target audience (who is this website for?)
4. Key messages or values (what does the website stand for?)
5. Activity/purpose (what does the website do or promote?)

${style ? `Preferred musical style: ${style}` : ''}
${mood ? `Preferred mood: ${mood}` : ''}
${genre ? `Preferred genre: ${genre}` : ''}

Provide your analysis in JSON format with the following structure:
{
  "themes": ["theme1", "theme2", "theme3"],
  "topics": ["topic1", "topic2"],
  "emotionalTone": "mood description",
  "targetAudience": "audience description",
  "keyMessages": ["message1", "message2"],
  "purpose": "what the website does",
  "suggestedMood": "energetic|calm|happy|sad|romantic|dramatic|mysterious|nostalgic",
  "suggestedStyle": "pop|rock|hip-hop|country|r&b|jazz|folk|electronic|afrobeat",
  "musicPrompt": "A concise description for music generation based on this website",
  "lyricsTopic": "A concise topic description for lyrics generation based on this website"
}`;

      const completion = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing website content and extracting themes, emotions, and messages for creative content generation. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const analysisText = completion.choices[0]?.message?.content || '{}';
      let analysis = {};
      
      try {
        analysis = JSON.parse(analysisText);
      } catch (parseError) {
        logger.warn('[URLContentExtraction] Failed to parse AI analysis, using fallback');
        // Fallback analysis
        analysis = {
          themes: [title || 'website content'],
          topics: [description || 'general'],
          emotionalTone: mood || 'neutral',
          targetAudience: 'general audience',
          keyMessages: [],
          purpose: 'informational',
          suggestedMood: mood || 'energetic',
          suggestedStyle: style || 'pop',
          musicPrompt: `Music inspired by ${title || 'this website'}`,
          lyricsTopic: title || description || 'website content'
        };
      }

      // Combine extracted content with AI analysis
      return {
        ...extractedContent,
        analysis: {
          themes: analysis.themes || [],
          topics: analysis.topics || [],
          emotionalTone: analysis.emotionalTone || 'neutral',
          targetAudience: analysis.targetAudience || 'general audience',
          keyMessages: analysis.keyMessages || [],
          purpose: analysis.purpose || 'informational',
          suggestedMood: analysis.suggestedMood || mood || 'energetic',
          suggestedStyle: analysis.suggestedStyle || style || 'pop',
          musicPrompt: analysis.musicPrompt || `Music inspired by ${title}`,
          lyricsTopic: analysis.lyricsTopic || title || description || 'website content'
        }
      };
    } catch (error) {
      logger.error('[URLContentExtraction] Error analyzing content:', error);
      // Return fallback analysis
      return {
        ...extractedContent,
        analysis: {
          themes: [extractedContent.title || 'website content'],
          topics: [extractedContent.description || 'general'],
          emotionalTone: 'neutral',
          targetAudience: 'general audience',
          keyMessages: [],
          purpose: 'informational',
          suggestedMood: mood || 'energetic',
          suggestedStyle: style || 'pop',
          musicPrompt: `Music inspired by ${extractedContent.title || 'this website'}`,
          lyricsTopic: extractedContent.title || extractedContent.description || 'website content'
        }
      };
    }
  }

  /**
   * Extract and analyze URL content for music/lyrics generation
   * Main entry point that combines extraction and analysis
   * @param {string} url - The URL to process
   * @param {object} options - Options for analysis (style, mood, genre)
   * @returns {Promise<object>} Complete analysis ready for music/lyrics generation
   */
  async processURLForMusic(url, options = {}) {
    try {
      // Step 1: Extract content from URL
      const extractedContent = await this.extractContentFromURL(url);

      // Step 2: Analyze content with AI
      const analyzedContent = await this.analyzeContentForMusic(extractedContent, options);

      return analyzedContent;
    } catch (error) {
      logger.error('[URLContentExtraction] Error processing URL:', error);
      throw error;
    }
  }
}

module.exports = URLContentExtractionService;
