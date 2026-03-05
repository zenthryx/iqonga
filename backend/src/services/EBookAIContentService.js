const AIContentService = require('./AIContentService');
const logger = require('../utils/logger');
const database = require('../database/connection');

/**
 * EBook AI Content Service
 * Handles AI generation of eBook chapters, outlines, and content
 */
class EBookAIContentService {
  constructor() {
    this.aiContentService = AIContentService;
  }

  /**
   * Generate chapter outline for an eBook project
   * @param {object} project - eBook project object
   * @param {number} numberOfChapters - Number of chapters to generate
   * @returns {Promise<Array>} Array of chapter objects with title and description
   */
  async generateChapterOutline(project, numberOfChapters) {
    try {
      const { title, description, genre, language = 'en', agent_id } = project;
      
      // Get agent if provided
      let agent = null;
      if (agent_id) {
        const agentResult = await database.query(
          'SELECT * FROM ai_agents WHERE id = $1',
          [agent_id]
        );
        if (agentResult.rows.length > 0) {
          agent = agentResult.rows[0];
        }
      }

      // Build prompt for outline generation
      const outlinePrompt = this._buildOutlinePrompt(
        title,
        description,
        genre,
        numberOfChapters,
        agent,
        language
      );

      // Generate outline using AI
      // Increase max_tokens for larger outlines (20 chapters need more space)
      const maxTokens = Math.max(2000, numberOfChapters * 150);
      const response = await this.aiContentService.generateWithOpenAI(outlinePrompt, {
        max_tokens: maxTokens,
        temperature: 0.8,
      });

      // Parse the response to extract chapter titles and descriptions
      const outline = this._parseOutlineResponse(response, numberOfChapters);

      logger.info(`Generated outline with ${outline.length} chapters for project ${project.id}`);
      return outline;
    } catch (error) {
      logger.error('Failed to generate chapter outline:', error);
      throw error;
    }
  }

  /**
   * Generate a single chapter content
   * @param {object} project - eBook project object
   * @param {number} chapterNumber - Chapter number
   * @param {string} chapterTitle - Chapter title from outline
   * @param {string} chapterDescription - Chapter description from outline
   * @param {Array} previousChapters - Previous chapters for context
   * @param {number} targetWordCount - Target word count for this chapter
   * @returns {Promise<string>} Generated chapter content
   */
  async generateChapterContent(
    project,
    chapterNumber,
    chapterTitle,
    chapterDescription,
    previousChapters = [],
    targetWordCount = 2000
  ) {
    try {
      const { title, description, genre, language = 'en', writing_style, agent_id } = project;

      // Get agent if provided
      let agent = null;
      if (agent_id) {
        const agentResult = await database.query(
          'SELECT * FROM ai_agents WHERE id = $1',
          [agent_id]
        );
        if (agentResult.rows.length > 0) {
          agent = agentResult.rows[0];
        }
      }

      // Build prompt for chapter generation
      const chapterPrompt = this._buildChapterPrompt(
        title,
        description,
        genre,
        chapterNumber,
        chapterTitle,
        chapterDescription,
        previousChapters,
        targetWordCount,
        writing_style,
        agent,
        language
      );

      // Generate chapter content
      const rawContent = await this.aiContentService.generateWithOpenAI(chapterPrompt, {
        max_tokens: Math.max(4000, Math.floor(targetWordCount * 1.5)), // Allow some buffer
        temperature: 0.7,
      });

      // Format content with proper paragraph breaks
      const formattedContent = this._formatChapterContent(rawContent.trim());

      logger.info(`Generated chapter ${chapterNumber} (${formattedContent.split(/\s+/).length} words) for project ${project.id}`);
      return formattedContent;
    } catch (error) {
      logger.error(`Failed to generate chapter ${chapterNumber}:`, error);
      throw error;
    }
  }

