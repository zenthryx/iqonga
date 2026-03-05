import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { imageService } from '../services/imageService';
import { resolveImageUrl } from '@/utils/domain';
import { 
  Instagram, 
  MessageSquare, 
  Globe, 
  Twitter, 
  Plus, 
  TrendingUp, 
  Users, 
  Heart, 
  Eye, 
  MessageCircle,
  Zap,
  Settings,
  BarChart3,
  Bot,
  Download,
  Key,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Headphones,
  Volume2,
  Music,
  Video,
  Mail,
  Calendar,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import IntegrationOnboarding from '../components/Dashboard/IntegrationOnboarding';

interface IntegrationStatus {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  accounts: number;
  color: string;
  description: string;
  href: string;
  category: 'social' | 'productivity' | 'ecommerce' | 'content' | 'communication';
  lastSync?: string;
  quickActions?: Array<{
    label: string;
    href: string;
    icon: React.ReactNode;
  }>;
  metrics?: {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
  }[];
}

interface AgentStats {
  totalAgents: number;
  activeAgents: number;
  totalPosts: number;
  avgEngagement: number;
  totalEarnings: number;
}

interface IntegrationStats {
  musicTracks: number;
  musicVideos: number;
  lyricsGenerated: number;
  imagesGenerated: number;
  videosGenerated: number;
  emailsProcessed: number;
  calendarEvents: number;
  shopifyProducts: number;
}

interface ActivityItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  icon: React.ReactNode;
  title: string;
  description: string;
  timestamp: string;
  integration?: string;
}

