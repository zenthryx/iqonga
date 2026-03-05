import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

const DiscordIntegration: React.FC = () => {
  const { token } = useAuthStore();
  const [botStatus, setBotStatus] = useState<any>(null);
  const [configurations, setConfigurations] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [botToken, setBotToken] = useState('');
  const [selectedGuild, setSelectedGuild] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [priority, setPriority] = useState(1);
  const [clientId, setClientId] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchBotStatus(),
        fetchConfigurations(),
        fetchAnalytics(),
        fetchGuilds(),
        fetchAgents()
      ]);
    } catch (error) {
      setError('Failed to load Discord data');
    } finally {
      setLoading(false);
    }
  };

  const reconnectBot = async () => {
    try {
      const response = await fetch('/api/discord/reconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        await fetchBotStatus();
        await fetchGuilds();
        setError('');
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to reconnect Discord bot');
    }
  };

  const fetchBotStatus = async () => {
    const response = await fetch('/api/discord/status', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      setBotStatus(data.data);
    }
  };

  const fetchConfigurations = async () => {
    const response = await fetch('/api/discord/configurations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      setConfigurations(data.data);
    }
  };

  const fetchAnalytics = async () => {
    const response = await fetch('/api/discord/analytics?range=30d', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      setAnalytics(data.data);
    }
  };

  const fetchGuilds = async () => {
    const response = await fetch('/api/discord/guilds', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      setGuilds(data.data);
    }
  };

  const fetchAgents = async () => {
    const response = await fetch('/api/agents', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      setAgents(data.data);
    }
  };

  const connectBot = async () => {
    try {
      const response = await fetch('/api/discord/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ bot_token: botToken })
      });

      const data = await response.json();
      if (data.success) {
        setBotToken('');
        await fetchBotStatus();
        await fetchGuilds();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to connect Discord bot');
    }
  };

  // Generate Discord invite link for BYO Bot
  const generateInviteLink = () => {
    // Permissions: View Channel, Send Messages, Read History, Embed Links, Attach Files, Use External Emojis
    const permissions = 379904; // computed integer
    if (!clientId) {
      setInviteUrl('');
      return;
    }
    const url = `https://discord.com/api/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&scope=bot%20applications.commands&permissions=${permissions}`;
    setInviteUrl(url);
  };

  const disconnectBot = async () => {
    try {
      const response = await fetch('/api/discord/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        await fetchBotStatus();
        setGuilds([]);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to disconnect Discord bot');
    }
  };

  const addConfiguration = async () => {
    try {
      const response = await fetch('/api/discord/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          guild_id: selectedGuild || null,
          channel_id: selectedChannel || null,
          agent_id: selectedAgent,
          priority
        })
      });

      const data = await response.json();
      if (data.success) {
        setSelectedGuild('');
        setSelectedChannel('');
        setSelectedAgent('');
        setPriority(1);
        await fetchConfigurations();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to add configuration');
    }
  };

  const deleteConfiguration = async (id: number) => {
    try {
      const response = await fetch(`/api/discord/configurations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        await fetchConfigurations();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to delete configuration');
    }
  };

  const selectedGuildData = guilds.find(g => g.id === selectedGuild);
  const availableChannels = selectedGuildData?.channels || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Discord integration...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Discord Integration</h1>
          <p className="text-gray-300 text-lg">
            Deploy your AI agents as Discord bots for community management and customer support.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Bot Status */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">🤖 Bot Status</h2>
          
          {botStatus?.isConnected ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-2">🟢</div>
                <div className="text-green-400 font-semibold">Connected</div>
                <div className="text-gray-400 text-sm">{botStatus.botUsername}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🏠</div>
                <div className="text-white font-semibold">{botStatus.guilds}</div>
                <div className="text-gray-400 text-sm">Servers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">⏱️</div>
                <div className="text-white font-semibold">{botStatus.uptime}</div>
                <div className="text-gray-400 text-sm">Uptime</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-white mb-4">Connect Your Discord Bot</h3>
              <p className="text-gray-400 mb-6">
                Enter your Discord bot token to start deploying AI agents on Discord servers.
              </p>
              <div className="max-w-md mx-auto">
                <input
                  type="password"
                  placeholder="Bot Token"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:outline-none mb-4"
                />
                <button
                  onClick={connectBot}
                  disabled={!botToken}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Connect Bot
                </button>
              </div>
            </div>
          )}

          {botStatus?.isConnected && (
            <div className="mt-6 text-center">
              <div className="flex gap-3 justify-center">
                <button
                  onClick={reconnectBot}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Reconnect Bot
                </button>
                <button
                  onClick={disconnectBot}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Disconnect Bot
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Analytics */}
        {analytics && (
          <div className="glass-card p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">📊 Analytics (Last 30 Days)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">{analytics.totalInteractions}</div>
                <div className="text-gray-400 text-sm">Total Interactions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">{analytics.uniqueUsers}</div>
                <div className="text-gray-400 text-sm">Unique Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">{analytics.activeServers}</div>
                <div className="text-gray-400 text-sm">Active Servers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{analytics.avgResponseTime}ms</div>
                <div className="text-gray-400 text-sm">Avg Response Time</div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration */}
        {botStatus?.isConnected && (
          <div className="glass-card p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">⚙️ Agent Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Server</label>
                <select
                  value={selectedGuild}
                  onChange={(e) => setSelectedGuild(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="">All Servers</option>
                  {guilds.map(guild => (
                    <option key={guild.id} value={guild.id}>{guild.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Channel</label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="">All Channels</option>
                  {availableChannels.map((channel: any) => (
                    <option key={channel.id} value={channel.id}>#{channel.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">AI Agent</label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="">Select Agent</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Priority</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={addConfiguration}
              disabled={!selectedAgent}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Add Configuration
            </button>
          </div>
        )}

        {/* Existing Configurations */}
        {configurations.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold text-white mb-4">📋 Current Configurations</h2>
            <div className="space-y-4">
              {configurations.map(config => (
                <div key={config.id} className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white font-semibold">{config.agent_name}</div>
                      <div className="text-gray-400 text-sm">
                        Server: {config.guild_id ? guilds.find(g => g.id === config.guild_id)?.name || 'Unknown' : 'All Servers'}
                      </div>
                      <div className="text-gray-400 text-sm">
                        Channel: {config.channel_id ? `#${availableChannels.find((c: any) => c.id === config.channel_id)?.name || 'Unknown'}` : 'All Channels'}
                      </div>
                      <div className="text-gray-400 text-sm">Priority: {config.priority}</div>
                    </div>
                    <button
                      onClick={() => deleteConfiguration(config.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Learning & Knowledge Section */}
        {botStatus.connected && (
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold text-white mb-4">🧠 AI Learning & Knowledge</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Learning Statistics */}
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">📊 Learning Statistics</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Messages Learned:</span>
                    <span className="text-green-400">1,247</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Conversations:</span>
                    <span className="text-blue-400">89</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Q&A Pairs:</span>
                    <span className="text-purple-400">156</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Support Issues:</span>
                    <span className="text-orange-400">23</span>
                  </div>
                </div>
              </div>

              {/* Learning Features */}
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">✨ Learning Features</h3>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-300">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span>Channel Conversation Learning</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    <span>Support Question Detection</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                    <span>Context-Aware Responses</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                    <span>Multi-Channel Intelligence</span>
                  </div>
                </div>
              </div>

              {/* Knowledge Search */}
              <div className="bg-gray-800 p-4 rounded-lg md:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-3">🔍 Knowledge Search</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Search learned knowledge..."
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  />
                  <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                    Search
                  </button>
                </div>
                <div className="mt-3 text-sm text-gray-400">
                  Search through conversations, Q&A pairs, and support issues learned from your Discord channels.
                </div>
              </div>

            </div>
          </div>
        )}

        {/* BYO Bot: Invite Link Generator */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">🔗 Generate Your Bot Invite Link (BYO Bot)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm text-gray-400 mb-2">Discord Application ID (client_id)</label>
              <input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g. 123456789012345678"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={generateInviteLink}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors w-full"
              >
                Generate Invite Link
              </button>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm text-gray-400 mb-2">Invite URL</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  placeholder="Your invite link will appear here"
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={() => { if (inviteUrl) { navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(()=>setCopied(false), 1500);} }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-2">Scopes: bot, applications.commands • Permissions: View Channel, Send Messages, Read Message History, Embed Links, Attach Files, Use External Emojis. Advanced users can customize permissions in the Discord Developer Portal.</p>
              <p className="text-gray-400 text-sm mt-2">Need help? Read the <a href="/discord-app-guide" className="text-green-400 hover:text-green-300">Create your Discord App guide</a>.</p>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="glass-card p-6 mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">❓ How to Get Started</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">1. Create a Discord Bot</h3>
              <p>Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">Discord Developer Portal</a> and create a new application.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">2. Get Bot Token</h3>
              <p>In your application, go to the "Bot" section and copy the bot token. Turn ON <span className="font-semibold text-white">Message Content Intent</span>. Keep Presence and Server Members OFF.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">3. Invite Bot to Server</h3>
              <p>Use the generator above to create the OAuth2 invite link with correct scopes and permissions, then invite the bot to your server.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">4. Configure Agent</h3>
              <p>Select which AI agent should respond in which servers/channels and set priority levels.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">5. AI Learning Features</h3>
              <p>Your AI agent will automatically learn from channel conversations, detect support questions, and provide context-aware responses using accumulated knowledge.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordIntegration;
