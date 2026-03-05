import { apiService } from './api';

export interface CryptoMonitor {
  id: string;
  token_symbol: string;
  token_name?: string;
  is_active: boolean;
  sentiment_threshold: number;
  mention_spike_threshold: number;
  influencer_handles?: string[];
  auto_post_enabled: boolean;
  post_channels: string[];
  content_style?: string;
}

export interface SentimentSnapshot {
  id: string;
  token_symbol: string;
  sentiment_score: number;
  mention_count: number;
  snapshot_time: string;
  market_moving_phrases?: string[];
}

export interface CryptoAlert {
  id: string;
  monitor_id?: string;
  user_id?: number;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  data?: any; // JSONB field from database
  alert_data?: any; // Alias for data
  token_symbol?: string; // Extracted from monitor or data
  channels_sent?: string[];
  content_generated_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface UsageSummary {
  total_operations: number;
  total_calls: number;
  credits_used: number;
  estimated_cost: number;
  by_operation: Array<{
    operation_type: string;
    ops: number;
    calls: number;
    credits: number;
  }>;
}

export const cryptoService = {
  listMonitors: () => apiService.get<CryptoMonitor[]>('/crypto/monitors'),
  createMonitor: (payload: Partial<CryptoMonitor>) =>
    apiService.post<CryptoMonitor>('/crypto/monitors', payload),
  updateMonitor: (id: string, payload: Partial<CryptoMonitor>) =>
    apiService.put<CryptoMonitor>(`/crypto/monitors/${id}`, payload),
  activateMonitor: (id: string) => apiService.post<CryptoMonitor>(`/crypto/monitors/${id}/activate`, {}),
  deactivateMonitor: (id: string) =>
    apiService.post<CryptoMonitor>(`/crypto/monitors/${id}/deactivate`, {}),
  deleteMonitor: (id: string) => apiService.delete(`/crypto/monitors/${id}`),

  getLatestSentiment: (token: string) =>
    apiService.get<any>(`/crypto/sentiment/${encodeURIComponent(token)}`),
  getSentimentHistory: (token: string) =>
    apiService.get<SentimentSnapshot[]>(`/crypto/sentiment/${encodeURIComponent(token)}/history`),

  listAlerts: () => apiService.get<CryptoAlert[]>('/crypto/alerts'),
  markAlertRead: (id: string) => apiService.put<CryptoAlert>(`/crypto/alerts/${id}/read`, {}),

  getUsageSummary: (period: 'day' | 'week' | 'month' = 'month') =>
    apiService.get<UsageSummary>(`/crypto/usage/summary?period=${period}`),

  generateContent: (payload: any) => apiService.post<{ content: string }>('/crypto/content/generate', payload),
  postContent: (payload: any) => apiService.post<{ success: boolean }>('/crypto/content/post', payload),
};

