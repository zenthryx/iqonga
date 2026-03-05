import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  ChartBarIcon, 
  ChatBubbleLeftRightIcon, 
  CogIcon,
  PlayIcon,
  PauseIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface EngagementSettings {
  autoReplyEnabled: boolean;
  replyFrequency: 'conservative' | 'moderate' | 'aggressive';
  minEngagementThreshold: number;
  maxRepliesPerDay: number;
  replyToMentions: boolean;
  replyToReplies: boolean;
}

interface EngagementAnalytics {
  analytics: any[];
  conversations: any[];
  recentEngagements: any[];
  summary: {
    totalEngagements: number;
    avgEngagementScore: number;
    highQualityRate: number;
  };
}

interface AgentEngagementDashboardProps {
  agentId: string;
  agentName: string;
}

export default function AgentEngagementDashboard({ agentId, agentName }: AgentEngagementDashboardProps) {
  const [settings, setSettings] = useState<EngagementSettings>({
    autoReplyEnabled: false,
    replyFrequency: 'moderate',
    minEngagementThreshold: 50,
    maxRepliesPerDay: 20,
    replyToMentions: true,
    replyToReplies: true
  });

  const [analytics, setAnalytics] = useState<EngagementAnalytics | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'analytics' | 'conversations' | 'test'>('settings');
  const [testTweet, setTestTweet] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  // Load current settings and analytics
  useEffect(() => {
    loadEngagementData();
  }, [agentId]);

  const loadEngagementData = async () => {
    try {
      setLoading(true);
      
      // Load current engagement settings
      const settingsResponse = await fetch(`/api/agents/${agentId}/engagement-settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        if (settingsData.success) {
          setSettings({
            autoReplyEnabled: settingsData.data.auto_reply_enabled || false,
            replyFrequency: settingsData.data.reply_frequency || 'moderate',
            minEngagementThreshold: settingsData.data.min_engagement_threshold || 50,
            maxRepliesPerDay: settingsData.data.max_replies_per_day || 20,
            replyToMentions: settingsData.data.reply_to_mentions !== false,
            replyToReplies: settingsData.data.reply_to_replies !== false
          });
        }
      } else {
        // Fallback to agent data if engagement settings endpoint doesn't exist yet
        const agentResponse = await fetch(`/api/agents/${agentId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        
        if (agentResponse.ok) {
          const agentData = await agentResponse.json();
          if (agentData.success) {
            setSettings({
              autoReplyEnabled: agentData.data.auto_reply_enabled || false,
              replyFrequency: agentData.data.reply_frequency || 'moderate',
              minEngagementThreshold: agentData.data.min_engagement_threshold || 50,
              maxRepliesPerDay: agentData.data.max_replies_per_day || 20,
              replyToMentions: agentData.data.reply_to_mentions !== false,
              replyToReplies: agentData.data.reply_to_replies !== false
            });
          }
        }
      }

      // Load analytics
      await loadAnalytics();
      
    } catch (error) {
      console.error('Failed to load engagement data:', error);
      toast.error('Failed to load engagement data');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/engagement-analytics?period=7d`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnalytics(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const updateSettings = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/agents/${agentId}/engagement-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success('Engagement settings updated successfully');
          // Reload all engagement data to reflect the saved state
          await loadEngagementData();
        }
      } else {
        toast.error('Failed to update settings');
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const testEngagement = async () => {
    if (!testTweet.trim()) {
      toast.error('Please enter a sample tweet to test');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/agents/${agentId}/test-engagement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ sampleTweet: testTweet })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTestResult(result.data);
          toast.success('Engagement test completed');
        }
      } else {
        toast.error('Failed to test engagement');
      }
    } catch (error) {
      console.error('Failed to test engagement:', error);
      toast.error('Failed to test engagement');
    } finally {
      setLoading(false);
    }
  };

  const pauseEngagement = async (duration: string, reason?: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/engagement-pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ pauseDuration: duration, reason })
      });

      if (response.ok) {
        toast.success('Agent engagement paused successfully');
        setSettings(prev => ({ ...prev, autoReplyEnabled: false }));
        await loadEngagementData();
      }
    } catch (error) {
      console.error('Failed to pause engagement:', error);
      toast.error('Failed to pause engagement');
    }
  };

  const resumeEngagement = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/engagement-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        toast.success('Agent engagement resumed successfully');
        setSettings(prev => ({ ...prev, autoReplyEnabled: true }));
        await loadEngagementData();
      }
    } catch (error) {
      console.error('Failed to resume engagement:', error);
      toast.error('Failed to resume engagement');
    }
  };

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">
          Engagement Controls
        </h3>
        
        {/* Auto-reply toggle */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg mb-6 border border-purple-100">
          <div>
            <h4 className="font-semibold text-gray-900 text-lg">Automatic Engagement</h4>
            <p className="text-sm text-gray-700 mt-1">
              Allow your agent to automatically reply to relevant tweets
            </p>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, autoReplyEnabled: !prev.autoReplyEnabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.autoReplyEnabled ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                settings.autoReplyEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Engagement settings */}
        {settings.autoReplyEnabled && (
          <div className="space-y-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Reply Frequency
              </label>
              <select 
                value={settings.replyFrequency}
                onChange={(e) => setSettings(prev => ({ ...prev, replyFrequency: e.target.value as any }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="conservative">Conservative (5-10 replies/day)</option>
                <option value="moderate">Moderate (10-20 replies/day)</option>
                <option value="aggressive">Aggressive (20-30 replies/day)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Minimum Engagement Threshold: {settings.minEngagementThreshold} likes
              </label>
              <input
                type="range"
                min="0"
                max="1000"
                value={settings.minEngagementThreshold}
                onChange={(e) => setSettings(prev => ({ ...prev, minEngagementThreshold: parseInt(e.target.value) }))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-2 font-medium">
                <span>Any tweet</span>
                <span>Viral tweets only</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Maximum Replies Per Day
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.maxRepliesPerDay}
                onChange={(e) => setSettings(prev => ({ ...prev, maxRepliesPerDay: parseInt(e.target.value) }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center p-2 bg-white rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  checked={settings.replyToMentions}
                  onChange={(e) => setSettings(prev => ({ ...prev, replyToMentions: e.target.checked }))}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                />
                <span className="ml-3 text-sm font-medium text-gray-800">Reply to mentions</span>
              </label>
              
              <label className="flex items-center p-2 bg-white rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  checked={settings.replyToReplies}
                  onChange={(e) => setSettings(prev => ({ ...prev, replyToReplies: e.target.checked }))}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                />
                <span className="ml-3 text-sm font-medium text-gray-800">Reply to replies on your tweets</span>
              </label>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <div className="space-x-3">
            {settings.autoReplyEnabled ? (
              <button
                onClick={() => pauseEngagement('1h', 'User requested pause')}
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2 font-medium shadow-sm"
              >
                <PauseIcon className="h-4 w-4" />
                Pause 1 Hour
              </button>
            ) : (
              <button
                onClick={resumeEngagement}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium shadow-sm"
              >
                <PlayIcon className="h-4 w-4" />
                Resume
              </button>
            )}
          </div>
          
          <button
            onClick={updateSettings}
            disabled={loading}
            className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {analytics ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Engagements</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.summary.totalEngagements}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ChartBarIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Engagement Score</p>
                  <p className="text-2xl font-bold text-gray-900">{(analytics.summary.avgEngagementScore * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <EyeIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">High Quality Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{(analytics.summary.highQualityRate * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent engagements */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Engagements</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {analytics.recentEngagements.map((engagement, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {engagement.engagement_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(engagement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Score: {(engagement.engagement_score * 100).toFixed(1)}%
                      </p>
                      {engagement.conversation_tone && (
                        <p className="text-xs text-gray-500 capitalize">
                          {engagement.conversation_tone}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      )}
    </div>
  );

  const renderTestTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">Test Engagement</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sample Tweet
            </label>
            <textarea
              value={testTweet}
              onChange={(e) => setTestTweet(e.target.value)}
              placeholder="Enter a sample tweet to test how your agent would respond..."
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 resize-none"
            />
          </div>

          <button
            onClick={testEngagement}
            disabled={loading || !testTweet.trim()}
            className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Testing...' : 'Test Engagement'}
          </button>
        </div>

        {/* Test results */}
        {testResult && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Test Results</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Should Engage:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  testResult.engagementDecision.shouldEngage 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {testResult.engagementDecision.shouldEngage ? 'Yes' : 'No'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Priority:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  testResult.engagementDecision.priority === 'high' ? 'bg-red-100 text-red-800' :
                  testResult.engagementDecision.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {testResult.engagementDecision.priority}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Reason:</span>
                <span className="text-sm text-gray-900">{testResult.engagementDecision.reason}</span>
              </div>
            </div>

            {testResult.sampleReply && (
              <div className="mt-4 p-3 bg-white rounded-lg border">
                <p className="text-sm font-medium text-gray-700 mb-2">Sample Reply:</p>
                <p className="text-sm text-gray-900 italic">"{testResult.sampleReply}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
          <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Agent Engagement Dashboard
          </h1>
          <p className="text-gray-700 mt-2 font-medium">
            Manage how {agentName} engages with the Twitter community
          </p>
        </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'settings', name: 'Settings', icon: CogIcon },
            { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
            { id: 'test', name: 'Test Engagement', icon: EyeIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'settings' && renderSettingsTab()}
      {activeTab === 'analytics' && renderAnalyticsTab()}
      {activeTab === 'test' && renderTestTab()}
    </div>
  );
}
