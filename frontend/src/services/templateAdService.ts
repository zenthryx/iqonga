/**
 * Template Ad Service
 * Handles template-based ad generation API calls
 */

import { apiService } from './api';

export interface TextPlaceholder {
  id: string;
  type: 'headline' | 'description' | 'cta' | string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  style: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold' | string;
    color?: string;
    align?: 'left' | 'center' | 'right';
    maxLines?: number;
    strokeColor?: string;
    strokeWidth?: number;
    shadow?: boolean;
    backgroundColor?: string;
    borderRadius?: number;
    padding?: { x: number; y: number };
  };
}

export interface LayoutConfig {
  textPlaceholders: TextPlaceholder[];
}

export interface AdDesignTemplate {
  id: string;
  user_id: number;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  background_image_url: string;
  background_image_path?: string;
  background_color?: string;
  layout_config: LayoutConfig;
  platforms: string[];
  aspect_ratios: string[];
  default_dimensions?: { width: number; height: number };
  times_used: number;
  is_public: boolean;
  is_system_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface CopyVariant {
  headline?: string;
  description?: string;
  primaryText?: string;
  cta?: string;
  callToAction?: string;
  [key: string]: any;
}

export interface GeneratedAd {
  id: string;
  user_id: number;
  template_id: string;
  headline?: string;
  description?: string;
  cta_text?: string;
  image_url: string;
  image_path?: string;
  platform?: string;
  format?: string;
  aspect_ratio?: string;
  generation_time_ms?: number;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

class TemplateAdService {

  // ====================================
  // TEMPLATE MANAGEMENT
  // ====================================

  /**
   * List templates
   */
  async listTemplates(options?: {
    category?: string;
    platform?: string;
    search?: string;
    includePublic?: boolean;
  }): Promise<ApiResponse<AdDesignTemplate[]>> {
    const response = await apiService.get('/template-ads/templates', {
      params: options
    });
    return (response as any).data || response;
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<ApiResponse<AdDesignTemplate>> {
    const response = await apiService.get(`/template-ads/templates/${id}`);
    return (response as any).data || response;
  }

  /**
   * Create template
   */
  async createTemplate(templateData: {
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
    backgroundImageUrl: string;
    backgroundImagePath?: string;
    backgroundColor?: string;
    layoutConfig: LayoutConfig;
    platforms?: string[];
    aspectRatios?: string[];
    defaultDimensions?: { width: number; height: number };
  }): Promise<ApiResponse<AdDesignTemplate>> {
    const response = await apiService.post('/template-ads/templates', templateData);
    return (response as any).data || response;
  }

  /**
   * Update template
   */
  async updateTemplate(
    id: string,
    updates: Partial<AdDesignTemplate>
  ): Promise<ApiResponse<AdDesignTemplate>> {
    const response = await apiService.put(`/template-ads/templates/${id}`, updates);
    return (response as any).data || response;
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<ApiResponse<void>> {
    const response = await apiService.delete(`/template-ads/templates/${id}`);
    return (response as any).data || response;
  }

  // ====================================
  // AD GENERATION
  // ====================================

  /**
   * Generate ad variations from template
   */
  async generateVariations(
    templateId: string,
    copyVariants: CopyVariant[],
    options?: {
      platform?: string;
      format?: string;
      saveToDatabase?: boolean;
    }
  ): Promise<ApiResponse<Array<{
    imagePath: string;
    imageUrl: string;
    generationTimeMs: number;
    copy: CopyVariant;
    error?: string;
  }>>> {
    const response = await apiService.post(
      `/template-ads/templates/${templateId}/generate`,
      {
        copyVariants,
        ...options,
      }
    );
    return (response as any).data || response;
  }

  /**
   * Batch generate from CSV
   */
  async batchGenerateFromCSV(
    templateId: string,
    csvFile: File,
    options?: {
      platform?: string;
      format?: string;
    }
  ): Promise<ApiResponse<Array<{
    imagePath: string;
    imageUrl: string;
    generationTimeMs: number;
    copy: CopyVariant;
    error?: string;
  }>>> {
    const formData = new FormData();
    formData.append('csv', csvFile);
    if (options?.platform) formData.append('platform', options.platform);
    if (options?.format) formData.append('format', options.format);

    const response = await apiService.post(
      `/template-ads/templates/${templateId}/batch-generate`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return (response as any).data || response;
  }

  /**
   * Get generated ads for template
   */
  async getGeneratedAds(
    templateId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ApiResponse<GeneratedAd[]>> {
    const response = await apiService.get(
      `/template-ads/templates/${templateId}/generated`,
      {
        params: options
      }
    );
    return (response as any).data || response;
  }
}

export default new TemplateAdService();