interface AIAgent {
  id: string;
  name: string;
  personality: string;
  specialization: string;
  platforms: string[];
  status: 'active' | 'paused' | 'training';
  avatar: string;
  stats: {
    postsToday: number;
    engagementRate: number;
    followers: number;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<AgentStats>({
    totalAgents: 0,
    activeAgents: 0,
    totalPosts: 0,
    avgEngagement: 0,
    totalEarnings: 0
  });

  const [integrationStats, setIntegrationStats] = useState<IntegrationStats>({
    musicTracks: 0,
    musicVideos: 0,
    lyricsGenerated: 0,
    imagesGenerated: 0,
    videosGenerated: 0,
    emailsProcessed: 0,
    calendarEvents: 0,
    shopifyProducts: 0
  });

  const [recentAgents, setRecentAgents] = useState<AIAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [expandedIntegrations, setExpandedIntegrations] = useState<Set<string>>(new Set());
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const toggleIntegration = (id: string) => {
    setExpandedIntegrations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const refreshDashboard = async () => {
    setRefreshing(true);
    await loadDashboardData();
    toast.success('Dashboard refreshed');
    setRefreshing(false);
  };

  const loadIntegrations = async () => {
    try {
      // Fetch integration statuses from backend
      const integrationsResponse = await apiService.get('/dashboard/integrations');
      const integrationsData = integrationsResponse.success ? integrationsResponse.data : {};
      
      // Check for various integrations
      const hasTwitter = integrationsData.twitter?.connected || false;
      const hasDiscord = integrationsData.discord?.connected || false;
      const hasInstagram = integrationsData.instagram?.connected || false;
      const hasWordPress = integrationsData.wordpress?.connected || false;
      const hasEmail = integrationsData.email?.connected || false;
      const hasCalendar = integrationsData.calendar?.connected || false;
      const hasShopify = integrationsData.shopify?.connected || false;

      const integrationsList: IntegrationStatus[] = [
        {
          id: 'twitter',
          name: 'Twitter/X',
          icon: <Twitter className="h-6 w-6" />,
          status: hasTwitter ? 'connected' : 'disconnected',
          accounts: integrationsData.twitter?.accounts || 0,
          color: 'from-sky-500 to-sky-600',
          description: 'Automated Posting & Engagement',
          href: '/company',
          category: 'social',
          lastSync: integrationsData.twitter?.lastSync,
          quickActions: [
            { label: 'Create Post', href: '/ai-content', icon: <Sparkles className="h-4 w-4" /> },
            { label: 'View Analytics', href: '/analytics', icon: <BarChart3 className="h-4 w-4" /> }
          ],
          metrics: [
            { label: 'Posts Today', value: stats.totalPosts, trend: 'up' },
            { label: 'Engagement', value: `${stats.avgEngagement}%`, trend: 'up' }
          ]
        },
        {
          id: 'discord',
        name: 'Discord',
        icon: <MessageSquare className="h-6 w-6" />,
          status: hasDiscord ? 'connected' : 'disconnected',
          accounts: integrationsData.discord?.accounts || 0,
        color: 'from-indigo-500 to-indigo-600',
        description: 'Server Bots & Learning AI',
          href: '/discord',
          category: 'communication',
          quickActions: [
            { label: 'Create Bot', href: '/discord', icon: <Bot className="h-4 w-4" /> },
            { label: 'View Servers', href: '/discord', icon: <MessageSquare className="h-4 w-4" /> }
          ]
        },
        {
          id: 'wordpress',
          name: 'WordPress',
          icon: <Globe className="h-6 w-6" />,
          status: hasWordPress ? 'connected' : 'disconnected',
          accounts: integrationsData.wordpress?.accounts || 0,
          color: 'from-blue-500 to-blue-600',
          description: 'AI Chat Widgets & Voice Chat',
          href: '/api-keys',
          category: 'communication',
          quickActions: [
            { label: 'Get API Key', href: '/api-keys', icon: <Key className="h-4 w-4" /> },
            { label: 'View Docs', href: '/wordpress-plugin', icon: <ExternalLink className="h-4 w-4" /> }
          ]
        },
        {
          id: 'instagram',
        name: 'Instagram',
        icon: <Instagram className="h-6 w-6" />,
          status: hasInstagram ? 'connected' : 'disconnected',
          accounts: integrationsData.instagram?.accounts || 0,
        color: 'from-pink-500 to-pink-600',
        description: 'Business Account Publishing',
          href: '/instagram',
          category: 'social',
          quickActions: [
            { label: 'Connect Account', href: '/instagram', icon: <Plus className="h-4 w-4" /> }
          ]
        },
        {
          id: 'music',
          name: 'Music Generation',
          icon: <Music className="h-6 w-6" />,
          status: 'connected',
          accounts: 0,
          color: 'from-purple-500 to-purple-600',
          description: 'AI Music & Lyrics Creation',
          href: '/music-generation',
          category: 'content',
          quickActions: [
            { label: 'Generate Music', href: '/music-generation', icon: <Volume2 className="h-4 w-4" /> },
            { label: 'Create Lyrics', href: '/lyrics-generation', icon: <Sparkles className="h-4 w-4" /> },
            { label: 'Music Videos', href: '/music-video-generation', icon: <Video className="h-4 w-4" /> }
          ],
          metrics: [
            { label: 'Tracks', value: integrationStats.musicTracks, trend: 'up' },
            { label: 'Videos', value: integrationStats.musicVideos, trend: 'up' },
            { label: 'Lyrics', value: integrationStats.lyricsGenerated, trend: 'up' }
          ]
        },
        {
          id: 'images',
          name: 'Image Generation',
          icon: <Sparkles className="h-6 w-6" />,
          status: 'connected',
          accounts: 0,
          color: 'from-green-500 to-green-600',
          description: 'AI Image Creation',
          href: '/image-generation',
          category: 'content',
          quickActions: [
            { label: 'Generate Image', href: '/image-generation', icon: <Sparkles className="h-4 w-4" /> }
          ],
          metrics: [
            { label: 'Generated', value: integrationStats.imagesGenerated, trend: 'up' }
          ]
        },
        {
          id: 'videos',
          name: 'Video Generation',
          icon: <Video className="h-6 w-6" />,
        status: 'connected',
          accounts: 0,
          color: 'from-red-500 to-red-600',
          description: 'AI Video Creation',
          href: '/video-generation',
          category: 'content',
          quickActions: [
            { label: 'Generate Video', href: '/video-generation', icon: <Video className="h-4 w-4" /> }
          ],
          metrics: [
            { label: 'Generated', value: integrationStats.videosGenerated, trend: 'up' }
          ]
        },
        {
          id: 'email',
          name: 'Email AI',
          icon: <Mail className="h-6 w-6" />,
          status: hasEmail ? 'connected' : 'disconnected',
          accounts: integrationsData.email?.accounts || 0,
          lastSync: integrationsData.email?.lastSync,
          color: 'from-cyan-500 to-cyan-600',
          description: 'Smart Inbox & Email Management',
          href: '/products/smart-inbox',
          category: 'productivity',
          quickActions: [
            { label: 'View Inbox', href: '/products/smart-inbox', icon: <Mail className="h-4 w-4" /> }
          ],
          metrics: hasEmail ? [
            { label: 'Processed', value: integrationStats.emailsProcessed, trend: 'up' }
          ] : undefined
        },
        {
          id: 'calendar',
          name: 'Calendar AI',
          icon: <Calendar className="h-6 w-6" />,
          status: hasCalendar ? 'connected' : 'disconnected',
          accounts: integrationsData.calendar?.accounts || 0,
          lastSync: integrationsData.calendar?.lastSync,
          color: 'from-orange-500 to-orange-600',
          description: 'AI Calendar Assistant',
          href: '/products/ai-calendar',
          category: 'productivity',
          quickActions: [
            { label: 'View Calendar', href: '/products/ai-calendar', icon: <Calendar className="h-4 w-4" /> }
          ],
          metrics: hasCalendar ? [
            { label: 'Events', value: integrationStats.calendarEvents, trend: 'neutral' }
          ] : undefined
        },
        {
          id: 'shopify',
          name: 'Shopify',
          icon: <ShoppingBag className="h-6 w-6" />,
          status: hasShopify ? 'connected' : 'disconnected',
          accounts: integrationsData.shopify?.accounts || 0,
          color: 'from-emerald-500 to-emerald-600',
          description: 'E-commerce Integration',
          href: '/shopify',
          category: 'ecommerce',
          quickActions: [
            { label: 'View Store', href: '/shopify', icon: <ShoppingBag className="h-4 w-4" /> }
          ],
          metrics: hasShopify ? [
            { label: 'Products', value: integrationStats.shopifyProducts, trend: 'neutral' }
          ] : undefined
        }
      ];

      setIntegrations(integrationsList);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    }
  };

  const loadIntegrationStats = async () => {
    try {
      // Fetch stats from dashboard endpoint
      const statsResponse = await apiService.get('/dashboard/stats');
      if (statsResponse.success && statsResponse.data) {
        const data = statsResponse.data;
        setIntegrationStats({
          musicTracks: data.music?.tracks || 0,
          musicVideos: data.music?.videos || 0,
          lyricsGenerated: 0, // TODO: Add lyrics endpoint
          imagesGenerated: data.content?.images || 0,
          videosGenerated: data.content?.videos || 0,
          emailsProcessed: data.productivity?.emails || 0,
          calendarEvents: data.productivity?.calendarEvents || 0,
          shopifyProducts: data.ecommerce?.products || 0
        });
      }
    } catch (error) {
      console.error('Failed to load integration stats:', error);
    }
  };

  const loadActivities = async () => {
    try {
      // Fetch activities from backend
      const activitiesResponse = await apiService.get('/dashboard/activities?limit=20');
      if (activitiesResponse.success && activitiesResponse.data) {
        const activityItems: ActivityItem[] = activitiesResponse.data.map((activity: any) => ({
          id: activity.id,
          type: activity.type === 'success' ? 'success' : activity.type === 'warning' ? 'warning' : activity.type === 'error' ? 'error' : 'info',
          icon: activity.integration === 'Agents' ? <Bot className="h-5 w-5" /> :
                activity.integration === 'Music Generation' ? <Music className="h-5 w-5" /> :
                activity.integration?.includes('Twitter') ? <Twitter className="h-5 w-5" /> :
                <Activity className="h-5 w-5" />,
          title: activity.title,
          description: activity.description,
          timestamp: activity.timestamp,
          integration: activity.integration
        }));
        setActivities(activityItems);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
      // Fallback to empty activities
      setActivities([]);
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const response = await apiService.get('/agents');
      
      if (response.success && response.data) {
        const agents = response.data;
        
        const transformedAgents = agents.map((agent: any) => ({
          id: agent.id,
          name: agent.name,
          personality: agent.personality_type || 'Custom',
          specialization: agent.description || 'AI Agent',
          platforms: agent.platforms || ['Twitter'],
          status: agent.is_active ? 'active' : 'paused',
          avatar: resolveImageUrl(agent.avatar_url) || '🤖',
          stats: {
            postsToday: agent.performance_metrics?.total_posts_generated || 0,
            engagementRate: Math.round(agent.performance_metrics?.engagement_rate || 0),
            followers: agent.platform_connections?.[0]?.followers || 0
          }
        }));

        setRecentAgents(transformedAgents);
        
        const totalPosts = agents.reduce((sum: number, agent: any) => 
          sum + (agent.performance_metrics?.total_posts_generated || 0), 0);
        
        const totalEngagement = agents.reduce((sum: number, agent: any) => 
          sum + (agent.performance_metrics?.total_engagement || 0), 0);
        
        const avgEngagement = agents.length > 0 ? Math.round(totalEngagement / agents.length) : 0;
        
        setStats({
          totalAgents: agents.length,
          activeAgents: agents.filter((a: any) => a.is_active).length,
          totalPosts: totalPosts,
          avgEngagement: avgEngagement,
          totalEarnings: 0
        });
      }

      await loadIntegrations();
      await loadIntegrationStats();
      await loadActivities();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10';
      case 'paused': return 'text-yellow-400 bg-yellow-400/10';
      case 'training': return 'text-blue-400 bg-blue-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getIntegrationStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'disconnected': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      case 'error': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500/10 text-green-400 border-green-400/20';
      case 'info': return 'bg-blue-500/10 text-blue-400 border-blue-400/20';
      case 'warning': return 'bg-yellow-500/10 text-yellow-400 border-yellow-400/20';
      case 'error': return 'bg-red-500/10 text-red-400 border-red-400/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-400/20';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const connectedIntegrations = integrations.filter(i => i.status === 'connected').length;
  const totalIntegrations = integrations.length;

  return (
    <div className="space-y-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-2xl"></div>
          <div className="relative p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-6 lg:mb-0">
              <h1 className="text-4xl font-bold text-white mb-3">
                Welcome to Iqonga
              </h1>
              <p className="text-xl text-gray-300 mb-4">
                Your Agentic Framework Command Center
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>{connectedIntegrations}/{totalIntegrations} Integrations Active</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4 text-blue-400" />
                  <span>{stats.activeAgents} Active Agents</span>
                </div>
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="flex items-center space-x-1 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Connect Integration</span>
                </button>
                <button
                  onClick={refreshDashboard}
                  disabled={refreshing}
                  className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
            <div className="flex space-x-3">
              <Link
                to="/agents/create"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
              >
                <Bot className="mr-2 h-5 w-5" />
                Create Agent
              </Link>
              <Link
                to="/ai-content"
                className="inline-flex items-center px-6 py-3 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-lg hover:bg-white/20 transition-all duration-200"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Content
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Get started: first agent and channels */}
      {stats.totalAgents === 0 && (
        <div className="glass-card p-6 border border-blue-500/20">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Get started with your first agent
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Create an agent, connect channels, and schedule or deploy content.
          </p>
          <ol className="space-y-2">
            <li className="flex items-center gap-3 text-sm">
              <span className="w-5 h-5 rounded-full border-2 border-gray-500 flex-shrink-0 flex items-center justify-center text-xs text-gray-500">1</span>
              <span className="text-white">Create your first agent</span>
              <Link to="/agents/create" className="text-blue-400 hover:underline ml-auto">Create agent →</Link>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <span className="w-5 h-5 rounded-full border-2 border-gray-500 flex-shrink-0 flex items-center justify-center text-xs text-gray-500">2</span>
              <span className="text-gray-400">Connect channels (Telegram, Email AI, etc.)</span>
              <Link to="/assistant" className="text-blue-400 hover:underline ml-auto">Personal Assistant →</Link>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <span className="w-5 h-5 rounded-full border-2 border-gray-500 flex-shrink-0 flex items-center justify-center text-xs text-gray-500">3</span>
              <span className="text-gray-400">Schedule posts or deploy to your platforms</span>
              <Link to="/scheduled-posts" className="text-blue-400 hover:underline ml-auto">Scheduled Posts →</Link>
            </li>
          </ol>
        </div>
      )}

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="glass-card p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Agents</p>
                <p className="text-2xl font-bold text-white">{stats.totalAgents}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Bot className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Active Agents</p>
                <p className="text-2xl font-bold text-white">{stats.activeAgents}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Posts</p>
              <p className="text-2xl font-bold text-white">{stats.totalPosts}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Avg Engagement</p>
              <p className="text-2xl font-bold text-white">{stats.avgEngagement}%</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Music Tracks</p>
              <p className="text-2xl font-bold text-white">{integrationStats.musicTracks}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Music className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Integration Health Dashboard */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Integration Health</h2>
            <p className="text-sm text-gray-400 mt-1">Monitor and manage all your connected services</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Activity className="h-4 w-4" />
            <span>{connectedIntegrations} of {totalIntegrations} connected</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {integrations.map((integration) => {
            const isExpanded = expandedIntegrations.has(integration.id);
            return (
              <div
                key={integration.id}
                className={`glass-card p-6 hover:bg-white/10 transition-all duration-200 group relative overflow-hidden border ${
                  getIntegrationStatusColor(integration.status)
                }`}
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-r ${integration.color} rounded-lg flex items-center justify-center text-white`}>
                      {integration.icon}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIntegrationStatusColor(integration.status)}`}>
                        {integration.status}
                      </span>
                      {integration.quickActions && integration.quickActions.length > 0 && (
                        <button
                          onClick={() => toggleIntegration(integration.id)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors mb-1">
                      {integration.name}
                    </h3>
                    <p className="text-sm text-gray-400 mb-3">{integration.description}</p>
                    
                    {integration.metrics && integration.metrics.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {integration.metrics.map((metric, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">{metric.label}:</span>
                            <span className="text-white font-medium">{metric.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {integration.lastSync && (
                      <div className="text-xs text-gray-500 mb-3">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Last sync: {integration.lastSync}
                      </div>
                    )}

                    {isExpanded && integration.quickActions && (
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                        {integration.quickActions.map((action, idx) => (
                          <Link
                            key={idx}
                            to={action.href}
                            className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            {action.icon}
                            <span>{action.label}</span>
                          </Link>
                        ))}
                        <Link
                          to={integration.href}
                          className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors mt-2"
                        >
                          <ArrowRight className="h-3 w-3" />
                          <span>View Details</span>
                        </Link>
                      </div>
                    )}

                    {!isExpanded && (
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-500">
                          {integration.accounts} account{integration.accounts !== 1 ? 's' : ''}
                        </span>
                        <Link
                          to={integration.href}
                          className="text-gray-400 hover:text-blue-400 transition-colors"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Agents Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Your AI Agents</h2>
          <Link
            to="/agents"
            className="text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentAgents.slice(0, 3).map((agent) => (
            <div
              key={agent.id}
              className="glass-card p-6 hover:bg-white/10 transition-all duration-200 cursor-pointer group"
              onClick={() => window.location.href = `/agents/${agent.id}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-2xl overflow-hidden">
                    {agent.avatar && agent.avatar !== '🤖' ? (
                      <img 
                        src={agent.avatar} 
                        alt={`${agent.name} avatar`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold text-lg">
                        {agent.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-gray-400">{agent.personality}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                  {agent.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Platforms:</span>
                  <div className="flex space-x-1">
                    {agent.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">{agent.stats.postsToday}</p>
                    <p className="text-xs text-gray-400">Posts Today</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">{agent.stats.engagementRate}%</p>
                    <p className="text-xs text-gray-400">Engagement</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">{agent.stats.followers}</p>
                    <p className="text-xs text-gray-400">Followers</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Create New Agent Card */}
          <Link
            to="/agents/create"
            className="glass-card p-6 border-2 border-dashed border-gray-600 hover:border-blue-500 transition-all duration-200 flex flex-col items-center justify-center text-center group min-h-[280px]"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
              <Plus className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Create New Agent</h3>
            <p className="text-gray-400 text-sm">
              Design a unique AI personality and watch it come to life
            </p>
          </Link>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Recent Activity</h2>
          <span className="text-sm text-gray-400">Last 24 hours</span>
        </div>

        <div className="glass-card p-6">
          <div className="space-y-4">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border ${getActivityColor(activity.type)}`}
                >
                  <div className="flex-shrink-0">
                    {activity.icon}
              </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{activity.title}</p>
                    <p className="text-sm text-gray-400 truncate">{activity.description}</p>
                    {activity.integration && (
                      <span className="text-xs text-gray-500 mt-1 inline-block">
                        {activity.integration}
                      </span>
                    )}
            </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
              </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Integration Onboarding Modal */}
      {showOnboarding && (
        <IntegrationOnboarding onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
