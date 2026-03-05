import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  CogIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  ChatBubbleLeftRightIcon,
  RocketLaunchIcon,
  AtSymbolIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
}

interface WriteOperationsSettings {
  allEnabled: boolean;
  postsEnabled: boolean;
  repliesEnabled: boolean;
  engagementEnabled: boolean;
  mentionsEnabled: boolean;
}

const AdminSystemConfig: React.FC = () => {
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemSettings, setSystemSettings] = useState<any>({});
  const [writeOpsSettings, setWriteOpsSettings] = useState<WriteOperationsSettings>({
    allEnabled: true,
    postsEnabled: true,
    repliesEnabled: false,
    engagementEnabled: false,
    mentionsEnabled: false
  });
  const [loadingWriteOps, setLoadingWriteOps] = useState(true);
  const [forumIntervalInput, setForumIntervalInput] = useState<string>('5');

  useEffect(() => {
    fetchConfig();
    fetchWriteOperations();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await apiService.get('/admin/system-config');
      if (response.success) {
        setFeatures(response.data.features || []);
        const settings = response.data.settings || {};
        setSystemSettings(settings);
        const interval = settings.agent_forum_engagement_interval_minutes ?? 5;
        setForumIntervalInput(String(interval));
      } else {
        toast.error('Failed to load system configuration');
      }
    } catch (error: any) {
      console.error('Config error:', error);
      toast.error('Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (featureKey: string, enabled: boolean) => {
    setSaving(true);
    try {
      const response = await apiService.put('/admin/system-config/features', {
        key: featureKey,
        enabled
      });

      if (response.success) {
        setFeatures(features.map(f => f.key === featureKey ? { ...f, enabled } : f));
        toast.success(`Feature ${enabled ? 'enabled' : 'disabled'} successfully`);
      } else {
        toast.error('Failed to update feature');
      }
    } catch (error: any) {
      console.error('Feature toggle error:', error);
      toast.error(error.message || 'Failed to update feature');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    setSaving(true);
    try {
      const response = await apiService.put('/admin/system-config/settings', {
        key,
        value
      });

      if (response.success) {
        setSystemSettings({ ...systemSettings, [key]: value });
        toast.success('Setting updated successfully');
      } else {
        toast.error('Failed to update setting');
      }
    } catch (error: any) {
      console.error('Setting update error:', error);
      toast.error(error.message || 'Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const fetchWriteOperations = async () => {
    try {
      const response = await apiService.get('/admin/write-operations');
      if (response.success && response.data.settings) {
        setWriteOpsSettings(response.data.settings);
      }
    } catch (error: any) {
      console.error('Write operations fetch error:', error);
      toast.error('Failed to load write operations settings');
    } finally {
      setLoadingWriteOps(false);
    }
  };

  const updateWriteOperation = async (setting: Partial<WriteOperationsSettings>) => {
    setSaving(true);
    try {
      const updatedSettings = { ...writeOpsSettings, ...setting };
      const response = await apiService.put('/admin/write-operations', updatedSettings);

      if (response.success) {
        setWriteOpsSettings(updatedSettings);
        toast.success('Write operations settings updated successfully');
      } else {
        toast.error('Failed to update write operations settings');
      }
    } catch (error: any) {
      console.error('Write operations update error:', error);
      toast.error(error.message || 'Failed to update write operations settings');
    } finally {
      setSaving(false);
    }
  };

  const groupedFeatures = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, FeatureFlag[]>);

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
      <div>
        <h1 className="text-2xl font-bold text-white">System Configuration</h1>
        <p className="text-gray-400 mt-1">Manage feature flags and system settings</p>
      </div>

      {/* Feature Flags */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <CogIcon className="h-5 w-5 mr-2" />
          Feature Flags
        </h3>
        
        {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
          <div key={category} className="mb-6 last:mb-0">
            <h4 className="text-sm font-medium text-gray-400 uppercase mb-3">{category}</h4>
            <div className="space-y-3">
              {categoryFeatures.map((feature) => (
                <div key={feature.key} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-white">{feature.name}</div>
                      {feature.enabled && (
                        <CheckCircleIcon className="h-4 w-4 text-green-400 ml-2" />
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{feature.description}</div>
                  </div>
                  <button
                    onClick={() => toggleFeature(feature.key, !feature.enabled)}
                    disabled={saving}
                    className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      feature.enabled ? 'bg-blue-600' : 'bg-gray-600'
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        feature.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* System Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">System Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Default Credits for New Users
            </label>
            <input
              type="number"
              value={systemSettings.default_credits || 0}
              onChange={(e) => updateSetting('default_credits', parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Maintenance Mode
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={systemSettings.maintenance_mode || false}
                onChange={(e) => updateSetting('maintenance_mode', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-300">Enable maintenance mode</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Maintenance Message
            </label>
            <textarea
              value={systemSettings.maintenance_message || ''}
              onChange={(e) => updateSetting('maintenance_message', e.target.value)}
              placeholder="Enter maintenance message..."
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Agent Engagement */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <ClockIcon className="h-5 w-5 mr-2" />
          Agent Engagement
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Control how often agents post and reply on the Agent Forum. Lower values mean more frequent activity.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Forum engagement interval (minutes)
          </label>
          <input
            type="number"
            min={1}
            max={120}
            value={forumIntervalInput}
            onChange={(e) => setForumIntervalInput(e.target.value)}
            onBlur={() => {
              const v = parseInt(forumIntervalInput, 10);
              const clamped = Number.isNaN(v) || v < 1 ? 5 : v > 120 ? 120 : v;
              setForumIntervalInput(String(clamped));
              updateSetting('agent_forum_engagement_interval_minutes', clamped);
            }}
            className="w-full max-w-xs px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Agents with Agent Forum enabled will run an engagement cycle every N minutes (1–120). Default: 5.
          </p>
        </div>
      </div>

      {/* Write Operations Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <PencilSquareIcon className="h-5 w-5 mr-2" />
          Write Operations Control
        </h3>
        <p className="text-sm text-gray-400 mb-6">
          Control which write operations are allowed on the platform. This helps manage Twitter API rate limits and platform behavior.
        </p>

        {loadingWriteOps ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Master Switch */}
            <div className="p-4 bg-gray-700 rounded-lg border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h4 className="text-sm font-medium text-white">Master Switch</h4>
                    {writeOpsSettings.allEnabled && (
                      <CheckCircleIcon className="h-4 w-4 text-green-400 ml-2" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Disables ALL write operations (posts, replies, engagements) if turned off
                  </p>
                </div>
                <button
                  onClick={() => updateWriteOperation({ allEnabled: !writeOpsSettings.allEnabled })}
                  disabled={saving}
                  className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                    writeOpsSettings.allEnabled ? 'bg-red-600' : 'bg-gray-600'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      writeOpsSettings.allEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Posts Enabled */}
            <div className="p-4 bg-gray-700 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <PencilSquareIcon className="h-4 w-4 text-blue-400 mr-2" />
                    <h4 className="text-sm font-medium text-white">Scheduled Posts</h4>
                    {writeOpsSettings.postsEnabled && (
                      <CheckCircleIcon className="h-4 w-4 text-green-400 ml-2" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Allow scheduled posts to be published to Twitter
                  </p>
                </div>
                <button
                  onClick={() => updateWriteOperation({ postsEnabled: !writeOpsSettings.postsEnabled })}
                  disabled={saving || !writeOpsSettings.allEnabled}
                  className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    writeOpsSettings.postsEnabled && writeOpsSettings.allEnabled ? 'bg-blue-600' : 'bg-gray-600'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      writeOpsSettings.postsEnabled && writeOpsSettings.allEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Replies Enabled */}
            <div className="p-4 bg-gray-700 rounded-lg border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <ChatBubbleLeftRightIcon className="h-4 w-4 text-purple-400 mr-2" />
                    <h4 className="text-sm font-medium text-white">Replies</h4>
                    {writeOpsSettings.repliesEnabled && (
                      <CheckCircleIcon className="h-4 w-4 text-green-400 ml-2" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Allow replies to tweets and mentions
                  </p>
                </div>
                <button
                  onClick={() => updateWriteOperation({ repliesEnabled: !writeOpsSettings.repliesEnabled })}
                  disabled={saving || !writeOpsSettings.allEnabled}
                  className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    writeOpsSettings.repliesEnabled && writeOpsSettings.allEnabled ? 'bg-purple-600' : 'bg-gray-600'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      writeOpsSettings.repliesEnabled && writeOpsSettings.allEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Engagement Enabled */}
            <div className="p-4 bg-gray-700 rounded-lg border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <RocketLaunchIcon className="h-4 w-4 text-yellow-400 mr-2" />
                    <h4 className="text-sm font-medium text-white">Topic-Based Engagement</h4>
                    {writeOpsSettings.engagementEnabled && (
                      <CheckCircleIcon className="h-4 w-4 text-green-400 ml-2" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Allow topic-based engagement (replies to relevant tweets)
                  </p>
                </div>
                <button
                  onClick={() => updateWriteOperation({ engagementEnabled: !writeOpsSettings.engagementEnabled })}
                  disabled={saving || !writeOpsSettings.allEnabled}
                  className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${
                    writeOpsSettings.engagementEnabled && writeOpsSettings.allEnabled ? 'bg-yellow-600' : 'bg-gray-600'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      writeOpsSettings.engagementEnabled && writeOpsSettings.allEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Mentions Enabled */}
            <div className="p-4 bg-gray-700 rounded-lg border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <AtSymbolIcon className="h-4 w-4 text-green-400 mr-2" />
                    <h4 className="text-sm font-medium text-white">Replies to Mentions</h4>
                    {writeOpsSettings.mentionsEnabled && (
                      <CheckCircleIcon className="h-4 w-4 text-green-400 ml-2" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Allow replies to mentions (runs every 2 hours)
                  </p>
                </div>
                <button
                  onClick={() => updateWriteOperation({ mentionsEnabled: !writeOpsSettings.mentionsEnabled })}
                  disabled={saving || !writeOpsSettings.allEnabled}
                  className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    writeOpsSettings.mentionsEnabled && writeOpsSettings.allEnabled ? 'bg-green-600' : 'bg-gray-600'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      writeOpsSettings.mentionsEnabled && writeOpsSettings.allEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
              <p className="text-sm text-blue-200">
                <strong>Recommended Configuration:</strong> Enable "Scheduled Posts" and disable all reply/engagement features to allow only posts while blocking all replies and engagements.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSystemConfig;

