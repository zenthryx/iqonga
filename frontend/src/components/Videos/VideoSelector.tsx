import React, { useState } from 'react';
import VideoGallery from './VideoGallery';
import { GeneratedVideo } from '@/services/imageService';
import { Video, X } from 'lucide-react';

interface VideoSelectorProps {
  selectedVideo: GeneratedVideo | null;
  onVideoSelect: (video: GeneratedVideo | null) => void;
  agentId?: string;
  className?: string;
}

const VideoSelector: React.FC<VideoSelectorProps> = ({ 
  selectedVideo, 
  onVideoSelect, 
  agentId,
  className = ''
}) => {
  const [showGallery, setShowGallery] = useState(false);

  const handleVideoSelect = (video: GeneratedVideo) => {
    onVideoSelect(video);
    setShowGallery(false);
  };

  const handleRemoveVideo = () => {
    onVideoSelect(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-300">
        Attach Video (Optional)
      </label>
      
      {selectedVideo ? (
        <div className="relative">
          <div className="flex items-center space-x-3 p-3 bg-gray-700 border border-gray-600 rounded-lg">
            {selectedVideo.videoUrl ? (
              <div className="relative w-24 h-16 bg-black rounded overflow-hidden flex-shrink-0">
                <video
                  src={selectedVideo.videoUrl}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                  <Video className="w-6 h-6 text-white" />
                </div>
              </div>
            ) : (
              <div className="w-24 h-16 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
                <Video className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white line-clamp-2 truncate">{selectedVideo.prompt}</p>
              <p className="text-xs text-gray-400">
                {selectedVideo.style} • {selectedVideo.duration}s • {selectedVideo.aspectRatio}
              </p>
              {selectedVideo.status && (
                <p className="text-xs text-gray-500 capitalize mt-1">Status: {selectedVideo.status}</p>
              )}
            </div>
            <button
              onClick={handleRemoveVideo}
              className="text-red-400 hover:text-red-300 p-1 flex-shrink-0"
              title="Remove video"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowGallery(true)}
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
        >
          <Video className="w-5 h-5" />
          <span>Select from Generated Videos</span>
        </button>
      )}

      {/* Video Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Select Video</h3>
                <button
                  onClick={() => setShowGallery(false)}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <VideoGallery 
                onVideoSelect={handleVideoSelect}
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

export default VideoSelector;

