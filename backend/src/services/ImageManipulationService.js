// Optional dependency - sharp is required for image manipulation
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  // Will be handled in methods that use sharp
}

const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const database = require('../database/connection');
const UserUploadedImageService = require('./UserUploadedImageService');
const ProductImageService = require('./ProductImageService');
const { v4: uuidv4 } = require('uuid');

/**
 * Image Manipulation Service
 * Provides image editing capabilities (crop, resize, filters, text overlay, etc.)
 */
class ImageManipulationService {
  /**
   * Check if sharp is available
   */
  _checkSharp() {
    if (!sharp) {
      throw new Error('sharp module is required for image manipulation. Please install it: npm install sharp');
    }
  }

  /**
   * Crop image
   */
  async cropImage(imagePath, cropConfig) {
    this._checkSharp();
    try {
      const { x, y, width, height } = cropConfig;
      const outputPath = path.join(
        path.dirname(imagePath),
        `cropped_${Date.now()}_${path.basename(imagePath)}`
      );

      await sharp(imagePath)
        .extract({ left: x, top: y, width, height })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      logger.error('Failed to crop image:', error);
      throw error;
    }
  }

  /**
   * Resize image
   */
  async resizeImage(imagePath, resizeConfig) {
    this._checkSharp();
    try {
      const { width, height, fit = 'cover', position = 'center' } = resizeConfig;
      const outputPath = path.join(
        path.dirname(imagePath),
        `resized_${Date.now()}_${path.basename(imagePath)}`
      );

      await sharp(imagePath)
        .resize(width, height, {
          fit: fit, // 'cover', 'contain', 'fill', 'inside', 'outside'
          position: position
        })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      logger.error('Failed to resize image:', error);
      throw error;
    }
  }

  /**
   * Apply filter/adjustments
   */
  async applyFilter(imagePath, filterConfig) {
    this._checkSharp();
    try {
      const {
        brightness = 1,
        contrast = 1,
        saturation = 1,
        sharpness = 1,
        blur = 0,
        grayscale = false,
        sepia = false,
        hue = 0,
        saturation_adjust = 1
      } = filterConfig;

      const outputPath = path.join(
        path.dirname(imagePath),
        `filtered_${Date.now()}_${path.basename(imagePath)}`
      );

      let pipeline = sharp(imagePath);

      // Apply adjustments
      if (brightness !== 1) {
        pipeline = pipeline.modulate({ brightness });
      }
      if (contrast !== 1) {
        pipeline = pipeline.linear(contrast, -(128 * contrast) + 128);
      }
      if (saturation !== 1) {
        pipeline = pipeline.modulate({ saturation });
      }
      if (grayscale) {
        pipeline = pipeline.greyscale();
      }
      if (sepia) {
        pipeline = pipeline.tint({ r: 112, g: 66, b: 20 });
      }
      if (blur > 0) {
        pipeline = pipeline.blur(blur);
      }
      if (sharpness !== 1) {
        pipeline = pipeline.sharpen(sharpness);
      }

      await pipeline.toFile(outputPath);
      return outputPath;
    } catch (error) {
      logger.error('Failed to apply filter:', error);
      throw error;
    }
  }

  /**
   * Add text overlay (basic - for advanced use TextOverlayEditor component)
   */
  async addTextOverlay(imagePath, textConfig) {
    try {
      // This is a basic implementation
      // For advanced text overlay, use the TextOverlayEditor component on frontend
      // This method can be used for server-side text rendering if needed
      
      const { text, x, y, fontSize = 24, color = '#FFFFFF', fontFamily = 'Arial' } = textConfig;
      
      // Using sharp's text overlay (requires additional setup)
      // For now, return the original path and let frontend handle it
      // Advanced text overlay should be done client-side with canvas
      
      logger.info('Text overlay requested - should be handled client-side with TextOverlayEditor');
      return imagePath;
    } catch (error) {
      logger.error('Failed to add text overlay:', error);
      throw error;
    }
  }

