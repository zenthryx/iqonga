const AIContentService = require('./AIContentService');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Content Repurposing Service
 * Converts content from one format to multiple platform-specific formats
 */
class ContentRepurposingService {
  constructor() {
    this.contentService = AIContentService;
  }

  /**
   * Repurpose content to multiple formats
   * @param {string} sourceContent - Original content
   * @param {object} options - Repurposing options
   * @returns {Promise<object>} Repurposed content in multiple formats
   */
  async repurposeContent(sourceContent, options = {}) {
    try {
      const {
        userId,
        agentId = null,
        sourceFormat = 'blog_post', // 'blog_post', 'tweet', 'article', 'video_script'
        targetFormats = ['twitter_thread', 'linkedin_post', 'instagram_carousel', 'youtube_script', 'newsletter'],
        platform = 'twitter',
        includeQuotes = true,
        includeHashtags = true
      } = options;

      const repurposeId = uuidv4();
      const results = {
        repurpose_id: repurposeId,
        source_content: sourceContent,
        source_format: sourceFormat,
        repurposed_content: {},
        quotes: [],
        created_at: new Date().toISOString()
      };

      // Get agent if provided
      let agent = null;
      if (agentId) {
        const agentResult = await database.query(
          'SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2',
          [agentId, userId]
        );
        if (agentResult.rows.length > 0) {
          agent = agentResult.rows[0];
        }
      }

      // Extract key quotes if requested
      if (includeQuotes) {
        try {
          results.quotes = await this.extractQuotes(sourceContent, agent);
        } catch (error) {
          logger.error('[ContentRepurpose] Failed to extract quotes:', error);
        }
      }

      // Repurpose to each target format
      for (const targetFormat of targetFormats) {
        try {
          logger.info(`[ContentRepurpose] Converting to ${targetFormat}`);
          const repurposed = await this.convertToFormat(sourceContent, targetFormat, {
            agent,
            sourceFormat,
            includeHashtags
          });
          results.repurposed_content[targetFormat] = repurposed;
        } catch (error) {
          logger.error(`[ContentRepurpose] Failed to convert to ${targetFormat}:`, error);
          results.repurposed_content[targetFormat] = {
            error: error.message,
            content: null
          };
        }
      }

      // Save repurposed content
      try {
        await this.saveRepurposedContent(repurposeId, userId, agentId, results);
      } catch (error) {
        logger.error('[ContentRepurpose] Failed to save repurposed content:', error);
      }

      return results;
    } catch (error) {
      logger.error('[ContentRepurpose] Content repurposing failed:', error);
      throw error;
    }
  }

  /**
   * Convert content to a specific format
   */
  async convertToFormat(sourceContent, targetFormat, options = {}) {
    const { agent, sourceFormat, includeHashtags } = options;

    switch (targetFormat) {
      case 'twitter_thread':
        return await this.convertToTwitterThread(sourceContent, agent, includeHashtags);
      
      case 'linkedin_post':
        return await this.convertToLinkedInPost(sourceContent, agent, includeHashtags);
      
      case 'instagram_carousel':
        return await this.convertToInstagramCarousel(sourceContent, agent);
      
      case 'youtube_script':
        return await this.convertToYouTubeScript(sourceContent, agent);
      
      case 'newsletter':
        return await this.convertToNewsletter(sourceContent, agent);
      
      case 'facebook_post':
        return await this.convertToFacebookPost(sourceContent, agent, includeHashtags);
      
      case 'tiktok_script':
        return await this.convertToTikTokScript(sourceContent, agent);
      
      default:
        throw new Error(`Unsupported target format: ${targetFormat}`);
    }
  }

