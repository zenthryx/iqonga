import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import TwitterConnection from '@/components/PlatformConnection/TwitterConnection';
import { driveService } from '@/services/driveService';
import toast from 'react-hot-toast';
import { Folder, CheckCircle, XCircle, Loader } from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  email?: string;
  wallet_address?: string;
  subscription_tier: string;
  token_balance: number;
  reputation_score: number;
}

export default function Settings() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { logout } = useAuthStore();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Add default values for missing fields
          const profile = {
            ...data.data,
            subscription_tier: data.data.subscription_tier || 'basic',
            token_balance: data.data.token_balance || 0,
            reputation_score: data.data.reputation_score || 100
          };
          setUserProfile(profile);
        } else {
          console.error('Invalid response format:', data);
        }
      } else {
        console.error('Failed to fetch profile:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'connections', name: 'Platform Connections', icon: '🔗' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab userProfile={userProfile} onUpdate={setUserProfile} />;
      case 'connections':
        return <ConnectionsTab />;
      case 'security':
        return <SecurityTab />;
      case 'notifications':
        return <NotificationsTab />;
      default:
        return <ProfileTab userProfile={userProfile} onUpdate={setUserProfile} />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">
          Manage your account, connections, and preferences
        </p>
      </div>

      <div className="flex space-x-8">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="font-medium">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

// Profile Tab Component
function ProfileTab({ userProfile, onUpdate }: { userProfile: UserProfile | null; onUpdate: (profile: UserProfile) => void }) {
  const [formData, setFormData] = useState({
    username: userProfile?.username || '',
    email: userProfile?.email || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuthStore();

  useEffect(() => {
    if (userProfile) {
      setFormData({
        username: userProfile.username,
        email: userProfile.email || ''
      });
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        onUpdate(data.user);
        toast.success('Profile updated successfully!');
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Profile Information</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="input-field w-full"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field w-full"
              placeholder="Enter your email"
            />
          </div>

          {userProfile?.wallet_address && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Wallet Address
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={userProfile.wallet_address}
                  readOnly
                  className="input-field flex-1 bg-gray-800 cursor-not-allowed"
                />
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-400/20 text-green-400">
                  Connected
                </span>
              </div>
              
              {/* Disconnect Wallet Button */}
              <div className="mt-3">
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to disconnect your wallet? This will log you out of the application.')) {
                      logout();
                      setTimeout(() => {
                        window.location.href = '/';
                      }, 500);
                    }
                  }}
                  className="text-red-400 hover:text-red-300 text-sm font-medium hover:underline"
                >
                  Disconnect Wallet
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Connections Tab Component
function ConnectionsTab() {
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | undefined>();
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveConnecting, setDriveConnecting] = useState(false);

  useEffect(() => {
    checkDriveConnection();
    
    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google_drive_auth') === 'success') {
      toast.success('Google Drive connected successfully!');
      checkDriveConnection();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (urlParams.get('google_drive_auth') === 'error') {
      toast.error('Failed to connect Google Drive');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkDriveConnection = async () => {
    setDriveLoading(true);
    try {
      const status = await driveService.getConnectionStatus();
      setDriveConnected(status.connected);
      setDriveEmail(status.email);
    } catch (error) {
      console.error('Failed to check Drive connection:', error);
      setDriveConnected(false);
    } finally {
      setDriveLoading(false);
    }
  };

  const handleConnectDrive = async () => {
    setDriveConnecting(true);
    try {
      await driveService.connect();
      // User will be redirected to Google OAuth
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Google Drive connection');
      setDriveConnecting(false);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Drive?')) {
      return;
    }
    
    setDriveLoading(true);
    try {
      await driveService.disconnect();
      setDriveConnected(false);
      setDriveEmail(undefined);
      toast.success('Google Drive disconnected successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to disconnect Google Drive');
    } finally {
      setDriveLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Platform Connections</h2>
        <p className="text-gray-400">
          Connect your social media accounts to enable AI agent automation
        </p>
      </div>

      {/* Connection Status Overview */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Connection Status</h3>
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
                <p className="text-sm text-gray-400">AI Agent Automation</p>
                <div className="mt-2">
                  {twitterConnected ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-400/20 text-green-400">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-400/20 text-gray-400">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></span>
                      Not Connected
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold">IG</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">Instagram</h4>
                <p className="text-sm text-gray-400">Coming Soon</p>
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-400/20 text-gray-400">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></span>
                    Not Connected
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold">LI</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">LinkedIn</h4>
                <p className="text-sm text-gray-400">Coming Soon</p>
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-400/20 text-gray-400">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></span>
                    Not Connected
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Folder className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">Google Drive</h4>
                <p className="text-sm text-gray-400">eBook Storage & Import</p>
                <div className="mt-2">
                  {driveLoading ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-400/20 text-gray-400">
                      <Loader className="w-3 h-3 animate-spin mr-1.5" />
                      Checking...
                    </span>
                  ) : driveConnected ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-400/20 text-green-400">
                      <CheckCircle className="w-3 h-3 mr-1.5" />
                      Connected {driveEmail && `(${driveEmail})`}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-400/20 text-gray-400">
                      <XCircle className="w-3 h-3 mr-1.5" />
                      Not Connected
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Google Drive Connection Management */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Folder className="h-5 w-5 text-green-400" />
          Google Drive Connection
        </h3>
        <div className="space-y-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-300 mb-4">
              Connect your Google Drive to:
            </p>
            <ul className="space-y-2 text-sm text-gray-400 mb-4">
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Save eBook exports directly to Drive</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Import files from Drive for eBook creation</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Access your eBooks from anywhere</span>
              </li>
            </ul>
            {driveConnected ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Connected</p>
                  {driveEmail && (
                    <p className="text-sm text-gray-400">{driveEmail}</p>
                  )}
                </div>
                <button
                  onClick={handleDisconnectDrive}
                  disabled={driveLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {driveLoading ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectDrive}
                disabled={driveConnecting}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {driveConnecting ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Folder className="h-4 w-4" />
                    <span>Connect Google Drive</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Twitter Connection Management */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Twitter Connection</h3>
        <TwitterConnection onConnectionChange={setTwitterConnected} />
      </div>

      {/* Platform Features */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Platform Features</h3>
        <div className="space-y-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="font-medium text-white mb-2">What you can do with connected platforms:</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Post AI-generated content automatically</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Schedule posts for optimal timing</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Reply to mentions and comments</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Track performance and analytics</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Manage multiple AI agents per platform</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Subscription Tab Component
function SubscriptionTab({ userProfile }: { userProfile: UserProfile | null }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Subscription</h2>
        <p className="text-gray-400">
          Current Plan: <span className="text-purple-400 font-medium capitalize">{userProfile?.subscription_tier || 'Basic'}</span>
        </p>
      </div>

      <div className="glass-card p-8 text-center">
        <div className="mb-6">
          <div className="text-6xl mb-4">💰</div>
          <h3 className="text-2xl font-bold text-white mb-2">Pricing Coming Soon</h3>
          <p className="text-gray-400 text-lg">
            We're working on flexible pricing plans to suit your needs
          </p>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-semibold text-white mb-3">What to Expect</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Flexible AI Agent packages</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Usage-based pricing options</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Enterprise solutions</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Custom integrations</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button className="btn-primary">
            Get Notified
          </button>
          <button className="btn-secondary">
            Contact Sales
          </button>
        </div>
      </div>
    </div>
  );
}

// Security Tab Component
function SecurityTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Security Settings</h2>
        <p className="text-gray-400">
          Manage your account security and authentication methods
        </p>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Two-Factor Authentication</h3>
        <p className="text-gray-400 mb-4">
          Add an extra layer of security to your account
        </p>
        <button className="btn-primary">Enable 2FA</button>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Active Sessions</h3>
        <p className="text-gray-400 mb-4">
          Monitor your active sessions across devices
        </p>
        <button className="btn-secondary">View Sessions</button>
      </div>
    </div>
  );
}

// Notifications Tab Component
function NotificationsTab() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    agentAlerts: true,
    performanceReports: true
  });

  const handleToggle = (setting: string) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting as keyof typeof prev]
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Notification Preferences</h2>
        <p className="text-gray-400">
          Choose how you want to be notified about important events
        </p>
      </div>

      <div className="glass-card p-6">
        <div className="space-y-4">
          {Object.entries(settings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </h4>
                <p className="text-sm text-gray-400">
                  {key === 'emailNotifications' && 'Receive updates via email'}
                  {key === 'pushNotifications' && 'Browser push notifications'}
                  {key === 'agentAlerts' && 'Alerts when agents encounter issues'}
                  {key === 'performanceReports' && 'Weekly performance summaries'}
                </p>
              </div>
              <button
                onClick={() => handleToggle(key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  value ? 'bg-purple-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 