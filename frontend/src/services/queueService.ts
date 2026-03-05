import { ApiResponse } from '@/types';
import { apiService } from './api';
import { GPUJobConfig, GPUJobStatus } from './gpuService';

export interface QueuedJob extends GPUJobStatus {
  queuePosition: number;
  estimatedStartTime: string;
  estimatedCompletionTime: string;
  resourceRequirements: {
    gpu_memory: number;
    cpu_cores: number;
    expected_duration: number;
  };
}

class QueueService {
  // Add a job to the queue
  async enqueueJob(config: GPUJobConfig): Promise<ApiResponse<QueuedJob>> {
    return apiService.post('/queue/jobs', config);
  }

  // Get queue status for a specific job
  async getJobQueueStatus(jobId: string): Promise<ApiResponse<QueuedJob>> {
    return apiService.get(`/queue/jobs/${jobId}`);
  }

  // Get all queued jobs for the current user
  async getUserJobs(): Promise<ApiResponse<QueuedJob[]>> {
    return apiService.get('/queue/jobs/user');
  }

  // Update job priority
  async updateJobPriority(jobId: string, priority: 'low' | 'medium' | 'high'): Promise<ApiResponse<QueuedJob>> {
    return apiService.patch(`/queue/jobs/${jobId}/priority`, { priority });
  }

  // Cancel a queued job
  async cancelQueuedJob(jobId: string): Promise<ApiResponse<void>> {
    return apiService.delete(`/queue/jobs/${jobId}`);
  }

  // Get queue statistics
  async getQueueStats(): Promise<ApiResponse<{
    total_jobs: number;
    active_jobs: number;
    completed_jobs: number;
    failed_jobs: number;
    average_wait_time: number;
    average_processing_time: number;
  }>> {
    return apiService.get('/queue/stats');
  }

  // Estimate completion time for a new job
  async estimateCompletionTime(config: GPUJobConfig): Promise<ApiResponse<{
    estimated_start_time: string;
    estimated_completion_time: string;
    queue_position: number;
  }>> {
    return apiService.post('/queue/estimate', config);
  }
}

export const queueService = new QueueService(); 