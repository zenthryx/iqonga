import { ApiResponse } from '@/types';
import { apiService } from './api';

export interface StabilityAIRequest {
  text_prompts: Array<{
    text: string;
    weight?: number;
  }>;
  cfg_scale?: number;
  clip_guidance_preset?: 'FAST_BLUE' | 'FAST_GREEN' | 'NONE' | 'SIMPLE' | 'SLOW' | 'SLOWER' | 'SLOWEST';
  height?: number;
  width?: number;
  samples?: number;
  steps?: number;
  style_preset?: 'anime' | 'photographic' | 'digital-art' | 'comic-book' | 'fantasy-art' | 'line-art' | 'analog-film' | 'neon-punk' | 'isometric' | '3d-model';
}

export interface ImageGenerationRequest {
  prompt: string;
  style?: 'realistic' | 'artistic' | 'anime' | 'digital-art' | 'photographic';
  size?: '256x256' | '512x512' | '1024x1024';
  n?: number;
  negativePrompt?: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  style: string;
  size: string;
  created_at: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface VideoGenerationRequest {
  prompt: string;
  duration?: number; // in seconds
  fps?: number;
  style?: string;
  audio?: boolean;
}

export interface GeneratedVideo {
  id: string;
  url?: string; // Legacy field
  videoUrl?: string; // Video file URL
  prompt: string;
  videoScript?: string;
  storyboard?: string;
  duration: number;
  style?: string;
  aspectRatio?: string;
  status: 'pending' | 'completed' | 'failed' | string;
  note?: string;
  createdAt?: string;
  created_at?: string; // Legacy field
}

export interface LyricsGenerationRequest {
  topic?: string;
  genre?: string;
  mood?: string;
  style?: string;
  language?: string;
  length?: 'short' | 'medium' | 'long';
  structure?: 'auto' | 'verse-chorus' | 'verse-only' | 'free-form';
  agentId?: string;
}

export interface GeneratedLyrics {
  title: string;
  lyrics: string;
  genre: string;
  mood: string;
  structure: string;
  language: string;
  lineCount: string;
  reasoning: string;
  agent_aware: boolean;
  company_aware: boolean;
}

export interface MusicGenerationRequest {
  prompt: string;
  agentId?: string;
  duration?: number; // in seconds
  style?: string;
  genre?: string;
  instrumental?: boolean;
  lyrics?: string;
  tempo?: number; // BPM
  mood?: string;
  provider?: 'musicgpt' | 'musicapi' | 'stability' | 'sunoapi'; // Optional: auto-selects if not specified
  voiceType?: string; // Voice type: male, female, neutral, auto, or specific styles
  language?: string; // Language code: en, es, fr, de, it, pt, ja, ko, zh, etc.
}

export interface GeneratedMusic {
  id: string;
  audioUrl: string;
  prompt: string;
  style?: string;
  genre?: string;
  duration: number;
  instrumental: boolean;
  lyrics?: string;
  tempo?: number;
  mood?: string;
  provider: string;
  status: 'pending' | 'completed' | 'failed' | string;
  metadata?: any;
  createdAt?: string;
  created_at?: string; // Legacy field
  agent_name?: string;
}

export interface MusicVideoGenerationRequest {
  musicId: string; // Required: ID of the generated music track
  agentId?: string;
  provider?: 'vidnoz' | 'heygen'; // Optional: auto-selects if not specified
  avatarId?: string; // Optional: Avatar ID from provider
  avatarType?: 'avatar' | 'talking_photo' | 'template' | 'custom';
  script?: string; // Optional: Script/text for avatar to speak
  background?: string; // Optional: Background image/video URL
  aspectRatio?: '16:9' | '9:16' | '1:1';
  resolution?: 'auto' | '720p' | '1080p' | '4K'; // 'auto' means use HeyGen default (no resolution parameter)
}

export interface GeneratedMusicVideo {
  id: string;
  musicId: string;
  videoUrl?: string;
  audioUrl: string;
  provider: string;
  avatarId?: string;
  avatarType?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  duration?: number;
  metadata?: any;
  createdAt: string;
  updatedAt?: string;
}

class ImageService {
  private STABILITY_API_KEY = process.env.REACT_APP_STABILITY_API_KEY;
  private STABILITY_API_URL = 'https://api.stability.ai/v1/generation';

