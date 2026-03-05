import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface QueuedPost {
  id: string;
  agent_name: string;
  content_text: string;
  content_type: string;
  platform: string;
  scheduled_for: string;
  status: string;
  retry_count: number;
  created_at: string;
}

interface RateLimitStatus {
  platform: string;
  isLimited: boolean;
  currentCount: number;
  limitMax: number;
  remainingPosts: number;
  resetTime: string | null;
}

const PostQueue: React.FC = () => {
  const [queuedPosts, setQueuedPosts] = useState<QueuedPost[]>([]);
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchQueueData = async () => {
    try {
      const [queueResponse, rateLimitResponse] = await Promise.all([
        fetch('/api/credits/queue', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }),
        fetch('/api/credits/rate-limits', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        })
      ]);

      if (queueResponse.ok) {
        const queueData = await queueResponse.json();
        setQueuedPosts(queueData.data.queuedPosts);
      }

      if (rateLimitResponse.ok) {
        const rateLimitData = await rateLimitResponse.json();
        setRateLimitStatus(rateLimitData.data);
      }
    } catch (error) {
      console.error('Error fetching queue data:', error);
      toast.error('Failed to fetch queue data');
    } finally {
      setLoading(false);
    }
  };

  const cancelPost = async (queueId: string) => {
    try {
      const response = await fetch(`/api/credits/queue/${queueId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        toast.success('Post cancelled successfully');
        fetchQueueData(); // Refresh the queue
      } else {
        toast.error('Failed to cancel post');
      }
    } catch (error) {
      console.error('Error cancelling post:', error);
      toast.error('Failed to cancel post');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Post Queue & Rate Limits</h2>
          <p className="text-gray-600 mt-2">Manage your queued posts and monitor rate limit status</p>
        </div>

        {/* Rate Limit Status */}
        {rateLimitStatus && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Twitter Rate Limit Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Posts Used</div>
                <div className="text-2xl font-bold text-blue-900">
                  {rateLimitStatus.currentCount}/{rateLimitStatus.limitMax}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Remaining</div>
                <div className="text-2xl font-bold text-green-900">
                  {rateLimitStatus.remainingPosts}
                </div>
              </div>
              <div className={`p-4 rounded-lg ${rateLimitStatus.isLimited ? 'bg-red-50' : 'bg-green-50'}`}>
                <div className={`text-sm font-medium ${rateLimitStatus.isLimited ? 'text-red-600' : 'text-green-600'}`}>
                  Status
                </div>
                <div className={`text-lg font-bold ${rateLimitStatus.isLimited ? 'text-red-900' : 'text-green-900'}`}>
                  {rateLimitStatus.isLimited ? 'Rate Limited' : 'Available'}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 font-medium">Reset Time</div>
                <div className="text-sm font-bold text-gray-900">
                  {rateLimitStatus.resetTime ? formatDate(rateLimitStatus.resetTime) : 'Unknown'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Queued Posts */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Queued Posts ({queuedPosts.length})
            </h3>
            <button
              onClick={fetchQueueData}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Refresh
            </button>
          </div>

          {queuedPosts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No queued posts</h3>
              <p className="text-gray-600">
                When you hit rate limits, your posts will be automatically queued here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {queuedPosts.map((post) => (
                <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-blue-600">
                          {post.agent_name}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500 capitalize">
                          {post.content_type}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          post.status === 'queued' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : post.status === 'processing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                      <p className="text-gray-900 mb-2">
                        {truncateText(post.content_text)}
                      </p>
                      <div className="text-xs text-gray-500">
                        <span>Scheduled for: {formatDate(post.scheduled_for)}</span>
                        {post.retry_count > 0 && (
                          <span className="ml-4">Retries: {post.retry_count}</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      {post.status === 'queued' && (
                        <button
                          onClick={() => cancelPost(post.id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostQueue;
