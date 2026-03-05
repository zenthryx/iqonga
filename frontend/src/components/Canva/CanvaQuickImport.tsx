import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  Paintbrush,
  X,
  Download,
  Image as ImageIcon,
  Video,
  Search,
  Loader2
} from 'lucide-react';

interface CanvaDesign {
  id: string;
  title: string;
  thumbnail_url?: string;
  type?: string;
}

interface CanvaQuickImportProps {
  onImport?: (url: string, name: string, type: 'image' | 'video') => void;
  onClose?: () => void;
  showStockSearch?: boolean;
}

const CanvaQuickImport: React.FC<CanvaQuickImportProps> = ({
  onImport,
  onClose,
  showStockSearch = true
}) => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [designs, setDesigns] = useState<CanvaDesign[]>([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [activeTab, setActiveTab] = useState<'designs' | 'stock'>('designs');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (connected && activeTab === 'designs') {
      loadDesigns();
    }
  }, [connected, activeTab]);

  const checkConnection = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<{ connected: boolean; configured: boolean }>('/canva/status');
      const data = (response as any).connected !== undefined ? response : (response as any).data || response;
      setConnected(data.connected && data.configured);
    } catch (error: any) {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadDesigns = async () => {
    try {
      setLoadingDesigns(true);
      const response = await apiService.get<{ success: boolean; designs: CanvaDesign[] }>('/canva/designs?limit=20');
      const data = (response as any).designs ? response : (response as any).data || response;
      setDesigns(data.designs || []);
    } catch (error: any) {
      toast.error('Failed to load designs');
    } finally {
      setLoadingDesigns(false);
    }
  };

  const handleExportAndImport = async (designId: string, format: string = 'png') => {
    try {
      toast.loading('Exporting and importing design...', { id: 'import' });
      // Find design to get thumbnail URL as fallback
      const design = designs.find(d => d.id === designId);
      const response = await apiService.post<{ success: boolean; downloadUrl: string; format: string; isThumbnail?: boolean }>(`/canva/designs/${designId}/export`, { 
        format,
        thumbnailUrl: design?.thumbnail_url // Pass thumbnail as fallback
      });
      const data = (response as any).downloadUrl ? response : (response as any).data || response;
      
      if (onImport) {
        onImport(data.downloadUrl, design?.title || `canva-design-${designId}`, format === 'mp4' ? 'video' : 'image');
        toast.success('Design imported successfully!', { id: 'import' });
        if (onClose) onClose();
      } else {
        // Fallback: download the file
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = `canva-design-${designId}.${format}`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Design exported successfully!', { id: 'import' });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to export design', { id: 'import' });
    }
  };

  const handleSearchAssets = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    try {
      setSearching(true);
      const response = await apiService.get<{ success: boolean; assets: any[] }>(`/canva/assets/search?query=${encodeURIComponent(searchQuery)}&type=image&limit=20`);
      const data = (response as any).assets ? response : (response as any).data || response;
      setSearchResults(data.assets || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to search assets');
    } finally {
      setSearching(false);
    }
  };

  const handleUseAsset = (asset: any) => {
    if (onImport) {
      onImport(asset.url || asset.thumbnail_url, asset.name, asset.type === 'video' ? 'video' : 'image');
      toast.success(`Asset "${asset.name}" imported!`);
      if (onClose) onClose();
    } else {
      toast.success(`Asset "${asset.name}" is ready to use!`);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Paintbrush className="h-5 w-5 text-purple-400" />
            Import from Canva
          </h3>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="text-center py-8">
          <Paintbrush className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">Connect your Canva account to import designs</p>
          <button
            onClick={() => window.location.href = '/canva'}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Canva Integration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Paintbrush className="h-5 w-5 text-purple-400" />
          Import from Canva
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('designs')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'designs'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          My Designs
        </button>
      </div>

      {/* Designs Tab */}
      {activeTab === 'designs' && (
        <div>
          {loadingDesigns ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-2" />
              <p className="text-gray-400">Loading designs...</p>
            </div>
          ) : designs.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No designs found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {designs.map((design) => (
                <div
                  key={design.id}
                  className="relative group bg-gray-700 rounded-lg overflow-hidden border border-gray-600 hover:border-purple-500 transition-colors"
                >
                  {design.thumbnail_url && (
                    <img
                      src={design.thumbnail_url}
                      alt={design.title || 'Design'}
                      className="w-full h-24 object-cover"
                    />
                  )}
                  <div className="p-2">
                    <p className="text-white text-xs truncate mb-2">{design.title || 'Untitled'}</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleExportAndImport(design.id, 'png')}
                        className="flex-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-colors"
                        title="Import as PNG"
                      >
                        PNG
                      </button>
                      <button
                        onClick={() => handleExportAndImport(design.id, 'jpg')}
                        className="flex-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-colors"
                        title="Import as JPG"
                      >
                        JPG
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stock Assets Tab - Removed: Not supported by Canva API */}
      {false && activeTab === 'stock' && showStockSearch && (
        <div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchAssets()}
              placeholder="Search stock assets..."
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
              onClick={handleSearchAssets}
              disabled={searching}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {searchResults.map((asset) => (
                <div
                  key={asset.id}
                  className="relative group bg-gray-700 rounded-lg overflow-hidden border border-gray-600 hover:border-purple-500 transition-colors"
                >
                  {asset.thumbnail_url && (
                    <img
                      src={asset.thumbnail_url}
                      alt={asset.name}
                      className="w-full h-24 object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => handleUseAsset(asset)}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-purple-600 text-white rounded text-xs font-medium transition-opacity"
                    >
                      Import
                    </button>
                  </div>
                  <div className="p-2">
                    <p className="text-white text-xs truncate">{asset.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchQuery && searchResults.length === 0 && !searching && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No results found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CanvaQuickImport;
