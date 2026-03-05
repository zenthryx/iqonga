import { apiService } from './api';

export interface TwitterOverview {
  username: string;
  followerCount: number;
  followerChange: number;
  totalTweets: number;
  impressions: number;
  engagementRate: number;
  bestHour: number;
  bestHourLabel: string;
}

export interface TwitterPost {
  id: string;
  text: string;
  created_at: string;
  score: number;
  metrics: {
    impression_count?: number;
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
  };
}

export interface TwitterMention {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  metrics: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
    impression_count?: number;
  };
}

export interface HistoricalSnapshot {
  id: string;
  snapshot_date: string;
  follower_count: number;
  follower_change: number;
  total_tweets: number;
  total_impressions: number;
  total_likes: number;
  total_retweets: number;
  total_replies: number;
  engagement_rate: number;
}

export interface FollowerGrowth {
  date: string;
  followers: number;
  change: number;
}

export interface EngagementTrend {
  date: string;
  engagementRate: number;
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
}

export interface SentimentAnalysis {
  overallSentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  insights: string[];
}

export interface HashtagSuggestions {
  hashtags: string[];
  topics: string[];
  themes: string[];
}

export interface ContentSuggestion {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ContentSuggestions {
  suggestions: ContentSuggestion[];
}

export const twitterAnalyticsService = {
  async getOverview() {
    return apiService.get<TwitterOverview>('/twitter-analytics/overview');
  },
  async getPosts(limit = 10) {
    return apiService.get<TwitterPost[]>(`/twitter-analytics/posts?limit=${limit}`);
  },
  async getMentions(limit = 20) {
    return apiService.get<TwitterMention[]>(`/twitter-analytics/mentions?limit=${limit}`);
  },
  async getBestTimes() {
    return apiService.get<number[][]>('/twitter-analytics/best-times');
  },
  async getHistorical(days = 30) {
    return apiService.get<HistoricalSnapshot[]>(`/twitter-analytics/historical?days=${days}`);
  },
  async getFollowerGrowth(days = 30) {
    return apiService.get<FollowerGrowth[]>(`/twitter-analytics/follower-growth?days=${days}`);
  },
  async getEngagementTrends(days = 30) {
    return apiService.get<EngagementTrend[]>(`/twitter-analytics/engagement-trends?days=${days}`);
  },
  async exportCSV(exportType: string = 'full', dateRange?: { start?: string; end?: string; days?: number }) {
    return apiService.post('/twitter-analytics/export/csv', { exportType, dateRange }, {
      responseType: 'blob',
    });
  },
  async exportPDF(exportType: string = 'overview') {
    return apiService.post('/twitter-analytics/export/pdf', { exportType }, {
      responseType: 'blob',
    });
  },
  async getExports(limit = 20) {
    return apiService.get(`/twitter-analytics/exports?limit=${limit}`);
  },
  async analyzeSentiment(limit = 50) {
    return apiService.post<SentimentAnalysis>('/twitter-analytics/sentiment-analysis', { limit });
  },
  async getSuggestions() {
    return apiService.post<HashtagSuggestions>('/twitter-analytics/suggestions', {});
  },
  async getContentSuggestions() {
    return apiService.post<ContentSuggestions>('/twitter-analytics/content-suggestions', {});
  },
};


