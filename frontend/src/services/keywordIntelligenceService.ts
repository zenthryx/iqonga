import { apiService } from './api';

export interface KeywordMonitor {
  id: string;
  user_id: number;
  keyword: string;
  monitor_type: 'keyword' | 'hashtag';
  platform: string;
  is_active: boolean;
  sentiment_threshold: number;
  mention_spike_threshold: number;
  track_influencers: boolean;
  influencer_handles?: string[];
  monitoring_frequency: string;
  exclude_keywords?: string[];
  auto_post_enabled: boolean;
  post_channels?: string[];
  content_style: string;
  tags?: string[];
  notes?: string;
  collection_id?: string;
  created_at: string;
  updated_at: string;
}

export interface KeywordSnapshot {
  id: string;
  monitor_id: string;
  keyword: string;
  sentiment_score: number;
  mention_count: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  total_likes: number;
  total_retweets: number;
  total_replies: number;
  total_views: number;
  engagement_rate: number;
  trending_phrases?: string[];
  related_keywords?: string[];
  influencer_mentions: number;
  top_influencer_sentiment?: string;
  top_influencers?: any[];
  snapshot_time: string;
  created_at: string;
}

export interface KeywordAlert {
  id: string;
  monitor_id: string;
  user_id: number;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data?: any;
  previous_value?: number;
  current_value?: number;
  change_percent?: number;
  is_read: boolean;
  created_at: string;
  keyword?: string;
  monitor_type?: string;
}

export interface KeywordCollection {
  id: string;
  user_id: number;
  name: string;
  description?: string;
  color?: string;
  tags?: string[];
  total_keywords: number;
  total_mentions: number;
  avg_sentiment: number;
  created_at: string;
  updated_at: string;
}

export interface KeywordResearch {
  id: string;
  user_id: number;
  research_type: string;
  query: string;
  platform: string;
  results?: any;
  trending_keywords?: string[];
  related_keywords?: string[];
  suggested_hashtags?: string[];
  competitor_keywords?: string[];
  search_volume?: number;
  competition_level?: string;
  trend_direction?: string;
  notes?: string;
  saved: boolean;
  created_at: string;
}

export interface UsageSummary {
  operation_type: string;
  operation_count: number;
  total_api_calls: number;
  total_tokens: number;
  total_credits: number;
}

class KeywordIntelligenceService {
  // Monitor Management
  async createMonitor(data: Partial<KeywordMonitor>) {
    return apiService.post<KeywordMonitor>('/keyword-intelligence/monitors', data);
  }

  async getMonitors() {
    return apiService.get<KeywordMonitor[]>('/keyword-intelligence/monitors');
  }

  async getMonitor(id: string) {
    return apiService.get<KeywordMonitor>(`/keyword-intelligence/monitors/${id}`);
  }

  async updateMonitor(id: string, data: Partial<KeywordMonitor>) {
    return apiService.put<KeywordMonitor>(`/keyword-intelligence/monitors/${id}`, data);
  }

  async deleteMonitor(id: string) {
    return apiService.delete<KeywordMonitor>(`/keyword-intelligence/monitors/${id}`);
  }

  async activateMonitor(id: string) {
    return apiService.post<KeywordMonitor>(`/keyword-intelligence/monitors/${id}/activate`);
  }

  async deactivateMonitor(id: string) {
    return apiService.post<KeywordMonitor>(`/keyword-intelligence/monitors/${id}/deactivate`);
  }

  // Sentiment & Snapshots
  async getSentiment(keyword: string) {
    return apiService.get<KeywordSnapshot>(`/keyword-intelligence/sentiment/${encodeURIComponent(keyword)}`);
  }

  async getSnapshots(monitorId: string, limit: number = 50) {
    return apiService.get<KeywordSnapshot[]>(`/keyword-intelligence/monitors/${monitorId}/snapshots?limit=${limit}`);
  }

  // Alerts
  async getAlerts(limit: number = 50, offset: number = 0) {
    return apiService.get<KeywordAlert[]>(`/keyword-intelligence/alerts?limit=${limit}&offset=${offset}`);
  }

  async getUnreadAlertsCount() {
    return apiService.get<{ count: number }>('/keyword-intelligence/alerts/unread-count');
  }

  async markAlertAsRead(alertId: string) {
    return apiService.put<KeywordAlert>(`/keyword-intelligence/alerts/${alertId}/read`);
  }

  // Research
  async researchKeyword(query: string, researchType: string = 'trending', platform: string = 'twitter') {
    return apiService.post<KeywordResearch>('/keyword-intelligence/research', {
      query,
      research_type: researchType,
      platform,
    });
  }

  async getSavedResearch(limit: number = 50) {
    return apiService.get<KeywordResearch[]>(`/keyword-intelligence/research/saved?limit=${limit}`);
  }

  // Content Generation
  async generateContent(keyword: string, sentiment: any, style: string = 'professional') {
    return apiService.post<{ text: string; cost: number }>('/keyword-intelligence/content/generate', {
      keyword,
      sentiment,
      style,
    });
  }

  // Collections
  async createCollection(data: Partial<KeywordCollection>) {
    return apiService.post<KeywordCollection>('/keyword-intelligence/collections', data);
  }

  async getCollections() {
    return apiService.get<KeywordCollection[]>('/keyword-intelligence/collections');
  }

  async getCollection(id: string) {
    return apiService.get<KeywordCollection>(`/keyword-intelligence/collections/${id}`);
  }

  async updateCollection(id: string, data: Partial<KeywordCollection>) {
    return apiService.put<KeywordCollection>(`/keyword-intelligence/collections/${id}`, data);
  }

  async deleteCollection(id: string) {
    return apiService.delete<KeywordCollection>(`/keyword-intelligence/collections/${id}`);
  }

  // Usage
  async getUsageSummary(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiService.get<UsageSummary[]>(`/keyword-intelligence/usage/summary?${params.toString()}`);
  }
}

export const keywordIntelligenceService = new KeywordIntelligenceService();

