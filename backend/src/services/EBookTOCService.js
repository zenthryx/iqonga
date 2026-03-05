const logger = require('../utils/logger');
const EBookProjectService = require('./EBookProjectService');

/**
 * EBook Table of Contents Service
 * Generates table of contents and handles page numbering
 */
class EBookTOCService {
  /**
   * Generate table of contents from chapters
   */
  async generateTOC(projectId, userId, options = {}) {
    try {
      logger.info(`Generating TOC for project ${projectId}`);

      // Get project and chapters
      const project = await EBookProjectService.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found');
      }

      const chapters = await EBookProjectService.getChapters(projectId, userId);
      
      if (!chapters || chapters.length === 0) {
        throw new Error('Project has no chapters');
      }

      // Sort chapters by order_index
      const sortedChapters = chapters.sort((a, b) => a.order_index - b.order_index);

      // Generate TOC structure
      const toc = {
        title: 'Table of Contents',
        items: sortedChapters.map((chapter, index) => ({
          chapterNumber: chapter.chapter_number,
          title: chapter.title || `Chapter ${chapter.chapter_number}`,
          pageNumber: this.calculatePageNumber(chapters, index, options),
          chapterId: chapter.id,
          wordCount: chapter.word_count || 0
        })),
        totalChapters: sortedChapters.length,
        totalPages: this.calculateTotalPages(chapters, options),
        generatedAt: new Date().toISOString()
      };

      return {
        success: true,
        toc: toc
      };
    } catch (error) {
      logger.error('Failed to generate TOC:', error);
      throw error;
    }
  }

  /**
   * Calculate page number for a chapter
   */
  calculatePageNumber(chapters, chapterIndex, options = {}) {
    const {
      wordsPerPage = 250, // Average words per page
      startPage = 1, // Starting page number
      includeFrontMatter = true
    } = options;

    let currentPage = startPage;

    // Add front matter pages (title, copyright, dedication, etc.)
    if (includeFrontMatter) {
      currentPage += 3; // Title page, copyright, dedication
    }

    // Calculate pages for previous chapters
    for (let i = 0; i < chapterIndex; i++) {
      const chapter = chapters[i];
      const chapterWords = chapter.word_count || 0;
      const chapterPages = Math.ceil(chapterWords / wordsPerPage);
      currentPage += chapterPages;
    }

    return currentPage;
  }

  /**
   * Calculate total pages for the book
   */
  calculateTotalPages(chapters, options = {}) {
    const {
      wordsPerPage = 250,
      includeFrontMatter = true,
      includeBackMatter = true
    } = options;

    let totalPages = 0;

    // Front matter
    if (includeFrontMatter) {
      totalPages += 3;
    }

    // Chapter pages
    const totalWords = chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);
    totalPages += Math.ceil(totalWords / wordsPerPage);

    // Back matter (index, bibliography, etc.)
    if (includeBackMatter) {
      totalPages += 2;
    }

    return totalPages;
  }

  /**
   * Generate TOC HTML
   */
  generateTOCHTML(toc, options = {}) {
    const {
      includePageNumbers = true,
      style = 'default'
    } = options;

    let html = '<div class="table-of-contents">';
    html += `<h1 class="toc-title">${toc.title}</h1>`;
    html += '<ul class="toc-list">';

    toc.items.forEach(item => {
      html += '<li class="toc-item">';
      html += `<a href="#chapter-${item.chapterNumber}" class="toc-link">`;
      html += `<span class="toc-chapter-number">${item.chapterNumber}.</span> `;
      html += `<span class="toc-chapter-title">${item.title}</span>`;
      
      if (includePageNumbers) {
        html += `<span class="toc-page-number">${item.pageNumber}</span>`;
      }
      
      html += '</a>';
      html += '</li>';
    });

    html += '</ul>';
    html += '</div>';

    return html;
  }

  /**
   * Generate TOC Markdown
   */
  generateTOCMarkdown(toc, options = {}) {
    const {
      includePageNumbers = true
    } = options;

    let markdown = `# ${toc.title}\n\n`;

    toc.items.forEach(item => {
      markdown += `${item.chapterNumber}. [${item.title}](#chapter-${item.chapterNumber})`;
      
      if (includePageNumbers) {
        markdown += ` - Page ${item.pageNumber}`;
      }
      
      markdown += '\n';
    });

    return markdown;
  }

  /**
   * Add page numbers to chapter content
   */
  addPageNumbersToChapter(chapter, pageNumber, options = {}) {
    const {
      wordsPerPage = 250,
      pageNumberFormat = 'bottom-center', // top-left, top-right, bottom-left, bottom-center, bottom-right
      showPageNumbers = true
    } = options;

    if (!showPageNumbers) {
      return chapter.content;
    }

    // Calculate number of pages for this chapter
    const chapterWords = chapter.word_count || 0;
    const chapterPages = Math.ceil(chapterWords / wordsPerPage);

    // For now, return content with page break markers
    // Full implementation would insert page numbers at appropriate positions
    let content = chapter.content;

    // Add page break markers every ~wordsPerPage words
    const words = content.split(/\s+/);
    const pageBreaks = [];
    
    for (let i = 0; i < words.length; i += wordsPerPage) {
      pageBreaks.push(i);
    }

    // Insert page numbers (simplified - full implementation would format properly)
    let result = '';
    let currentPage = pageNumber;
    
    for (let i = 0; i < words.length; i++) {
      if (pageBreaks.includes(i) && i > 0) {
        result += `\n\n--- Page ${currentPage} ---\n\n`;
        currentPage++;
      }
      result += words[i] + ' ';
    }

    return result;
  }

  /**
   * Generate full book with TOC and page numbers
   */
  async generateFullBook(projectId, userId, options = {}) {
    try {
      // Generate TOC
      const tocResult = await this.generateTOC(projectId, userId, options);
      const toc = tocResult.toc;

      // Get chapters
      const chapters = await EBookProjectService.getChapters(projectId, userId);
      const sortedChapters = chapters.sort((a, b) => a.order_index - b.order_index);

      // Build full book content
      const bookContent = {
        title: (await EBookProjectService.getProject(projectId, userId)).title,
        toc: toc,
        chapters: sortedChapters.map((chapter, index) => {
          const pageNumber = this.calculatePageNumber(sortedChapters, index, options);
          return {
            ...chapter,
            pageNumber: pageNumber,
            contentWithPageNumbers: this.addPageNumbersToChapter(chapter, pageNumber, options)
          };
        }),
        totalPages: toc.totalPages,
        metadata: {
          generatedAt: new Date().toISOString(),
          options: options
        }
      };

      return {
        success: true,
        book: bookContent
      };
    } catch (error) {
      logger.error('Failed to generate full book:', error);
      throw error;
    }
  }
}

module.exports = new EBookTOCService();

