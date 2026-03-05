import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  ShieldExclamationIcon,
  ArrowTrendingUpIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface RateLimit {
  endpoint: string;
  method: string;
  limit: number;
  window: number;
  current_usage: number;
  blocked_requests: number;
}

const AdminRateLimiting: React.FC = () => {
  const [rateLimits, setRateLimits] = useState<RateLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ limit: number; window: number }>({ limit: 0, window: 0 });

  useEffect(() => {
    fetchRateLimits();
  }, []);

  const fetchRateLimits = async () => {
    try {
      const response = await apiService.get('/admin/rate-limits');
      if (response.success) {
        setRateLimits(response.data.rate_limits || []);
      } else {
        toast.error('Failed to load rate limits');
      }
    } catch (error: any) {
      console.error('Rate limits error:', error);
      toast.error('Failed to load rate limits');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rateLimit: RateLimit) => {
    setEditing(rateLimit.endpoint);
    setEditValues({ limit: rateLimit.limit, window: rateLimit.window });
  };

  const handleSave = async (endpoint: string) => {
    try {
      const response = await apiService.put('/admin/rate-limits', {
        endpoint,
        limit: editValues.limit,
        window: editValues.window
      });

      if (response.success) {
        setRateLimits(rateLimits.map(rl => 
          rl.endpoint === endpoint 
            ? { ...rl, limit: editValues.limit, window: editValues.window }
            : rl
        ));
        setEditing(null);
        toast.success('Rate limit updated successfully');
      } else {
        toast.error('Failed to update rate limit');
      }
    } catch (error: any) {
      console.error('Rate limit update error:', error);
      toast.error(error.message || 'Failed to update rate limit');
    }
  };

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.min((current / limit) * 100, 100);
  };

  if (loading) {
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
        <h1 className="text-2xl font-bold text-white">Rate Limiting</h1>
        <p className="text-gray-400 mt-1">Monitor and manage API rate limits</p>
      </div>

      {/* Rate Limits Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Window
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Current Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Blocked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {rateLimits.map((rateLimit) => {
                const usagePercent = getUsagePercentage(rateLimit.current_usage, rateLimit.limit);
                const isEditing = editing === rateLimit.endpoint;
                
                return (
                  <tr key={rateLimit.endpoint} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{rateLimit.endpoint}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {rateLimit.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.limit}
                          onChange={(e) => setEditValues({ ...editValues, limit: parseInt(e.target.value) })}
                          className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      ) : (
                        <div className="text-sm text-gray-300">{rateLimit.limit}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.window}
                          onChange={(e) => setEditValues({ ...editValues, window: parseInt(e.target.value) })}
                          className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      ) : (
                        <div className="text-sm text-gray-300">{rateLimit.window}s</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-700 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              usagePercent >= 90 ? 'bg-red-500' :
                              usagePercent >= 70 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-300">
                          {rateLimit.current_usage} / {rateLimit.limit}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-red-400">{rateLimit.blocked_requests || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(rateLimit.endpoint)}
                            className="text-green-400 hover:text-green-300"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="text-gray-400 hover:text-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(rateLimit)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {rateLimits.length === 0 && (
        <div className="text-center py-12">
          <ShieldExclamationIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No rate limits configured</h3>
          <p className="text-gray-500">Rate limits will appear here once configured</p>
        </div>
      )}
    </div>
  );
};

export default AdminRateLimiting;

