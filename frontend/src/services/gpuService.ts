import { ApiResponse } from '@/types';
import { apiService } from './api';

export interface GPUJobConfig {
  jobType: 'image' | 'video' | 'text';
  model: string;
  parameters: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
  webhook?: string;
}

export interface GPUJobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  output?: string;
  error?: string;
  created_at: string;
  updated_at: string;
}

class GPUService {
  private GPU_API_URL = process.env.REACT_APP_GPU_API_URL;
  private GPU_API_KEY = process.env.REACT_APP_GPU_API_KEY;

  // Submit a job to GPU.net
  async submitJob(config: GPUJobConfig): Promise<ApiResponse<{ jobId: string }>> {
    return apiService.post('/gpu/jobs', {
      ...config,
      apiKey: this.GPU_API_KEY,
      webhook: `${process.env.REACT_APP_API_URL}/gpu/webhooks/${config.jobType}`
    });
  }

  // Get job status
  async getJobStatus(jobId: string): Promise<ApiResponse<GPUJobStatus>> {
    return apiService.get(`/gpu/jobs/${jobId}/status`);
  }

  // Image Generation on GPU.net
  async generateImage(prompt: string, style: string): Promise<ApiResponse<{ jobId: string }>> {
    return this.submitJob({
      jobType: 'image',
      model: 'stability-ai-sdxl',
      parameters: {
        prompt,
        style,
        num_inference_steps: 50,
        guidance_scale: 7.5,
        width: 1024,
        height: 1024
      },
      priority: 'high'
    });
  }

  // Video Generation on GPU.net
  async generateVideo(prompt: string, duration: number): Promise<ApiResponse<{ jobId: string }>> {
    return this.submitJob({
      jobType: 'video',
      model: 'stability-ai-video',
      parameters: {
        prompt,
        duration,
        fps: 30,
        width: 1024,
        height: 1024
      },
      priority: 'medium'
    });
  }

  // Text Processing on GPU (for complex NLP tasks)
  async processText(text: string, task: string): Promise<ApiResponse<{ jobId: string }>> {
    return this.submitJob({
      jobType: 'text',
      model: 'llama2-70b',
      parameters: {
        input: text,
        task,
        max_tokens: 2000,
        temperature: 0.7
      },
      priority: 'low'
    });
  }

  // Cancel a running job
  async cancelJob(jobId: string): Promise<ApiResponse<void>> {
    return apiService.post(`/gpu/jobs/${jobId}/cancel`);
  }

  // Get GPU cluster status
  async getClusterStatus(): Promise<ApiResponse<{
    available_gpus: number;
    total_gpus: number;
    queue_length: number;
    average_wait_time: number;
  }>> {
    return apiService.get('/gpu/cluster/status');
  }
}

export const gpuService = new GPUService(); 