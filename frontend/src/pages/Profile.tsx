import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Copy, Check } from 'lucide-react';
import { apiService } from '../services/api';

interface UserProfile {
  id: string;
  username: string;
  email?: string;
  wallet_address?: string;
  profile_image?: string;
  twitter_handle?: string;
  telegram_handle?: string;
  created_at: string;
  updated_at: string;
}

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

export default function Profile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [twitterConnection, setTwitterConnection] = useState<TwitterConnection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    handleTwitterCallback();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.get('/users/profile');
      
      if (response.success) {
        setUserProfile(response.data);
        // Also fetch Twitter connection status
        fetchTwitterConnection();
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTwitterConnection = async () => {
    try {
      const response = await apiService.get('/twitter/connection');
      if (response.success && response.data?.connected) {
        setTwitterConnection(response.data.connection);
      }
    } catch (error) {
      console.error('Failed to fetch Twitter connection:', error);
    }
  };

  const handleTwitterCallback = () => {
    // Handle Twitter OAuth callback parameters
    const twitterAuth = searchParams.get('twitter_auth');
    const username = searchParams.get('username');
    const error = searchParams.get('error');

    if (twitterAuth === 'success' && username) {
      toast.success(`Successfully connected Twitter account @${username}!`);
      fetchTwitterConnection();
      
      // Clean up URL parameters
      navigate('/profile', { replace: true });
    } else if (twitterAuth === 'denied') {
      toast.error('Twitter authorization was denied');
      navigate('/profile', { replace: true });
    } else if (twitterAuth === 'error') {
      toast.error(error ? `Failed to connect Twitter: ${error}` : 'Failed to connect Twitter account');
      navigate('/profile', { replace: true });
    } else if (twitterAuth === 'expired') {
      toast.error('Twitter authorization expired. Please try again.');
      navigate('/profile', { replace: true });
    }
  };

  const handleProfileUpdate = async (updatedData: Partial<UserProfile>) => {
    try {
      setIsUpdating(true);
      // Don't send username since it can't be changed
      const { username, ...dataToUpdate } = updatedData;
      const response = await apiService.put('/users/profile', { ...dataToUpdate, username: userProfile?.username });
      
      if (response.success) {
        setUserProfile(response.data);
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConnectTwitter = async () => {
    try {
      const response = await apiService.get('/twitter/auth/request');
      
      if (response.success && response.data?.authUrl) {
        // Open Twitter OAuth in the same window to maintain authentication state
        window.location.href = response.data.authUrl;
      } else {
        toast.error(response.error || 'Failed to initiate Twitter connection');
      }
    } catch (error) {
      console.error('Twitter connection error:', error);
      toast.error('Failed to connect Twitter account');
    }
  };

  const handleDisconnectTwitter = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Twitter account? This will disable all Twitter functionality for your agents.')) {
      return;
    }

    try {
      const response = await apiService.delete('/twitter/connection');

      if (response.success) {
        setTwitterConnection(null);
        toast.success('Twitter account disconnected successfully');
      } else {
        toast.error(response.error || 'Failed to disconnect Twitter account');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect Twitter account');
    }
  };

  const handleCopyWalletAddress = async () => {
    if (!userProfile?.wallet_address) {
      toast.error('No wallet address to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(userProfile.wallet_address);
      setCopiedAddress(true);
      toast.success('Wallet address copied to clipboard!');
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (error) {
      console.error('Failed to copy wallet address:', error);
      toast.error('Failed to copy wallet address');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Profile</h1>
          <p className="text-gray-400">Manage your account and connections</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-6">Profile Information</h2>
              
              {userProfile && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center text-2xl font-bold">
                      {userProfile.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{userProfile.username}</h3>
                      <p className="text-gray-400">{userProfile.wallet_address}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Username <span className="text-xs text-gray-500">(Auto-generated, cannot be changed)</span>
                      </label>
                      <input
                        type="text"
                        value={userProfile.username || ''}
                        disabled
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-400 cursor-not-allowed"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email <span className="text-xs text-gray-500">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        value={userProfile.email || ''}
                        onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                        placeholder="Enter your email (optional)"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-purple-400">{userProfile.email || 'Not Set'}</div>
                      <div className="text-sm text-gray-400">Email Address</div>
                    </div>
                    <div className="text-center p-4 bg-gray-800 rounded-lg relative group">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="text-2xl font-bold text-green-400 break-all">
                          {userProfile.wallet_address ? (
                            <>
                              {userProfile.wallet_address.slice(0, 8)}...{userProfile.wallet_address.slice(-6)}
                            </>
                          ) : (
                            'Not Set'
                          )}
                        </div>
                        {userProfile.wallet_address && (
                          <button
                            onClick={handleCopyWalletAddress}
                            className="ml-2 p-1.5 hover:bg-gray-700 rounded-lg transition-colors group"
                            title="Copy wallet address"
                          >
                            {copiedAddress ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
                            )}
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 mt-2">Wallet Address</div>
                    </div>
                    <div className="text-center p-4 bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-blue-400">{new Date(userProfile.created_at).toLocaleDateString()}</div>
                      <div className="text-sm text-gray-400">Member Since</div>
                    </div>
                  </div>

                  {/* Platform Connections Summary */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">Platform Connections Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-white">Twitter</h4>
                            <p className="text-sm text-gray-400">
                              {twitterConnection ? 'Connected' : 'Not Connected'}
                            </p>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            twitterConnection ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {twitterConnection ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                        {twitterConnection && (
                          <div className="mt-3 text-sm text-gray-400">
                            <p>Connected as: @{twitterConnection.username}</p>
                            <p>{twitterConnection.followerCount.toLocaleString()} followers</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-400 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515a.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-4.487 0a12.64 12.64 0 00-.617-1.25a.077.077 0 00-.079-.037A19.736 19.736 0 004.348 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057a19.9 19.9 0 005.993 3.03a.078.078 0 00.084-.028a14.09 14.09 0 001.226-1.994a.076.076 0 00-.041-.106a13.107 13.107 0 01-1.872-.892a.077.077 0 01-.008-.128a10.2 10.2 0 00.372-.292a.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127a12.299 12.299 0 01-1.873.892a.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028a19.839 19.839 0 005.993-3.03a.077.077 0 00.031-.057a19.395 19.395 0 00.4-4.995a.07.07 0 00-.032-.027zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418z"/>
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-white">Discord</h4>
                            <p className="text-sm text-gray-400">Not Connected</p>
                          </div>
                          <div className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                            Inactive
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8.5 13.5l2.5 3 5.5-5.5 1.5 1.5-7 7-4.5-4.5 1.5-1.5z"/>
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-white">Telegram</h4>
                            <p className="text-sm text-gray-400">Not Connected</p>
                          </div>
                          <div className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                            Inactive
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleProfileUpdate(userProfile)}
                    disabled={isUpdating}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {isUpdating ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Platform Connections */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-6">Platform Connections</h2>
              
              {/* Twitter Connection */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Twitter</h3>
                    <p className="text-sm text-gray-400">Connect your Twitter account</p>
                  </div>
                </div>

                {twitterConnection ? (
                  <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <img
                        src={twitterConnection.profileImageUrl || '/avatars/default-twitter.png'}
                        alt={twitterConnection.displayName}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <h4 className="font-medium text-white">{twitterConnection.displayName}</h4>
                        <p className="text-blue-400">@{twitterConnection.username}</p>
                        <p className="text-sm text-gray-400">{twitterConnection.followerCount.toLocaleString()} followers</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-400/20 text-green-400">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
                          Connected
                        </span>
                        <span className="text-xs text-gray-400">
                          Connected {new Date(twitterConnection.connectedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={handleDisconnectTwitter}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="text-gray-400 mb-3">Not connected to Twitter</p>
                    <button
                      onClick={handleConnectTwitter}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Connect Twitter
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
