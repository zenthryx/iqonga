import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { imageService, GeneratedVideo } from '@/services/imageService';
import { Play, Trash2, Download, Youtube } from 'lucide-react';

interface VideoGalleryProps {
  onVideoSelect?: (video: GeneratedVideo) => void;
  showSelection?: boolean;
  agentId?: string;
  showYouTubeButton?: boolean;
  onYouTubeUpload?: (video: GeneratedVideo) => void;
}

const VideoGallery: React.FC<VideoGalleryProps> = ({ 
  onVideoSelect, 
  showSelection = false, 
  agentId,
  showYouTubeButton = false,
  onYouTubeUpload
}) => {
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, [agentId]);

  const fetchVideos = async (pageNum = 1) => {
    try {
      setLoading(true);
      console.log('VideoGallery: Fetching videos, page:', pageNum);
      const response = await imageService.getGeneratedVideos({
        page: pageNum,
        limit: 12,
        agentId: agentId
      });
      
      console.log('VideoGallery: API Response:', response);
      
      if (response.success && response.data) {
        const videosList = response.data.videos || [];
        console.log('VideoGallery: Received', videosList.length, 'videos');
        
        if (pageNum === 1) {
          setVideos(videosList);
        } else {
          setVideos(prev => [...prev, ...videosList]);
        }
        setHasMore(response.data.pagination.page < response.data.pagination.pages);
      } else {
        console.error('VideoGallery API Error:', response);
        if (!response.success) {
          toast.error(response.error || 'Failed to load videos');
        }
      }
    } catch (error: any) {
      console.error('Error fetching videos:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || error.message || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVideos(nextPage);
  };

  const handleVideoClick = (video: GeneratedVideo) => {
    if (showSelection) {
      setSelectedVideo(video.id);
      onVideoSelect?.(video);
    } else if (onVideoSelect) {
      // Allow selection even without showSelection mode (for extension feature)
      onVideoSelect(video);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      // TODO: Add delete video endpoint
      toast.success('Video deleted successfully');
      setVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (error: any) {
      toast.error('Failed to delete video');
      console.error('Error deleting video:', error);
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

  if (loading && videos.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading videos...</div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-300 mb-2">No videos yet</h3>
        <p className="text-gray-400 mb-4">
          Generate your first video using the Video Generation tool!
        </p>
        <a
          href="/video-generation"
          className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Go to Video Generation
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video) => (
          <div
            key={video.id}
            className={`relative group bg-gray-800 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
              selectedVideo === video.id 
                ? 'border-blue-500 ring-2 ring-blue-500/20' 
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="aspect-video relative bg-black">
              {video.videoUrl ? (
                <video
                  src={video.videoUrl}
                  className="w-full h-full object-cover cursor-pointer"
                  preload="metadata"
                  onClick={() => handleVideoClick(video)}
                  onMouseEnter={(e) => {
                    if (onVideoSelect) {
                      e.currentTarget.style.opacity = '0.8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center bg-gray-900 cursor-pointer"
                  onClick={() => handleVideoClick(video)}
                >
                  <Play className="w-12 h-12 text-gray-600" />
                </div>
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                  {showSelection && (
                    <button
                      onClick={() => handleVideoClick(video)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                    >
                      {selectedVideo === video.id ? 'Selected' : 'Select'}
                    </button>
                  )}
                  {video.videoUrl && (
                    <>
                      <a
                        href={video.videoUrl}
                        download
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium flex items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </a>
                      {showYouTubeButton && onYouTubeUpload && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onYouTubeUpload(video);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium flex items-center"
                        >
                          <Youtube className="w-3 h-3 mr-1" />
                          YouTube
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVideo(video.id);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Status Badge */}
              {video.status && (
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    video.status === 'completed' 
                      ? 'bg-green-600 text-white' 
                      : video.status === 'pending' 
                      ? 'bg-yellow-600 text-white' 
                      : 'bg-red-600 text-white'
                  }`}>
                    {video.status}
                  </span>
                </div>
              )}
            </div>
            
            {/* Video Info */}
            <div className="p-3">
              <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                {video.prompt}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{video.style || 'N/A'}</span>
                <span>{video.createdAt ? formatDate(video.createdAt) : video.created_at ? formatDate(video.created_at) : 'N/A'}</span>
              </div>
              {video.duration && (
                <div className="text-xs text-gray-500 mt-1">
                  {video.duration}s • {video.aspectRatio || '16:9'}
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

export default VideoGallery;

