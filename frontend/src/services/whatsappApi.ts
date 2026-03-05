import axios, { AxiosInstance } from 'axios';
import {
  WhatsAppAccount,
  WhatsAppContact,
  WhatsAppContactGroup,
  WhatsAppTemplate,
  WhatsAppCampaign,
  WhatsAppCampaignRecipient,
  WhatsAppBot,
  WhatsAppBotExecution,
  WhatsAppMessage,
  WhatsAppConversation,
  ConnectAccountForm,
  CreateContactForm,
  CreateTemplateForm,
  CreateCampaignForm,
  CreateBotForm,
  ContactFilters,
  TemplateFilters,
  CampaignFilters,
  BotFilters,
  CampaignStats,
  ApiResponse,
  PaginatedResponse,
} from '../types/whatsapp';

// Get API base URL from environment or use default
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class WhatsAppApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/whatsapp`,
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
          if (status === 401) {
            // Handle unauthorized - redirect to login
            localStorage.removeItem('authToken');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ====================================
  // ACCOUNT MANAGEMENT
  // ====================================

  async getAccounts(): Promise<ApiResponse<{ accounts: WhatsAppAccount[] }>> {
    const response = await this.client.get('/accounts');
    return response.data;
  }

  async connectAccount(data: ConnectAccountForm): Promise<ApiResponse<{ account: WhatsAppAccount }>> {
    const response = await this.client.post('/accounts/connect', data);
    return response.data;
  }

  async getAccount(accountId: string): Promise<ApiResponse<{ account: WhatsAppAccount }>> {
    const response = await this.client.get(`/accounts/${accountId}`);
    return response.data;
  }

  async updateAccount(accountId: string, data: Partial<WhatsAppAccount>): Promise<ApiResponse<{ account: WhatsAppAccount }>> {
    const response = await this.client.put(`/accounts/${accountId}`, data);
    return response.data;
  }

  async disconnectAccount(accountId: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/accounts/${accountId}`);
    return response.data;
  }

  // ====================================
  // CONTACT MANAGEMENT
  // ====================================

  async getContacts(filters?: ContactFilters): Promise<PaginatedResponse<WhatsAppContact>> {
    const response = await this.client.get('/contacts', { params: filters });
    return response.data;
  }

  async getContact(contactId: string): Promise<ApiResponse<{ contact: WhatsAppContact }>> {
    const response = await this.client.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createContact(data: CreateContactForm): Promise<ApiResponse<{ contact: WhatsAppContact }>> {
    const response = await this.client.post('/contacts', data);
    return response.data;
  }

  async updateContact(contactId: string, data: Partial<CreateContactForm>): Promise<ApiResponse<{ contact: WhatsAppContact }>> {
    const response = await this.client.put(`/contacts/${contactId}`, data);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/contacts/${contactId}`);
    return response.data;
  }

  async findDuplicateContacts(phoneNumber: string): Promise<ApiResponse<{ duplicates: WhatsAppContact[] }>> {
    const response = await this.client.get('/contacts/duplicates', { params: { phoneNumber } });
    return response.data;
  }

  async importContacts(data: { wabaId: string; contacts: any[]; format?: 'json' | 'csv' }): Promise<ApiResponse<{ imported: number; failed: number; duplicates: number; details: any }>> {
    const response = await this.client.post('/contacts/import', data);
    return response.data;
  }

  async exportContacts(filters?: ContactFilters): Promise<Blob> {
    const response = await this.client.get('/contacts/export', { 
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  }

  // ====================================
  // CONTACT GROUPS
  // ====================================

  async getContactGroups(wabaId?: string, filters?: { search?: string; limit?: number; offset?: number }): Promise<PaginatedResponse<WhatsAppContactGroup>> {
    const response = await this.client.get('/groups', { params: { wabaId, ...filters } });
    return response.data;
  }

  async getContactGroup(groupId: string): Promise<ApiResponse<{ group: WhatsAppContactGroup }>> {
    const response = await this.client.get(`/groups/${groupId}`);
    return response.data;
  }

  async createContactGroup(data: { name: string; description?: string; wabaId: string }): Promise<ApiResponse<{ group: WhatsAppContactGroup }>> {
    const response = await this.client.post('/groups', data);
    return response.data;
  }

  async updateContactGroup(groupId: string, data: Partial<WhatsAppContactGroup>): Promise<ApiResponse<{ group: WhatsAppContactGroup }>> {
    const response = await this.client.put(`/groups/${groupId}`, data);
    return response.data;
  }

  async deleteContactGroup(groupId: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/groups/${groupId}`);
    return response.data;
  }

  async addContactsToGroup(groupId: string, contactIds: string[]): Promise<ApiResponse<void>> {
    const response = await this.client.post(`/groups/${groupId}/members`, { contactIds });
    return response.data;
  }

  async removeContactFromGroup(groupId: string, contactId: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/groups/${groupId}/members/${contactId}`);
    return response.data;
  }

  // ====================================
  // TEMPLATES
  // ====================================

  async getTemplates(filters?: TemplateFilters): Promise<PaginatedResponse<WhatsAppTemplate>> {
    const response = await this.client.get('/templates', { params: filters });
    return response.data;
  }

  async getTemplate(templateId: string): Promise<ApiResponse<{ template: WhatsAppTemplate }>> {
    const response = await this.client.get(`/templates/${templateId}`);
    return response.data;
  }

  async createTemplate(data: CreateTemplateForm): Promise<ApiResponse<{ template: WhatsAppTemplate }>> {
    const response = await this.client.post('/templates', data);
    return response.data;
  }

  async updateTemplate(templateId: string, data: Partial<CreateTemplateForm>): Promise<ApiResponse<{ template: WhatsAppTemplate }>> {
    const response = await this.client.put(`/templates/${templateId}`, data);
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/templates/${templateId}`);
    return response.data;
  }

  async submitTemplate(templateId: string): Promise<ApiResponse<{ template: WhatsAppTemplate }>> {
    const response = await this.client.post(`/templates/${templateId}/submit`);
    return response.data;
  }

  async syncTemplates(wabaId: string): Promise<ApiResponse<{ synced: number; updated: number; total: number }>> {
    const response = await this.client.post('/templates/sync', { wabaId });
    return response.data;
  }

  // ====================================
  // CAMPAIGNS
  // ====================================

  async getCampaigns(filters?: CampaignFilters): Promise<PaginatedResponse<WhatsAppCampaign>> {
    const response = await this.client.get('/campaigns', { params: filters });
    return response.data;
  }

  async getCampaign(campaignId: string): Promise<ApiResponse<{ campaign: WhatsAppCampaign }>> {
    const response = await this.client.get(`/campaigns/${campaignId}`);
    return response.data;
  }

  async createCampaign(data: CreateCampaignForm): Promise<ApiResponse<{ campaign: WhatsAppCampaign }>> {
    const response = await this.client.post('/campaigns', data);
    return response.data;
  }

  async sendCampaign(campaignId: string, sendNow: boolean = false): Promise<ApiResponse<{ campaignId: string; sent: number; failed: number; remaining: number; status: string }>> {
    const response = await this.client.post(`/campaigns/${campaignId}/send`, { sendNow });
    return response.data;
  }

  async getCampaignStats(campaignId: string): Promise<ApiResponse<{ stats: CampaignStats }>> {
    const response = await this.client.get(`/campaigns/${campaignId}/stats`);
    return response.data;
  }

  async getCampaignRecipients(campaignId: string, filters?: { status?: string; limit?: number; offset?: number }): Promise<ApiResponse<{ recipients: WhatsAppCampaignRecipient[]; count: number }>> {
    const response = await this.client.get(`/campaigns/${campaignId}/recipients`, { params: filters });
    return response.data;
  }

  async deleteCampaign(campaignId: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/campaigns/${campaignId}`);
    return response.data;
  }

  // ====================================
  // BOTS
  // ====================================

  async getBots(filters?: BotFilters): Promise<PaginatedResponse<WhatsAppBot>> {
    const response = await this.client.get('/bots', { params: filters });
    return response.data;
  }

  async getBot(botId: string): Promise<ApiResponse<{ bot: WhatsAppBot }>> {
    const response = await this.client.get(`/bots/${botId}`);
    return response.data;
  }

  async createBot(data: CreateBotForm): Promise<ApiResponse<{ bot: WhatsAppBot }>> {
    const response = await this.client.post('/bots', data);
    return response.data;
  }

  async updateBot(botId: string, data: Partial<CreateBotForm>): Promise<ApiResponse<{ bot: WhatsAppBot }>> {
    const response = await this.client.put(`/bots/${botId}`, data);
    return response.data;
  }

  async deleteBot(botId: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/bots/${botId}`);
    return response.data;
  }

  async testBot(botId: string, testMessage: string): Promise<ApiResponse<{ matches: boolean; triggerType: string; triggerText: string; wouldExecute: boolean }>> {
    const response = await this.client.post(`/bots/${botId}/test`, { testMessage });
    return response.data;
  }

  async getBotExecutions(botId: string, filters?: { limit?: number; offset?: number }): Promise<ApiResponse<{ executions: WhatsAppBotExecution[]; count: number }>> {
    const response = await this.client.get(`/bots/${botId}/executions`, { params: filters });
    return response.data;
  }

  // ====================================
  // MESSAGES & CONVERSATIONS
  // ====================================

  async getConversations(filters?: { wabaId?: string; contactId?: string; search?: string; limit?: number; offset?: number }): Promise<PaginatedResponse<WhatsAppConversation>> {
    const response = await this.client.get('/conversations', { params: filters });
    return response.data;
  }

  async getConversation(conversationId: string): Promise<ApiResponse<{ conversation: WhatsAppConversation }>> {
    const response = await this.client.get(`/conversations/${conversationId}`);
    return response.data;
  }

  async sendMessage(data: { wabaId: string; to: string; message: string; type?: 'text' | 'image' | 'video' | 'document' }): Promise<ApiResponse<{ message: WhatsAppMessage }>> {
    const response = await this.client.post('/messages', data);
    return response.data;
  }

  async getMessages(contactId: string, filters?: { limit?: number; offset?: number }): Promise<PaginatedResponse<WhatsAppMessage>> {
    const response = await this.client.get('/messages', { params: { contactId, ...filters } });
    return response.data;
  }
}

// Export singleton instance
export const whatsappApi = new WhatsAppApiService();
export default whatsappApi;
