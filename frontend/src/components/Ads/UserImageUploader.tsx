import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  PhotoIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import ImageManipulationEditor from './ImageManipulationEditor';

interface UserImage {
  id: string;
  image_name: string;
  image_category: string;
  file_url: string;
  description?: string;
  tags: string[];
  width: number;
  height: number;
  created_at: string;
}

interface UserImageUploaderProps {
  onImageSelect?: (imageUrl: string, imageId?: string) => void;
  selectedImageId?: string;
  category?: string;
  showEditor?: boolean;
}

const UserImageUploader: React.FC<UserImageUploaderProps> = ({
  onImageSelect,
  selectedImageId,
  category,
  showEditor = true
}) => {
  const [images, setImages] = useState<UserImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');
  const [editingImage, setEditingImage] = useState<UserImage | null>(null);
  const [viewingImage, setViewingImage] = useState<UserImage | null>(null);

  const categories = [
    { id: 'all', name: 'All Images' },
    { id: 'ad_creative', name: 'Ad Creatives' },
    { id: 'background', name: 'Backgrounds' },
    { id: 'product', name: 'Products' },
    { id: 'lifestyle', name: 'Lifestyle' },
    { id: 'other', name: 'Other' }
  ];

  useEffect(() => {
    loadImages();
  }, [selectedCategory]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      
      const response = await apiService.get('/user-images', params);
      if (response.success) {
        setImages(response.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load images:', error);
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('image_name', file.name);
      formData.append('image_category', selectedCategory !== 'all' ? selectedCategory : 'ad_creative');

      const response = await apiService.post('/user-images/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.success) {
        toast.success('Image uploaded successfully!');
        await loadImages();
      } else {
        throw new Error(response.error || 'Failed to upload image');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleImageDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const response = await apiService.delete(`/user-images/${imageId}`);
      if (response.success) {
        toast.success('Image deleted successfully');
        await loadImages();
        if (viewingImage?.id === imageId) {
          setViewingImage(null);
        }
      } else {
        throw new Error(response.error || 'Failed to delete image');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete image');
    }
  };

  const filteredImages = images.filter(img => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        img.image_name.toLowerCase().includes(query) ||
        img.description?.toLowerCase().includes(query) ||
        img.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <PhotoIcon className="h-5 w-5 text-purple-400" />
            Your Images
          </h3>
          <p className="text-sm text-gray-400 mt-1">Upload and manage images for ad creation</p>
        </div>
        <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-2">
          <ArrowUpTrayIcon className="h-5 w-5" />
          Upload Image
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search images..."
            className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Images Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading images...</div>
      ) : filteredImages.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className={`bg-gray-700 rounded-lg p-3 relative group cursor-pointer transition-all ${
                selectedImageId === image.id ? 'ring-2 ring-purple-500' : ''
              }`}
              onClick={() => {
                if (onImageSelect) {
                  onImageSelect(image.file_url, image.id);
                } else {
                  setViewingImage(image);
                }
              }}
            >
              <div className="relative w-full h-32 rounded overflow-hidden bg-gray-600 mb-2">
                <img
                  src={image.file_url}
                  alt={image.image_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    {showEditor && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingImage(image);
                        }}
                        className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageDelete(image.id);
                      }}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-white text-xs truncate">{image.image_name}</p>
              {image.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {image.tags.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-700/50 rounded-lg">
          <PhotoIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No images found</p>
          <p className="text-sm text-gray-500 mt-2">
            {searchQuery ? 'Try a different search term' : 'Upload your first image to get started'}
          </p>
        </div>
      )}

      {/* Image Editor Modal */}
      {editingImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl w-full max-w-6xl my-8 border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Edit Image</h3>
              <button
                onClick={() => setEditingImage(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              <ImageManipulationEditor
                imageUrl={editingImage.file_url}
                imageId={editingImage.id}
                imageType="user_uploaded"
                onSave={(newUrl) => {
                  toast.success('Image edited successfully!');
                  setEditingImage(null);
                  loadImages();
                }}
                onClose={() => setEditingImage(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Image View Modal */}
      {viewingImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-4xl border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">{viewingImage.image_name}</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {viewingImage.width} × {viewingImage.height}px • {viewingImage.image_category}
                </p>
              </div>
              <button
                onClick={() => setViewingImage(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              <img
                src={viewingImage.file_url}
                alt={viewingImage.image_name}
                className="w-full h-auto rounded-lg mb-4"
              />
              {viewingImage.description && (
                <p className="text-gray-300 mb-2">{viewingImage.description}</p>
              )}
              {viewingImage.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {viewingImage.tags.map((tag, idx) => (
                    <span key={idx} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                {onImageSelect && (
                  <button
                    onClick={() => {
                      onImageSelect(viewingImage.file_url, viewingImage.id);
                      setViewingImage(null);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Use This Image
                  </button>
                )}
                {showEditor && (
                  <button
                    onClick={() => {
                      setEditingImage(viewingImage);
                      setViewingImage(null);
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Edit Image
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserImageUploader;

