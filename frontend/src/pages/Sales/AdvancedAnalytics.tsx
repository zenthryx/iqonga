import React, { useState, useEffect } from 'react';
import { salesAnalyticsApi } from '../../services/salesAnalyticsApi';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Calendar,
  Download,
  Loader2,
  RefreshCw,
  PieChart,
  Activity
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Funnel, FunnelChart } from 'recharts';

const AdvancedAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('month');

  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [leadSourcesData, setLeadSourcesData] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any>(null);
  const [velocityData, setVelocityData] = useState<any>(null);
  const [winLossData, setWinLossData] = useState<any>(null);

  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const range = { startDate: dateRange.startDate, endDate: dateRange.endDate };

      const [metrics, revenue, sources, funnel, velocity, winLoss] = await Promise.all([
        salesAnalyticsApi.getDashboardMetrics(range),
        salesAnalyticsApi.getRevenueChart(range, groupBy),
        salesAnalyticsApi.getLeadSources(range),
        salesAnalyticsApi.getConversionFunnel(range),
        salesAnalyticsApi.getSalesVelocity(range),
        salesAnalyticsApi.getWinLossAnalysis(range)
      ]);

      setDashboardMetrics(metrics);
      setRevenueData(revenue);
      setLeadSourcesData(sources);
      setFunnelData(funnel);
      setVelocityData(velocity);
      setWinLossData(winLoss);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: 'leads' | 'deals' | 'activities') => {
    try {
      setExporting(true);
      await salesAnalyticsApi.exportToCSV(type, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-blue-400" />
            Advanced Analytics
          </h1>
          <p className="text-gray-400 mt-2">Comprehensive sales insights and reporting</p>
        </div>
        <button
          onClick={loadAnalytics}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Date Range:</span>
          </div>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
          />
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      {dashboardMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">{dashboardMetrics.leads.total}</span>
            </div>
            <div className="text-sm text-gray-300">Total Leads</div>
            <div className="text-xs text-blue-300 mt-1">
              {dashboardMetrics.leads.qualificationRate}% qualified
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold text-white">
                ${(dashboardMetrics.deals.pipelineValue / 1000).toFixed(1)}k
              </span>
            </div>
            <div className="text-sm text-gray-300">Pipeline Value</div>
            <div className="text-xs text-green-300 mt-1">
              {dashboardMetrics.deals.active} active deals
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">{dashboardMetrics.deals.closeRate}%</span>
            </div>
            <div className="text-sm text-gray-300">Close Rate</div>
            <div className="text-xs text-purple-300 mt-1">
              {dashboardMetrics.deals.won} won / {dashboardMetrics.deals.lost} lost
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-orange-400" />
              <span className="text-2xl font-bold text-white">{dashboardMetrics.activities.total}</span>
            </div>
            <div className="text-sm text-gray-300">Activities</div>
            <div className="text-xs text-orange-300 mt-1">
              {dashboardMetrics.activities.completionRate}% completed
            </div>
          </div>
        </div>
      )}

      {/* Revenue Chart */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
          Revenue Over Time
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="period" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue" />
            <Line type="monotone" dataKey="dealsClosed" stroke="#3B82F6" strokeWidth={2} name="Deals Closed" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Lead Sources & Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-blue-400" />
            Lead Sources
          </h2>
          {leadSourcesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie>
                <Pie
                  data={leadSourcesData}
                  dataKey="leadCount"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.source}: ${entry.leadCount}`}
                >
                  {leadSourcesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                />
              </RechartsPie>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-400 py-12">No lead source data available</div>
          )}
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Conversion Funnel</h2>
          {funnelData?.stages && (
            <div className="space-y-3">
              {funnelData.stages.map((stage: any, index: number) => (
                <div key={index} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{stage.stage}</span>
                    <span className="text-sm font-semibold text-white">{stage.count}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-8">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                      style={{ width: `${stage.percentage}%` }}
                    >
                      {stage.percentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sales Velocity & Win/Loss */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Velocity */}
        {velocityData && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Sales Velocity</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Avg Days to Close:</span>
                <span className="text-2xl font-bold text-white">{velocityData.avgDaysToClose?.toFixed(0) || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Fastest Close:</span>
                <span className="text-lg font-semibold text-green-400">{velocityData.fastestClose || 0} days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Slowest Close:</span>
                <span className="text-lg font-semibold text-red-400">{velocityData.slowestClose || 0} days</span>
              </div>
            </div>
          </div>
        )}

        {/* Win/Loss Analysis */}
        {winLossData && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Win/Loss Analysis</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="text-sm text-gray-300 mb-1">Won Deals</div>
                <div className="text-2xl font-bold text-green-400">{winLossData.won.count}</div>
                <div className="text-xs text-gray-400 mt-1">
                  ${(winLossData.won.totalValue / 1000).toFixed(1)}k total
                </div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="text-sm text-gray-300 mb-1">Lost Deals</div>
                <div className="text-2xl font-bold text-red-400">{winLossData.lost.count}</div>
                <div className="text-xs text-gray-400 mt-1">
                  ${(winLossData.lost.totalValue / 1000).toFixed(1)}k lost
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Download className="w-5 h-5 mr-2 text-blue-400" />
          Export Data
        </h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleExport('leads')}
            disabled={exporting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Leads
          </button>
          <button
            onClick={() => handleExport('deals')}
            disabled={exporting}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Deals
          </button>
          <button
            onClick={() => handleExport('activities')}
            disabled={exporting}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Activities
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;

