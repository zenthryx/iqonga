import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import TelegramConnection from '../components/Telegram/TelegramConnection';
import TelegramInstructions from '../components/Telegram/TelegramInstructions';

interface TelegramGroup {
  id: string;
  chat_id: number;
  chat_type: string;
  title: string;
  username?: string;
  description?: string;
  member_count?: number;
  bot_username: string;
  is_active: boolean;
  created_at: string;
}

const TelegramSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'groups' | 'instructions' | 'add'>('groups');
  const [groups, setGroups] = useState<TelegramGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'groups') {
      fetchGroups();
    }
  }, [activeTab]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/telegram/groups', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(data.data.groups);
      } else {
        toast.error('Failed to fetch Telegram groups');
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to fetch Telegram groups');
    } finally {
      setLoading(false);
    }
  };

  const removeGroup = async (chatId: number) => {
    if (!confirm('Are you sure you want to remove this Telegram group?')) {
      return;
    }

    try {
      const response = await fetch(`/api/telegram/groups/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        toast.success('Group removed successfully');
        fetchGroups();
      } else {
        toast.error('Failed to remove group');
      }
    } catch (error) {
      console.error('Error removing group:', error);
      toast.error('Failed to remove group');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getChatTypeColor = (type: string) => {
    switch (type) {
      case 'supergroup':
        return 'bg-blue-100 text-blue-800';
      case 'group':
        return 'bg-green-100 text-green-800';
      case 'channel':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Telegram Settings</h1>
          <p className="mt-2 text-gray-600">
            Connect your Telegram groups to enable AI agents to post content
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('groups')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'groups'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📱 Connected Groups ({groups.length})
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'add'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ➕ Add Group
            </button>
            <button
              onClick={() => setActiveTab('instructions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'instructions'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📖 Setup Instructions
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-lg">
          {activeTab === 'groups' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Connected Telegram Groups</h2>
                <button
                  onClick={() => setActiveTab('add')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add New Group
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📱</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Telegram groups connected</h3>
                  <p className="text-gray-600 mb-6">
                    Connect your first Telegram group to start posting with AI agents.
                  </p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Add Your First Group
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groups.map((group) => (
                    <div key={group.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">{group.title}</h3>
                          <p className="text-sm text-gray-600">@{group.bot_username}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getChatTypeColor(group.chat_type)}`}>
                          {group.chat_type}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Chat ID:</span>
                          <span className="font-mono text-xs">{group.chat_id}</span>
                        </div>
                        {group.member_count && (
                          <div className="flex justify-between">
                            <span>Members:</span>
                            <span>{group.member_count.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Connected:</span>
                          <span>{formatDate(group.created_at)}</span>
                        </div>
                        {group.username && (
                          <div className="flex justify-between">
                            <span>Username:</span>
                            <span>@{group.username}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                          <span className="text-xs text-gray-600">Active</span>
                        </div>
                        <button
                          onClick={() => removeGroup(group.chat_id)}
                          className="text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="p-6">
              <TelegramConnection onComplete={() => {
                setActiveTab('groups');
                fetchGroups();
              }} />
            </div>
          )}

          {activeTab === 'instructions' && (
            <div className="p-6">
              <TelegramInstructions />
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {groups.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-blue-500 text-2xl mr-3">📱</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{groups.length}</div>
                  <div className="text-sm text-gray-600">Connected Groups</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-green-500 text-2xl mr-3">✅</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{groups.filter(g => g.is_active).length}</div>
                  <div className="text-sm text-gray-600">Active Groups</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-purple-500 text-2xl mr-3">👥</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {groups.reduce((sum, g) => sum + (g.member_count || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Members</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TelegramSettings;
