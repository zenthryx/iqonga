import React, { useState } from 'react';
import ImageGallery from './ImageGallery';

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

interface ImageSelectorProps {
  selectedImage: GeneratedImage | null;
  onImageSelect: (image: GeneratedImage | null) => void;
  agentId?: string;
  className?: string;
}

const ImageSelector: React.FC<ImageSelectorProps> = ({ 
  selectedImage, 
  onImageSelect, 
  agentId,
  className = ''
}) => {
  const [showGallery, setShowGallery] = useState(false);

  const handleImageSelect = (image: GeneratedImage) => {
    onImageSelect(image);
    setShowGallery(false);
  };

  const handleRemoveImage = () => {
    onImageSelect(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-300">
        Attach Image (Optional)
      </label>
      
      {selectedImage ? (
        <div className="relative">
          <div className="flex items-center space-x-3 p-3 bg-gray-700 border border-gray-600 rounded-lg">
            <img
              src={selectedImage.image_url || selectedImage.url}
              alt={selectedImage.prompt}
              className="w-16 h-16 object-cover rounded"
            />
            <div className="flex-1">
              <p className="text-sm text-white line-clamp-2">{selectedImage.prompt}</p>
              <p className="text-xs text-gray-400">{selectedImage.style} • {selectedImage.size}</p>
            </div>
            <button
              onClick={handleRemoveImage}
              className="text-red-400 hover:text-red-300 p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowGallery(true)}
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Select from Generated Images</span>
        </button>
      )}

      {/* Image Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Select Image</h3>
                <button
                  onClick={() => setShowGallery(false)}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ImageGallery 
                onImageSelect={handleImageSelect}
                showSelection={true}
                agentId={agentId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageSelector;