  /**
   * Convert to Twitter thread (multiple tweets)
   */
  async convertToTwitterThread(sourceContent, agent, includeHashtags) {
    const prompt = `Convert the following content into a Twitter thread (multiple connected tweets).

Each tweet should:
- Be under 280 characters
- End with a thread indicator (1/5, 2/5, etc.)
- Be engaging and conversational
- Flow naturally from one tweet to the next
- ${includeHashtags ? 'Include 2-3 relevant hashtags' : ''}

Source content:
${sourceContent}

Generate a Twitter thread with 5-10 tweets that effectively communicates the key points.`;

    const thread = await this.contentService.generateWithOpenAI(prompt, {
      max_tokens: 1500,
      temperature: 0.7
    });

    // Split into individual tweets
    const tweets = this.splitIntoThread(thread);

    return {
      format: 'twitter_thread',
      thread_count: tweets.length,
      tweets: tweets,
      full_text: thread
    };
  }

  /**
   * Convert to LinkedIn post
   */
  async convertToLinkedInPost(sourceContent, agent, includeHashtags) {
    const prompt = `Convert the following content into a professional LinkedIn post.

The LinkedIn post should:
- Be 300-1300 characters (optimal length)
- Start with a hook to grab attention
- Be professional yet engaging
- Include actionable insights
- End with a question or call-to-action
- ${includeHashtags ? 'Include 3-5 relevant hashtags at the end' : ''}

Source content:
${sourceContent}

Generate a LinkedIn post:`;

    const post = await this.contentService.generateWithOpenAI(prompt, {
      max_tokens: 800,
      temperature: 0.7
    });

    return {
      format: 'linkedin_post',
      content: post,
      character_count: post.length,
      estimated_read_time: Math.ceil(post.length / 200) // ~200 chars per minute
    };
  }

  /**
   * Convert to Instagram carousel (multiple slides)
   */
  async convertToInstagramCarousel(sourceContent, agent) {
    const prompt = `Convert the following content into an Instagram carousel post with 5-7 slides.

Each slide should:
- Have a clear, concise message
- Be visually engaging (describe what image/graphic would work)
- Be 125 characters or less (optimal for Instagram)
- Flow logically from one slide to the next
- Include emojis where appropriate

Source content:
${sourceContent}

Generate an Instagram carousel with slide-by-slide content:`;

    const carousel = await this.contentService.generateWithOpenAI(prompt, {
      max_tokens: 1000,
      temperature: 0.7
    });

    // Parse into slides
    const slides = this.parseCarouselSlides(carousel);

    return {
      format: 'instagram_carousel',
      slide_count: slides.length,
      slides: slides,
      full_text: carousel
    };
  }

  /**
   * Convert to YouTube video script
   */
  async convertToYouTubeScript(sourceContent, agent) {
    const prompt = `Convert the following content into a YouTube video script (5-10 minutes).

The script should include:
- Hook (first 15 seconds to grab attention)
- Introduction
- Main content points (3-5 key points)
- Examples or case studies
- Conclusion with call-to-action
- Natural transitions between sections
- Estimated timing for each section

Source content:
${sourceContent}

Generate a YouTube video script:`;

    const script = await this.contentService.generateWithOpenAI(prompt, {
      max_tokens: 2000,
      temperature: 0.7
    });

    return {
      format: 'youtube_script',
      content: script,
      estimated_duration: '5-10 minutes',
      sections: this.parseScriptSections(script)
    };
  }

  /**
   * Convert to newsletter format
   */
  async convertToNewsletter(sourceContent, agent) {
    const prompt = `Convert the following content into a newsletter format.

The newsletter should include:
- Compelling subject line
- Brief introduction
- Main content (well-structured)
- Key takeaways
- Call-to-action
- Professional yet friendly tone

Source content:
${sourceContent}

Generate a newsletter:`;

    const newsletter = await this.contentService.generateWithOpenAI(prompt, {
      max_tokens: 1500,
      temperature: 0.7
    });

    return {
      format: 'newsletter',
      content: newsletter,
      subject_line: this.extractSubjectLine(newsletter),
      estimated_read_time: Math.ceil(newsletter.length / 200)
    };
  }

