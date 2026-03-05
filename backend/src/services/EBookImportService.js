const logger = require('../utils/logger');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Optional dependencies - loaded dynamically
let cheerio = null;
try {
  cheerio = require('cheerio');
  logger.info('cheerio loaded successfully');
} catch (e) {
  // Cheerio 1.1.0 requires Node.js 20+ due to File API dependency
  // For Node.js 18, use cheerio@0.22.0 instead
  logger.warn('cheerio not available - URL import will be limited', { 
    error: e.message,
    nodeVersion: process.version,
    solution: 'For Node.js 18, install cheerio@0.22.0: npm install cheerio@0.22.0'
  });
}

/**
 * EBook Import Service
 * Handles importing content from various sources (URL, Word, PDF, Google Docs)
 */
class EBookImportService {
  constructor() {
    // Ensure uploads directory exists
    this.uploadsDir = path.join(__dirname, '../../uploads/ebook-imports');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Import content from URL
   */
  async importFromUrl(url) {
    try {
      logger.info(`Importing content from URL: ${url}`);

      if (!cheerio) {
        throw new Error('cheerio package is required for URL import. Please install: npm install cheerio');
      }

      // Fetch the webpage
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      // Parse HTML
      const $ = cheerio.load(response.data);

      // Remove script and style elements
      $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();

      // Extract main content
      let content = '';
      const title = $('title').text() || $('h1').first().text() || 'Imported Content';

      // Try to find main content area
      const mainContent = $('article, main, .content, .post-content, .entry-content, #content').first();
      
      if (mainContent.length > 0) {
        // Extract text from main content area
        mainContent.find('h1, h2, h3, h4, h5, h6').each((i, el) => {
          const heading = $(el);
          const level = parseInt(heading.prop('tagName').substring(1));
          const text = heading.text().trim();
          if (text) {
            content += '\n' + '#'.repeat(level) + ' ' + text + '\n\n';
          }
        });

        mainContent.find('p').each((i, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 20) { // Filter out very short paragraphs
            content += text + '\n\n';
          }
        });
      } else {
        // Fallback: extract all paragraphs
        $('p').each((i, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 20) {
            content += text + '\n\n';
          }
        });
      }

      // Clean up content
      content = content
        .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
        .trim();

      if (!content || content.length < 100) {
        throw new Error('Could not extract sufficient content from URL');
      }

      return {
        title: title.trim(),
        content: content,
        source: 'url',
        sourceUrl: url,
        wordCount: content.split(/\s+/).length
      };
    } catch (error) {
      logger.error('Failed to import from URL:', error);
      throw new Error(`Failed to import from URL: ${error.message}`);
    }
  }

  /**
   * Import from Word document (.docx)
   * Note: Requires mammoth package
   */
  async importFromWord(filePath) {
    try {
      logger.info(`Importing content from Word document: ${filePath}`);

      // Check if mammoth is available
      let mammoth;
      try {
        mammoth = require('mammoth');
      } catch (e) {
        throw new Error('Word document import requires mammoth package. Please install: npm install mammoth');
      }

      // Read and convert Word document
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;

      if (!text || text.trim().length < 50) {
        throw new Error('Word document appears to be empty or could not be parsed');
      }

      // Extract title (first line or first heading)
      const lines = text.split('\n').filter(line => line.trim());
      const title = lines[0] || 'Imported Document';
      const content = lines.slice(1).join('\n\n').trim() || text;

      return {
        title: title.trim(),
        content: content,
        source: 'word',
        wordCount: content.split(/\s+/).length
      };
    } catch (error) {
      logger.error('Failed to import from Word:', error);
      throw new Error(`Failed to import from Word document: ${error.message}`);
    }
  }

  /**
   * Import from PDF
   * Note: Requires pdf-parse package
   */
  async importFromPDF(filePath) {
    try {
      logger.info(`Importing content from PDF: ${filePath}`);

      // Check if pdf-parse is available
      let pdfParse;
      try {
        pdfParse = require('pdf-parse');
      } catch (e) {
        throw new Error('PDF import requires pdf-parse package. Please install: npm install pdf-parse');
      }

      // Read PDF file
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);

      if (!data.text || data.text.trim().length < 50) {
        throw new Error('PDF appears to be empty or could not be parsed');
      }

      // Extract title and content
      const lines = data.text.split('\n').filter(line => line.trim());
      const title = lines[0] || data.info?.Title || 'Imported PDF';
      const content = data.text.trim();

      return {
        title: title.trim(),
        content: content,
        source: 'pdf',
        wordCount: content.split(/\s+/).length,
        metadata: {
          pages: data.numpages,
          info: data.info
        }
      };
    } catch (error) {
      logger.error('Failed to import from PDF:', error);
      throw new Error(`Failed to import from PDF: ${error.message}`);
    }
  }

  /**
   * Import from Google Docs (via URL)
   * This is a simplified version - full implementation would use Google Docs API
   */
  async importFromGoogleDocs(url) {
    try {
      logger.info(`Importing content from Google Docs: ${url}`);

      // Extract document ID from Google Docs URL
      const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!docIdMatch) {
        throw new Error('Invalid Google Docs URL format');
      }

      // For now, we'll try to access the export URL
      // Note: This only works for publicly shared documents
      const exportUrl = `https://docs.google.com/document/d/${docIdMatch[1]}/export?format=txt`;

      try {
        const response = await axios.get(exportUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 30000
        });

        const content = response.data;
        if (!content || content.trim().length < 50) {
          throw new Error('Could not extract content from Google Docs');
        }

        const lines = content.split('\n').filter(line => line.trim());
        const title = lines[0] || 'Imported Google Doc';
        const textContent = content.trim();

        return {
          title: title.trim(),
          content: textContent,
          source: 'google_docs',
          sourceUrl: url,
          wordCount: textContent.split(/\s+/).length
        };
      } catch (fetchError) {
        // If direct export fails, try web scraping
        logger.warn('Direct Google Docs export failed, trying web scraping...');
        return await this.importFromUrl(url);
      }
    } catch (error) {
      logger.error('Failed to import from Google Docs:', error);
      throw new Error(`Failed to import from Google Docs: ${error.message}`);
    }
  }

  /**
   * Import from plain text
   */
  async importFromText(text, title = 'Imported Content') {
    try {
      if (!text || text.trim().length < 50) {
        throw new Error('Text content is too short');
      }

      return {
        title: title.trim(),
        content: text.trim(),
        source: 'text',
        wordCount: text.split(/\s+/).length
      };
    } catch (error) {
      logger.error('Failed to import from text:', error);
      throw new Error(`Failed to import from text: ${error.message}`);
    }
  }
}

module.exports = new EBookImportService();

