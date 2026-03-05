import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { salesApi } from '../../services/salesApi';
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Loader
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface DashboardData {
  total_pipeline_value: number;
  total_deals: number;
  won_deals: number;
  lost_deals: number;
  open_deals: number;
  win_rate: number;
  average_deal_size: number;
  deals_by_stage: any[];
  forecast: any;
}

const SalesDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await salesApi.getSalesDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Dashboard</h2>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Sales Dashboard</h1>
        <p className="text-gray-400">Overview of your sales performance and metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Pipeline Value */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrency(dashboardData.total_pipeline_value)}
          </div>
          <div className="text-gray-400 text-sm">Total Pipeline Value</div>
        </div>

        {/* Total Deals */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {dashboardData.total_deals}
          </div>
          <div className="text-gray-400 text-sm">Total Deals</div>
        </div>

        {/* Average Deal Size */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-600/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrency(dashboardData.average_deal_size)}
          </div>
          <div className="text-gray-400 text-sm">Average Deal Size</div>
        </div>

        {/* Win Rate */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-600/20 rounded-lg">
              <CheckCircle className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatPercent(dashboardData.win_rate)}
          </div>
          <div className="text-gray-400 text-sm">Win Rate</div>
        </div>
      </div>

      {/* Deal Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Open Deals */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-blue-400 mb-1">
                {dashboardData.open_deals}
              </div>
              <div className="text-gray-400">Open Deals</div>
            </div>
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <Target className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Won Deals */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-green-400 mb-1">
                {dashboardData.won_deals}
              </div>
              <div className="text-gray-400">Won Deals</div>
            </div>
            <div className="p-3 bg-green-600/20 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Lost Deals */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-red-400 mb-1">
                {dashboardData.lost_deals}
              </div>
              <div className="text-gray-400">Lost Deals</div>
            </div>
            <div className="p-3 bg-red-600/20 rounded-lg">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pipeline by Stage */}
        {dashboardData.deals_by_stage && dashboardData.deals_by_stage.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Pipeline by Stage</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.deals_by_stage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="stage_name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Bar dataKey="deal_count" fill="#3B82F6" name="Deals" />
                <Bar dataKey="total_value" fill="#10B981" name="Value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Deal Status Distribution */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Deal Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Open', value: dashboardData.open_deals },
                  { name: 'Won', value: dashboardData.won_deals },
                  { name: 'Lost', value: dashboardData.lost_deals }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {[
                  { name: 'Open', value: dashboardData.open_deals },
                  { name: 'Won', value: dashboardData.won_deals },
                  { name: 'Lost', value: dashboardData.lost_deals }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#fff'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/sales/leads/new')}
            className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-left"
          >
            <Users className="w-6 h-6 mb-2" />
            <div>Add New Lead</div>
          </button>
          <button
            onClick={() => navigate('/sales/deals/new')}
            className="px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-left"
          >
            <Target className="w-6 h-6 mb-2" />
            <div>Create Deal</div>
          </button>
          <button
            onClick={() => navigate('/sales/activities/new')}
            className="px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-left"
          >
            <Calendar className="w-6 h-6 mb-2" />
            <div>Log Activity</div>
          </button>
          <button
            onClick={() => navigate('/sales/pipeline')}
            className="px-6 py-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors text-left"
          >
            <TrendingUp className="w-6 h-6 mb-2" />
            <div>View Pipeline</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
