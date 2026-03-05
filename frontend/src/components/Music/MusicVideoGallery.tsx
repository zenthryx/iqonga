import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { imageService, GeneratedMusicVideo } from '@/services/imageService';
import { Play, Pause, Download, Video, Clock, Loader2 } from 'lucide-react';

interface MusicVideoGalleryProps {
  onVideoSelect?: (video: GeneratedMusicVideo) => void;
  showSelection?: boolean;
  agentId?: string;
  musicId?: string;
}

const MusicVideoGallery: React.FC<MusicVideoGalleryProps> = ({ 
  onVideoSelect, 
  showSelection = false, 
  agentId,
  musicId
}) => {
  const [videos, setVideos] = useState<GeneratedMusicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [videoElements, setVideoElements] = useState<Map<string, HTMLVideoElement>>(new Map());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, [agentId, musicId]);

  useEffect(() => {
    // Cleanup video elements on unmount
    return () => {
      videoElements.forEach(video => {
        video.pause();
        video.src = '';
      });
    };
  }, []);

  const fetchVideos = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await imageService.getMusicVideos({
        page: pageNum,
        limit: 12,
        agentId: agentId,
        musicId: musicId
      });
      
      if (response.success && response.data) {
        const newVideos = response.data.videos || [];
        if (pageNum === 1) {
          setVideos(newVideos);
        } else {
          setVideos(prev => [...prev, ...newVideos]);
        }
        setHasMore(newVideos.length === 12);
        setPage(pageNum);
      }
    } catch (error: any) {
      console.error('Failed to fetch music videos:', error);
      toast.error('Failed to load music videos');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = (video: GeneratedMusicVideo) => {
    if (!video.videoUrl) {
      toast.error('Video is still processing');
      return;
    }

    const videoId = video.id;
    let videoElement = videoElements.get(videoId);

    if (!videoElement) {
      videoElement = document.createElement('video');
      videoElement.crossOrigin = 'anonymous';
      videoElement.preload = 'metadata';
      
      const videoUrl = video.videoUrl.startsWith('http') 
        ? video.videoUrl 
        : `${process.env.REACT_APP_API_URL || 'https://ajentrix.com'}${video.videoUrl}`;
      
      videoElement.src = videoUrl;
      setVideoElements(new Map(videoElements.set(videoId, videoElement)));
    }

    if (playingId === videoId) {
      videoElement.pause();
      setPlayingId(null);
    } else {
      // Pause all other videos
      videoElements.forEach((el, id) => {
        if (id !== videoId) {
          el.pause();
        }
      });
      
      videoElement.play().catch(err => {
        console.error('Error playing video:', err);
        toast.error('Failed to play video');
      });
      setPlayingId(videoId);
    }
  };

  const handleRecover = async (video: GeneratedMusicVideo) => {
    try {
      toast.loading('Checking video status...', { id: 'recover-video' });
      
      const response = await imageService.recoverMusicVideo({ videoId: video.id });
      
      if (response.success) {
        if (response.data?.status === 'completed') {
          toast.success('Video is ready!', { id: 'recover-video' });
          // Refresh the gallery to show the updated video
          fetchVideos(page);
        } else if (response.data?.status === 'failed') {
          toast.error('Video generation failed', { id: 'recover-video' });
          fetchVideos(page);
        } else {
          toast('Video is still processing. Please check again later.', { 
            id: 'recover-video',
            icon: '⏳'
          });
        }
      } else {
        toast.error(response.error || 'Failed to check video status', { id: 'recover-video' });
      }
    } catch (error: any) {
      console.error('Recovery error:', error);
      toast.error(error.response?.data?.error || 'Failed to check video status', { id: 'recover-video' });
    }
  };

  const handleDownload = async (video: GeneratedMusicVideo) => {
    if (!video.videoUrl) {
      toast.error('Video is still processing');
      return;
    }

    try {
      const videoUrl = video.videoUrl.startsWith('http') 
        ? video.videoUrl 
        : `${process.env.REACT_APP_API_URL || 'https://ajentrix.com'}${video.videoUrl}`;
      
      const response = await fetch(videoUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error('Failed to download video');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `music-video-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Video downloaded');
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('Failed to download video');
    }
  };

  const handleSelect = (video: GeneratedMusicVideo) => {
    if (showSelection && onVideoSelect) {
      setSelectedVideo(video.id);
      onVideoSelect(video);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'processing':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'processing') {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    return null;
  };

  if (loading && videos.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">No music videos generated yet</p>
        <p className="text-gray-500 text-sm mt-2">Generate a music video from your music tracks</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => {
          const isPlaying = playingId === video.id;
          const isSelected = selectedVideo === video.id;
          const videoUrl = video.videoUrl 
            ? (video.videoUrl.startsWith('http') 
                ? video.videoUrl 
                : `${process.env.REACT_APP_API_URL || 'https://ajentrix.com'}${video.videoUrl}`)
            : null;

          return (
            <div
              key={video.id}
              className={`glass-card p-4 hover:bg-gray-700/50 transition-all ${
                isSelected ? 'ring-2 ring-purple-500' : ''
              } ${showSelection ? 'cursor-pointer' : ''}`}
              onClick={() => handleSelect(video)}
            >
              <div className="relative aspect-video bg-gray-800 rounded-lg mb-3 overflow-hidden">
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    preload="metadata"
                    muted
                    loop
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    {video.status === 'processing' ? (
                      <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
                    ) : (
                      <Video className="w-12 h-12 text-gray-600" />
                    )}
                  </div>
                )}
                
                {/* Play/Pause Overlay */}
                {videoUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPause(video);
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-12 h-12 text-white" />
                    ) : (
                      <Play className="w-12 h-12 text-white" />
                    )}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${getStatusColor(video.status)} flex items-center gap-2`}>
                    {getStatusIcon(video.status)}
                    {video.status}
                  </span>
                  {video.duration && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {video.duration}s
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="px-2 py-1 bg-gray-700 rounded">{video.provider}</span>
                  {video.avatarId && (
                    <span className="px-2 py-1 bg-gray-700 rounded">Avatar: {video.avatarId.substring(0, 8)}...</span>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  {videoUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(video);
                      }}
                      className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  )}
                  {video.status === 'processing' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecover(video);
                      }}
                      className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Clock className="w-4 h-4" />
                      Check Status
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => fetchVideos(page + 1)}
            disabled={loading}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default MusicVideoGallery;

