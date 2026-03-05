const GrokApiService = require('./grokApiService');
const SerperApiService = require('./SerperApiService');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Content Research Service
 * Provides research-backed content generation with citations and fact-checking
 * Uses Serper API for reliable web search, with Grok as fallback
 */
class ContentResearchService {
  constructor() {
    this.grokService = new GrokApiService();
    this.serperService = SerperApiService;
  }

  /**
   * Research a topic comprehensively
   * @param {string} topic - Topic to research
   * @param {object} options - Research options
   * @returns {Promise<object>} Research results with citations
   */
  async researchTopic(topic, options = {}) {
    try {
      const {
        include_trending = true,
        include_keywords = true,
        include_competitor_analysis = false,
        max_sources = 10,
        allowed_domains = [],
        excluded_domains = []
      } = options;

      const researchId = uuidv4();
      const results = {
        research_id: researchId,
        topic,
        web_search: null,
        trending_topics: null,
        keywords: null,
        competitor_content: null,
        citations: [],
        summary: null,
        timestamp: new Date().toISOString()
      };

      // Step 1: Web search for latest information
      // Try Serper API first (more reliable), fallback to Grok
      try {
        logger.info(`[ContentResearch] Web searching for: ${topic}`);
        
        let webResults = null;
        let searchMethod = 'grok'; // Default fallback
        
        // Try Serper API first if available
        try {
          if (process.env.SERPER_API_KEY) {
            logger.info(`[ContentResearch] Using Serper API for search`);
            const serperResults = await this.serperService.search({
              query: topic,
              num: max_sources,
              language: 'en'
            });
            
            webResults = this.formatSerperResults(serperResults);
            searchMethod = 'serper';
          }
        } catch (serperError) {
          logger.warn(`[ContentResearch] Serper API failed, falling back to Grok:`, serperError.message);
        }
        
        // Fallback to Grok if Serper not available or failed
        if (!webResults) {
          logger.info(`[ContentResearch] Using Grok API for search`);
          const grokResults = await this.grokService.searchWeb({
            query: topic,
            allowedDomains: allowed_domains.length > 0 ? allowed_domains : undefined,
            excludedDomains: excluded_domains.length > 0 ? excluded_domains : undefined
          });
          webResults = grokResults;
        }

        results.web_search = {
          method: searchMethod,
          results: this.parseWebSearchResults(webResults),
          sources: this.extractSources(webResults),
          summary: this.extractSummary(webResults),
          // Serper-specific data
          people_also_ask: webResults.peopleAlsoAsk || [],
          related_searches: webResults.relatedSearches || [],
          answer_box: webResults.answerBox || null,
          knowledge_graph: webResults.knowledgeGraph || null
        };

        // Extract citations
        if (results.web_search.sources) {
          results.citations = results.web_search.sources.slice(0, max_sources).map((source, idx) => ({
            id: `cite-${idx + 1}`,
            title: source.title || 'Source',
            url: source.url || source.link || '',
            snippet: source.snippet || '',
            domain: this.extractDomain(source.url || source.link || '')
          }));
        }
      } catch (error) {
        logger.error(`[ContentResearch] Web search failed:`, error);
        results.web_search = { error: error.message };
      }

      // Step 2: Get trending topics (if requested)
      if (include_trending) {
        try {
          logger.info(`[ContentResearch] Getting trending topics for: ${topic}`);
          const trending = await this.getTrendingTopics(topic);
          results.trending_topics = trending;
        } catch (error) {
          logger.error(`[ContentResearch] Trending topics failed:`, error);
          results.trending_topics = { error: error.message };
        }
      }

      // Step 3: Get keyword suggestions (if requested)
      if (include_keywords) {
        try {
          logger.info(`[ContentResearch] Getting keyword suggestions for: ${topic}`);
          const keywords = await this.getKeywordSuggestions(topic);
          results.keywords = keywords;
        } catch (error) {
          logger.error(`[ContentResearch] Keyword suggestions failed:`, error);
          results.keywords = { error: error.message };
        }
      }

      // Step 4: Competitor content analysis (if requested)
      if (include_competitor_analysis) {
        try {
          logger.info(`[ContentResearch] Analyzing competitor content for: ${topic}`);
          const competitor = await this.analyzeCompetitorContent(topic);
          results.competitor_content = competitor;
        } catch (error) {
          logger.error(`[ContentResearch] Competitor analysis failed:`, error);
          results.competitor_content = { error: error.message };
        }
      }

      // Generate overall summary
      results.summary = this.generateResearchSummary(results);

      // Save research to database
      try {
        await this.saveResearch(researchId, topic, results);
      } catch (error) {
        logger.error(`[ContentResearch] Failed to save research:`, error);
        // Don't fail the whole operation
      }

      return results;
    } catch (error) {
      logger.error('[ContentResearch] Topic research failed:', error);
      throw error;
    }
  }

