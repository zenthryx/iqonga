const database = require('../database/connection');
const logger = require('../utils/logger');
const ImageManipulationService = require('./ImageManipulationService');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

/**
 * Template Ad Service
 * Handles template-based ad generation (no LLM for images)
 * Similar to Figma plugin approach - uses templates + text overlay
 */
class TemplateAdService {
  /**
   * Create a new ad design template
   */
  async createTemplate(userId, templateData) {
    try {
      const {
        name,
        description,
        category,
        tags = [],
        backgroundImageUrl,
        backgroundImagePath,
        backgroundColor,
        layoutConfig,
        platforms = [],
        aspectRatios = ['1:1'],
        defaultDimensions
      } = templateData;
      
      if (!name || !backgroundImageUrl || !layoutConfig) {
        throw new Error('Name, background image URL, and layout config are required');
      }
      
      const templateId = uuidv4();
      
      await database.query(`
        INSERT INTO ad_design_templates (
          id, user_id, name, description, category, tags,
          background_image_url, background_image_path, background_color,
          layout_config, platforms, aspect_ratios, default_dimensions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        templateId,
        userId,
        name,
        description,
        category,
        tags,
        backgroundImageUrl,
        backgroundImagePath,
        backgroundColor,
        JSON.stringify(layoutConfig),
        JSON.stringify(platforms),
        JSON.stringify(aspectRatios),
        defaultDimensions ? JSON.stringify(defaultDimensions) : null
      ]);
      
      logger.info(`Created ad template: ${templateId} by user ${userId}`);
      
      return await this.getTemplateById(templateId, userId);
    } catch (error) {
      logger.error('Failed to create template:', error);
      throw error;
    }
  }
  
  /**
   * Get template by ID
   */
  async getTemplateById(templateId, userId) {
    try {
      const result = await database.query(`
        SELECT * FROM ad_design_templates
        WHERE id = $1 AND (user_id = $2 OR is_public = TRUE OR is_system_template = TRUE)
      `, [templateId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const template = result.rows[0];
      
      // Parse JSON fields
      template.layout_config = typeof template.layout_config === 'string' 
        ? JSON.parse(template.layout_config) 
        : template.layout_config;
      template.platforms = typeof template.platforms === 'string'
        ? JSON.parse(template.platforms)
        : template.platforms;
      template.aspect_ratios = typeof template.aspect_ratios === 'string'
        ? JSON.parse(template.aspect_ratios)
        : template.aspect_ratios;
      template.default_dimensions = template.default_dimensions && typeof template.default_dimensions === 'string'
        ? JSON.parse(template.default_dimensions)
        : template.default_dimensions;
      template.tags = template.tags || [];
      
      return template;
    } catch (error) {
      logger.error('Failed to get template:', error);
      throw error;
    }
  }
  
  /**
   * List templates for user
   */
  async listTemplates(userId, options = {}) {
    try {
      const { category, platform, search, includePublic = true } = options;
      
      let query = `
        SELECT * FROM ad_design_templates
        WHERE (user_id = $1 ${includePublic ? 'OR is_public = TRUE OR is_system_template = TRUE' : ''})
      `;
      const params = [userId];
      let paramIndex = 2;
      
      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }
      
      if (platform) {
        query += ` AND platforms @> $${paramIndex}::jsonb`;
        params.push(JSON.stringify([platform]));
        paramIndex++;
      }
      
      if (search) {
        query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }
      
      query += ` ORDER BY is_system_template DESC, created_at DESC`;
      
      const result = await database.query(query, params);
      
      // Parse JSON fields
      return result.rows.map(template => ({
        ...template,
        layout_config: typeof template.layout_config === 'string' 
          ? JSON.parse(template.layout_config) 
          : template.layout_config,
        platforms: typeof template.platforms === 'string'
          ? JSON.parse(template.platforms)
          : template.platforms,
        aspect_ratios: typeof template.aspect_ratios === 'string'
          ? JSON.parse(template.aspect_ratios)
          : template.aspect_ratios,
        default_dimensions: template.default_dimensions && typeof template.default_dimensions === 'string'
          ? JSON.parse(template.default_dimensions)
          : template.default_dimensions,
        tags: template.tags || []
      }));
    } catch (error) {
      logger.error('Failed to list templates:', error);
      throw error;
    }
  }
  
  /**
   * Update template
   */
  async updateTemplate(templateId, userId, updates) {
    try {
      const allowedFields = [
        'name', 'description', 'category', 'tags', 'background_image_url',
        'background_image_path', 'background_color', 'layout_config',
        'platforms', 'aspect_ratios', 'default_dimensions', 'is_public'
      ];
      
      const updateFields = [];
      const params = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          if (['layout_config', 'platforms', 'aspect_ratios', 'default_dimensions'].includes(key)) {
            updateFields.push(`${key} = $${paramIndex}::jsonb`);
            params.push(JSON.stringify(value));
          } else if (key === 'tags') {
            updateFields.push(`${key} = $${paramIndex}::text[]`);
            params.push(value);
          } else {
            updateFields.push(`${key} = $${paramIndex}`);
            params.push(value);
          }
          paramIndex++;
        }
      }
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      params.push(templateId, userId);
      
      await database.query(`
        UPDATE ad_design_templates
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      `, params);
      
      return await this.getTemplateById(templateId, userId);
    } catch (error) {
      logger.error('Failed to update template:', error);
      throw error;
    }
  }
  
  /**
   * Delete template
   */
  async deleteTemplate(templateId, userId) {
    try {
      const result = await database.query(`
        DELETE FROM ad_design_templates
        WHERE id = $1 AND user_id = $2 AND is_system_template = FALSE
        RETURNING id
      `, [templateId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Template not found or cannot be deleted');
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete template:', error);
      throw error;
    }
  }
  
  /**
   * Generate ad variations from template
   * This is the main method that replaces LLM image generation
   */
  async generateVariations(templateId, userId, copyVariants, options = {}) {
    try {
      const template = await this.getTemplateById(templateId, userId);
      if (!template) {
        throw new Error('Template not found');
      }
      
      const {
        platform = null,
        format = null,
        saveToDatabase = true
      } = options;
      
      // Generate variations
      const results = await ImageManipulationService.batchGenerateVariations(
        template,
        copyVariants
      );
      
      // Save to database if requested
      if (saveToDatabase) {
        for (const result of results) {
          if (result.error) continue;
          
          const adId = uuidv4();
          await database.query(`
            INSERT INTO template_generated_ads (
              id, user_id, template_id, headline, description, cta_text,
              image_url, image_path, platform, format, generation_time_ms
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [
            adId,
            userId,
            templateId,
            result.copy.headline || result.copy.primaryText,
            result.copy.description || result.copy.primaryText,
            result.copy.cta || result.copy.callToAction,
            result.imageUrl,
            result.imagePath,
            platform,
            format,
            result.generationTimeMs
          ]);
        }
        
        // Update template usage count
        await database.query(`
          UPDATE ad_design_templates
          SET times_used = times_used + $1
          WHERE id = $2
        `, [results.filter(r => !r.error).length, templateId]);
      }
      
      return results;
    } catch (error) {
      logger.error('Failed to generate variations:', error);
      throw error;
    }
  }
  
  /**
   * Process CSV file and generate variations
   * Similar to the Growth Marketing team's CSV processing
   */
  async processCSVAndGenerate(csvFile, templateId, userId, options = {}) {
    try {
      // Parse CSV
      const csv = require('csv-parse/sync');
      const fileContent = await fs.readFile(csvFile.path, 'utf-8');
      const records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true
      });
      
      // Convert CSV records to copy variants
      const copyVariants = records.map(record => ({
        headline: record.headline || record.Headline || '',
        description: record.description || record.Description || record.body || record.Body || '',
        primaryText: record.primaryText || record['Primary Text'] || '',
        cta: record.cta || record.CTA || record['Call to Action'] || 'Learn More'
      }));
      
      // Generate variations
      return await this.generateVariations(templateId, userId, copyVariants, options);
    } catch (error) {
      logger.error('Failed to process CSV:', error);
      throw error;
    }
  }
  
  /**
   * Get generated ads for a template
   */
  async getGeneratedAds(templateId, userId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      
      const result = await database.query(`
        SELECT * FROM template_generated_ads
        WHERE template_id = $1 AND user_id = $2
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
      `, [templateId, userId, limit, offset]);
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to get generated ads:', error);
      throw error;
    }
  }
}

module.exports = new TemplateAdService();
