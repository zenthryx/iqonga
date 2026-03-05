import React, { useState, useEffect } from 'react';
import { Bell, Clock, Calendar as CalendarIcon, Mail, Loader2, X, Check } from 'lucide-react';

interface ReminderSettingsProps {
  onClose: () => void;
}

interface ReminderPreferences {
  enable_pre_meeting_reminders: boolean;
  reminder_minutes_before: number;
  enable_daily_digest: boolean;
  daily_digest_time: string;
  enable_weekly_preview: boolean;
  weekly_preview_day: number;
  weekly_preview_time: string;
  include_ai_insights: boolean;
}

const ReminderSettings: React.FC<ReminderSettingsProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<ReminderPreferences>({
    enable_pre_meeting_reminders: true,
    reminder_minutes_before: 30,
    enable_daily_digest: true,
    daily_digest_time: '08:00:00',
    enable_weekly_preview: true,
    weekly_preview_day: 0,
    weekly_preview_time: '18:00:00',
    include_ai_insights: true
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/reminder-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setPreferences(data.preferences);
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch('/api/reminder-settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        alert('✅ Reminder settings saved successfully!');
        onClose();
      } else {
        alert('❌ Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('❌ Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-900 border border-white/20 rounded-lg p-8">
          <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto" />
          <p className="text-white mt-4">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-white/20 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-t-lg sticky top-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-6 w-6 text-white" />
              <h2 className="text-xl font-bold text-white">Reminder Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Pre-Meeting Reminders */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-5">
            <div className="flex items-center space-x-3 mb-4">
              <Clock className="h-5 w-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Pre-Meeting Reminders</h3>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.enable_pre_meeting_reminders}
                  onChange={(e) => setPreferences({ ...preferences, enable_pre_meeting_reminders: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/5"
                />
                <span className="text-white">Send email reminders before meetings</span>
              </label>

              {preferences.enable_pre_meeting_reminders && (
                <div className="ml-8 space-y-2">
                  <label className="block text-sm text-gray-300">Remind me</label>
                  <select
                    value={preferences.reminder_minutes_before}
                    onChange={(e) => setPreferences({ ...preferences, reminder_minutes_before: parseInt(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value={5}>5 minutes before</option>
                    <option value={10}>10 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={120}>2 hours before</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Daily Digest */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-5">
            <div className="flex items-center space-x-3 mb-4">
              <Mail className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Daily Digest</h3>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.enable_daily_digest}
                  onChange={(e) => setPreferences({ ...preferences, enable_daily_digest: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/5"
                />
                <span className="text-white">Send daily summary of today's meetings</span>
              </label>

              {preferences.enable_daily_digest && (
                <div className="ml-8 space-y-2">
                  <label className="block text-sm text-gray-300">Send digest at</label>
                  <input
                    type="time"
                    value={preferences.daily_digest_time.substring(0, 5)}
                    onChange={(e) => setPreferences({ ...preferences, daily_digest_time: e.target.value + ':00' })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-400">Morning email with today's schedule</p>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Preview */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-5">
            <div className="flex items-center space-x-3 mb-4">
              <CalendarIcon className="h-5 w-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Weekly Preview</h3>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.enable_weekly_preview}
                  onChange={(e) => setPreferences({ ...preferences, enable_weekly_preview: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/5"
                />
                <span className="text-white">Send weekly preview of upcoming meetings</span>
              </label>

              {preferences.enable_weekly_preview && (
                <div className="ml-8 space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Send preview on</label>
                    <select
                      value={preferences.weekly_preview_day}
                      onChange={(e) => setPreferences({ ...preferences, weekly_preview_day: parseInt(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                    >
                      {dayNames.map((day, index) => (
                        <option key={index} value={index}>{day}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">at</label>
                    <input
                      type="time"
                      value={preferences.weekly_preview_time.substring(0, 5)}
                      onChange={(e) => setPreferences({ ...preferences, weekly_preview_time: e.target.value + ':00' })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                    />
                    <p className="text-xs text-gray-400 mt-2">Overview of next 7 days</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-lg p-5">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.include_ai_insights}
                onChange={(e) => setPreferences({ ...preferences, include_ai_insights: e.target.checked })}
                className="w-5 h-5 rounded border-purple-500/30 bg-white/5 mt-0.5"
              />
              <div>
                <span className="text-white font-medium">Include AI Meeting Prep</span>
                <p className="text-sm text-gray-400 mt-1">
                  Include AI-generated discussion topics and prep in reminder emails
                </p>
              </div>
            </label>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <p className="text-sm text-gray-400">
              Changes take effect immediately
            </p>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderSettings;

