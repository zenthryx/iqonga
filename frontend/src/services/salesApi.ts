import axios, { AxiosInstance } from 'axios';
import toast from 'react-hot-toast';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://www.iqonga.org/api';

interface Lead {
  id: string;
  user_id: string;
  company_profile_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  job_title?: string;
  lead_source?: string;
  lead_status: string;
  lead_score: number;
  last_activity_at?: string;
  next_activity_due_at?: string;
  is_qualified: boolean;
  disqualification_reason?: string;
  created_at: string;
  updated_at: string;
}

interface Deal {
  id: string;
  user_id: string;
  company_profile_id?: string;
  lead_id?: string;
  deal_name: string;
  amount: number;
  currency: string;
  close_date: string;
  pipeline_id: string;
  stage_id: string;
  win_probability: number;
  deal_status: string;
  lost_reason?: string;
  created_at: string;
  updated_at: string;
}

interface Activity {
  id: string;
  user_id: string;
  lead_id?: string;
  deal_id?: string;
  type: string;
  subject: string;
  notes?: string;
  due_date?: string;
  completed_at?: string;
  status: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

interface Pipeline {
  id: string;
  user_id: string;
  pipeline_name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface PipelineStage {
  id: string;
  pipeline_id: string;
  stage_name: string;
  stage_order: number;
  win_probability: number;
  is_closed_won: boolean;
  is_closed_lost: boolean;
  created_at: string;
  updated_at: string;
}

interface LeadFilters {
  status?: string;
  search?: string;
  source?: string;
  min_score?: number;
  qualified?: boolean;
}

interface DealFilters {
  pipeline_id?: string;
  stage_id?: string;
  status?: string;
  search?: string;
  min_amount?: number;
  max_amount?: number;
}

interface ActivityFilters {
  type?: string;
  status?: string;
  lead_id?: string;
  deal_id?: string;
  date_from?: string;
  date_to?: string;
}

class SalesApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
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
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const { status, data } = error.response;
          
          switch (status) {
            case 401:
              localStorage.removeItem('authToken');
              window.location.href = '/';
              toast.error('Session expired. Please login again.');
              break;
            case 403:
              toast.error('Access denied. Insufficient permissions.');
              break;
            case 404:
              toast.error(data?.message || 'Resource not found.');
              break;
            case 400:
              toast.error(data?.message || 'Invalid request. Please check your input.');
              break;
            case 500:
              toast.error('Server error. Please try again later.');
              break;
            default:
              toast.error(data?.message || 'An error occurred. Please try again.');
          }
        } else if (error.request) {
          toast.error('Network error. Please check your connection.');
        } else {
          toast.error('An unexpected error occurred.');
        }
        
