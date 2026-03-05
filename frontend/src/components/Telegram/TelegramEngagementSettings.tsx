import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import TelegramBrandingPreview from './TelegramBrandingPreview';

interface EngagementSettings {
  mention_settings: {
    enabled: boolean;
    maxResponsesPerHour: number;
  };
  reply_settings: {
    enabled: boolean;
    maxResponsesPerHour: number;
  };
  keyword_settings: {
    enabled: boolean;
    maxResponsesPerHour: number;
  };
  auto_reply_enabled: boolean;
  response_delay_seconds: number;
  [key: string]: any; // Add index signature for dynamic property access
}

interface KeywordTrigger {
  id: string;
  keyword: string;
  response_type: string;
  created_at: string;
}

interface TelegramEngagementSettingsProps {
  agentId: string;
  agentName: string;
  onClose: () => void;
}

interface Agent {
  id: string;
  name: string;
  personality_type: string;
  description: string;
  avatar_url?: string;
}

const TelegramEngagementSettings: React.FC<TelegramEngagementSettingsProps> = ({
  agentId,
  agentName,
  onClose
}) => {
  const [settings, setSettings] = useState<EngagementSettings>({
    mention_settings: { enabled: true, maxResponsesPerHour: 5 },
    reply_settings: { enabled: true, maxResponsesPerHour: 10 },
    keyword_settings: { enabled: false, maxResponsesPerHour: 3 },
    auto_reply_enabled: true,
    response_delay_seconds: 30
  });

  const [keywordTriggers, setKeywordTriggers] = useState<KeywordTrigger[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'keywords'>('settings');
  const [showBrandingPreview, setShowBrandingPreview] = useState(false);
  const [agentInfo, setAgentInfo] = useState<Agent | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchKeywordTriggers();
  }, [agentId]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/telegram-engagement/settings/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
        if (data.agent) {
          setAgentInfo(data.agent);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchKeywordTriggers = async () => {
    try {
      const response = await fetch(`/api/telegram-engagement/triggers/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setKeywordTriggers(data.triggers || []);
      }
    } catch (error) {
      console.error('Error fetching keyword triggers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/telegram-engagement/settings/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast.success('Engagement settings saved successfully!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const addKeywordTrigger = async () => {
    if (!newKeyword.trim()) {
      toast.error('Please enter a keyword');
      return;
    }

    try {
      const response = await fetch(`/api/telegram-engagement/triggers/${agentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ keyword: newKeyword.trim() })
      });

      if (response.ok) {
        toast.success('Keyword trigger added successfully!');
        setNewKeyword('');
        fetchKeywordTriggers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add keyword trigger');
      }
    } catch (error) {
      console.error('Error adding keyword trigger:', error);
      toast.error('Failed to add keyword trigger');
    }
  };

  const deleteKeywordTrigger = async (triggerId: string) => {
    try {
      const response = await fetch(`/api/telegram-engagement/triggers/${triggerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        toast.success('Keyword trigger deleted successfully!');
        fetchKeywordTriggers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete keyword trigger');
      }
    } catch (error) {
      console.error('Error deleting keyword trigger:', error);
      toast.error('Failed to delete keyword trigger');
    }
  };

  const updateSetting = (path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev } as any;
      const keys = path.split('.');
      let current: any = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings as EngagementSettings;
    });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            <span className="ml-3 text-gray-300">Loading engagement settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Telegram Engagement Settings</h2>
              <p className="text-gray-300">Configure how {agentName} responds to Telegram interactions</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Response Settings
            </button>
            <button
              onClick={() => setActiveTab('keywords')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'keywords'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Keyword Triggers
            </button>
            <button
              onClick={() => setShowBrandingPreview(true)}
              className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Branding Preview
            </button>
          </div>

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Auto Reply Toggle */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-white">Auto Reply</h3>
                    <p className="text-gray-300 text-sm">Enable automatic responses to mentions and replies</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.auto_reply_enabled}
                      onChange={(e) => updateSetting('auto_reply_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Response Delay */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Response Delay (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={settings.response_delay_seconds}
                  onChange={(e) => updateSetting('response_delay_seconds', parseInt(e.target.value))}
                  className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-gray-400 text-sm mt-1">Delay before sending responses to avoid appearing too eager</p>
              </div>

              {/* Mention Settings */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">Mention Responses</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.mention_settings.enabled}
                      onChange={(e) => updateSetting('mention_settings.enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Responses Per Hour
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={settings.mention_settings.maxResponsesPerHour}
                      onChange={(e) => updateSetting('mention_settings.maxResponsesPerHour', parseInt(e.target.value))}
                      className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-2">Respond when the bot is mentioned (@botname)</p>
              </div>

              {/* Reply Settings */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">Reply Responses</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.reply_settings.enabled}
                      onChange={(e) => updateSetting('reply_settings.enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Responses Per Hour
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={settings.reply_settings.maxResponsesPerHour}
                      onChange={(e) => updateSetting('reply_settings.maxResponsesPerHour', parseInt(e.target.value))}
                      className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-2">Respond when someone replies to the bot's messages</p>
              </div>

              {/* Keyword Settings */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">Keyword Responses</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.keyword_settings.enabled}
                      onChange={(e) => updateSetting('keyword_settings.enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Responses Per Hour
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={settings.keyword_settings.maxResponsesPerHour}
                      onChange={(e) => updateSetting('keyword_settings.maxResponsesPerHour', parseInt(e.target.value))}
                      className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-2">Respond when specific keywords are mentioned in messages</p>
              </div>
            </div>
          )}

          {activeTab === 'keywords' && (
            <div className="space-y-6">
              {/* Add New Keyword */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-4">Add Keyword Trigger</h3>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Enter keyword (e.g., 'help', 'price', 'support')"
                    className="flex-1 p-3 bg-gray-600 border border-gray-500 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && addKeywordTrigger()}
                  />
                  <button
                    onClick={addKeywordTrigger}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Keyword
                  </button>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  When this keyword is mentioned in any message, {agentName} will automatically respond
                </p>
              </div>

              {/* Existing Keywords */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-4">Active Keyword Triggers</h3>
                {keywordTriggers.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No keyword triggers configured</p>
                ) : (
                  <div className="space-y-2">
                    {keywordTriggers.map((trigger) => (
                      <div key={trigger.id} className="flex items-center justify-between bg-gray-600 p-3 rounded-lg">
                        <div>
                          <span className="text-white font-medium">"{trigger.keyword}"</span>
                          <span className="text-gray-400 text-sm ml-2">({trigger.response_type})</span>
                        </div>
                        <button
                          onClick={() => deleteKeywordTrigger(trigger.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end space-x-3 mt-8">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Branding Preview Modal */}
      {showBrandingPreview && agentInfo && (
        <TelegramBrandingPreview
          agent={agentInfo}
          onClose={() => setShowBrandingPreview(false)}
        />
      )}
    </div>
  );
};

export default TelegramEngagementSettings;
