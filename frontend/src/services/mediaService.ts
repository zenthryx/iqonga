import { ApiResponse } from '@/types';
import { apiService } from './api';

export interface UploadedMedia {
  id: string;
  file_name: string;
  original_name: string;
  file_url: string;
  file_type: 'image' | 'video';
  mime_type: string;
  file_size: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail_url?: string;
  description?: string;
  tags: string[];
  is_public: boolean;
  status: 'active' | 'deleted' | 'processing';
  created_at: string;
  updated_at: string;
}

export interface MediaUploadRequest {
  file: File;
  agent_id?: string;
  description?: string;
  tags?: string[];
  is_public?: boolean;
}

export interface MediaStats {
  total: number;
  images: number;
  videos: number;
  totalSize: number;
}

class MediaService {
  // Upload single media file
  async uploadMedia(request: MediaUploadRequest): Promise<ApiResponse<UploadedMedia>> {
    const formData = new FormData();
    formData.append('file', request.file);
    if (request.agent_id) formData.append('agent_id', request.agent_id);
    if (request.description) formData.append('description', request.description);
    if (request.tags) {
      formData.append('tags', Array.isArray(request.tags) ? request.tags.join(',') : request.tags);
    }
    if (request.is_public !== undefined) {
      formData.append('is_public', request.is_public.toString());
    }

    return apiService.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Upload multiple media files
  async uploadMultipleMedia(files: File[], options?: {
    agent_id?: string;
    description?: string;
    tags?: string[];
    is_public?: boolean;
  }): Promise<ApiResponse<UploadedMedia[]>> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    if (options?.agent_id) formData.append('agent_id', options.agent_id);
    if (options?.description) formData.append('description', options.description);
    if (options?.tags) {
      formData.append('tags', Array.isArray(options.tags) ? options.tags.join(',') : options.tags);
    }
    if (options?.is_public !== undefined) {
      formData.append('is_public', options.is_public.toString());
    }

    return apiService.post('/media/upload-multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Get user's media library
  async getMediaLibrary(params?: {
    file_type?: 'image' | 'video';
    agent_id?: string;
    limit?: number;
    offset?: number;
    search?: string;
    tags?: string[];
  }): Promise<ApiResponse<UploadedMedia[]>> {
    const queryParams = new URLSearchParams();
    if (params?.file_type) queryParams.append('file_type', params.file_type);
    if (params?.agent_id) queryParams.append('agent_id', params.agent_id);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.tags) {
      queryParams.append('tags', Array.isArray(params.tags) ? params.tags.join(',') : params.tags);
    }
    
    const queryString = queryParams.toString();
    return apiService.get(`/media${queryString ? `?${queryString}` : ''}`);
  }

  // Get media statistics
  async getMediaStats(): Promise<ApiResponse<MediaStats>> {
    return apiService.get('/media/stats');
  }

  // Get specific media file
  async getMediaById(id: string): Promise<ApiResponse<UploadedMedia>> {
    return apiService.get(`/media/${id}`);
  }

  // Update media metadata
  async updateMedia(id: string, updates: {
    description?: string;
    tags?: string[];
    is_public?: boolean;
  }): Promise<ApiResponse<UploadedMedia>> {
    return apiService.put(`/media/${id}`, updates);
  }

  // Delete media
  async deleteMedia(id: string): Promise<ApiResponse<void>> {
    return apiService.delete(`/media/${id}`);
  }

  // Import media from URL (e.g., from Canva export)
  async importFromUrl(url: string, options?: {
    name?: string;
    description?: string;
    tags?: string[];
    agent_id?: string;
    is_public?: boolean;
  }): Promise<ApiResponse<UploadedMedia>> {
    return apiService.post('/media/import-url', {
      url,
      name: options?.name,
      description: options?.description,
      tags: options?.tags,
      agent_id: options?.agent_id,
      is_public: options?.is_public
    });
  }
}

export const mediaService = new MediaService();

