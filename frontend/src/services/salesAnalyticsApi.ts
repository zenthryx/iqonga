import axios, { AxiosInstance } from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://www.iqonga.org/api';

/**
 * Sales Analytics API Client
 * Provides methods for fetching sales analytics data
 */
class SalesAnalyticsAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/sales-analytics`,
      headers: {
        'Content-Type': 'application/json'
      }
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
        const message = error.response?.data?.error || error.message || 'An error occurred';
        toast.error(message);
        throw error;
      }
    );
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(dateRange?: { startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
    if (dateRange?.endDate) params.append('endDate', dateRange.endDate);

    const response = await this.client.get(`/dashboard?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Get revenue over time
   */
  async getRevenueChart(
    dateRange?: { startDate?: string; endDate?: string },
    groupBy: 'day' | 'week' | 'month' = 'month'
  ) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
    if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
    params.append('groupBy', groupBy);

    const response = await this.client.get(`/revenue-chart?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Get lead sources attribution
   */
  async getLeadSources(dateRange?: { startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
    if (dateRange?.endDate) params.append('endDate', dateRange.endDate);

    const response = await this.client.get(`/lead-sources?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Get conversion funnel
   */
  async getConversionFunnel(dateRange?: { startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
    if (dateRange?.endDate) params.append('endDate', dateRange.endDate);

    const response = await this.client.get(`/conversion-funnel?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Get sales velocity
   */
  async getSalesVelocity(dateRange?: { startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
    if (dateRange?.endDate) params.append('endDate', dateRange.endDate);

    const response = await this.client.get(`/sales-velocity?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Get win/loss analysis
   */
  async getWinLossAnalysis(dateRange?: { startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
    if (dateRange?.endDate) params.append('endDate', dateRange.endDate);

    const response = await this.client.get(`/win-loss?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Export data to CSV
   */
  async exportToCSV(
    reportType: 'leads' | 'deals' | 'activities',
    dateRange?: { startDate?: string; endDate?: string }
  ) {
    const params = new URLSearchParams();
    params.append('reportType', reportType);
    if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
    if (dateRange?.endDate) params.append('endDate', dateRange.endDate);

    const response = await this.client.get(`/export/csv?${params.toString()}`, {
      responseType: 'blob'
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportType}_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast.success(`${reportType} exported successfully!`);
  }
}

export const salesAnalyticsApi = new SalesAnalyticsAPI();
export default salesAnalyticsApi;

