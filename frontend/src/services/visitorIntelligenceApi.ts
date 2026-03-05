/**
 * Visitor Intelligence API Client
 * Handles all visitor tracking and intelligence API calls
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://www.iqonga.org/api';

class VisitorIntelligenceApi {
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
          console.error('Unauthorized - please log in');
        }
        return Promise.reject(error);
      }
    );
  }

  // ====================================
  // VISITOR TRACKING (Public endpoints)
  // ====================================

  async trackVisitor(userId: number, visitorData: any): Promise<any> {
    const response = await this.client.post('/visitor-intelligence/track', {
      ...visitorData,
      user_id: userId
    });
    return response.data.data || response.data;
  }

  async trackSession(userId: number, sessionData: any): Promise<any> {
    const response = await this.client.post('/visitor-intelligence/session', {
      ...sessionData,
      user_id: userId
    });
    return response.data.data || response.data;
  }

  async trackPageView(userId: number, pageViewData: any): Promise<any> {
    const response = await this.client.post('/visitor-intelligence/pageview', {
      ...pageViewData,
      user_id: userId
    });
    return response.data.data || response.data;
  }

  async trackEvent(userId: number, eventData: any): Promise<any> {
    const response = await this.client.post('/visitor-intelligence/event', {
      ...eventData,
      user_id: userId
    });
    return response.data.data || response.data;
  }

  // ====================================
  // VISITOR MANAGEMENT (Authenticated)
  // ====================================

  async getVisitors(filters?: {
    converted?: boolean;
    min_score?: number;
    company_domain?: string;
    limit?: number;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.converted !== undefined) params.append('converted', filters.converted.toString());
    if (filters?.min_score !== undefined) params.append('min_score', filters.min_score.toString());
    if (filters?.company_domain) params.append('company_domain', filters.company_domain);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await this.client.get(`/visitor-intelligence/visitors?${params.toString()}`);
    return response.data.data || [];
  }

  async getVisitorDetails(visitorId: string): Promise<any> {
    const response = await this.client.get(`/visitor-intelligence/visitors/${visitorId}`);
    return response.data.data || response.data;
  }

  async convertVisitorToLead(
    visitorId: string,
    conversionType: string = 'manual',
    conversionSource: string = 'manual'
  ): Promise<any> {
    const response = await this.client.post(`/visitor-intelligence/visitors/${visitorId}/convert`, {
      conversion_type: conversionType,
      conversion_source: conversionSource
    });
    return response.data.data || response.data;
  }

  async getAnalytics(dateRange?: { start?: string; end?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (dateRange?.start) params.append('start', dateRange.start);
    if (dateRange?.end) params.append('end', dateRange.end);

    const response = await this.client.get(`/visitor-intelligence/analytics?${params.toString()}`);
    return response.data.data || response.data;
  }
}

export default new VisitorIntelligenceApi();

