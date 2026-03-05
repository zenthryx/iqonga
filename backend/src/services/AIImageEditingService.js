const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const sharp = require('sharp');
const { File } = require('undici');

/**
 * AI Image Editing Service
 * Provides AI-powered image editing capabilities using OpenAI DALL-E 3, Gemini, and other AI services
 */
class AIImageEditingService {
  constructor() {
    // Lazy initialization of OpenAI client
    this._openai = null;
    
    // Ensure uploads directory exists
    this.uploadsDir = path.join(__dirname, '../../uploads/ai-edited');
    // Use async check and create
    this.ensureUploadsDir();
  }

  async ensureUploadsDir() {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Lazy getter for OpenAI client
   */
  get openai() {
    if (!this._openai) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required for AI image editing');
      }
      this._openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this._openai;
  }

  /**
   * Download image from URL and save locally
   */
  async downloadImage(imageUrl) {
    try {
      // Handle local URLs
      if (imageUrl.startsWith('/uploads/')) {
        const localPath = path.join(__dirname, '../../', imageUrl);
        return await fs.readFile(localPath);
      }

      // Download external URLs
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Failed to download image:', error);
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  /**
   * Create mask for background removal (simple approach - can be enhanced with AI segmentation)
   */
  async createBackgroundMask(imageBuffer, maskType = 'auto') {
    try {
      // For now, we'll use a simple approach
      // In the future, we can use Gemini Vision API or specialized segmentation models
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      // Create a mask image (white = keep, black = remove)
      // For background removal, we'll create a mask that keeps the center subject
      // This is a simplified approach - can be enhanced with AI segmentation
      
      const maskBuffer = await sharp({
        create: {
          width: metadata.width,
          height: metadata.height,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent = remove
        }
      })
      .composite([
        {
          input: Buffer.from([255, 255, 255, 255]), // White = keep
          top: Math.floor(metadata.height * 0.1),
          left: Math.floor(metadata.width * 0.1),
          blend: 'over'
        }
      ])
      .png()
      .toBuffer();

      return maskBuffer;
    } catch (error) {
      logger.error('Failed to create mask:', error);
      throw error;
    }
  }

  /**
   * Remove background from image using DALL-E 3 inpainting
   * Note: DALL-E 3 image editing requires a mask. For background removal,
   * we'll use a combination approach or recommend using a dedicated service.
   */
  async removeBackground(imageUrl, options = {}) {
    try {
      logger.info('Starting AI background removal:', { imageUrl });

      await this.ensureUploadsDir();

      // Download the image
      const imageBuffer = await this.downloadImage(imageUrl);
      
      // Validate image buffer
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid image buffer: empty or null');
      }

      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      // Validate metadata
      if (!metadata || !metadata.width || !metadata.height) {
        throw new Error('Invalid image metadata: unable to read image dimensions');
      }

      // For background removal with DALL-E 3, we need to create a mask
      // Since DALL-E 3 image editing requires both image and mask,
      // we'll create a mask that covers most of the background
      // This is a simplified approach - for production, consider using
      // a dedicated background removal API or AI segmentation model

      // Create a mask: white = keep (subject), black = remove (background)
      // We'll create a mask that keeps the center area (assuming subject is centered)
      const maskWidth = metadata.width;
      const maskHeight = metadata.height;
      const centerX = Math.floor(maskWidth / 2);
      const centerY = Math.floor(maskHeight / 2);
      const subjectWidth = Math.floor(maskWidth * 0.7); // Assume subject is 70% of width
      const subjectHeight = Math.floor(maskHeight * 0.7); // Assume subject is 70% of height

      // Create mask: black background (remove), white center (keep)
      // First create the white rectangle (subject area to keep)
      const whiteRect = await sharp({
        create: {
          width: subjectWidth,
          height: subjectHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 255 } // White = keep
        }
      })
      .png()
      .toBuffer();

      // Then composite it onto the black background
      const maskBuffer = await sharp({
        create: {
          width: maskWidth,
          height: maskHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 255 } // Black = remove
        }
      })
      .composite([
        {
          input: whiteRect,
          top: centerY - Math.floor(subjectHeight / 2),
          left: centerX - Math.floor(subjectWidth / 2),
          blend: 'over'
        }
      ])
      .png()
      .toBuffer();

      const prompt = options.prompt || 'Remove the background completely, keeping only the main subject. Make the background transparent or white.';

      // Ensure image is in PNG format and proper size for DALL-E 3
      // DALL-E 3 requires square images and specific sizes: 256x256, 512x512, or 1024x1024
      const maxDimension = Math.max(metadata.width, metadata.height);
      let targetSize = 1024;
      if (maxDimension <= 256) {
        targetSize = 256;
      } else if (maxDimension <= 512) {
        targetSize = 512;
      } else {
        targetSize = 1024;
      }

      const processedImage = await sharp(imageBuffer)
        .resize(targetSize, targetSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toBuffer();

      // Resize mask to match processed image
      // For background removal: white = keep (subject), black = remove (background)
      const processedMask = await sharp(maskBuffer)
        .resize(targetSize, targetSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 255 }
        })
        .png()
        .toBuffer();

