/**
 * Sales Email API Client
 * TypeScript API client for email integration in Sales & CRM
 */

import axios, { AxiosInstance } from 'axios';
import { toast } from 'react-hot-toast';

// Types
export interface EmailTemplate {
  id: string;
  user_id: number;
  company_profile_id?: string;
  template_name: string;
  template_category: 'introduction' | 'follow_up' | 'proposal' | 'meeting_request' | 'thank_you' | 'custom';
  subject: string;
  body_text?: string;
  body_html: string;
  is_default: boolean;
  is_active: boolean;
  use_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  created_by_name?: string;
}

export interface SentEmail {
  id: string;
  user_id: number;
  lead_id?: string;
  deal_id?: string;
  activity_id?: string;
  email_account_id?: string;
  template_id?: string;
  to_email: string;
  cc_emails?: string[];
  bcc_emails?: string[];
  subject: string;
  body_text?: string;
  body_html: string;
  tracking_id: string;
  opened_at?: string;
  open_count: number;
  clicked_at?: string;
  click_count: number;
  replied_at?: string;
  message_id?: string;
  sent_status: 'sent' | 'failed' | 'bounced';
  error_message?: string;
  sent_at: string;
  sent_by?: number;
  sent_by_name?: string;
  template_name?: string;
}

export interface SendEmailData {
  leadId?: string;
  dealId?: string;
  emailAccountId: string;
  templateId?: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  useTracking?: boolean;
}

export interface PersonalizationToken {
  token: string;
  description: string;
}

export interface TemplateCategory {
  value: string;
  label: string;
  icon: string;
}

class SalesEmailAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api/sales-email',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add auth token to requests
    this.client.interceptors.request.use(config => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors
    this.client.interceptors.response.use(
      response => response,
      error => {
        const message = error.response?.data?.message || error.response?.data?.error || 'An error occurred';
        
        // Don't show toasts for tracking endpoints
        if (!error.config?.url?.includes('/open/') && !error.config?.url?.includes('/click/')) {
          toast.error(message);
        }
        
        throw error;
      }
    );
  }

  // ==========================================
  // EMAIL TEMPLATES
  // ==========================================

  async getTemplates(filters?: {
    category?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<EmailTemplate[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.search) params.append('search', filters.search);

    const response = await this.client.get(`/templates?${params.toString()}`);
    return response.data.data || [];
  }

  async getTemplate(id: string): Promise<EmailTemplate> {
    const response = await this.client.get(`/templates/${id}`);
    return response.data.data;
  }

  async createTemplate(data: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const response = await this.client.post('/templates', data);
    toast.success('Email template created successfully');
    return response.data.data;
  }

  async updateTemplate(id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const response = await this.client.put(`/templates/${id}`, data);
    toast.success('Email template updated successfully');
    return response.data.data;
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.client.delete(`/templates/${id}`);
    toast.success('Email template deleted successfully');
  }

  async duplicateTemplate(id: string): Promise<EmailTemplate> {
    const response = await this.client.post(`/templates/${id}/duplicate`);
    toast.success('Email template duplicated successfully');
    return response.data.data;
  }

  async getAvailableTokens(): Promise<PersonalizationToken[]> {
    const response = await this.client.get('/tokens');
    return response.data.data || [];
  }

  async getCategories(): Promise<TemplateCategory[]> {
    const response = await this.client.get('/categories');
    return response.data.data || [];
  }

  // ==========================================
  // SEND EMAILS
  // ==========================================

  async sendEmail(data: SendEmailData): Promise<{
    sentEmail: SentEmail;
    activity: any;
  }> {
    const response = await this.client.post('/send', data);
    toast.success('Email sent successfully');
    return response.data.data;
  }

  // ==========================================
  // EMAIL STATS
  // ==========================================

  async getSentEmails(filters?: {
    leadId?: string;
    dealId?: string;
    status?: string;
    limit?: number;
  }): Promise<SentEmail[]> {
    const params = new URLSearchParams();
    if (filters?.leadId) params.append('leadId', filters.leadId);
    if (filters?.dealId) params.append('dealId', filters.dealId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await this.client.get(`/sent?${params.toString()}`);
    return response.data.data || [];
  }

  async getEmailStats(id: string): Promise<SentEmail & {
    total_link_clicks: number;
    link_clicks: Array<{ original_url: string; click_count: number }>;
  }> {
    const response = await this.client.get(`/stats/${id}`);
    return response.data.data;
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  replaceTokens(template: string, data: Record<string, any>): string {
    let result = template;

    const tokenMap: Record<string, string> = {
      '{{first_name}}': data.first_name || '',
      '{{last_name}}': data.last_name || '',
      '{{email}}': data.email || '',
      '{{company_name}}': data.company_name || '',
      '{{job_title}}': data.job_title || '',
      '{{phone}}': data.phone || '',
      '{{sender_name}}': data.sender_name || '',
      '{{sender_email}}': data.sender_email || '',
      '{{sender_company}}': data.sender_company || '',
      '{{sender_phone}}': data.sender_phone || ''
    };

    for (const [token, value] of Object.entries(tokenMap)) {
      result = result.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }

    return result;
  }

  getTrackingUrl(trackingId: string, type: 'open' | 'click', url?: string): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'https://www.iqonga.org/api';
    if (type === 'open') {
      return `${baseUrl}/api/sales-email/open/${trackingId}`;
    } else {
      return `${baseUrl}/api/sales-email/click/${trackingId}?url=${encodeURIComponent(url || '')}`;
    }
  }
}

export const salesEmailApi = new SalesEmailAPI();
export default salesEmailApi;

