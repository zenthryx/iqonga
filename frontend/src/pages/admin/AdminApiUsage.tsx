import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  ChartBarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

interface ApiUsage {
  provider: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  total_cost: number;
  avg_response_time: number;
  last_used: string;
}

const AdminApiUsage: React.FC = () => {
  const [usage, setUsage] = useState<ApiUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchApiUsage();
  }, [timeRange]);

  const fetchApiUsage = async () => {
    try {
      const response = await apiService.get(`/admin/api-usage?range=${timeRange}`);
      if (response.success) {
        setUsage(response.data.usage || []);
        setStats(response.data.stats || null);
      } else {
        toast.error('Failed to load API usage data');
      }
    } catch (error: any) {
      console.error('API usage error:', error);
      toast.error('Failed to load API usage data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">API Usage Monitoring</h1>
          <p className="text-gray-400 mt-1">Track API usage and costs across all providers</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-sm font-medium text-gray-400">Total Requests</p>
            <p className="text-2xl font-bold text-white">{stats.total_requests?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-sm font-medium text-gray-400">Success Rate</p>
            <p className="text-2xl font-bold text-green-400">
              {stats.total_requests > 0 
                ? ((stats.successful_requests / stats.total_requests) * 100).toFixed(1)
                : 0}%
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-sm font-medium text-gray-400">Total Cost</p>
            <p className="text-2xl font-bold text-yellow-400">${stats.total_cost?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-sm font-medium text-gray-400">Avg Response</p>
            <p className="text-2xl font-bold text-blue-400">{stats.avg_response_time?.toFixed(0) || 0}ms</p>
          </div>
        </div>
      )}

      {/* Usage Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Avg Response
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Last Used
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {usage.map((item, index) => {
                const successRate = item.total_requests > 0 
                  ? (item.successful_requests / item.total_requests) * 100 
                  : 0;
                
                return (
                  <tr key={index} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white capitalize">{item.provider}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {item.total_requests.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.successful_requests} success, {item.failed_requests} failed
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-700 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              successRate >= 95 ? 'bg-green-500' :
                              successRate >= 80 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(successRate, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${
                          successRate >= 95 ? 'text-green-400' :
                          successRate >= 80 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {successRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-yellow-400">
                        ${item.total_cost?.toFixed(2) || '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {item.avg_response_time?.toFixed(0) || 0}ms
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {formatDate(item.last_used)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {usage.length === 0 && (
        <div className="text-center py-12">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No API usage data</h3>
          <p className="text-gray-500">API usage data will appear here once requests are made</p>
        </div>
      )}
    </div>
  );
};

export default AdminApiUsage;