  // Generate AI agent avatar
  async generateAgentAvatar(agentName: string, personality: string): Promise<ApiResponse<GeneratedImage>> {
    const prompt = `Professional profile picture for an AI agent named ${agentName}. ${personality}. Highly detailed, professional looking, modern tech aesthetic, gradient background`;
    
    const request: StabilityAIRequest = {
      text_prompts: [{ text: prompt }],
      cfg_scale: 7,
      clip_guidance_preset: 'FAST_BLUE',
      height: 512,
      width: 512,
      samples: 1,
      steps: 30,
      style_preset: 'digital-art'
    };

    return apiService.post('/content/ai/images/generate-avatar', request);
  }

  // Generate content image for social media
  async generateContentImage(prompt: string, style: string, context: string): Promise<ApiResponse<GeneratedImage>> {
    const enhancedPrompt = `${prompt}. Context: ${context}. Style: ${style}. High quality, engaging social media content`;
    
    const request: StabilityAIRequest = {
      text_prompts: [{ text: enhancedPrompt }],
      cfg_scale: 7,
      clip_guidance_preset: 'FAST_BLUE',
      height: 1024,
      width: 1024,
      samples: 1,
      steps: 40,
      style_preset: style as any
    };

    return apiService.post('/ai/images/generate-content', request);
  }

  // Generate short video clip using Gemini
  async generateVideo(request: VideoGenerationRequest & { 
    generateActualVideo?: boolean;
    videoProvider?: 'runwayml' | 'veo3.1' | 'heygen';
    quality?: 'fast' | 'standard';
    cameraControl?: string;
    characterId?: string; // Character ID for consistent character generation
  }): Promise<ApiResponse<GeneratedVideo>> {
    // Video generation can take 60+ seconds, so use a longer timeout
    return apiService.post('/content/gemini/videos/generate', {
      prompt: request.prompt,
      duration: request.duration || 5,
      style: request.style || 'cinematic',
      aspectRatio: '16:9',
      generateActualVideo: request.generateActualVideo || false,
      videoProvider: request.videoProvider || 'runwayml',
      quality: request.quality || 'standard',
      cameraControl: request.cameraControl || null,
      characterId: request.characterId || null
    }, {
      timeout: 180000 // 3 minutes timeout for video generation (Veo can take longer)
    });
  }

  // Scene Extension - Extend an existing video (Flow feature)
  async extendVideo(videoUrl: string, extensionPrompt: string, options?: {
    duration?: number;
    style?: string;
  }): Promise<ApiResponse<GeneratedVideo>> {
    return apiService.post('/content/videos/extend', {
      videoUrl,
      extensionPrompt,
      duration: options?.duration || 5,
      style: options?.style || 'cinematic'
    }, {
      timeout: 180000 // 3 minutes timeout
    });
  }

  // Ingredients to Video - Generate from reference images (Flow feature)
  async generateFromIngredients(referenceImages: string[], prompt: string, options?: {
    duration?: number;
    style?: string;
    aspectRatio?: string;
    quality?: 'fast' | 'standard';
    characterId?: string; // Character ID to use as reference
  }): Promise<ApiResponse<GeneratedVideo>> {
    return apiService.post('/content/videos/ingredients', {
      referenceImages,
      characterId: options?.characterId || null,
      prompt,
      duration: options?.duration || 5,
      style: options?.style || 'cinematic',
      aspectRatio: options?.aspectRatio || '16:9',
      quality: options?.quality || 'standard'
    }, {
      timeout: 180000 // 3 minutes timeout
    });
  }

  // First and Last Frame - Generate transition between images (Flow feature)
  async generateFromFrames(firstFrame: string, lastFrame: string, prompt: string, options?: {
    duration?: number;
    style?: string;
    aspectRatio?: string;
    quality?: 'fast' | 'standard';
  }): Promise<ApiResponse<GeneratedVideo>> {
    return apiService.post('/content/videos/frames', {
      firstFrame,
      lastFrame,
      prompt,
      duration: options?.duration || 5,
      style: options?.style || 'cinematic',
      aspectRatio: options?.aspectRatio || '16:9',
      quality: options?.quality || 'standard'
    }, {
      timeout: 180000 // 3 minutes timeout
    });
  }

  // Get video generation status
  async getVideoStatus(id: string): Promise<ApiResponse<GeneratedVideo>> {
    return apiService.get(`/content/gemini/videos/${id}`);
  }

  // Get user's generated videos
  async getGeneratedVideos(params?: {
    page?: number;
    limit?: number;
    agentId?: string;
  }): Promise<ApiResponse<{
    videos: GeneratedVideo[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.agentId) queryParams.append('agentId', params.agentId);
    
    const queryString = queryParams.toString();
    return apiService.get(`/content/videos${queryString ? `?${queryString}` : ''}`);
  }

