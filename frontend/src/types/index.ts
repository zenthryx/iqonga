// User and Authentication Types
export interface User {
  id: string;
  email: string;
  username: string;
  wallet_address: string;
  profile_image?: string;
  created_at: string;
  updated_at: string;
  is_verified: boolean;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  company_id?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// AI Agent Types
export interface Agent {
  id: string;
  user_id: string;
  name: string;
  description: string;
  avatar_url?: string;
  personality_config: PersonalityConfig;
  nft_metadata?: NFTMetadata;
  status: 'active' | 'inactive' | 'training' | 'error';
  platforms?: string[]; // Enabled platforms: ['twitter', 'telegram', 'instagram', etc.]
  created_at: string;
  updated_at: string;
  performance_metrics: PerformanceMetrics;
  platform_connections: PlatformConnection[];
  can_post_forum_images?: boolean; // Controls if agent can post images in forum
  profile_header_image?: string | null; // Custom profile header background image
  writing_style_enabled?: boolean; // When true, generated content mimics user's writing samples
  writing_style_samples?: string[]; // User writing samples for style learning
  agent_type?: 'internal' | 'external'; // Whether agent was created on Iqonga or externally
  external_platform_name?: string | null; // Name of external platform if agent_type is 'external'
  external_platform_id?: string | null; // UUID of external platform
}

export interface PersonalityConfig {
  core_traits: string[];
  communication_style: 'formal' | 'casual' | 'technical' | 'friendly' | 'professional';
  expertise_areas: string[];
  response_tone: 'helpful' | 'authoritative' | 'encouraging' | 'analytical';
  interaction_preferences: {
    proactive: boolean;
    response_speed: 'instant' | 'thoughtful' | 'delayed';
    emoji_usage: 'none' | 'minimal' | 'moderate' | 'frequent';
    length_preference: 'concise' | 'detailed' | 'adaptive';
  };
  knowledge_focus: string[];
  custom_instructions?: string;
}

export interface NFTMetadata {
  mint_address: string;
  token_uri: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  collection?: {
    name: string;
    family: string;
  };
}

export interface PerformanceMetrics {
  total_interactions: number;
  engagement_rate: number;
  response_time_avg: number;
  satisfaction_score: number;
  revenue_generated: number;
  platform_metrics: {
    [platform: string]: {
      followers: number;
      interactions: number;
      reach: number;
    };
  };
}

// Platform Integration Types
export interface PlatformConnection {
  id: string;
  agent_id: string;
  platform_type: 'twitter' | 'telegram' | 'discord' | 'slack';
  platform_user_id: string;
  platform_username: string;
  access_token: string;
  refresh_token?: string;
  is_active: boolean;
  permissions: string[];
  created_at: string;
  last_sync: string;
}

export interface GeneratedContent {
  id: string;
  agent_id: string;
  platform_type: string;
  content_type: 'post' | 'reply' | 'message' | 'thread';
  content: string;
  platform_post_id?: string;
  engagement_metrics: {
    likes: number;
    shares: number;
    comments: number;
    views: number;
  };
  created_at: string;
  status: 'draft' | 'published' | 'failed';
}

// Company and Knowledge Base Types
export interface Company {
  id: string;
  name: string;
  description: string;
  logo_url?: string;
  website?: string;
  industry: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  created_at: string;
  subscription_tier: 'basic' | 'professional' | 'enterprise';
}

export interface Product {
  id: string;
  company_id: string;
  name: string;
  description: string;
  category: string;
  price?: number;
  features: string[];
  documentation_url?: string;
  created_at: string;
}

export interface KnowledgeDocument {
  id: string;
  company_id: string;
  title: string;
  content: string;
  document_type: 'faq' | 'manual' | 'policy' | 'guide' | 'api_doc';
  tags: string[];
  version: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// Token and Economy Types
export interface TokenTransaction {
  id: string;
  user_id: string;
  agent_id?: string;
  transaction_type: 'earn' | 'spend' | 'stake' | 'unstake' | 'reward';
  amount: number;
  token_type: 'SOCIALAI' | 'SOL';
  description: string;
  blockchain_hash?: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

// Telegram Specific Types
export interface TelegramGroup {
  id: string;
  telegram_chat_id: string;
  title: string;
  description?: string;
  member_count: number;
  agent_id?: string;
  is_active: boolean;
  permissions: {
    can_send_messages: boolean;
    can_send_media: boolean;
    can_pin_messages: boolean;
    can_delete_messages: boolean;
  };
  created_at: string;
}

export interface TelegramMessage {
  id: string;
  telegram_message_id: number;
  group_id: string;
  user_id?: string;
  agent_id?: string;
  message_type: 'text' | 'photo' | 'video' | 'document' | 'sticker';
  content: string;
  reply_to_message_id?: number;
  is_agent_response: boolean;
  created_at: string;
}

// Analytics and Reporting Types
export interface AnalyticsData {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  agent_performance: {
    agent_id: string;
    metrics: PerformanceMetrics;
  }[];
  platform_breakdown: {
    [platform: string]: {
      active_agents: number;
      total_interactions: number;
      engagement_rate: number;
    };
  };
  revenue_metrics: {
    total_revenue: number;
    token_transactions: number;
    nft_sales: number;
    subscription_revenue: number;
  };
  user_engagement: {
    active_users: number;
    new_signups: number;
    retention_rate: number;
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// UI Component Types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'solana';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number';
  error?: string;
  disabled?: boolean;
  className?: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'agent_update' | 'new_interaction' | 'performance_update' | 'notification';
  data: any;
  timestamp: string;
} 