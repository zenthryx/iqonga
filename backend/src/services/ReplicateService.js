const axios = require('axios');
const logger = require('../utils/logger');

class ReplicateService {
  constructor() {
    this.apiToken = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY;
    this.baseUrl = 'https://api.replicate.com/v1';
    if (!this.apiToken) {
      logger.warn('Replicate API token not configured');
    }
  }

  isAvailable() {
    return Boolean(this.apiToken);
  }

  /**
   * Get available Replicate models/providers registry
   * Returns a list of models organized by category
   */
  getProviderRegistry() {
    if (!this.isAvailable()) {
      return [];
    }

    return [
      // Free-tier text-to-image models (Replicate "Try for Free" collection)
      {
        id: 'replicate_imagen_4_free',
        name: 'Google Imagen 4 (Free tier)',
        model: 'google/imagen-4',
        type: 'image_generation',
        category: 'text-to-image',
        description: 'High-quality text-to-image (Replicate free trial eligible)',
        available: true,
        cost: 'Free trial / then billed on Replicate',
        speed: 'medium',
        maxDimensions: '2048x2048',
        defaultInputs: {
          prompt: '',
          aspect_ratio: '1:1',
          output_format: 'png'
        }
      },
      {
        id: 'replicate_flux_1_1_pro_free',
        name: 'FLUX 1.1 Pro (Free tier)',
        model: 'black-forest-labs/flux-1.1-pro',
        type: 'image_generation',
        category: 'text-to-image',
        description: 'Fast, high-quality text-to-image (Replicate free trial eligible)',
        available: true,
        cost: 'Free trial / then billed on Replicate',
        speed: 'fast',
        maxDimensions: '2048x2048',
        defaultInputs: {
          prompt: '',
          aspect_ratio: '1:1',
          output_format: 'png'
        }
      },

      {
        id: 'replicate_flux_fast',
        name: 'Flux Schnell (Fast)',
        model: 'black-forest-labs/flux-schnell',
        type: 'image_generation',
        category: 'text-to-image',
        description: 'Fast, high-quality image generation. Great for quick iterations.',
        available: true,
        cost: '~$0.003 per image',
        speed: 'fast',
        maxDimensions: '1024x1024',
        defaultInputs: {
          prompt: '',
          aspect_ratio: '1:1',
          output_format: 'webp',
          output_quality: 80
        }
      },
      {
        id: 'replicate_flux_dev',
        name: 'Flux Dev',
        model: 'black-forest-labs/flux-dev',
        type: 'image_generation',
        category: 'text-to-image',
        description: 'High-quality image generation with more control.',
        available: true,
        cost: '~$0.055 per image',
        speed: 'medium',
        maxDimensions: '1440x1440',
        defaultInputs: {
          prompt: '',
          aspect_ratio: '1:1',
          output_format: 'webp',
          output_quality: 80
        }
      },
      {
        id: 'replicate_bg_removal',
        name: 'Background Remover',
        model: '851-labs/background-remover',
        type: 'image_editing',
        category: 'background-removal',
        description: 'Remove backgrounds from images automatically.',
        available: true,
        cost: '~$0.002 per image',
        speed: 'fast',
        defaultInputs: {
          image: null // File upload required
        }
      },

      // Video generation (Replicate "Try for Free")
      {
        id: 'replicate_minimax_video_01_free',
        name: 'MiniMax video-01 (Free tier)',
        model: 'minimax/video-01',
        type: 'video_generation',
        category: 'text-to-video',
        description: 'Text-to-video up to ~6 seconds (Replicate free trial eligible)',
        available: true,
        cost: 'Free trial / then billed on Replicate',
        speed: 'medium',
        defaultInputs: {
          prompt: '',
          // video-01 supports ~6s; keep prompts concise
          // Additional inputs (per model card) can be added when needed
        }
      },
      {
        id: 'replicate_video_matting',
        name: 'Video Matting',
        model: 'arielreplicate/robust_video_matting',
        type: 'video_editing',
        category: 'video-matting',
        description: 'Extract foreground from videos (green screen effect).',
        available: true,
        cost: '~$0.085 per video',
        speed: 'medium',
        defaultInputs: {
          video: null, // File upload required
          downsample_ratio: 0.25
        }
      }
    ];
  }

