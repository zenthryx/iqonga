import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  UsersIcon,
  CpuChipIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CogIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  users: {
    total_users: number;
    new_users_week: number;
    new_users_month: number;
    admin_users: number;
  };
  agents: {
    total_agents: number;
    new_agents_week: number;
    active_agents: number;
  };
  content: {
    total_content: number;
    content_week: number;
    published_content: number;
  };
  credits: {
    total_credits: number;
    avg_credits_per_user: number;
    users_without_credits: number;
  };
  scheduledPosts: {
    total_scheduled_posts: number;
    active_posts: number;
    running_posts: number;
    failed_posts: number;
    completed_posts: number;
    twitter_posts: number;
    telegram_posts: number;
    posts_created_week: number;
    posts_executed_24h: number;
  };
  recentLogs: Array<{
    level: string;
    category: string;
    message: string;
    created_at: string;
    user_id?: string;
  }>;
  openTickets: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await apiService.get('/admin/dashboard');
      if (response.success) {
        setStats(response.data);
      } else {
        toast.error('Failed to load dashboard data');
      }
    } catch (error: any) {
      console.error('Dashboard error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-300 mb-2">Failed to load dashboard</h3>
        <p className="text-gray-500">Please try refreshing the page</p>
      </div>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    trendValue 
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ComponentType<any>;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
  }) => (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex items-center">
          <Icon className="h-8 w-8 text-blue-400" />
          {trend && trendValue && (
            <div className={`ml-2 flex items-center ${
              trend === 'up' ? 'text-green-400' : 
              trend === 'down' ? 'text-red-400' : 
              'text-gray-400'
            }`}>
              {trend === 'up' ? <ArrowUpIcon className="h-4 w-4" /> : 
               trend === 'down' ? <ArrowDownIcon className="h-4 w-4" /> : null}
              <span className="text-sm ml-1">{trendValue}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const LogLevelBadge = ({ level }: { level: string }) => {
    const colors = {
      error: 'bg-red-500',
      warn: 'bg-yellow-500',
      info: 'bg-blue-500',
      debug: 'bg-gray-500'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${colors[level as keyof typeof colors] || colors.debug}`}>
        {level.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of platform activity and system health</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          title="Total Users"
          value={stats.users.total_users}
          subtitle={`${stats.users.new_users_week} new this week`}
          icon={UsersIcon}
          trend="up"
          trendValue={`+${stats.users.new_users_week}`}
        />
        
        <StatCard
          title="Active Agents"
          value={stats.agents.active_agents}
          subtitle={`${stats.agents.total_agents} total agents`}
          icon={CpuChipIcon}
          trend="up"
          trendValue={`+${stats.agents.new_agents_week}`}
        />
        
        <StatCard
          title="Content Generated"
          value={stats.content.total_content}
          subtitle={`${stats.content.content_week} this week`}
          icon={DocumentTextIcon}
          trend="up"
          trendValue={`+${stats.content.content_week}`}
        />
        
        <StatCard
          title="Scheduled Posts"
          value={stats.scheduledPosts.total_scheduled_posts}
          subtitle={`${stats.scheduledPosts.active_posts} active, ${stats.scheduledPosts.failed_posts} failed`}
          icon={CalendarDaysIcon}
          trend="neutral"
        />
        
        <StatCard
          title="Total Credits"
          value={stats.credits.total_credits?.toLocaleString() || '0'}
          subtitle={`${stats.credits.users_without_credits} users without credits`}
          icon={CreditCardIcon}
          trend="neutral"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent System Logs */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-400" />
              Recent System Logs
            </h3>
            <span className="text-sm text-gray-400">Last 10 entries</span>
          </div>
          
          <div className="space-y-3">
            {stats.recentLogs.length > 0 ? (
              stats.recentLogs.map((log, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700 rounded-lg">
                  <LogLevelBadge level={log.level} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 truncate">{log.message}</p>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className="text-xs text-gray-500">{log.category}</span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">No recent logs</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <CogIcon className="h-5 w-5 mr-2 text-green-400" />
            Quick Actions
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-white">Support Tickets</p>
                  <p className="text-xs text-gray-400">{stats.openTickets} open tickets</p>
                </div>
              </div>
              <button className="text-blue-400 hover:text-blue-300 text-sm">
                View All
              </button>
            </div>
            
            <a
              href="/admin/users"
              className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center">
                <UsersIcon className="h-5 w-5 text-blue-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-white">User Management</p>
                  <p className="text-xs text-gray-400">Manage users and permissions</p>
                </div>
              </div>
              <span className="text-blue-400 hover:text-blue-300 text-sm">Manage →</span>
            </a>
            
            <a
              href="/admin/agents"
              className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center">
                <CpuChipIcon className="h-5 w-5 text-purple-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-white">Agents Management</p>
                  <p className="text-xs text-gray-400">View all AI agents</p>
                </div>
              </div>
              <span className="text-blue-400 hover:text-blue-300 text-sm">View →</span>
            </a>
            
            <a
              href="/admin/content"
              className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center">
                <DocumentTextIcon className="h-5 w-5 text-green-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-white">Content Management</p>
                  <p className="text-xs text-gray-400">Monitor generated content</p>
                </div>
              </div>
              <span className="text-blue-400 hover:text-blue-300 text-sm">View →</span>
            </a>
            
            <a
              href="/admin/service-pricing"
              className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center">
                <CreditCardIcon className="h-5 w-5 text-yellow-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-white">Service Pricing</p>
                  <p className="text-xs text-gray-400">Configure credit costs</p>
                </div>
              </div>
              <span className="text-blue-400 hover:text-blue-300 text-sm">Manage →</span>
            </a>
            
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <CalendarDaysIcon className="h-5 w-5 text-purple-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-white">Scheduled Posts</p>
                  <p className="text-xs text-gray-400">{stats.scheduledPosts.active_posts} active posts</p>
                </div>
              </div>
              <button className="text-blue-400 hover:text-blue-300 text-sm">
                View All
              </button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <ChartBarIcon className="h-5 w-5 text-green-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-white">Analytics</p>
                  <p className="text-xs text-gray-400">View detailed reports</p>
                </div>
              </div>
              <button className="text-blue-400 hover:text-blue-300 text-sm">
                View Reports
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <ClockIcon className="h-5 w-5 mr-2 text-green-400" />
          System Health
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-green-400 text-2xl font-bold">99.9%</div>
            <div className="text-sm text-gray-400">Uptime</div>
          </div>
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-blue-400 text-2xl font-bold">45ms</div>
            <div className="text-sm text-gray-400">Avg Response</div>
          </div>
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-yellow-400 text-2xl font-bold">2</div>
            <div className="text-sm text-gray-400">Active Alerts</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