  /**
   * Parse web search results from Grok response
   */
  /**
   * Format Serper API results to match expected format
   */
  formatSerperResults(serperResults) {
    // Serper results are already formatted by SerperApiService
    // Just ensure compatibility with existing parsing methods
    return {
      organic: serperResults.organic || [],
      peopleAlsoAsk: serperResults.peopleAlsoAsk || [],
      relatedSearches: serperResults.relatedSearches || [],
      answerBox: serperResults.answerBox || null,
      knowledgeGraph: serperResults.knowledgeGraph || null,
      // For compatibility with Grok format
      content: serperResults.organic?.map(item => `${item.title}\n${item.snippet}`).join('\n\n') || '',
      text: serperResults.organic?.map(item => `${item.title}\n${item.snippet}`).join('\n\n') || ''
    };
  }

  parseWebSearchResults(searchResponse) {
    try {
      // Check if it's Serper format (has organic array)
      if (searchResponse.organic && Array.isArray(searchResponse.organic)) {
        return {
          organic: searchResponse.organic,
          peopleAlsoAsk: searchResponse.peopleAlsoAsk || [],
          relatedSearches: searchResponse.relatedSearches || [],
          answerBox: searchResponse.answerBox || null,
          knowledgeGraph: searchResponse.knowledgeGraph || null,
          text: searchResponse.organic.map(item => `${item.title}\n${item.snippet}`).join('\n\n')
        };
      }
      
      // Grok format (legacy) - returns structured data
      const content = searchResponse?.content || searchResponse?.text || '';
      
      // Extract key information
      const results = [];
      
      // Try to extract structured information
      if (typeof content === 'string') {
        // Look for URLs, titles, and snippets
        const urlPattern = /https?:\/\/[^\s\)]+/g;
        const urls = content.match(urlPattern) || [];
        
        urls.forEach((url, idx) => {
          results.push({
            title: `Source ${idx + 1}`,
            url: url,
            snippet: content.substring(0, 200) + '...',
            relevance_score: 1 - (idx * 0.1)
          });
        });
      }

      return results.length > 0 ? results : [{
        title: 'Research Results',
        url: null,
        snippet: typeof content === 'string' ? content.substring(0, 500) : JSON.stringify(content),
        relevance_score: 1.0
      }];
    } catch (error) {
      logger.error('[ContentResearch] Failed to parse web search results:', error);
      return [];
    }
  }

  /**
   * Extract sources from web search results (Grok or Serper format)
   */
  extractSources(searchResponse) {
    try {
      const sources = [];
      
      // Check if it's Serper format (has organic array)
      if (searchResponse.organic && Array.isArray(searchResponse.organic)) {
        return searchResponse.organic.map((item, idx) => ({
          title: item.title || '',
          url: item.link || '',
          snippet: item.snippet || '',
          domain: this.extractDomain(item.link || ''),
          position: item.position || idx + 1
        }));
      }
      
      // Grok format (legacy) - extract from text
      const content = searchResponse?.content || searchResponse?.text || '';
      
      // Extract URLs
      const urlPattern = /https?:\/\/[^\s\)]+/g;
      const urls = (typeof content === 'string' ? content.match(urlPattern) : []) || [];
      
      urls.forEach((url, idx) => {
        sources.push({
          title: this.extractTitleFromUrl(url),
          url: url,
          snippet: typeof content === 'string' ? content.substring(0, 150) : '',
          domain: this.extractDomain(url),
          position: idx + 1
        });
      });

      return sources;
    } catch (error) {
      logger.error('[ContentResearch] Failed to extract sources:', error);
      return [];
    }
  }

  /**
   * Extract summary from research results (Grok or Serper format)
   */
  extractSummary(searchResponse) {
    try {
      // Check if it's Serper format - use answer box or first organic result
      if (searchResponse.answerBox) {
        return searchResponse.answerBox.answer || searchResponse.answerBox.snippet || '';
      }
      
      if (searchResponse.organic && Array.isArray(searchResponse.organic) && searchResponse.organic.length > 0) {
        const firstResult = searchResponse.organic[0];
        return `${firstResult.title}\n\n${firstResult.snippet}`;
      }
      
      // Grok format (legacy)
      const content = searchResponse?.content || searchResponse?.text || '';
      
      if (typeof content === 'string') {
        // Take first 500 characters as summary
        return content.substring(0, 500) + (content.length > 500 ? '...' : '');
      }
      
      return JSON.stringify(content).substring(0, 500);
    } catch (error) {
      logger.error('[ContentResearch] Failed to extract summary:', error);
      return 'Research summary unavailable';
    }
  }

  /**
   * Get trending topics related to the topic
   */
  async getTrendingTopics(topic) {
    try {
      // Search X (Twitter) for trending discussions
      const xResults = await this.grokService.searchX({
        query: topic,
        analyzeImages: false
      });

      // Extract trending keywords and hashtags
      const trending = {
        hashtags: [],
        keywords: [],
        mentions: [],
        sentiment: 'neutral'
      };

      // Parse X results for trending information
      if (xResults && typeof xResults === 'object') {
        // Extract hashtags
        const hashtagPattern = /#\w+/g;
        const content = JSON.stringify(xResults);
        const hashtags = content.match(hashtagPattern) || [];
        trending.hashtags = [...new Set(hashtags)].slice(0, 10);

        // Extract keywords (common words)
        const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
        const wordFreq = {};
        words.forEach(word => {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        });
        trending.keywords = Object.entries(wordFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([word]) => word);
      }

      return trending;
    } catch (error) {
      logger.error('[ContentResearch] Failed to get trending topics:', error);
      return { error: error.message };
    }
  }

  /**
   * Get keyword suggestions for the topic
   */
  async getKeywordSuggestions(topic) {
    try {
      // Use Grok to suggest related keywords
      const response = await this.grokService.client?.chat?.completions?.create({
        model: 'grok-beta',
        messages: [
          {
            role: 'user',
            content: `Suggest 10 relevant keywords and hashtags for the topic: ${topic}. Return as a JSON array of strings.`
          }
        ]
      });

      let keywords = [];
      if (response?.choices?.[0]?.message?.content) {
        try {
          const parsed = JSON.parse(response.choices[0].message.content);
          keywords = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // If not JSON, extract keywords manually
          const content = response.choices[0].message.content;
          keywords = content.split(',').map(k => k.trim()).filter(k => k.length > 0);
        }
      }

      return {
        primary: topic,
        related: keywords.slice(0, 10),
        suggested_hashtags: keywords.filter(k => k.startsWith('#')).slice(0, 5),
        long_tail: keywords.filter(k => k.split(' ').length > 2).slice(0, 5)
      };
    } catch (error) {
      logger.error('[ContentResearch] Failed to get keyword suggestions:', error);
      // Fallback: return basic keywords
      return {
        primary: topic,
        related: [topic],
        suggested_hashtags: [`#${topic.replace(/\s+/g, '')}`],
        long_tail: []
      };
    }
  }

  /**
   * Analyze competitor content
   */
  async analyzeCompetitorContent(topic) {
    try {
      // Search for top content about this topic
      const searchResults = await this.grokService.searchWeb({
        query: `${topic} best practices guide`,
        allowedDomains: []
      });

      return {
        top_content: this.parseWebSearchResults(searchResults).slice(0, 5),
        common_themes: [],
        content_gaps: []
      };
    } catch (error) {
      logger.error('[ContentResearch] Failed to analyze competitor content:', error);
      return { error: error.message };
    }
  }

  /**
   * Generate research summary
   */
  generateResearchSummary(research) {
    const summary = {
      key_findings: [],
      trending_hashtags: [],
      recommended_keywords: [],
      sources_count: research.citations?.length || 0
    };

    if (research.trending_topics?.hashtags) {
      summary.trending_hashtags = research.trending_topics.hashtags.slice(0, 5);
    }

    if (research.keywords?.related) {
      summary.recommended_keywords = research.keywords.related.slice(0, 5);
    }

    if (research.web_search?.summary) {
      summary.key_findings.push(research.web_search.summary.substring(0, 200));
    }

    return summary;
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      if (!url) return 'unknown';
      const match = url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
      return match ? match[1] : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Extract title from URL (simplified)
   */
  extractTitleFromUrl(url) {
    try {
      const domain = this.extractDomain(url);
      const path = url.split('/').pop() || '';
      return path.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '') || domain;
    } catch {
      return 'Source';
    }
  }

  /**
   * Save research to database
   */
  async saveResearch(researchId, topic, results) {
    try {
      // Create table if it doesn't exist
      await database.query(`
        CREATE TABLE IF NOT EXISTS content_research (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          research_id UUID UNIQUE NOT NULL,
          topic TEXT NOT NULL,
          research_data JSONB NOT NULL,
          citations JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Insert research
      await database.query(`
        INSERT INTO content_research (research_id, topic, research_data, citations)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (research_id) DO UPDATE
        SET research_data = $3, citations = $4, updated_at = NOW()
      `, [
        researchId,
        topic,
        JSON.stringify(results),
        JSON.stringify(results.citations || [])
      ]);
    } catch (error) {
      logger.error('[ContentResearch] Failed to save research:', error);
      throw error;
    }
  }

  /**
   * Get saved research by ID
   */
  async getResearch(researchId) {
    try {
      const result = await database.query(
        'SELECT * FROM content_research WHERE research_id = $1',
        [researchId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const research = result.rows[0];
      research.research_data = typeof research.research_data === 'string'
        ? JSON.parse(research.research_data)
        : research.research_data;
      research.citations = typeof research.citations === 'string'
        ? JSON.parse(research.citations)
        : research.citations;

      return research;
    } catch (error) {
      logger.error('[ContentResearch] Failed to get research:', error);
      throw error;
    }
  }

  /**
   * Enhance content prompt with research
   */
  enhancePromptWithResearch(basePrompt, research) {
    let enhancedPrompt = basePrompt;

    // Add research context
    if (research.web_search?.summary) {
      enhancedPrompt += `\n\nRESEARCH CONTEXT:\n${research.web_search.summary}`;
    }

    // Add trending hashtags
    if (research.trending_topics?.hashtags?.length > 0) {
      enhancedPrompt += `\n\nTRENDING HASHTAGS: ${research.trending_topics.hashtags.slice(0, 5).join(', ')}`;
    }

    // Add keyword suggestions
    if (research.keywords?.related?.length > 0) {
      enhancedPrompt += `\n\nRELEVANT KEYWORDS: ${research.keywords.related.slice(0, 5).join(', ')}`;
    }

    // Add citation instruction
    if (research.citations?.length > 0) {
      enhancedPrompt += `\n\nIMPORTANT: Include citations from these sources when referencing facts:`;
      research.citations.slice(0, 3).forEach((cite, idx) => {
        enhancedPrompt += `\n${idx + 1}. ${cite.title} (${cite.domain})`;
      });
    }

    return enhancedPrompt;
  }

  /**
   * Fact-check content against research
   */
  async factCheckContent(content, research) {
    try {
      // Use Grok to fact-check content against research
      const factCheckPrompt = `Fact-check the following content against the provided research. 
Identify any claims that may be inaccurate or unsupported:

Content to check:
${content}

Research data:
${JSON.stringify(research.web_search?.summary || '')}

Provide a fact-check report with:
1. Accurate claims
2. Potentially inaccurate claims
3. Unsupported claims
4. Recommended corrections`;

      const response = await this.grokService.client?.chat?.completions?.create({
        model: 'grok-beta',
        messages: [
          {
            role: 'user',
            content: factCheckPrompt
          }
        ]
      });

      return {
        checked: true,
        report: response?.choices?.[0]?.message?.content || 'Fact-check unavailable',
        accuracy_score: 0.85 // Placeholder
      };
    } catch (error) {
      logger.error('[ContentResearch] Fact-check failed:', error);
      return {
        checked: false,
        error: error.message
      };
    }
  }
}

module.exports = ContentResearchService;

