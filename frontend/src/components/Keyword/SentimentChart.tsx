import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Download, Calendar } from 'lucide-react';
import { keywordIntelligenceService, KeywordSnapshot } from '../../services/keywordIntelligenceService';
import { keywordIntelligenceWebSocket } from '../../services/keywordIntelligenceWebSocket';
import toast from 'react-hot-toast';

interface SentimentChartProps {
  monitorId: string;
}

const SentimentChart: React.FC<SentimentChartProps> = ({ monitorId }) => {
  const [snapshots, setSnapshots] = useState<KeywordSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  const applyDateFilters = (snapshots: KeywordSnapshot[]) => {
    let filtered = [...snapshots];
    
    if (dateRange !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch (dateRange) {
        case '7d':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoffDate.setDate(now.getDate() - 90);
          break;
      }
      
      filtered = filtered.filter(s => new Date(s.snapshot_time) >= cutoffDate);
    }
    
    if (showCustomRange && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => {
        const snapshotDate = new Date(s.snapshot_time);
        return snapshotDate >= start && snapshotDate <= end;
      });
    }
    
    return filtered;
  };

  useEffect(() => {
    loadSnapshots();
    
    // Subscribe to real-time updates for this monitor
    if (monitorId) {
      keywordIntelligenceWebSocket.subscribeToMonitor(monitorId);
      
      // Listen for snapshot updates
      const handleUpdate = (update: any) => {
        if (update.monitorId === monitorId && update.type === 'snapshot' && update.snapshot) {
          // Add new snapshot to the list
          setSnapshots(prev => {
            const newSnapshots = [update.snapshot, ...prev];
            // Apply filters
            return applyDateFilters(newSnapshots);
          });
        }
      };
      
      keywordIntelligenceWebSocket.on('monitor-update', handleUpdate);
      
      return () => {
        keywordIntelligenceWebSocket.off('monitor-update', handleUpdate);
        if (monitorId) {
          keywordIntelligenceWebSocket.unsubscribeFromMonitor(monitorId);
        }
      };
    }
  }, [monitorId, dateRange, customStartDate, customEndDate, showCustomRange]);

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      const response = await keywordIntelligenceService.getSnapshots(monitorId, 1000);
      if (response.data) {
        let snapshots = response.data.reverse(); // Reverse to show chronological order
        setSnapshots(applyDateFilters(snapshots));
      }
    } catch (error: any) {
      toast.error('Failed to load sentiment data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Sentiment Score', 'Mentions', 'Positive', 'Negative', 'Neutral', 'Total Likes', 'Total Retweets', 'Total Replies', 'Total Views', 'Engagement Rate'];
    const rows = snapshots.map(s => [
      new Date(s.snapshot_time).toLocaleString(),
      s.sentiment_score?.toString() || '0',
      s.mention_count?.toString() || '0',
      s.positive_count?.toString() || '0',
      s.negative_count?.toString() || '0',
      s.neutral_count?.toString() || '0',
      s.total_likes?.toString() || '0',
      s.total_retweets?.toString() || '0',
      s.total_replies?.toString() || '0',
      s.total_views?.toString() || '0',
      s.engagement_rate?.toFixed(2) || '0.00'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sentiment-data-${monitorId}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-400">No sentiment data available yet</p>
      </div>
    );
  }

  const chartData = snapshots.map((snapshot) => ({
    time: new Date(snapshot.snapshot_time).toLocaleString(),
    sentiment: snapshot.sentiment_score || 0,
    mentions: snapshot.mention_count || 0,
    positive: snapshot.positive_count || 0,
    negative: snapshot.negative_count || 0,
    neutral: snapshot.neutral_count || 0,
  }));

  const latestSnapshot = snapshots[snapshots.length - 1];
  const avgSentiment = snapshots.reduce((sum, s) => sum + (s.sentiment_score || 0), 0) / snapshots.length;
  const trend = latestSnapshot.sentiment_score > avgSentiment ? 'up' : latestSnapshot.sentiment_score < avgSentiment ? 'down' : 'stable';

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Sentiment Trends</h2>
          <div className="flex items-center gap-3">
            {/* Date Range Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => {
                  const value = e.target.value;
                  setDateRange(value as any);
                  if (value === 'custom') {
                    setShowCustomRange(true);
                  } else {
                    setShowCustomRange(false);
                  }
                }}
                className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
                <option value="custom">Custom range</option>
              </select>
            </div>
            
            {/* Custom Date Range */}
            {showCustomRange && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
                <button
                  onClick={() => {
                    setShowCustomRange(false);
                    setDateRange('30d');
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="px-2 py-1 text-gray-400 hover:text-white"
                  title="Cancel"
                >
                  ×
                </button>
              </div>
            )}
            
            {/* Export Button */}
            <button
              onClick={exportToCSV}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 flex items-center gap-2 transition-colors"
              title="Export to CSV"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Current Sentiment</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {latestSnapshot.sentiment_score?.toFixed(1) || '0.0'}
              </span>
              {trend === 'up' && <TrendingUp className="h-5 w-5 text-green-400" />}
              {trend === 'down' && <TrendingDown className="h-5 w-5 text-red-400" />}
              {trend === 'stable' && <Minus className="h-5 w-5 text-gray-400" />}
            </div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Total Mentions</div>
            <div className="text-2xl font-bold">{latestSnapshot.mention_count || 0}</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Engagement Rate</div>
            <div className="text-2xl font-bold">
              {latestSnapshot.engagement_rate?.toFixed(2) || '0.00'}%
            </div>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="time" 
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6'
            }}
          />
          <Legend 
            wrapperStyle={{ color: '#9CA3AF' }}
          />
          <Line 
            type="monotone" 
            dataKey="sentiment" 
            stroke="#3B82F6" 
            strokeWidth={2}
            name="Sentiment Score"
            dot={{ fill: '#3B82F6', r: 3 }}
          />
          <Line 
            type="monotone" 
            dataKey="mentions" 
            stroke="#10B981" 
            strokeWidth={2}
            name="Mentions"
            dot={{ fill: '#10B981', r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Sentiment Breakdown */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="text-sm text-green-400 mb-1">Positive</div>
          <div className="text-2xl font-bold text-green-400">
            {latestSnapshot.positive_count || 0}
          </div>
        </div>
        <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Neutral</div>
          <div className="text-2xl font-bold text-gray-400">
            {latestSnapshot.neutral_count || 0}
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="text-sm text-red-400 mb-1">Negative</div>
          <div className="text-2xl font-bold text-red-400">
            {latestSnapshot.negative_count || 0}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentimentChart;

