import { apiService } from './api';

export interface EBookProject {
  id: string;
  user_id: number;
  agent_id?: string;
  title: string;
  description?: string;
  genre?: string;
  language: string;
  cover_image_url?: string;
  template_id?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'published';
  visibility: 'private' | 'public' | 'unlisted';
  share_token: string;
  metadata?: Record<string, any>;
  chapter_count?: number;
  total_word_count?: number;
  number_of_chapters?: number;
  target_word_count?: number;
  word_count_type?: 'total' | 'per_chapter';
  writing_style?: string;
  auto_generate_chapters?: boolean;
  chapter_outline?: Array<{ title: string; description: string }>;
  generation_status?: 'not_started' | 'generating' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface EBookChapter {
  id: string;
  project_id: string;
  chapter_number: number;
  title?: string;
  content: string;
  word_count: number;
  order_index: number;
  page_template?: string;
  template_config?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface EBookTemplate {
  id: string;
  user_id?: number;
  name: string;
  description?: string;
  category?: string;
  is_public: boolean;
  template_data: Record<string, any>;
  preview_image_url?: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface EBookProjectListResponse {
  projects: EBookProject[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class EBookService {
  /**
   * Create a new eBook project
   */
  async createProject(projectData: {
    title: string;
    description?: string;
    genre?: string;
    language?: string;
    agentId?: string;
    templateId?: string;
    coverImageUrl?: string;
    numberOfChapters?: number;
    targetWordCount?: number;
    wordCountType?: 'total' | 'per_chapter';
    writingStyle?: string;
    autoGenerateChapters?: boolean;
  }): Promise<ApiResponse<EBookProject>> {
    return apiService.post('/content/ebook/projects', projectData);
  }

  /**
   * Get user's eBook projects
   */
  async getProjects(options?: {
    status?: string;
    genre?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<EBookProjectListResponse>> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.genre) params.append('genre', options.genre);
    if (options?.search) params.append('search', options.search);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    return apiService.get(`/content/ebook/projects?${params.toString()}`);
  }

  /**
   * Get a specific project
   */
  async getProject(projectId: string): Promise<ApiResponse<EBookProject>> {
    return apiService.get(`/content/ebook/projects/${projectId}`);
  }

  /**
   * Get project by share token (public)
   */
  async getProjectByShareToken(token: string): Promise<ApiResponse<EBookProject>> {
    return apiService.get(`/content/ebook/projects/share/${token}`);
  }

  /**
   * Get chapters for shared project (public)
   */
  async getSharedProjectChapters(token: string): Promise<ApiResponse<EBookChapter[]>> {
    return apiService.get(`/content/ebook/projects/share/${token}/chapters`);
  }

  /**
   * Update project
   */
  async updateProject(projectId: string, updates: Partial<EBookProject>): Promise<ApiResponse<EBookProject>> {
    return apiService.put(`/content/ebook/projects/${projectId}`, updates);
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string): Promise<ApiResponse<{ success: boolean; id: string }>> {
    return apiService.delete(`/content/ebook/projects/${projectId}`);
  }

  /**
   * Clone project
   */
  async cloneProject(projectId: string, newTitle?: string): Promise<ApiResponse<EBookProject>> {
    return apiService.post(`/content/ebook/projects/${projectId}/clone`, { newTitle });
  }

  /**
   * Create a new chapter
   */
  async createChapter(projectId: string, chapterData: {
    title?: string;
    content: string;
    chapterNumber?: number;
    orderIndex?: number;
  }): Promise<ApiResponse<EBookChapter>> {
    return apiService.post(`/content/ebook/projects/${projectId}/chapters`, chapterData);
  }

  /**
   * Get all chapters for a project
   */
  async getChapters(projectId: string): Promise<ApiResponse<EBookChapter[]>> {
    return apiService.get(`/content/ebook/projects/${projectId}/chapters`);
  }

  /**
   * Get a specific chapter
   */
  async getChapter(chapterId: string): Promise<ApiResponse<EBookChapter>> {
    return apiService.get(`/content/ebook/chapters/${chapterId}`);
  }

  /**
   * Update chapter
   */
  async updateChapter(chapterId: string, updates: Partial<EBookChapter>): Promise<ApiResponse<EBookChapter>> {
    return apiService.put(`/content/ebook/chapters/${chapterId}`, updates);
  }

  /**
   * Delete chapter
   */
  async deleteChapter(chapterId: string): Promise<ApiResponse<{ success: boolean; id: string }>> {
    return apiService.delete(`/content/ebook/chapters/${chapterId}`);
  }

  /**
   * Reorder chapters
   */
  async reorderChapters(projectId: string, chapterOrders: Array<{ chapterId: string; orderIndex: number }>): Promise<ApiResponse<{ success: boolean }>> {
    return apiService.post(`/content/ebook/projects/${projectId}/chapters/reorder`, { chapterOrders });
  }

  /**
   * Generate chapter outline for a project
   */
  async generateOutline(projectId: string, numberOfChapters: number): Promise<ApiResponse<{ outline: Array<{ title: string; description: string }>, creditsUsed: number }>> {
    return apiService.post(`/content/ebook/projects/${projectId}/generate-outline`, { numberOfChapters });
  }

  /**
   * Generate a single chapter
   */
  async generateChapter(projectId: string, chapterNumber: number, chapterTitle: string, chapterDescription?: string): Promise<ApiResponse<{ chapter: EBookChapter, creditsUsed: number }>> {
    return apiService.post(`/content/ebook/projects/${projectId}/generate-chapter`, {
      chapterNumber,
      chapterTitle,
      chapterDescription
    });
  }

  /**
   * Generate all chapters for a project
   */
  async generateAllChapters(projectId: string): Promise<ApiResponse<{ message: string; totalChapters: number; estimatedCredits: number; status: string }>> {
    return apiService.post(`/content/ebook/projects/${projectId}/generate-all-chapters`);
  }

  /**
   * Get generation status for a project
   */
  async getGenerationStatus(projectId: string): Promise<ApiResponse<{ generationStatus: string; totalChapters: number; generatedChapters: number; outline: any }>> {
    return apiService.get(`/content/ebook/projects/${projectId}/generation-status`);
  }
}

export default new EBookService();

