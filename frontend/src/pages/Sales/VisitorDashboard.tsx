import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  Target,
  Search,
  Filter,
  Loader2,
  Eye,
  Building2,
  Mail,
  Calendar,
  Globe
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import visitorIntelligenceApi from '@/services/visitorIntelligenceApi';

const VisitorDashboard: React.FC = () => {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    converted: undefined as boolean | undefined,
    min_score: undefined as number | undefined
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [visitorsData, analyticsData] = await Promise.all([
        visitorIntelligenceApi.getVisitors({
          ...filters,
          limit: 100
        }),
        visitorIntelligenceApi.getAnalytics()
      ]);
      setVisitors(visitorsData);
      setAnalytics(analyticsData);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load visitors');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async (visitorId: string) => {
    if (!window.confirm('Convert this visitor to a lead?')) {
      return;
    }

    try {
      await visitorIntelligenceApi.convertVisitorToLead(visitorId, 'manual', 'manual');
      toast.success('Visitor converted to lead successfully');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to convert visitor');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400 bg-green-500/20 border-green-500/50';
    if (score >= 50) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
    return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
  };

  const filteredVisitors = visitors.filter(visitor =>
    searchQuery === '' ||
    (visitor.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (visitor.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (visitor.company_domain || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Visitor Intelligence</h1>
          <p className="text-gray-400">Track and convert website visitors to leads</p>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Total Visitors</span>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{analytics.stats?.total_visitors || 0}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Converted</span>
              <Target className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">{analytics.stats?.converted_visitors || 0}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">High Score</span>
              <TrendingUp className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-white">{analytics.stats?.high_score_visitors || 0}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Avg Score</span>
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {Math.round(analytics.stats?.avg_visitor_score || 0)}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search visitors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={filters.converted === undefined ? 'all' : filters.converted.toString()}
            onChange={(e) => setFilters({
              ...filters,
              converted: e.target.value === 'all' ? undefined : e.target.value === 'true'
            })}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="all">All Visitors</option>
            <option value="false">Not Converted</option>
            <option value="true">Converted</option>
          </select>
          <select
            value={filters.min_score === undefined ? 'all' : filters.min_score.toString()}
            onChange={(e) => setFilters({
              ...filters,
              min_score: e.target.value === 'all' ? undefined : parseInt(e.target.value)
            })}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="all">All Scores</option>
            <option value="70">High (70+)</option>
            <option value="50">Medium (50+)</option>
            <option value="0">Low (0+)</option>
          </select>
        </div>
      </div>

      {/* Visitors List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredVisitors.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No visitors found</h3>
          <p className="text-gray-400">
            {searchQuery || filters.converted !== undefined || filters.min_score !== undefined
              ? 'Try adjusting your filters'
              : 'Visitors will appear here once they visit your website'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Visitor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Scores
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Visits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Last Visit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredVisitors.map((visitor) => (
                <tr key={visitor.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-400" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">
                          {visitor.first_name && visitor.last_name
                            ? `${visitor.first_name} ${visitor.last_name}`
                            : visitor.email || 'Anonymous'}
                        </div>
                        {visitor.email && (
                          <div className="text-sm text-gray-400">{visitor.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {visitor.company_name ? (
                      <div>
                        <div className="text-sm font-medium text-white">{visitor.company_name}</div>
                        {visitor.company_domain && (
                          <div className="text-sm text-gray-400">{visitor.company_domain}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400">Overall:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getScoreColor(visitor.visitor_score || 0)}`}>
                          {visitor.visitor_score || 0}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <span>Intent: {visitor.intent_score || 0}</span>
                        <span>•</span>
                        <span>Engage: {visitor.engagement_score || 0}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {visitor.total_visits || 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {visitor.last_visit_at
                      ? new Date(visitor.last_visit_at).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {visitor.converted_to_lead ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/50">
                        Converted
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/50">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        to={`/sales/visitors/${visitor.id}`}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {!visitor.converted_to_lead && (
                        <button
                          onClick={() => handleConvert(visitor.id)}
                          className="text-green-400 hover:text-green-300 transition-colors"
                          title="Convert to Lead"
                        >
                          <Target className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VisitorDashboard;

