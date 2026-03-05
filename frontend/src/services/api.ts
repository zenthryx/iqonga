import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse } from '@/types';
import toast from 'react-hot-toast';
import { isForumDomain, getAuthUrl, getApiBaseUrl } from '@/utils/domain';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: getApiBaseUrl(),
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Don't set Content-Type for FormData (let browser set it with boundary)
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        // Handle common error cases
        if (error.response) {
          const { status, data } = error.response;
          
          switch (status) {
            case 401:
              // Check if this is a Twitter Analytics endpoint (Twitter connection issue, not session expiration)
              const url = error.config?.url || '';
              if (url.includes('/twitter-analytics/')) {
                // Twitter connection issue - don't redirect, just show message
                const errorMessage = data?.details || data?.message || 'Twitter account not connected. Please connect your Twitter account first.';
                toast.error(errorMessage, {
                  duration: 5000,
                });
                // Mark as handled so components can handle it gracefully
                error._handledByInterceptor = true;
                error._isTwitterConnectionError = true;
              } else {
                // Session expiration - redirect to login (on forum domain send to main platform with returnUrl)
                localStorage.removeItem('authToken');
                if (isForumDomain()) {
                  window.location.href = getAuthUrl({ returnUrl: `${window.location.origin}/auth/callback`, source: 'forum' });
                } else {
                  window.location.href = '/';
                }
                toast.error('Session expired. Please login again.');
              }
              break;
              
            case 403:
              toast.error('Access denied. Insufficient permissions.');
              break;
              
            case 404:
              toast.error('Resource not found.');
              break;
              
            case 402:
              // Payment Required - Show friendly credit/debt limit message
              // Replace newlines with spaces for toast display (toasts don't support multi-line well)
              const friendlyMessage = (data?.friendlyMessage || data?.message || data?.details || 'Insufficient credits. Please purchase more credits to continue.')
                .replace(/\n\n/g, ' ')
                .replace(/\n/g, ' ')
                .trim();
              toast.error(friendlyMessage, {
                duration: 8000, // Show for 8 seconds since it's a longer message
                style: {
                  maxWidth: '500px',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }
              });
              // Mark that we've handled this error so components don't show duplicate toasts
              error._handledByInterceptor = true;
              break;
              
            case 429:
              toast.error('Too many requests. Please try again later.');
              break;
              
            case 500:
              toast.error('Server error. Please try again later.');
              break;
              
            default:
              if (data?.message) {
                toast.error(data.message);
              } else {
                toast.error('An unexpected error occurred.');
              }
          }
        } else if (error.request) {
          // Network error
          toast.error('Network error. Please check your connection.');
        } else {
          toast.error('An unexpected error occurred.');
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // File upload method
  async upload<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.client.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            onProgress(Math.round(progress));
          }
        },
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Download method
  async download(url: string, filename?: string): Promise<void> {
    try {
      const response = await this.client.get(url, {
        responseType: 'blob',
      });

      // Create blob link to download
      const blob = new Blob([response.data]);
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename || 'download';
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any) {
    if (error.response?.data) {
      return error.response.data;
    } else if (error.message) {
      return {
        success: false,
        error: error.message,
      };
    } else {
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  // Utility method to build query string
  buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach((item) => searchParams.append(key, item));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });
    
    return searchParams.toString();
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.success;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService(); 