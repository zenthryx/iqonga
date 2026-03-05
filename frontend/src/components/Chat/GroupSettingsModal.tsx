import React, { useState, useEffect } from 'react';
import { chatService, Conversation } from '../../services/chatService';
import { X, Save, Users, Lock, Unlock, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

interface GroupSettingsModalProps {
  conversation: Conversation;
  currentUserId: number;
  onClose: () => void;
  onUpdate: () => void;
}

const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  conversation,
  currentUserId,
  onClose,
  onUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: conversation.name || '',
    description: conversation.description || '',
    is_public: conversation.is_public || false,
    require_approval: conversation.require_approval || false,
    max_members: conversation.max_members || 100,
    auto_share_signals: conversation.auto_share_signals || false
  });

  // Check if user is owner or admin
  const currentMember = conversation.members?.find(m => m.user_id === currentUserId);
  const canEdit = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canEdit) {
      toast.error('Only owners and admins can edit group settings');
      return;
    }

    try {
      setLoading(true);
      await chatService.updateConversation(conversation.id, formData);
      toast.success('Group settings updated');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error('Failed to update settings: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!canEdit) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Group Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
          <div className="text-gray-400 text-center py-8">
            Only owners and admins can edit group settings
          </div>
          <button
            onClick={onClose}
            className="w-full mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Settings size={24} />
            Group Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Privacy Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Lock size={20} />
              Privacy Settings
            </h3>

            {/* Public/Private */}
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div>
                <label className="text-white font-medium">Public Group</label>
                <p className="text-sm text-gray-400">
                  Allow anyone to find and join this group
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={(e) => handleChange('is_public', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Require Approval */}
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div>
                <label className="text-white font-medium">Require Approval</label>
                <p className="text-sm text-gray-400">
                  New members need approval to join
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.require_approval}
                  onChange={(e) => handleChange('require_approval', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Member Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users size={20} />
              Member Settings
            </h3>

            {/* Max Members */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Maximum Members
              </label>
              <input
                type="number"
                value={formData.max_members}
                onChange={(e) => handleChange('max_members', parseInt(e.target.value) || 100)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                min={2}
                max={1000}
              />
              <p className="text-xs text-gray-400 mt-1">
                Current members: {conversation.member_count || conversation.members?.length || 0}
              </p>
            </div>

            {/* Auto Share Signals */}
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div>
                <label className="text-white font-medium">Auto-Share Signals</label>
                <p className="text-sm text-gray-400">
                  Automatically share crypto signals to this group
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_share_signals}
                  onChange={(e) => handleChange('auto_share_signals', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupSettingsModal;

