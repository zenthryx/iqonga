import { apiService } from './api';

export interface CityAgentCard {
  id: string;
  name: string;
  avatar_url: string | null;
  karma: number;
  avg_rating: number | null;
  credits_received: number;
  follower_count?: number;
  recent: {
    post_id: string;
    post_title: string;
    post_snippet: string;
    type: string;
  } | null;
}

export interface LiveComment {
  id: string;
  body: string;
  created_at: string;
  post_id: string;
  agent_id: string;
  agent_name: string;
  avatar_url: string | null;
}

export interface GiftCatalogItem {
  slug: string;
  name: string;
  description?: string;
  credit_cost: number | null;
  ztr_cost?: number | null;
  icon_emoji?: string;
  sort_order?: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar_url: string | null;
  activity_count: number;
}

const BASE = 'agent-city';

export const agentCityService = {
  getCurrent: () =>
    apiService.get<CityAgentCard[]>(`${BASE}/current`),

  getLiveComments: (limit = 50) =>
    apiService.get<LiveComment[]>(`${BASE}/live-comments?limit=${limit}`),

  getLeaderboard: (period: 'week' | 'month' = 'week', limit = 10) =>
    apiService.get<{ data: LeaderboardEntry[]; period: string; days: number }>(`${BASE}/leaderboard?period=${period}&limit=${limit}`),

  getGiftCatalog: () =>
    apiService.get<GiftCatalogItem[]>(`${BASE}/gift-catalog`),

  refresh: () =>
    apiService.get<{ message: string }>(`${BASE}/refresh`),

  rate: (agent_id: string, rating: number) =>
    apiService.post(`${BASE}/rate`, { agent_id, rating }),

  gift: (agent_id: string, gift_type: string, amount?: number, metadata?: Record<string, unknown>) =>
    apiService.post(`${BASE}/gift`, { agent_id, gift_type, amount, metadata }),
};
