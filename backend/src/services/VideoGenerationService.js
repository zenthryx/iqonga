const logger = require('../utils/logger');
const https = require('https');
const http = require('http');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const OpenAI = require('openai');
const ReplicateService = require('./ReplicateService');

// Try to use RunwayML SDK if available, otherwise fall back to REST API
let RunwayML = null;
try {
  // RunwayML SDK might export as default or named export
  const runwaySDK = require('@runwayml/sdk');
  RunwayML = runwaySDK.default || runwaySDK.RunwayML || runwaySDK;
  if (!RunwayML) {
    throw new Error('RunwayML SDK not found');
  }
} catch (e) {
  logger.debug('RunwayML SDK not available, will use REST API fallback:', e.message);
}

/**
 * Video Generation Service
 * Supports multiple video generation APIs:
 * - RunwayML API
 * - Pika Labs API
 * - Google Veo API (when available)
 * - Stable Video Diffusion (self-hosted)
 */
class VideoGenerationService {
  constructor() {
    this.providers = {
      runwayml: {
        enabled: !!process.env.RUNWAYML_API_KEY,
        apiKey: process.env.RUNWAYML_API_KEY,
        baseUrl: 'https://api.dev.runwayml.com/v1' // Correct hostname per RunwayML docs
      },
      pika: {
        enabled: !!process.env.PIKA_API_KEY,
        apiKey: process.env.PIKA_API_KEY,
        baseUrl: 'https://api.pika.art/v1'
      },
      veo: {
        enabled: !!process.env.GEMINI_API_KEY, // Uses Gemini API key
        apiKey: process.env.GEMINI_API_KEY,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
      },
      heygen: {
        enabled: !!process.env.HEYGEN_API_KEY,
        apiKey: process.env.HEYGEN_API_KEY,
        baseUrl: 'https://api.heygen.com'
      },
      replicate: {
        enabled: ReplicateService.isAvailable(),
        baseUrl: 'https://api.replicate.com/v1',
        model: 'minimax/video-01', // ~6s text-to-video
        maxDuration: 6
      }
    };

    this.defaultProvider = process.env.VIDEO_GENERATION_PROVIDER || 'runwayml';
    this.uploadsDir = path.join(__dirname, '../../uploads/videos/generated');
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
    this.summarizerModel = process.env.OPENAI_SUMMARY_MODEL || process.env.OPENAI_SUMMARIZER_MODEL || 'gpt-4o-mini';
    
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Check if any video generation provider is available
   */
  isAvailable() {
    return Object.values(this.providers).some(provider => provider.enabled);
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return Object.entries(this.providers)
      .filter(([_, provider]) => provider.enabled)
      .map(([name, _]) => name);
  }

  /**
   * Get available providers with metadata (for API endpoint)
   */
  getProvidersMetadata() {
    const metadata = {
      runwayml: {
        name: 'RunwayML',
        enabled: this.providers.runwayml?.enabled || false,
        maxDuration: 8, // RunwayML supports 4, 6, or 8 seconds
        supportedDurations: [4, 6, 8],
        stability: 'high',
        rateLimit: 'per-account',
        description: 'High-quality video generation with fast processing. Supports 4, 6, or 8 second videos.',
        promptLimit: 1000,
        supportsPromptSummarization: true
      },
      pika: {
        name: 'Pika Labs',
        enabled: this.providers.pika?.enabled || false,
        maxDuration: 10, // Pika typically supports up to 10 seconds
        supportedDurations: [3, 5, 10],
        stability: 'medium',
        rateLimit: 'per-account',
        description: 'Creative video generation with good quality. Supports up to 10 second videos.',
        promptLimit: null,
        supportsPromptSummarization: false
      },
      veo: {
        name: 'Google Veo 3.1',
        enabled: this.providers.veo?.enabled || false,
        maxDuration: 60, // Veo can generate longer videos
        supportedDurations: [5, 10, 15, 30, 60],
        stability: 'high',
        rateLimit: '10 requests/day (free tier)',
        description: 'High-quality video generation with support for longer videos (up to 60 seconds). Limited to 10 requests per day on free tier.',
        promptLimit: null,
        supportsPromptSummarization: false
      },
      heygen: {
        name: 'HeyGen',
        enabled: this.providers.heygen?.enabled || false,
        maxDuration: 180, // Free: 3min, Pro: 5min, Scale: 30min
        supportedDurations: [30, 60, 120, 180, 300, 1800],
        stability: 'high',
        rateLimit: 'per-plan (Free: 3min max, Pro: 5min, Scale: 30min)',
        description: 'AI avatar video generation with lip-sync. Creates videos with speaking avatars from text. Supports longer videos (up to 30 minutes on Scale plan).',
        promptLimit: 1500, // HeyGen character limit for text
        supportsPromptSummarization: true
      }
    };

    // Return only enabled providers
    return Object.entries(metadata)
      .filter(([key, _]) => this.providers[key]?.enabled)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
  }

  /**
   * Generate video from prompt using the specified provider
   * @param {string} prompt - Video generation prompt
   * @param {object} options - Generation options
   * @returns {Promise<object>} Video generation result with URL
   */
  async generateVideo(prompt, options = {}) {
    const {
      provider = this.defaultProvider,
      duration = 5,
      style = 'cinematic',
      aspectRatio = '16:9',
      videoScript = null,
      storyboard = null,
      referenceImages = null // Character images for consistency
    } = options;

    if (!this.providers[provider]?.enabled) {
      throw new Error(`Video generation provider '${provider}' is not configured. Available providers: ${this.getAvailableProviders().join(', ')}`);
    }

    logger.info(`Generating video with ${provider} provider`);

    try {
      let result;
      
      switch (provider) {
        case 'runwayml':
          result = await this.generateWithRunwayML(prompt, { duration, style, aspectRatio, videoScript, storyboard });
          break;
        case 'pika':
          result = await this.generateWithPika(prompt, { duration, style, aspectRatio, videoScript, storyboard });
          break;
        case 'veo':
          result = await this.generateWithVeo(prompt, { duration, style, aspectRatio, videoScript, storyboard, referenceImages });
          break;
        case 'heygen':
          result = await this.generateWithHeyGen(prompt, { duration, style, aspectRatio, videoScript, storyboard });
          break;
        case 'replicate':
          result = await this.generateWithReplicate(prompt, { duration, aspectRatio });
          break;
        default:
          throw new Error(`Unsupported video generation provider: ${provider}`);
      }

      return result;
    } catch (error) {
      logger.error(`Video generation failed with ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Generate video using RunwayML SDK (recommended)
   */
  async generateWithRunwayMLSDK(prompt, options) {
    const { duration, style, aspectRatio } = options;
    
    try {
      const client = new RunwayML({
        apiKey: this.providers.runwayml.apiKey
      });

      logger.info('Creating RunwayML text-to-video task via SDK...');
      
      // Use a valid RunwayML text-to-video model
      // Available text-to-video models: veo3, veo3.1, veo3.1_fast
      // Pricing: veo3/veo3.1 = 40 credits/sec, veo3.1_fast = 20 credits/sec
      // Default to veo3.1_fast (cheaper and faster)
      const model = process.env.RUNWAYML_MODEL || 'veo3.1_fast';
      
      // Map aspect ratio to RunwayML's required pixel dimensions
      const ratio = this.mapAspectRatioToRunway(aspectRatio);
      
      // Duration is required by RunwayML API - must be 4, 6, or 8 seconds
      // Round to nearest valid duration
      const videoDuration = this.roundToValidDuration(duration || 5);
      
      const task = await client.textToVideo.create({
        model: model,
        promptText: prompt,
        ratio: ratio,
        duration: videoDuration
      }).waitForTaskOutput();

      logger.info('RunwayML task completed, downloading video...');
      
      // Download and store video locally
      const videoUrl = task.output[0];
      const localVideoPath = await this.downloadAndStoreVideo(videoUrl, 'runwayml');
      
      return {
        provider: 'runwayml',
        videoUrl: `/uploads/videos/generated/${path.basename(localVideoPath)}`,
        localPath: localVideoPath,
        generationId: task.id,
        status: 'completed',
        duration,
        style,
        aspectRatio
      };
    } catch (error) {
      logger.error('RunwayML SDK error:', error);
      
      // Extract more detailed error information if available
      let errorMessage = error.message || 'Unknown error';
      if (error.error && typeof error.error === 'object') {
        const issues = error.error.issues || [];
        if (issues.length > 0) {
          const issueMessages = issues.map(issue => issue.message || issue.path?.join('.')).join('; ');
          errorMessage = `${error.error.error || 'Validation error'}: ${issueMessages}`;
        } else if (error.error.error) {
          errorMessage = error.error.error;
        }
      }
      
      throw new Error(`RunwayML SDK error: ${errorMessage}`);
    }
  }

  /**
   * Generate video using RunwayML REST API (fallback)
   */
  async generateWithRunwayML(prompt, options) {
    const { duration, style, aspectRatio, videoScript, storyboard } = options;
    
    // Enhance prompt with script and storyboard if available
    let enhancedPrompt = prompt;
    if (videoScript) {
      enhancedPrompt += `\n\nVideo Script: ${videoScript}`;
    }
    if (storyboard) {
      enhancedPrompt += `\n\nStoryboard: ${storyboard}`;
    }

    const promptInfo = await this.prepareRunwayPrompt(enhancedPrompt);
    if (promptInfo.truncated) {
      logger.warn(
        `RunwayML prompt exceeded ${promptInfo.maxLength} characters (was ${promptInfo.originalLength}). ` +
        'It has been truncated to comply with API limits.'
      );
    }

    const baseOptions = { duration, style, aspectRatio };
    let generationResult;

    if (RunwayML && this.providers.runwayml.apiKey) {
      generationResult = await this.generateWithRunwayMLSDK(promptInfo.prompt, baseOptions);
    } else {
      generationResult = await this.generateWithRunwayMLRest(promptInfo.prompt, baseOptions);
    }

    const noteParts = [];
    if (generationResult.note) {
      noteParts.push(generationResult.note);
    }
    if (promptInfo.truncated) {
      noteParts.push(
        `Prompt truncated from ${promptInfo.originalLength} to ${promptInfo.maxLength} characters to meet RunwayML limits.`
      );
    }

    return {
      ...generationResult,
      note: noteParts.length ? noteParts.join(' ') : generationResult.note,
      promptTruncated: promptInfo.truncated,
      promptOriginalLength: promptInfo.originalLength,
      promptMaxLength: promptInfo.maxLength
    };
  }

  /**
   * Generate video using RunwayML REST API (fallback)
   */
  async generateWithRunwayMLRest(prompt, options) {
    const { duration, style, aspectRatio } = options;

    const model = process.env.RUNWAYML_MODEL || 'veo3.1_fast';
    const ratio = this.mapAspectRatioToRunway(aspectRatio);
    const videoDuration = this.roundToValidDuration(duration || 5);

    const requestData = JSON.stringify({
      model,
      promptText: prompt,
      ratio,
      duration: videoDuration
    });

    return new Promise((resolve, reject) => {
      const requestOptions = {
        hostname: 'api.dev.runwayml.com',
        path: '/v1/text-to-video',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.providers.runwayml.apiKey}`,
          'X-Runway-Version': '2024-11-06',
          'Content-Length': Buffer.byteLength(requestData)
        }
      };

      const req = https.request(requestOptions, async (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', async () => {
          try {
            let response;
            try {
              response = JSON.parse(data);
            } catch (parseError) {
              throw new Error(`RunwayML API returned invalid JSON: ${data}`);
            }
            
            if (res.statusCode !== 200 && res.statusCode !== 201) {
              const errorMsg = response.error?.message || response.error?.details || response.message || data;
              const errorDetails = response.error?.details || '';
              const docUrl = response.error?.docUrl || response.docUrl || '';
              throw new Error(`RunwayML API error: ${errorMsg}${errorDetails ? ' - ' + errorDetails : ''}${docUrl ? ' See: ' + docUrl : ''}`);
            }

            const taskId = response.id || response.task_id || response.task?.id;
            if (!taskId) {
              logger.error('RunwayML response:', response);
              throw new Error('No task ID returned from RunwayML. Response: ' + JSON.stringify(response));
            }

            logger.info(`RunwayML task created: ${taskId}, polling for completion...`);

            const videoUrl = await this.pollRunwayMLGeneration(taskId);
            const localVideoPath = await this.downloadAndStoreVideo(videoUrl, 'runwayml');
            
            resolve({
              provider: 'runwayml',
              videoUrl: `/uploads/videos/generated/${path.basename(localVideoPath)}`,
              localPath: localVideoPath,
              generationId: taskId,
              status: 'completed',
              duration,
              style,
              aspectRatio
            });
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`RunwayML API request failed: ${error.message}`));
      });

      req.write(requestData);
      req.end();
    });
  }

  /**
   * Poll RunwayML generation status
   */
  async pollRunwayMLGeneration(generationId, maxAttempts = 60, interval = 2000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, interval));

      try {
        const status = await this.checkRunwayMLStatus(generationId);
        
        // Check task status - RunwayML uses various status values
        const taskStatus = status.status || status.task?.status;
        
        // Normalize status to lowercase for consistent comparison
        const normalizedStatus = taskStatus?.toLowerCase();
        
        // Log full status response periodically or when status changes
        if (attempt % 10 === 0 || (normalizedStatus && normalizedStatus !== 'pending' && normalizedStatus !== 'processing' && normalizedStatus !== 'running')) {
          logger.info(`RunwayML task ${generationId} status (attempt ${attempt + 1}/${maxAttempts}): ${taskStatus || 'undefined'}`);
          logger.info(`RunwayML task ${generationId} full status response: ${JSON.stringify(status, null, 2)}`);
        }
        
        // Check for success FIRST - normalize to lowercase for comparison
        // Check both normalized status and original status (case-insensitive)
        const isSuccess = normalizedStatus === 'succeeded' || 
                         normalizedStatus === 'completed' ||
                         taskStatus === 'SUCCEEDED' ||
                         taskStatus === 'COMPLETED';
        
        if (isSuccess && status.output) {
          // RunwayML returns output as array of URLs
          const videoUrl = Array.isArray(status.output) ? status.output[0] : status.output;
          if (videoUrl) {
            logger.info(`RunwayML task ${generationId} completed successfully. Video URL: ${videoUrl}`);
            return videoUrl;
          } else {
            logger.warn(`RunwayML task ${generationId} has success status but no output URL`);
          }
        }
        
        // Check for failure status - RunwayML may use different failure indicators
        // Check both normalized status and failure fields
        const isFailure = normalizedStatus === 'failed' || 
                          normalizedStatus === 'error' ||
                          taskStatus === 'FAILED' ||
                          taskStatus === 'ERROR' ||
                          status.failure ||
                          status.error;
        
        if (isFailure) {
          const errorMsg = status.failure || 
                          status.error?.message || 
                          status.error || 
                          status.message || 
                          'Unknown error';
          const failureCode = status.failureCode || status.error?.code;
          logger.error(`RunwayML task ${generationId} failed: ${errorMsg}${failureCode ? ` (Code: ${failureCode})` : ''}`);
          // Re-throw immediately to stop polling - don't catch this error
          throw new Error(`RunwayML generation failed: ${errorMsg}${failureCode ? ` (Code: ${failureCode})` : ''}`);
        }
        
        // Task is still processing - handle both lowercase and uppercase
        if (normalizedStatus === 'pending' || normalizedStatus === 'processing' || normalizedStatus === 'running' ||
            taskStatus === 'PENDING' || taskStatus === 'PROCESSING' || taskStatus === 'RUNNING') {
          // Continue polling
          continue;
        }
        
        // Unknown status - log it but continue (might be a transient state)
        if (taskStatus && normalizedStatus && normalizedStatus !== 'succeeded' && normalizedStatus !== 'completed') {
          logger.warn(`RunwayML task ${generationId} has unknown status: ${taskStatus}`);
        }
      } catch (error) {
        // If error message contains "RunwayML generation failed", this is an intentional failure detection
        // Re-throw it immediately to stop polling
        if (error.message && error.message.includes('RunwayML generation failed')) {
          throw error;
        }
        
        // For other errors (network, parsing), log and retry unless it's the last attempt
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        logger.warn(`RunwayML status check failed (attempt ${attempt + 1}):`, error.message);
      }
    }

    throw new Error('RunwayML generation timeout');
  }

  /**
   * Check RunwayML generation status
   */
  async checkRunwayMLStatus(generationId) {
    return new Promise((resolve, reject) => {
      const requestOptions = {
        hostname: 'api.dev.runwayml.com', // Correct hostname
        path: `/v1/tasks/${generationId}`, // Task status endpoint
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.providers.runwayml.apiKey}`,
          'X-Runway-Version': '2024-11-06'
        }
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(new Error(`Failed to parse RunwayML status: ${error.message}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Generate video using Pika Labs API
   */
  async generateWithPika(prompt, options) {
    // Pika Labs API implementation
    // Similar structure to RunwayML but with Pika-specific endpoints
    throw new Error('Pika Labs integration not yet implemented. Please use RunwayML or configure Pika API.');
  }

  /**
   * Get image buffer and mime type from URL
   * Helper method to extract image data
   */
  async getImageBuffer(imageUrl) {
    let imageBuffer;
    let mimeType = 'image/jpeg';
    
    if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('./uploads/')) {
      const localPath = imageUrl.startsWith('/uploads/') 
        ? path.join(__dirname, '../../', imageUrl)
        : path.join(__dirname, '../../', imageUrl.replace('./', ''));
      
      if (fs.existsSync(localPath)) {
        imageBuffer = fs.readFileSync(localPath);
        const ext = path.extname(localPath).toLowerCase();
        mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
      } else {
        throw new Error(`Local image file not found: ${localPath}`);
      }
    } else if (imageUrl.includes('/uploads/') && (imageUrl.includes('iqonga.org') || imageUrl.includes('localhost'))) {
      const urlPath = new URL(imageUrl).pathname;
      const localPath = path.join(__dirname, '../../', urlPath);
      
      if (fs.existsSync(localPath)) {
        imageBuffer = fs.readFileSync(localPath);
        const ext = path.extname(localPath).toLowerCase();
        mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
      } else {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
        imageBuffer = Buffer.from(response.data);
        const contentType = response.headers['content-type'];
        mimeType = contentType && contentType.startsWith('image/') ? contentType : 'image/jpeg';
      }
    } else if (imageUrl.startsWith('data:')) {
      const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        const base64Data = matches[2];
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else {
        throw new Error('Invalid data URL format');
      }
    } else {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
      imageBuffer = Buffer.from(response.data);
      const contentType = response.headers['content-type'];
      mimeType = contentType && contentType.startsWith('image/') ? contentType : 'image/jpeg';
    }
    
    return { imageBuffer, mimeType };
  }

  /**
   * Upload image to Gemini Files API and return file URI
   * Veo API expects reference images to be uploaded first, then referenced by file URI
   * Reference: https://ai.google.dev/gemini-api/docs/video?example=dialogue
   */
  async uploadImageToGeminiFiles(imageUrl) {
    try {
      // Get image buffer and mime type using helper method
      const { imageBuffer, mimeType } = await this.getImageBuffer(imageUrl);
      let fileName = 'image.jpg';
      
      // Extract filename from URL if possible
      if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('./uploads/')) {
        const localPath = imageUrl.startsWith('/uploads/') 
          ? path.join(__dirname, '../../', imageUrl)
          : path.join(__dirname, '../../', imageUrl.replace('./', ''));
        fileName = path.basename(localPath);
      } else if (imageUrl.includes('/uploads/') && (imageUrl.includes('iqonga.org') || imageUrl.includes('localhost'))) {
        fileName = path.basename(new URL(imageUrl).pathname);
      } else if (!imageUrl.startsWith('data:')) {
        fileName = path.basename(new URL(imageUrl).pathname) || 'image.jpg';
      } else {
        fileName = `image.${mimeType.split('/')[1] || 'jpg'}`;
      }
      
      // Upload to Gemini Files API using multipart/form-data
      // Note: Gemini Files API might require different field name or format
      const FormData = require('form-data');
      const form = new FormData();
      
      // Try different field names - some APIs use 'file', others use 'data' or 'upload'
      form.append('file', imageBuffer, {
        filename: fileName,
        contentType: mimeType
      });
      
      // Also try appending metadata if needed
      form.append('mimeType', mimeType);
      
      // Gemini Files API endpoint: POST /v1beta/files
      // Reference: https://ai.google.dev/gemini-api/docs/files
      // Try without query parameter - API key should be in header only
      const uploadUrl = `${this.providers.veo.baseUrl}/files`;
      
      logger.info(`Uploading image to Gemini Files API: ${uploadUrl}`);
      logger.info(`Image buffer size: ${imageBuffer.length} bytes, MIME type: ${mimeType}, Filename: ${fileName}`);
      
      const uploadResponse = await axios.post(uploadUrl, form, {
        headers: {
          ...form.getHeaders(),
          'x-goog-api-key': this.providers.veo.apiKey
        },
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });
      
      logger.info(`Gemini Files API upload response status: ${uploadResponse.status}`);
      logger.info(`Gemini Files API upload response data type: ${typeof uploadResponse.data}`);
      
      // Log the actual data content - use JSON.stringify to ensure we see it
      const responseDataStr = JSON.stringify(uploadResponse.data);
      logger.info(`Gemini Files API upload response data (stringified): ${responseDataStr}`);
      
      // Also log the raw data object keys if it's an object
      if (typeof uploadResponse.data === 'object' && uploadResponse.data !== null) {
        logger.info(`Gemini Files API upload response data keys: ${Object.keys(uploadResponse.data).join(', ')}`);
        logger.info(`Gemini Files API upload response data values: ${JSON.stringify(Object.values(uploadResponse.data))}`);
      }
      
      logger.info(`Gemini Files API upload full response: ${JSON.stringify({
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        data: uploadResponse.data,
        headers: uploadResponse.headers
      }, null, 2)}`);
      
      // Extract file URI from response
      // Gemini Files API might return different formats:
      // - { file: { uri: "files/..." } }
      // - { uri: "files/..." }
      // - { name: "files/..." }
      // - Direct string in response.data
      let fileUri = null;
      
      if (typeof uploadResponse.data === 'string') {
        // Response might be a string
        try {
          const parsed = JSON.parse(uploadResponse.data);
          fileUri = parsed?.file?.uri || parsed?.uri || parsed?.name;
        } catch (e) {
          // Not JSON, might be the URI directly
          fileUri = uploadResponse.data;
        }
      } else if (uploadResponse.data) {
        fileUri = uploadResponse.data?.file?.uri || 
                  uploadResponse.data?.uri || 
                  uploadResponse.data?.name ||
                  uploadResponse.data?.file?.name;
      }
      
      // Check response headers for file location
      if (!fileUri && uploadResponse.headers?.location) {
        fileUri = uploadResponse.headers.location;
      }
      
      if (!fileUri) {
        logger.error('Gemini Files API upload response data:', uploadResponse.data);
        logger.error('Gemini Files API upload response headers:', uploadResponse.headers);
        logger.error('Full response object keys:', Object.keys(uploadResponse));
        throw new Error('Failed to get file URI from Gemini Files API. Response: ' + JSON.stringify(uploadResponse.data || 'empty'));
      }
      
      logger.info(`Image uploaded to Gemini Files API: ${fileUri}`);
      return fileUri;
      
    } catch (error) {
      if (error.response) {
        // Axios error with response
        logger.error(`Gemini Files API upload failed with status ${error.response.status}:`, error.response.data);
        logger.error(`Request URL: ${uploadUrl}`);
        throw new Error(`Failed to upload reference image: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        // Request was made but no response received
        logger.error(`Gemini Files API upload request failed:`, error.message);
        throw new Error(`Failed to upload reference image: No response from server - ${error.message}`);
      } else {
        // Error setting up request
        logger.error(`Failed to upload image to Gemini Files API: ${imageUrl}`, error);
        throw new Error(`Failed to upload reference image: ${error.message}`);
      }
    }
  }

  /**
   * Generate video using Google Veo 3.1 API
   * Official model: veo-3.1-generate-preview or veo-3.1-fast-generate-preview
   * Documentation: https://ai.google.dev/gemini-api/docs/video
   * 
   * Supports:
   * - Text-to-Video
   * - Ingredients to Video (reference images)
   * - Scene Extension (extend existing videos)
   * - First and Last Frame (transition between images)
   */
  async generateWithVeo(prompt, options = {}) {
    const { 
      duration = 5, 
      style = 'cinematic', 
      aspectRatio = '16:9',
      videoScript = null,
      storyboard = null,
      mode = 'text-to-video', // 'text-to-video', 'ingredients-to-video', 'video-extension', 'first-last-frame'
      referenceImages = null, // For ingredients-to-video (up to 3 images)
      referenceVideo = null, // For video extension
      firstFrame = null, // For first-last-frame mode
      lastFrame = null, // For first-last-frame mode
      quality = 'standard' // 'fast' or 'standard'
    } = options;

    if (!this.providers.veo?.enabled || !this.providers.veo?.apiKey) {
      throw new Error('Google Veo API key (GEMINI_API_KEY) not configured');
    }

    try {
      // Auto-detect mode based on provided inputs (must be declared before use)
      let actualMode = mode;
      if (referenceImages && referenceImages.length > 0 && mode === 'text-to-video') {
        // If reference images are provided, switch to ingredients-to-video mode
        actualMode = 'ingredients-to-video';
        logger.info(`Switching to ingredients-to-video mode due to ${referenceImages.length} reference images`);
      }

      // Official Veo model names from Google's documentation
      // Veo 3.1 (Preview): veo-3.1-generate-preview, veo-3.1-fast-generate-preview
      // Veo 3.0 (Stable): veo-3.0-generate-001, veo-3.0-fast-generate-001
      // Try Veo 3.1 first, fallback to Veo 3.0 if needed
      let modelName;
      if (quality === 'fast') {
        modelName = 'veo-3.1-fast-generate-preview'; // Try 3.1 fast first
      } else {
        modelName = 'veo-3.1-generate-preview'; // Try 3.1 standard first
      }
      
      logger.info(`Generating video with Veo 3.1 (${modelName}) - Mode: ${actualMode}`);

      // Build request based on official API structure
      // API endpoint: https://generativelanguage.googleapis.com/v1beta/models/{model}:predictLongRunning
      // Reference: https://ai.google.dev/gemini-api/docs/video?example=dialogue
      const apiUrl = `${this.providers.veo.baseUrl}/models/${modelName}:predictLongRunning`;
      
      // Base request structure - Veo API expects "instances" array
      const requestBody = {
        instances: [{
          prompt: prompt
        }]
      };

      // Add mode-specific parameters based on official API
      // Note: The instances array structure needs to be updated for different modes
      if (actualMode === 'ingredients-to-video' && referenceImages && referenceImages.length > 0) {
        // Ingredients to Video: up to 3 reference images
        // Reference: https://developers.googleblog.com/en/introducing-veo-3-1-and-new-creative-capabilities-in-the-gemini-api/
        // Try uploading to Files API first, but if that fails, use base64 directly
        logger.info(`Processing ${referenceImages.length} reference images for Veo API...`);
        
        let imageData = [];
        try {
          // Try uploading to Files API first
          logger.info(`Attempting to upload ${referenceImages.length} reference images to Gemini Files API...`);
          const fileUris = await Promise.all(
            referenceImages.slice(0, 3).map(img => this.uploadImageToGeminiFiles(img))
          );
          // Reference images format: Array of objects with file_uri (struct format)
          // Error says "No struct value found" - API expects objects, not strings
          // But mime_type is rejected, so use only file_uri
          imageData = fileUris.map(uri => ({
            file_uri: uri
          }));
          logger.info(`Successfully uploaded images to Files API, using file URIs as struct array`);
        } catch (uploadError) {
          // If Files API upload fails, try passing image URLs directly
          // Based on Veo API docs, maybe we can pass direct URLs
          logger.warn(`Files API upload failed (${uploadError.message}), trying to pass image URLs directly to Veo API...`);
          
          // Convert image URLs to full URLs
          // API expects struct/object format, not strings
          imageData = await Promise.all(
            referenceImages.slice(0, 3).map(async (imgUrl) => {
              // Convert local paths to full URLs
              let fullUrl = imgUrl;
              if (imgUrl.startsWith('/uploads/') || (imgUrl.includes('/uploads/') && !imgUrl.startsWith('http'))) {
                fullUrl = imgUrl.startsWith('http') 
                  ? imgUrl 
                  : `https://iqonga.org${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
              }
              // Return as struct/object with file_uri (mime_type is rejected)
              return {
                file_uri: fullUrl
              };
            })
          );
          logger.info(`Using direct image URLs as struct array (file_uri only), bypassing Files API`);
        }
        
        // Set referenceImages - must be array of structs/objects with file_uri
        requestBody.instances[0].referenceImages = imageData;
        logger.info(`Reference images format: ${JSON.stringify(imageData)}`);
      } else if (actualMode === 'video-extension' && referenceVideo) {
        // Scene Extension: extend existing video
        requestBody.instances[0].video = referenceVideo;
      } else if (mode === 'first-last-frame' && firstFrame && lastFrame) {
        // First and Last Frame: transition between two images
        requestBody.instances[0].image = firstFrame;
        requestBody.instances[0].lastFrame = lastFrame;
      }

      // Log the request body for debugging
      logger.info(`Veo API request body: ${JSON.stringify(requestBody, null, 2)}`);
      
      // Make API call using HTTPS
      // Try Veo 3.1 first, fallback to Veo 3.0 if 3.1 is not available
      let videoResult;
      try {
        videoResult = await this.callVeoAPI(apiUrl, requestBody);
      } catch (error) {
        // Don't try fallback for rate limit errors - both models share the same quota
        if (error.isRateLimit || error.statusCode === 429) {
          logger.error(`Veo API rate limit exceeded. Cannot use fallback - both models share the same quota.`);
          throw new Error(`Veo API rate limit exceeded. Please wait before generating more videos. Daily limit: 10 requests. See https://ai.google.dev/gemini-api/docs/rate-limits for details.`);
        }
        
        // If Veo 3.1 fails with 404 or "not found", try Veo 3.0 as fallback
        if (error.message.includes('404') || error.message.includes('not found') || error.message.includes('Not Found')) {
          logger.warn(`Veo 3.1 model ${modelName} not available, trying Veo 3.0 (stable)...`);
          const fallbackModel = quality === 'fast' 
            ? 'veo-3.0-fast-generate-001' 
            : 'veo-3.0-generate-001';
          const fallbackApiUrl = `${this.providers.veo.baseUrl}/models/${fallbackModel}:predictLongRunning`;
          logger.info(`Trying Veo 3.0 model: ${fallbackModel}`);
          try {
            videoResult = await this.callVeoAPI(fallbackApiUrl, requestBody);
            modelName = fallbackModel; // Update model name for response
            logger.info(`Successfully using Veo 3.0 model: ${fallbackModel}`);
          } catch (fallbackError) {
            logger.error(`Both Veo 3.1 and Veo 3.0 failed. 3.1 error: ${error.message}, 3.0 error: ${fallbackError.message}`);
            throw new Error(`Veo video generation failed. Tried 3.1 and 3.0: ${fallbackError.message}`);
          }
        } else {
          throw error;
        }
      }
      
      // Handle async operation response
      // Veo API returns an operation that needs to be polled
      // Response format: { name: "models/veo-3.1-generate-preview/operations/4n30brj7bot2" }
      if (videoResult.name) {
        // Use the full operation name as returned by the API
        // Format: "models/{model}/operations/{operation_id}"
        const operationName = videoResult.name;
        
        logger.info(`Veo operation started: ${operationName}`);
        
        // Poll for completion using the full operation name
        const finalResult = await this.pollVeoOperation(operationName);
        
        // Parse the response according to Veo API format
        // Response format: { response: { generateVideoResponse: { generatedSamples: [{ video: { uri: "..." } }] } } } }
        let videoUri = null;
        if (finalResult.generateVideoResponse && finalResult.generateVideoResponse.generatedSamples) {
          const sample = finalResult.generateVideoResponse.generatedSamples[0];
          if (sample && sample.video && sample.video.uri) {
            videoUri = sample.video.uri;
          }
        } else if (finalResult.generatedSamples) {
          // Alternative response format
          const sample = finalResult.generatedSamples[0];
          if (sample && sample.video && sample.video.uri) {
            videoUri = sample.video.uri;
          }
        } else if (finalResult.video && finalResult.video.uri) {
          // Direct video URI
          videoUri = finalResult.video.uri;
        }
        
        if (!videoUri) {
          logger.error('Veo API response structure:', JSON.stringify(finalResult, null, 2));
          throw new Error('Veo API did not return a video URI in expected format');
        }

        // Download and store the video
        const localVideoPath = await this.downloadAndStoreVideo(videoUri, 'veo');
        
        return {
          provider: 'veo',
          videoUrl: `/uploads/videos/generated/${path.basename(localVideoPath)}`,
          localPath: localVideoPath,
          generationId: operationName.split('/').pop() || uuidv4(),
          status: 'completed',
          duration,
          style,
          aspectRatio,
          mode,
          model: modelName
        };
      } else {
        logger.error('Veo API returned unexpected response format:', JSON.stringify(videoResult, null, 2));
        throw new Error('Veo API returned unexpected response format - no operation name found');
      }

    } catch (error) {
      logger.error('Veo 3.1 API error:', error);
      throw new Error(`Veo 3.1 generation failed: ${error.message}`);
    }
  }

  /**
   * Call Veo 3.1 API using HTTPS
   * Official API: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateVideos
   */
  async callVeoAPI(apiUrl, requestBody) {
    return new Promise((resolve, reject) => {
      const url = new URL(apiUrl);
      const postData = JSON.stringify(requestBody);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'x-goog-api-key': this.providers.veo.apiKey
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            // Handle empty response
            if (!data || data.trim() === '') {
              logger.error(`Veo API returned empty response. Status: ${res.statusCode}, Headers:`, res.headers);
              reject(new Error(`Veo API returned empty response. Status: ${res.statusCode}`));
              return;
            }
            
            const response = JSON.parse(data);
            
            // Log full response for debugging
            logger.info(`Veo API response (status ${res.statusCode}): ${JSON.stringify(response, null, 2)}`);
            
            if (res.statusCode !== 200 && res.statusCode !== 201) {
              const errorMsg = response.error?.message || response.error || JSON.stringify(response);
              
              // Handle rate limit errors (429) with more helpful messages
              if (res.statusCode === 429) {
                const rateLimitError = new Error(`Veo API rate limit exceeded: ${errorMsg}`);
                rateLimitError.statusCode = 429;
                rateLimitError.isRateLimit = true;
                reject(rateLimitError);
              } else {
                reject(new Error(`Veo API error: ${res.statusCode} - ${errorMsg}`));
              }
            } else {
              resolve(response);
            }
          } catch (parseError) {
            logger.error(`Failed to parse Veo API response. Status: ${res.statusCode}, Data length: ${data.length}, Data preview: ${data.substring(0, 500)}`);
            reject(new Error(`Failed to parse Veo API response: ${parseError.message} - Response preview: ${data.substring(0, 200)}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Veo API request failed: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Poll Veo operation for completion
   * Veo API returns async operations that need to be polled
   * Operation name format: "models/veo-3.1-generate-preview/operations/4n30brj7bot2"
   * According to API reference: https://ai.google.dev/api/all-methods
   * The operation URL should be: BASE_URL/{operation_name}
   */
  async pollVeoOperation(operationName, maxAttempts = 60, intervalMs = 5000) {
    // The operation name from API is the full path: "models/veo-3.1-generate-preview/operations/4n30brj7bot2"
    // Use it directly: https://generativelanguage.googleapis.com/v1beta/{operation_name}
    let operationUrl = `${this.providers.veo.baseUrl}/${operationName}`;
    
    logger.info(`Polling Veo operation: ${operationName} -> URL: ${operationUrl}`);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      
      try {
        const operation = await this.getVeoOperation(operationUrl);
        
        if (operation.done) {
          if (operation.error) {
            throw new Error(`Veo operation failed: ${operation.error.message || JSON.stringify(operation.error)}`);
          }
          // Return the full operation response for parsing
          return operation.response || operation;
        }
        
        logger.info(`Veo operation in progress (attempt ${attempt + 1}/${maxAttempts})...`);
      } catch (error) {
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        logger.warn(`Error polling operation: ${error.message}, retrying...`);
      }
    }
    
    throw new Error('Veo operation timed out');
  }

  /**
   * Get Veo operation status
   */
  async getVeoOperation(operationUrl) {
    return new Promise((resolve, reject) => {
      const url = new URL(operationUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + (url.search || ''),
        method: 'GET',
        headers: {
          'x-goog-api-key': this.providers.veo.apiKey,
          'Content-Type': 'application/json'
        }
      };
      
      logger.debug(`GET Veo operation: ${operationUrl}`);

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            // Log response headers for debugging
            logger.debug(`Veo operation response status: ${res.statusCode}, URL: ${operationUrl}`);
            
            // Handle empty response
            if (!data || data.trim() === '') {
              logger.error(`Veo operation returned empty response. Status: ${res.statusCode}, URL: ${operationUrl}`);
              reject(new Error(`Veo operation returned empty response. Status: ${res.statusCode}`));
              return;
            }
            
            const response = JSON.parse(data);
            
            // Log response for debugging (first 1000 chars)
            logger.debug(`Veo operation response (status ${res.statusCode}): ${JSON.stringify(response).substring(0, 1000)}`);
            
            if (res.statusCode !== 200) {
              const errorMsg = response.error?.message || response.error || JSON.stringify(response);
              logger.error(`Veo operation error: ${res.statusCode} - ${errorMsg}, URL: ${operationUrl}`);
              reject(new Error(`Failed to get operation: ${res.statusCode} - ${errorMsg}`));
            } else {
              resolve(response);
            }
          } catch (parseError) {
            logger.error(`Failed to parse Veo operation response. Status: ${res.statusCode}, URL: ${operationUrl}, Data length: ${data.length}, Data preview: ${data.substring(0, 500)}`);
            reject(new Error(`Failed to parse operation response: ${parseError.message} - Response preview: ${data.substring(0, 200)}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Operation request failed: ${error.message}`));
      });

      req.end();
    });
  }

  /**
   * Map aspect ratio to Veo format
   */
  mapAspectRatioToVeo(aspectRatio) {
    const mapping = {
      '16:9': '16:9',
      '9:16': '9:16',
      '1:1': '1:1',
      '4:3': '4:3',
      '3:4': '3:4'
    };
    return mapping[aspectRatio] || '16:9';
  }

  /**
   * Scene Extension - Extend an existing video (Flow feature)
   * Reference: https://developers.googleblog.com/en/introducing-veo-3-1-and-new-creative-capabilities-in-the-gemini-api/
   */
  async extendVideo(videoUrl, extensionPrompt, options = {}) {
    const {
      duration = 5,
      style = 'cinematic'
    } = options;

    logger.info('Extending video with Veo 3.1 Scene Extension...');

    return await this.generateWithVeo(extensionPrompt, {
      mode: 'video-extension',
      referenceVideo: videoUrl,
      duration,
      style
    });
  }

  /**
   * Ingredients to Video - Generate video from reference images (Flow feature)
   * Supports up to 3 reference images for character/style consistency
   * Reference: https://developers.googleblog.com/en/introducing-veo-3-1-and-new-creative-capabilities-in-the-gemini-api/
   */
  async generateFromIngredients(referenceImages, prompt, options = {}) {
    const {
      duration = 5,
      style = 'cinematic',
      aspectRatio = '16:9',
      quality = 'standard',
      provider = 'veo' // Default to Veo, but can use 'runwayml'
    } = options;

    if (!referenceImages || referenceImages.length === 0) {
      throw new Error('At least one reference image is required for Ingredients to Video');
    }

    if (referenceImages.length > 3) {
      logger.warn(`More than 3 reference images provided. Using first 3.`);
    }

    // Default to RunwayML for ingredients-to-video (Veo 3.1 doesn't support it properly)
    // Use Veo only if explicitly requested and RunwayML is not available
    if (provider === 'runwayml' && this.providers.runwayml?.enabled) {
      logger.info(`Generating video from ${referenceImages.length} reference images with RunwayML...`);
      return await this.generateWithRunwayMLFromImages(referenceImages.slice(0, 3), prompt, {
        duration,
        style,
        aspectRatio
      });
    }

    // If RunwayML is available, use it as default (Veo 3.1 ingredients-to-video is not working)
    if (!provider || provider === 'veo') {
      if (this.providers.runwayml?.enabled) {
        logger.info(`Veo 3.1 ingredients-to-video not supported, using RunwayML instead...`);
        return await this.generateWithRunwayMLFromImages(referenceImages.slice(0, 3), prompt, {
          duration,
          style,
          aspectRatio
        });
      }
    }

    // Only try Veo if explicitly requested and RunwayML is not available
    logger.warn(`Attempting Veo 3.1 for ingredients-to-video (may not work - Veo 3.1 doesn't properly support this feature)...`);
    return await this.generateWithVeo(prompt, {
      mode: 'ingredients-to-video',
      referenceImages: referenceImages.slice(0, 3), // Max 3 images
      duration,
      style,
      aspectRatio,
      quality
    });
  }

  /**
   * Generate video from images using RunwayML
   * RunwayML supports image-to-video generation
   */
  async generateWithRunwayMLFromImages(referenceImages, prompt, options = {}) {
    const { duration, style, aspectRatio } = options;
    
    if (!referenceImages || referenceImages.length === 0) {
      throw new Error('At least one reference image is required');
    }

    // Use the first image as the primary reference
    let primaryImage = referenceImages[0];
    
    // RunwayML requires promptImage to be:
    // 1. HTTPS URL (https://...)
    // 2. Runway upload URI (runway://...)
    // 3. Base64 data URL (data:image/...)
    // Convert relative paths to full HTTPS URLs
    if (primaryImage.startsWith('/uploads/') || (primaryImage.includes('/uploads/') && !primaryImage.startsWith('http'))) {
      // Convert relative path to full HTTPS URL
      // Use main domain (iqonga.org) not app.iqonga.org for public access
      const baseUrl = process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL || 'https://iqonga.org';
      primaryImage = primaryImage.startsWith('http') 
        ? primaryImage 
        : `${baseUrl}${primaryImage.startsWith('/') ? '' : '/'}${primaryImage}`;
      logger.info(`Converted relative image path to full URL: ${primaryImage}`);
    }
    
    // Ensure the image URL is publicly accessible (not app.iqonga.org which might be behind auth)
    if (primaryImage.includes('app.iqonga.org')) {
      primaryImage = primaryImage.replace('app.iqonga.org', 'iqonga.org');
      logger.info(`Replaced app.iqonga.org with iqonga.org for public access: ${primaryImage}`);
    }
    
    // Map aspect ratio to RunwayML's required pixel dimensions
    const ratio = this.mapAspectRatioToRunway(aspectRatio);
    
    // Duration is required by RunwayML API - must be 4, 6, or 8 seconds
    const videoDuration = this.roundToValidDuration(duration || 5);
    
    // For image-to-video, use gen4_turbo (specifically designed for Image input)
    // veo3.1_fast is for "Text or Image" but gen4_turbo is optimized for Image-to-Video
    const model = process.env.RUNWAYML_IMAGE_TO_VIDEO_MODEL || 'gen4_turbo';
    
    // RunwayML image-to-video endpoint
    // According to RunwayML API docs, use promptImage for image input
    const requestData = JSON.stringify({
      model: model,
      promptText: prompt,
      ratio: ratio,
      duration: videoDuration,
      promptImage: primaryImage // Primary image for image-to-video (RunwayML uses promptImage, not imageUrl)
    });

    return new Promise((resolve, reject) => {
      const requestOptions = {
        hostname: 'api.dev.runwayml.com',
        path: '/v1/image_to_video', // Image-to-video endpoint (underscore, not hyphen)
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.providers.runwayml.apiKey}`,
          'X-Runway-Version': '2024-11-06',
          'Content-Length': Buffer.byteLength(requestData)
        }
      };

      const req = https.request(requestOptions, async (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', async () => {
          try {
            let response;
            try {
              response = JSON.parse(data);
            } catch (parseError) {
              throw new Error(`RunwayML API returned invalid JSON: ${data}`);
            }
            
            if (res.statusCode !== 200 && res.statusCode !== 201) {
              const errorMsg = response.error?.message || response.error?.details || response.message || data;
              throw new Error(`RunwayML API error: ${errorMsg}`);
            }

            const taskId = response.id || response.task_id || response.task?.id;
            
            if (!taskId) {
              throw new Error('No task ID returned from RunwayML. Response: ' + JSON.stringify(response));
            }

            logger.info(`RunwayML image-to-video task created: ${taskId}, polling for completion...`);

            // Image-to-video takes longer, so increase timeout (120 attempts × 5s = 10 minutes)
            const videoUrl = await this.pollRunwayMLGeneration(taskId, 120, 5000);
            const localVideoPath = await this.downloadAndStoreVideo(videoUrl, 'runwayml');
            
            resolve({
              provider: 'runwayml',
              videoUrl: `/uploads/videos/generated/${path.basename(localVideoPath)}`,
              localPath: localVideoPath,
              status: 'completed',
              duration,
              style,
              aspectRatio
            });
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`RunwayML API request failed: ${error.message}`));
      });

      req.write(requestData);
      req.end();
    });
  }

  /**
   * First and Last Frame - Generate transition between two images (Flow feature)
   * Creates smooth video transition from first frame to last frame
   * Reference: https://developers.googleblog.com/en/introducing-veo-3-1-and-new-creative-capabilities-in-the-gemini-api/
   */
  async generateFromFrames(firstFrame, lastFrame, prompt, options = {}) {
    const {
      duration = 5,
      style = 'cinematic',
      aspectRatio = '16:9',
      quality = 'standard'
    } = options;

    if (!firstFrame || !lastFrame) {
      throw new Error('Both first frame and last frame images are required');
    }

    logger.info('Generating video transition with Veo 3.1 First and Last Frame...');

    return await this.generateWithVeo(prompt, {
      mode: 'first-last-frame',
      firstFrame,
      lastFrame,
      duration,
      style,
      aspectRatio,
      quality
    });
  }

  /**
   * Generate video using HeyGen API (AI avatar with text-to-speech)
   * Documentation: https://docs.heygen.com/reference/create-video
   * 
   * Creates videos with AI avatars speaking text with automatic lip-sync.
   * Supports longer videos (Free: 3min, Pro: 5min, Scale: 30min).
   */
  async generateWithHeyGen(prompt, options = {}) {
    const { 
      duration = 5, 
      style = 'cinematic', 
      aspectRatio = '16:9',
      videoScript = null,
      storyboard = null,
      avatarId = null, // Optional: specific avatar ID
      voiceId = null, // Optional: specific voice ID
      background = null // Optional: background image/video URL
    } = options;

    if (!this.providers.heygen?.enabled || !this.providers.heygen?.apiKey) {
      throw new Error('HeyGen API key (HEYGEN_API_KEY) not configured');
    }

    try {
      // Use videoScript if provided, otherwise use prompt
      const textToSpeak = videoScript || prompt;
      
      // Truncate text if it exceeds HeyGen's character limit (1500 chars)
      const maxChars = 1500;
      const finalText = textToSpeak.length > maxChars 
        ? textToSpeak.substring(0, maxChars - 3) + '...'
        : textToSpeak;

      logger.info(`Generating HeyGen avatar video with ${finalText.length} characters`);

      // Step 1: Get avatar ID if not provided
      let finalAvatarId = avatarId;
      if (!finalAvatarId) {
        logger.info('No avatar ID provided, fetching available avatars from HeyGen...');
        try {
          const avatars = await this.getHeyGenAvatars();
          if (avatars && avatars.length > 0) {
            const firstAvatar = avatars[0];
            finalAvatarId = firstAvatar.avatar_id || firstAvatar.id || firstAvatar.avatarId;
            if (!finalAvatarId) {
              throw new Error('Avatar object does not contain a recognizable ID field. Please provide an avatarId manually.');
            }
            logger.info(`Using default avatar: ${finalAvatarId} (from ${avatars.length} available avatars)`);
          } else {
            throw new Error('No avatars found in your HeyGen account. Please create an avatar in the HeyGen dashboard or provide an avatarId.');
          }
        } catch (fetchError) {
          throw new Error(`No avatar ID provided and unable to fetch available avatars from HeyGen: ${fetchError.message}. Please provide an avatarId or check your HeyGen account has available avatars.`);
        }
      }

      // Step 2: Get voice ID if not provided
      let finalVoiceId = voiceId;
      if (!finalVoiceId) {
        logger.info('No voice ID provided, fetching available voices from HeyGen...');
        try {
          const voices = await this.getHeyGenVoices();
          if (voices && voices.length > 0) {
            // Prefer English voices
            const englishVoice = voices.find(v => 
              (v.locale || v.language || '').toLowerCase().includes('en')
            ) || voices[0];
            finalVoiceId = englishVoice.voice_id || englishVoice.id || englishVoice.voiceId || englishVoice.code;
            if (!finalVoiceId) {
              throw new Error('Voice object does not contain a recognizable ID field. Please provide a voiceId manually.');
            }
            logger.info(`Using default voice: ${finalVoiceId}`);
          } else {
            throw new Error('No voices found in your HeyGen account. Please provide a voiceId.');
          }
        } catch (fetchError) {
          throw new Error(`No voice ID provided and unable to fetch available voices from HeyGen: ${fetchError.message}. Please provide a voiceId.`);
        }
      }

      // Step 3: Map resolution based on plan (Free: 720p max)
      // Default to 720p for compatibility
      const dimension = { width: 1280, height: 720 };

      // Step 4: Build HeyGen API request
      const endpoint = `${this.providers.heygen.baseUrl}/v2/video/generate`;
      
      const requestData = {
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: finalAvatarId,
              avatar_style: 'normal'
            },
            voice: {
              type: 'text',
              input_text: finalText,
              voice_id: finalVoiceId,
              speed: 1.0,
              pitch: 1.0
            },
            ...(background ? { background: { type: 'image', image_url: background } } : {
              background: { type: 'color', color: '#000000' }
            })
          }
        ],
        aspect_ratio: aspectRatio || '16:9',
        dimension: dimension,
        test: false
      };

      logger.info(`HeyGen request URL: ${endpoint}`);
      logger.info(`HeyGen request data: ${JSON.stringify(requestData, null, 2)}`);

      // Step 5: Submit video generation request
      const response = await axios.post(
        endpoint,
        requestData,
        {
          headers: {
            'X-Api-Key': this.providers.heygen.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 300000, // 5 minutes timeout
          httpsAgent: new https.Agent({
            rejectUnauthorized: true
          })
        }
      );

      logger.info(`HeyGen response status: ${response.status}`);

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`HeyGen API error: ${response.data?.error || response.data?.message || 'Unknown error'}`);
      }

      const result = response.data;
      logger.info(`HeyGen response: ${JSON.stringify(result, null, 2)}`);

      const videoId = result.data?.video_id || result.video_id || result.id;
      const videoUrl = result.data?.video_url || result.video_url || result.url;

      if (!videoId && !videoUrl) {
        logger.error(`HeyGen response structure: ${JSON.stringify(result, null, 2)}`);
        throw new Error('HeyGen did not return a video_id or video URL');
      }

      // Step 6: If we have a video URL directly, download it
      if (videoUrl) {
        const localVideoPath = await this.downloadAndStoreVideo(videoUrl, 'heygen');
        return {
          provider: 'heygen',
          videoUrl: `/uploads/videos/generated/${path.basename(localVideoPath)}`,
          localPath: localVideoPath,
          videoId: videoId,
          status: 'completed',
          duration,
          style,
          aspectRatio,
          metadata: {
            video_id: videoId,
            avatar_id: finalAvatarId,
            voice_id: finalVoiceId,
            ...result
          }
        };
      }

      // Step 7: If we only have a video_id, we need to poll for results
      // Return processing status - caller can poll using checkHeyGenVideoStatus
      return {
        provider: 'heygen',
        videoId: videoId,
        status: 'processing',
        duration,
        style,
        aspectRatio,
        metadata: {
          video_id: videoId,
          avatar_id: finalAvatarId,
          voice_id: finalVoiceId,
          ...result
        }
      };
    } catch (error) {
      const errorInfo = {
        message: error.message,
        url: error.config?.url || 'unknown',
        status: error.response?.status || 'no status',
        responseData: error.response?.data || {}
      };
      logger.error('HeyGen generation error:', errorInfo);
      
      let errorMessage = error.message;
      if (error.response?.data?.error) {
        const errorObj = error.response.data.error;
        if (typeof errorObj === 'object') {
          errorMessage = errorObj.message || errorObj.code || JSON.stringify(errorObj);
        } else {
          errorMessage = errorObj;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      throw new Error(`HeyGen error: ${errorMessage}`);
    }
  }

  /**
   * Fetch available avatars from HeyGen API
   */
  async getHeyGenAvatars() {
    try {
      const endpoint = `${this.providers.heygen.baseUrl}/v2/avatars`;
      logger.info(`Fetching avatars from: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: {
          'X-Api-Key': this.providers.heygen.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const avatars = response.data?.data?.avatars || 
                     response.data?.data || 
                     response.data?.avatars ||
                     response.data || [];
      
      logger.info(`Found ${Array.isArray(avatars) ? avatars.length : 0} available avatars from HeyGen`);
      return Array.isArray(avatars) ? avatars : [];
    } catch (error) {
      logger.error('Failed to fetch HeyGen avatars:', error);
      throw new Error(`Failed to fetch HeyGen avatars: ${error.message}`);
    }
  }

  /**
   * Fetch available voices from HeyGen API
   */
  async getHeyGenVoices() {
    try {
      // Try v2 first, fallback to v1
      let endpoint = `${this.providers.heygen.baseUrl}/v2/voices`;
      let response;
      
      try {
        response = await axios.get(endpoint, {
          headers: {
            'X-Api-Key': this.providers.heygen.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
      } catch (v2Error) {
        if (v2Error.response?.status === 404) {
          logger.info('v2/voices returned 404, trying v1/voices...');
          endpoint = `${this.providers.heygen.baseUrl}/v1/voices`;
          response = await axios.get(endpoint, {
            headers: {
              'X-Api-Key': this.providers.heygen.apiKey,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          });
        } else {
          throw v2Error;
        }
      }

      const voices = response.data?.data?.voices || 
                    response.data?.voices ||
                    response.data?.data ||
                    response.data || [];
      
      logger.info(`Found ${Array.isArray(voices) ? voices.length : 0} available voices from HeyGen`);
      return Array.isArray(voices) ? voices : [];
    } catch (error) {
      logger.error('Failed to fetch HeyGen voices:', error);
      throw new Error(`Failed to fetch HeyGen voices: ${error.message}`);
    }
  }

  /**
   * Check HeyGen video generation status
   */
  async checkHeyGenVideoStatus(videoId) {
    try {
      const endpoint = `${this.providers.heygen.baseUrl}/v1/video_status.get`;
      logger.info(`HeyGen status check: ${endpoint}?video_id=${videoId}`);
      
      const response = await axios.get(endpoint, {
        params: { video_id: videoId },
        headers: {
          'X-Api-Key': this.providers.heygen.apiKey
        },
        timeout: 30000,
        httpsAgent: new https.Agent({
          rejectUnauthorized: true
        })
      });

      logger.info(`HeyGen status check successful: ${JSON.stringify(response.data, null, 2)}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to check HeyGen video status:`, error);
      throw new Error(`Failed to check video status: ${error.message}`);
    }
  }

  /**
   * Download video from URL and store locally
   * Handles redirects (302, 301, etc.) which are common with Veo API
   */
  async downloadAndStoreVideo(videoUrl, provider) {
    return new Promise((resolve, reject) => {
      const filename = `${provider}_${uuidv4()}.mp4`;
      const filepath = path.join(this.uploadsDir, filename);
      const file = fs.createWriteStream(filepath);

      const protocol = videoUrl.startsWith('https') ? https : http;
      
      const downloadVideo = (url, maxRedirects = 5) => {
        if (maxRedirects <= 0) {
          fs.unlink(filepath, () => {});
          reject(new Error('Too many redirects when downloading video'));
          return;
        }

        const urlObj = new URL(url);
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: urlObj.pathname + (urlObj.search || ''),
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; VideoDownloader/1.0)'
          }
        };

        // Add API key if this is a Veo API URL
        if (provider === 'veo' && this.providers.veo?.apiKey) {
          options.headers['x-goog-api-key'] = this.providers.veo.apiKey;
        }

        const req = protocol.request(options, (response) => {
          // Handle redirects (301, 302, 307, 308)
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            let redirectUrl = response.headers.location;
            
            // Handle relative redirects by resolving against the original URL
            if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
              const baseUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.port ? ':' + urlObj.port : ''}`;
              redirectUrl = new URL(redirectUrl, baseUrl).href;
            }
            
            logger.info(`Following redirect ${response.statusCode} from ${url} to: ${redirectUrl}`);
            // Close current request
            response.destroy();
            // Follow redirect
            downloadVideo(redirectUrl, maxRedirects - 1);
            return;
          }

          // Handle successful response
          if (response.statusCode === 200) {
            response.pipe(file);

            file.on('finish', () => {
              file.close();
              logger.info(`Video downloaded and stored: ${filepath}`);
              resolve(filepath);
            });

            file.on('error', (error) => {
              fs.unlink(filepath, () => {});
              reject(new Error(`File write error: ${error.message}`));
            });
          } else {
            fs.unlink(filepath, () => {});
            reject(new Error(`Failed to download video: ${response.statusCode} ${response.statusMessage}`));
          }
        });

        req.on('error', (error) => {
          fs.unlink(filepath, () => {});
          reject(new Error(`Video download failed: ${error.message}`));
        });

        req.end();
      };

      // Start download
      downloadVideo(videoUrl);
    });
  }

  /**
   * Normalize and clamp prompts to RunwayML's 1000-character limit.
   */
  async prepareRunwayPrompt(text, maxLength = 1000) {
    if (!text) {
      return {
        prompt: '',
        truncated: false,
        originalLength: 0,
        maxLength
      };
    }

    let normalized = text.replace(/\s+/g, ' ').trim();
    const originalLength = normalized.length;

    if (!normalized.length) {
      return {
        prompt: 'Cinematic video scene.',
        truncated: false,
        originalLength,
        maxLength
      };
    }

    if (normalized.length <= maxLength) {
      return {
        prompt: normalized,
        truncated: false,
        originalLength,
        maxLength
      };
    }

    let condensed = await this.summarizePromptWithOpenAI(normalized, maxLength);
    if (!condensed) {
      condensed = this.compressPromptFallback(normalized, maxLength);
    }

    if (condensed.length > maxLength) {
      condensed = condensed.slice(0, maxLength);
    }

    if (!condensed.length) {
      condensed = normalized.slice(0, maxLength);
    }

    return {
      prompt: condensed,
      truncated: true,
      originalLength,
      maxLength
    };
  }

  /**
   * Map aspect ratio to RunwayML API format
   * RunwayML requires specific pixel dimensions, not aspect ratio strings
   * Valid values: "1280:720", "720:1280", "1104:832", "960:960", "832:1104"
   */
  mapAspectRatioToRunway(aspectRatio) {
    const mapping = {
      '16:9': '1280:720',   // Widescreen (16:9)
      '9:16': '720:1280',   // Vertical/Portrait (9:16)
      '1:1': '960:960',     // Square (1:1)
      '4:3': '1104:832',    // Standard (4:3) - closest match
      '3:4': '832:1104'     // Portrait 3:4
    };
    return mapping[aspectRatio] || '1280:720'; // Default to 16:9 widescreen
  }

  /**
   * Map aspect ratio to API-specific format (generic)
   */
  mapAspectRatio(aspectRatio) {
    return this.mapAspectRatioToRunway(aspectRatio);
  }

  /**
   * Round duration to valid RunwayML duration values
   * RunwayML only accepts 4, 6, or 8 seconds for text-to-video
   */
  roundToValidDuration(duration) {
    const validDurations = [4, 6, 8];
    
    // If duration is already valid, return it
    if (validDurations.includes(duration)) {
      return duration;
    }
    
    // Round to nearest valid duration
    let closest = validDurations[0];
    let minDiff = Math.abs(duration - closest);
    
    for (const validDuration of validDurations) {
      const diff = Math.abs(duration - validDuration);
      if (diff < minDiff) {
        minDiff = diff;
        closest = validDuration;
      }
    }
    
    return closest;
  }

  /**
   * Get video generation status
   */
  async getGenerationStatus(generationId, provider) {
    if (provider === 'runwayml') {
      return await this.checkRunwayMLStatus(generationId);
    }
    throw new Error(`Status check not implemented for provider: ${provider}`);
  }

  async saveVideoBuffer(buffer, provider, extension = 'mp4') {
    const safeExtension = extension.replace('.', '') || 'mp4';
    const filename = `${provider}_${uuidv4()}.${safeExtension}`;
    const filepath = path.join(this.uploadsDir, filename);
    await fsPromises.writeFile(filepath, buffer);
    logger.info(`Video saved locally: ${filepath}`);
    return filepath;
  }

  async summarizePromptWithOpenAI(prompt, targetLength) {
    if (!this.openai) {
      return null;
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.summarizerModel,
        temperature: 0.4,
        max_tokens: Math.min(512, targetLength + 100),
        messages: [
          {
            role: 'system',
            content: `You rewrite cinematic video prompts so they stay under ${targetLength} characters while preserving key scenes, brand names, camera cues, and emotional tone. Respond with the condensed prompt only.`
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const summary = completion.choices?.[0]?.message?.content?.trim();
      return summary || null;
    } catch (error) {
      logger.warn(`OpenAI summarization failed: ${error.message}`);
      return null;
    }
  }

  compressPromptFallback(prompt, maxLength) {
    if (prompt.length <= maxLength) {
      return prompt;
    }

    const headLength = Math.floor(maxLength * 0.65);
    const tailLength = maxLength - headLength - 5;

    if (tailLength <= 0) {
      return prompt.slice(0, maxLength);
    }

    return `${prompt.slice(0, headLength)} ... ${prompt.slice(prompt.length - tailLength)}`;
  }

  /**
   * Generate video using Replicate (MiniMax video-01 ~6s)
   */
  async generateWithReplicate(prompt, options = {}) {
    if (!this.providers.replicate?.enabled) {
      throw new Error('Replicate video provider not configured');
    }

    const model = this.providers.replicate.model || 'minimax/video-01';
    const maxDuration = this.providers.replicate.maxDuration || 6;
    const duration = Math.min(options.duration || 6, maxDuration);

    const input = { prompt };

    logger.info(`Generating video via Replicate model ${model} (~${duration}s)`);

    const prediction = await ReplicateService.runModel(model, input, {
      pollIntervalMs: 2000,
      maxAttempts: 120 // allow up to ~4 minutes
    });

    const outputs = prediction?.output;
    if (!outputs || (Array.isArray(outputs) && outputs.length === 0)) {
      throw new Error('Replicate returned no video output');
    }

    const sourceUrl = Array.isArray(outputs) ? outputs[0] : outputs;
    if (!sourceUrl || typeof sourceUrl !== 'string') {
      throw new Error(`Invalid Replicate video output format: ${JSON.stringify(outputs)}`);
    }

    return {
      provider: 'replicate',
      url: sourceUrl,
      durationSeconds: duration
    };
  }
}

module.exports = new VideoGenerationService();

