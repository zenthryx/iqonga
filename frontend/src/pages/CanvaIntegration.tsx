import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Paintbrush, 
  CheckCircle, 
  XCircle,
  Image as ImageIcon,
  Video,
  Search,
  Download,
  Upload,
  Grid3x3,
  List,
  Filter,
  RefreshCw
} from 'lucide-react';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import CanvaIntegration from '../components/Company/CanvaIntegration';

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

const CanvaIntegrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'designs' | 'stock' | 'templates'>('designs');
  const [designs, setDesigns] = useState<CanvaDesign[]>([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CanvaAsset[]>([]);
  const [searching, setSearching] = useState(false);
  const [designFilter, setDesignFilter] = useState<'all' | 'image' | 'video' | 'presentation'>('all');
  const [designSearchQuery, setDesignSearchQuery] = useState('');
  const [filteredDesigns, setFilteredDesigns] = useState<CanvaDesign[]>([]);

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (connected && activeTab === 'designs') {
      loadDesigns();
    }
  }, [connected, activeTab]);

  useEffect(() => {
    // Filter designs based on search and filter
    let filtered = designs;
    
    if (designFilter !== 'all') {
      filtered = filtered.filter(d => {
        const type = d.type?.toLowerCase() || '';
        if (designFilter === 'image') return type.includes('image') || type.includes('photo');
        if (designFilter === 'video') return type.includes('video');
        if (designFilter === 'presentation') return type.includes('presentation') || type.includes('slide');
        return true;
      });
    }
    
    if (designSearchQuery.trim()) {
      const query = designSearchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        (d.title || '').toLowerCase().includes(query) ||
        (d.type || '').toLowerCase().includes(query)
      );
    }
    
    setFilteredDesigns(filtered);
  }, [designs, designFilter, designSearchQuery]);

  const checkConnection = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<{ connected: boolean; configured: boolean }>('/canva/status');
      const data = (response as any).connected !== undefined ? response : (response as any).data || response;
      setConnected(data.connected && data.configured);
    } catch (error: any) {
      console.error('Failed to check Canva status:', error);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadDesigns = async () => {
    try {
      setLoadingDesigns(true);
      const response = await apiService.get<{ success: boolean; designs: CanvaDesign[]; continuation?: string }>('/canva/designs?limit=50');
      const data = (response as any).designs ? response : (response as any).data || response;
      setDesigns(data.designs || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load designs');
    } finally {
      setLoadingDesigns(false);
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
      const data = (response as any).assets ? response : (response as any).data || response;
      setSearchResults(data.assets || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to search assets');
    } finally {
      setSearching(false);
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
      const data = (response as any).downloadUrl ? response : (response as any).data || response;
      
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-600 rounded-lg">
                <Paintbrush className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Canva Integration</h1>
                <p className="text-gray-400 mt-1">Access your Canva designs</p>
              </div>
            </div>
            {connected && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-700 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-green-400 font-medium">Connected</span>
              </div>
            )}
          </div>
        </div>

        {/* Connection Card */}
        {!connected ? (
          <div className="bg-gray-800 rounded-xl p-8 mb-8">
            <CanvaIntegration />
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="bg-gray-800 rounded-xl p-1 mb-6 flex gap-2">
              <button
                onClick={() => setActiveTab('designs')}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'designs'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  My Designs
                </div>
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'templates'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                disabled
              >
                <div className="flex items-center justify-center gap-2">
                  <Grid3x3 className="h-5 w-5" />
                  Templates <span className="text-xs">(Coming Soon)</span>
                </div>
              </button>
            </div>

            {/* Content */}
            {activeTab === 'designs' && (
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="mb-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">Your Designs</h2>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-1">
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`p-2 rounded ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}
                          title="Grid view"
                        >
                          <Grid3x3 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={`p-2 rounded ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}
                          title="List view"
                        >
                          <List className="h-5 w-5" />
                        </button>
                      </div>
                      <button
                        onClick={loadDesigns}
                        disabled={loadingDesigns}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${loadingDesigns ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>
                  </div>
                  
                  {/* Search and Filters */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={designSearchQuery}
                        onChange={(e) => setDesignSearchQuery(e.target.value)}
                        placeholder="Search designs..."
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDesignFilter('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          designFilter === 'all'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setDesignFilter('image')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          designFilter === 'image'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        Images
                      </button>
                      <button
                        onClick={() => setDesignFilter('video')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          designFilter === 'video'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        Videos
                      </button>
                      <button
                        onClick={() => setDesignFilter('presentation')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          designFilter === 'presentation'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        Presentations
                      </button>
                    </div>
                  </div>
                </div>

                {loadingDesigns ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-4" />
                    <p className="text-gray-400">Loading designs...</p>
                  </div>
                ) : filteredDesigns.length === 0 ? (
                  <div className="text-center py-12">
                    <ImageIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg mb-2">
                      {designs.length === 0 
                        ? 'No designs found' 
                        : 'No designs match your filters'}
                    </p>
                    <p className="text-gray-500">
                      {designs.length === 0 
                        ? 'Create some designs in Canva first!' 
                        : 'Try adjusting your search or filters'}
                    </p>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-4'}>
                    {filteredDesigns.map((design) => (
                      <div
                        key={design.id}
                        className={`bg-gray-700 rounded-lg overflow-hidden border border-gray-600 hover:border-purple-500 transition-colors ${
                          viewMode === 'list' ? 'flex gap-4 p-4' : ''
                        }`}
                      >
                        {design.thumbnail_url && (
                          <img
                            src={design.thumbnail_url}
                            alt={design.title || 'Design'}
                            className={viewMode === 'grid' ? 'w-full h-48 object-cover' : 'w-32 h-32 object-cover rounded'}
                          />
                        )}
                        <div className={viewMode === 'grid' ? 'p-4' : 'flex-1'}>
                          <h3 className="text-white font-medium mb-2 truncate">{design.title || 'Untitled Design'}</h3>
                          {design.type && (
                            <p className="text-gray-400 text-sm mb-3">{design.type}</p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleExportDesign(design.id, 'png')}
                              className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-1"
                            >
                              <Download className="h-4 w-4" />
                              PNG
                            </button>
                            <button
                              onClick={() => handleExportDesign(design.id, 'jpg')}
                              className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-1"
                            >
                              <Download className="h-4 w-4" />
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

            {false && activeTab === 'stock' && (
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-white mb-4">Search Stock Assets</h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchAssets()}
                      placeholder="Search for images, videos, graphics..."
                      className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleSearchAssets}
                      disabled={searching}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {searching ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="h-5 w-5" />
                          Search
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {searchResults.map((asset) => (
                      <div
                        key={asset.id}
                        className="relative group bg-gray-700 rounded-lg overflow-hidden border border-gray-600 hover:border-purple-500 transition-colors"
                      >
                        {asset.thumbnail_url && (
                          <img
                            src={asset.thumbnail_url}
                            alt={asset.name}
                            className="w-full h-48 object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => {
                              toast.success(`Asset "${asset.name}" is ready to use!`);
                              // TODO: Integrate with media library or ad generation
                            }}
                            className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-purple-600 text-white rounded text-sm font-medium transition-opacity"
                          >
                            Use Asset
                          </button>
                        </div>
                        <div className="p-3 bg-gray-700">
                          <p className="text-white text-sm truncate">{asset.name}</p>
                          <p className="text-gray-400 text-xs mt-1">{asset.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && !searching && (
                  <div className="text-center py-12">
                    <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No results found</p>
                    <p className="text-gray-500">Try a different search term</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="text-center py-12">
                  <Grid3x3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">Templates Coming Soon</p>
                  <p className="text-gray-500">Browse and use Canva templates for your content</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CanvaIntegrationPage;
