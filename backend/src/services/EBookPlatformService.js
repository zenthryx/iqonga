const logger = require('../utils/logger');
const EBookProjectService = require('./EBookProjectService');
const EBookExportService = require('./EBookExportService');
const database = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

/**
 * EBook Platform Integration Service
 * Handles integration with Amazon Kindle, Apple Books, Kobo, and other platforms
 */
class EBookPlatformService {
  constructor() {
    this.exportsDir = path.join(__dirname, '../../uploads/ebook-exports');
    if (!fs.existsSync(this.exportsDir)) {
      fs.mkdirSync(this.exportsDir, { recursive: true });
    }
  }

  /**
   * Prepare eBook for Amazon Kindle Direct Publishing (KDP)
   */
  async prepareForKindle(projectId, userId, options = {}) {
    try {
      logger.info(`Preparing eBook ${projectId} for Amazon Kindle`);

      const project = await EBookProjectService.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Generate ePub (KDP accepts EPUB format)
      const epubResult = await EBookExportService.exportToEpub(projectId, userId, {
        ...options,
        platform: 'kindle'
      });

      // Generate Kindle-specific metadata
      const kindleMetadata = await this.generateKindleMetadata(project, options);

      // Create KDP-ready package
      const packageId = uuidv4();
      const packageDir = path.join(this.exportsDir, `kindle_${packageId}`);
      if (!fs.existsSync(packageDir)) {
        fs.mkdirSync(packageDir, { recursive: true });
      }

      // Copy EPUB file
      const epubSource = path.join(this.exportsDir, path.basename(epubResult.fileUrl));
      const epubDest = path.join(packageDir, `${project.title.replace(/[^a-z0-9]/gi, '_')}.epub`);
      if (fs.existsSync(epubSource)) {
        fs.copyFileSync(epubSource, epubDest);
      }

      // Generate KDP metadata file
      const metadataFile = path.join(packageDir, 'kdp_metadata.txt');
      fs.writeFileSync(metadataFile, this.formatKindleMetadata(kindleMetadata));

      // Generate KDP description file
      const descriptionFile = path.join(packageDir, 'description.txt');
      fs.writeFileSync(descriptionFile, project.description || '');

      // Record platform export
      await database.query(`
        INSERT INTO ebook_exports (
          id, project_id, user_id, export_format, file_url, file_size_bytes, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        uuidv4(),
        projectId,
        userId,
        'kindle',
        `/api/uploads/ebook-exports/kindle_${packageId}`,
        this.getDirectorySize(packageDir),
        JSON.stringify({
          platform: 'kindle',
          packageId,
          metadata: kindleMetadata
        })
      ]);

      return {
        success: true,
        platform: 'kindle',
        packageUrl: `/api/uploads/ebook-exports/kindle_${packageId}`,
        files: {
          epub: `${project.title.replace(/[^a-z0-9]/gi, '_')}.epub`,
          metadata: 'kdp_metadata.txt',
          description: 'description.txt'
        },
        metadata: kindleMetadata,
        instructions: this.getKindleInstructions()
      };
    } catch (error) {
      logger.error('Failed to prepare for Kindle:', error);
      throw error;
    }
  }

  /**
   * Generate Kindle metadata
   */
  async generateKindleMetadata(project, options = {}) {
    const {
      author = 'Author Name',
      publisher = 'Self-Published',
      publicationDate = new Date().toISOString().split('T')[0],
      isbn = null,
      language = 'en',
      categories = [],
      keywords = [],
      price = null,
      territories = ['US', 'GB', 'CA', 'AU'] // Default territories
    } = options;

    return {
      title: project.title,
      subtitle: null,
      seriesTitle: null,
      seriesNumber: null,
      author: author,
      contributors: [],
      publisher: publisher,
      publicationDate: publicationDate,
      isbn: isbn,
      language: language,
      categories: categories.length > 0 ? categories : [project.genre || 'Fiction'],
      keywords: keywords.length > 0 ? keywords : this.extractKeywords(project),
      description: project.description || '',
      price: price,
      territories: territories,
      drm: false, // KDP doesn't support DRM
      adultContent: false
    };
  }

  /**
   * Format Kindle metadata for KDP upload
   */
  formatKindleMetadata(metadata) {
    let text = 'KDP Metadata\n';
    text += '='.repeat(50) + '\n\n';
    text += `Title: ${metadata.title}\n`;
    if (metadata.subtitle) {
      text += `Subtitle: ${metadata.subtitle}\n`;
    }
    text += `Author: ${metadata.author}\n`;
    text += `Publisher: ${metadata.publisher}\n`;
    text += `Publication Date: ${metadata.publicationDate}\n`;
    if (metadata.isbn) {
      text += `ISBN: ${metadata.isbn}\n`;
    }
    text += `Language: ${metadata.language}\n`;
    text += `Categories: ${metadata.categories.join(', ')}\n`;
    if (metadata.keywords.length > 0) {
      text += `Keywords: ${metadata.keywords.join(', ')}\n`;
    }
    text += `\nDescription:\n${metadata.description}\n`;
    return text;
  }

  /**
   * Prepare eBook for Apple Books (iBooks)
   */
  async prepareForAppleBooks(projectId, userId, options = {}) {
    try {
      logger.info(`Preparing eBook ${projectId} for Apple Books`);

      const project = await EBookProjectService.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Generate ePub (Apple Books uses EPUB)
      const epubResult = await EBookExportService.exportToEpub(projectId, userId, {
        ...options,
        platform: 'apple'
      });

      // Generate Apple Books metadata
      const appleMetadata = await this.generateAppleMetadata(project, options);

      // Create Apple Books package
      const packageId = uuidv4();
      const packageDir = path.join(this.exportsDir, `apple_${packageId}`);
      if (!fs.existsSync(packageDir)) {
        fs.mkdirSync(packageDir, { recursive: true });
      }

      // Copy EPUB file
      const epubSource = path.join(this.exportsDir, path.basename(epubResult.fileUrl));
      const epubDest = path.join(packageDir, `${project.title.replace(/[^a-z0-9]/gi, '_')}.epub`);
      if (fs.existsSync(epubSource)) {
        fs.copyFileSync(epubSource, epubDest);
      }

      // Generate Apple Books metadata (iTunes Connect format)
      const metadataFile = path.join(packageDir, 'apple_metadata.xml');
      fs.writeFileSync(metadataFile, this.formatAppleMetadata(appleMetadata));

      // Record platform export
      await database.query(`
        INSERT INTO ebook_exports (
          id, project_id, user_id, export_format, file_url, file_size_bytes, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        uuidv4(),
        projectId,
        userId,
        'apple',
        `/api/uploads/ebook-exports/apple_${packageId}`,
        this.getDirectorySize(packageDir),
        JSON.stringify({
          platform: 'apple',
          packageId,
          metadata: appleMetadata
        })
      ]);

      return {
        success: true,
        platform: 'apple',
        packageUrl: `/api/uploads/ebook-exports/apple_${packageId}`,
        files: {
          epub: `${project.title.replace(/[^a-z0-9]/gi, '_')}.epub`,
          metadata: 'apple_metadata.xml'
        },
        metadata: appleMetadata,
        instructions: this.getAppleBooksInstructions()
      };
    } catch (error) {
      logger.error('Failed to prepare for Apple Books:', error);
      throw error;
    }
  }

