const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const KeywordRepository = require('../services/keywordRepository');
const KeywordContentGenerator = require('../services/keywordContentGenerator');
const GrokApiService = require('../services/grokApiService');
const KeywordSentimentAnalyzer = require('../services/keywordSentimentAnalyzer');
const CreditService = require('../services/CreditService');
const ServicePricingService = require('../services/ServicePricingService');

const creditService = new CreditService();
const pricingService = ServicePricingService;

// Create monitor
router.post('/monitors', authenticateToken, async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) {
      return res.status(400).json({ error: 'keyword is required' });
    }

    const monitor = await KeywordRepository.createMonitor(req.user.id, req.body);
    res.status(201).json({ success: true, data: monitor });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create monitor', details: err.message });
  }
});

// List monitors
router.get('/monitors', authenticateToken, async (req, res) => {
  try {
    const monitors = await KeywordRepository.getMonitorsByUser(req.user.id);
    res.json({ success: true, data: monitors });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch monitors', details: err.message });
  }
});

// Get monitor
router.get('/monitors/:id', authenticateToken, async (req, res) => {
  try {
    const monitor = await KeywordRepository.getMonitorById(req.params.id, req.user.id);
    if (!monitor) return res.status(404).json({ success: false, error: 'Monitor not found' });
    res.json({ success: true, data: monitor });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch monitor', details: err.message });
  }
});

// Update monitor
router.put('/monitors/:id', authenticateToken, async (req, res) => {
  try {
    const monitor = await KeywordRepository.updateMonitor(req.params.id, req.user.id, req.body);
    if (!monitor) return res.status(404).json({ success: false, error: 'Monitor not found' });
    res.json({ success: true, data: monitor });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update monitor', details: err.message });
  }
});

// Delete monitor
router.delete('/monitors/:id', authenticateToken, async (req, res) => {
  try {
    const monitor = await KeywordRepository.deleteMonitor(req.params.id, req.user.id);
    if (!monitor) return res.status(404).json({ success: false, error: 'Monitor not found' });
    res.json({ success: true, data: monitor });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete monitor', details: err.message });
  }
});

// Activate/deactivate
router.post('/monitors/:id/activate', authenticateToken, async (req, res) => {
  try {
    const monitor = await KeywordRepository.setMonitorActive(req.params.id, req.user.id, true);
    if (!monitor) return res.status(404).json({ success: false, error: 'Monitor not found' });
    res.json({ success: true, data: monitor });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to activate monitor', details: err.message });
  }
});

router.post('/monitors/:id/deactivate', authenticateToken, async (req, res) => {
  try {
    const monitor = await KeywordRepository.setMonitorActive(req.params.id, req.user.id, false);
    if (!monitor) return res.status(404).json({ success: false, error: 'Monitor not found' });
    res.json({ success: true, data: monitor });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate monitor', details: err.message });
  }
});

// Latest sentiment for keyword
router.get('/sentiment/:keyword', authenticateToken, async (req, res) => {
  try {
    const monitors = await KeywordRepository.getMonitorsByUser(req.user.id);
    const monitor = monitors.find(
      (m) => m.keyword?.toLowerCase() === req.params.keyword.toLowerCase(),
    );
    if (!monitor) {
      return res.status(404).json({ success: false, error: 'Monitor not found for keyword' });
    }

    const snapshots = await KeywordRepository.getRecentSnapshots(monitor.id, 1);
    if (!snapshots || snapshots.length === 0) {
      return res.status(404).json({ success: false, error: 'No sentiment data found' });
    }
    res.json({ success: true, data: snapshots[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sentiment', details: err.message });
  }
});

// Sentiment history
router.get('/monitors/:id/snapshots', authenticateToken, async (req, res) => {
  try {
    const monitor = await KeywordRepository.getMonitorById(req.params.id, req.user.id);
    if (!monitor) return res.status(404).json({ error: 'Monitor not found' });

    const limit = parseInt(req.query.limit) || 50;
    const history = await KeywordRepository.getRecentSnapshots(monitor.id, limit);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sentiment history', details: err.message });
  }
});

// Alerts
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const alerts = await KeywordRepository.getAlertsByUser(req.user.id, limit, offset);
    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts', details: err.message });
  }
});

router.get('/alerts/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await KeywordRepository.getUnreadAlertsCount(req.user.id);
    res.json({ success: true, data: { count } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unread count', details: err.message });
  }
});

router.put('/alerts/:id/read', authenticateToken, async (req, res) => {
  try {
    const alert = await KeywordRepository.markAlertAsRead(req.params.id, req.user.id);
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark alert read', details: err.message });
  }
});

// Usage summary
router.get('/usage/summary', authenticateToken, async (req, res) => {
  try {
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;
    const summary = await KeywordRepository.getUsageSummary(req.user.id, startDate, endDate);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch usage summary', details: err.message });
  }
});