  /**
   * Generate all chapters for a project
   * @param {object} project - eBook project object
   * @param {Array} outline - Chapter outline
   * @param {Function} progressCallback - Optional callback for progress updates
   * @returns {Promise<Array>} Array of generated chapter objects
   */
  async generateAllChapters(project, outline, progressCallback = null) {
    try {
      const { target_word_count, word_count_type, number_of_chapters } = project;
      
      // Calculate target word count per chapter
      let targetWordCountPerChapter = 2000; // Default
      if (target_word_count) {
        if (word_count_type === 'total') {
          targetWordCountPerChapter = Math.floor(target_word_count / (number_of_chapters || outline.length));
        } else {
          targetWordCountPerChapter = target_word_count;
        }
      }

      const generatedChapters = [];
      const previousChapters = [];

      for (let i = 0; i < outline.length; i++) {
        const chapterInfo = outline[i];
        const chapterNumber = i + 1;

        // Update progress
        if (progressCallback) {
          progressCallback({
            chapter: chapterNumber,
            total: outline.length,
            status: 'generating',
            message: `Generating chapter ${chapterNumber}: ${chapterInfo.title}`
          });
        }

        // Generate chapter content
        const content = await this.generateChapterContent(
          project,
          chapterNumber,
          chapterInfo.title,
          chapterInfo.description,
          previousChapters,
          targetWordCountPerChapter
        );

        // Store chapter info for context in next chapters
        previousChapters.push({
          number: chapterNumber,
          title: chapterInfo.title,
          content: content.substring(0, 1000) // Store first 1000 chars for context
        });

        generatedChapters.push({
          chapterNumber,
          title: chapterInfo.title,
          content,
          wordCount: content.split(/\s+/).length
        });

        // Small delay between chapters to avoid rate limits
        if (i < outline.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info(`Generated ${generatedChapters.length} chapters for project ${project.id}`);
      return generatedChapters;
    } catch (error) {
      logger.error('Failed to generate all chapters:', error);
      throw error;
    }
  }

  /**
   * Build prompt for chapter outline generation
   */
  _buildOutlinePrompt(title, description, genre, numberOfChapters, agent, language = 'en') {
    let prompt = `You are an expert book editor and content strategist. Generate a detailed chapter outline for an eBook.

BOOK DETAILS:
Title: ${title}
${description ? `Description: ${description}` : ''}
${genre ? `Genre: ${genre}` : ''}
Number of Chapters: ${numberOfChapters}

`;

    if (agent) {
      const personalityPrompt = this.aiContentService.getPersonalityPrompt(agent.personality_type || 'custom');
      prompt += `WRITING STYLE (from AI Agent):
${personalityPrompt}
Voice Tone: ${agent.voice_tone || 'professional'}

`;
    }

    // Language mapping for AI prompts
    const languageNames = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'sw': 'Swahili',
      'rw': 'Kinyarwanda',
      'yo': 'Yoruba',
      'ig': 'Igbo',
      'ha': 'Hausa',
      'xh': 'Xhosa',
      'zu': 'Zulu'
    };
    
    const targetLanguage = languageNames[language] || 'English';

    prompt += `TASK:
Create a comprehensive chapter outline with ${numberOfChapters} chapters. For each chapter, provide:
1. A compelling chapter title
2. A brief description (2-3 sentences) of what the chapter will cover

The chapters should:
- Flow logically from one to the next
- Cover the topic comprehensively
- Build upon previous chapters
- Be engaging and well-structured

LANGUAGE REQUIREMENT:
- All chapter titles and descriptions must be in ${targetLanguage} (language code: ${language}).
- Maintain consistency with the selected language throughout the outline.

Format your response as a JSON array where each item has:
{
  "title": "Chapter Title",
  "description": "Chapter description here"
}

Return ONLY the JSON array, no additional text.`;

    return prompt;
  }

  /**
   * Build prompt for chapter content generation
   */
  _buildChapterPrompt(
    bookTitle,
    bookDescription,
    genre,
    chapterNumber,
    chapterTitle,
    chapterDescription,
    previousChapters,
    targetWordCount,
    writingStyle,
    agent,
    language = 'en'
  ) {
    let prompt = `You are a professional author writing an eBook chapter. Write a complete, engaging chapter for the following book.

BOOK INFORMATION:
Title: ${bookTitle}
${bookDescription ? `Description: ${bookDescription}` : ''}
${genre ? `Genre: ${genre}` : ''}

CHAPTER INFORMATION:
Chapter Number: ${chapterNumber}
Chapter Title: ${chapterTitle}
Chapter Description: ${chapterDescription}
Target Word Count: Approximately ${targetWordCount} words

`;

    // Add previous chapters context
    if (previousChapters.length > 0) {
      prompt += `PREVIOUS CHAPTERS (for context and continuity):\n`;
      previousChapters.forEach(ch => {
        prompt += `Chapter ${ch.number}: ${ch.title}\n${ch.content.substring(0, 500)}...\n\n`;
      });
    }

    // Add writing style
    if (writingStyle) {
      prompt += `WRITING STYLE: ${writingStyle}\n\n`;
    }

    // Add agent personality if available
    if (agent) {
      const personalityPrompt = this.aiContentService.getPersonalityPrompt(agent.personality_type || 'custom');
      prompt += `AUTHOR PERSONALITY (from AI Agent):\n${personalityPrompt}\nVoice Tone: ${agent.voice_tone || 'professional'}\n\n`;
    }

    // Language mapping for AI prompts
    const languageNames = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'sw': 'Swahili',
      'rw': 'Kinyarwanda',
      'yo': 'Yoruba',
      'ig': 'Igbo',
      'ha': 'Hausa',
      'xh': 'Xhosa',
      'zu': 'Zulu'
    };
    
    const targetLanguage = languageNames[language] || 'English';

    prompt += `TASK:
Write a complete, well-structured chapter that:
1. Has an engaging opening that hooks the reader
2. Covers all aspects mentioned in the chapter description
3. Maintains consistency with previous chapters (if any)
4. Is approximately ${targetWordCount} words long
5. Has a satisfying conclusion that transitions to the next chapter
6. Uses proper paragraph breaks - separate each paragraph with a blank line (double newline)
7. Uses subheadings (### for main sections, #### for subsections) where appropriate
8. Is written in a ${writingStyle || 'professional'} style

LANGUAGE REQUIREMENT:
- Write the entire chapter content in ${targetLanguage} (language code: ${language}).
- All text, dialogue, and narrative must be in ${targetLanguage}.
- Maintain consistency with the selected language throughout the chapter.
- Do not mix languages - use only ${targetLanguage} for all content.

IMPORTANT FORMATTING REQUIREMENTS:
- Use double line breaks (blank lines) to separate paragraphs
- Each paragraph should be 3-5 sentences long
- Use ### for main section headings
- Use #### for subsection headings
- Do not use HTML tags - use plain text with proper line breaks

Write the chapter content now. Do not include the chapter title or number in your response - just the chapter content.`;

    return prompt;
  }

