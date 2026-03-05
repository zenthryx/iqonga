const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const EBookProjectService = require('./EBookProjectService');

/**
 * EBook Export Service
 * Handles exporting eBooks to various formats (PDF, ePub, Flipbook HTML)
 * 
 * Note: Full implementation requires additional packages:
 * - pdfkit or puppeteer for PDF
 * - epub-gen for ePub
 * - Custom HTML/CSS/JS for Flipbook
 */
class EBookExportService {
  constructor() {
    // Ensure exports directory exists
    this.exportsDir = path.join(__dirname, '../../uploads/ebook-exports');
    if (!fs.existsSync(this.exportsDir)) {
      fs.mkdirSync(this.exportsDir, { recursive: true });
    }
  }

  /**
   * Export eBook to PDF
   * Note: This is a basic implementation. For production, use pdfkit or puppeteer
   */
  async exportToPDF(projectId, userId, options = {}) {
    try {
      logger.info(`Exporting eBook ${projectId} to PDF`);

      // Get project and chapters
      // Note: EBookProjectService methods are instance methods, not static
      const project = await EBookProjectService.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found');
      }

      const chapters = await EBookProjectService.getChapters(projectId, userId);

      const exportId = uuidv4();
      const fileName = `${project.title.replace(/[^a-z0-9]/gi, '_')}_${exportId}.pdf`;
      const filePath = path.join(this.exportsDir, fileName);

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        info: {
          Title: project.title,
          Author: options.author || 'Iqonga',
          Subject: project.description || '',
          Creator: 'Iqonga eBook Creator'
        }
      });

      // Pipe PDF to file
      doc.pipe(fs.createWriteStream(filePath));

      // Helper function to strip HTML tags and convert to plain text
      const stripHtml = (html) => {
        if (!html) return '';
        return html
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
      };

      // Cover page
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text(project.title, { align: 'center' });
      
      if (project.description) {
        doc.moveDown(2)
           .fontSize(14)
           .font('Helvetica')
           .text(stripHtml(project.description), { align: 'center', width: 400 });
      }

      // Add new page for table of contents
      doc.addPage()
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('Table of Contents', { align: 'center' })
         .moveDown();

      let tocPage = doc.page;
      const tocEntries = [];

      // Generate TOC entries
      chapters.forEach((chapter, index) => {
        const chapterTitle = chapter.title || `Chapter ${chapter.chapter_number}`;
        tocEntries.push({
          title: chapterTitle,
          page: tocPage + index + 1 // Approximate page number
        });
        
        doc.fontSize(12)
           .font('Helvetica')
           .text(`${chapter.chapter_number}. ${chapterTitle}`, { 
             continued: true,
             width: 400
           })
           .font('Helvetica')
           .text(`... ${tocPage + index + 1}`, { 
             align: 'right',
             width: 100
           })
           .moveDown(0.5);
      });

      // Add chapters
      chapters.forEach((chapter, index) => {
        doc.addPage();
        
        // Chapter header
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text(`Chapter ${chapter.chapter_number}`, { align: 'center' });
        
        if (chapter.title) {
          doc.moveDown(0.5)
             .fontSize(16)
             .font('Helvetica-Bold')
             .text(chapter.title, { align: 'center' });
        }

        doc.moveDown(1);

        // Chapter content
        const content = stripHtml(chapter.content);
        const lines = content.split('\n');
        
        doc.fontSize(12)
           .font('Helvetica')
           .text(content, {
             align: 'left',
             width: 450,
             lineGap: 4
           });

        // Add page numbers
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.fontSize(10)
             .font('Helvetica')
             .text(
               `Page ${i + 1}`,
               72,
               doc.page.height - 50,
               { align: 'center', width: 450 }
             );
        }
      });

      // Finalize PDF
      doc.end();

      // Wait for PDF to be written
      await new Promise((resolve, reject) => {
        doc.on('end', resolve);
        doc.on('error', reject);
      });

      const fileUrl = `/api/uploads/ebook-exports/${fileName}`;

      // Record export in database
      const database = require('../database/connection');
      await database.query(`
        INSERT INTO ebook_exports (id, project_id, user_id, export_format, file_url, file_size_bytes, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        uuidv4(),
        projectId,
        userId,
        'pdf',
        fileUrl,
        fs.statSync(filePath).size,
        JSON.stringify({ fileName, generatedAt: new Date().toISOString() })
      ]);

      logger.info(`PDF export created: ${filePath}`);

      return {
        success: true,
        fileUrl,
        fileName,
        filePath: filePath, // Include file path for Drive upload
        format: 'pdf',
        size: fs.statSync(filePath).size
      };
    } catch (error) {
      logger.error('Failed to export to PDF:', error);
      throw error;
    }
  }

  /**
   * Export eBook to ePub
   * Note: Requires epub-gen package
   */
  async exportToEpub(projectId, userId, options = {}) {
    try {
      logger.info(`Exporting eBook ${projectId} to ePub`);

      // Get project and chapters
      // Note: EBookProjectService methods are instance methods, not static
      const project = await EBookProjectService.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found');
      }

      const chapters = await EBookProjectService.getChapters(projectId, userId);

      // Check if epub-gen is available
      let epubGen;
      try {
        epubGen = require('epub-gen');
      } catch (e) {
        throw new Error('ePub export requires epub-gen package. Please install: npm install epub-gen');
      }

      // Helper function to strip HTML tags and convert to plain text
      const stripHtml = (html) => {
        if (!html) return '';
        return html
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
      };

      // Prepare ePub content
      const epubContent = {
        title: project.title,
        author: options.author || 'Iqonga',
        publisher: options.publisher || 'Self-Published',
        description: project.description || '',
        cover: project.cover_image_url || undefined,
        lang: project.language || 'en',
        tocTitle: 'Table of Contents',
        content: chapters.map(chapter => {
          const chapterTitle = chapter.title || `Chapter ${chapter.chapter_number}`;
          const chapterContent = stripHtml(chapter.content);
          
          return {
            title: chapterTitle,
            data: `<h1>${chapterTitle}</h1>\n\n${chapterContent.replace(/\n/g, '<br/>')}`
          };
        })
      };

      const exportId = uuidv4();
      const fileName = `${project.title.replace(/[^a-z0-9]/gi, '_')}_${exportId}.epub`;
      const filePath = path.join(this.exportsDir, fileName);

      // Generate ePub
      await new Promise((resolve, reject) => {
        new epubGen(epubContent, filePath)
          .promise
          .then(() => {
            logger.info(`ePub generated successfully: ${filePath}`);
            resolve();
          })
          .catch((error) => {
            logger.error('ePub generation failed:', error);
            reject(error);
          });
      });

      const fileUrl = `/api/uploads/ebook-exports/${fileName}`;

      // Record export in database
      const database = require('../database/connection');
      await database.query(`
        INSERT INTO ebook_exports (id, project_id, user_id, export_format, file_url, file_size_bytes, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        uuidv4(),
        projectId,
        userId,
        'epub',
        fileUrl,
        fs.statSync(filePath).size,
        JSON.stringify({ fileName, generatedAt: new Date().toISOString() })
      ]);

      logger.info(`ePub export created: ${filePath}`);

      return {
        success: true,
        fileUrl,
        fileName,
        filePath: filePath, // Include file path for Drive upload
        format: 'epub',
        size: fs.statSync(filePath).size
      };
    } catch (error) {
      logger.error('Failed to export to ePub:', error);
      throw error;
    }
  }

  /**
   * Export eBook to Flipbook HTML
   * Creates an interactive HTML flipbook
   */
  async exportToFlipbook(projectId, userId, options = {}) {
    try {
      logger.info(`Exporting eBook ${projectId} to Flipbook HTML`);

      // Get project and chapters
      // Note: EBookProjectService methods are instance methods, not static
      const project = await EBookProjectService.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found');
      }

      const chapters = await EBookProjectService.getChapters(projectId, userId);

      const exportId = uuidv4();
      const fileName = `${project.title.replace(/[^a-z0-9]/gi, '_')}_${exportId}`;
      const fileDir = path.join(this.exportsDir, fileName);
      
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      // Generate HTML flipbook
      const htmlContent = this.generateFlipbookHTML(project, chapters);
      const htmlPath = path.join(fileDir, 'index.html');
      fs.writeFileSync(htmlPath, htmlContent);

      // Generate CSS
      const cssContent = this.generateFlipbookCSS();
      const cssPath = path.join(fileDir, 'style.css');
      fs.writeFileSync(cssPath, cssContent);

      // Generate JavaScript
      const jsContent = this.generateFlipbookJS();
      const jsPath = path.join(fileDir, 'script.js');
      fs.writeFileSync(jsPath, jsContent);

      const fileUrl = `/api/uploads/ebook-exports/${fileName}/index.html`;

      // Record export in database
      const database = require('../database/connection');
      await database.query(`
        INSERT INTO ebook_exports (id, project_id, user_id, export_format, file_url, file_size_bytes, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        uuidv4(),
        projectId,
        userId,
        'flipbook',
        fileUrl,
        this.getDirectorySize(fileDir),
        JSON.stringify({ fileName, generatedAt: new Date().toISOString() })
      ]);

      logger.info(`Flipbook export created: ${fileDir}`);

      return {
        success: true,
        fileUrl,
        fileName: `${fileName}/index.html`,
        filePath: htmlPath, // Include HTML file path for Drive upload
        fileDir: fileDir, // Include directory for potential zip upload
        format: 'flipbook',
        embedCode: `<iframe src="${fileUrl}" width="100%" height="600px" frameborder="0"></iframe>`
      };
    } catch (error) {
      logger.error('Failed to export to Flipbook:', error);
      throw error;
    }
  }

  /**
   * Generate Flipbook HTML
   */
  generateFlipbookHTML(project, chapters) {
    const pages = chapters.map((chapter, index) => {
      const pageNumber = index + 1;
      return `
        <div class="page" data-page="${pageNumber}">
          <div class="page-content">
            <h2 class="chapter-title">${chapter.title || `Chapter ${chapter.chapter_number}`}</h2>
            <div class="chapter-content">${this.formatContentForHTML(chapter.content)}</div>
          </div>
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="flipbook-container">
    <div class="flipbook" id="flipbook">
      ${pages}
    </div>
    <div class="controls">
      <button id="prevBtn" class="control-btn">Previous</button>
      <span id="pageInfo">Page <span id="currentPage">1</span> of <span id="totalPages">${chapters.length}</span></span>
      <button id="nextBtn" class="control-btn">Next</button>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>`;
  }

  /**
   * Format content for HTML display
   */
  formatContentForHTML(content) {
    // Convert newlines to paragraphs
    return content
      .split('\n\n')
      .filter(p => p.trim())
      .map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  /**
   * Generate Flipbook CSS
   */
  generateFlipbookCSS() {
    return `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Georgia', serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.flipbook-container {
  background: white;
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  max-width: 900px;
  width: 100%;
  overflow: hidden;
}

.flipbook {
  position: relative;
  min-height: 600px;
  padding: 40px;
}

.page {
  display: none;
  animation: fadeIn 0.5s;
}

.page.active {
  display: block;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.chapter-title {
  font-size: 2em;
  margin-bottom: 30px;
  color: #333;
  border-bottom: 3px solid #667eea;
  padding-bottom: 10px;
}

.chapter-content {
  font-size: 1.1em;
  line-height: 1.8;
  color: #444;
}

.chapter-content p {
  margin-bottom: 1.5em;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background: #f5f5f5;
  border-top: 1px solid #ddd;
}

.control-btn {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition: background 0.3s;
}

.control-btn:hover {
  background: #5568d3;
}

.control-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

#pageInfo {
  font-weight: bold;
  color: #333;
}

@media (max-width: 768px) {
  .flipbook {
    padding: 20px;
    min-height: 400px;
  }
  
  .chapter-title {
    font-size: 1.5em;
  }
  
  .chapter-content {
    font-size: 1em;
  }
}
    `;
  }

  /**
   * Generate Flipbook JavaScript
   */
  generateFlipbookJS() {
    return `
let currentPage = 1;
const pages = document.querySelectorAll('.page');
const totalPages = pages.length;

function showPage(pageNum) {
  pages.forEach((page, index) => {
    if (index + 1 === pageNum) {
      page.classList.add('active');
    } else {
      page.classList.remove('active');
    }
  });
  
  document.getElementById('currentPage').textContent = pageNum;
  document.getElementById('totalPages').textContent = totalPages;
  
  document.getElementById('prevBtn').disabled = pageNum === 1;
  document.getElementById('nextBtn').disabled = pageNum === totalPages;
}

document.getElementById('prevBtn').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    showPage(currentPage);
  }
});

document.getElementById('nextBtn').addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    showPage(currentPage);
  }
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' && currentPage > 1) {
    currentPage--;
    showPage(currentPage);
  } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
    currentPage++;
    showPage(currentPage);
  }
});

// Initialize
showPage(1);
    `;
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

module.exports = new EBookExportService();

