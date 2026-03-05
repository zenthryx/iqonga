import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { mediaService, UploadedMedia } from '@/services/mediaService';
import toast from 'react-hot-toast';
import { PencilIcon } from '@heroicons/react/24/outline';
import CanvaQuickImport from '@/components/Canva/CanvaQuickImport';
import { Paintbrush } from 'lucide-react';

const MediaLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, images: 0, videos: 0, totalSize: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCanvaImport, setShowCanvaImport] = useState(false);

  useEffect(() => {
    fetchMedia();
    fetchStats();
  }, [fileType, search]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const response = await mediaService.getMediaLibrary({
        file_type: fileType || undefined,
        search: search || undefined,
        limit: 50
      });

      if (response.success && response.data) {
        setMedia(response.data);
      }
    } catch (error) {
      toast.error('Failed to load media library');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await mediaService.getMediaStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const fileArray = Array.from(files);
      const response = await mediaService.uploadMultipleMedia(fileArray);

      if (response.success && response.data) {
        toast.success(`Successfully uploaded ${response.data.length} file(s)`);
        fetchMedia();
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return;

    try {
      const response = await mediaService.deleteMedia(id);
      if (response.success) {
        toast.success('Media deleted successfully');
        fetchMedia();
        fetchStats();
      }
    } catch (error) {
      toast.error('Failed to delete media');
    }
  };

  const handleCanvaImport = async (url: string, name: string, type: 'image' | 'video') => {
    try {
      setUploading(true);
      const response = await mediaService.importFromUrl(url, {
        name,
        description: `Imported from Canva`,
        tags: ['canva', 'imported']
      });

      if (response.success && response.data) {
        toast.success(`Successfully imported ${name} from Canva`);
        fetchMedia();
        fetchStats();
        setShowCanvaImport(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to import from Canva');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Media Library</h1>
          <p className="text-gray-400 mt-1">
            Upload and manage your images and videos
          </p>
        </div>
        <div className="flex gap-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
            id="media-upload"
          />
          <label
            htmlFor="media-upload"
            className={`btn-primary cursor-pointer ${uploading ? 'opacity-50' : ''}`}
          >
            {uploading ? 'Uploading...' : '📁 Upload Media'}
          </label>
          <button
            onClick={() => setShowCanvaImport(!showCanvaImport)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Paintbrush className="h-4 w-4" />
            Import from Canva
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="text-gray-400 text-sm">Total Files</div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-gray-400 text-sm">Images</div>
          <div className="text-2xl font-bold text-white">{stats.images}</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-gray-400 text-sm">Videos</div>
          <div className="text-2xl font-bold text-white">{stats.videos}</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-gray-400 text-sm">Total Size</div>
          <div className="text-2xl font-bold text-white">{formatFileSize(stats.totalSize)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search media..."
              className="input-field w-full"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFileType(null)}
              className={`px-4 py-2 rounded-lg ${fileType === null ? 'bg-purple-600' : 'bg-gray-700'}`}
            >
              All
            </button>
            <button
              onClick={() => setFileType('image')}
              className={`px-4 py-2 rounded-lg ${fileType === 'image' ? 'bg-purple-600' : 'bg-gray-700'}`}
            >
              Images
            </button>
            <button
              onClick={() => setFileType('video')}
              className={`px-4 py-2 rounded-lg ${fileType === 'video' ? 'bg-purple-600' : 'bg-gray-700'}`}
            >
              Videos
            </button>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-400">Loading media...</div>
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400">No media found. Upload some files to get started!</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {media.map((item) => (
            <div key={item.id} className="glass-card p-4 group relative">
              {item.file_type === 'image' ? (
                <img
                  src={item.file_url}
                  alt={item.original_name}
                  className="w-full h-32 object-cover rounded-lg mb-2"
                />
              ) : (
                <div className="w-full h-32 bg-gray-800 rounded-lg mb-2 flex items-center justify-center">
                  <div className="text-4xl">🎬</div>
                </div>
              )}
              
              <div className="text-sm text-gray-300 truncate mb-1" title={item.original_name}>
                {item.original_name}
              </div>
              
              <div className="text-xs text-gray-500 mb-2">
                {formatFileSize(item.file_size)}
              </div>

              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {item.tags.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <a
                  href={item.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                >
                  View
                </a>
                {item.file_type === 'image' && (
                  <button
                    onClick={() => navigate(`/image-editor?image=${encodeURIComponent(item.file_url)}&id=${item.id}`)}
                    className="flex-1 text-center text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded flex items-center justify-center gap-1"
                    title="Edit Image"
                  >
                    <PencilIcon className="h-3 w-3" />
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex-1 text-center text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;

