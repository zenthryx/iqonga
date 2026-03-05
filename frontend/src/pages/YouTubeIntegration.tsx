import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Youtube, CheckCircle, XCircle, Upload, Video } from 'lucide-react';
import youtubeService, { YouTubeChannel } from '@/services/youtubeService';
import YouTubePostModal from '@/components/YouTube/YouTubePostModal';
import VideoGallery from '@/components/Videos/VideoGallery';
import { GeneratedVideo } from '@/services/imageService';

const YouTubeIntegration: React.FC = () => {
  const [channelInfo, setChannelInfo] = useState<YouTubeChannel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<GeneratedVideo | null>(null);

  useEffect(() => {
    loadChannelInfo();
  }, []);

  const loadChannelInfo = async () => {
    setIsLoading(true);
    try {
      const channel = await youtubeService.getChannel();
      setChannelInfo(channel);
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 404) {
        // Not connected - this is fine
        setChannelInfo(null);
      } else {
        console.error('Error loading channel:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { authUrl } = await youtubeService.initiateAuth();
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to initiate YouTube connection');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your YouTube account?')) {
      return;
    }

    try {
      await youtubeService.disconnect();
      setChannelInfo(null);
      toast.success('YouTube account disconnected successfully');
    } catch (error: any) {
      toast.error('Failed to disconnect YouTube account');
    }
  };

  const handleVideoSelect = (video: GeneratedVideo) => {
    if (video.videoUrl) {
      setSelectedVideo(video);
      setShowUploadModal(true);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            <span className="ml-3 text-gray-300">Loading YouTube integration...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
          <Youtube className="w-8 h-8 text-red-500" />
          <span>YouTube Integration</span>
        </h1>
        <p className="text-gray-400 mt-1">
          Connect your YouTube channel and upload AI-generated videos directly
        </p>
      </div>

      {/* Connection Status */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Connection Status</h2>
        
        {channelInfo ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-white font-medium">{channelInfo.title}</p>
                  <p className="text-sm text-gray-400">Channel ID: {channelInfo.channelId}</p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Disconnect
              </button>
            </div>

            {/* Channel Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-sm text-gray-400">Subscribers</p>
                <p className="text-2xl font-bold text-white">
                  {parseInt(channelInfo.subscriberCount || '0').toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-sm text-gray-400">Total Videos</p>
                <p className="text-2xl font-bold text-white">
                  {parseInt(channelInfo.videoCount || '0').toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-sm text-gray-400">Total Views</p>
                <p className="text-2xl font-bold text-white">
                  {parseInt(channelInfo.viewCount || '0').toLocaleString()}
                </p>
              </div>
            </div>

            {channelInfo.thumbnail && (
              <div className="flex items-center space-x-4">
                <img
                  src={channelInfo.thumbnail}
                  alt={channelInfo.title}
                  className="w-24 h-24 rounded-full object-cover"
                />
                <div>
                  <p className="text-white font-medium">{channelInfo.title}</p>
                  {channelInfo.description && (
                    <p className="text-sm text-gray-400 line-clamp-2">{channelInfo.description}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <XCircle className="w-6 h-6 text-yellow-400" />
                <div>
                  <p className="text-white font-medium">Not Connected</p>
                  <p className="text-sm text-gray-400">
                    Connect your YouTube channel to start uploading videos
                  </p>
                </div>
              </div>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Youtube className="w-4 h-4" />
                    <span>Connect YouTube</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-300 mb-2">What you can do:</h3>
              <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                <li>Upload AI-generated videos directly to your YouTube channel</li>
                <li>Set video titles, descriptions, tags, and privacy settings</li>
                <li>Manage your uploaded videos from the dashboard</li>
                <li>Schedule video uploads (coming soon)</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Upload Videos Section */}
      {channelInfo && (
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
              <Upload className="w-5 h-5" />
              <span>Upload Videos to YouTube</span>
            </h2>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <Video className="w-4 h-4" />
              <span>Upload Video</span>
            </button>
          </div>

          <p className="text-gray-400 mb-4">
            Select a video from your generated videos to upload to YouTube
          </p>

          <VideoGallery
            onVideoSelect={handleVideoSelect}
            showYouTubeButton={true}
            onYouTubeUpload={handleVideoSelect}
          />
        </div>
      )}

      {/* YouTube Upload Modal */}
      <YouTubePostModal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setSelectedVideo(null);
        }}
        selectedVideo={selectedVideo}
        onSuccess={() => {
          toast.success('Video uploaded to YouTube successfully!');
          loadChannelInfo(); // Refresh channel stats
        }}
      />
    </div>
  );
};

export default YouTubeIntegration;

