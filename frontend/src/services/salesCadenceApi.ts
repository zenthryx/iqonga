/**
 * Sales Cadence API Client
 * Handles all cadence-related API calls
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://www.iqonga.org/api';

class SalesCadenceApi {
  private client;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          console.error('Unauthorized - please log in');
        }
        return Promise.reject(error);
      }
    );
  }

  // ====================================
  // CADENCE MANAGEMENT
  // ====================================

  async getCadences(filters?: { is_active?: boolean; channel?: string; search?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.channel) params.append('channel', filters.channel);
    if (filters?.search) params.append('search', filters.search);

    const response = await this.client.get(`/sales-cadences?${params.toString()}`);
    return response.data.data || [];
  }

  async getCadence(id: string): Promise<any> {
    const response = await this.client.get(`/sales-cadences/${id}`);
    return response.data.data || response.data;
  }

  async createCadence(cadenceData: any): Promise<any> {
    const response = await this.client.post('/sales-cadences', cadenceData);
    return response.data.data || response.data;
  }

  async updateCadence(id: string, updates: any): Promise<any> {
    const response = await this.client.put(`/sales-cadences/${id}`, updates);
    return response.data.data || response.data;
  }

  async deleteCadence(id: string): Promise<void> {
    await this.client.delete(`/sales-cadences/${id}`);
  }

  async getCadenceStats(id: string): Promise<any> {
    const response = await this.client.get(`/sales-cadences/${id}/stats`);
    return response.data.data || response.data;
  }

  // ====================================
  // STEP MANAGEMENT
  // ====================================

  async getSteps(cadenceId: string): Promise<any[]> {
    const response = await this.client.get(`/sales-cadences/${cadenceId}/steps`);
    return response.data.data || [];
  }

  async addStep(cadenceId: string, stepData: any): Promise<any> {
    const response = await this.client.post(`/sales-cadences/${cadenceId}/steps`, stepData);
    return response.data.data || response.data;
  }

  async updateStep(cadenceId: string, stepId: string, updates: any): Promise<any> {
    const response = await this.client.put(`/sales-cadences/${cadenceId}/steps/${stepId}`, updates);
    return response.data.data || response.data;
  }

  async deleteStep(cadenceId: string, stepId: string): Promise<void> {
    await this.client.delete(`/sales-cadences/${cadenceId}/steps/${stepId}`);
  }

  // ====================================
  // ENROLLMENT MANAGEMENT
  // ====================================

  async getEnrollments(cadenceId: string, filters?: { status?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);

    const response = await this.client.get(`/sales-cadences/${cadenceId}/enrollments?${params.toString()}`);
    return response.data.data || [];
  }

  async enrollLead(cadenceId: string, leadId: string, dealId?: string): Promise<any> {
    const response = await this.client.post(`/sales-cadences/${cadenceId}/enroll`, {
      leadId,
      dealId
    });
    return response.data.data || response.data;
  }

  async pauseEnrollment(enrollmentId: string): Promise<any> {
    const response = await this.client.post(`/sales-cadences/enrollments/${enrollmentId}/pause`);
    return response.data.data || response.data;
  }

  async resumeEnrollment(enrollmentId: string): Promise<any> {
    const response = await this.client.post(`/sales-cadences/enrollments/${enrollmentId}/resume`);
    return response.data.data || response.data;
  }

  async stopEnrollment(enrollmentId: string, reason?: string): Promise<any> {
    const response = await this.client.post(`/sales-cadences/enrollments/${enrollmentId}/stop`, { reason });
    return response.data.data || response.data;
  }
}

export default new SalesCadenceApi();