  /**
   * Convert to Facebook post
   */
  async convertToFacebookPost(sourceContent, agent, includeHashtags) {
    const prompt = `Convert the following content into a Facebook post.

The Facebook post should:
- Be 40-80 characters for best engagement (or 250+ for longer posts)
- Be conversational and engaging
- Encourage comments and shares
- ${includeHashtags ? 'Include 1-2 relevant hashtags' : ''}

Source content:
${sourceContent}

Generate a Facebook post:`;

    const post = await this.contentService.generateWithOpenAI(prompt, {
      max_tokens: 500,
      temperature: 0.7
    });

    return {
      format: 'facebook_post',
      content: post,
      character_count: post.length
    };
  }

  /**
   * Convert to TikTok script
   */
  async convertToTikTokScript(sourceContent, agent) {
    const prompt = `Convert the following content into a TikTok video script (15-60 seconds).

The script should:
- Start with a hook (first 3 seconds)
- Be fast-paced and engaging
- Include trending elements if relevant
- Be concise and punchy
- Include visual cues (what to show on screen)
- End with a call-to-action

Source content:
${sourceContent}

Generate a TikTok script:`;

    const script = await this.contentService.generateWithOpenAI(prompt, {
      max_tokens: 800,
      temperature: 0.8
    });

    return {
      format: 'tiktok_script',
      content: script,
      estimated_duration: '15-60 seconds',
      word_count: script.split(' ').length
    };
  }

