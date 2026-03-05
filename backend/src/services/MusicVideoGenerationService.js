const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const FormData = require('form-data');

/**
 * Music Video Generation Service
 * Creates avatar videos with music using:
 * - Vidnoz API - Avatar videos with lip-sync (primary)
 * - HeyGen API - Avatar videos with lip-sync (fallback, up to 30 minutes)
 */
class MusicVideoGenerationService {
  constructor() {
    this.providers = {
      vidnoz: {
        enabled: !!process.env.VIDNOZ_API_KEY,
        apiKey: process.env.VIDNOZ_API_KEY,
        baseUrl: 'https://devapi.vidnoz.com'
      },
      heygen: {
        enabled: !!process.env.HEYGEN_API_KEY,
        apiKey: process.env.HEYGEN_API_KEY,
        baseUrl: 'https://api.heygen.com'
      }
    };

    // Provider priority order (Vidnoz first, HeyGen as fallback)
    this.providerPriority = ['vidnoz', 'heygen'];
    this.defaultProvider = process.env.MUSIC_VIDEO_GENERATION_PROVIDER || 'vidnoz';
    this.uploadsDir = path.join(__dirname, '../../uploads/videos/music-videos');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Check if any music video generation provider is available
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
   * Generate music video from music track and avatar configuration
   * @param {string} musicId - ID of the generated music track
   * @param {string} audioUrl - URL to the music audio file
   * @param {object} options - Generation options
   * @returns {Promise<object>} Music video generation result
   */
  async generateMusicVideo(musicId, audioUrl, options = {}) {
    const {
      provider = null, // If null, use automatic fallback
      avatarId = null, // Avatar ID from provider (optional, will use default if not provided)
      avatarType = 'photo', // 'photo', 'template', 'custom'
      script = null, // Optional script/text for avatar to speak
      background = null, // Background image/video URL
      aspectRatio = '16:9',
      resolution = '1080p'
    } = options;

    // If provider specified, use it; otherwise try providers in priority order
    const providersToTry = provider 
      ? [provider]
      : this.providerPriority.filter(p => this.providers[p]?.enabled);

    if (providersToTry.length === 0) {
      throw new Error('No music video generation providers are configured. Please set HEYGEN_API_KEY in environment variables.');
    }

    let lastError = null;

    // Try each provider in priority order until one succeeds
    for (const providerName of providersToTry) {
      if (!this.providers[providerName]?.enabled) {
        logger.warn(`Provider ${providerName} is not enabled, skipping...`);
        continue;
      }

      try {
        logger.info(`Attempting music video generation with ${providerName} provider`);
        const result = await this.generateWithProvider(providerName, musicId, audioUrl, {
          avatarId,
          avatarType,
          script,
          background,
          aspectRatio,
          resolution
        });
        
        logger.info(`Successfully generated music video with ${providerName}`);
        return result;
      } catch (error) {
        // Safely extract error information without circular references
        const errorInfo = {
          message: error.message,
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          } : undefined
        };
        logger.warn(`Music video generation failed with ${providerName}:`, errorInfo);
        lastError = error;
        
        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw new Error(`All music video generation providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Generate music video with specific provider
   */
  async generateWithProvider(provider, musicId, audioUrl, options) {
    if (provider === 'vidnoz') {
      return await this.generateWithVidnoz(musicId, audioUrl, options);
    } else if (provider === 'heygen') {
      return await this.generateWithHeyGen(musicId, audioUrl, options);
    }
    throw new Error(`Unsupported provider: ${provider}. Supported providers: vidnoz, heygen`);
  }

  /**
   * Get Vidnoz avatar list
   * Documentation: https://www.vidnoz.com/docs/get-avatar-list.html
   */
  async getVidnozAvatars() {
    try {
      const endpoint = `${this.providers.vidnoz.baseUrl}/v2/avatar/list`;
      logger.info(`Fetching Vidnoz avatars from: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${this.providers.vidnoz.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      logger.info(`Vidnoz avatars response status: ${response.status}`);
      
      // Parse response - Vidnoz may return data in different structures
      const avatars = response.data?.data?.avatars || 
                     response.data?.data || 
                     response.data?.avatars ||
                     response.data || [];
      
      logger.info(`Found ${Array.isArray(avatars) ? avatars.length : 0} available avatars from Vidnoz`);
      return Array.isArray(avatars) ? avatars : [];
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
      logger.error('Failed to fetch Vidnoz avatars:', errorDetails);
      throw new Error(`Failed to fetch Vidnoz avatars: ${error.message}`);
    }
  }

  /**
   * Generate music video using Vidnoz API
   * Documentation: https://www.vidnoz.com/docs/generate-video-with-avatar.html
   */
  async generateWithVidnoz(musicId, audioUrl, options) {
    const { avatarId, avatarType, script, background, aspectRatio, resolution } = options;
    
    if (!this.providers.vidnoz.enabled) {
      throw new Error('Vidnoz API key not configured');
    }

    try {
      // Step 1: Prepare audio URL for Vidnoz
      // Vidnoz supports direct audio URLs via voice.file.url
      let audioUrlForVidnoz = audioUrl;
      if (!audioUrl.startsWith('http')) {
        // Relative path - convert to full HTTPS URL
        const baseUrl = process.env.BACKEND_URL || process.env.PUBLIC_BASE_URL || 'https://www.iqonga.org';
        audioUrlForVidnoz = `${baseUrl}${audioUrl.startsWith('/') ? '' : '/'}${audioUrl}`;
      }
      
      logger.info(`Using audio URL for Vidnoz: ${audioUrlForVidnoz.substring(0, 100)}...`);

      // Step 2: Get avatar ID if not provided
      let finalAvatarId = avatarId;
      if (!finalAvatarId) {
        logger.info('No avatar ID provided, fetching available avatars from Vidnoz...');
        try {
          const avatars = await this.getVidnozAvatars();
          if (avatars && avatars.length > 0) {
            // Use the first available avatar
            const firstAvatar = avatars[0];
            finalAvatarId = firstAvatar.id || firstAvatar.avatar_id || firstAvatar.avatarId;
            
            if (!finalAvatarId) {
              logger.warn('Avatar object structure:', JSON.stringify(firstAvatar, null, 2));
              throw new Error('Avatar object does not contain a recognizable ID field. Please provide an avatarId manually.');
            }
            
            logger.info(`Using default avatar: ${finalAvatarId} (from ${avatars.length} available avatars)`);
          } else {
            throw new Error('No avatars found in your Vidnoz account. Please create an avatar in the Vidnoz dashboard or provide an avatarId.');
          }
        } catch (fetchError) {
          throw new Error(`No avatar ID provided and unable to fetch available avatars from Vidnoz: ${fetchError.message}. Please provide an avatarId or check your Vidnoz account has available avatars.`);
        }
      }

      // Step 3: Map aspect ratio to Vidnoz format
      // Vidnoz uses: 1=16:9, 2=9:16, 3=1:1
      let aspectRatioValue = 1; // Default to 16:9
      if (aspectRatio === '9:16') {
        aspectRatioValue = 2;
      } else if (aspectRatio === '1:1') {
        aspectRatioValue = 3;
      }

      // Step 4: Build request data as JSON
      // Vidnoz API expects JSON format, not multipart/form-data
      const requestData = {
        name: `music_video_${musicId.substring(0, 8)}`,
        aspect: aspectRatioValue,
        avatar: {
          id: finalAvatarId,
          style: 1 // 1=full body (default)
        },
        voice: {
          file: {
            url: audioUrlForVidnoz
          }
        }
      };

      // Background settings
      if (background) {
        requestData.background = {
          media: {
            url: background,
            fit: 1 // 1=cover
          }
        };
      } else {
        requestData.background = {
          color: '#000000' // Black background
        };
      }

      // Step 5: Make API request
      const endpoint = `${this.providers.vidnoz.baseUrl}/v2/task/avatar-to-video`;
      logger.info(`Vidnoz request URL: ${endpoint}`);
      logger.info(`Vidnoz request data: ${JSON.stringify(requestData, null, 2)}`);

      const response = await axios.post(
        endpoint,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.providers.vidnoz.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 300000, // 5 minutes timeout
          httpsAgent: new https.Agent({
            rejectUnauthorized: true
          })
        }
      );
      
      logger.info(`Vidnoz response status: ${response.status}`);
      logger.info(`Vidnoz response: ${JSON.stringify(response.data, null, 2)}`);

      if (response.status !== 200 && response.data?.code !== 200) {
        throw new Error(`Vidnoz API error: ${response.data?.message || response.data?.error || 'Unknown error'}`);
      }

      const result = response.data;
      const taskId = result.data?.task_id || result.task_id;

      if (!taskId) {
        throw new Error('Vidnoz did not return a task_id');
      }

      logger.info(`Vidnoz video generation started. Task ID: ${taskId}`);

      return {
        provider: 'vidnoz',
        videoId: taskId,
        status: 'processing',
        videoUrl: null, // Will be available after polling
        metadata: {
          task_id: taskId,
          audio_url: audioUrlForVidnoz,
          avatar_id: finalAvatarId,
          aspect_ratio: aspectRatio,
          created_at: new Date().toISOString()
        }
      };
    } catch (error) {
      // Safely extract error information
      const errorInfo = {
        message: error.message,
        url: error.config?.url || 'unknown',
        status: error.response?.status || 'no status',
        responseData: error.response?.data || {}
      };
      logger.error('Vidnoz generation error:', errorInfo);
      throw new Error(`Vidnoz error: ${error.response?.data?.message || error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get avatar details by ID to verify it exists
   * Documentation: https://docs.heygen.com/reference/retrieve-avatar-details
   */
  async getHeyGenAvatarDetails(avatarId) {
    try {
      const endpoint = `${this.providers.heygen.baseUrl}/v2/avatars/${avatarId}`;
      logger.info(`Fetching avatar details from: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: {
          'X-Api-Key': this.providers.heygen.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data && response.data.data) {
        return response.data.data;
      }
      return response.data;
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
      logger.warn('Failed to fetch HeyGen avatar details:', errorDetails);
      return null;
    }
  }

  /**
   * Fetch available avatars from HeyGen API
   * Documentation: https://docs.heygen.com/reference/list-avatars-v2
   * 
   * Note: You don't need to CREATE avatars - HeyGen provides pre-made avatars
   * that are available in your account. This method fetches the list of available avatars.
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
        timeout: 30000 // Increased timeout
      });

      logger.info(`HeyGen avatars response status: ${response.status}`);
      logger.info(`HeyGen avatars response keys: ${JSON.stringify(Object.keys(response.data || {}))}`);

      // Log the full response for debugging (truncated if too large)
      try {
        const responseStr = JSON.stringify(response.data, null, 2);
        if (responseStr && responseStr.length > 0) {
          if (responseStr.length > 2000) {
            logger.info(`Full response (truncated): ${responseStr.substring(0, 2000)}...`);
          } else {
            logger.info(`Full response: ${responseStr}`);
          }
        } else {
          logger.warn('Response data is empty or cannot be stringified');
          logger.info(`Response data type: ${typeof response.data}, value: ${response.data}`);
        }
      } catch (stringifyError) {
        logger.error('Failed to stringify response:', stringifyError.message);
        logger.info(`Response data (raw):`, response.data);
      }

      // Check for errors in response
      if (response.data && response.data.error) {
        logger.error('HeyGen API returned an error:', response.data.error);
        throw new Error(`HeyGen API error: ${JSON.stringify(response.data.error)}`);
      }

      // HeyGen API returns data in response.data.data.avatars structure
      let avatars = [];
      if (response.data && response.data.data) {
        // The actual structure is: response.data.data.avatars (array)
        if (response.data.data.avatars && Array.isArray(response.data.data.avatars)) {
          avatars = response.data.data.avatars;
          logger.info(`Found avatars in response.data.data.avatars (correct structure)`);
        } else if (Array.isArray(response.data.data)) {
          // Fallback: sometimes it might be a direct array
          avatars = response.data.data;
          logger.info(`Found avatars in response.data.data (direct array)`);
        } else if (response.data.data && typeof response.data.data === 'object') {
          // Check for other possible nested structures
          logger.warn('Response data structure:', Object.keys(response.data.data || {}));
        }
      }

      logger.info(`Found ${avatars.length} available avatars from HeyGen`);
      if (avatars.length > 0) {
        logger.info(`First avatar sample: ${JSON.stringify(avatars[0], null, 2)}`);
        // Log all avatar IDs for reference
        const avatarIds = avatars.slice(0, 5).map(av => ({
          avatar_id: av.avatar_id,
          id: av.id,
          avatarId: av.avatarId,
          name: av.name || av.avatar_name
        }));
        logger.info(`Sample avatar IDs: ${JSON.stringify(avatarIds, null, 2)}`);
      } else {
        logger.warn('No avatars found in parsed response');
      }

      return avatars;
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      };
      logger.error('Failed to fetch HeyGen avatars:', errorDetails);
      throw new Error(`Failed to fetch HeyGen avatars: ${error.message}${error.response?.data ? ` - ${JSON.stringify(error.response.data)}` : ''}`);
    }
  }

  /**
   * Generate music video using HeyGen API
   * Documentation: https://docs.heygen.com/
   */
  async generateWithHeyGen(musicId, audioUrl, options) {
    const { avatarId, avatarType, script, background, aspectRatio, resolution } = options;
    
    // Convert resolution string to dimension object for HeyGen API
    // HeyGen expects dimension: { width, height } instead of resolution string
    // According to HeyGen docs: Free plan limit is 720p, must explicitly set dimension
    let dimension = null;
    if (resolution && resolution !== 'auto') {
      if (resolution === '720p') {
        dimension = { width: 1280, height: 720 };
      } else if (resolution === '1080p') {
        dimension = { width: 1920, height: 1080 };
      } else if (resolution === '4K') {
        dimension = { width: 3840, height: 2160 };
      }
    } else {
      // Default to 720p for free plans (as per HeyGen documentation)
      // Free API Plan limit is 720p, so we explicitly set it to avoid errors
      dimension = { width: 1280, height: 720 };
    }
    
    try {
      // Step 1: Download audio file if it's a local path
      let audioFilePath = audioUrl;
      if (audioUrl.startsWith('http')) {
        // Download the audio file
        audioFilePath = await this.downloadAudioFile(audioUrl, musicId);
      } else if (!path.isAbsolute(audioUrl)) {
        // Relative path, make it absolute
        audioFilePath = path.join(__dirname, '../../uploads/music/generated', path.basename(audioUrl));
      }

      // Step 2: Upload audio file to HeyGen
      // HeyGen requires audio files to be uploaded directly for proper lip-sync
      // We'll upload the audio file and use the uploaded URL in the video generation request
      logger.info(`Uploading audio file to HeyGen: ${audioFilePath}`);
      
      let audioUrlForHeyGen;
      try {
        // Upload audio file to HeyGen using multipart/form-data
        const formData = new FormData();
        formData.append('file', fs.createReadStream(audioFilePath));
        formData.append('type', 'audio');
        
        const uploadEndpoint = `${this.providers.heygen.baseUrl}/v1/upload`;
        logger.info(`Uploading audio to HeyGen: ${uploadEndpoint}`);
        
        const uploadResponse = await axios.post(uploadEndpoint, formData, {
          headers: {
            'X-Api-Key': this.providers.heygen.apiKey,
            ...formData.getHeaders()
          },
          timeout: 120000, // 2 minutes for upload
          httpsAgent: new https.Agent({
            rejectUnauthorized: true
          })
        });
        
        logger.info(`HeyGen audio upload response: ${JSON.stringify(uploadResponse.data, null, 2)}`);
        
        // Extract the uploaded audio URL from response
        audioUrlForHeyGen = uploadResponse.data?.data?.url || 
                           uploadResponse.data?.url || 
                           uploadResponse.data?.data?.file_url ||
                           uploadResponse.data?.file_url;
        
        if (!audioUrlForHeyGen) {
          logger.warn('HeyGen did not return audio URL after upload, falling back to direct URL');
          // Fallback: use direct URL if upload doesn't return a URL
          audioUrlForHeyGen = audioUrl.startsWith('http') ? audioUrl : 
            `${process.env.BACKEND_URL || 'https://www.iqonga.org'}${audioUrl}`;
        } else {
          logger.info(`Successfully uploaded audio to HeyGen: ${audioUrlForHeyGen}`);
        }
      } catch (uploadError) {
        logger.warn(`Failed to upload audio to HeyGen, using direct URL: ${uploadError.message}`);
        // Fallback: use direct URL if upload fails
        audioUrlForHeyGen = audioUrl.startsWith('http') ? audioUrl : 
          `${process.env.BACKEND_URL || 'https://www.iqonga.org'}${audioUrl}`;
      }

      // Step 3: Get avatar ID if not provided
      // Note: HeyGen requires an avatar_id. You don't need to CREATE avatars - 
      // HeyGen provides pre-made avatars in your account. We fetch the list of available avatars.
      let finalAvatarId = avatarId;
      if (!finalAvatarId) {
        logger.info('No avatar ID provided, fetching available avatars from HeyGen...');
        try {
          const avatars = await this.getHeyGenAvatars();
          if (avatars && avatars.length > 0) {
            // Find the first avatar with an ID (could be avatar_id, id, or avatarId)
            const firstAvatar = avatars[0];
            finalAvatarId = firstAvatar.avatar_id || firstAvatar.id || firstAvatar.avatarId;
            
            if (!finalAvatarId) {
              logger.warn('Avatar object structure:', JSON.stringify(firstAvatar, null, 2));
              throw new Error('Avatar object does not contain a recognizable ID field. Please provide an avatarId manually.');
            }
            
            logger.info(`Using default avatar: ${finalAvatarId} (from ${avatars.length} available avatars)`);
          } else {
            throw new Error('No avatars found in your HeyGen account. Please create an avatar in the HeyGen dashboard or provide an avatarId.');
          }
        } catch (fetchError) {
          throw new Error(`No avatar ID provided and unable to fetch available avatars from HeyGen: ${fetchError.message}. Please provide an avatarId or check your HeyGen account has available avatars.`);
        }
      } else {
        // Validate avatar ID format and try to get correct API format
        logger.info(`Using provided avatar ID: ${finalAvatarId}`);
        
        // The dashboard ID might not match the API ID format
        // Try to fetch the avatar list and find a matching avatar
        try {
          logger.info('Fetching avatar list to find correct API ID format...');
          const avatars = await this.getHeyGenAvatars();
          if (avatars && avatars.length > 0) {
            // Try to find an avatar that matches the provided ID
            // First try exact match, then try partial match (in case of different ID formats)
            // Also search by name in case the user provided a name instead of ID
            let matchedAvatar = avatars.find(av => 
              av.avatar_id === finalAvatarId || 
              av.id === finalAvatarId || 
              av.avatarId === finalAvatarId ||
              (av.avatar_name && av.avatar_name.toLowerCase().includes(finalAvatarId.toLowerCase())) ||
              (av.name && av.name.toLowerCase().includes(finalAvatarId.toLowerCase()))
            );
            
            if (matchedAvatar) {
              // Use the avatar_id from the API response (this is the correct format)
              const apiAvatarId = matchedAvatar.avatar_id;
              if (apiAvatarId && apiAvatarId !== finalAvatarId) {
                logger.info(`Found matching avatar "${matchedAvatar.avatar_name}". Using API avatar ID: ${apiAvatarId} (was: ${finalAvatarId})`);
                finalAvatarId = apiAvatarId;
              } else {
                logger.info(`Avatar ID matches API format: ${finalAvatarId}`);
              }
            } else {
              // Search for "Ayana" by name if the ID doesn't match
              const ayanaAvatar = avatars.find(av => 
                (av.avatar_name && av.avatar_name.toLowerCase().includes('ayana')) ||
                (av.name && av.name.toLowerCase().includes('ayana'))
              );
              
              if (ayanaAvatar) {
                logger.info(`Found "Ayana" avatar by name. Using API avatar ID: ${ayanaAvatar.avatar_id} (was: ${finalAvatarId})`);
                finalAvatarId = ayanaAvatar.avatar_id;
              } else {
                logger.warn(`Could not find avatar ${finalAvatarId} in API list. Using provided ID anyway.`);
                logger.info(`Available avatar IDs (first 5): ${avatars.slice(0, 5).map(av => `${av.avatar_id} (${av.avatar_name})`).join(', ')}`);
                logger.warn(`Note: The provided ID format (${finalAvatarId}) doesn't match API format (e.g., "Abigail_expressive_2024112501"). The avatar may not exist or may need to be accessed differently.`);
              }
            }
          } else {
            logger.warn('Could not fetch avatar list - using provided ID as-is');
          }
        } catch (fetchError) {
          logger.warn(`Could not fetch avatar list (continuing with provided ID): ${fetchError.message}`);
        }
      }

      // Step 4: Create video generation request
      // HeyGen API endpoint: POST /v2/video/generate
      // Based on test results: character type should be 'avatar' or 'talking_photo', not 'photo'
      const endpoint = `${this.providers.heygen.baseUrl}/v2/video/generate`;
      
      // Map avatarType to HeyGen's expected values
      // Default to 'avatar' if no avatarId is provided (talking_photo requires an ID)
      let heygenAvatarType = 'avatar'; // Default
      
      // Only use talking_photo if explicitly requested AND an avatarId is provided
      if ((avatarType === 'talking_photo' || avatarType === 'photo') && finalAvatarId) {
        heygenAvatarType = 'talking_photo';
      } else if (avatarType === 'avatar' || avatarType === 'template' || !finalAvatarId) {
        heygenAvatarType = 'avatar';
      }
      
      // Build character object based on type
      // HeyGen API structure - try different possible formats
      let characterObj = {};
      if (heygenAvatarType === 'talking_photo' && finalAvatarId) {
        // For talking_photo, we need talking_photo_id inside a talking_photo object
        characterObj = {
          type: 'talking_photo',
          talking_photo: {
            talking_photo_id: finalAvatarId
          }
        };
      } else {
        // For avatar type, HeyGen API structure
        // Based on HeyGen API documentation, avatar_id should be at the character level, not nested
        // Structure: character.avatar_id (not character.avatar.avatar_id)
        characterObj = {
          type: 'avatar',
          avatar_id: finalAvatarId,  // avatar_id is directly in character object, not nested
          avatar_style: 'normal'  // Optional but recommended
        };
      }
      
      // Webhook support disabled for now - can be enabled later when HeyGen webhook is configured
      // const callbackId = options.callbackId || uuidv4();
      // const webhookUrl = options.webhookUrl || `${process.env.BACKEND_URL || 'https://www.iqonga.org'}/api/webhooks/heygen`;
      // const webhookSecret = options.webhookSecret || crypto.randomBytes(32).toString('hex');
      
      const requestData = {
        video_inputs: [
          {
            character: characterObj,
            voice: {
              // Use audio file for voice/lip-sync
              // HeyGen automatically performs lip-sync when using audio_url
              type: 'audio',
              audio_url: audioUrlForHeyGen
            },
            // Note: When using audio_url, HeyGen automatically syncs the avatar's lips to the audio
            // The avatar will "sing" or speak along with the audio track
            ...(background ? { background: { type: 'image', image_url: background } } : {}),
            // Script/text is optional when using audio - the audio itself drives the lip-sync
            ...(script ? { text: script } : {})
          }
        ],
        aspect_ratio: aspectRatio || '16:9',
        // HeyGen API expects 'dimension' object with width/height, not 'resolution' string
        // For free plans, use 720p (1280x720). Higher plans can use 1080p or 4K.
        // If dimension is null, HeyGen will use the plan's default resolution.
        ...(dimension ? { dimension: dimension } : {}),
        test: false
        // callback_id: callbackId // Disabled until webhook is configured
      };

      logger.info(`HeyGen request URL: ${endpoint}`);
      logger.info(`HeyGen API Key (first 10 chars): ${this.providers.heygen.apiKey?.substring(0, 10)}...`);
      logger.info(`Audio URL for lip-sync: ${audioUrlForHeyGen}`);
      logger.info(`Avatar ID: ${finalAvatarId}, Avatar Type: ${avatarType}`);
      logger.info(`HeyGen request data: ${JSON.stringify(requestData, null, 2)}`);

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
            rejectUnauthorized: true // Use proper SSL verification
          })
        }
      );
      
      logger.info(`HeyGen response status: ${response.status}`);
      logger.info(`HeyGen response headers: ${JSON.stringify(response.headers, null, 2)}`);

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

      // If we have a video URL directly, download it
      if (videoUrl) {
        const localVideoPath = await this.downloadAndStoreVideo(videoUrl, 'heygen', musicId);
        return {
          provider: 'heygen',
          videoUrl: `/uploads/videos/music-videos/${path.basename(localVideoPath)}`,
          localPath: localVideoPath,
          videoId: videoId,
          status: 'completed',
          metadata: {
            video_id: videoId,
            ...result
          }
        };
      }

      // If we only have a video_id, we need to poll for results
      // Webhook support disabled for now
      return {
        provider: 'heygen',
        videoId: videoId,
        status: 'processing',
        metadata: {
          video_id: videoId,
          ...result
        }
      };
    } catch (error) {
      // Safely extract error information without circular references
      const errorUrl = error.config?.url || 'unknown';
      const errorStatus = error.response?.status || 'no status';
      const errorData = error.response?.data || {};
      const errorInfo = {
        message: error.message,
        url: errorUrl,
        status: errorStatus,
        responseData: errorData,
        stack: error.stack
      };
      logger.error('HeyGen generation error:', errorInfo);
      
      // Extract detailed error message
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
   * Generate music video using RecCloud API
   * Documentation: https://reccloud.com/video-api-doc
   */
  async generateWithRecCloud(musicId, audioUrl, options) {
    const { avatarId, avatarType, script, background, aspectRatio, resolution } = options;
    
    try {
      // Step 1: Download audio file if needed
      let audioFilePath = audioUrl;
      if (audioUrl.startsWith('http')) {
        audioFilePath = await this.downloadAudioFile(audioUrl, musicId);
      } else if (!path.isAbsolute(audioUrl)) {
        audioFilePath = path.join(__dirname, '../../uploads/music/generated', path.basename(audioUrl));
      }

      // Step 2: Upload audio to RecCloud
      const uploadEndpoint = `${this.providers.reccloud.baseUrl}/api/v1/upload`;
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioFilePath));
      formData.append('type', 'audio');

      const uploadResponse = await axios.post(uploadEndpoint, formData, {
        headers: {
          'Authorization': `Bearer ${this.providers.reccloud.apiKey}`,
          ...formData.getHeaders()
        },
        timeout: 300000,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false // RecCloud may have self-signed certificate issues
        })
      });

      const uploadedAudioUrl = uploadResponse.data?.data?.url || uploadResponse.data?.url;
      if (!uploadedAudioUrl) {
        throw new Error('RecCloud failed to upload audio file');
      }

      // Step 3: Create video generation request
      // RecCloud API endpoint: POST /api/v1/video/generate
      const endpoint = `${this.providers.reccloud.baseUrl}/api/v1/video/generate`;
      
      const requestData = {
        audio_url: uploadedAudioUrl,
        ...(avatarId ? { avatar_id: avatarId } : {}),
        ...(script ? { script: script } : {}),
        ...(background ? { background_url: background } : {}),
        aspect_ratio: aspectRatio || '16:9',
        resolution: resolution || '1080p'
      };

      logger.info(`RecCloud request URL: ${endpoint}`);
      logger.info(`RecCloud request data: ${JSON.stringify(requestData, null, 2)}`);

      const response = await axios.post(
        endpoint,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.providers.reccloud.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 300000,
          httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false // RecCloud may have self-signed certificate issues
          })
        }
      );

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`RecCloud API error: ${response.data?.error || response.data?.message || 'Unknown error'}`);
      }

      const result = response.data;
      logger.info(`RecCloud response: ${JSON.stringify(result, null, 2)}`);

      const videoId = result.data?.video_id || result.video_id || result.id;
      const videoUrl = result.data?.video_url || result.video_url || result.url;

      if (!videoId && !videoUrl) {
        logger.error(`RecCloud response structure: ${JSON.stringify(result, null, 2)}`);
        throw new Error('RecCloud did not return a video_id or video URL');
      }

      // If we have a video URL directly, download it
      if (videoUrl) {
        const localVideoPath = await this.downloadAndStoreVideo(videoUrl, 'reccloud', musicId);
        return {
          provider: 'reccloud',
          videoUrl: `/uploads/videos/music-videos/${path.basename(localVideoPath)}`,
          localPath: localVideoPath,
          videoId: videoId,
          status: 'completed',
          metadata: {
            video_id: videoId,
            ...result
          }
        };
      }

      // If we only have a video_id, we need to poll for results
      return {
        provider: 'reccloud',
        videoId: videoId,
        status: 'processing',
        metadata: {
          video_id: videoId,
          ...result
        }
      };
    } catch (error) {
      // Safely extract error information without circular references
      const errorUrl = error.config?.url || 'unknown';
      const errorStatus = error.response?.status || 'no status';
      const errorData = error.response?.data || {};
      const errorInfo = {
        message: error.message,
        url: errorUrl,
        status: errorStatus,
        responseData: errorData,
        stack: error.stack
      };
      logger.error('RecCloud generation error:', errorInfo);
      throw new Error(`RecCloud error: ${error.response?.data?.error || error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Download audio file from URL
   */
  async downloadAudioFile(url, musicId) {
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 60000,
        httpsAgent: new https.Agent({
          rejectUnauthorized: true
        })
      });

      const audioDir = path.join(__dirname, '../../uploads/music/temp');
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }

      const fileExtension = path.extname(url) || '.mp3';
      const fileName = `music_${musicId}_${Date.now()}${fileExtension}`;
      const filePath = path.join(audioDir, fileName);

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
      });
    } catch (error) {
      logger.error('Failed to download audio file:', error);
      throw new Error(`Failed to download audio file: ${error.message}`);
    }
  }

  /**
   * Download and store video file
   */
  async downloadAndStoreVideo(videoUrl, provider, musicId) {
    try {
      // Remove query parameters from URL before extracting extension
      // HeyGen URLs include Expires and Signature query params that can cause filename issues
      const urlWithoutQuery = videoUrl.split('?')[0];
      const fileExtension = path.extname(urlWithoutQuery) || '.mp4';
      
      // Generate a shorter filename to avoid filesystem limits
      // Format: provider_musicId_timestamp.ext
      const timestamp = Date.now();
      const shortMusicId = musicId ? musicId.substring(0, 8) : 'unknown'; // Use first 8 chars of UUID
      const fileName = `${provider}_${shortMusicId}_${timestamp}${fileExtension}`;
      const filePath = path.join(this.uploadsDir, fileName);
      
      logger.info(`Downloading video from: ${videoUrl.substring(0, 100)}...`);
      logger.info(`Saving to: ${fileName}`);
      
      const response = await axios({
        method: 'GET',
        url: videoUrl, // Use full URL with query params for the actual download
        responseType: 'stream',
        timeout: 600000, // 10 minutes for video download
        httpsAgent: new https.Agent({
          rejectUnauthorized: true
        })
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          logger.info(`Video downloaded and stored: ${filePath}`);
          resolve(filePath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      logger.error('Failed to download video file:', error);
      throw new Error(`Failed to download video file: ${error.message}`);
    }
  }

  /**
   * Check video generation status (for polling)
   */
  async getVideoStatus(provider, videoId) {
    try {
      if (provider === 'vidnoz') {
        // Vidnoz task detail endpoint
        // Documentation: https://www.vidnoz.com/docs/access-to-task-detail.html
        const endpoint = `${this.providers.vidnoz.baseUrl}/v2/task/detail`;
        
        logger.info(`Vidnoz status check: ${endpoint}?task_id=${videoId}`);
        
        const response = await axios.get(endpoint, {
          params: {
            task_id: videoId
          },
          headers: {
            'Authorization': `Bearer ${this.providers.vidnoz.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000,
          httpsAgent: new https.Agent({
            rejectUnauthorized: true
          })
        });
        
        logger.info(`Vidnoz status check successful: ${JSON.stringify(response.data, null, 2)}`);
        
        // Parse Vidnoz response structure
        const taskData = response.data?.data || response.data;
        const status = taskData?.status || taskData?.state;
        const videoUrl = taskData?.video_url || taskData?.url || taskData?.result_url;
        
        return {
          status: status || 'processing',
          video_url: videoUrl || null,
          data: taskData
        };
      } else if (provider === 'heygen') {
        // According to HeyGen docs: https://docs.heygen.com/reference/video-status
        // The correct endpoint is /v1/video_status.get with video_id as query parameter
        const endpoint = `${this.providers.heygen.baseUrl}/v1/video_status.get`;
        
        logger.info(`HeyGen status check: ${endpoint}?video_id=${videoId}`);
        
        const response = await axios.get(endpoint, {
          params: {
            video_id: videoId
          },
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
      }
      throw new Error(`Unsupported provider for status check: ${provider}`);
    } catch (error) {
      // Safely extract error information without circular references
      const errorUrl = error.config?.url || 'unknown';
      const errorStatus = error.response?.status || 'no status';
      const errorData = error.response?.data || {};
      const errorInfo = {
        message: error.message,
        url: errorUrl,
        status: errorStatus,
        responseData: typeof errorData === 'string' ? errorData.substring(0, 200) : errorData,
        apiKeyPrefix: this.providers.heygen?.apiKey?.substring(0, 10) || 'not set'
      };
      logger.error(`Failed to check video status for ${provider}:`, errorInfo);
      throw new Error(`Failed to check video status: ${error.message}`);
    }
  }
}

module.exports = MusicVideoGenerationService;