  /**
   * Parse AI response to extract chapter outline
   */
  _parseOutlineResponse(response, expectedChapters) {
    try {
      // Try to parse as JSON first (robust)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        let jsonString = jsonMatch[0];
        // Remove trailing commas before } or ]
        jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
        // Trim anything before first '[' and after last ']'
        const firstBracket = jsonString.indexOf('[');
        const lastBracket = jsonString.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          jsonString = jsonString.slice(firstBracket, lastBracket + 1);
        }

        try {
          const parsed = JSON.parse(jsonString);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.slice(0, expectedChapters).map((item, index) => {
              // Extract title from various possible fields
              const title = item.title || item.chapter_title || item.name || `Chapter ${index + 1}`;
              // Extract description from various possible fields, with fallback
              const description = item.description || item.desc || item.summary || item.content || 
                                 (item.details ? String(item.details) : '') || 
                                 'To be determined';
              return {
                title: String(title).trim(),
                description: String(description).trim() || 'To be determined'
              };
            });
          }
        } catch (e) {
          logger.warn('Outline JSON parse fallback triggered:', e.message);
        }
      }

      // Fallback: Try to extract from numbered list or markdown-style list
      const lines = response.split('\n').filter(line => line.trim());
      const chapters = [];
      let currentChapter = null;
      
      for (let i = 0; i < lines.length && chapters.length < expectedChapters; i++) {
        const line = lines[i].trim();
        
        // Look for numbered items (1., 2., Chapter 1, etc.) or markdown headers
        const numberedMatch = line.match(/^(?:Chapter\s+)?(\d+)\.?\s+(.+)/i);
        const markdownMatch = line.match(/^#{1,3}\s+(.+)/);
        const dashMatch = line.match(/^[-*]\s+(.+)/);
        
        if (numberedMatch) {
          // Save previous chapter if exists
          if (currentChapter) {
            chapters.push(currentChapter);
            currentChapter = null;
          }
          const fullText = numberedMatch[2];
          const colonIndex = fullText.indexOf(':');
          if (colonIndex > 0) {
            const title = fullText.substring(0, colonIndex).trim();
            const description = fullText.substring(colonIndex + 1).trim();
            currentChapter = { title, description: description || 'To be determined' };
          } else {
            currentChapter = { title: fullText, description: 'To be determined' };
          }
        } else if (markdownMatch && currentChapter) {
          // Description might be on next line
          const desc = markdownMatch[1].trim();
          if (desc && !currentChapter.description) {
            currentChapter.description = desc;
          }
          chapters.push(currentChapter);
          currentChapter = null;
        } else if (dashMatch && !currentChapter) {
          // Bullet point format
          const fullText = dashMatch[1];
          const colonIndex = fullText.indexOf(':');
          if (colonIndex > 0) {
            const title = fullText.substring(0, colonIndex).trim();
            const description = fullText.substring(colonIndex + 1).trim();
            currentChapter = { title, description: description || 'To be determined' };
          } else {
            currentChapter = { title: fullText, description: 'To be determined' };
          }
        } else if (currentChapter && line.length > 10 && !line.match(/^[#\d\-*]/)) {
          // Multi-line description
          if (currentChapter.description === 'To be determined' || currentChapter.description.length < 20) {
            currentChapter.description = (currentChapter.description + ' ' + line).trim();
          }
        }
      }
      
      // Add last chapter if exists
      if (currentChapter) {
        chapters.push(currentChapter);
      }

      // If we still don't have enough, create placeholder chapters
      while (chapters.length < expectedChapters) {
        chapters.push({
          title: `Chapter ${chapters.length + 1}`,
          description: 'To be determined'
        });
      }

      return chapters.slice(0, expectedChapters);
    } catch (error) {
      logger.error('Failed to parse outline response:', error);
      // Return default outline
      return Array.from({ length: expectedChapters }, (_, i) => ({
        title: `Chapter ${i + 1}`,
        description: 'To be determined'
      }));
    }
  }

  /**
   * Format chapter content with proper HTML paragraph tags
   * Converts plain text with double line breaks to HTML paragraphs
   */
  _formatChapterContent(content) {
    if (!content) return '';

    // If content already has HTML tags, check if it needs formatting
    if (content.includes('<p>') || content.includes('<div>')) {
      // Already formatted, but ensure proper paragraph breaks
      return content.replace(/\n\s*\n/g, '</p><p>').replace(/<p>\s*<\/p>/g, '');
    }

    // Split by double newlines (paragraph breaks) or single newlines if no double breaks
    let paragraphs;
    if (content.includes('\n\n')) {
      paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
    } else {
      // If no double breaks, split by single newlines and group into paragraphs
      const lines = content.split('\n').filter(l => l.trim());
      paragraphs = [];
      let currentParagraph = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          if (currentParagraph.length > 0) {
            paragraphs.push(currentParagraph.join(' '));
            currentParagraph = [];
          }
        } else if (trimmed.startsWith('###')) {
          // Heading - finish current paragraph and add heading
          if (currentParagraph.length > 0) {
            paragraphs.push(currentParagraph.join(' '));
            currentParagraph = [];
          }
          paragraphs.push(trimmed);
        } else {
          currentParagraph.push(trimmed);
        }
      }
      
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '));
      }
    }

    // Convert each paragraph to HTML
    const formattedParagraphs = paragraphs.map(paragraph => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';

      // Check if it's a heading (starts with ### or ####)
      if (trimmed.startsWith('###')) {
        const level = trimmed.startsWith('####') ? 4 : 3;
        const text = trimmed.replace(/^#+\s*/, '').trim();
        return `<h${level}>${this._escapeHtml(text)}</h${level}>`;
      }

      // Regular paragraph - ensure it's properly escaped
      const paragraphText = this._escapeHtml(trimmed);
      
      // Wrap in paragraph tag
      return `<p>${paragraphText}</p>`;
    });

    return formattedParagraphs.join('\n');
  }

  /**
   * Escape HTML special characters
   */
  _escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

module.exports = EBookAIContentService;