  /**
   * Extract key quotes from content
   */
  async extractQuotes(sourceContent, agent) {
    const prompt = `Extract 3-5 key quotes or memorable statements from the following content.

Each quote should:
- Be impactful and shareable
- Be 50-150 characters
- Stand alone as a meaningful statement
- Be suitable for social media

Source content:
${sourceContent}

Extract key quotes:`;

    const quotesText = await this.contentService.generateWithOpenAI(prompt, {
      max_tokens: 500,
      temperature: 0.7
    });

    // Parse quotes (one per line or numbered)
    const quotes = quotesText
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^\d+[\.\)]\s*/, '').replace(/^["']|["']$/g, '').trim())
      .filter(quote => quote.length >= 20 && quote.length <= 200)
      .slice(0, 5);

    return quotes.map((quote, index) => ({
      id: index + 1,
      text: quote,
      character_count: quote.length
    }));
  }

  /**
   * Split thread text into individual tweets
   */
  splitIntoThread(threadText) {
    // Split by common thread patterns
    const patterns = [
      /\d+\/\d+/g, // 1/5, 2/5, etc.
      /Tweet \d+:/gi,
      /Part \d+:/gi
    ];

    let tweets = [];
    const lines = threadText.split('\n').filter(line => line.trim().length > 0);

    let currentTweet = '';
    for (const line of lines) {
      // Check if line starts a new tweet
      const isNewTweet = patterns.some(pattern => pattern.test(line));
      
      if (isNewTweet && currentTweet.length > 0) {
        tweets.push(currentTweet.trim());
        currentTweet = line.replace(/^\d+\/\d+\s*/, '').replace(/^Tweet \d+:\s*/i, '').replace(/^Part \d+:\s*/i, '').trim();
      } else {
        currentTweet += (currentTweet ? ' ' : '') + line.trim();
      }
    }

    if (currentTweet.length > 0) {
      tweets.push(currentTweet.trim());
    }

    // If no pattern found, split by length (280 chars)
    if (tweets.length === 0) {
      const maxLength = 270; // Leave room for thread indicator
      let current = '';
      for (const line of lines) {
        if (current.length + line.length + 1 <= maxLength) {
          current += (current ? ' ' : '') + line;
        } else {
          if (current.length > 0) {
            tweets.push(current);
          }
          current = line;
        }
      }
      if (current.length > 0) {
        tweets.push(current);
      }
    }

    // Add thread indicators
    return tweets.map((tweet, index) => ({
      number: index + 1,
      total: tweets.length,
      content: tweet,
      with_indicator: `${tweet} (${index + 1}/${tweets.length})`
    }));
  }

  /**
   * Parse carousel slides from text
   */
  parseCarouselSlides(carouselText) {
    const slides = [];
    const lines = carouselText.split('\n').filter(line => line.trim().length > 0);

    let currentSlide = null;
    for (const line of lines) {
      // Check if line starts a new slide
      if (/^(Slide|Page|Card)\s*\d+/i.test(line) || /^\d+[\.\)]\s/.test(line)) {
        if (currentSlide) {
          slides.push(currentSlide);
        }
        currentSlide = {
          number: slides.length + 1,
          content: line.replace(/^(Slide|Page|Card)\s*\d+[:\s]*/i, '').replace(/^\d+[\.\)]\s*/, '').trim(),
          visual_suggestion: ''
        };
      } else if (currentSlide) {
        if (/visual|image|graphic/i.test(line)) {
          currentSlide.visual_suggestion = line;
        } else {
          currentSlide.content += ' ' + line.trim();
        }
      }
    }

    if (currentSlide) {
      slides.push(currentSlide);
    }

    // If no structured format, split by paragraphs
    if (slides.length === 0) {
      const paragraphs = carouselText.split(/\n\n+/).filter(p => p.trim().length > 0);
      slides.push(...paragraphs.slice(0, 7).map((para, index) => ({
        number: index + 1,
        content: para.trim(),
        visual_suggestion: ''
      })));
    }

    return slides;
  }

  /**
   * Parse script sections
   */
  parseScriptSections(script) {
    const sections = [];
    const lines = script.split('\n').filter(line => line.trim().length > 0);

    let currentSection = null;
    for (const line of lines) {
      if (/^(Hook|Introduction|Main|Conclusion|CTA|Call-to-Action)/i.test(line)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          name: line.replace(/[:\-].*$/, '').trim(),
          content: '',
          timing: ''
        };
      } else if (currentSection) {
        if (/time|duration|seconds|minutes/i.test(line)) {
          currentSection.timing = line;
        } else {
          currentSection.content += (currentSection.content ? ' ' : '') + line.trim();
        }
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Extract subject line from newsletter
   */
  extractSubjectLine(newsletter) {
    const lines = newsletter.split('\n');
    for (const line of lines) {
      if (/subject|subject line|title/i.test(line)) {
        return line.replace(/^(Subject|Subject Line|Title)[:\s]*/i, '').trim();
      }
    }
    // Use first line if no subject found
    return lines[0]?.trim() || 'Newsletter';
  }

  /**
   * Save repurposed content to database
   */
  async saveRepurposedContent(repurposeId, userId, agentId, results) {
    try {
      await database.query(`
        CREATE TABLE IF NOT EXISTS repurposed_content (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          repurpose_id UUID UNIQUE NOT NULL,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
          source_content TEXT NOT NULL,
          source_format VARCHAR(50),
          repurposed_data JSONB NOT NULL,
          quotes JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await database.query(`
        INSERT INTO repurposed_content (
          repurpose_id, user_id, agent_id, source_content, source_format,
          repurposed_data, quotes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        repurposeId,
        userId,
        agentId,
        results.source_content,
        results.source_format,
        JSON.stringify(results.repurposed_content),
        JSON.stringify(results.quotes || [])
      ]);
    } catch (error) {
      logger.error('[ContentRepurpose] Failed to save repurposed content:', error);
      throw error;
    }
  }

  /**
   * Get repurposed content by ID
   */
  async getRepurposedContent(repurposeId, userId) {
    try {
      const result = await database.query(
        'SELECT * FROM repurposed_content WHERE repurpose_id = $1 AND user_id = $2',
        [repurposeId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const repurposed = result.rows[0];
      repurposed.repurposed_data = typeof repurposed.repurposed_data === 'string'
        ? JSON.parse(repurposed.repurposed_data)
        : repurposed.repurposed_data;
      repurposed.quotes = typeof repurposed.quotes === 'string'
        ? JSON.parse(repurposed.quotes)
        : repurposed.quotes;

      return repurposed;
    } catch (error) {
      logger.error('[ContentRepurpose] Failed to get repurposed content:', error);
      throw error;
    }
  }
}

module.exports = ContentRepurposingService;

