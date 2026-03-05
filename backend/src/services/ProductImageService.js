const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

// Optional dependency - sharp is only needed for image manipulation features
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  logger.warn('sharp module not available - image manipulation features will be limited');
  sharp = null;
}

/**
 * Product Image Service
 * Manages product/service images and integrates with ad generation
 */
class ProductImageService {
  /**
   * Add image to product
   */
  async addProductImage(productId, userId, imageData) {
    try {
      const imageId = uuidv4();
      const {
        image_name,
        image_type = 'product',
        is_primary = false,
        sort_order = 0,
        file_url,
        file_path,
        file_type,
        file_size,
        width,
        height,
        alt_text,
        caption,
        tags,
        metadata
      } = imageData;

      // If this is set as primary, unset other primary images for this product
      if (is_primary) {
        await database.query(`
          UPDATE product_images 
          SET is_primary = FALSE 
          WHERE product_id = $1
        `, [productId]);
      }

      await database.query(`
        INSERT INTO product_images (
          id, product_id, user_id, image_name, image_type, is_primary,
          sort_order, file_url, file_path, file_type, file_size,
          width, height, alt_text, caption, tags, metadata,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
      `, [
        imageId, productId, userId, image_name, image_type, is_primary,
        sort_order, file_url, file_path, file_type, file_size,
        width, height, alt_text, caption, tags || [],
        metadata ? JSON.stringify(metadata) : '{}'
      ]);

      // Update product's image_urls array
      await database.query(`
        UPDATE company_products 
        SET image_urls = array_append(COALESCE(image_urls, '{}'), $1)
        WHERE id = $2
      `, [file_url, productId]);

      const result = await database.query('SELECT * FROM product_images WHERE id = $1', [imageId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to add product image:', error);
      throw error;
    }
  }

  /**
   * Get product images
   */
  async getProductImages(productId, userId) {
    try {
      const result = await database.query(`
        SELECT pi.*, cp.name as product_name
        FROM product_images pi
        JOIN company_products cp ON pi.product_id = cp.id
        WHERE pi.product_id = $1 AND pi.user_id = $2
        ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.created_at DESC
      `, [productId, userId]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get product images:', error);
      throw error;
    }
  }

  /**
   * Get all product images for user
   */
  async getUserProductImages(userId) {
    try {
      const result = await database.query(`
        SELECT pi.*, cp.name as product_name, cp.category as product_category
        FROM product_images pi
        JOIN company_products cp ON pi.product_id = cp.id
        JOIN company_profiles cprof ON cp.company_profile_id = cprof.id
        WHERE pi.user_id = $1
        ORDER BY pi.created_at DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get user product images:', error);
      throw error;
    }
  }

  /**
   * Delete product image
   */
  async deleteProductImage(imageId, userId) {
    try {
      // Get image to delete file
      const imageResult = await database.query(`
        SELECT file_path, product_id, file_url FROM product_images 
        WHERE id = $1 AND user_id = $2
      `, [imageId, userId]);

      if (imageResult.rows.length === 0) {
        throw new Error('Image not found');
      }

      const image = imageResult.rows[0];

      // Delete from database
      await database.query(`
        DELETE FROM product_images 
        WHERE id = $1 AND user_id = $2
      `, [imageId, userId]);

      // Remove from product's image_urls array
      await database.query(`
        UPDATE company_products 
        SET image_urls = array_remove(image_urls, $1)
        WHERE id = $2
      `, [image.file_url, image.product_id]);

      // Delete file if exists
      if (image.file_path) {
        try {
          await fs.unlink(image.file_path);
        } catch (fileError) {
          logger.warn(`Failed to delete product image file: ${image.file_path}`, fileError);
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete product image:', error);
      throw error;
    }
  }

  /**
   * Update product image
   */
  async updateProductImage(imageId, userId, updates) {
    try {
      const allowedFields = [
        'image_name', 'image_type', 'is_primary', 'sort_order',
        'alt_text', 'caption', 'tags', 'metadata'
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

      // If setting as primary, unset other primary images
      if (updates.is_primary === true) {
        const imageResult = await database.query(`
          SELECT product_id FROM product_images WHERE id = $1
        `, [imageId]);
        
        if (imageResult.rows.length > 0) {
          await database.query(`
            UPDATE product_images 
            SET is_primary = FALSE 
            WHERE product_id = $1 AND id != $2
          `, [imageResult.rows[0].product_id, imageId]);
        }
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(imageId, userId);

      const query = `
        UPDATE product_images 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await database.query(query, updateValues);

      if (result.rows.length === 0) {
        throw new Error('Product image not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update product image:', error);
      throw error;
    }
  }

  /**
   * Get primary product image
   */
  async getPrimaryProductImage(productId) {
    try {
      const result = await database.query(`
        SELECT * FROM product_images 
        WHERE product_id = $1 AND is_primary = TRUE
        LIMIT 1
      `, [productId]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Failed to get primary product image:', error);
      return null;
    }
  }
}

module.exports = new ProductImageService();

