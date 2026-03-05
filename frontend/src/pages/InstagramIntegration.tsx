import React, { useState, useEffect } from 'react';
import { 
  Instagram, 
  Plus, 
  Image as ImageIcon, 
  Send, 
  Users, 
  Heart, 
  MessageCircle, 
  Eye,
  TrendingUp,
  Calendar,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface InstagramAccount {
  id: number;
  instagram_business_account_id: string;
  username: string;
  name: string;
  profile_picture_url: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  is_active: boolean;
  created_at: string;
}

interface InstagramPost {
  id: number;
  instagram_media_id: string;
  media_type: string;
  media_url: string;
  thumbnail_url: string;
  caption: string;
  permalink: string;
  like_count: number;
  comments_count: number;
  reach: number;
  impressions: number;
  engagement: number;
  published_at: string;
  created_at: string;
}

interface AnalyticsData {
  date: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  impressions: number;
  reach: number;
  profile_views: number;
  website_clicks: number;
  email_contacts: number;
  phone_call_clicks: number;
  text_message_clicks: number;
}

const InstagramIntegration: React.FC = () => {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InstagramAccount | null>(null);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Post composer state
  const [postImageUrl, setPostImageUrl] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Connect account state
  const [accessToken, setAccessToken] = useState('');
  const [pageId, setPageId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [loginType, setLoginType] = useState<'facebook' | 'instagram'>('facebook');

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Handle OAuth callback results from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success) {
      setSuccess(decodeURIComponent(success));
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh accounts
      fetchAccounts();
    }

    if (error) {
      setError(decodeURIComponent(error));
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      const headers: HeadersInit = {};
      if (token && token !== 'null' && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/instagram/accounts', { headers });

      if (response.ok) {
        const data = await response.json();
        setAccounts(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedAccount(data.data[0]);
        }
      } else if (response.status === 401) {
        // User not authenticated - this is normal for anonymous users
        setAccounts([]);
      } else {
        setError('Failed to fetch Instagram accounts');
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError('Failed to fetch Instagram accounts');
    } finally {
      setLoading(false);
    }
  };

  const connectAccount = async () => {
    try {
      setConnecting(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        setError('Please log in to connect your Instagram account');
        return;
      }

      // Get OAuth authorization URL
      const response = await fetch(`/api/instagram/oauth/authorize?login_type=${loginType}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success && data.auth_url) {
        // Redirect to Instagram/Facebook OAuth
        window.location.href = data.auth_url;
      } else {
        setError(data.message || 'Failed to start authorization');
        setConnecting(false);
      }
    } catch (error: any) {
      console.error('Error starting OAuth:', error);
      setError('Failed to start Instagram authorization');
      setConnecting(false);
    }
  };

  // Handle OAuth callback results from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success) {
      setSuccess(decodeURIComponent(success));
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh accounts
      fetchAccounts();
    }

    if (error) {
      setError(decodeURIComponent(error));
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const disconnectAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this Instagram account?')) {
      return;
    }

    try {
      const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`/api/instagram/disconnect/${accountId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Instagram account disconnected successfully');
        await fetchAccounts();
      } else {
        setError(data.message || 'Failed to disconnect account');
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      setError('Failed to disconnect Instagram account');
    }
  };

  const publishPost = async () => {
    if (!selectedAccount || !postImageUrl) {
      setError('Please select an account and provide an image URL');
      return;
    }

    try {
      setPublishing(true);
      setError(null);

      const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          account_id: selectedAccount.instagram_business_account_id,
          media_url: postImageUrl,
          caption: postCaption,
          media_type: 'IMAGE'
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Post published successfully!');
        setPostImageUrl('');
        setPostCaption('');
        await fetchPosts();
      } else {
        setError(data.message || 'Failed to publish post');
      }
    } catch (error) {
      console.error('Error publishing post:', error);
      setError('Failed to publish post');
    } finally {
      setPublishing(false);
    }
  };

  const fetchPosts = async () => {
    if (!selectedAccount) return;

    try {
      const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`/api/instagram/posts/${selectedAccount.instagram_business_account_id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedAccount) return;

    try {
      const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`/api/instagram/analytics/${selectedAccount.instagram_business_account_id}?range=30d`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const refreshTokens = async () => {
    try {
      const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch('/api/instagram/refresh-tokens', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Refreshed ${data.data.refreshed} tokens successfully`);
      } else {
        setError(data.message || 'Failed to refresh tokens');
      }
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      setError('Failed to refresh tokens');
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      fetchPosts();
      fetchAnalytics();
    }
  }, [selectedAccount]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Instagram className="h-8 w-8 text-pink-600" />
          <div>
            <h1 className="text-3xl font-bold">Instagram Integration</h1>
            <p className="text-gray-600">Manage your Instagram Business accounts and publish content</p>
          </div>
        </div>
        <button 
          onClick={refreshTokens} 
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Tokens
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button className="border-b-2 border-blue-500 py-2 px-1 text-sm font-medium text-blue-600">
              Connected Accounts
            </button>
            <button className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
              Publish Content
            </button>
            <button className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
              Recent Posts
            </button>
            <button className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
              Analytics
            </button>
          </nav>
        </div>

        {/* Connected Accounts Tab */}
        <div className="space-y-6">
          {/* Connect Account Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Plus className="h-5 w-5" />
              <h3 className="text-lg font-medium">Connect Instagram Account</h3>
            </div>
            <div className="space-y-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Choose how you want to connect your Instagram account:
                </p>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="loginType"
                      value="facebook"
                      checked={loginType === 'facebook'}
                      onChange={(e) => setLoginType(e.target.value as 'facebook' | 'instagram')}
                      className="text-blue-600"
                    />
                    <div>
                      <span className="font-medium">Facebook Login</span>
                      <p className="text-xs text-gray-500">Requires a Facebook Page linked to your Instagram Business account</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="loginType"
                      value="instagram"
                      checked={loginType === 'instagram'}
                      onChange={(e) => setLoginType(e.target.value as 'facebook' | 'instagram')}
                      className="text-blue-600"
                    />
                    <div>
                      <span className="font-medium">Instagram Login</span>
                      <p className="text-xs text-gray-500">For Instagram-only accounts (no Facebook Page required)</p>
                    </div>
                  </label>
                </div>
              </div>
              
              <button 
                onClick={connectAccount} 
                disabled={connecting}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-md hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
              >
                {connecting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Instagram className="h-5 w-5" />
                    <span>Connect with {loginType === 'facebook' ? 'Facebook' : 'Instagram'}</span>
                  </>
                )}
              </button>
              
              <p className="text-xs text-gray-500 text-center">
                By connecting, you authorize Ajentrix to access your Instagram account for content publishing and management.
              </p>
            </div>
          </div>

          {/* Connected Accounts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <div key={account.id} className="bg-white shadow rounded-lg p-6 relative">
                <div className="flex items-center space-x-3 mb-4">
                  <img
                    src={account.profile_picture_url}
                    alt={account.username}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <h3 className="font-semibold">@{account.username}</h3>
                    <p className="text-sm text-gray-600">{account.name}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div>
                    <div className="text-lg font-semibold">{account.followers_count.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">Followers</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{account.follows_count.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">Following</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{account.media_count.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">Posts</div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedAccount(account)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-200 text-sm"
                  >
                    Select
                  </button>
                  <button
                    onClick={() => disconnectAccount(account.instagram_business_account_id)}
                    className="bg-red-600 text-white py-2 px-3 rounded-md hover:bg-red-700 text-sm"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Publish Content Tab */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Send className="h-5 w-5" />
            <h3 className="text-lg font-medium">Publish New Post</h3>
          </div>
          {selectedAccount ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <img
                  src={selectedAccount.profile_picture_url}
                  alt={selectedAccount.username}
                  className="w-8 h-8 rounded-full"
                />
                <span className="font-medium">@{selectedAccount.username}</span>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Image URL</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                  value={postImageUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPostImageUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Caption</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Write your caption here..."
                  value={postCaption}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPostCaption(e.target.value)}
                  rows={4}
                />
              </div>

              <button 
                onClick={publishPost} 
                disabled={publishing || !postImageUrl}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishing ? 'Publishing...' : 'Publish Post'}
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Please select an Instagram account first</p>
            </div>
          )}
        </div>

        {/* Recent Posts Tab */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white shadow rounded-lg overflow-hidden">
              <img
                src={post.media_url || post.thumbnail_url}
                alt="Post"
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                  {post.caption || 'No caption'}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <Heart className="h-4 w-4" />
                      <span>{post.like_count}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{post.comments_count}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{post.reach}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {new Date(post.published_at).toLocaleDateString()}
                  </span>
                  <a 
                    href={post.permalink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Analytics Tab */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">Followers</span>
              </div>
              <div className="text-2xl font-bold mt-2">
                {analytics.length > 0 ? analytics[0].followers_count.toLocaleString() : '0'}
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Reach</span>
              </div>
              <div className="text-2xl font-bold mt-2">
                {analytics.reduce((sum, day) => sum + day.reach, 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium">Impressions</span>
              </div>
              <div className="text-2xl font-bold mt-2">
                {analytics.reduce((sum, day) => sum + day.impressions, 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium">Profile Views</span>
              </div>
              <div className="text-2xl font-bold mt-2">
                {analytics.reduce((sum, day) => sum + day.profile_views, 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Analytics Overview (Last 30 Days)</h3>
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Analytics data will appear here once you start posting</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramIntegration;