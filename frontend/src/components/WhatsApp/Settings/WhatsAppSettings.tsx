import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Bell, Globe, Shield, Zap, AlertCircle } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';

const WhatsAppSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    notifications: {
      newMessage: true,
      campaignComplete: true,
      botTriggered: false,
      deliveryFailed: true,
    },
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    rateLimit: {
      enabled: true,
      messagesPerMinute: 20,
    },
    autoReply: {
      enabled: false,
      message: 'Thank you for your message. We will get back to you soon.',
    },
  });

  const { data: accountsData } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => whatsappApi.getAccounts(),
  });

  const accounts = (accountsData as any)?.data?.accounts || [];

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // In a real app, this would save to backend
      // For now, we'll just save to localStorage
      localStorage.setItem('whatsapp_settings', JSON.stringify(data));
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      alert('Settings saved successfully');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  React.useEffect(() => {
    // Load saved settings
    const saved = localStorage.getItem('whatsapp_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">WhatsApp Settings</h1>
        <p className="text-gray-400 text-sm mt-2">
          Configure general settings for your WhatsApp integration
        </p>
      </div>

      {/* Notifications */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications
        </h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
            <div>
              <p className="text-white font-medium">New Message</p>
              <p className="text-gray-400 text-sm">Get notified when you receive a new message</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.newMessage}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, newMessage: e.target.checked },
                })
              }
              className="w-5 h-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
            <div>
              <p className="text-white font-medium">Campaign Complete</p>
              <p className="text-gray-400 text-sm">Get notified when a campaign finishes sending</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.campaignComplete}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, campaignComplete: e.target.checked },
                })
              }
              className="w-5 h-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
            <div>
              <p className="text-white font-medium">Bot Triggered</p>
              <p className="text-gray-400 text-sm">Get notified when a bot is triggered</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.botTriggered}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, botTriggered: e.target.checked },
                })
              }
              className="w-5 h-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
            <div>
              <p className="text-white font-medium">Delivery Failed</p>
              <p className="text-gray-400 text-sm">Get notified when message delivery fails</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.deliveryFailed}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, deliveryFailed: e.target.checked },
                })
              }
              className="w-5 h-5 text-blue-600 rounded"
            />
          </label>
        </div>
      </div>

      {/* Regional Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Regional Settings
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
            <select
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[
                'America/New_York',
                'America/Chicago',
                'America/Denver',
                'America/Los_Angeles',
                'Europe/London',
                'Europe/Paris',
                'Europe/Berlin',
                'Asia/Tokyo',
                'Asia/Shanghai',
                'Asia/Dubai',
                'Australia/Sydney',
                'UTC',
              ].map((tz: string) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Rate Limiting */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Rate Limiting
        </h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
            <div>
              <p className="text-white font-medium">Enable Rate Limiting</p>
              <p className="text-gray-400 text-sm">
                Automatically throttle messages to avoid rate limits
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.rateLimit.enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  rateLimit: { ...settings.rateLimit, enabled: e.target.checked },
                })
              }
              className="w-5 h-5 text-blue-600 rounded"
            />
          </label>
          {settings.rateLimit.enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Messages Per Minute
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.rateLimit.messagesPerMinute}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rateLimit: {
                      ...settings.rateLimit,
                      messagesPerMinute: parseInt(e.target.value) || 20,
                    },
                  })
                }
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-gray-400 text-sm mt-2">
                WhatsApp allows up to 1000 messages per day per phone number
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Auto Reply */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Auto Reply
        </h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
            <div>
              <p className="text-white font-medium">Enable Auto Reply</p>
              <p className="text-gray-400 text-sm">
                Automatically reply to messages when no bot matches
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoReply.enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  autoReply: { ...settings.autoReply, enabled: e.target.checked },
                })
              }
              className="w-5 h-5 text-blue-600 rounded"
            />
          </label>
          {settings.autoReply.enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Auto Reply Message
              </label>
              <textarea
                value={settings.autoReply.message}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    autoReply: { ...settings.autoReply, message: e.target.value },
                  })
                }
                rows={3}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter auto reply message..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-semibold mb-1">Note</p>
            <p className="text-gray-300 text-sm">
              These settings are currently stored locally. In production, they should be saved to
              the backend and synced across devices.
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saveMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default WhatsAppSettings;
