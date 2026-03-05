const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * EBook Project Service
 * Manages eBook projects, chapters, and related operations
 */
class EBookProjectService {
  /**
   * Create a new eBook project
   */
  async createProject(userId, projectData) {
    try {
      const {
        title,
        description,
        genre,
        language = 'en',
        agentId = null,
        templateId = null,
        coverImageUrl = null,
        numberOfChapters = null,
        targetWordCount = null,
        wordCountType = 'per_chapter',
        writingStyle = null,
        autoGenerateChapters = false
      } = projectData;

      if (!title || !title.trim()) {
        throw new Error('Project title is required');
      }

      // Generate unique share token
      const shareToken = crypto.randomBytes(32).toString('hex');

      const projectId = uuidv4();
      const result = await database.query(`
        INSERT INTO ebook_projects (
          id, user_id, agent_id, title, description, genre, language,
          cover_image_url, template_id, share_token, status, visibility,
          number_of_chapters, target_word_count, word_count_type, writing_style,
          auto_generate_chapters, generation_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `, [
        projectId,
        userId,
        agentId,
        title.trim(),
        description?.trim() || null,
        genre || null,
        language,
        coverImageUrl || null,
        templateId || null,
        shareToken,
        'draft',
        'private',
        numberOfChapters || null,
        targetWordCount || null,
        wordCountType || 'per_chapter',
        writingStyle || null,
        autoGenerateChapters || false,
        'not_started'
      ]);

      const project = result.rows[0];

      // Auto-generate chapters if requested
      if (autoGenerateChapters && numberOfChapters && numberOfChapters > 0) {
        // This will be handled asynchronously via the generation endpoint
        // We just mark it as ready for generation
        logger.info(`Project ${projectId} marked for auto-generation of ${numberOfChapters} chapters`);
      }

      logger.info(`Created eBook project: ${projectId} for user ${userId}`);
      return project;
    } catch (error) {
      logger.error('Failed to create eBook project:', error);
      throw error;
    }
  }

