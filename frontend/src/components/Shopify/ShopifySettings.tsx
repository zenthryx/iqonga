import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Key,
  Globe,
  Database,
  Clock,
  TestTube,
  Link,
  Unlink
} from 'lucide-react';

interface ShopifyConfig {
  connected: boolean;
  shop_domain?: string;
  scope?: string;
  last_sync_at?: string;
  connected_at?: string;
}

const ShopifySettings: React.FC = () => {
  const [config, setConfig] = useState<ShopifyConfig>({
    connected: false
  });
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [shopDomain, setShopDomain] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/shopify/config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error fetching Shopify config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!shopDomain.trim()) {
      alert('Please enter your Shopify store domain');
      return;
    }

    try {
      setConnecting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/shopify/auth?shop=${encodeURIComponent(shopDomain)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.oauth_url) {
          // Redirect to Shopify OAuth URL
          window.location.href = data.oauth_url;
        } else {
          throw new Error('Invalid response from server');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate connection');
      }
    } catch (error) {
      console.error('Error initiating Shopify connection:', error);
      alert('Failed to initiate Shopify connection');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Shopify store?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/shopify/disconnect', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchConfig(); // Refresh config
        alert('Shopify store disconnected successfully');
      }
    } catch (error) {
      console.error('Error disconnecting Shopify:', error);
      alert('Failed to disconnect Shopify store');
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/shopify/test-connection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('Connection successful!');
        } else {
          alert('Connection failed: ' + (result.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      alert('Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/shopify/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        await fetchConfig(); // Refresh config
        alert('Data sync completed successfully');
      }
    } catch (error) {
      console.error('Error syncing data:', error);
      alert('Failed to sync data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shopify Settings</h2>
          <p className="text-gray-600 mt-1">
            Connect your Shopify store to integrate with AI agents
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 ${
            config.connected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {config.connected ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{config.connected ? 'Connected' : 'Disconnected'}</span>
          </span>
        </div>
      </div>

      {!config.connected ? (
        /* Connection Setup */
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Link className="h-5 w-5" />
            <h3 className="text-lg font-semibold text-gray-900">Connect Your Shopify Store</h3>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="shopDomain" className="block text-sm font-medium text-gray-700">Shop Domain</label>
              <input
                id="shopDomain"
                placeholder="your-store.myshopify.com"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-600">
                Enter your Shopify store domain (e.g., mystore.myshopify.com)
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">What happens when you connect?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• You'll be redirected to Shopify to authorize our app</li>
                <li>• We'll sync your products, customers, and orders</li>
                <li>• Your AI agents will use this data for personalized content</li>
                <li>• You can disconnect anytime from this page</li>
              </ul>
            </div>

            <button 
              onClick={handleConnect} 
              disabled={connecting || !shopDomain.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg flex items-center space-x-2"
            >
              {connecting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Link className="h-4 w-4" />
                  <span>Connect Shopify Store</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Connected State */
        <>
          {/* Connection Status */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-6">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Connected Store</h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Store Domain</label>
                  <p className="text-sm text-gray-900 mt-1">{config.shop_domain}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Permissions</label>
                  <p className="text-sm text-gray-900 mt-1">{config.scope}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Connected</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {config.connected_at ? new Date(config.connected_at).toLocaleString() : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Sync</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {config.last_sync_at ? new Date(config.last_sync_at).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-4 border-t">
                <button 
                  onClick={handleTestConnection} 
                  disabled={testing}
                  className="border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4" />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
                
                <button 
                  onClick={handleSyncNow}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Sync Data</span>
                </button>

                <button 
                  onClick={handleDisconnect}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <Unlink className="h-4 w-4" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* API Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Globe className="h-5 w-5" />
          <h3 className="text-lg font-semibold text-gray-900">Integration Information</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Required Permissions</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• read_customers</li>
                <li>• read_orders</li>
                <li>• read_products</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Synced Data</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Products & Variants</li>
                <li>• Customer Profiles</li>
                <li>• Order History</li>
                <li>• Inventory Levels</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* AI Integration Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Integration</h3>
        </div>
        <p className="text-gray-600 mb-4">
          Once connected, your Shopify data will be automatically integrated with AI agents to create personalized content:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Product Content</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Product recommendations</li>
              <li>• Feature highlights</li>
              <li>• Pricing promotions</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Customer Content</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Personalized messages</li>
              <li>• Order-based content</li>
              <li>• Customer insights</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopifySettings;