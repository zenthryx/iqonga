import { apiService } from './api';

export interface YouTubeChannel {
  channelId: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  itemCount: number;
}

export interface YouTubeUploadRequest {
  videoUrl: string;
  videoId?: string; // ID from generated_videos table
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string; // Default: '22' (People & Blogs)
  privacyStatus?: 'private' | 'unlisted' | 'public'; // Default: 'private'
  thumbnailUrl?: string; // Optional thumbnail URL
  madeForKids?: boolean; // COPPA compliance
  playlistIds?: string[]; // Optional array of playlist IDs
}

export interface YouTubeUploadResponse {
  success: boolean;
  videoId: string;
  videoUrl: string;
  title: string;
  description: string;
  privacyStatus: string;
}

class YouTubeService {
  /**
   * Initiate YouTube OAuth flow
   */
  async initiateAuth(): Promise<{ authUrl: string; state: string }> {
    const response = await apiService.get('/youtube/auth/request');
    return response.data;
  }

  /**
   * Get user's YouTube channel info
   */
  async getChannel(): Promise<YouTubeChannel> {
    const response = await apiService.get('/youtube/channel');
    return response.data;
  }

  /**
   * Upload video to YouTube
   */
  async uploadVideo(request: YouTubeUploadRequest): Promise<YouTubeUploadResponse> {
    const response = await apiService.post('/youtube/upload', request, {
      timeout: 300000 // 5 minutes timeout for video upload
    });
    return response.data;
  }

  /**
   * Get user's uploaded videos
   */
  async getVideos(maxResults: number = 50): Promise<YouTubeVideo[]> {
    const response = await apiService.get('/youtube/videos', {
      params: { maxResults }
    });
    return response.data.videos || [];
  }

  /**
   * Get user's playlists
   */
  async getPlaylists(): Promise<YouTubePlaylist[]> {
    const response = await apiService.get('/youtube/playlists');
    return response.data.data || [];
  }

  /**
   * Disconnect YouTube account
   */
  async disconnect(): Promise<void> {
    await apiService.delete('/youtube/disconnect');
  }
}

export default new YouTubeService();

