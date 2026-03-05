const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Serper API Service
 * Provides Google Search API integration via Serper.dev
 * More reliable and faster than scraping-based solutions
 */
class SerperApiService {
  constructor() {
    this.apiKey = process.env.SERPER_API_KEY;
    this.baseUrl = 'https://google.serper.dev';
    
    if (!this.apiKey) {
      logger.warn('[SerperApi] SERPER_API_KEY not configured - web search will be limited');
    }
  }

  /**
   * Search Google via Serper API
   * @param {object} options - Search options
   * @param {string} options.query - Search query
   * @param {string} options.type - Search type: 'search', 'images', 'videos', 'places'
   * @param {number} options.num - Number of results (default: 10, max: 100)
   * @param {number} options.page - Page number for pagination
   * @param {string} options.location - Location for local search
   * @param {string} options.language - Language code (default: 'en')
   * @param {string} options.gl - Country code
   * @param {string} options.safe - Safe search: 'active', 'off'
   * @returns {Promise<object>} Search results
   */
  async search(options = {}) {
    if (!this.apiKey) {
      throw new Error('SERPER_API_KEY not configured');
    }

    const {
      query,
      type = 'search',
      num = 10,
      page = 1,
      location,
      language = 'en',
      gl,
      safe = 'active'
    } = options;

    if (!query) {
      throw new Error('Search query is required');
    }

    try {
      const requestBody = {
        q: query,
        num: Math.min(num, 100), // Cap at 100
        page,
        gl: gl || undefined,
        hl: language,
        safe: safe === 'active' ? 'active' : undefined
      };

      // Add location for local searches
      if (location) {
        requestBody.location = location;
      }

      const response = await axios.post(
        `${this.baseUrl}/${type}`,
        requestBody,
        {
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      return this.formatResults(response.data, type);
    } catch (error) {
      logger.error('[SerperApi] Search failed:', {
        query,
        type,
        error: error.message,
        response: error.response?.data
      });
      throw new Error(`Serper API search failed: ${error.message}`);
    }
  }

  /**
   * Format Serper API results into consistent format
   * @param {object} data - Raw API response
   * @param {string} type - Search type
   * @returns {object} Formatted results
   */
  formatResults(data, type = 'search') {
    const results = {
      query: data.searchParameters?.q || '',
      total_results: data.searchInformation?.totalResults || 0,
      search_time: data.searchInformation?.searchTime || 0,
      organic: [],
      peopleAlsoAsk: [],
      relatedSearches: [],
      answerBox: null,
      knowledgeGraph: null,
      images: [],
      videos: []
    };

    // Organic search results
    if (data.organic && Array.isArray(data.organic)) {
      results.organic = data.organic.map((item, index) => ({
        position: index + 1,
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
        date: item.date || null,
        sitelinks: item.sitelinks || []
      }));
    }

    // People Also Ask
    if (data.peopleAlsoAsk && Array.isArray(data.peopleAlsoAsk)) {
      results.peopleAlsoAsk = data.peopleAlsoAsk.map((item, index) => ({
        question: item.question || '',
        snippet: item.snippet || '',
        title: item.title || '',
        link: item.link || ''
      }));
    }

    // Related Searches
    if (data.relatedSearches && Array.isArray(data.relatedSearches)) {
      results.relatedSearches = data.relatedSearches.map(item => ({
        query: item.query || ''
      }));
    }

    // Answer Box
    if (data.answerBox) {
      results.answerBox = {
        title: data.answerBox.title || '',
        answer: data.answerBox.answer || '',
        snippet: data.answerBox.snippet || '',
        link: data.answerBox.link || '',
        date: data.answerBox.date || null
      };
    }

    // Knowledge Graph
    if (data.knowledgeGraph) {
      results.knowledgeGraph = {
        title: data.knowledgeGraph.title || '',
        type: data.knowledgeGraph.type || '',
        description: data.knowledgeGraph.description || '',
        website: data.knowledgeGraph.website || '',
        imageUrl: data.knowledgeGraph.imageUrl || '',
        attributes: data.knowledgeGraph.attributes || {}
      };
    }

    // Images
    if (data.images && Array.isArray(data.images)) {
      results.images = data.images.map((item, index) => ({
        position: index + 1,
        title: item.title || '',
        link: item.link || '',
        imageUrl: item.imageUrl || '',
        source: item.source || ''
      }));
    }

    // Videos
    if (data.videos && Array.isArray(data.videos)) {
      results.videos = data.videos.map((item, index) => ({
        position: index + 1,
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
        thumbnailUrl: item.thumbnailUrl || '',
        duration: item.duration || null,
        channel: item.channel || ''
      }));
    }

    return results;
  }

  /**
   * Search for images
   * @param {string} query - Search query
   * @param {number} num - Number of results
   * @returns {Promise<object>} Image search results
   */
  async searchImages(query, num = 20) {
    return this.search({
      query,
      type: 'images',
      num: Math.min(num, 100)
    });
  }

  /**
   * Search for videos
   * @param {string} query - Search query
   * @param {number} num - Number of results
   * @returns {Promise<object>} Video search results
   */
  async searchVideos(query, num = 20) {
    return this.search({
      query,
      type: 'videos',
      num: Math.min(num, 100)
    });
  }

  /**
   * Get trending searches for a topic
   * @param {string} topic - Topic to search
   * @returns {Promise<object>} Trending search results
   */
  async getTrendingSearches(topic) {
    // Use related searches as trending indicators
    const results = await this.search({
      query: topic,
      num: 10
    });

    return {
      topic,
      related_searches: results.relatedSearches,
      people_also_ask: results.peopleAlsoAsk,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new SerperApiService();