  /**
   * Add advanced text overlay with precise positioning using SVG
   * This is used for template-based ad generation (no LLM needed)
   */
  async addAdvancedTextOverlay(imagePath, textConfigs) {
    this._checkSharp();
    try {
      const metadata = await sharp(imagePath).metadata();
      const width = metadata.width;
      const height = metadata.height;

      // Build SVG with all text overlays
      const svgTexts = textConfigs.map(config => {
        const {
          text,
          x,
          y,
          fontSize = 24,
          fontFamily = 'Arial',
          fontWeight = 'normal',
          color = '#FFFFFF',
          align = 'left', // 'left', 'center', 'right'
          maxWidth = null,
          maxLines = null,
          strokeColor = null,
          strokeWidth = 0,
          shadow = false,
          backgroundColor = null,
          borderRadius = 0,
          padding = { x: 0, y: 0 }
        } = config;

        // Calculate text position based on alignment
        let textX = x;
        let textAnchor = 'start';
        if (align === 'center') {
          textAnchor = 'middle';
        } else if (align === 'right') {
          textAnchor = 'end';
        }

        // Handle text wrapping (simple word wrap)
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        const effectiveMaxWidth = maxWidth || width - x - 50; // Default margin

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          // Approximate width: fontSize * 0.6 per character
          const estimatedWidth = testLine.length * fontSize * 0.6;
          
          if (estimatedWidth <= effectiveMaxWidth || !currentLine) {
            currentLine = testLine;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine);

        // Limit lines if specified
        const finalLines = maxLines ? lines.slice(0, maxLines) : lines;
        const lineHeight = fontSize * 1.2;

        // Build SVG text elements
        let svgElements = '';

        // Add background if specified
        if (backgroundColor) {
          const textWidth = Math.min(effectiveMaxWidth, Math.max(...finalLines.map(l => l.length * fontSize * 0.6)));
          const textHeight = finalLines.length * lineHeight;
          const bgX = align === 'center' ? x - textWidth / 2 - padding.x :
                     align === 'right' ? x - textWidth - padding.x : x - padding.x;
          const bgY = y - padding.y;
          const bgWidth = textWidth + (padding.x * 2);
          const bgHeight = textHeight + (padding.y * 2);

          if (borderRadius > 0) {
            svgElements += `<rect x="${bgX}" y="${bgY}" width="${bgWidth}" height="${bgHeight}" 
              rx="${borderRadius}" ry="${borderRadius}" fill="${backgroundColor}" opacity="0.9"/>`;
          } else {
            svgElements += `<rect x="${bgX}" y="${bgY}" width="${bgWidth}" height="${bgHeight}" 
              fill="${backgroundColor}" opacity="0.9"/>`;
          }
        }

        // Add shadow filter if needed
        if (shadow) {
          svgElements += `<defs>
            <filter id="shadow-${x}-${y}">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
              <feOffset dx="2" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.5"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>`;
        }

        // Add text lines
        finalLines.forEach((line, index) => {
          const lineY = y + (index * lineHeight);
          
          // Stroke (outline) if specified
          if (strokeColor && strokeWidth > 0) {
            svgElements += `<text x="${textX}" y="${lineY}" 
              font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" 
              fill="${strokeColor}" stroke="${strokeColor}" stroke-width="${strokeWidth * 2}" 
              text-anchor="${textAnchor}" ${shadow ? `filter="url(#shadow-${x}-${y})"` : ''}>${this._escapeXml(line)}</text>`;
          }
          
          // Main text
          svgElements += `<text x="${textX}" y="${lineY}" 
            font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" 
            fill="${color}" text-anchor="${textAnchor}" ${shadow ? `filter="url(#shadow-${x}-${y})"` : ''}>${this._escapeXml(line)}</text>`;
        });

        return svgElements;
      }).join('');

      // Create SVG overlay
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          ${svgTexts}
        </svg>
      `;

      const svgBuffer = Buffer.from(svg);

      // Composite SVG over image
      const outputPath = path.join(
        path.dirname(imagePath),
        `overlay_${Date.now()}_${path.basename(imagePath)}`
      );

      await sharp(imagePath)
        .composite([{
          input: svgBuffer,
          top: 0,
          left: 0
        }])
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      logger.error('Failed to add advanced text overlay:', error);
      throw error;
    }
  }

  /**
   * Helper: Escape XML special characters
   */
  _escapeXml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate ad from template
   * This is the core method that replaces LLM image generation
   */
  async generateAdFromTemplate(template, copyData) {
    try {
      const startTime = Date.now();
      
      // Load background image
      let backgroundPath = template.background_image_path;
      
      if (!backgroundPath || !(await fs.access(backgroundPath).then(() => true).catch(() => false))) {
        // Download if not local
        const axios = require('axios');
        const response = await axios.get(template.background_image_url, { 
          responseType: 'arraybuffer',
          timeout: 30000
        });
        
        const uploadsDir = path.join(__dirname, '../../uploads/templates');
        await fs.mkdir(uploadsDir, { recursive: true });
        
        const ext = path.extname(new URL(template.background_image_url).pathname) || '.jpg';
        backgroundPath = path.join(uploadsDir, `template_${template.id}${ext}`);
        await fs.writeFile(backgroundPath, Buffer.from(response.data));
      }
      
      // Build text configs from template layout
      const textConfigs = [];
      const layout = template.layout_config || {};
      const placeholders = layout.textPlaceholders || [];
      
      for (const placeholder of placeholders) {
        let text = '';
        
        switch (placeholder.id) {
          case 'headline':
            text = copyData.headline || copyData.primaryText || '';
            break;
          case 'description':
            text = copyData.description || copyData.primaryText || '';
            break;
          case 'cta':
            text = copyData.cta || copyData.callToAction || 'Learn More';
            break;
          default:
            text = copyData[placeholder.id] || '';
        }
        
        if (text) {
          textConfigs.push({
            text,
            x: placeholder.position?.x || 50,
            y: placeholder.position?.y || 50,
            ...placeholder.style
          });
        }
      }
      
      // Generate image with text overlays
      const outputPath = await this.addAdvancedTextOverlay(backgroundPath, textConfigs);
      
      const generationTime = Date.now() - startTime;
      
      return {
        imagePath: outputPath,
        imageUrl: outputPath.replace(/.*\/uploads\//, '/uploads/'),
        generationTimeMs: generationTime
      };
    } catch (error) {
      logger.error('Failed to generate ad from template:', error);
      throw error;
    }
  }

  /**
   * Batch generate multiple variations
   */
  async batchGenerateVariations(template, copyVariants) {
    const results = [];
    
    for (const copy of copyVariants) {
      try {
        const result = await this.generateAdFromTemplate(template, copy);
        results.push({
          ...result,
          copy
        });
      } catch (error) {
        logger.error(`Failed to generate variation:`, error);
        results.push({
          error: error.message,
          copy
        });
      }
    }
    
    return results;
  }

  /**
   * Composite images (overlay one image on another)
   */
  async compositeImages(baseImagePath, overlayImagePath, compositeConfig) {
    this._checkSharp();
    try {
      const { x = 0, y = 0, opacity = 1, blend = 'over' } = compositeConfig;
      const outputPath = path.join(
        path.dirname(baseImagePath),
        `composite_${Date.now()}_${path.basename(baseImagePath)}`
      );

      const overlayBuffer = await sharp(overlayImagePath)
        .resize({ fit: 'inside' })
        .toBuffer();

      await sharp(baseImagePath)
        .composite([{
          input: overlayBuffer,
          top: y,
          left: x,
          blend: blend
        }])
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      logger.error('Failed to composite images:', error);
      throw error;
    }
  }

  /**
   * Apply multiple manipulations in sequence
   */
  async applyManipulations(imagePath, manipulations) {
    try {
      let currentPath = imagePath;

      for (const manipulation of manipulations) {
        const { type, config } = manipulation;

        switch (type) {
          case 'crop':
            currentPath = await this.cropImage(currentPath, config);
            break;
          case 'resize':
            currentPath = await this.resizeImage(currentPath, config);
            break;
          case 'filter':
            currentPath = await this.applyFilter(currentPath, config);
            break;
          case 'composite':
            currentPath = await this.compositeImages(currentPath, config.overlayPath, config);
            break;
          default:
            logger.warn(`Unknown manipulation type: ${type}`);
        }
      }

      return currentPath;
    } catch (error) {
      logger.error('Failed to apply manipulations:', error);
      throw error;
    }
  }

  /**
   * Save manipulation history
   */
  async saveManipulationHistory(imageId, imageType, userId, editType, editConfig, resultImageId) {
    try {
      const historyId = uuidv4();

      // Get current image state
      let beforeState = {};
      if (imageType === 'user_uploaded') {
        const image = await UserUploadedImageService.getUploadedImageById(imageId, userId);
        if (image) {
          beforeState = {
            width: image.width,
            height: image.height,
            file_size: image.file_size
          };
        }
      } else if (imageType === 'product') {
        const images = await ProductImageService.getProductImages(imageId, userId);
        if (images.length > 0) {
          const image = images[0];
          beforeState = {
            width: image.width,
            height: image.height,
            file_size: image.file_size
          };
        }
      }

      await database.query(`
        INSERT INTO image_manipulation_history (
          id, image_id, image_type, user_id, edit_type, edit_config,
          before_state, after_state, result_image_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        historyId, imageId, imageType, userId, editType,
        JSON.stringify(editConfig), JSON.stringify(beforeState),
        JSON.stringify({}), resultImageId
      ]);

      return historyId;
    } catch (error) {
      logger.error('Failed to save manipulation history:', error);
      throw error;
    }
  }

  /**
   * Get image metadata
   */
  async getImageMetadata(imagePath) {
    this._checkSharp();
    try {
      const metadata = await sharp(imagePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: (await fs.stat(imagePath)).size,
        hasAlpha: metadata.hasAlpha,
        channels: metadata.channels,
        density: metadata.density,
        orientation: metadata.orientation
      };
    } catch (error) {
      logger.error('Failed to get image metadata:', error);
      throw error;
    }
  }
}

module.exports = new ImageManipulationService();

