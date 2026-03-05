import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  RectangleStackIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface QueuedPost {
  id: string;
  user_id: number;
  agent_id: string;
  agent_name: string;
  username: string;
  email: string;
  wallet_address: string;
  content_text: string;
  content_type: string;
  platform: string;
  status: string;
  scheduled_for: string;
  created_at: string;
  updated_at: string;
  retry_count: number;
  max_retries: number;
  original_error: string;
  rate_limit_reset: string;
  posted_at: string;
}

interface PostQueueData {
  queuedPosts: QueuedPost[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
  summary: {
    queued: number;
    processing: number;
    posted: number;
    failed: number;
  };
}

const AdminPostQueue: React.FC = () => {
  const [data, setData] = useState<PostQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    platform: '',
    page: 1
  });

  useEffect(() => {
    fetchQueue();
  }, [filters]);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.platform) params.append('platform', filters.platform);
      params.append('limit', '50');
      params.append('offset', ((filters.page - 1) * 50).toString());

      const response = await apiService.get(`/admin/post-queue?${params}`);
      if (response.success) {
        setData(response.data);
      } else {
        toast.error('Failed to load post queue');
      }
    } catch (error: any) {
      console.error('Post queue error:', error);
      toast.error('Failed to load post queue');
    } finally {
      setLoading(false);
    }
  };

  const retryPost = async (queueId: string) => {
    try {
      const response = await apiService.post(`/admin/post-queue/${queueId}/retry`);
      if (response.success) {
        toast.success('Post queued for immediate retry');
        fetchQueue();
      } else {
        toast.error('Failed to retry post');
      }
    } catch (error: any) {
      console.error('Retry error:', error);
      toast.error('Failed to retry post');
    }
  };

  const deletePost = async (queueId: string) => {
    if (!window.confirm('Are you sure you want to delete this post from the queue? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await apiService.delete(`/admin/post-queue/${queueId}`);
      if (response.success) {
        toast.success('Post deleted successfully');
        fetchQueue();
      } else {
        toast.error('Failed to delete post');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete post');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'posted':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getTimeUntil = (dateString: string) => {
    if (!dateString) return 'N/A';
    const now = new Date();
    const scheduled = new Date(dateString);
    const diff = scheduled.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ready now';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
    return `in ${minutes}m`;
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Post Queue</h1>
        <p className="text-gray-400 mt-1">Monitor and manage queued posts across the platform</p>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center">
              <RectangleStackIcon className="h-8 w-8 text-yellow-400 mr-3" />
              <div>
                <div className="text-sm text-gray-400">Queued</div>
                <div className="text-2xl font-bold text-white">{data.summary.queued}</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-blue-400 mr-3" />
              <div>
                <div className="text-sm text-gray-400">Processing</div>
                <div className="text-2xl font-bold text-white">{data.summary.processing}</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-400 mr-3" />
              <div>
                <div className="text-sm text-gray-400">Posted</div>
                <div className="text-2xl font-bold text-white">{data.summary.posted}</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center">
              <XCircleIcon className="h-8 w-8 text-red-400 mr-3" />
              <div>
                <div className="text-sm text-gray-400">Failed</div>
                <div className="text-2xl font-bold text-white">{data.summary.failed}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="queued">Queued</option>
              <option value="processing">Processing</option>
              <option value="posted">Posted</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Platform</label>
            <select
              value={filters.platform}
              onChange={(e) => setFilters({ ...filters, platform: e.target.value, page: 1 })}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Platforms</option>
              <option value="twitter">Twitter</option>
              <option value="telegram">Telegram</option>
            </select>
          </div>
          <div className="flex-1"></div>
          <button
            onClick={fetchQueue}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Post Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">User & Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Schedule</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Error</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {data && data.queuedPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-400 text-6xl mb-4">📭</div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">No queued posts</h3>
                    <p className="text-gray-500">All posts have been processed or no posts are queued.</p>
                  </td>
                </tr>
              ) : (
                data?.queuedPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-white">
                          {post.platform === 'twitter' ? '🐦' : '📱'} {post.content_type}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 max-w-md truncate">
                        {post.content_text}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">{post.username || post.wallet_address}</div>
                      <div className="text-xs text-gray-400">{post.agent_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">
                        {post.status === 'queued' ? (
                          <>
                            <div>Next: {formatDate(post.scheduled_for)}</div>
                            <div className="text-xs text-gray-400">{getTimeUntil(post.scheduled_for)}</div>
                          </>
                        ) : post.posted_at ? (
                          <div>Posted: {formatDate(post.posted_at)}</div>
                        ) : (
                          <div>Created: {formatDate(post.created_at)}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(post.status)}`}>
                        {post.status}
                      </span>
                      {post.retry_count > 0 && (
                        <div className="text-xs text-gray-400 mt-1">Retries: {post.retry_count}/{post.max_retries}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {post.original_error && (
                        <div className="text-xs text-gray-400 max-w-xs truncate" title={post.original_error}>
                          {post.original_error}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {post.status === 'failed' && (
                          <button
                            onClick={() => retryPost(post.id)}
                            className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                            title="Retry post"
                          >
                            <ArrowPathIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => deletePost(post.id)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          title="Delete post"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {data.pagination.offset + 1} to {Math.min(data.pagination.offset + data.pagination.limit, data.pagination.total)} of {data.pagination.total} posts
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                disabled={filters.page === 1}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                disabled={filters.page >= data.pagination.pages}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPostQueue;

