import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface ScheduledPost {
  id: string;
  platform: string;
  status: string;
  frequency: string;
  max_runs: number;
  run_count: number;
  scheduled_time: string;
  next_run: string;
  last_run: string;
  created_at: string;
  username: string;
  wallet_address: string;
  agent_name: string;
  personality_type: string;
}

interface ScheduledPostsData {
  posts: ScheduledPost[];
  summary: {
    total: number;
    active: number;
    running: number;
    failed: number;
    completed: number;
    twitter: number;
    telegram: number;
    executed_last_hour: number;
    executed_last_24h: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const AdminScheduledPosts: React.FC = () => {
  const [data, setData] = useState<ScheduledPostsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    platform: '',
    page: 1
  });

  useEffect(() => {
    fetchScheduledPosts();
  }, [filters]);

  const fetchScheduledPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.platform) params.append('platform', filters.platform);
      params.append('page', filters.page.toString());
      params.append('limit', '20');

      const response = await apiService.get(`/admin/scheduled-posts?${params}`);
      if (response.success) {
        setData(response.data);
      } else {
        toast.error('Failed to load scheduled posts');
      }
    } catch (error: any) {
      console.error('Scheduled posts error:', error);
      toast.error('Failed to load scheduled posts');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <PlayIcon className="h-4 w-4 text-green-400" />;
      case 'running':
        return <ClockIcon className="h-4 w-4 text-blue-400" />;
      case 'failed':
        return <XCircleIcon className="h-4 w-4 text-red-400" />;
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-gray-400" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'running':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      case 'completed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPlatformIcon = (platform: string) => {
    return platform === 'twitter' ? '🐦' : '📱';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-300 mb-2">Failed to load scheduled posts</h3>
        <p className="text-gray-500">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Scheduled Posts</h1>
        <p className="text-gray-400 mt-1">Monitor and manage all scheduled posts across the platform</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Posts</p>
              <p className="text-2xl font-bold text-white">{data.summary.total}</p>
            </div>
            <CalendarDaysIcon className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Posts</p>
              <p className="text-2xl font-bold text-green-400">{data.summary.active}</p>
            </div>
            <PlayIcon className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Failed Posts</p>
              <p className="text-2xl font-bold text-red-400">{data.summary.failed}</p>
            </div>
            <XCircleIcon className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Executed (24h)</p>
              <p className="text-2xl font-bold text-blue-400">{data.summary.executed_last_24h}</p>
            </div>
            <ClockIcon className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="running">Running</option>
              <option value="failed">Failed</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Platform</label>
            <select
              value={filters.platform}
              onChange={(e) => setFilters({ ...filters, platform: e.target.value, page: 1 })}
              className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2"
            >
              <option value="">All Platforms</option>
              <option value="twitter">Twitter</option>
              <option value="telegram">Telegram</option>
            </select>
          </div>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Scheduled Posts</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Post Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User & Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {data.posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getPlatformIcon(post.platform)}</span>
                      <div>
                        <div className="text-sm font-medium text-white capitalize">
                          {post.platform} Post
                        </div>
                        <div className="text-sm text-gray-400">
                          {post.frequency} • {post.run_count}/{post.max_runs === 0 ? '∞' : post.max_runs} runs
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-white">{post.username}</div>
                      <div className="text-sm text-gray-400">{post.agent_name}</div>
                      <div className="text-xs text-gray-500">{post.personality_type}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-300">
                        Next: {new Date(post.next_run).toLocaleString()}
                      </div>
                      {post.last_run && (
                        <div className="text-sm text-gray-400">
                          Last: {new Date(post.last_run).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(post.status)}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(post.status)}`}>
                        {post.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-400 hover:text-blue-300">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="text-yellow-400 hover:text-yellow-300">
                        <PauseIcon className="h-4 w-4" />
                      </button>
                      <button className="text-red-400 hover:text-red-300">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.pagination.total > data.pagination.limit && (
          <div className="px-6 py-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of {data.pagination.total} posts
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                  disabled={filters.page === 1}
                  className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={filters.page * data.pagination.limit >= data.pagination.total}
                  className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminScheduledPosts;
