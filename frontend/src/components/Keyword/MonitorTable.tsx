import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Hash, 
  Tag,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Filter,
  X,
  CheckSquare,
  Square,
  Search
} from 'lucide-react';
import { KeywordMonitor } from '../../services/keywordIntelligenceService';

interface MonitorTableProps {
  monitors: KeywordMonitor[];
  onToggle: (monitor: KeywordMonitor) => void;
  onDelete: (id: string) => void;
  onEdit?: (monitor: KeywordMonitor) => void;
  onSelect: (monitor: KeywordMonitor) => void;
  onBulkToggle?: (ids: string[], activate: boolean) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const MonitorTable: React.FC<MonitorTableProps> = ({ 
  monitors, 
  onToggle, 
  onDelete,
  onEdit,
  onSelect,
  onBulkToggle,
  onBulkDelete
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'keyword' | 'hashtag'>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedMonitors, setSelectedMonitors] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Filter and search monitors
  const filteredMonitors = useMemo(() => {
    return monitors.filter(monitor => {
      const matchesSearch = !searchQuery || 
        monitor.keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
        monitor.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = filterType === 'all' || monitor.monitor_type === filterType;
      const matchesPlatform = filterPlatform === 'all' || monitor.platform === filterPlatform;
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && monitor.is_active) ||
        (filterStatus === 'inactive' && !monitor.is_active);

      return matchesSearch && matchesType && matchesPlatform && matchesStatus;
    });
  }, [monitors, searchQuery, filterType, filterPlatform, filterStatus]);

  const platforms = useMemo(() => {
    const unique = new Set(monitors.map(m => m.platform));
    return Array.from(unique);
  }, [monitors]);

  const handleSelectAll = () => {
    if (selectedMonitors.size === filteredMonitors.length) {
      setSelectedMonitors(new Set());
    } else {
      setSelectedMonitors(new Set(filteredMonitors.map(m => m.id)));
    }
  };

  const handleSelectMonitor = (id: string) => {
    const newSelected = new Set(selectedMonitors);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMonitors(newSelected);
  };

  const handleBulkActivate = () => {
    if (onBulkToggle && selectedMonitors.size > 0) {
      onBulkToggle(Array.from(selectedMonitors), true);
      setSelectedMonitors(new Set());
    }
  };

  const handleBulkDeactivate = () => {
    if (onBulkToggle && selectedMonitors.size > 0) {
      onBulkToggle(Array.from(selectedMonitors), false);
      setSelectedMonitors(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedMonitors.size > 0) {
      if (confirm(`Are you sure you want to delete ${selectedMonitors.size} monitor(s)?`)) {
        onBulkDelete(Array.from(selectedMonitors));
        setSelectedMonitors(new Set());
      }
    }
  };

  const exportToCSV = () => {
    const headers = ['Keyword', 'Type', 'Platform', 'Status', 'Frequency', 'Sentiment Threshold', 'Mention Spike Threshold', 'Tags', 'Created At'];
    const rows = filteredMonitors.map(m => [
      m.keyword,
      m.monitor_type,
      m.platform,
      m.is_active ? 'Active' : 'Inactive',
      m.monitoring_frequency,
      m.sentiment_threshold?.toString() || '',
      m.mention_spike_threshold?.toString() || '',
      m.tags?.join('; ') || '',
      new Date(m.created_at).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `keyword-monitors-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (monitors.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-12 text-center">
        <Hash className="h-16 w-16 mx-auto mb-4 text-gray-600" />
        <h3 className="text-xl font-semibold mb-2">No Monitors Yet</h3>
        <p className="text-gray-400 mb-4">Create your first keyword or hashtag monitor to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search keywords, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              showFilters 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>

          {/* Export */}
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2 text-gray-300"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>

          {/* Bulk Actions */}
          {selectedMonitors.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">{selectedMonitors.size} selected</span>
              <button
                onClick={handleBulkActivate}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm text-white"
              >
                Activate
              </button>
              <button
                onClick={handleBulkDeactivate}
                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded text-sm text-white"
              >
                Deactivate
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm text-white"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value="all">All Types</option>
                <option value="keyword">Keyword</option>
                <option value="hashtag">Hashtag</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Platform</label>
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value="all">All Platforms</option>
                {platforms.map(platform => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-400">
        Showing {filteredMonitors.length} of {monitors.length} monitors
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-12">
                {filteredMonitors.length > 0 && (
                  <button onClick={handleSelectAll} className="p-1">
                    {selectedMonitors.size === filteredMonitors.length ? (
                      <CheckSquare className="h-4 w-4 text-blue-400" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Keyword/Hashtag
              </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Platform
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Frequency
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {filteredMonitors.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                No monitors match your filters
              </td>
            </tr>
          ) : (
            filteredMonitors.map((monitor) => {
              const isSelected = selectedMonitors.has(monitor.id);
              return (
              <tr
                key={monitor.id}
                className={`hover:bg-gray-700 ${isSelected ? 'bg-blue-500/10' : ''}`}
              >
                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleSelectMonitor(monitor.id)} className="p-1">
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-blue-400" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap cursor-pointer"
                  onClick={() => onSelect(monitor)}
                >
                <div className="flex items-center gap-2">
                  {monitor.monitor_type === 'hashtag' ? (
                    <Hash className="h-4 w-4 text-blue-400" />
                  ) : (
                    <Tag className="h-4 w-4 text-green-400" />
                  )}
                  <span className="text-sm font-medium text-white">{monitor.keyword}</span>
                </div>
                {monitor.tags && monitor.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {monitor.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs rounded ${
                  monitor.monitor_type === 'hashtag'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {monitor.monitor_type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 capitalize">
                {monitor.platform}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs rounded ${
                  monitor.is_active
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {monitor.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {monitor.monitoring_frequency}
              </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(monitor)}
                        className="p-2 rounded text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onToggle(monitor)}
                      className={`p-2 rounded transition-colors ${
                        monitor.is_active
                          ? 'text-yellow-400 hover:bg-yellow-500/10'
                          : 'text-green-400 hover:bg-green-500/10'
                      }`}
                      title={monitor.is_active ? 'Pause' : 'Resume'}
                    >
                      {monitor.is_active ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => onDelete(monitor.id)}
                      className="p-2 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default MonitorTable;

