import React, { useState, useEffect } from 'react';
import { X, Shield, Eye, UserPlus } from 'lucide-react';
import { chatService } from '../../services/chatService';
import toast from 'react-hot-toast';

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    chat_message_privacy: 'contacts' as 'everyone' | 'friends' | 'contacts' | 'none',
    chat_show_online_status: true,
    chat_allow_friend_requests: true
  });

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await chatService.getPrivacySettings();
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error: any) {
      toast.error('Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await chatService.updatePrivacySettings(settings);
      toast.success('Privacy settings updated');
      onClose();
    } catch (error: any) {
      toast.error('Failed to update privacy settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Shield size={20} />
            Privacy Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading settings...</div>
        ) : (
          <div className="space-y-6">
            {/* Who can message me */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Who can message me?
              </label>
              <select
                value={settings.chat_message_privacy}
                onChange={(e) => setSettings({ ...settings, chat_message_privacy: e.target.value as any })}
                className="w-full bg-gray-900 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="everyone">Everyone</option>
                <option value="friends">Friends only</option>
                <option value="contacts">People I've chatted with</option>
                <option value="none">No one</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {settings.chat_message_privacy === 'everyone' && 'Anyone on the platform can message you'}
                {settings.chat_message_privacy === 'friends' && 'Only your friends can message you'}
                {settings.chat_message_privacy === 'contacts' && 'Only people you\'ve chatted with can message you'}
                {settings.chat_message_privacy === 'none' && 'No one can message you'}
              </p>
            </div>

            {/* Show online status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-gray-400" />
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Show online status
                  </label>
                  <p className="text-xs text-gray-500">Let others see when you're online</p>
                </div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, chat_show_online_status: !settings.chat_show_online_status })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.chat_show_online_status ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.chat_show_online_status ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Allow friend requests */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-gray-400" />
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Allow friend requests
                  </label>
                  <p className="text-xs text-gray-500">Let others send you friend requests</p>
                </div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, chat_allow_friend_requests: !settings.chat_allow_friend_requests })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.chat_allow_friend_requests ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.chat_allow_friend_requests ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivacySettingsModal;

