import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface TwitterConnection {
  platformUserId: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
  status: string;
  followerCount: number;
  lastSync: string;
  connectedAt: string;
}

interface TwitterConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
}

export default function TwitterConnection({ onConnectionChange }: TwitterConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<TwitterConnection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
    
    // Handle Twitter OAuth callback parameters when user returns
    const urlParams = new URLSearchParams(window.location.search);
    const twitterAuth = urlParams.get('twitter_auth');
    const username = urlParams.get('username');
    const error = urlParams.get('error');

    if (twitterAuth === 'success' && username) {
      toast.success(`Successfully connected Twitter account @${username}!`);
      checkConnectionStatus();
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (twitterAuth === 'denied') {
      toast.error('Twitter authorization was denied');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (twitterAuth === 'error') {
      toast.error(error ? `Failed to connect Twitter: ${error}` : 'Failed to connect Twitter account');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (twitterAuth === 'expired') {
      toast.error('Twitter authorization expired. Please try again.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/twitter/connection', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const data = await response.json();
      
      if (data.success || data.connected) {
        setIsConnected(data.connected);
        setConnection(data.connection);
        onConnectionChange?.(data.connected);
      }
    } catch (error) {
      console.error('Failed to check Twitter connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Request Twitter OAuth URL
      const response = await fetch('/api/twitter/auth/request', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const data = await response.json();

      if (data.success && data.authUrl) {
        // Open Twitter OAuth in the same window to maintain authentication state
        window.location.href = data.authUrl;

        // Note: Since we're redirecting to Twitter in the same window,
        // the user will be redirected back to the callback URL after authorization.
        // The backend will handle the redirect to the settings page with success/error parameters.

      } else {
        toast.error(data.error || 'Failed to initiate Twitter connection');
      }
    } catch (error) {
      console.error('Twitter connection error:', error);
      toast.error('Failed to connect Twitter account');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Twitter account? This will disable all Twitter functionality for your agents.')) {
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/twitter/connection', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setIsConnected(false);
        setConnection(null);
        onConnectionChange?.(false);
        toast.success('Twitter account disconnected successfully');
      } else {
        toast.error(data.error || 'Failed to disconnect Twitter account');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect Twitter account');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="text-gray-300">Checking Twitter connection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Twitter</h3>
            <p className="text-sm text-gray-400">Connect your Twitter account to enable AI posting</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isConnected && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-400/20 text-green-400">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
              Connected
            </span>
          )}
        </div>
      </div>

      {isConnected && connection ? (
        <div className="space-y-4">
          {/* Connected Account Info */}
          <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg">
            <img
              src={connection.profileImageUrl || '/avatars/default-twitter.png'}
              alt={connection.displayName}
              className="w-12 h-12 rounded-full"
            />
            <div className="flex-grow">
              <h4 className="font-medium text-white">{connection.displayName}</h4>
              <p className="text-blue-400">@{connection.username}</p>
              <p className="text-sm text-gray-400">{connection.followerCount.toLocaleString()} followers</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Connected</p>
              <p className="text-xs text-gray-400">
                {new Date(connection.connectedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Connection Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-white">{connection.followerCount.toLocaleString()}</div>
              <div className="text-xs text-gray-400">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-400">Active</div>
              <div className="text-xs text-gray-400">Status</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-400">
                {new Date(connection.lastSync).toLocaleDateString()}
              </div>
              <div className="text-xs text-gray-400">Last Sync</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="btn-secondary flex-1"
            >
              Disconnect Account
            </button>
            <button
              onClick={checkConnectionStatus}
              disabled={isLoading}
              className="btn-outline"
            >
              Refresh Status
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </div>
            <h4 className="text-lg font-medium text-white mb-2">Connect Your Twitter Account</h4>
            <p className="text-gray-400 mb-6">
              Allow your AI agents to post and interact on Twitter by connecting your account.
            </p>
            
            <div className="space-y-3 text-sm text-gray-400 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Post AI-generated content automatically</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Reply to mentions and comments</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Track performance and analytics</span>
              </div>
            </div>

            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="btn-primary w-full"
            >
              {isConnecting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Connecting...</span>
                </div>
              ) : (
                <>🔗 Connect Twitter Account</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 