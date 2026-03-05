import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface TelegramGroup {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_display_name?: string;
  agent_avatar?: string;
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

interface Agent {
  id: string;
  name: string;
  avatar_url?: string;
  personality_type: string;
}

interface BotInfo {
  id: number;
  username: string;
  firstName: string;
  canJoinGroups: boolean;
  canReadAllGroupMessages: boolean;
  supportsInlineQueries: boolean;
}

interface TelegramConnectionProps {
  onComplete?: () => void;
}

const TelegramConnection: React.FC<TelegramConnectionProps> = ({ onComplete }) => {
  const [groups, setGroups] = useState<TelegramGroup[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    botToken: '',
    chatId: '',
    agentId: '',
  });
  const [testingBot, setTestingBot] = useState(false);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);

  useEffect(() => {
    fetchGroups();
    fetchAgents();
  }, []);

  const fetchGroups = async () => {
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

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Agents response:', data); // Debug log
        // Backend can return different structures:
        // { success: true, data: [...] } - agents array directly in data
        // { success: true, data: { agents: [...] } } - agents in data.agents
        // { agents: [...] } - legacy format
        const agentsList = Array.isArray(data.data) 
          ? data.data 
          : (data.data?.agents || data.agents || []);
        console.log('Parsed agents:', agentsList); // Debug log
        setAgents(agentsList);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const testBotToken = async () => {
    if (!formData.botToken) {
      toast.error('Please enter a bot token');
      return;
    }

    setTestingBot(true);
    try {
      const response = await fetch('/api/telegram/bot-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ botToken: formData.botToken })
      });

      const data = await response.json();
      
      if (response.ok) {
        setBotInfo(data.data);
        toast.success(`Bot verified: @${data.data.username}`);
      } else {
        toast.error(data.error || 'Invalid bot token');
        setBotInfo(null);
      }
    } catch (error) {
      console.error('Error testing bot:', error);
      toast.error('Failed to test bot token');
      setBotInfo(null);
    } finally {
      setTestingBot(false);
    }
  };

  const connectGroup = async () => {
    if (!formData.chatId) {
      toast.error('Please enter the chat ID');
      return;
    }

    if (!formData.agentId) {
      toast.error('Please select an AI agent');
      return;
    }

    if (!formData.botToken) {
      toast.error('Please enter a bot token');
      return;
    }

    try {
      const response = await fetch('/api/telegram/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          botToken: formData.botToken,
          chatId: formData.chatId,
          agentId: formData.agentId
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message);
        setFormData({ botToken: '', chatId: '', agentId: '' });
        setBotInfo(null);
        setShowAddForm(false);
        fetchGroups();
        onComplete?.(); // Call completion callback if provided
      } else {
        toast.error(data.error || 'Failed to connect group');
      }
    } catch (error) {
      console.error('Error connecting group:', error);
      toast.error('Failed to connect group');
    }
  };

  const removeGroup = async (chatId: number, agentId: string) => {
    if (!confirm('Are you sure you want to remove this Telegram group connection?')) {
      return;
    }

    try {
      const response = await fetch(`/api/telegram/groups/${chatId}?agentId=${agentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        toast.success('Group connection removed successfully');
        fetchGroups();
      } else {
        toast.error('Failed to remove group');
      }
    } catch (error) {
      console.error('Error removing group:', error);
      toast.error('Failed to remove group');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Telegram Groups</h2>
              <p className="text-gray-600 mt-2">Connect your AI agents to Telegram groups</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {showAddForm ? 'Cancel' : 'Add Group'}
            </button>
          </div>
        </div>

        {/* Add Group Form */}
        {showAddForm && (
          <div className="p-6 border-b border-gray-600 bg-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Connect Telegram Group to AI Agent</h3>
            
            {/* Instructions */}
            <div className="mb-6 p-4 bg-blue-900 rounded-lg">
              <h4 className="font-medium text-blue-100 mb-2">Setup Instructions:</h4>
              <div className="text-sm text-blue-200 space-y-2">
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Create a bot by messaging @BotFather on Telegram</li>
                  <li>Send /newbot and follow the instructions</li>
                  <li>Copy the bot token (looks like: 123456789:ABCdefGHI...)</li>
                  <li>Add your bot to the Telegram group</li>
                  <li>Get the chat ID by forwarding a message from the group to @userinfobot</li>
                  <li>Select which AI agent will use this bot</li>
                  <li>Enter the bot token and chat ID below</li>
                </ol>
                <p className="mt-2 text-yellow-200">
                  <strong>Note:</strong> Each AI agent can have its own Telegram bot, and you can connect multiple groups per agent!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Agent Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select AI Agent <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.agentId}
                  onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose an agent...</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.personality_type})
                    </option>
                  ))}
                </select>
                {agents.length === 0 && (
                  <p className="mt-1 text-xs text-yellow-400">
                    You need to create an AI agent first before connecting to Telegram
                  </p>
                )}
              </div>

              {/* Bot Token */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bot Token <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={formData.botToken}
                  onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
                  placeholder="123456789:ABCdefGHI..."
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {botInfo && (
                  <div className="mt-2 p-2 bg-green-900 rounded text-sm text-green-200">
                    ✅ Bot verified: @{botInfo.username} ({botInfo.firstName})
                  </div>
                )}
              </div>

              {/* Chat ID */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Chat ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.chatId}
                  onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
                  placeholder="-1001234567890"
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Group IDs are negative numbers (e.g., -1001234567890)
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-between">
              <button
                onClick={testBotToken}
                disabled={testingBot || !formData.botToken}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingBot ? 'Testing Bot...' : 'Test Bot Token'}
              </button>
              <button
                onClick={connectGroup}
                disabled={!formData.chatId || !formData.botToken || !formData.agentId}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect to Agent
              </button>
            </div>
          </div>
        )}

        {/* Connected Groups */}
        <div className="p-6">
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📱</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Telegram groups connected</h3>
              <p className="text-gray-600">
                Connect your first Telegram group to start posting with AI agents.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{group.title}</h4>
                      <p className="text-sm text-gray-600">@{group.bot_username}</p>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        {group.agent_avatar && (
                          <img 
                            src={group.agent_avatar} 
                            alt={group.agent_display_name || group.agent_name}
                            className="w-4 h-4 rounded-full mr-2"
                          />
                        )}
                        <span className="font-medium">Agent: {group.agent_display_name || group.agent_name}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      group.chat_type === 'supergroup' 
                        ? 'bg-blue-100 text-blue-800'
                        : group.chat_type === 'group'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {group.chat_type}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Chat ID: {group.chat_id}</div>
                    {group.member_count && (
                      <div>Members: {group.member_count.toLocaleString()}</div>
                    )}
                    <div>Connected: {new Date(group.created_at).toLocaleDateString()}</div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => removeGroup(group.chat_id, group.agent_id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TelegramConnection;