      // Write buffers to temporary files for OpenAI API
      const tempImagePath = path.join(this.uploadsDir, `temp_image_${Date.now()}.png`);
      const tempMaskPath = path.join(this.uploadsDir, `temp_mask_${Date.now()}.png`);
      
      await fs.writeFile(tempImagePath, processedImage);
      await fs.writeFile(tempMaskPath, processedMask);

      try {
        // Read files as buffers and create File objects with proper MIME types
        const imageBuffer = await fs.readFile(tempImagePath);
        const maskBuffer = await fs.readFile(tempMaskPath);
        
        // Use undici File API to create proper File objects with MIME types
        const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });
        const maskFile = new File([maskBuffer], 'mask.png', { type: 'image/png' });

        const response = await this.openai.images.edit({
          image: imageFile,
          mask: maskFile,
          prompt: prompt,
          n: 1,
          size: `${targetSize}x${targetSize}`
        });

        const editedImageUrl = response.data[0].url;

        // Clean up temp files
        await fs.unlink(tempImagePath).catch(() => {});
        await fs.unlink(tempMaskPath).catch(() => {});

        // Download and save the edited image
        const editedImageBuffer = await this.downloadImage(editedImageUrl);
        const filename = `bg_removed_${Date.now()}.png`;
        const localPath = path.join(this.uploadsDir, filename);
        await fs.writeFile(localPath, editedImageBuffer);

        logger.info('Background removal completed:', { filename });

        return {
          success: true,
          imageUrl: `/uploads/ai-edited/${filename}`,
          originalUrl: editedImageUrl
        };
      } catch (apiError) {
        // Clean up temp files on error
        await fs.unlink(tempImagePath).catch(() => {});
        await fs.unlink(tempMaskPath).catch(() => {});
        throw apiError;
      }

      const editedImageUrl = response.data[0].url;

      // Download and save the edited image
      const editedImageBuffer = await this.downloadImage(editedImageUrl);
      const filename = `bg_removed_${Date.now()}.png`;
      const localPath = path.join(this.uploadsDir, filename);
      await fs.writeFile(localPath, editedImageBuffer);

      logger.info('Background removal completed:', { filename });

      return {
        success: true,
        imageUrl: `/uploads/ai-edited/${filename}`,
        originalUrl: editedImageUrl
      };

    } catch (error) {
      logger.error('AI background removal failed:', error);
      throw new Error(`Background removal failed: ${error.message}`);
    }
  }


  /**
   * Remove object from image using DALL-E 3 inpainting
   */
  async removeObject(imageUrl, maskArea, options = {}) {
    try {
      logger.info('Starting AI object removal:', { imageUrl, maskArea });

      // Download the image
      const imageBuffer = await this.downloadImage(imageUrl);
      
      // Validate image buffer
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid image buffer: empty or null');
      }

      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      // Validate metadata
      if (!metadata || !metadata.width || !metadata.height) {
        throw new Error('Invalid image metadata: unable to read image dimensions');
      }

      // Create mask for the area to remove
      // maskArea should be { x, y, width, height } in pixels or percentages
      const maskX = maskArea.x || 0;
      const maskY = maskArea.y || 0;
      const maskWidth = maskArea.width || metadata.width;
      const maskHeight = maskArea.height || metadata.height;

      // Create a mask image (black = remove, white = keep)
      // First create the black rectangle (area to remove)
      const blackRect = await sharp({
        create: {
          width: maskWidth,
          height: maskHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 255 } // Black = remove
        }
      })
      .png()
      .toBuffer();

      // Then composite it onto the white background
      const maskBuffer = await sharp({
        create: {
          width: metadata.width,
          height: metadata.height,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 255 } // White = keep
        }
      })
      .composite([
        {
          input: blackRect,
          top: maskY,
          left: maskX,
          blend: 'over'
        }
      ])
      .png()
      .toBuffer();

      const prompt = options.prompt || 'Remove the object in the masked area and seamlessly fill it with the surrounding background, making it look natural and realistic.';

      // Ensure image is in PNG format and proper size for DALL-E 3
      // DALL-E 3 requires square images and specific sizes: 256x256, 512x512, or 1024x1024
      const maxDimension = Math.max(metadata.width, metadata.height);
      let targetSize = 1024;
      if (maxDimension <= 256) {
        targetSize = 256;
      } else if (maxDimension <= 512) {
        targetSize = 512;
      } else {
        targetSize = 1024;
      }

      const processedImage = await sharp(imageBuffer)
        .resize(targetSize, targetSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toBuffer();

      // Resize mask to match processed image
      // For object removal: white = keep, black = remove (selected area)
      const processedMask = await sharp(maskBuffer)
        .resize(targetSize, targetSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 255 }
        })
        .png()
        .toBuffer();

      // Write buffers to temporary files for OpenAI API
      const tempImagePath = path.join(this.uploadsDir, `temp_image_${Date.now()}.png`);
      const tempMaskPath = path.join(this.uploadsDir, `temp_mask_${Date.now()}.png`);
      
      await fs.writeFile(tempImagePath, processedImage);
      await fs.writeFile(tempMaskPath, processedMask);

      try {
        // Read files as buffers and create File objects with proper MIME types
        const imageBuffer = await fs.readFile(tempImagePath);
        const maskBuffer = await fs.readFile(tempMaskPath);
        
        // Use undici File API to create proper File objects with MIME types
        const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });
        const maskFile = new File([maskBuffer], 'mask.png', { type: 'image/png' });

        const response = await this.openai.images.edit({
          image: imageFile,
          mask: maskFile,
          prompt: prompt,
          n: 1,
          size: `${targetSize}x${targetSize}`
        });

        const editedImageUrl = response.data[0].url;

        // Clean up temp files
        await fs.unlink(tempImagePath).catch(() => {});
        await fs.unlink(tempMaskPath).catch(() => {});

        // Download and save the edited image
        const editedImageBuffer = await this.downloadImage(editedImageUrl);
        const filename = `object_removed_${Date.now()}.png`;
        const localPath = path.join(this.uploadsDir, filename);
        await fs.writeFile(localPath, editedImageBuffer);

        logger.info('Object removal completed:', { filename });

        return {
          success: true,
          imageUrl: `/uploads/ai-edited/${filename}`,
          originalUrl: editedImageUrl
        };
      } catch (apiError) {
        // Clean up temp files on error
        await fs.unlink(tempImagePath).catch(() => {});
        await fs.unlink(tempMaskPath).catch(() => {});
        throw apiError;
      }
    } catch (error) {
      logger.error('AI object removal failed:', error);
      throw new Error(`Object removal failed: ${error.message}`);
    }
  }

  /**
   * Apply AI smart filter/style to image
   */
  async applySmartFilter(imageUrl, filterStyle, options = {}) {
    try {
      logger.info('Applying AI smart filter:', { imageUrl, filterStyle });

      // Download the image
      const imageBuffer = await this.downloadImage(imageUrl);
      
      // Validate image buffer
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid image buffer: empty or null');
      }

      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      // Validate metadata
      if (!metadata || !metadata.width || !metadata.height) {
        throw new Error('Invalid image metadata: unable to read image dimensions');
      }

      // Define filter prompts based on style
      const filterPrompts = {
        professional: 'Apply a professional, clean, and polished look to this image. Enhance colors, improve contrast, and make it suitable for business use.',
        cinematic: 'Transform this image with a cinematic look. Add dramatic lighting, enhance shadows, and create a movie-like atmosphere with rich, deep colors.',
        vintage: 'Apply a vintage, retro aesthetic to this image. Add warm tones, slight grain, and a nostalgic film-like quality.',
        modern: 'Give this image a modern, minimalist look. Enhance clarity, use vibrant but balanced colors, and create a contemporary aesthetic.',
        bold: 'Make this image bold and vibrant. Increase saturation, enhance contrast, and create a striking, attention-grabbing look.',
        warm: 'Apply a warm, cozy feel to this image. Add golden tones, enhance warmth, and create a welcoming atmosphere.',
        cool: 'Apply a cool, calm aesthetic. Enhance blue tones, reduce warmth, and create a serene, professional look.',
        dramatic: 'Create a dramatic, high-contrast look. Enhance shadows and highlights, add depth, and create visual impact.',
        soft: 'Apply a soft, gentle aesthetic. Reduce harshness, soften colors, and create a dreamy, ethereal look.',
        vibrant: 'Make this image vibrant and energetic. Boost colors, enhance saturation, and create a lively, dynamic feel.'
      };

      const prompt = filterPrompts[filterStyle] || filterPrompts.professional;

      // Use DALL-E 3 image editing to apply the style
      // Note: DALL-E 3 doesn't have direct image-to-image, so we'll use a workaround
      // We'll create a mask covering the entire image and use inpainting with the style prompt

      // Create a full-image mask (white = keep everything, but we'll use it for style transfer)
      const fullMask = await sharp({
        create: {
          width: metadata.width,
          height: metadata.height,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 255 }
        }
      })
      .png()
      .toBuffer();

      // For style transfer, we'll use image editing with a subtle approach
      // Since DALL-E 3 inpainting modifies the masked area, we'll use a different strategy
      // We'll apply the style using image generation based on the original

      // Alternative: Use Sharp for basic adjustments + AI for complex transformations
      let processedImage = imageBuffer;

      // Apply basic adjustments based on style
      if (filterStyle === 'vintage') {
        processedImage = await image
          .modulate({ brightness: 0.9, saturation: 0.8 })
          .tint({ r: 255, g: 240, b: 200 })
          .toBuffer();
      } else if (filterStyle === 'cinematic') {
        processedImage = await image
          .modulate({ brightness: 0.85, saturation: 1.1 })
          .linear(1.2, -(128 * 1.2) + 128) // Increase contrast
          .toBuffer();
      } else if (filterStyle === 'bold') {
        processedImage = await image
          .modulate({ saturation: 1.3 })
          .linear(1.3, -(128 * 1.3) + 128)
          .toBuffer();
      } else if (filterStyle === 'soft') {
        processedImage = await image
          .modulate({ saturation: 0.7 })
          .blur(0.5)
          .toBuffer();
      }

      // For more complex style transfers, use DALL-E 3
      // We'll use image editing with a creative prompt
      try {
        // Ensure valid size for DALL-E 3
        const maxDimension = Math.max(metadata.width, metadata.height);
        let targetSize = 1024;
        if (maxDimension <= 256) {
          targetSize = 256;
        } else if (maxDimension <= 512) {
          targetSize = 512;
        } else {
          targetSize = 1024;
        }

        const resizedImage = await sharp(processedImage)
          .resize(targetSize, targetSize, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .png()
          .toBuffer();

        const resizedMask = await sharp(fullMask)
          .resize(targetSize, targetSize, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 255 }
          })
          .png()
          .toBuffer();

        const tempImagePath = path.join(this.uploadsDir, `temp_image_${Date.now()}.png`);
        const tempMaskPath = path.join(this.uploadsDir, `temp_mask_${Date.now()}.png`);
        
        await fs.writeFile(tempImagePath, resizedImage);
        await fs.writeFile(tempMaskPath, resizedMask);

        // Read files as buffers and create File objects with proper MIME types
        const imageBuffer = await fs.readFile(tempImagePath);
        const maskBuffer = await fs.readFile(tempMaskPath);
        
        // Use undici File API to create proper File objects with MIME types
        const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });
        const maskFile = new File([maskBuffer], 'mask.png', { type: 'image/png' });

        const response = await this.openai.images.edit({
          image: imageFile,
          mask: maskFile,
          prompt: `${prompt} Maintain the original composition and subject, only adjust colors, lighting, and mood.`,
          n: 1,
          size: `${targetSize}x${targetSize}`
        });

        await fs.unlink(tempImagePath).catch(() => {});
        await fs.unlink(tempMaskPath).catch(() => {});

        const styledImageUrl = response.data[0].url;
        const styledImageBuffer = await this.downloadImage(styledImageUrl);
        processedImage = styledImageBuffer;
      } catch (aiError) {
        logger.warn('AI style application failed, using Sharp-only processing:', aiError.message);
        // Continue with Sharp-processed image
      }

      // Save the processed image
      const filename = `filter_${filterStyle}_${Date.now()}.png`;
      const localPath = path.join(this.uploadsDir, filename);
      await fs.writeFile(localPath, processedImage);

      logger.info('Smart filter applied:', { filename, filterStyle });

      return {
        success: true,
        imageUrl: `/uploads/ai-edited/${filename}`,
        filterStyle
      };

    } catch (error) {
      logger.error('AI smart filter application failed:', error);
      throw new Error(`Smart filter application failed: ${error.message}`);
    }
  }

  /**
   * Get available smart filter styles
   */
  getAvailableFilters() {
    return [
      { id: 'professional', name: 'Professional', description: 'Clean, polished business look' },
      { id: 'cinematic', name: 'Cinematic', description: 'Dramatic, movie-like atmosphere' },
      { id: 'vintage', name: 'Vintage', description: 'Retro, nostalgic film quality' },
      { id: 'modern', name: 'Modern', description: 'Contemporary, minimalist aesthetic' },
      { id: 'bold', name: 'Bold', description: 'Vibrant, high-impact look' },
      { id: 'warm', name: 'Warm', description: 'Cozy, golden tones' },
      { id: 'cool', name: 'Cool', description: 'Calm, serene blue tones' },
      { id: 'dramatic', name: 'Dramatic', description: 'High contrast, visual impact' },
      { id: 'soft', name: 'Soft', description: 'Gentle, dreamy aesthetic' },
      { id: 'vibrant', name: 'Vibrant', description: 'Energetic, lively colors' }
    ];
  }

  /**
   * Upscale image using AI
   * Uses Sharp for initial upscaling + DALL-E 3 for enhancement, or Stability AI if available
   */
  async upscaleImage(imageUrl, scale = 2, options = {}) {
    try {
      logger.info('Starting AI image upscaling:', { imageUrl, scale });

      await this.ensureUploadsDir();

      // Download the image
      const imageBuffer = await this.downloadImage(imageUrl);
      
      // Validate image buffer
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid image buffer: empty or null');
      }

      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      // Validate metadata
      if (!metadata || !metadata.width || !metadata.height) {
        throw new Error('Invalid image metadata: unable to read image dimensions');
      }

      // Calculate new dimensions
      const newWidth = Math.floor(metadata.width * scale);
      const newHeight = Math.floor(metadata.height * scale);

      // Limit maximum size (DALL-E 3 has size restrictions)
      const maxSize = 1024;
      const finalWidth = Math.min(newWidth, maxSize);
      const finalHeight = Math.min(newHeight, maxSize);

      // Step 1: Use Sharp for initial upscaling (bicubic interpolation)
      let upscaledBuffer = await image
        .resize(finalWidth, finalHeight, {
          kernel: sharp.kernel.lanczos3, // High-quality upscaling
          fit: 'fill'
        })
        .png()
        .toBuffer();

      // Step 2: Use DALL-E 3 to enhance the upscaled image
      // Create a full mask for enhancement
      const fullMask = await sharp({
        create: {
          width: finalWidth,
          height: finalHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 255 }
        }
      })
      .png()
      .toBuffer();

      try {
        const prompt = options.prompt || 'Enhance this upscaled image to improve sharpness, clarity, and detail while maintaining the original appearance and quality. Remove any artifacts from upscaling.';

        // Ensure valid size for DALL-E 3
        let targetSize = 1024;
        if (finalWidth <= 256 && finalHeight <= 256) {
          targetSize = 256;
        } else if (finalWidth <= 512 && finalHeight <= 512) {
          targetSize = 512;
        } else {
          targetSize = 1024;
        }

        const resizedImage = await sharp(upscaledBuffer)
          .resize(targetSize, targetSize, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .png()
          .toBuffer();

        const resizedMask = await sharp(fullMask)
          .resize(targetSize, targetSize, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 255 }
          })
          .png()
          .toBuffer();

        const tempImagePath = path.join(this.uploadsDir, `temp_image_${Date.now()}.png`);
        const tempMaskPath = path.join(this.uploadsDir, `temp_mask_${Date.now()}.png`);
        
        await fs.writeFile(tempImagePath, resizedImage);
        await fs.writeFile(tempMaskPath, resizedMask);

        // Read files as buffers and create File objects with proper MIME types
        const imageBuffer = await fs.readFile(tempImagePath);
        const maskBuffer = await fs.readFile(tempMaskPath);
        
        // Use undici File API to create proper File objects with MIME types
        const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });
        const maskFile = new File([maskBuffer], 'mask.png', { type: 'image/png' });

        const response = await this.openai.images.edit({
          image: imageFile,
          mask: maskFile,
          prompt: prompt,
          n: 1,
          size: `${targetSize}x${targetSize}`
        });

        await fs.unlink(tempImagePath).catch(() => {});
        await fs.unlink(tempMaskPath).catch(() => {});

        const enhancedImageUrl = response.data[0].url;
        upscaledBuffer = await this.downloadImage(enhancedImageUrl);
      } catch (aiError) {
        logger.warn('AI enhancement failed, using Sharp-only upscaling:', aiError.message);
        // Continue with Sharp-only upscaled image
      }

      // Save the upscaled image
      const filename = `upscaled_${scale}x_${Date.now()}.png`;
      const localPath = path.join(this.uploadsDir, filename);
      await fs.writeFile(localPath, upscaledBuffer);

      logger.info('Image upscaling completed:', { filename, originalSize: `${metadata.width}x${metadata.height}`, newSize: `${finalWidth}x${finalHeight}` });

      return {
        success: true,
        imageUrl: `/uploads/ai-edited/${filename}`,
        originalSize: { width: metadata.width, height: metadata.height },
        newSize: { width: finalWidth, height: finalHeight },
        scale: scale
      };

    } catch (error) {
      logger.error('AI image upscaling failed:', error);
      throw new Error(`Image upscaling failed: ${error.message}`);
    }
  }

  /**
   * AI-powered retouching (skin smoothing, blemish removal, etc.)
   */
  async applyRetouching(imageUrl, retouchOptions = {}) {
    try {
      logger.info('Starting AI retouching:', { imageUrl, retouchOptions });

      await this.ensureUploadsDir();

      // Download the image
      const imageBuffer = await this.downloadImage(imageUrl);
      
      // Validate image buffer
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid image buffer: empty or null');
      }

      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      // Validate metadata
      if (!metadata || !metadata.width || !metadata.height) {
        throw new Error('Invalid image metadata: unable to read image dimensions');
      }

      const {
        smoothSkin = true,
        removeBlemishes = true,
        enhanceEyes = false,
        whitenTeeth = false,
        enhanceHair = false
      } = retouchOptions;

      // Build retouching prompt based on options
      const retouchPrompts = [];
      if (smoothSkin) retouchPrompts.push('smooth skin naturally');
      if (removeBlemishes) retouchPrompts.push('remove blemishes and imperfections');
      if (enhanceEyes) retouchPrompts.push('enhance eyes to make them brighter and more vibrant');
      if (whitenTeeth) retouchPrompts.push('whiten teeth naturally');
      if (enhanceHair) retouchPrompts.push('enhance hair texture and shine');

      const prompt = retouchPrompts.length > 0
        ? `Apply professional photo retouching: ${retouchPrompts.join(', ')}. Maintain natural appearance, avoid over-processing. Keep the original skin texture and features realistic.`
        : 'Apply subtle professional photo retouching while maintaining natural appearance.';

      // Ensure image is in proper size for DALL-E 3
      const maxDimension = Math.max(metadata.width, metadata.height);
      let targetSize = 1024;
      if (maxDimension <= 256) {
        targetSize = 256;
      } else if (maxDimension <= 512) {
        targetSize = 512;
      } else {
        targetSize = 1024;
      }

      const processedImage = await sharp(imageBuffer)
        .resize(targetSize, targetSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toBuffer();

      // Create a full white mask for retouching (edit entire image)
      const fullMask = await sharp({
        create: {
          width: targetSize,
          height: targetSize,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 255 }
        }
      })
      .png()
      .toBuffer();

      // Write to temp files
      const tempImagePath = path.join(this.uploadsDir, `temp_image_${Date.now()}.png`);
      const tempMaskPath = path.join(this.uploadsDir, `temp_mask_${Date.now()}.png`);
      
      await fs.writeFile(tempImagePath, processedImage);
      await fs.writeFile(tempMaskPath, fullMask);

      try {
        // Use file paths directly
        // Read files as buffers and create File objects with proper MIME types
        const imageBuffer = await fs.readFile(tempImagePath);
        const maskBuffer = await fs.readFile(tempMaskPath);
        
        // Use undici File API to create proper File objects with MIME types
        const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });
        const maskFile = new File([maskBuffer], 'mask.png', { type: 'image/png' });

        // Use DALL-E 3 for retouching
        const response = await this.openai.images.edit({
          image: imageFile,
          mask: maskFile,
          prompt: prompt,
          n: 1,
          size: `${targetSize}x${targetSize}`
        });

        const editedImageUrl = response.data[0].url;

        // Clean up temp files
        await fs.unlink(tempImagePath).catch(() => {});
        await fs.unlink(tempMaskPath).catch(() => {});

        // Download and save the retouched image
        const retouchedImageBuffer = await this.downloadImage(editedImageUrl);
        const filename = `retouched_${Date.now()}.png`;
        const localPath = path.join(this.uploadsDir, filename);
        await fs.writeFile(localPath, retouchedImageBuffer);

        logger.info('Retouching completed:', { filename });

        return {
          success: true,
          imageUrl: `/uploads/ai-edited/${filename}`,
          originalUrl: retouchedImageUrl,
          retouchOptions
        };
      } catch (apiError) {
        // Clean up temp files on error
        await fs.unlink(tempImagePath).catch(() => {});
        await fs.unlink(tempMaskPath).catch(() => {});
        throw apiError;
      }

      const retouchedImageUrl = response.data[0].url;

      // Download and save the retouched image
      const retouchedImageBuffer = await this.downloadImage(retouchedImageUrl);
      const filename = `retouched_${Date.now()}.png`;
      const localPath = path.join(this.uploadsDir, filename);
      await fs.writeFile(localPath, retouchedImageBuffer);

      logger.info('Retouching completed:', { filename });

      return {
        success: true,
        imageUrl: `/uploads/ai-edited/${filename}`,
        originalUrl: retouchedImageUrl,
        retouchOptions
      };

    } catch (error) {
      logger.error('AI retouching failed:', error);
      throw new Error(`Retouching failed: ${error.message}`);
    }
  }

  /**
   * Learn style from user's editing patterns
   * Analyzes editing history to create an AI profile
   */
  async learnStyleFromHistory(userId, sampleImageIds = [], options = {}) {
    try {
      logger.info('Starting style learning:', { userId, sampleCount: sampleImageIds.length });

      const database = require('../database/connection');

      // Get user's editing history
      let editingHistory = [];
      
      if (sampleImageIds.length > 0) {
        // Get specific images' editing history
        const historyQuery = `
          SELECT edit_type, edit_config, before_state, after_state
          FROM image_manipulation_history
          WHERE user_id = $1 AND image_id = ANY($2::uuid[])
          ORDER BY created_at DESC
          LIMIT 100
        `;
        const result = await database.query(historyQuery, [userId, sampleImageIds]);
        editingHistory = result.rows;
      } else {
        // Get all user's recent editing history
        const historyQuery = `
          SELECT edit_type, edit_config, before_state, after_state
          FROM image_manipulation_history
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 50
        `;
        const result = await database.query(historyQuery, [userId]);
        editingHistory = result.rows;
      }

      if (editingHistory.length === 0) {
        throw new Error('No editing history found. Please edit some images first to learn your style.');
      }

      // Analyze editing patterns using GPT-4 Vision or text analysis
      const analysisPrompt = `Analyze the following image editing patterns and create a style profile:

Editing History:
${JSON.stringify(editingHistory.slice(0, 20), null, 2)}

Based on these editing patterns, identify:
1. Color preferences (warm/cool, saturated/desaturated, contrast levels)
2. Brightness and exposure preferences
3. Style characteristics (professional, artistic, bold, subtle, etc.)
4. Common adjustments (crop ratios, filter preferences, etc.)

Return a JSON object with:
- styleName: A descriptive name for this style
- colorProfile: { warmth, saturation, contrast, brightness }
- styleCharacteristics: Array of style traits
- commonAdjustments: Array of frequently used adjustments
- recommendedFilters: Array of recommended filter styles`;

      // Use GPT-4 to analyze the patterns
      const analysisResponse = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert image editing analyst. Analyze editing patterns and return valid JSON only.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      const styleProfile = JSON.parse(analysisResponse.choices[0].message.content);

      // Save style profile to database
      const profileId = uuidv4();
      const profileQuery = `
        INSERT INTO ai_style_profiles (
          id, user_id, profile_name, style_data, sample_count, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          profile_name = EXCLUDED.profile_name,
          style_data = EXCLUDED.style_data,
          sample_count = EXCLUDED.sample_count,
          updated_at = NOW()
        RETURNING *
      `;

      const profileResult = await database.query(profileQuery, [
        profileId,
        userId,
        styleProfile.styleName || 'Personal Style',
        JSON.stringify(styleProfile),
        editingHistory.length
      ]);

      logger.info('Style profile created:', { profileId, profileName: styleProfile.styleName });

      return {
        success: true,
        profileId: profileResult.rows[0].id,
        profileName: styleProfile.styleName,
        styleProfile: styleProfile,
        sampleCount: editingHistory.length
      };

    } catch (error) {
      logger.error('Style learning failed:', error);
      throw new Error(`Style learning failed: ${error.message}`);
    }
  }

  /**
   * Apply learned style to an image
   */
  async applyLearnedStyle(imageUrl, profileId, options = {}) {
    try {
      logger.info('Applying learned style:', { imageUrl, profileId });

      await this.ensureUploadsDir();

      const database = require('../database/connection');

      // Get style profile
      const profileQuery = `
        SELECT * FROM ai_style_profiles WHERE id = $1
      `;
      const profileResult = await database.query(profileQuery, [profileId]);

      if (profileResult.rows.length === 0) {
        throw new Error('Style profile not found');
      }

      const profile = profileResult.rows[0];
      const styleData = typeof profile.style_data === 'string' 
        ? JSON.parse(profile.style_data) 
        : profile.style_data;

      // Download the image
      const imageBuffer = await this.downloadImage(imageUrl);
      
      // Validate image buffer
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid image buffer: empty or null');
      }

      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      // Validate metadata
      if (!metadata || !metadata.width || !metadata.height) {
        throw new Error('Invalid image metadata: unable to read image dimensions');
      }

      // Build style application prompt
      const colorProfile = styleData.colorProfile || {};
      const styleCharacteristics = styleData.styleCharacteristics || [];
      
      const prompt = `Apply the following editing style to this image:
- Color Profile: ${JSON.stringify(colorProfile)}
- Style Characteristics: ${styleCharacteristics.join(', ')}
- Maintain the original composition and subject, only adjust colors, lighting, and mood to match this style.`;

      // Create full mask
      const fullMask = await sharp({
        create: {
          width: metadata.width,
          height: metadata.height,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 255 }
        }
      })
      .png()
      .toBuffer();

      // Ensure valid size for DALL-E 3
      const maxDimension = Math.max(metadata.width, metadata.height);
      let targetSize = 1024;
      if (maxDimension <= 256) {
        targetSize = 256;
      } else if (maxDimension <= 512) {
        targetSize = 512;
      } else {
        targetSize = 1024;
      }

      const processedImage = await sharp(imageBuffer)
        .resize(targetSize, targetSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toBuffer();

      const processedMask = await sharp(fullMask)
        .resize(targetSize, targetSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 255 }
        })
        .png()
        .toBuffer();

      const tempImagePath = path.join(this.uploadsDir, `temp_image_${Date.now()}.png`);
      const tempMaskPath = path.join(this.uploadsDir, `temp_mask_${Date.now()}.png`);
      
      await fs.writeFile(tempImagePath, processedImage);
      await fs.writeFile(tempMaskPath, processedMask);

      try {
        // Read files as buffers and create File objects with proper MIME types
        const imageBuffer = await fs.readFile(tempImagePath);
        const maskBuffer = await fs.readFile(tempMaskPath);
        
        // Use undici File API to create proper File objects with MIME types
        const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });
        const maskFile = new File([maskBuffer], 'mask.png', { type: 'image/png' });

        // Apply style using DALL-E 3
        const response = await this.openai.images.edit({
          image: imageFile,
          mask: maskFile,
          prompt: prompt,
          n: 1,
          size: `${targetSize}x${targetSize}`
        });

        const styledImageUrl = response.data[0].url;

        // Download and save
        const styledImageBuffer = await this.downloadImage(styledImageUrl);
        const filename = `styled_${profileId}_${Date.now()}.png`;
        const localPath = path.join(this.uploadsDir, filename);
        await fs.writeFile(localPath, styledImageBuffer);

        logger.info('Learned style applied:', { filename, profileName: profile.profile_name });

        return {
          success: true,
          imageUrl: `/uploads/ai-edited/${filename}`,
          originalUrl: styledImageUrl,
          profileId: profileId,
          profileName: profile.profile_name
        };
      } catch (apiError) {
        await fs.unlink(tempImagePath).catch(() => {});
        await fs.unlink(tempMaskPath).catch(() => {});
        throw apiError;
      }
    } catch (error) {
      logger.error('Apply learned style failed:', error);
      throw new Error(`Apply learned style failed: ${error.message}`);
    }
  }

  /**
   * Get user's style profiles
   */
  async getUserStyleProfiles(userId) {
    try {
      const database = require('../database/connection');
      
      const query = `
        SELECT id, profile_name, style_data, sample_count, created_at, updated_at
        FROM ai_style_profiles
        WHERE user_id = $1
        ORDER BY updated_at DESC
      `;
      
      const result = await database.query(query, [userId]);
      
      return result.rows.map(row => ({
        id: row.id,
        profileName: row.profile_name,
        styleData: typeof row.style_data === 'string' ? JSON.parse(row.style_data) : row.style_data,
        sampleCount: row.sample_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      logger.error('Failed to get style profiles:', error);
      throw error;
    }
  }

  /**
   * Generate AI logo based on text prompt
   */
  async generateLogo(prompt, options = {}) {
    try {
      logger.info('Starting AI logo generation:', { prompt, options });

      await this.ensureUploadsDir();

      const {
        style = 'modern',
        colors = [],
        shape = 'square',
        size = '1024x1024'
      } = options;

      // Build enhanced prompt for logo generation
      let logoPrompt = `Create a professional logo design: ${prompt}. `;
      
      if (style) {
        logoPrompt += `Style: ${style}. `;
      }
      
      if (colors.length > 0) {
        logoPrompt += `Use these colors: ${colors.join(', ')}. `;
      }
      
      logoPrompt += `The logo should be clean, scalable, and suitable for business use. No text in the logo itself, just the visual design.`;

      // Use DALL-E 3 to generate logo
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: logoPrompt,
        n: 1,
        size: size,
        quality: 'hd',
        style: 'vivid'
      });

      const logoUrl = response.data[0].url;

      // Download and save the logo
      const logoBuffer = await this.downloadImage(logoUrl);
      const filename = `logo_${Date.now()}_${uuidv4().substring(0, 8)}.png`;
      const localPath = path.join(this.uploadsDir, filename);
      await fs.writeFile(localPath, logoBuffer);

      logger.info('Logo generation completed:', { filename });

      return {
        success: true,
        imageUrl: `/uploads/ai-edited/${filename}`,
        originalUrl: logoUrl,
        prompt: prompt,
        style: style
      };

    } catch (error) {
      logger.error('AI logo generation failed:', error);
      throw new Error(`Logo generation failed: ${error.message}`);
    }
  }

  /**
   * Get available logo styles
   */
  getAvailableLogoStyles() {
    return [
      { id: 'modern', name: 'Modern', description: 'Clean, contemporary design' },
      { id: 'classic', name: 'Classic', description: 'Timeless, traditional style' },
      { id: 'minimalist', name: 'Minimalist', description: 'Simple, elegant design' },
      { id: 'bold', name: 'Bold', description: 'Strong, impactful design' },
      { id: 'playful', name: 'Playful', description: 'Fun, creative design' },
      { id: 'professional', name: 'Professional', description: 'Corporate, business-focused' },
      { id: 'tech', name: 'Tech', description: 'Technology-focused design' },
      { id: 'creative', name: 'Creative', description: 'Artistic, unique design' }
    ];
  }

  /**
   * Get available logo shapes
   */
  getAvailableLogoShapes() {
    return [
      { id: 'square', name: 'Square', description: '1:1 aspect ratio' },
      { id: 'wide', name: 'Wide', description: '16:9 aspect ratio' },
      { id: 'tall', name: 'Tall', description: '9:16 aspect ratio' },
      { id: 'circle', name: 'Circle', description: 'Circular logo' }
    ];
  }
}

module.exports = new AIImageEditingService();