  /**
   * Get the latest version ID for a model
   * @param {string} modelSlug - Model slug (e.g., "black-forest-labs/flux-schnell")
   */
  async getLatestVersion(modelSlug) {
    const headers = {
      Authorization: `Token ${this.apiToken}`,
      'Content-Type': 'application/json'
    };

    try {
      // First, get the model to find the latest version
      const modelResponse = await axios.get(
        `${this.baseUrl}/models/${modelSlug}`,
        { headers }
      );
      
      if (modelResponse.data?.latest_version?.id) {
        return modelResponse.data.latest_version.id;
      }
      
      // Fallback: get versions list
      const versionsResponse = await axios.get(
        `${this.baseUrl}/models/${modelSlug}/versions`,
        { headers }
      );
      
      if (versionsResponse.data?.results && versionsResponse.data.results.length > 0) {
        return versionsResponse.data.results[0].id;
      }
      
      throw new Error(`No versions found for model ${modelSlug}`);
    } catch (error) {
      // Extract error message to avoid circular structure
      const errorMsg = error.response?.data?.detail || 
                      error.response?.data?.error || 
                      error.message || 
                      'Unknown error';
      throw new Error(`Failed to get version for ${modelSlug}: ${errorMsg}`);
    }
  }

  /**
   * Run a Replicate model and poll until completion.
   * @param {string} model - Replicate model slug (e.g., "black-forest-labs/flux-schnell") or version ID
   * @param {object} input - Model input payload
   * @param {object} options - { pollIntervalMs, maxAttempts }
   */
  async runModel(model, input = {}, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Replicate API token not configured');
    }

    const pollIntervalMs = options.pollIntervalMs || 2000;
    const maxAttempts = options.maxAttempts || 60; // ~2 minutes

    const headers = {
      Authorization: `Token ${this.apiToken}`,
      'Content-Type': 'application/json'
    };

    try {
      // If model contains a slash, it's a slug - get the latest version
      let versionId = model;
      if (model.includes('/')) {
        versionId = await this.getLatestVersion(model);
      }

      // Create prediction
      const createRes = await axios.post(
        `${this.baseUrl}/predictions`,
        { version: versionId, input },
        { headers }
      );

      let prediction = createRes.data;
      let attempts = 0;

      while (
        prediction.status === 'starting' ||
        prediction.status === 'processing' ||
        prediction.status === 'queued'
      ) {
        if (attempts >= maxAttempts) {
          throw new Error(`Replicate prediction timed out after ${maxAttempts} attempts`);
        }

        await new Promise((r) => setTimeout(r, pollIntervalMs));
        const pollRes = await axios.get(
          `${this.baseUrl}/predictions/${prediction.id}`,
          { headers }
        );
        prediction = pollRes.data;
        attempts += 1;
      }

      if (prediction.status !== 'succeeded') {
        const errMsg = prediction.error || prediction.status || 'Unknown error';
        throw new Error(`Replicate prediction failed: ${errMsg}`);
      }

      return prediction;
    } catch (error) {
      // Extract error message from axios error to avoid circular structure issues
      let errorMessage = 'Replicate API error';
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.error?.detail || 
                      error.response.data?.error?.message || 
                      error.response.data?.error ||
                      error.response.statusText ||
                      `HTTP ${error.response.status}`;
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'No response from Replicate API';
      } else if (error.message) {
        // Error in setting up request
        errorMessage = error.message;
      }
      
      logger.error(`Replicate model run failed: ${errorMessage}`);
      throw new Error(`Replicate error: ${errorMessage}`);
    }
  }
}

module.exports = new ReplicateService();

