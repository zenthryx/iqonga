import { apiService } from './api';

export interface Character {
  id: string;
  name: string;
  description?: string;
  creationMethod: 'images' | 'single_image' | 'description' | 'video' | 'photos';
  avatarType?: 'video' | 'photo' | 'ai_generated' | 'images';
  imageUrls: string[];
  previewImageUrl?: string;
  tags?: string[];
  visibility: 'private' | 'public';
  status: 'active' | 'archived' | 'deleted';
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: {
    username?: string;
    email?: string;
  };
  // New avatar fields
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  processingProgress?: number;
  looksCount?: number;
  heygenAvatarId?: string;
  videoUrl?: string;
}

export interface CharacterCreateRequest {
  name: string;
  description?: string;
  creationMethod?: 'images' | 'single_image' | 'description';
  imageUrls: string[];
  tags?: string[];
  visibility?: 'private' | 'public';
  metadata?: Record<string, any>;
}

export interface CharacterUpdateRequest {
  name?: string;
  description?: string;
  imageUrls?: string[];
  tags?: string[];
  visibility?: 'private' | 'public';
  metadata?: Record<string, any>;
}

export interface CharacterListResponse {
  characters: Character[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class CharacterService {
  /**
   * Create a new character
   */
  async createCharacter(request: CharacterCreateRequest): Promise<ApiResponse<Character>> {
    return apiService.post('/characters', request);
  }

  /**
   * Upload images for character creation
   */
  async uploadCharacterImages(files: File[]): Promise<ApiResponse<{ imageUrls: string[]; count: number }>> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });

    return apiService.post('/characters/upload-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  /**
   * Get user's characters
   */
  async getCharacters(options?: {
    page?: number;
    limit?: number;
    status?: string;
    visibility?: string;
    search?: string;
  }): Promise<ApiResponse<CharacterListResponse>> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.status) params.append('status', options.status);
    if (options?.visibility) params.append('visibility', options.visibility);
    if (options?.search) params.append('search', options.search);

    return apiService.get(`/characters?${params.toString()}`);
  }

  /**
   * Get community/public characters
   */
  async getCommunityCharacters(options?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ApiResponse<CharacterListResponse>> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);

    return apiService.get(`/characters/community?${params.toString()}`);
  }

  /**
   * Get a single character by ID
   */
  async getCharacterById(characterId: string): Promise<ApiResponse<Character>> {
    return apiService.get(`/characters/${characterId}`);
  }

  /**
   * Update a character
   */
  async updateCharacter(characterId: string, updates: CharacterUpdateRequest): Promise<ApiResponse<Character>> {
    return apiService.put(`/characters/${characterId}`, updates);
  }

  /**
   * Delete a character
   */
  async deleteCharacter(characterId: string): Promise<ApiResponse<{ success: boolean; id: string }>> {
    return apiService.delete(`/characters/${characterId}`);
  }

  /**
   * Get avatar looks
   */
  async getAvatarLooks(characterId: string): Promise<ApiResponse<AvatarLook[]>> {
    return apiService.get(`/characters/${characterId}/looks`);
  }

  /**
   * Get processing status
   */
  async getProcessingStatus(characterId: string): Promise<ApiResponse<ProcessingStatus>> {
    return apiService.get(`/characters/${characterId}/processing-status`);
  }
}

export interface AvatarLook {
  id: string;
  character_id: string;
  user_id: number;
  name: string;
  description?: string;
  look_type: 'photo' | 'video' | 'ai_generated';
  image_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  outfit_type?: string;
  setting?: string;
  pose?: string;
  expression?: string;
  is_default: boolean;
  is_active: boolean;
  order_index: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ProcessingStatus {
  character: {
    processing_status: 'pending' | 'processing' | 'completed' | 'failed';
    processing_progress: number;
    processing_error?: string;
    processing_started_at?: string;
    processing_completed_at?: string;
  };
  job?: {
    id: string;
    job_type: string;
    status: string;
    progress: number;
    current_step?: string;
    input_data?: any;
    output_data?: any;
    error_message?: string;
  };
}

export default new CharacterService();