// Research keyword/hashtag
router.post('/research', authenticateToken, async (req, res) => {
  try {
    const { query, research_type = 'trending', platform = 'twitter' } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    // Check credits
    const cost = await pricingService.getPricing('keyword_research');
    if (cost > 0) {
      try {
        await creditService.deductCredits(req.user.id, 'keyword_research', cost);
      } catch (creditErr) {
        return res.status(402).json({ 
          error: 'Insufficient credits', 
          details: creditErr.message 
        });
      }
    }

    // Search via Grok
    const grok = new GrokApiService();
    const grokResults = await grok.searchX({ query });

    // Analyze sentiment
    const analyzer = new KeywordSentimentAnalyzer();
    const sentiment = await analyzer.analyzeSentiment(query, grokResults);

    // Extract better keywords from Grok results and citations
    let trendingKeywords = [];
    let relatedKeywords = [];
    let suggestedHashtags = [];
    
    // Extract keywords from citations (tweets/posts)
    const citations = grokResults?.citations || [];
    const allText = citations.map(c => c.text || '').join(' ').toLowerCase();
    
    // Extract trending phrases (2-3 word phrases that appear frequently)
    const phraseMap = new Map();
    citations.forEach(citation => {
      if (citation.text) {
        const words = citation.text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        // Extract 2-word phrases
        for (let i = 0; i < words.length - 1; i++) {
          const phrase = `${words[i]} ${words[i + 1]}`;
          if (phrase.length > 5 && !phrase.includes(query.toLowerCase())) {
            phraseMap.set(phrase, (phraseMap.get(phrase) || 0) + 1);
          }
        }
      }
    });
    
    // Get top trending phrases
    trendingKeywords = Array.from(phraseMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase]) => phrase.charAt(0).toUpperCase() + phrase.slice(1));
    
    // Extract related keywords (single words that appear frequently, excluding common words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how']);
    const wordMap = new Map();
    allText.split(/\s+/).forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
      if (cleanWord.length > 4 && !stopWords.has(cleanWord) && !cleanWord.includes(query.toLowerCase())) {
        wordMap.set(cleanWord, (wordMap.get(cleanWord) || 0) + 1);
      }
    });
    
    relatedKeywords = Array.from(wordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
    
    // Generate hashtags
    const baseHashtag = query.startsWith('#') ? query : `#${query.replace(/\s+/g, '')}`;
    suggestedHashtags = [baseHashtag];
    
    // Add hashtags from top keywords
    const topKeywords = [...trendingKeywords.slice(0, 3), ...relatedKeywords.slice(0, 2)];
    topKeywords.forEach(keyword => {
      const hashtag = `#${keyword.replace(/\s+/g, '')}`;
      if (hashtag !== baseHashtag && !suggestedHashtags.includes(hashtag)) {
        suggestedHashtags.push(hashtag);
      }
    });
    
    // Fallback to sentiment analyzer if we don't have enough keywords
    if (trendingKeywords.length < 5) {
      trendingKeywords = [...trendingKeywords, ...(sentiment.trendingPhrases || []).slice(0, 5 - trendingKeywords.length)];
    }
    if (relatedKeywords.length < 5) {
      relatedKeywords = [...relatedKeywords, ...(sentiment.relatedKeywords || []).slice(0, 5 - relatedKeywords.length)];
    }

    // Save research
    const research = await KeywordRepository.saveResearch(req.user.id, {
      research_type,
      query,
      platform,
      results: {
        sentiment,
        grokResults,
      },
      trending_keywords: trendingKeywords,
      related_keywords: relatedKeywords,
      suggested_hashtags: suggestedHashtags,
      search_volume: sentiment.mentionCount || 0,
      competition_level: sentiment.mentionCount > 1000 ? 'high' : sentiment.mentionCount > 100 ? 'medium' : 'low',
      trend_direction: sentiment.score > 20 ? 'rising' : sentiment.score < -20 ? 'falling' : 'stable',
    });

    // Track usage
    await KeywordRepository.insertUsage(req.user.id, {
      operation_type: 'keyword_research',
      credits_deducted: cost,
      keyword: query,
    });

    res.json({ success: true, data: research });
  } catch (err) {
    res.status(500).json({ error: 'Failed to research keyword', details: err.message });
  }
});

// Get saved research
router.get('/research/saved', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const research = await KeywordRepository.getSavedResearch(req.user.id, limit);
    res.json({ success: true, data: research });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch saved research', details: err.message });
  }
});

// Content generation
router.post('/content/generate', authenticateToken, async (req, res) => {
  try {
    const { keyword, sentiment, style = 'professional' } = req.body;
    if (!keyword || !sentiment) {
      return res.status(400).json({ error: 'keyword and sentiment are required' });
    }

    const generator = new KeywordContentGenerator();
    const text = await generator.generateTextPost(keyword, sentiment, style);

    const cost = await pricingService.getPricing('keyword_content_generation');
    if (cost > 0) {
      try {
        await creditService.deductCredits(req.user.id, 'keyword_content_generation', cost);
      } catch (creditErr) {
        return res.status(402).json({ 
          error: 'Insufficient credits', 
          details: creditErr.message 
        });
      }
    }

    res.json({ success: true, data: { text, cost } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate content', details: err.message });
  }
});

// Collections
router.post('/collections', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const collection = await KeywordRepository.createCollection(req.user.id, req.body);
    res.status(201).json({ success: true, data: collection });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create collection', details: err.message });
  }
});

router.get('/collections', authenticateToken, async (req, res) => {
  try {
    const collections = await KeywordRepository.getCollectionsByUser(req.user.id);
    res.json({ success: true, data: collections });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch collections', details: err.message });
  }
});

router.get('/collections/:id', authenticateToken, async (req, res) => {
  try {
    const collection = await KeywordRepository.getCollectionById(req.params.id, req.user.id);
    if (!collection) return res.status(404).json({ success: false, error: 'Collection not found' });
    res.json({ success: true, data: collection });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch collection', details: err.message });
  }
});

router.put('/collections/:id', authenticateToken, async (req, res) => {
  try {
    const collection = await KeywordRepository.updateCollection(req.params.id, req.user.id, req.body);
    if (!collection) return res.status(404).json({ success: false, error: 'Collection not found' });
    res.json({ success: true, data: collection });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update collection', details: err.message });
  }
});

router.delete('/collections/:id', authenticateToken, async (req, res) => {
  try {
    const collection = await KeywordRepository.deleteCollection(req.params.id, req.user.id);
    if (!collection) return res.status(404).json({ success: false, error: 'Collection not found' });
    res.json({ success: true, data: collection });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete collection', details: err.message });
  }
});

module.exports = router;