  // Generate images using AI
  async generateImage(request: ImageGenerationRequest): Promise<ApiResponse<GeneratedImage[]>> {
    // Send the request directly to match backend expectations
    return apiService.post('/content/ai/images/generate', {
      prompt: request.prompt,
      style: request.style,
      size: request.size,
      negativePrompt: request.negativePrompt,
      n: request.n
    });
  }


  // Enhance/edit existing image
  async enhanceImage(id: string, options: {
    prompt?: string;
    strength?: number;
  }): Promise<ApiResponse<GeneratedImage>> {
    return apiService.post(`/ai/images/${id}/enhance`, options);
  }

  // Generate variations of an existing image
  async generateVariations(id: string, options: {
    n?: number;
    style?: string;
  }): Promise<ApiResponse<GeneratedImage[]>> {
    return apiService.post(`/ai/images/${id}/variations`, options);
  }

  // Get user's generated images
  async getGeneratedImages(params?: {
    page?: number;
    limit?: number;
    agentId?: string;
  }): Promise<ApiResponse<{
    images: GeneratedImage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.agentId) queryParams.append('agentId', params.agentId);
    
    const queryString = queryParams.toString();
    return apiService.get(`/content/images${queryString ? `?${queryString}` : ''}`);
  }

  // Get specific image details
  async getImageDetails(id: string): Promise<ApiResponse<GeneratedImage>> {
    return apiService.get(`/content/images/${id}`);
  }

  // Delete an image
  async deleteImage(id: string): Promise<ApiResponse<void>> {
    return apiService.delete(`/content/images/${id}`);
  }

  // ============================================
  // MUSIC GENERATION METHODS
  // ============================================

  // Generate music using an agent's personality
  async generateMusicWithAgent(
    agentId: string,
    options?: {
      topic?: string;
      duration?: number;
      instrumental?: boolean;
      provider?: 'musicgpt' | 'musicapi' | 'stability' | 'sunoapi';
      conceptProvider?: 'openai' | 'gemini';
    }
  ): Promise<ApiResponse<GeneratedMusic & {
    agent?: { id: string; name: string; personality: string };
    concept?: {
      prompt: string;
      title?: string;
      style: string;
      genre?: string;
      mood?: string;
      tempo?: number;
      reasoning?: string;
      agent_aware: boolean;
      company_aware: boolean;
    };
  }>> {
    try {
      return apiService.post(`/agents/${agentId}/music/generate`, {
        topic: options?.topic,
        duration: options?.duration || 30,
        instrumental: options?.instrumental || false,
        provider: options?.provider,
        conceptProvider: options?.conceptProvider || 'openai'
      }, {
        timeout: 300000 // 5 minutes timeout for music generation
      });
    } catch (error: any) {
      console.error('Agent music generation error:', error);
      throw error;
    }
  }

  // Generate music
  async generateMusic(request: MusicGenerationRequest): Promise<ApiResponse<GeneratedMusic>> {
    // Music generation can take 30-60 seconds, so use a longer timeout
    return apiService.post('/content/ai/music/generate', {
      prompt: request.prompt,
      agentId: request.agentId || null,
      duration: request.duration || 30,
      style: request.style || 'pop',
      genre: request.genre || null,
      instrumental: request.instrumental || false,
      lyrics: request.lyrics || null,
      tempo: request.tempo || null,
      mood: request.mood || null,
      provider: request.provider || null // Auto-select if not specified
    }, {
      timeout: 300000 // 5 minutes timeout for music generation
    });
  }

  // Get user's generated music
  async getGeneratedMusic(params?: {
    page?: number;
    limit?: number;
    agentId?: string;
  }): Promise<ApiResponse<{
    music: GeneratedMusic[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.agentId) queryParams.append('agentId', params.agentId);
    
    const queryString = queryParams.toString();
    return apiService.get(`/content/music${queryString ? `?${queryString}` : ''}`);
  }

  // Get specific music track details
  async getMusicDetails(id: string): Promise<ApiResponse<GeneratedMusic>> {
    return apiService.get(`/content/music/${id}`);
  }

  // Music Video Generation
  async generateMusicVideo(request: MusicVideoGenerationRequest): Promise<ApiResponse<GeneratedMusicVideo>> {
    // Music video generation can take 2-5 minutes, so use a longer timeout
    return apiService.post('/content/music-videos/generate', {
      musicId: request.musicId,
      agentId: request.agentId || null,
      provider: request.provider || null,
      avatarId: request.avatarId || null,
      avatarType: request.avatarType || 'avatar',
      script: request.script || null,
      background: request.background || null,
      aspectRatio: request.aspectRatio || '16:9',
      resolution: request.resolution === 'auto' ? undefined : (request.resolution || undefined)
    }, {
      timeout: 600000 // 10 minutes timeout for music video generation
    });
  }

