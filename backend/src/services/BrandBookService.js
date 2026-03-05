const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

/**
 * Brand Book Service
 * Manages brand guidelines, assets, and visual identity
 */
class BrandBookService {
  /**
   * Get or create default brand book for user
   */
  async getOrCreateBrandBook(userId, companyProfileId = null) {
    try {
      // Try to get existing default brand book
      let query = `
        SELECT * FROM brand_books 
        WHERE user_id = $1 AND is_default = TRUE
        ORDER BY created_at DESC
        LIMIT 1
      `;
      let params = [userId];

      const result = await database.query(query, params);

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Create new default brand book
      const brandBookId = uuidv4();
      await database.query(`
        INSERT INTO brand_books (
          id, user_id, company_profile_id, brand_name, is_default, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, [brandBookId, userId, companyProfileId, 'Default Brand Book', true]);

      const newResult = await database.query('SELECT * FROM brand_books WHERE id = $1', [brandBookId]);
      return newResult.rows[0];
    } catch (error) {
      logger.error('Failed to get or create brand book:', error);
      throw error;
    }
  }

  /**
   * Get brand book by ID
   */
  async getBrandBookById(brandBookId, userId) {
    try {
      const result = await database.query(`
        SELECT * FROM brand_books 
        WHERE id = $1 AND user_id = $2
      `, [brandBookId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const brandBook = result.rows[0];

      // Get brand assets
      const assetsResult = await database.query(`
        SELECT * FROM brand_assets 
        WHERE brand_book_id = $1
        ORDER BY created_at DESC
      `, [brandBookId]);

      brandBook.assets = assetsResult.rows;
      return brandBook;
    } catch (error) {
      logger.error('Failed to get brand book:', error);
      throw error;
    }
  }

  /**
   * Get all brand books for user
   */
  async getUserBrandBooks(userId) {
    try {
      const result = await database.query(`
        SELECT * FROM brand_books 
        WHERE user_id = $1
        ORDER BY is_default DESC, created_at DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get user brand books:', error);
      throw error;
    }
  }

  /**
   * Update brand book
   */
  async updateBrandBook(brandBookId, userId, updates) {
    try {
      const allowedFields = [
        'brand_name', 'brand_description', 'primary_logo_url', 'secondary_logo_url',
        'favicon_url', 'primary_colors', 'secondary_colors', 'accent_colors',
        'neutral_colors', 'primary_font', 'secondary_font', 'heading_font',
        'body_font', 'font_urls', 'brand_voice', 'brand_personality', 'brand_values',
        'brand_messaging', 'tone_of_voice', 'image_style_preferences',
        'do_not_use_elements', 'required_elements', 'asset_library', 'is_active'
      ];

      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(typeof value === 'object' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(brandBookId, userId);

      const query = `
        UPDATE brand_books 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await database.query(query, updateValues);

      if (result.rows.length === 0) {
        throw new Error('Brand book not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update brand book:', error);
      throw error;
    }
  }

  /**
   * Add brand asset
   */
  async addBrandAsset(brandBookId, userId, assetData) {
    try {
      const assetId = uuidv4();
      const {
        asset_name,
        asset_type,
        asset_category,
        description,
        tags,
        file_url,
        file_path,
        file_type,
        file_size,
        width,
        height,
        usage_guidelines,
        restrictions,
        metadata
      } = assetData;

      await database.query(`
        INSERT INTO brand_assets (
          id, brand_book_id, user_id, asset_name, asset_type, asset_category,
          description, tags, file_url, file_path, file_type, file_size,
          width, height, usage_guidelines, restrictions, metadata,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
      `, [
        assetId, brandBookId, userId, asset_name, asset_type, asset_category,
        description, tags || [], file_url, file_path, file_type, file_size,
        width, height, usage_guidelines, restrictions,
        metadata ? JSON.stringify(metadata) : '{}'
      ]);

      const result = await database.query('SELECT * FROM brand_assets WHERE id = $1', [assetId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to add brand asset:', error);
      throw error;
    }
  }

  /**
   * Delete brand asset
   */
  async deleteBrandAsset(assetId, userId) {
    try {
      // Get asset to delete file
      const assetResult = await database.query(`
        SELECT file_path FROM brand_assets 
        WHERE id = $1 AND user_id = $2
      `, [assetId, userId]);

      if (assetResult.rows.length === 0) {
        throw new Error('Asset not found');
      }

      const asset = assetResult.rows[0];

      // Delete from database
      await database.query(`
        DELETE FROM brand_assets 
        WHERE id = $1 AND user_id = $2
      `, [assetId, userId]);

      // Delete file if exists
      if (asset.file_path) {
        try {
          await fs.unlink(asset.file_path);
        } catch (fileError) {
          logger.warn(`Failed to delete asset file: ${asset.file_path}`, fileError);
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete brand asset:', error);
      throw error;
    }
  }

  /**
   * Get brand guidelines for AI content generation
   */
  async getBrandGuidelinesForAI(userId) {
    try {
      const brandBook = await this.getOrCreateBrandBook(userId);
      
      return {
        brandName: brandBook.brand_name,
        brandVoice: brandBook.brand_voice,
        brandPersonality: brandBook.brand_personality || [],
        brandValues: brandBook.brand_values || [],
        brandMessaging: brandBook.brand_messaging,
        toneOfVoice: brandBook.tone_of_voice,
        primaryColors: brandBook.primary_colors || [],
        secondaryColors: brandBook.secondary_colors || [],
        accentColors: brandBook.accent_colors || [],
        primaryFont: brandBook.primary_font,
        secondaryFont: brandBook.secondary_font,
        imageStylePreferences: brandBook.image_style_preferences || {},
        doNotUseElements: brandBook.do_not_use_elements || [],
        requiredElements: brandBook.required_elements || [],
        primaryLogoUrl: brandBook.primary_logo_url,
        secondaryLogoUrl: brandBook.secondary_logo_url
      };
    } catch (error) {
      logger.error('Failed to get brand guidelines for AI:', error);
      return null;
    }
  }
}

module.exports = new BrandBookService();