  /**
   * Generate Apple Books metadata
   */
  async generateAppleMetadata(project, options = {}) {
    const {
      author = 'Author Name',
      publisher = 'Self-Published',
      isbn = null,
      language = 'en',
      categories = [],
      price = null
    } = options;

    return {
      title: project.title,
      author: author,
      publisher: publisher,
      isbn: isbn,
      language: language,
      categories: categories.length > 0 ? categories : [project.genre || 'Fiction'],
      description: project.description || '',
      price: price
    };
  }

  /**
   * Format Apple Books metadata as XML
   */
  formatAppleMetadata(metadata) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id">\n';
    xml += '  <metadata>\n';
    xml += `    <dc:title>${this.escapeXml(metadata.title)}</dc:title>\n`;
    xml += `    <dc:creator>${this.escapeXml(metadata.author)}</dc:creator>\n`;
    xml += `    <dc:publisher>${this.escapeXml(metadata.publisher)}</dc:publisher>\n`;
    if (metadata.isbn) {
      xml += `    <dc:identifier id="book-id">${this.escapeXml(metadata.isbn)}</dc:identifier>\n`;
    }
    xml += `    <dc:language>${metadata.language}</dc:language>\n`;
    xml += `    <dc:description>${this.escapeXml(metadata.description)}</dc:description>\n`;
    xml += '  </metadata>\n';
    xml += '</package>';
    return xml;
  }

  /**
   * Prepare eBook for Kobo
   */
  async prepareForKobo(projectId, userId, options = {}) {
    try {
      logger.info(`Preparing eBook ${projectId} for Kobo`);

      // Kobo also uses EPUB format
      const epubResult = await EBookExportService.exportToEpub(projectId, userId, {
        ...options,
        platform: 'kobo'
      });

      return {
        success: true,
        platform: 'kobo',
        fileUrl: epubResult.fileUrl,
        fileName: epubResult.fileName,
        instructions: this.getKoboInstructions()
      };
    } catch (error) {
      logger.error('Failed to prepare for Kobo:', error);
      throw error;
    }
  }

  /**
   * Get platform-specific instructions
   */
  getKindleInstructions() {
    return {
      steps: [
        '1. Log in to your Amazon KDP account (kdp.amazon.com)',
        '2. Click "Create a new Kindle eBook"',
        '3. Fill in your book details (title, author, description)',
        '4. Upload the EPUB file from the package',
        '5. Upload your cover image',
        '6. Set your pricing and territories',
        '7. Preview your book',
        '8. Publish your book'
      ],
      requirements: [
        'EPUB file (included in package)',
        'Cover image (minimum 1000x1600 pixels)',
        'Book description',
        'Author information',
        'Pricing information'
      ],
      links: [
        'https://kdp.amazon.com',
        'https://kdp.amazon.com/help/topic/G200672390'
      ]
    };
  }

  getAppleBooksInstructions() {
    return {
      steps: [
        '1. Log in to Apple Books Connect (booksconnect.apple.com)',
        '2. Create a new book entry',
        '3. Upload the EPUB file',
        '4. Upload your cover image',
        '5. Fill in metadata (title, author, description)',
        '6. Set pricing and availability',
        '7. Submit for review',
        '8. Once approved, your book will be available on Apple Books'
      ],
      requirements: [
        'EPUB file (included in package)',
        'Cover image (minimum 1400x1873 pixels)',
        'Book description',
        'Author information',
        'Pricing information'
      ],
      links: [
        'https://booksconnect.apple.com',
        'https://help.apple.com/itunes-connect/'
      ]
    };
  }

  getKoboInstructions() {
    return {
      steps: [
        '1. Log in to Kobo Writing Life (www.kobowritinglife.com)',
        '2. Click "Add New Title"',
        '3. Upload your EPUB file',
        '4. Upload your cover image',
        '5. Fill in book details',
        '6. Set pricing and distribution',
        '7. Submit for publishing'
      ],
      requirements: [
        'EPUB file',
        'Cover image',
        'Book description',
        'Author information'
      ],
      links: [
        'https://www.kobowritinglife.com',
        'https://www.kobowritinglife.com/help'
      ]
    };
  }

  /**
   * Extract keywords from project
   */
  extractKeywords(project) {
    const keywords = [];
    
    if (project.genre) {
      keywords.push(project.genre);
    }
    
    if (project.title) {
      const titleWords = project.title.toLowerCase().split(/\s+/);
      keywords.push(...titleWords.filter(w => w.length > 3));
    }
    
    return keywords.slice(0, 7); // Limit to 7 keywords
  }

  /**
   * Escape XML special characters
   */
  escapeXml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Get directory size recursively
   */
  getDirectorySize(dirPath) {
    let totalSize = 0;
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += this.getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  }
}

module.exports = new EBookPlatformService();

