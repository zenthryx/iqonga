const axios = require('axios');
const cheerio = require('cheerio');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const BrandBookService = require('./BrandBookService');
const logger = require('../utils/logger');
const AIContentService = require('./AIContentService');

/**
 * Website Brand Extraction Service
 * Extracts brand data from websites (colors, images, fonts, voice)
 * Similar to Holo.ai's "Input your URL" feature
 */
class WebsiteBrandExtractionService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../../uploads/brand-extraction');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Main method: Extract brand data from website URL
   * @param {number} userId - User ID
   * @param {string} websiteUrl - Website URL to extract from
   * @param {object} options - Extraction options
   * @returns {Promise<object>} Extracted brand data
   */
  async extractBrandFromWebsite(userId, websiteUrl, options = {}) {
    try {
      logger.info(`Extracting brand from website: ${websiteUrl} for user ${userId}`);

      // Validate URL
      let parsedUrl;
      try {
        parsedUrl = new URL(websiteUrl);
        if (!parsedUrl.protocol.startsWith('http')) {
          websiteUrl = `https://${websiteUrl}`;
          parsedUrl = new URL(websiteUrl);
        }
      } catch (error) {
        throw new Error('Invalid URL format');
      }

      const results = {
        websiteUrl,
        extractedAt: new Date().toISOString(),
        brandData: {},
        images: [],
        errors: []
      };

      // Step 1: Fetch and parse website
      const html = await this.fetchWebsite(websiteUrl);
      const $ = cheerio.load(html);

      // Step 2: Extract brand information
      results.brandData = {
        // Basic Info
        companyName: this.extractCompanyName($),
        tagline: this.extractTagline($),
        description: this.extractDescription($),
        
        // Colors
        colors: await this.extractColors($, websiteUrl),
        
        // Typography
        fonts: this.extractFonts($),
        
        // Brand Voice (analyzed from content)
        brandVoice: await this.analyzeBrandVoice($, userId),
        
        // Messaging
        keyMessages: this.extractKeyMessages($),
        valuePropositions: this.extractValuePropositions($),
        
        // Images
        logoUrls: this.extractLogos($, websiteUrl),
        heroImages: this.extractHeroImages($, websiteUrl),
        productImages: this.extractProductImages($, websiteUrl),
        
        // Media (videos, additional images)
        videos: this.extractVideos($, websiteUrl),
        allImages: this.extractAllImages($, websiteUrl)
      };

      // Step 3: Download and store images/media
      if (options.downloadImages !== false) {
        results.images = await this.downloadAndStoreImages(
          userId,
          results.brandData,
          websiteUrl
        );
        
        // Store in media library
        results.mediaStored = await this.storeInMediaLibrary(
          userId,
          results.images
        );
      }

      // Step 4: Save to Brand Book
      const brandBook = await this.saveToBrandBook(userId, results.brandData);

      return {
        success: true,
        brandBook,
        extractedData: results.brandData,
        imagesDownloaded: results.images.filter(m => m.category !== 'video').length,
        videosDownloaded: results.images.filter(m => m.category === 'video').length,
        mediaStored: results.mediaStored?.count || 0,
        message: 'Brand extracted successfully! Review and customize in Brand Book.'
      };

    } catch (error) {
      logger.error('Failed to extract brand from website:', error);
      throw error;
    }
  }

  /**
   * Fetch website HTML
   */
  async fetchWebsite(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 30000,
        maxRedirects: 5
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch website: ${error.message}`);
    }
  }

  /**
   * Extract company name
   */
  extractCompanyName($) {
    // Try multiple sources
    return $('meta[property="og:site_name"]').attr('content') ||
           $('meta[name="application-name"]').attr('content') ||
           $('meta[property="og:title"]').attr('content')?.split('|')[0]?.trim() ||
           $('title').text().split('|')[0].split('-')[0].trim() ||
           $('h1').first().text().trim() ||
           '';
  }

  /**
   * Extract tagline
   */
  extractTagline($) {
    return $('meta[property="og:description"]').attr('content') ||
           $('meta[name="description"]').attr('content') ||
           $('.tagline, .hero-subtitle, .site-tagline, .subtitle').first().text().trim() ||
           '';
  }

  /**
   * Extract description - Enhanced with multiple sources
   */
  extractDescription($) {
    // Try multiple sources in priority order
    let description = '';
    
    // 1. Meta tags (most reliable)
    description = $('meta[name="description"]').attr('content') ||
                  $('meta[property="og:description"]').attr('content') ||
                  $('meta[name="twitter:description"]').attr('content') ||
                  '';
    
    // 2. If meta tags are too short, try structured data
    if (!description || description.length < 50) {
      description = $('script[type="application/ld+json"]').text();
      if (description) {
        try {
          const jsonLd = JSON.parse(description);
          if (jsonLd.description) description = jsonLd.description;
          else if (jsonLd.about) description = jsonLd.about;
          else if (jsonLd['@type'] === 'Organization' && jsonLd.description) {
            description = jsonLd.description;
          }
        } catch (e) {
          // Not valid JSON, continue
        }
      }
    }
    
    // 3. Try common content sections
    if (!description || description.length < 50) {
      const contentSelectors = [
        '.about-text',
        '.company-description',
        '#about p',
        '.hero-description',
        '.intro-text',
        '.company-intro',
        '[class*="about"] p',
        '[class*="intro"] p',
        'section[class*="about"] p',
        '.mission-statement',
        '.value-proposition'
      ];
      
      for (const selector of contentSelectors) {
        const text = $(selector).first().text().trim();
        if (text && text.length > 50 && text.length < 1000) {
          description = text;
          break;
        }
      }
    }
    
    // 4. Fallback: Extract from first few paragraphs
    if (!description || description.length < 50) {
      const paragraphs = [];
      $('main p, article p, .content p').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 50 && text.length < 300) {
          paragraphs.push(text);
          if (paragraphs.length >= 3) return false; // Break
        }
      });
      if (paragraphs.length > 0) {
        description = paragraphs.join(' ');
      }
    }
    
    // Clean up: remove extra whitespace, limit length
    description = description
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();
    
    // Limit to reasonable length (500 chars for meta, 1000 for content)
    return description.substring(0, 1000).trim();
  }

  /**
   * Extract brand colors from CSS and images - Enhanced
   */
  async extractColors($, baseUrl) {
    const colors = {
      primary: [],
      secondary: [],
      accent: [],
      neutral: []
    };

    // Method 1: Extract from CSS variables (--primary-color, --brand-color, etc.)
    const cssText = $('style').text() + ' ' + this.extractInlineStyles($);
    
    // Extract CSS custom properties (variables)
    const cssVarRegex = /--(?:primary|brand|main|accent|secondary|color)[\w-]*:\s*([#\w()]+)/gi;
    const cssVarMatches = [...cssText.matchAll(cssVarRegex)];
    const cssVarColors = [];
    cssVarMatches.forEach(match => {
      const colorValue = match[1].trim();
      if (colorValue.startsWith('#')) {
        cssVarColors.push(colorValue);
      } else if (colorValue.match(/^rgb/)) {
        // Convert RGB to hex
        const rgbMatch = colorValue.match(/(\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
          const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
          const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
          cssVarColors.push(`#${r}${g}${b}`);
        }
      }
    });
    
    // Extract hex colors
    const hexColorRegex = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/gi;
    const hexMatches = [...new Set(cssText.match(hexColorRegex) || [])];
    
    // Extract RGB colors
    const rgbColorRegex = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/gi;
    const rgbMatches = [...cssText.matchAll(rgbColorRegex)];
    
    // Convert RGB to hex
    rgbMatches.forEach(match => {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      hexMatches.push(`#${r}${g}${b}`);
    });

    // Combine all colors
    const allColors = [...new Set([...cssVarColors, ...hexMatches])];
    
    // Remove very light/dark colors (likely backgrounds/text)
    const filteredColors = allColors.filter(color => {
      const rgb = this.hexToRgb(color);
      if (!rgb) return false;
      
      // Calculate brightness
      const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
      
      // Keep colors that are not too light (white) or too dark (black)
      // Adjusted thresholds for better results
      return brightness > 20 && brightness < 240;
    });

    // Sort by frequency in CSS (most used = primary)
    const colorFrequency = {};
    filteredColors.forEach(color => {
      const count = (cssText.match(new RegExp(color.replace('#', '\\#'), 'gi')) || []).length;
      colorFrequency[color] = count;
    });

    const sortedColors = filteredColors.sort((a, b) => 
      (colorFrequency[b] || 0) - (colorFrequency[a] || 0)
    );

    // Assign to color categories - prioritize CSS variables
    const primaryFromVars = cssVarColors.filter(c => sortedColors.includes(c)).slice(0, 2);
    const remainingColors = sortedColors.filter(c => !primaryFromVars.includes(c));
    
    colors.primary = [...primaryFromVars, ...remainingColors].slice(0, 3);
    colors.secondary = remainingColors.slice(0, 2);
    colors.accent = remainingColors.slice(2, 4);

    // Method 2: Extract from meta theme-color
    const themeColor = $('meta[name="theme-color"]').attr('content');
    if (themeColor && !colors.primary.includes(themeColor)) {
      colors.primary.unshift(themeColor);
      colors.primary = colors.primary.slice(0, 3);
    }

    // Method 3: Extract from structured data (JSON-LD)
    try {
      const jsonLd = $('script[type="application/ld+json"]').text();
      if (jsonLd) {
        const data = JSON.parse(jsonLd);
        if (data.brand && data.brand.color) {
          const brandColor = data.brand.color;
          if (brandColor && !colors.primary.includes(brandColor)) {
            colors.primary.unshift(brandColor);
            colors.primary = colors.primary.slice(0, 3);
          }
        }
      }
    } catch (e) {
      // Not valid JSON, continue
    }

    return colors;
  }

  /**
   * Convert hex to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Extract inline styles
   */
  extractInlineStyles($) {
    let styles = '';
    $('[style]').each((i, el) => {
      styles += $(el).attr('style') + ' ';
    });
    return styles;
  }

  /**
   * Extract fonts used
   */
  extractFonts($) {
    const fonts = {
      primary: null,
      secondary: null,
      heading: null,
      body: null
    };

    // Extract from CSS
    const cssText = $('style').text() + ' ' + this.extractInlineStyles($);
    
    // Look for font-family declarations
    const fontFamilyRegex = /font-family:\s*['"]?([^'";,]+)/gi;
    const matches = [...cssText.matchAll(fontFamilyRegex)];
    
    if (matches.length > 0) {
      const firstFont = matches[0][1].trim().replace(/['"]/g, '');
      fonts.primary = firstFont;
      fonts.body = firstFont;
    }
    if (matches.length > 1) {
      fonts.secondary = matches[1][1].trim().replace(/['"]/g, '');
    }

    // Check for heading fonts
    const headingFont = $('h1, h2, h3').first().css('font-family');
    if (headingFont) {
      fonts.heading = headingFont.split(',')[0].replace(/['"]/g, '').trim();
    }

    return fonts;
  }

  /**
   * Analyze brand voice from website content
   */
  async analyzeBrandVoice($, userId) {
    try {
      // Extract key content
      const content = {
        headlines: [],
        bodyText: [],
        ctaText: []
      };

      // Extract headlines
      $('h1, h2, h3').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 100 && content.headlines.length < 10) {
          content.headlines.push(text);
        }
      });

      // Extract body text
      $('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20 && text.length < 500 && content.bodyText.length < 5) {
          content.bodyText.push(text);
        }
      });

      // Extract CTAs
      $('a[class*="button"], button, .cta, [class*="cta"]').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 50 && content.ctaText.length < 5) {
          content.ctaText.push(text);
        }
      });

      // Combine content for analysis
      const combinedContent = [
        ...content.headlines,
        ...content.bodyText,
        ...content.ctaText
      ].join('\n\n');

      if (combinedContent.length < 100) {
        return null; // Not enough content
      }

      // Use AI to analyze brand voice
      try {
        const analysisPrompt = `Analyze the brand voice and tone from this website content. 
Provide a JSON response with:
{
  "brandVoice": "Brief description of brand voice (e.g., 'Professional and friendly', 'Bold and energetic')",
  "toneOfVoice": "Specific tone characteristics (e.g., 'Friendly, confident, helpful')",
  "brandPersonality": ["trait1", "trait2", "trait3"],
  "brandValues": ["value1", "value2", "value3"],
  "messagingStyle": "Description of how they communicate (e.g., 'Clear, benefit-focused, action-oriented')"
}

Website Content:
${combinedContent.substring(0, 2000)}`;

        // Use OpenAI or your preferred LLM
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a brand voice analyst. Analyze website content and extract brand voice, tone, personality, and values. Always respond with valid JSON.'
            },
            { role: 'user', content: analysisPrompt }
          ],
          temperature: 0.7,
          max_tokens: 500,
          response_format: { type: 'json_object' }
        });

        const analysis = JSON.parse(response.choices[0].message.content);
        return analysis;

      } catch (aiError) {
        logger.warn('AI brand voice analysis failed, using fallback:', aiError);
        // Fallback: simple analysis
        return {
          brandVoice: 'Professional and approachable',
          toneOfVoice: 'Clear and friendly',
          brandPersonality: ['Professional', 'Customer-focused'],
          brandValues: ['Quality', 'Customer satisfaction'],
          messagingStyle: 'Clear and benefit-focused'
        };
      }

    } catch (error) {
      logger.error('Failed to analyze brand voice:', error);
      return null;
    }
  }

  /**
   * Extract key messages
   */
  extractKeyMessages($) {
    const messages = [];
    
    // Extract from meta tags
    const ogDescription = $('meta[property="og:description"]').attr('content');
    if (ogDescription) messages.push(ogDescription);

    // Extract from hero sections
    $('.hero, .hero-section, [class*="hero"]').each((i, el) => {
      const text = $(el).find('h1, h2, p').text().trim();
      if (text && text.length < 200 && messages.length < 5) {
        messages.push(text);
      }
    });

    return messages.slice(0, 5);
  }

  /**
   * Extract value propositions
   */
  extractValuePropositions($) {
    const propositions = [];
    
    // Look for common value prop patterns
    $('[class*="value"], [class*="benefit"], [class*="feature"]').each((i, el) => {
      const text = $(el).find('h3, h4, p').first().text().trim();
      if (text && text.length < 150 && propositions.length < 5) {
        propositions.push(text);
      }
    });

    return propositions.slice(0, 5);
  }

  /**
   * Extract logo URLs
   */
  extractLogos($, baseUrl) {
    const logos = [];

    // Try multiple selectors
    const logoSelectors = [
      'img[class*="logo" i]',
      'img[alt*="logo" i]',
      'img[src*="logo" i]',
      '.logo img',
      'header img',
      'nav img',
      '[class*="brand"] img'
    ];

    logoSelectors.forEach(selector => {
      $(selector).each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
        if (src) {
          const absoluteUrl = this.resolveUrl(src, baseUrl);
          if (absoluteUrl && !logos.includes(absoluteUrl)) {
            logos.push(absoluteUrl);
          }
        }
      });
    });

    return logos.slice(0, 3); // Top 3 logos
  }

  /**
   * Extract hero images
   */
  extractHeroImages($, baseUrl) {
    const images = [];

    // Look for hero images
    $('.hero img, .hero-section img, [class*="hero"] img, [class*="banner"] img').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
      if (src) {
        const absoluteUrl = this.resolveUrl(src, baseUrl);
        if (absoluteUrl && !images.includes(absoluteUrl)) {
          images.push(absoluteUrl);
        }
      }
    });

    // Also check for background images
    $('[style*="background-image"]').each((i, el) => {
      const style = $(el).attr('style');
      const match = style.match(/url\(['"]?([^'")]+)/);
      if (match) {
        const absoluteUrl = this.resolveUrl(match[1], baseUrl);
        if (absoluteUrl && !images.includes(absoluteUrl)) {
          images.push(absoluteUrl);
        }
      }
    });

    return images.slice(0, 5);
  }

  /**
   * Extract product images - Enhanced
   */
  extractProductImages($, baseUrl) {
    const images = [];

    // Look for product images with multiple selectors
    const productSelectors = [
      '[class*="product"] img',
      '[class*="item"] img',
      '[data-product] img',
      '[class*="gallery"] img',
      '[class*="portfolio"] img',
      '[class*="showcase"] img',
      '.product-image',
      '.item-image',
      '[data-image]'
    ];

    productSelectors.forEach(selector => {
      $(selector).each((i, el) => {
        const src = $(el).attr('src') || 
                   $(el).attr('data-src') || 
                   $(el).attr('data-lazy-src') ||
                   $(el).attr('data-original') ||
                   $(el).attr('data-image');
        if (src) {
          const absoluteUrl = this.resolveUrl(src, baseUrl);
          if (absoluteUrl && !images.includes(absoluteUrl)) {
            images.push(absoluteUrl);
          }
        }
      });
    });

    return images.slice(0, 15); // Increased limit
  }

  /**
   * Extract videos from website
   */
  extractVideos($, baseUrl) {
    const videos = [];

    // Extract video elements
    $('video').each((i, el) => {
      const src = $(el).attr('src') || 
                 $(el).attr('data-src') ||
                 $(el).find('source').first().attr('src');
      if (src) {
        const absoluteUrl = this.resolveUrl(src, baseUrl);
        if (absoluteUrl && !videos.includes(absoluteUrl)) {
          videos.push(absoluteUrl);
        }
      }
    });

    // Extract iframe videos (YouTube, Vimeo, etc.)
    $('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="video"]').each((i, el) => {
      const src = $(el).attr('src');
      if (src) {
        videos.push(src); // Keep iframe URLs as-is
      }
    });

    // Extract video URLs from data attributes
    $('[data-video], [data-video-url], [class*="video"]').each((i, el) => {
      const videoUrl = $(el).attr('data-video') || 
                      $(el).attr('data-video-url') ||
                      $(el).attr('data-src');
      if (videoUrl && videoUrl.match(/\.(mp4|webm|mov|ogg)/i)) {
        const absoluteUrl = this.resolveUrl(videoUrl, baseUrl);
        if (absoluteUrl && !videos.includes(absoluteUrl)) {
          videos.push(absoluteUrl);
        }
      }
    });

    return videos.slice(0, 10);
  }

  /**
   * Extract all images (comprehensive)
   */
  extractAllImages($, baseUrl) {
    const images = [];
    const seenUrls = new Set();

    // Extract all img tags
    $('img').each((i, el) => {
      const src = $(el).attr('src') || 
                 $(el).attr('data-src') || 
                 $(el).attr('data-lazy-src') ||
                 $(el).attr('data-original') ||
                 $(el).attr('data-image');
      if (src) {
        const absoluteUrl = this.resolveUrl(src, baseUrl);
        if (absoluteUrl && !seenUrls.has(absoluteUrl)) {
          // Filter out common non-content images
          const lowerUrl = absoluteUrl.toLowerCase();
          if (!lowerUrl.includes('icon') && 
              !lowerUrl.includes('sprite') &&
              !lowerUrl.includes('pixel') &&
              !lowerUrl.includes('tracking') &&
              !lowerUrl.includes('analytics')) {
            images.push(absoluteUrl);
            seenUrls.add(absoluteUrl);
          }
        }
      }
    });

    // Extract background images
    $('[style*="background-image"]').each((i, el) => {
      const style = $(el).attr('style');
      const match = style.match(/url\(['"]?([^'")]+)/);
      if (match) {
        const absoluteUrl = this.resolveUrl(match[1], baseUrl);
        if (absoluteUrl && !seenUrls.has(absoluteUrl)) {
          images.push(absoluteUrl);
          seenUrls.add(absoluteUrl);
        }
      }
    });

    return images.slice(0, 30); // Limit to top 30
  }

  /**
   * Resolve relative URLs to absolute
   */
  resolveUrl(url, baseUrl) {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    if (url.startsWith('/')) {
      const base = new URL(baseUrl);
      return base.origin + url;
    }
    const base = new URL(baseUrl);
    return base.origin + '/' + url;
  }

  /**
   * Download and store images/media - Enhanced
   */
  async downloadAndStoreImages(userId, brandData, baseUrl) {
    const downloadedMedia = [];

    // Download logos
    for (const logoUrl of brandData.logoUrls || []) {
      try {
        const image = await this.downloadImage(logoUrl, userId, 'logo');
        if (image) downloadedMedia.push(image);
      } catch (error) {
        logger.warn(`Failed to download logo: ${logoUrl}`, error.message);
      }
    }

    // Download hero images
    for (const heroUrl of brandData.heroImages || []) {
      try {
        const image = await this.downloadImage(heroUrl, userId, 'hero');
        if (image) downloadedMedia.push(image);
      } catch (error) {
        logger.warn(`Failed to download hero image: ${heroUrl}`, error.message);
      }
    }

    // Download product images (top 5)
    for (const productUrl of (brandData.productImages || []).slice(0, 5)) {
      try {
        const image = await this.downloadImage(productUrl, userId, 'product');
        if (image) downloadedMedia.push(image);
      } catch (error) {
        logger.warn(`Failed to download product image: ${productUrl}`, error.message);
      }
    }

    // Download videos (top 3, skip iframe URLs)
    for (const videoUrl of (brandData.videos || []).slice(0, 3)) {
      try {
        // Skip iframe URLs (YouTube, Vimeo) - can't download those
        if (videoUrl.includes('youtube.com') || videoUrl.includes('vimeo.com')) {
          downloadedMedia.push({
            url: videoUrl,
            category: 'video',
            type: 'iframe',
            note: 'Embedded video (YouTube/Vimeo)'
          });
        } else {
          const video = await this.downloadVideo(videoUrl, userId);
          if (video) downloadedMedia.push(video);
        }
      } catch (error) {
        logger.warn(`Failed to download video: ${videoUrl}`, error.message);
      }
    }

    return downloadedMedia;
  }

  /**
   * Download video file
   */
  async downloadVideo(videoUrl, userId) {
    try {
      const response = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // Longer timeout for videos
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        maxContentLength: 100 * 1024 * 1024 // 100MB max
      });

      const ext = path.extname(new URL(videoUrl).pathname) || '.mp4';
      const filename = `video_${Date.now()}${ext}`;
      const userDir = path.join(this.uploadsDir, userId.toString());
      await fsPromises.mkdir(userDir, { recursive: true });
      const filepath = path.join(userDir, filename);

      await fsPromises.writeFile(filepath, Buffer.from(response.data));

      return {
        url: videoUrl,
        localPath: filepath,
        publicUrl: `/uploads/brand-extraction/${userId}/${filename}`,
        category: 'video',
        size: (await fsPromises.stat(filepath)).size
      };
    } catch (error) {
      logger.error(`Failed to download video ${videoUrl}:`, error.message);
      return null;
    }
  }

  /**
   * Download single image
   */
  async downloadImage(imageUrl, userId, category) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const ext = path.extname(new URL(imageUrl).pathname) || '.jpg';
      const filename = `${category}_${Date.now()}${ext}`;
      const userDir = path.join(this.uploadsDir, userId.toString());
      await fsPromises.mkdir(userDir, { recursive: true });
      const filepath = path.join(userDir, filename);

      await fsPromises.writeFile(filepath, Buffer.from(response.data));

      // Get image metadata
      let metadata = {};
      try {
        metadata = await sharp(filepath).metadata();
      } catch (sharpError) {
        logger.warn('Failed to get image metadata:', sharpError);
      }

      return {
        url: imageUrl,
        localPath: filepath,
        publicUrl: `/uploads/brand-extraction/${userId}/${filename}`,
        category,
        width: metadata.width,
        height: metadata.height,
        size: (await fsPromises.stat(filepath)).size
      };
    } catch (error) {
      logger.error(`Failed to download image ${imageUrl}:`, error.message);
      return null;
    }
  }

  /**
   * Save extracted data to Brand Book
   */
  async saveToBrandBook(userId, brandData) {
    try {
      const brandBook = await BrandBookService.getOrCreateBrandBook(userId);

      // Prepare updates
      const updates = {
        brand_name: brandData.companyName || brandBook.brand_name,
        brand_description: brandData.description || brandBook.brand_description
      };

      // Add colors
      if (brandData.colors && brandData.colors.primary.length > 0) {
        updates.primary_colors = brandData.colors.primary.map(hex => ({ hex, name: 'Primary' }));
      }
      if (brandData.colors && brandData.colors.secondary.length > 0) {
        updates.secondary_colors = brandData.colors.secondary.map(hex => ({ hex, name: 'Secondary' }));
      }
      if (brandData.colors && brandData.colors.accent.length > 0) {
        updates.accent_colors = brandData.colors.accent.map(hex => ({ hex, name: 'Accent' }));
      }

      // Add fonts
      if (brandData.fonts) {
        if (brandData.fonts.primary) updates.primary_font = brandData.fonts.primary;
        if (brandData.fonts.secondary) updates.secondary_font = brandData.fonts.secondary;
        if (brandData.fonts.heading) updates.heading_font = brandData.fonts.heading;
        if (brandData.fonts.body) updates.body_font = brandData.fonts.body;
      }

      // Add brand voice if analyzed
      if (brandData.brandVoice) {
        updates.brand_voice = brandData.brandVoice.brandVoice;
        updates.tone_of_voice = brandData.brandVoice.toneOfVoice;
        updates.brand_personality = brandData.brandVoice.brandPersonality || [];
        updates.brand_values = brandData.brandVoice.brandValues || [];
        if (brandData.brandVoice.messagingStyle) {
          updates.brand_messaging = brandData.brandVoice.messagingStyle;
        }
      }

      // Add primary logo if found
      if (brandData.logoUrls && brandData.logoUrls.length > 0) {
        updates.primary_logo_url = brandData.logoUrls[0];
      }

      // Update brand book
      const updated = await BrandBookService.updateBrandBook(
        brandBook.id,
        userId,
        updates
      );

      // Store logos as brand assets
      if (brandData.logoUrls && brandData.logoUrls.length > 0) {
        for (const logoUrl of brandData.logoUrls) {
          try {
            await BrandBookService.addBrandAsset(brandBook.id, userId, {
              asset_name: 'Logo',
              asset_type: 'logo',
              asset_category: 'primary',
              file_url: logoUrl,
              tags: ['extracted', 'logo']
            });
          } catch (assetError) {
            logger.warn('Failed to add logo as asset:', assetError);
          }
        }
      }

      return updated;
    } catch (error) {
      logger.error('Failed to save to brand book:', error);
      throw error;
    }
  }

  /**
   * Store downloaded media in user's media library
   */
  async storeInMediaLibrary(userId, downloadedMedia) {
    const database = require('../database/connection');
    const storedItems = [];

    for (const media of downloadedMedia) {
      try {
        // Skip iframe videos (can't store those)
        if (media.type === 'iframe') {
          continue;
        }

        if (!media.localPath || !fs.existsSync(media.localPath)) {
          continue;
        }

        const stats = await fsPromises.stat(media.localPath);
        const fileName = path.basename(media.localPath);
        const fileUrl = media.publicUrl || media.localPath.replace(/\\/g, '/').replace(/.*\/uploads\//, '/uploads/');
        
        // Determine MIME type
        const ext = path.extname(fileName).toLowerCase();
        const mimeTypes = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.mp4': 'video/mp4',
          '.webm': 'video/webm',
          '.mov': 'video/quicktime',
          '.ogg': 'video/ogg'
        };
        const mimeType = mimeTypes[ext] || (media.category === 'video' ? 'video/mp4' : 'image/png');
        const fileType = media.category === 'video' ? 'video' : 'image';

        // Store in Media Library
        const mediaId = uuidv4();
        const result = await database.query(`
          INSERT INTO uploaded_media (
            id, user_id, file_name, original_name, file_path, file_url,
            file_type, mime_type, file_size, description, tags, is_public, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
          RETURNING *
        `, [
          mediaId,
          userId,
          fileName,
          fileName,
          media.localPath,
          fileUrl,
          fileType,
          mimeType,
          stats.size,
          `Extracted ${media.category} from website`,
          ['brand-extraction', media.category, 'website-extracted'],
          false // Not public by default
        ]);

        storedItems.push(result.rows[0]);
        logger.info(`Stored ${fileType} in Media Library: ${mediaId} - ${fileName}`);
      } catch (error) {
        logger.warn(`Failed to store media in library:`, error.message);
        // Continue with other items
      }
    }

    return {
      count: storedItems.length,
      items: storedItems
    };
  }
}

module.exports = new WebsiteBrandExtractionService();