  async getMusicVideos(params?: {
    page?: number;
    limit?: number;
    agentId?: string;
    musicId?: string;
  }): Promise<ApiResponse<{
    videos: GeneratedMusicVideo[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.agentId) queryParams.append('agentId', params.agentId);
    if (params?.musicId) queryParams.append('musicId', params.musicId);
    
    const query = queryParams.toString();
    return apiService.get(`/content/music-videos${query ? `?${query}` : ''}`);
  }

  async getMusicVideoDetails(id: string): Promise<ApiResponse<GeneratedMusicVideo>> {
    return apiService.get(`/content/music-videos/${id}`);
  }

  // Recover a music video that timed out during polling
  async recoverMusicVideo(request: { videoId?: string; heygenVideoId?: string }): Promise<ApiResponse<GeneratedMusicVideo>> {
    return apiService.post('/content/music-videos/recover', {
      videoId: request.videoId || null,
      heygenVideoId: request.heygenVideoId || null
    });
  }

  // Generate lyrics only (standalone feature)
  async generateLyrics(request: LyricsGenerationRequest): Promise<ApiResponse<GeneratedLyrics>> {
    return apiService.post('/content/ai/lyrics/generate', {
      topic: request.topic || null,
      genre: request.genre || null,
      mood: request.mood || 'energetic',
      style: request.style || 'pop',
      language: request.language || 'en',
      length: request.length || 'medium',
      structure: request.structure || 'auto',
      agentId: request.agentId || null
    });
  }

  // ============================================
  // HeyGen Avatar Videos Methods
  // ============================================

  // Get available HeyGen avatars
  async getHeyGenAvatars(): Promise<ApiResponse<Array<{
    avatar_id?: string;
    id?: string;
    avatarId?: string;
    avatar_name?: string;
    name?: string;
    available?: boolean;
  }>>> {
    return apiService.get('/content/heygen/avatars');
  }

  // Get available HeyGen voices
  async getHeyGenVoices(): Promise<ApiResponse<Array<{
    voice_id?: string;
    id?: string;
    voiceId?: string;
    code?: string;
    voice_name?: string;
    name?: string;
    locale?: string;
    language?: string;
  }>>> {
    return apiService.get('/content/heygen/voices');
  }

  // Generate avatar video from text script
  async generateHeyGenTextToAvatar(request: {
    script: string;
    avatarId?: string;
    voiceId?: string;
    background?: string;
    aspectRatio?: string;
    resolution?: string;
  }): Promise<ApiResponse<GeneratedVideo>> {
    return apiService.post('/content/heygen/text-to-avatar', {
      script: request.script,
      avatarId: request.avatarId || null,
      voiceId: request.voiceId || null,
      background: request.background || null,
      aspectRatio: request.aspectRatio || '16:9',
      resolution: request.resolution || null
    }, {
      timeout: 300000 // 5 minutes timeout for HeyGen
    });
  }

  // Generate avatar video with audio lip-sync
  async generateHeyGenAudioLipSync(request: {
    audioFile?: File;
    audioUrl?: string;
    avatarId?: string;
    aspectRatio?: string;
    resolution?: string;
  }): Promise<ApiResponse<GeneratedVideo>> {
    const formData = new FormData();
    
    if (request.audioFile) {
      formData.append('audio', request.audioFile);
    }
    
    if (request.audioUrl) {
      formData.append('audioUrl', request.audioUrl);
    }
    
    if (request.avatarId) {
      formData.append('avatarId', request.avatarId);
    }
    
    formData.append('aspectRatio', request.aspectRatio || '16:9');
    if (request.resolution) {
      formData.append('resolution', request.resolution);
    }

    return apiService.post('/content/heygen/audio-lip-sync', formData, {
      timeout: 300000, // 5 minutes timeout
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // Translate video with lip-sync
  async translateHeyGenVideo(request: {
    videoUrl: string;
    targetLanguage?: string;
    mode?: 'fast' | 'quality';
  }): Promise<ApiResponse<GeneratedVideo>> {
    return apiService.post('/content/heygen/video-translation', {
      videoUrl: request.videoUrl,
      targetLanguage: request.targetLanguage || 'en',
      mode: request.mode || 'quality'
    }, {
      timeout: 300000 // 5 minutes timeout
    });
  }

  // Get user's generated HeyGen videos
  async getHeyGenVideos(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    data: GeneratedVideo[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    return apiService.get(`/content/heygen/videos${queryString ? `?${queryString}` : ''}`);
  }
}

export const imageService = new ImageService(); 