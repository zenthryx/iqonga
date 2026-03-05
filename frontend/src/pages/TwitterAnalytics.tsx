import React, { useEffect, useMemo, useState } from 'react';
import {
  twitterAnalyticsService,
  TwitterOverview,
  TwitterPost,
  TwitterMention,
  FollowerGrowth,
  EngagementTrend,
  SentimentAnalysis,
  HashtagSuggestions,
  ContentSuggestions,
} from '@/services/twitterAnalyticsService';
import { toast } from 'react-hot-toast';
import {
  BarChart3,
  Activity,
  Clock,
  Users,
  Zap,
  Download,
  FileText,
  TrendingUp,
  Sparkles,
  X,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
} from 'recharts';

const TwitterAnalytics: React.FC = () => {
  const [overview, setOverview] = useState<TwitterOverview | null>(null);
  const [posts, setPosts] = useState<TwitterPost[]>([]);
  const [mentions, setMentions] = useState<TwitterMention[]>([]);
  const [bestTimes, setBestTimes] = useState<number[][]>([]);
  const [followerGrowth, setFollowerGrowth] = useState<FollowerGrowth[]>([]);
  const [engagementTrends, setEngagementTrends] = useState<EngagementTrend[]>([]);
  const [sentiment, setSentiment] = useState<SentimentAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<HashtagSuggestions | null>(null);
  const [contentSuggestions, setContentSuggestions] = useState<ContentSuggestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [grokLoading, setGrokLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [dateRange, setDateRange] = useState<number>(30);
  const [twitterConnected, setTwitterConnected] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (dateRange > 0) {
      loadHistoricalData();
    }
  }, [dateRange]);

  // Update follower change from historical data
  useEffect(() => {
    if (followerGrowth.length > 0 && overview) {
      const latest = followerGrowth[followerGrowth.length - 1];
      const previous = followerGrowth.length > 1 ? followerGrowth[followerGrowth.length - 2] : null;
      if (previous) {
        setOverview({
          ...overview,
          followerChange: latest.followers - previous.followers,
        });
      }
    }
  }, [followerGrowth, overview]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ov, p, m, bt] = await Promise.all([
        twitterAnalyticsService.getOverview(),
        twitterAnalyticsService.getPosts(10),
        twitterAnalyticsService.getMentions(20),
        twitterAnalyticsService.getBestTimes(),
      ]);

      if (ov.success && ov.data) {
        setOverview(ov.data);
        setTwitterConnected(true);
      } else if (ov.success === false) {
        setTwitterConnected(false);
      }
      if (p.success && p.data) setPosts(p.data);
      if (m.success && m.data) setMentions(m.data);
      if (bt.success && bt.data) setBestTimes(bt.data);
    } catch (error: any) {
      console.error('Twitter analytics load error', error);
      // Check if it's a Twitter connection error
      if (error?.response?.status === 401 || error?._isTwitterConnectionError) {
        setTwitterConnected(false);
      }
      // Don't show error toast if it's already handled by interceptor (Twitter connection issue)
      if (!error?._handledByInterceptor && !error?._isTwitterConnectionError) {
        toast.error(error?.message || 'Failed to load Twitter analytics');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalData = async () => {
    try {
      setHistoricalLoading(true);
      const [fg, et] = await Promise.all([
        twitterAnalyticsService.getFollowerGrowth(dateRange),
        twitterAnalyticsService.getEngagementTrends(dateRange),
      ]);

      if (fg.success && fg.data) setFollowerGrowth(fg.data);
      if (et.success && et.data) setEngagementTrends(et.data);
    } catch (error: any) {
      console.error('Historical data load error', error);
      // Don't show error toast for historical data - it's optional
    } finally {
      setHistoricalLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf', exportType: string) => {
    try {
      setExportLoading(true);
      
      // Use axios directly for blob downloads
      const axios = (await import('axios')).default;
      const token = localStorage.getItem('authToken');
      const baseURL = process.env.REACT_APP_API_URL || 'https://www.iqonga.org/api';
      
      const url = format === 'csv' 
        ? `${baseURL}/twitter-analytics/export/csv` 
        : `${baseURL}/twitter-analytics/export/pdf`;
      
      const response = await axios.post(url, 
        format === 'csv' 
          ? { exportType, dateRange: { days: dateRange } }
          : { exportType },
        { 
          responseType: 'blob',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Create download link
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `twitter-analytics-${exportType}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      toast.success(`${format.toUpperCase()} export started`);
      setShowExportModal(false);
    } catch (error: any) {
      console.error('Export error', error);
      toast.error(error?.response?.data?.error || error?.message || `Failed to export ${format.toUpperCase()}`);
    } finally {
      setExportLoading(false);
    }
  };

  const loadGrokSuggestions = async () => {
    try {
      setGrokLoading(true);
      const [sent, sugg, content] = await Promise.all([
        twitterAnalyticsService.analyzeSentiment(50),
        twitterAnalyticsService.getSuggestions(),
        twitterAnalyticsService.getContentSuggestions(),
      ]);

      if (sent.success && sent.data) setSentiment(sent.data);
      if (sugg.success && sugg.data) setSuggestions(sugg.data);
      if (content.success && content.data) setContentSuggestions(content.data);
      setShowSuggestionsModal(true);
    } catch (error: any) {
      console.error('Grok suggestions error', error);
      toast.error(error?.message || 'Failed to load AI suggestions');
    } finally {
      setGrokLoading(false);
    }
  };

  const topPostsData = posts.map((p) => ({
    name: p.text.slice(0, 40) + (p.text.length > 40 ? '…' : ''),
    likes: p.metrics.like_count || 0,
    retweets: p.metrics.retweet_count || 0,
    replies: p.metrics.reply_count || 0,
    impressions: p.metrics.impression_count || 0,
  }));

  const bestHourLabel = overview?.bestHourLabel || 'N/A';

  const bestTimeRows = useMemo(() => {
    if (!bestTimes || bestTimes.length === 0) return [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return bestTimes.map((row, idx) => ({
      day: days[idx],
      values: row,
    }));
  }, [bestTimes]);

  // Format follower growth data for chart
  const followerChartData = useMemo(() => {
    return followerGrowth.map((item) => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      followers: item.followers,
      change: item.change,
    }));
  }, [followerGrowth]);

  // Format engagement trends data for chart
  const engagementChartData = useMemo(() => {
    return engagementTrends.map((item) => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      engagementRate: parseFloat(item.engagementRate.toFixed(2)),
      impressions: item.impressions,
      likes: item.likes,
      retweets: item.retweets,
      replies: item.replies,
    }));
  }, [engagementTrends]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Twitter Analytics</h1>
          <p className="text-gray-400 mt-1">Follower growth, post performance, mentions, and best times to post.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadGrokSuggestions}
            disabled={grokLoading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {grokLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            AI Insights
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button onClick={loadData} className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 px-3 py-2">
            <Zap className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Twitter Connection Warning */}
      {!twitterConnected && !loading && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start">
            <Users className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-300 mb-1">Twitter Account Not Connected</h3>
              <p className="text-sm text-yellow-200/80 mb-3">
                Please connect your Twitter account to view analytics. Go to Settings → Platform Connections to connect your Twitter account.
              </p>
              <a
                href="/settings?tab=connections"
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-yellow-300 bg-yellow-500/20 hover:bg-yellow-500/30 rounded transition-colors"
              >
                Connect Twitter Account
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="Followers"
          value={overview?.followerCount ?? 0}
          change={overview?.followerChange}
          icon={<Users className="h-5 w-5 text-blue-400" />}
        />
        <Card
          title="Engagement Rate"
          value={`${overview?.engagementRate ?? 0}%`}
          icon={<Activity className="h-5 w-5 text-green-400" />}
        />
        <Card title="Impressions" value={overview?.impressions ?? 0} icon={<BarChart3 className="h-5 w-5 text-purple-400" />} />
        <Card title="Best Hour (UTC)" value={bestHourLabel} icon={<Clock className="h-5 w-5 text-yellow-400" />} />
      </div>

      {/* Historical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Follower Growth Chart */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Follower Growth</h3>
              <p className="text-sm text-gray-400">Growth over time</p>
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(parseInt(e.target.value))}
              className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          {historicalLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : followerChartData.length === 0 ? (
            <EmptyState message="No historical data yet. Data will be collected daily." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={followerChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF' }} />
                <YAxis tick={{ fill: '#9CA3AF' }} />
                <Tooltip
                  contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Area type="monotone" dataKey="followers" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Followers" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Engagement Trends Chart */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Engagement Trends</h3>
              <p className="text-sm text-gray-400">Engagement metrics over time</p>
            </div>
          </div>
          {historicalLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : engagementChartData.length === 0 ? (
            <EmptyState message="No historical data yet. Data will be collected daily." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF' }} />
                <YAxis tick={{ fill: '#9CA3AF' }} />
                <Tooltip
                  contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Line type="monotone" dataKey="likes" stroke="#10B981" strokeWidth={2} name="Likes" />
                <Line type="monotone" dataKey="retweets" stroke="#8B5CF6" strokeWidth={2} name="Retweets" />
                <Line type="monotone" dataKey="replies" stroke="#F59E0B" strokeWidth={2} name="Replies" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top posts */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Top Posts</h3>
            <p className="text-sm text-gray-400">Most engaging recent tweets</p>
          </div>
        </div>
        {topPostsData.length === 0 ? (
          <EmptyState message="No tweets found yet" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topPostsData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: '#9CA3AF' }} />
              <YAxis tick={{ fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151' }} />
              <Bar dataKey="impressions" fill="#3B82F6" name="Impressions" />
              <Bar dataKey="likes" fill="#10B981" name="Likes" />
              <Bar dataKey="retweets" fill="#8B5CF6" name="Retweets" />
              <Bar dataKey="replies" fill="#F59E0B" name="Replies" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Mentions with Sentiment */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Mentions</h3>
            <p className="text-sm text-gray-400">Recent mentions of your account</p>
          </div>
          {sentiment && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Sentiment:</span>
                <span
                  className={`font-semibold ${
                    sentiment.overallSentiment === 'positive'
                      ? 'text-green-400'
                      : sentiment.overallSentiment === 'negative'
                      ? 'text-red-400'
                      : 'text-gray-400'
                  }`}
                >
                  {sentiment.overallSentiment.toUpperCase()} ({sentiment.sentimentScore > 0 ? '+' : ''}
                  {sentiment.sentimentScore})
                </span>
              </div>
            </div>
          )}
        </div>
        {mentions.length === 0 ? (
          <EmptyState message="No mentions yet" />
        ) : (
          <div className="space-y-3">
            {mentions.map((m) => (
              <div key={m.id} className="p-3 bg-gray-750 rounded border border-gray-700">
                <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                  <span>{new Date(m.created_at).toLocaleString()}</span>
                  <span className="text-xs text-gray-500">
                    Likes {m.metrics.like_count || 0} • RT {m.metrics.retweet_count || 0}
                  </span>
                </div>
                <p className="text-white text-sm leading-relaxed">{m.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Best time heatmap */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Best Time to Post (UTC)</h3>
            <p className="text-sm text-gray-400">Engagement by day and hour (darker = more engagement)</p>
          </div>
        </div>
        {bestTimeRows.length === 0 ? (
          <EmptyState message="Not enough data yet" />
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left text-gray-400">Day</th>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <th key={h} className="p-1 text-gray-500 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bestTimeRows.map((row) => (
                  <tr key={row.day}>
                    <td className="p-2 text-gray-300 font-medium">{row.day}</td>
                    {row.values.map((v, idx) => {
                      const intensity = Math.min(1, v / 50);
                      const bg = `rgba(59, 130, 246, ${0.1 + intensity * 0.7})`;
                      return (
                        <td key={idx} style={{ background: bg }} className="w-6 h-6 text-center text-gray-200">
                          {v > 0 ? '' : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          loading={exportLoading}
        />
      )}

      {/* Grok Suggestions Modal */}
      {showSuggestionsModal && (
        <SuggestionsModal
          onClose={() => setShowSuggestionsModal(false)}
          sentiment={sentiment}
          suggestions={suggestions}
          contentSuggestions={contentSuggestions}
        />
      )}
    </div>
  );
};

const Card = ({
  title,
  value,
  change,
  icon,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
}) => (
  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-semibold text-white">{value}</p>
        {change !== undefined && change !== 0 && (
          <p className={`text-xs mt-1 ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {change > 0 ? '+' : ''}
            {change} from last period
          </p>
        )}
      </div>
      <div className="p-2 rounded bg-gray-700">{icon}</div>
    </div>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-8 text-gray-400 text-sm">{message}</div>
);

const ExportModal = ({
  onClose,
  onExport,
  loading,
}: {
  onClose: () => void;
  onExport: (format: 'csv' | 'pdf', exportType: string) => void;
  loading: boolean;
}) => {
  const [exportType, setExportType] = useState('full');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Export Analytics</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Export Type</label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              <option value="overview">Overview Only</option>
              <option value="posts">Top Posts</option>
              <option value="mentions">Mentions</option>
              <option value="historical">Historical Data</option>
              <option value="full">Full Report (All Data)</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onExport('csv', exportType)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={() => onExport('pdf', exportType)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SuggestionsModal = ({
  onClose,
  sentiment,
  suggestions,
  contentSuggestions,
}: {
  onClose: () => void;
  sentiment: SentimentAnalysis | null;
  suggestions: HashtagSuggestions | null;
  contentSuggestions: ContentSuggestions | null;
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6 border border-gray-700 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            AI-Powered Insights & Suggestions
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Sentiment Analysis */}
          {sentiment && (
            <div className="bg-gray-750 rounded-lg p-4 border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-3">Mentions Sentiment Analysis</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{sentiment.sentimentScore}</p>
                  <p className="text-xs text-gray-400">Sentiment Score</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{sentiment.positiveCount}</p>
                  <p className="text-xs text-gray-400">Positive</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{sentiment.negativeCount}</p>
                  <p className="text-xs text-gray-400">Negative</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-400">{sentiment.neutralCount}</p>
                  <p className="text-xs text-gray-400">Neutral</p>
                </div>
              </div>
              {sentiment.insights && sentiment.insights.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-2">Key Insights:</p>
                  <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                    {sentiment.insights.map((insight, idx) => (
                      <li key={idx}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Hashtag & Topic Suggestions */}
          {suggestions && (
            <div className="bg-gray-750 rounded-lg p-4 border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-3">Suggested Hashtags & Topics</h4>
              <div className="space-y-4">
                {suggestions.hashtags && suggestions.hashtags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-300 mb-2">Hashtags:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.hashtags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm border border-blue-600/30"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {suggestions.topics && suggestions.topics.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-300 mb-2">Trending Topics:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.topics.map((topic, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm border border-purple-600/30"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {suggestions.themes && suggestions.themes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-300 mb-2">Content Themes:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.themes.map((theme, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-green-600/20 text-green-300 rounded-full text-sm border border-green-600/30"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content Strategy Suggestions */}
          {contentSuggestions && contentSuggestions.suggestions && (
            <div className="bg-gray-750 rounded-lg p-4 border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-3">Content Strategy Recommendations</h4>
              <div className="space-y-3">
                {contentSuggestions.suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded border ${
                      suggestion.priority === 'high'
                        ? 'bg-red-600/10 border-red-600/30'
                        : suggestion.priority === 'medium'
                        ? 'bg-yellow-600/10 border-yellow-600/30'
                        : 'bg-gray-700/50 border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-white">{suggestion.title}</p>
                        <p className="text-sm text-gray-400 mt-1">{suggestion.description}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          suggestion.priority === 'high'
                            ? 'bg-red-600/20 text-red-300'
                            : suggestion.priority === 'medium'
                            ? 'bg-yellow-600/20 text-yellow-300'
                            : 'bg-gray-600 text-gray-300'
                        }`}
                      >
                        {suggestion.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwitterAnalytics;
