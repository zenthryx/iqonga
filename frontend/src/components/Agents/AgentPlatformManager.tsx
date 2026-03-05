import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface PlatformConnection {
  platform: string;
  username: string;
  status: string;
  connected: boolean;
  followers?: number;
}

interface Agent {
  id: string;
  name: string;
  platforms: string[];
  platform_connections: PlatformConnection[];
}

interface AgentPlatformManagerProps {
  agent: Agent;
  onAgentUpdate: (updatedAgent: Agent) => void;
}

export default function AgentPlatformManager({ agent, onAgentUpdate }: AgentPlatformManagerProps) {
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userConnections, setUserConnections] = useState<{[key: string]: any}>({});

  useEffect(() => {
    checkUserPlatformConnections();
  }, []);

  const checkUserPlatformConnections = async () => {
    try {
      // Check Twitter connection
      const twitterResponse = await fetch('/api/twitter/connection', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const twitterData = await twitterResponse.json();

      const connections: {[key: string]: any} = {};
      const available: string[] = [];

      if (twitterData.connected) {
        connections['twitter'] = twitterData.connection;
        available.push('twitter');
      }

      // TODO: Add other platforms (Instagram, LinkedIn, TikTok, etc.)

      setUserConnections(connections);
      setAvailablePlatforms(available);

    } catch (error) {
      console.error('Failed to check platform connections:', error);
    }
  };

  const handleConnectPlatform = async (platform: string) => {
    if (!availablePlatforms.includes(platform)) {
      toast.error(`Please connect your ${platform} account first in Settings`);
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`/api/agents/${agent.id}/connect-platform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ platform })
      });

      const data = await response.json();

      if (data.success) {
        const updatedAgent = {
          ...agent,
          platforms: data.platforms,
          platform_connections: [
            ...agent.platform_connections.filter(conn => conn.platform !== platform),
            {
              platform,
              username: userConnections[platform]?.username || '',
              status: 'active',
              connected: true,
              followers: userConnections[platform]?.followerCount || 0
            }
          ]
        };

        onAgentUpdate(updatedAgent);
        toast.success(`Agent connected to ${platform} successfully!`);
      } else {
        toast.error(data.error || `Failed to connect agent to ${platform}`);
      }
    } catch (error) {
      console.error(`Failed to connect agent to ${platform}:`, error);
      toast.error(`Failed to connect agent to ${platform}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectPlatform = async (platform: string) => {
    if (!window.confirm(`Are you sure you want to disconnect this agent from ${platform}?`)) {
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`/api/agents/${agent.id}/disconnect-platform`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ platform })
      });

      const data = await response.json();

      if (data.success) {
        const updatedAgent = {
          ...agent,
          platforms: data.platforms,
          platform_connections: agent.platform_connections.filter(conn => conn.platform !== platform)
        };

        onAgentUpdate(updatedAgent);
        toast.success(`Agent disconnected from ${platform} successfully!`);
      } else {
        toast.error(data.error || `Failed to disconnect agent from ${platform}`);
      }
    } catch (error) {
      console.error(`Failed to disconnect agent from ${platform}:`, error);
      toast.error(`Failed to disconnect agent from ${platform}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'twitter':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
          </svg>
        );
      case 'instagram':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        );
      case 'telegram':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'twitter':
        return 'text-blue-400 bg-blue-400/20';
      case 'instagram':
        return 'text-pink-400 bg-pink-400/20';
      case 'telegram':
        return 'text-cyan-400 bg-cyan-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  const supportedPlatforms = ['twitter', 'instagram', 'telegram', 'linkedin'];

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">Platform Connections</h3>
          <p className="text-gray-400 mt-1">
            Connect {agent.name} to social media platforms
          </p>
        </div>
        <button
          onClick={checkUserPlatformConnections}
          disabled={isLoading}
          className="btn-outline"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {supportedPlatforms.map((platform) => {
          const isConnected = agent.platforms?.includes(platform);
          const connection = agent.platform_connections?.find(conn => conn.platform === platform);
          const userHasConnection = availablePlatforms.includes(platform);
          const userConnection = userConnections[platform];

          return (
            <div key={platform} className="border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getPlatformColor(platform)}`}>
                    {getPlatformIcon(platform)}
                  </div>
                  
                  <div className="flex-grow">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-white capitalize">{platform}</h4>
                      {isConnected && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-400/20 text-green-400">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
                          Connected
                        </span>
                      )}
                    </div>
                    
                    {isConnected && connection ? (
                      <div className="text-sm text-gray-400">
                        <span>@{connection.username}</span>
                        {connection.followers && (
                          <span className="ml-2">• {connection.followers.toLocaleString()} followers</span>
                        )}
                      </div>
                    ) : userHasConnection ? (
                      <div className="text-sm text-gray-400">
                        Available: @{userConnection?.username}
                      </div>
                    ) : (
                      <div className="text-sm text-yellow-400">
                        Connect your {platform} account first
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {isConnected ? (
                    <button
                      onClick={() => handleDisconnectPlatform(platform)}
                      disabled={isLoading}
                      className="btn-secondary"
                    >
                      Disconnect
                    </button>
                  ) : userHasConnection ? (
                    <button
                      onClick={() => handleConnectPlatform(platform)}
                      disabled={isLoading}
                      className="btn-primary"
                    >
                      {isLoading ? 'Connecting...' : 'Connect Agent'}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        // Navigate to settings to connect platform
                        window.location.href = '/settings?tab=connections';
                      }}
                      className="btn-outline"
                    >
                      Setup {platform}
                    </button>
                  )}
                </div>
              </div>

              {/* Platform-specific features */}
              {isConnected && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Auto Posts:</span>
                      <span className="ml-1 text-green-400">Enabled</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Replies:</span>
                      <span className="ml-1 text-green-400">Enabled</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Analytics:</span>
                      <span className="ml-1 text-blue-400">Tracking</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Status:</span>
                      <span className="ml-1 text-green-400">Active</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4 className="font-medium text-purple-400">Platform Summary</h4>
        </div>
        <div className="text-sm text-gray-300">
          <p>
            <span className="font-medium">{agent.platforms?.length || 0}</span> platforms connected • 
            <span className="font-medium ml-1">{availablePlatforms.length}</span> available • 
            <span className="font-medium ml-1">{supportedPlatforms.length - availablePlatforms.length}</span> require setup
          </p>
          {agent.platforms?.length === 0 && (
            <p className="text-yellow-400 mt-2">
              💡 Connect at least one platform to start generating content with your AI agent
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 