import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  PaintBrushIcon,
  PhotoIcon,
  LinkIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface CanvaDesign {
  id: string;
  title: string;
  thumbnail_url?: string;
  type?: string;
  created_at?: string;
}

interface CanvaAsset {
  id: string;
  name: string;
  url: string;
  thumbnail_url?: string;
  type: string;
}

const CanvaIntegration: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [designs, setDesigns] = useState<CanvaDesign[]>([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [showDesigns, setShowDesigns] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CanvaAsset[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, []);

  // Check for OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const canvaConnected = urlParams.get('canva_connected');
    const canvaError = urlParams.get('canva_error');

    if (canvaConnected === 'true') {
      toast.success('Canva account connected successfully!');
      setConnected(true);
      // Navigate to brand-book tab
      window.history.replaceState({}, '', '/company?tab=brand-book');
      checkConnection();
    }

    if (canvaError) {
      toast.error(`Canva connection failed: ${decodeURIComponent(canvaError)}`);
      // Navigate to brand-book tab
      window.history.replaceState({}, '', '/company?tab=brand-book');
    }
  }, []);

  // Handle return from Canva (when user clicks "Return to Ajentrix" in Canva)
  // Note: Canva redirects to /company without query params, so we auto-navigate to brand-book tab
  useEffect(() => {
    // Only run on company page
    if (window.location.pathname === '/company') {
      const urlParams = new URLSearchParams(window.location.search);
      const currentTab = urlParams.get('tab');
      
      // If no tab is set and we're on company page, default to brand-book
      // This helps when users return from Canva return navigation
      if (!currentTab) {
        window.history.replaceState({}, '', '/company?tab=brand-book');
      }
    }
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<{ connected: boolean; configured: boolean }>('/canva/status');
      // Backend returns { connected, configured } directly
      const data = (response as any).connected !== undefined ? response : (response as any).data || response;
      setConnected(data.connected && data.configured);
    } catch (error: any) {
      console.error('Failed to check Canva status:', error);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const response = await apiService.get<{ authUrl: string; state?: string }>('/canva/auth-url');
      // Backend returns { authUrl, state } directly
      const data = (response as any).authUrl ? response : (response as any).data || response;
      
      // Redirect to Canva authorization
      window.location.href = data.authUrl;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to connect to Canva');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Canva account?')) {
      return;
    }

    try {
      await apiService.post('/canva/disconnect');
      setConnected(false);
      setDesigns([]);
      setShowDesigns(false);
      toast.success('Canva account disconnected');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to disconnect');
    }
  };

  const loadDesigns = async () => {
    try {
      setLoadingDesigns(true);
      const response = await apiService.get<{ success: boolean; designs: CanvaDesign[]; continuation?: string }>('/canva/designs?limit=50');
      // Backend returns { success, designs, continuation }
      const data = (response as any).designs ? response : (response as any).data || response;
      setDesigns(data.designs || []);
      setShowDesigns(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load designs');
    } finally {
      setLoadingDesigns(false);
    }
  };

  const handleExportDesign = async (designId: string, format: string = 'png') => {
    try {
      toast.loading('Exporting design...', { id: 'export' });
      // Find design to get thumbnail URL as fallback
      const design = designs.find(d => d.id === designId);
      const response = await apiService.post<{ success: boolean; downloadUrl: string; format: string; size?: number; isThumbnail?: boolean }>(`/canva/designs/${designId}/export`, { 
        format,
        thumbnailUrl: design?.thumbnail_url // Pass thumbnail as fallback
      });
      // Backend returns { success, downloadUrl, format, size }
      const data = (response as any).downloadUrl ? response : (response as any).data || response;
      
      // Download the file
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = `canva-design-${designId}.${format}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Design exported successfully!', { id: 'export' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to export design', { id: 'export' });
    }
  };

  const handleSearchAssets = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    try {
      setSearching(true);
      const response = await apiService.get<{ success: boolean; assets: CanvaAsset[] }>(`/canva/assets/search?query=${encodeURIComponent(searchQuery)}&type=image&limit=20`);
      // Backend returns { success, assets }
      const data = (response as any).assets ? response : (response as any).data || response;
      setSearchResults(data.assets || []);
      setShowSearch(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to search assets');
    } finally {
      setSearching(false);
    }
  };

  const handleUseAsset = (asset: CanvaAsset) => {
    // This would integrate with your media library or ad generation
    toast.success(`Asset "${asset.name}" is ready to use!`);
    // You can emit an event or call a callback here to use the asset
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <PaintBrushIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Canva Integration
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Connect your Canva account to access your designs
            </p>
          </div>
        </div>
        {connected && (
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
          </div>
        )}
      </div>

      {!connected ? (
        <div className="space-y-4">
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {connecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Connecting...
              </>
            ) : (
              <>
                <LinkIcon className="h-5 w-5" />
                Connect Canva Account
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            You'll be redirected to Canva to authorize access to your designs and assets
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={loadDesigns}
              disabled={loadingDesigns}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingDesigns ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading...
                </>
              ) : (
                <>
                  <PhotoIcon className="h-5 w-5" />
                  My Designs
                </>
              )}
            </button>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
              Search Stock
            </button>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded-lg font-medium transition-colors"
            >
              Disconnect
            </button>
          </div>

          {/* Stock Asset Search */}
          {showSearch && (
            <div className="border-t pt-4 mt-4">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchAssets()}
                  placeholder="Search Canva stock images..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={handleSearchAssets}
                  disabled={searching}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                  {searchResults.map((asset) => (
                    <div
                      key={asset.id}
                      className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                    >
                      {asset.thumbnail_url && (
                        <img
                          src={asset.thumbnail_url}
                          alt={asset.name}
                          className="w-full h-32 object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => handleUseAsset(asset)}
                          className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-purple-600 text-white rounded text-sm font-medium transition-opacity"
                        >
                          Use Asset
                        </button>
                      </div>
                      <div className="p-2 bg-white dark:bg-gray-800">
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{asset.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User Designs */}
          {showDesigns && (
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Your Designs</h4>
              {designs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No designs found. Create some designs in Canva first!
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                  {designs.map((design) => (
                    <div
                      key={design.id}
                      className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                    >
                      {design.thumbnail_url && (
                        <img
                          src={design.thumbnail_url}
                          alt={design.title || 'Design'}
                          className="w-full h-32 object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleExportDesign(design.id, 'png')}
                          className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-purple-600 text-white rounded text-sm font-medium transition-opacity flex items-center gap-1"
                          title="Export as PNG"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          PNG
                        </button>
                        <button
                          onClick={() => handleExportDesign(design.id, 'jpg')}
                          className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-purple-600 text-white rounded text-sm font-medium transition-opacity flex items-center gap-1"
                          title="Export as JPG"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          JPG
                        </button>
                      </div>
                      <div className="p-2 bg-white dark:bg-gray-800">
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {design.title || 'Untitled Design'}
                        </p>
                        {design.type && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">{design.type}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CanvaIntegration;
