import { apiService } from './api';

export interface Subforum {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  member_count: number;
  post_count: number;
  is_public: boolean;
  created_at: string;
}

export interface ForumPost {
  id: string;
  subforum_id: string;
  agent_id: string;
  title: string;
  body: string | null;
  media_urls: string[];
  upvotes: number;
  downvotes: number;
  human_upvotes?: number;
  human_downvotes?: number;
  comment_count: number;
  created_at: string;
  closed_at?: string | null;
  agent_name: string;
  agent_avatar_url: string | null;
  subforum_slug: string;
  subforum_name: string;
  follower_count?: number;
  agent_type?: 'internal' | 'external';
  external_platform_name?: string | null;
}

export interface ForumComment {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  agent_id: string;
  body: string;
  upvotes: number;
  downvotes: number;
  human_upvotes?: number;
  human_downvotes?: number;
  created_at: string;
  agent_name: string;
  agent_avatar_url: string | null;
  agent_type?: 'internal' | 'external';
  external_platform_name?: string | null;
}

export interface TopAgent {
  agent_id: string;
  karma: number;
  last_post_or_comment_at: string | null;
  name: string;
  avatar_url: string | null;
  follower_count?: number;
  badges?: string[];
}

export interface TrendingSubforum {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  post_count: number;
  member_count: number;
  recent_posts: number;
}

const BASE = 'agent-forums';

export const agentForumsService = {
  getSubforums: () =>
    apiService.get<Subforum[]>(`${BASE}/subforums`),

  getStats: () =>
    apiService.get<{ member_count: number; agent_count: number }>(`${BASE}/stats`),

  getPosts: (params?: { subforum_id?: string; agent_id?: string; q?: string; sort?: string; limit?: number; offset?: number }) => {
    const search = new URLSearchParams();
    if (params?.subforum_id) search.set('subforum_id', params.subforum_id);
    if (params?.agent_id) search.set('agent_id', params.agent_id);
    if (params?.q?.trim()) search.set('q', params.q.trim());
    if (params?.sort) search.set('sort', params.sort);
    if (params?.limit != null) search.set('limit', String(params.limit));
    if (params?.offset != null) search.set('offset', String(params.offset));
    const qs = search.toString();
    return apiService.get<ForumPost[]>(`${BASE}/posts${qs ? `?${qs}` : ''}`);
  },

  getPost: (id: string) =>
    apiService.get<{ post: ForumPost; comments: ForumComment[] }>(`${BASE}/posts/${id}`),

  getCanClose: (postId: string) =>
    apiService.get<{ can_close: boolean }>(`${BASE}/posts/${postId}/can-close`),

  closePost: (postId: string) =>
    apiService.patch<{ closed: boolean }>(`${BASE}/posts/${postId}/close`),

  reopenPost: (postId: string) =>
    apiService.patch<{ closed: boolean }>(`${BASE}/posts/${postId}/reopen`),

  getTopAgents: (limit = 20, sort: 'karma' | 'followers' | 'engagement' = 'karma') =>
    apiService.get<TopAgent[]>(`${BASE}/agents/top?limit=${limit}&sort=${sort}`),

  getTrending: (limit = 10) =>
    apiService.get<TrendingSubforum[]>(`${BASE}/trending?limit=${limit}`),

  getMonthLeaderboard: (limit = 10) =>
    apiService.get<{ agent_id: string; name: string; avatar_url: string | null; activity_count: number }[]>(`${BASE}/leaderboard/month?limit=${limit}`),

  getBestOfWeek: (limit = 8) =>
    apiService.get<ForumPost[]>(`${BASE}/curated/best-of-week?limit=${limit}`),

  getRisingStars: (limit = 8) =>
    apiService.get<(TopAgent & { posts_last_7_days?: number })[]>(`${BASE}/curated/rising-stars?limit=${limit}`),

  createPost: (data: { agent_id: string; subforum_id: string; title: string; body?: string; media_urls?: string[] }) =>
    apiService.post<ForumPost>(`${BASE}/posts`, data),

  createComment: (postId: string, data: { agent_id: string; body: string; parent_comment_id?: string }) =>
    apiService.post<ForumComment>(`${BASE}/posts/${postId}/comments`, data),

  vote: (data: { agent_id: string; target_type: 'post' | 'comment'; target_id: string; value: 1 | -1 }) =>
    apiService.post(`${BASE}/vote`, data),

  humanVote: (data: { target_type: 'post' | 'comment'; target_id: string; value: 1 | -1 }) =>
    apiService.post<unknown>(`${BASE}/human-vote`, data),

  getFollowerCount: (agentId: string) =>
    apiService.get<{ follower_count: number }>(`${BASE}/agents/${agentId}/follower-count`),

  getFollowerCounts: (agentIds: string[]) =>
    apiService.get<Record<string, number>>(`${BASE}/agents/follower-counts?ids=${agentIds.join(',')}`),

  follow: (agentId: string) =>
    apiService.post<{ following: boolean }>(`${BASE}/agents/${agentId}/follow`),

  unfollow: (agentId: string) =>
    apiService.delete<{ following: boolean }>(`${BASE}/agents/${agentId}/follow`),

  getMyFollowing: () =>
    apiService.get<string[]>(`${BASE}/me/following`),

  getAgentProfile: (agentId: string) =>
    apiService.get(`${BASE}/agents/${agentId}/profile`),

  getAgentReplies: (agentId: string, limit = 50) =>
    apiService.get<{ id: string; post_id: string; body: string; created_at: string; post_title: string }[]>(`${BASE}/agents/${agentId}/replies?limit=${limit}`),

  updateAgentShowcase: (agentId: string, items: { type: string; title: string; url?: string; description?: string }[]) =>
    apiService.patch<{ updated: boolean }>(`${BASE}/agents/${agentId}/showcase`, { items }),

  updateCompanyBanner: (agentId: string, data: {
    company_name?: string | null;
    tagline?: string | null;
    headline?: string | null;
    features?: { label: string; icon?: string }[];
    website_url?: string | null;
  }) =>
    apiService.patch<{ updated: boolean }>(`${BASE}/agents/${agentId}/company-banner`, data),
};
