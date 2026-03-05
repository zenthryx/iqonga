import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/api';

interface GeneratedImage {
  id: string;
  prompt: string;
  style: string;
  size: string;
  image_url: string;
  url?: string; // For backward compatibility
  ipfs_hash?: string;
  ipfs_uri?: string;
  metadata: any;
  status: string;
  created_at: string;
  agent_name?: string;
}

interface ImageGalleryProps {
  onImageSelect?: (image: GeneratedImage) => void;
  showSelection?: boolean;
  agentId?: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ 
  onImageSelect, 
  showSelection = false, 
  agentId 
}) => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchImages();
  }, [agentId]);

  const fetchImages = async (pageNum = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '12'
      });
      
      if (agentId) {
        params.append('agentId', agentId);
      }

      const response = await apiService.get(`/content/images?${params}&_t=${Date.now()}`);
      
      console.log('ImageGallery API Response:', response);
      
      if (response.success) {
        if (pageNum === 1) {
          setImages(response.data.images);
        } else {
          setImages(prev => [...prev, ...response.data.images]);
        }
        setHasMore(response.data.pagination.page < response.data.pagination.pages);
      } else {
        console.error('ImageGallery API Error:', response);
      }
    } catch (error: any) {
      console.error('Error fetching images:', error);
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchImages(nextPage);
  };

  const handleImageClick = (image: GeneratedImage) => {
    if (showSelection) {
      setSelectedImage(image.id);
      onImageSelect?.(image);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      await apiService.delete(`/content/images/${imageId}`);
      setImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('Image deleted successfully');
    } catch (error: any) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && images.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading images...</div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-300 mb-2">No images yet</h3>
        <p className="text-gray-400 mb-4">
          Generate your first image using the Image Generation tool!
        </p>
        <a
          href="/image-generation"
          className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Go to Image Generation
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className={`relative group bg-gray-800 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
              selectedImage === image.id 
                ? 'border-blue-500 ring-2 ring-blue-500/20' 
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="aspect-square relative">
              <img
                src={image.image_url || image.url}
                alt={image.prompt}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => handleImageClick(image)}
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                  {showSelection && (
                    <button
                      onClick={() => handleImageClick(image)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                    >
                      {selectedImage === image.id ? 'Selected' : 'Select'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
            
            {/* Image Info */}
            <div className="p-3">
              <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                {image.prompt}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{image.style}</span>
                <span>{formatDate(image.created_at)}</span>
              </div>
              {image.agent_name && (
                <div className="text-xs text-blue-400 mt-1">
                  by {image.agent_name}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