        return Promise.reject(error);
      }
    );
  }

  // ==================== LEADS API ====================

  async getLeads(filters: LeadFilters = {}, page = 1, limit = 20): Promise<{ data: Lead[]; total: number; pages: number }> {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.source) params.append('source', filters.source);
    if (filters.min_score) params.append('min_score', filters.min_score.toString());
    if (filters.qualified !== undefined) params.append('qualified', filters.qualified.toString());
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await this.client.get(`/leads?${params.toString()}`);
    // API returns { success: true, data: [...], total: 0, totalPages: 0 }
    return {
      data: response.data.data || [],
      total: response.data.total || 0,
      pages: response.data.totalPages || 0
    };
  }

  async getLead(id: string): Promise<Lead> {
    const response = await this.client.get(`/leads/${id}`);
    return response.data.data || response.data;
  }

  async createLead(leadData: Partial<Lead>): Promise<Lead> {
    const response = await this.client.post('/leads', leadData);
    toast.success('Lead created successfully!');
    return response.data.data || response.data;
  }

  async updateLead(id: string, leadData: Partial<Lead>): Promise<Lead> {
    const response = await this.client.put(`/leads/${id}`, leadData);
    toast.success('Lead updated successfully!');
    return response.data.data || response.data;
  }

  async deleteLead(id: string): Promise<void> {
    await this.client.delete(`/leads/${id}`);
    toast.success('Lead deleted successfully!');
  }

  async qualifyLead(id: string, qualificationData: any): Promise<Lead> {
    const response = await this.client.post(`/leads/${id}/qualify`, qualificationData);
    toast.success('Lead qualified successfully!');
    return response.data;
  }

  async disqualifyLead(id: string, reason: string): Promise<Lead> {
    const response = await this.client.post(`/leads/${id}/disqualify`, { reason });
    toast.success('Lead disqualified.');
    return response.data;
  }

  async convertLeadToDeal(id: string, dealData: any): Promise<Deal> {
    const response = await this.client.post(`/leads/${id}/convert`, dealData);
    toast.success('Lead converted to deal!');
    return response.data;
  }

  async checkDuplicateLead(email: string): Promise<{ isDuplicate: boolean; lead?: Lead }> {
    const response = await this.client.get(`/leads/check-duplicate?email=${encodeURIComponent(email)}`);
    return response.data;
  }

  // ==================== DEALS API ====================

  async getDeals(filters: DealFilters = {}, page = 1, limit = 20): Promise<{ data: Deal[]; total: number; pages: number }> {
    const params = new URLSearchParams();
    if (filters.pipeline_id) params.append('pipeline_id', filters.pipeline_id);
    if (filters.stage_id) params.append('stage_id', filters.stage_id);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.min_amount) params.append('min_amount', filters.min_amount.toString());
    if (filters.max_amount) params.append('max_amount', filters.max_amount.toString());
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await this.client.get(`/pipeline/deals?${params.toString()}`);
    // API returns { success: true, data: [...], total: 0 }
    return {
      data: response.data.data || [],
      total: response.data.total || 0,
      pages: response.data.totalPages || Math.ceil((response.data.total || 0) / limit)
    };
  }

  async getDeal(id: string): Promise<Deal> {
    const response = await this.client.get(`/pipeline/deals/${id}`);
    return response.data;
  }

  async createDeal(dealData: Partial<Deal>): Promise<Deal> {
    const response = await this.client.post('/pipeline/deals', dealData);
    toast.success('Deal created successfully!');
    return response.data;
  }

  async updateDeal(id: string, dealData: Partial<Deal>): Promise<Deal> {
    const response = await this.client.put(`/pipeline/deals/${id}`, dealData);
    toast.success('Deal updated successfully!');
    return response.data;
  }

  async deleteDeal(id: string): Promise<void> {
    await this.client.delete(`/pipeline/deals/${id}`);
    toast.success('Deal deleted successfully!');
  }

  async moveDealToStage(dealId: string, stageId: string): Promise<Deal> {
    const response = await this.client.post(`/pipeline/deals/${dealId}/move`, { stage_id: stageId });
    return response.data;
  }

  async closeDealWon(id: string): Promise<Deal> {
    const response = await this.client.post(`/pipeline/deals/${id}/close-won`);
    toast.success('Deal marked as won! 🎉');
    return response.data;
  }

  async closeDealLost(id: string, reason: string): Promise<Deal> {
    const response = await this.client.post(`/pipeline/deals/${id}/close-lost`, { reason });
    toast.success('Deal marked as lost.');
    return response.data;
  }

  // ==================== PIPELINES API ====================

  async getPipelines(): Promise<Pipeline[]> {
    const response = await this.client.get('/pipeline/pipelines');
    return response.data.data || response.data || [];
  }

  async getPipeline(id: string): Promise<Pipeline> {
    const response = await this.client.get(`/pipeline/pipelines/${id}`);
    return response.data.data || response.data;
  }

  async createPipeline(pipelineData: Partial<Pipeline>): Promise<Pipeline> {
    const response = await this.client.post('/pipeline/pipelines', pipelineData);
    toast.success('Pipeline created successfully!');
    return response.data;
  }

  async getPipelineStages(pipelineId: string): Promise<PipelineStage[]> {
    const response = await this.client.get(`/pipeline/pipelines/${pipelineId}/stages`);
    return response.data.data || response.data || [];
  }

  async createPipelineStage(pipelineId: string, stageData: Partial<PipelineStage>): Promise<PipelineStage> {
    const response = await this.client.post(`/pipeline/pipelines/${pipelineId}/stages`, stageData);
    toast.success('Stage created successfully!');
    return response.data;
  }

  // ==================== ACTIVITIES API ====================

  async getActivities(filters: ActivityFilters = {}, page = 1, limit = 50): Promise<{ data: Activity[]; total: number; pages: number }> {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.lead_id) params.append('lead_id', filters.lead_id);
    if (filters.deal_id) params.append('deal_id', filters.deal_id);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await this.client.get(`/activities?${params.toString()}`);
    // API returns { success: true, data: [...], total: 0, totalPages: 0 }
    return {
      data: response.data.data || [],
      total: response.data.total || 0,
      pages: response.data.totalPages || 0
    };
  }

  async getActivity(id: string): Promise<Activity> {
    const response = await this.client.get(`/activities/${id}`);
    return response.data;
  }

  async createActivity(activityData: Partial<Activity>): Promise<Activity> {
    const response = await this.client.post('/activities', activityData);
    toast.success('Activity logged successfully!');
    return response.data;
  }

  async updateActivity(id: string, activityData: Partial<Activity>): Promise<Activity> {
    const response = await this.client.put(`/activities/${id}`, activityData);
    toast.success('Activity updated successfully!');
    return response.data;
  }

  async deleteActivity(id: string): Promise<void> {
    await this.client.delete(`/activities/${id}`);
    toast.success('Activity deleted successfully!');
  }

  async completeTask(id: string): Promise<Activity> {
    const response = await this.client.post(`/activities/${id}/complete`);
    toast.success('Task completed!');
    return response.data;
  }

  async getLeadActivities(leadId: string): Promise<Activity[]> {
    const response = await this.client.get(`/activities?lead_id=${leadId}&limit=100`);
    return response.data.data || response.data;
  }

  async getDealActivities(dealId: string): Promise<Activity[]> {
    const response = await this.client.get(`/activities?deal_id=${dealId}&limit=100`);
    return response.data.data || response.data;
  }

  async getOverdueTasks(): Promise<Activity[]> {
    const response = await this.client.get('/activities/overdue');
    return response.data;
  }

  // ==================== DASHBOARD & ANALYTICS ====================

  async getSalesDashboard(): Promise<any> {
    const response = await this.client.get('/pipeline/dashboard');
    return response.data.data || response.data;
  }

  async getSalesForecast(pipelineId?: string): Promise<any> {
    const url = pipelineId ? `/pipeline/forecast?pipeline_id=${pipelineId}` : '/pipeline/forecast';
    const response = await this.client.get(url);
    return response.data.data || response.data;
  }
}

// Export singleton instance
export const salesApi = new SalesApiService();

// Export types
export type { Lead, Deal, Activity, Pipeline, PipelineStage, LeadFilters, DealFilters, ActivityFilters };