  /**
   * Get project by ID
   */
  async getProject(projectId, userId) {
    try {
      const result = await database.query(`
        SELECT 
          p.*,
          COUNT(c.id) as chapter_count,
          SUM(c.word_count) as total_word_count
        FROM ebook_projects p
        LEFT JOIN ebook_chapters c ON c.project_id = p.id
        WHERE p.id = $1 AND p.user_id = $2
        GROUP BY p.id
      `, [projectId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const project = result.rows[0];
      project.chapter_count = parseInt(project.chapter_count) || 0;
      project.total_word_count = parseInt(project.total_word_count) || 0;
      
      // Parse chapter_outline if it's a string
      if (project.chapter_outline && typeof project.chapter_outline === 'string') {
        try {
          project.chapter_outline = JSON.parse(project.chapter_outline);
        } catch (e) {
          project.chapter_outline = null;
        }
      }

      return project;
    } catch (error) {
      logger.error('Failed to get eBook project:', error);
      throw error;
    }
  }

  /**
   * Get project by share token (for public sharing)
   */
  async getProjectByShareToken(shareToken) {
    try {
      const result = await database.query(`
        SELECT 
          p.*,
          COUNT(c.id) as chapter_count,
          SUM(c.word_count) as total_word_count
        FROM ebook_projects p
        LEFT JOIN ebook_chapters c ON c.project_id = p.id
        WHERE p.share_token = $1 AND p.visibility IN ('public', 'unlisted')
        GROUP BY p.id
      `, [shareToken]);

      if (result.rows.length === 0) {
        return null;
      }

      const project = result.rows[0];
      project.chapter_count = parseInt(project.chapter_count) || 0;
      project.total_word_count = parseInt(project.total_word_count) || 0;
      
      // Parse chapter_outline if it's a string
      if (project.chapter_outline && typeof project.chapter_outline === 'string') {
        try {
          project.chapter_outline = JSON.parse(project.chapter_outline);
        } catch (e) {
          project.chapter_outline = null;
        }
      }

      return project;
    } catch (error) {
      logger.error('Failed to get eBook project by share token:', error);
      throw error;
    }
  }

  /**
   * List user's projects
   */
  async listProjects(userId, options = {}) {
    try {
      const {
        status = null,
        genre = null,
        search = null,
        page = 1,
        limit = 20
      } = options;

      let query = `
        SELECT 
          p.*,
          COUNT(c.id) as chapter_count,
          SUM(c.word_count) as total_word_count
        FROM ebook_projects p
        LEFT JOIN ebook_chapters c ON c.project_id = p.id
        WHERE p.user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (status) {
        query += ` AND p.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (genre) {
        query += ` AND p.genre = $${paramIndex}`;
        params.push(genre);
        paramIndex++;
      }

      if (search) {
        query += ` AND (p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      query += ` GROUP BY p.id ORDER BY p.updated_at DESC`;

      // Add pagination
      const offset = (page - 1) * limit;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await database.query(query, params);

      // Get total count for pagination
      let countQuery = `SELECT COUNT(*) as total FROM ebook_projects WHERE user_id = $1`;
      const countParams = [userId];
      let countParamIndex = 2;

      if (status) {
        countQuery += ` AND status = $${countParamIndex}`;
        countParams.push(status);
        countParamIndex++;
      }

      if (genre) {
        countQuery += ` AND genre = $${countParamIndex}`;
        countParams.push(genre);
        countParamIndex++;
      }

      if (search) {
        countQuery += ` AND (title ILIKE $${countParamIndex} OR description ILIKE $${countParamIndex})`;
        countParams.push(`%${search}%`);
        countParamIndex++;
      }

      const countResult = await database.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      const projects = result.rows.map(project => ({
        ...project,
        chapter_count: parseInt(project.chapter_count) || 0,
        total_word_count: parseInt(project.total_word_count) || 0
      }));

      return {
        projects,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to list eBook projects:', error);
      throw error;
    }
  }

  /**
   * Update project
   */
  async updateProject(projectId, userId, updates) {
    try {
      const allowedFields = [
        'title', 'description', 'genre', 'language', 'cover_image_url',
        'template_id', 'status', 'visibility', 'metadata'
      ];

      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      // Handle regenerateShareToken special case
      if (updates.regenerateShareToken === true) {
        const crypto = require('crypto');
        const newToken = crypto.randomBytes(32).toString('hex');
        updateFields.push(`share_token = $${paramIndex}`);
        values.push(newToken);
        paramIndex++;
      }

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined && key !== 'regenerateShareToken') {
          if (key === 'metadata' && typeof value === 'object') {
            updateFields.push(`${key} = $${paramIndex}`);
            values.push(JSON.stringify(value));
          } else {
            updateFields.push(`${key} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(projectId, userId);
      const result = await database.query(`
        UPDATE ebook_projects
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        throw new Error('Project not found or access denied');
      }

      logger.info(`Updated eBook project: ${projectId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update eBook project:', error);
      throw error;
    }
  }

  /**
   * Delete project
   */
  async deleteProject(projectId, userId) {
    try {
      const result = await database.query(`
        DELETE FROM ebook_projects
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `, [projectId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Project not found or access denied');
      }

      logger.info(`Deleted eBook project: ${projectId}`);
      return { success: true, id: projectId };
    } catch (error) {
      logger.error('Failed to delete eBook project:', error);
      throw error;
    }
  }

  /**
   * Clone project
   */
  async cloneProject(projectId, userId, newTitle = null) {
    try {
      // Get original project
      const original = await this.getProject(projectId, userId);
      if (!original) {
        throw new Error('Project not found or access denied');
      }

      // Create new project
      const newProject = await this.createProject(userId, {
        title: newTitle || `${original.title} (Copy)`,
        description: original.description,
        genre: original.genre,
        language: original.language,
        agentId: original.agent_id,
        templateId: original.template_id,
        coverImageUrl: original.cover_image_url
      });

      // Clone all chapters
      const chapters = await this.getChapters(projectId, userId);
      for (const chapter of chapters) {
        await this.createChapter(newProject.id, userId, {
          title: chapter.title,
          content: chapter.content,
          chapterNumber: chapter.chapter_number,
          orderIndex: chapter.order_index
        });
      }

      logger.info(`Cloned eBook project: ${projectId} -> ${newProject.id}`);
      return newProject;
    } catch (error) {
      logger.error('Failed to clone eBook project:', error);
      throw error;
    }
  }

  /**
   * Create a new chapter
   */
  async createChapter(projectId, userId, chapterData) {
    try {
      const {
        title,
        content,
        chapterNumber = null,
        orderIndex = null
      } = chapterData;

      if (!content || !content.trim()) {
        throw new Error('Chapter content is required');
      }

      // Verify project belongs to user
      const project = await this.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found or access denied');
      }

      // Calculate word count
      const wordCount = content.trim().split(/\s+/).length;

      // Determine chapter number and order index
      let finalChapterNumber = chapterNumber;
      let finalOrderIndex = orderIndex;

      if (finalChapterNumber === null || finalOrderIndex === null) {
        // Get the highest chapter number and order index
        const maxResult = await database.query(`
          SELECT 
            COALESCE(MAX(chapter_number), 0) as max_chapter,
            COALESCE(MAX(order_index), 0) as max_order
          FROM ebook_chapters
          WHERE project_id = $1
        `, [projectId]);

        const maxChapter = parseInt(maxResult.rows[0].max_chapter) || 0;
        const maxOrder = parseInt(maxResult.rows[0].max_order) || 0;

        if (finalChapterNumber === null) {
          finalChapterNumber = maxChapter + 1;
        }
        if (finalOrderIndex === null) {
          finalOrderIndex = maxOrder + 1;
        }
      }

      const chapterId = uuidv4();
      const result = await database.query(`
        INSERT INTO ebook_chapters (
          id, project_id, chapter_number, title, content, word_count, order_index
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        chapterId,
        projectId,
        finalChapterNumber,
        title?.trim() || null,
        content.trim(),
        wordCount,
        finalOrderIndex
      ]);

      // Update project status if needed
      if (project.status === 'draft' && finalChapterNumber === 1) {
        await this.updateProject(projectId, userId, { status: 'in_progress' });
      }

      logger.info(`Created chapter ${finalChapterNumber} for project ${projectId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create chapter:', error);
      throw error;
    }
  }

  /**
   * Get chapters for a project
   */
  async getChapters(projectId, userId) {
    try {
      // If userId is null, this is a public share request - skip ownership check
      if (userId !== null && userId !== undefined) {
        // Verify project belongs to user
        const project = await this.getProject(projectId, userId);
        if (!project) {
          throw new Error('Project not found or access denied');
        }
      } else {
        // For public shares, just verify project exists
        const result = await database.query(
          `SELECT id FROM ebook_projects WHERE id = $1`,
          [projectId]
        );
        if (result.rows.length === 0) {
          throw new Error('Project not found');
        }
      }

      const result = await database.query(`
        SELECT *
        FROM ebook_chapters
        WHERE project_id = $1
        ORDER BY order_index ASC, chapter_number ASC
      `, [projectId]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get chapters:', error);
      throw error;
    }
  }

  /**
   * Get a single chapter
   */
  async getChapter(chapterId, userId) {
    try {
      const result = await database.query(`
        SELECT c.*
        FROM ebook_chapters c
        JOIN ebook_projects p ON p.id = c.project_id
        WHERE c.id = $1 AND p.user_id = $2
      `, [chapterId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get chapter:', error);
      throw error;
    }
  }

  /**
   * Update chapter
   */
  async updateChapter(chapterId, userId, updates) {
    try {
      const allowedFields = ['title', 'content', 'chapter_number', 'order_index', 'page_template'];
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      // Handle template_config separately (JSONB field)
      if (updates.template_config !== undefined) {
        updateFields.push(`template_config = $${paramIndex}`);
        values.push(JSON.stringify(updates.template_config));
        paramIndex++;
      }

      // Recalculate word count if content changed
      if (updates.content) {
        const wordCount = updates.content.trim().split(/\s+/).length;
        updateFields.push(`word_count = $${paramIndex}`);
        values.push(wordCount);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(chapterId, userId);
      const result = await database.query(`
        UPDATE ebook_chapters c
        SET ${updateFields.join(', ')}, updated_at = NOW()
        FROM ebook_projects p
        WHERE c.project_id = p.id AND c.id = $${paramIndex} AND p.user_id = $${paramIndex + 1}
        RETURNING c.*
      `, values);

      if (result.rows.length === 0) {
        throw new Error('Chapter not found or access denied');
      }

      logger.info(`Updated chapter: ${chapterId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update chapter:', error);
      throw error;
    }
  }

  /**
   * Delete chapter
   */
  async deleteChapter(chapterId, userId) {
    try {
      const result = await database.query(`
        DELETE FROM ebook_chapters c
        USING ebook_projects p
        WHERE c.project_id = p.id AND c.id = $1 AND p.user_id = $2
        RETURNING c.id, c.project_id
      `, [chapterId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Chapter not found or access denied');
      }

      logger.info(`Deleted chapter: ${chapterId}`);
      return { success: true, id: chapterId };
    } catch (error) {
      logger.error('Failed to delete chapter:', error);
      throw error;
    }
  }

  /**
   * Reorder chapters
   */
  async reorderChapters(projectId, userId, chapterOrders) {
    try {
      // Verify project belongs to user
      const project = await this.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found or access denied');
      }

      // Update each chapter's order_index
      for (const { chapterId, orderIndex } of chapterOrders) {
        await database.query(`
          UPDATE ebook_chapters
          SET order_index = $1, updated_at = NOW()
          WHERE id = $2 AND project_id = $3
        `, [orderIndex, chapterId, projectId]);
      }

      logger.info(`Reordered chapters for project: ${projectId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to reorder chapters:', error);
      throw error;
    }
  }
}

module.exports = new EBookProjectService();

