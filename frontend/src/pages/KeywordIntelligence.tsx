import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  TrendingUp, 
  AlertCircle, 
  BarChart3, 
  Hash,
  Tag,
  Filter,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { keywordIntelligenceService, KeywordMonitor, KeywordAlert } from '../services/keywordIntelligenceService';
import MonitorTable from '../components/Keyword/MonitorTable';
import CreateMonitorModal from '../components/Keyword/CreateMonitorModal';
import AlertsList from '../components/Keyword/AlertsList';
import ResearchTool from '../components/Keyword/ResearchTool';
import SentimentChart from '../components/Keyword/SentimentChart';
import UsageSummaryCard from '../components/Keyword/UsageSummaryCard';
import CollectionsManager from '../components/Keyword/CollectionsManager';
import { keywordIntelligenceWebSocket, MonitorUpdate, AlertUpdate } from '../services/keywordIntelligenceWebSocket';

const KeywordIntelligence: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'monitors' | 'research' | 'alerts' | 'analytics' | 'collections'>('monitors');
  const [monitors, setMonitors] = useState<KeywordMonitor[]>([]);
  const [alerts, setAlerts] = useState<KeywordAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<KeywordMonitor | null>(null);
  const [selectedMonitor, setSelectedMonitor] = useState<KeywordMonitor | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    loadData();
    
    // Setup WebSocket connection
    keywordIntelligenceWebSocket.connect();
    
    // Subscribe to WebSocket events
    keywordIntelligenceWebSocket.on('connected', () => {
      setWsConnected(true);
      console.log('[Keyword Intelligence] WebSocket connected');
    });
    
    keywordIntelligenceWebSocket.on('disconnected', () => {
      setWsConnected(false);
      console.log('[Keyword Intelligence] WebSocket disconnected');
    });
    
    keywordIntelligenceWebSocket.on('monitor-update', (update: MonitorUpdate) => {
      handleMonitorUpdate(update);
    });
    
    keywordIntelligenceWebSocket.on('alert', (alert: AlertUpdate) => {
      handleNewAlert(alert);
    });
    
    // Subscribe to all user monitors
    if (monitors.length > 0) {
      monitors.forEach(monitor => {
        keywordIntelligenceWebSocket.subscribeToMonitor(monitor.id);
      });
    }
    
    // Cleanup on unmount
    return () => {
      keywordIntelligenceWebSocket.off('connected', () => {});
      keywordIntelligenceWebSocket.off('disconnected', () => {});
      keywordIntelligenceWebSocket.off('monitor-update', handleMonitorUpdate);
      keywordIntelligenceWebSocket.off('alert', handleNewAlert);
      keywordIntelligenceWebSocket.disconnect();
    };
  }, [activeTab]);

  // Subscribe to monitors when they change
  useEffect(() => {
    if (keywordIntelligenceWebSocket.connected && monitors.length > 0) {
      monitors.forEach(monitor => {
        keywordIntelligenceWebSocket.subscribeToMonitor(monitor.id);
      });
    }
  }, [monitors.length]);

  const handleMonitorUpdate = (update: MonitorUpdate) => {
    if (update.type === 'snapshot' && update.snapshot) {
      // Update monitor with new snapshot data
      setMonitors(prev => prev.map(m => 
        m.id === update.monitorId 
          ? { ...m, last_snapshot: update.snapshot }
          : m
      ));
      
      // If this is the selected monitor, trigger chart refresh
      if (selectedMonitor?.id === update.monitorId) {
        // Chart will auto-refresh via its useEffect
      }
    } else if (update.type === 'status-change') {
      setMonitors(prev => prev.map(m => 
        m.id === update.monitorId 
          ? { ...m, is_active: update.isActive || false }
          : m
      ));
    }
  };

  const handleNewAlert = (alert: AlertUpdate) => {
    // Add new alert to the list
    setAlerts(prev => [alert as any, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show toast notification
    toast.success(`New alert: ${alert.title}`, {
      icon: '🔔',
      duration: 5000,
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'monitors') {
        const response = await keywordIntelligenceService.getMonitors();
        if (response.data) {
          setMonitors(response.data);
        }
      } else if (activeTab === 'alerts') {
        const [alertsRes, countRes] = await Promise.all([
          keywordIntelligenceService.getAlerts(),
          keywordIntelligenceService.getUnreadAlertsCount(),
        ]);
        if (alertsRes.data) setAlerts(alertsRes.data);
        if (countRes.data) setUnreadCount(countRes.data.count);
      }
    } catch (error: any) {
      toast.error('Failed to load data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMonitor = async (data: Partial<KeywordMonitor>) => {
    try {
      const response = await keywordIntelligenceService.createMonitor(data);
      if (response.data) {
        toast.success('Monitor created successfully!');
        setShowCreateModal(false);
        loadData();
      }
    } catch (error: any) {
      toast.error('Failed to create monitor: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEditMonitor = (monitor: KeywordMonitor) => {
    setEditingMonitor(monitor);
    setShowCreateModal(true);
  };

  const handleUpdateMonitor = async (data: Partial<KeywordMonitor>) => {
    if (!editingMonitor) return;
    try {
      const response = await keywordIntelligenceService.updateMonitor(editingMonitor.id, data);
      if (response.data) {
        toast.success('Monitor updated successfully!');
        setShowCreateModal(false);
        setEditingMonitor(null);
        loadData();
      }
    } catch (error: any) {
      toast.error('Failed to update monitor: ' + (error.message || 'Unknown error'));
    }
  };

  const handleToggleMonitor = async (monitor: KeywordMonitor) => {
    try {
      if (monitor.is_active) {
        await keywordIntelligenceService.deactivateMonitor(monitor.id);
      } else {
        await keywordIntelligenceService.activateMonitor(monitor.id);
      }
      toast.success(`Monitor ${monitor.is_active ? 'deactivated' : 'activated'}`);
      loadData();
    } catch (error: any) {
      toast.error('Failed to update monitor: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteMonitor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this monitor?')) return;
    try {
      await keywordIntelligenceService.deleteMonitor(id);
      toast.success('Monitor deleted successfully');
      loadData();
    } catch (error: any) {
      toast.error('Failed to delete monitor: ' + (error.message || 'Unknown error'));
    }
  };

  const handleBulkToggle = async (ids: string[], activate: boolean) => {
    try {
      const promises = ids.map(id => 
        activate 
          ? keywordIntelligenceService.activateMonitor(id)
          : keywordIntelligenceService.deactivateMonitor(id)
      );
      await Promise.all(promises);
      toast.success(`${activate ? 'Activated' : 'Deactivated'} ${ids.length} monitor(s)`);
      loadData();
    } catch (error: any) {
      toast.error('Failed to update monitors: ' + (error.message || 'Unknown error'));
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      const promises = ids.map(id => keywordIntelligenceService.deleteMonitor(id));
      await Promise.all(promises);
      toast.success(`Deleted ${ids.length} monitor(s)`);
      loadData();
    } catch (error: any) {
      toast.error('Failed to delete monitors: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Hash className="h-8 w-8 text-blue-500" />
                Keyword & Hashtag Intelligence
              </h1>
              <p className="text-gray-400 mt-2">
                Monitor keywords and hashtags, track sentiment, and discover trends
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-gray-500'}`} title={wsConnected ? 'Real-time connected' : 'Real-time disconnected'} />
                <span className="text-xs text-gray-400">{wsConnected ? 'Live' : 'Offline'}</span>
              </div>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              {activeTab === 'monitors' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Monitor
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('monitors')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'monitors'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Monitors
                {monitors.length > 0 && (
                  <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">
                    {monitors.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('research')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'research'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Research
              </div>
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-4 py-2 font-medium transition-colors relative ${
                activeTab === 'alerts'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Alerts
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
                    {unreadCount}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </div>
            </button>
            <button
              onClick={() => setActiveTab('collections')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'collections'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Collections
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'monitors' && (
              <div className="space-y-6">
                <UsageSummaryCard />
                <MonitorTable
                  monitors={monitors}
                  onToggle={handleToggleMonitor}
                  onDelete={handleDeleteMonitor}
                  onEdit={handleEditMonitor}
                  onSelect={setSelectedMonitor}
                  onBulkToggle={handleBulkToggle}
                  onBulkDelete={handleBulkDelete}
                />
              </div>
            )}
            {activeTab === 'research' && <ResearchTool />}
            {activeTab === 'alerts' && (
              <AlertsList
                alerts={alerts}
                onMarkRead={async (id) => {
                  await keywordIntelligenceService.markAlertAsRead(id);
                  loadData();
                }}
              />
            )}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {selectedMonitor ? (
                  <>
                    <SentimentChart monitorId={selectedMonitor.id} />
                    <UsageSummaryCard />
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a monitor to view analytics</p>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'collections' && (
              <CollectionsManager
                monitors={monitors}
                onMonitorUpdate={loadData}
              />
            )}
          </>
        )}
      </div>

      {/* Create/Edit Monitor Modal */}
      {showCreateModal && (
        <CreateMonitorModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingMonitor(null);
          }}
          onSubmit={editingMonitor ? handleUpdateMonitor : handleCreateMonitor}
          initialData={editingMonitor || undefined}
        />
      )}
    </div>
  );
};

export default KeywordIntelligence;

