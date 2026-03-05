import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { mediaService, UploadedMedia } from '../services/mediaService';
import { toast } from 'react-hot-toast';
import ImageManipulationEditor from '../components/Ads/ImageManipulationEditor';
import {
  PhotoIcon,
  ArrowLeftIcon,
  FolderOpenIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const ImageEditor: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const imageUrlParam = searchParams.get('image');
  const imageIdParam = searchParams.get('id');

  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(imageUrlParam);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(imageIdParam);
  const [showLibrary, setShowLibrary] = useState(!imageUrlParam);
  const [libraryImages, setLibraryImages] = useState<UploadedMedia[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (showLibrary) {
      loadLibraryImages();
    }
  }, [showLibrary, searchQuery]);

  const loadLibraryImages = async () => {
    try {
      setLoadingLibrary(true);
      const response = await mediaService.getMediaLibrary({
        file_type: 'image',
        search: searchQuery || undefined,
        limit: 100
      });

      if (response.success && response.data) {
        setLibraryImages(response.data);
      }
    } catch (error) {
      console.error('Failed to load library images:', error);
      toast.error('Failed to load image library');
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleImageSelect = (image: UploadedMedia) => {
    setSelectedImageUrl(image.file_url);
    setSelectedImageId(image.id);
    setShowLibrary(false);
    // Update URL without navigation
    window.history.replaceState({}, '', `/image-editor?image=${encodeURIComponent(image.file_url)}&id=${image.id}`);
  };

  const handleSave = async (editedImageUrl: string) => {
    try {
      // If we have an imageId, we could update the media library entry
      // For now, just show success
      toast.success('Image edited successfully!');
      // Optionally reload library to show updated image
      if (showLibrary) {
        loadLibraryImages();
      }
    } catch (error) {
      console.error('Failed to save edited image:', error);
      toast.error('Failed to save edited image');
    }
  };

  const handleClose = () => {
    navigate('/media-library');
  };

  const handleNewImage = () => {
    setShowLibrary(true);
    setSelectedImageUrl(null);
    setSelectedImageId(null);
    window.history.replaceState({}, '', '/image-editor');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <div className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Back to Media Library"
              >
                <ArrowLeftIcon className="h-6 w-6 text-gray-400" />
              </button>
              <div className="flex items-center gap-3">
                <PhotoIcon className="h-8 w-8 text-purple-400" />
                <div>
                  <h1 className="text-2xl font-bold text-white">Image Editor</h1>
                  <p className="text-sm text-gray-400">Edit and enhance your images</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!showLibrary && selectedImageUrl && (
                <button
                  onClick={handleNewImage}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <FolderOpenIcon className="h-5 w-5" />
                  Select from Library
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Close"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
        {showLibrary ? (
          /* Image Library Selection */
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur rounded-2xl border border-gray-700/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Select Image to Edit</h2>
                <div className="flex-1 max-w-md ml-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search images..."
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {loadingLibrary ? (
                <div className="text-center py-12 text-gray-400">Loading images...</div>
              ) : libraryImages.length === 0 ? (
                <div className="text-center py-12 bg-gray-700/30 rounded-lg">
                  <PhotoIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No images found</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {searchQuery ? 'Try a different search term' : 'Upload images in Media Library to get started'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {libraryImages.map((image) => (
                    <button
                      key={image.id}
                      onClick={() => handleImageSelect(image)}
                      className="bg-gray-700/50 hover:bg-gray-700 rounded-lg p-3 transition-all group cursor-pointer border-2 border-transparent hover:border-purple-500"
                    >
                      <div className="relative w-full aspect-square rounded overflow-hidden bg-gray-800 mb-2">
                        <img
                          src={image.file_url}
                          alt={image.original_name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium">
                            Edit
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 truncate" title={image.original_name}>
                        {image.original_name}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Image Editor - Allow editing even without image (for Logo Maker) */
          <div className="bg-gray-800/50 backdrop-blur rounded-2xl border border-gray-700/50 overflow-hidden">
            <div className="h-[calc(100vh-200px)]">
              <ImageManipulationEditor
                imageUrl={selectedImageUrl || undefined}
                imageId={selectedImageId || undefined}
                imageType="user_uploaded"
                onSave={handleSave}
                onClose={handleClose}
                onImageUpdate={(newUrl) => {
                  setSelectedImageUrl(newUrl);
                  // Update URL
                  window.history.replaceState({}, '', `/image-editor?image=${encodeURIComponent(newUrl)}&id=${selectedImageId || ''}`);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageEditor;

