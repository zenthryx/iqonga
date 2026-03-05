import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used?: string;
  is_active: boolean;
}

const ApiKeyManagement: React.FC = () => {
  const { user } = useAuthStore();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showKey, setShowKey] = useState<string | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ name: newKeyName })
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiKeys([data.data, ...apiKeys]);
        setNewKeyName('');
        setShowKey(data.data.id);
        setNewlyCreatedKey(data.data.key); // Store the full key for display
        
        // Clear the newly created key after 5 minutes for security
        setTimeout(() => {
          setNewlyCreatedKey(null);
        }, 5 * 60 * 1000);
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
    } finally {
      setCreating(false);
    }
  };

  const regenerateApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to regenerate this API key? The old key will become invalid and you\'ll need to update it in all applications using it.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ regenerate: true })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update the API key in the list
        setApiKeys(apiKeys.map(key => 
          key.id === id ? { ...key, key: data.data.key } : key
        ));
        setNewlyCreatedKey(data.data.key);
        setShowKey(id);
        
        // Clear the newly created key after 5 minutes for security
        setTimeout(() => {
          setNewlyCreatedKey(null);
        }, 5 * 60 * 1000);
      }
    } catch (error) {
      console.error('Failed to regenerate API key:', error);
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        setApiKeys(apiKeys.filter(key => key.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const toggleApiKey = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ is_active: !isActive })
      });
      
      if (response.ok) {
        setApiKeys(apiKeys.map(key => 
          key.id === id ? { ...key, is_active: !isActive } : key
        ));
      }
    } catch (error) {
      console.error('Failed to toggle API key:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">API Key Management</h1>
          <p className="text-gray-400 mt-2">
            Manage your API keys for integrating Iqonga with external applications
          </p>
        </div>
      </div>

      {/* Create New API Key */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Create New API Key</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Enter API key name (e.g., WordPress Plugin, Mobile App)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
          />
          <button
            onClick={createApiKey}
            disabled={creating || !newKeyName.trim()}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
          >
            {creating ? 'Creating...' : 'Create Key'}
          </button>
        </div>
      </div>

      {/* API Keys List */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Your API Keys</h2>
        
        {apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="text-gray-400">No API keys created yet</p>
            <p className="text-gray-500 text-sm mt-1">Create your first API key to start integrating Iqonga</p>
          </div>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="border border-gray-700 rounded-lg p-4">
                {/* Warning for newly created key */}
                {newlyCreatedKey === apiKey.key && (
                  <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <p className="text-yellow-400 text-sm font-medium">
                        ⚠️ Important: Copy this API key now! It will be hidden after 5 minutes for security.
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{apiKey.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        apiKey.is_active 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {apiKey.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                      Created: {formatDate(apiKey.created_at)}
                      {apiKey.last_used && (
                        <span className="ml-4">Last used: {formatDate(apiKey.last_used)}</span>
                      )}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {showKey === apiKey.id ? (
                      <div className="flex items-center gap-2">
                        <code className="px-3 py-1 bg-gray-800 text-green-400 rounded text-sm font-mono">
                          {newlyCreatedKey === apiKey.key ? apiKey.key : 'ak_' + '•'.repeat(32)}
                        </code>
                        {newlyCreatedKey === apiKey.key && (
                          <button
                            onClick={() => copyToClipboard(apiKey.key)}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                            title="Copy to clipboard"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => setShowKey(null)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title="Hide key"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowKey(apiKey.id)}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                      >
                        Show Key
                      </button>
                    )}
                    
                    {newlyCreatedKey !== apiKey.key && (
                      <button
                        onClick={() => regenerateApiKey(apiKey.id)}
                        className="px-3 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-sm transition-colors"
                        title="Generate new key (old key will be invalidated)"
                      >
                        Regenerate
                      </button>
                    )}
                    
                    <button
                      onClick={() => toggleApiKey(apiKey.id, apiKey.is_active)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        apiKey.is_active
                          ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      {apiKey.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    
                    <button
                      onClick={() => deleteApiKey(apiKey.id)}
                      className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage Information */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">How to Use API Keys</h2>
        <div className="space-y-4">
          <div className="pb-3 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white mb-2">Agent Forum / AIAForums.com</h3>
            <p className="text-gray-400 text-sm">
              For connecting AI agents to the Agent Forum (AIAForums.com), create API keys in the{' '}
              <Link to="/developers" className="text-green-400 hover:text-green-300 font-medium">Developer Portal</Link>.
              Those keys use a different format (<code className="bg-gray-800 px-1 rounded text-green-400">aif_...</code>) and are not created on this page.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-2">WordPress Plugin</h3>
            <p className="text-gray-400 text-sm">
              Use your API key in the Iqonga WordPress plugin settings to connect your website to Iqonga agents.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Custom Integrations</h3>
            <p className="text-gray-400 text-sm">
              Include your API key in the Authorization header: <code className="bg-gray-800 px-2 py-1 rounded text-green-400">Bearer YOUR_API_KEY</code>
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Security Best Practices</h3>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Never share your API keys publicly</li>
              <li>• Use different keys for different applications</li>
              <li>• Deactivate keys you no longer need</li>
              <li>• Monitor key usage regularly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyManagement;
