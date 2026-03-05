import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Eye, 
  Monitor, 
  Smartphone,
  Globe,
  ExternalLink,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface AnalyticsStats {
  overview: {
    total_page_views: number;
    unique_sessions: number;
    today_views: number;
    week_views: number;
  };
  top_pages: Array<{ page_path: string; page_title: string; views: number }>;
  devices: Array<{ device_type: string; count: number }>;
  browsers: Array<{ browser: string; count: number }>;
  referrers: Array<{ source: string; count: number }>;
}

interface DailyStats {
  date: string;
  page_views: number;
  unique_sessions: number;
}

const AdminAnalytics: React.FC = () => {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [statsResponse, dailyResponse] = await Promise.all([
        apiService.get('/analytics/stats'),
        apiService.get('/analytics/daily')
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      if (dailyResponse.success) {
        setDailyStats(dailyResponse.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-1">Server-side tracking (captures all users, including ad blockers)</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-1">Server-side tracking</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No analytics data available yet</p>
        </div>
      </div>
    );
  }

  const { overview, top_pages, devices, browsers, referrers } = stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-1">Server-side tracking (captures all users, including ad blockers)</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <Eye className="h-8 w-8 text-blue-400" />
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{overview.total_page_views.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Total Page Views</p>
            </div>
          </div>
          <div className="text-xs text-gray-500">All time</div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 text-green-400" />
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{overview.unique_sessions.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Unique Sessions</p>
            </div>
          </div>
          <div className="text-xs text-gray-500">All time</div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-8 w-8 text-yellow-400" />
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{overview.today_views.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Today's Views</p>
            </div>
          </div>
          <div className="text-xs text-gray-500">{new Date().toLocaleDateString()}</div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <Calendar className="h-8 w-8 text-purple-400" />
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{overview.week_views.toLocaleString()}</p>
              <p className="text-sm text-gray-400">This Week</p>
            </div>
          </div>
          <div className="text-xs text-gray-500">Last 7 days</div>
        </div>
      </div>

      {/* Daily Trends */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-400" />
          Daily Trends (Last 30 Days)
        </h2>
        <div className="overflow-x-auto">
          <div className="flex items-end gap-2 h-64 min-w-[600px]">
            {dailyStats.map((day, idx) => {
              const maxViews = Math.max(...dailyStats.map(d => d.page_views), 1);
              const heightPercent = (day.page_views / maxViews) * 100;
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group">
                  <div className="relative w-full">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg hover:from-blue-500 hover:to-blue-300 transition-all cursor-pointer"
                      style={{ height: `${Math.max(heightPercent, 2)}%`, minHeight: '8px' }}
                      title={`${day.page_views} views, ${day.unique_sessions} sessions`}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {day.page_views} views
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-2 transform rotate-45 origin-left whitespace-nowrap">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <ExternalLink className="h-6 w-6 text-green-400" />
            Top Pages
          </h2>
          <div className="space-y-4">
            {top_pages.slice(0, 8).map((page, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{page.page_title || page.page_path}</p>
                  <p className="text-sm text-gray-500 truncate">{page.page_path}</p>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full"
                      style={{ width: `${(page.views / top_pages[0].views) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-semibold w-16 text-right">{page.views}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Globe className="h-6 w-6 text-purple-400" />
            Traffic Sources
          </h2>
          <div className="space-y-4">
            {referrers.map((ref, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-white font-medium">{ref.source}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full"
                      style={{ width: `${(ref.count / referrers[0].count) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-semibold w-16 text-right">{ref.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Monitor className="h-6 w-6 text-blue-400" />
            Device Types
          </h2>
          <div className="space-y-4">
            {devices.map((device, idx) => {
              const total = devices.reduce((sum, d) => sum + d.count, 0);
              const percentage = ((device.count / total) * 100).toFixed(1);
              
              const icon = device.device_type === 'mobile' ? <Smartphone className="h-5 w-5" /> : 
                          device.device_type === 'tablet' ? <Smartphone className="h-5 w-5" /> :
                          <Monitor className="h-5 w-5" />;
              
              const color = device.device_type === 'mobile' ? 'from-green-500 to-green-400' : 
                           device.device_type === 'tablet' ? 'from-yellow-500 to-yellow-400' :
                           'from-blue-500 to-blue-400';
              
              return (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-400">{icon}</div>
                    <span className="text-white font-medium capitalize">{device.device_type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-700 rounded-full h-2">
                      <div 
                        className={`bg-gradient-to-r ${color} h-2 rounded-full`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-white font-semibold w-16 text-right">{device.count}</span>
                    <span className="text-gray-500 text-sm w-12 text-right">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Browser Breakdown */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Globe className="h-6 w-6 text-teal-400" />
            Browsers
          </h2>
          <div className="space-y-4">
            {browsers.map((browser, idx) => {
              const total = browsers.reduce((sum, b) => sum + b.count, 0);
              const percentage = ((browser.count / total) * 100).toFixed(1);
              
              return (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-white font-medium">{browser.browser}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-teal-500 to-teal-400 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-white font-semibold w-16 text-right">{browser.count}</span>
                    <span className="text-gray-500 text-sm w-12 text-right">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <BarChart3 className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Server-Side Analytics</h3>
            <p className="text-gray-300 text-sm mb-3">
              This data is collected server-side and captures <strong>all users</strong>, including those with ad blockers (typically 40-60% of visitors). 
              This provides more accurate data than Google Analytics alone.
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Real-time tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Privacy-friendly (hashed IPs)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>100% coverage</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
