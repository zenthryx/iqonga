import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import VideoSelector from '../Videos/VideoSelector';
import { GeneratedVideo, imageService } from '@/services/imageService';
import youtubeService, { YouTubeUploadRequest, YouTubePlaylist } from '@/services/youtubeService';
import { Youtube, X, Upload, Globe, Lock, Eye, Image, Sparkles, Loader } from 'lucide-react';

interface YouTubePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVideo?: GeneratedVideo | null;
  onSuccess?: (result: any) => void;
}

const YouTubePostModal: React.FC<YouTubePostModalProps> = ({
  isOpen,
  onClose,
  selectedVideo: initialSelectedVideo,
  onSuccess
}) => {
  const [selectedVideo, setSelectedVideo] = useState<GeneratedVideo | null>(initialSelectedVideo || null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [privacyStatus, setPrivacyStatus] = useState<'private' | 'unlisted' | 'public'>('private');
  const [categoryId, setCategoryId] = useState('22'); // People & Blogs
  const [isUploading, setIsUploading] = useState(false);
  const [channelInfo, setChannelInfo] = useState<any>(null);
  const [isLoadingChannel, setIsLoadingChannel] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [madeForKids, setMadeForKids] = useState(false);
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load channel info and playlists
      loadChannelInfo();
      loadPlaylists();
      
      // Pre-fill title and description from video if available
      if (selectedVideo) {
        if (!title && selectedVideo.prompt) {
          setTitle(selectedVideo.prompt.substring(0, 100)); // YouTube title limit
        }
        if (!description && selectedVideo.videoScript) {
          setDescription(selectedVideo.videoScript.substring(0, 5000)); // YouTube description limit
        }
      }
    }
  }, [isOpen, selectedVideo]);

  const loadChannelInfo = async () => {
    setIsLoadingChannel(true);
    try {
      const channel = await youtubeService.getChannel();
      setChannelInfo(channel);
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 404) {
        toast.error('YouTube account not connected. Please connect your YouTube account first.');
      } else {
        toast.error('Failed to load YouTube channel info');
      }
    } finally {
      setIsLoadingChannel(false);
    }
  };

  const loadPlaylists = async () => {
    setIsLoadingPlaylists(true);
    try {
      const playlistsList = await youtubeService.getPlaylists();
      setPlaylists(playlistsList);
    } catch (error: any) {
      // Don't show error for playlists - it's optional
      console.warn('Failed to load playlists:', error);
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setThumbnailUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateThumbnail = async () => {
    if (!title.trim()) {
      toast.error('Please enter a video title first to generate a thumbnail');
      return;
    }

    setIsGeneratingThumbnail(true);
    try {
      const prompt = `YouTube thumbnail for video titled "${title}". Eye-catching, professional, high contrast, bold text overlay, engaging design, 1280x720 aspect ratio`;
      const response = await imageService.generateImage({
        prompt,
        style: 'realistic',
        size: '1024x1024'
      });

      if (response.success && response.data && response.data.length > 0) {
        setThumbnailUrl(response.data[0].url);
        toast.success('Thumbnail generated successfully!');
      } else {
        toast.error('Failed to generate thumbnail');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate thumbnail');
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedVideo || !selectedVideo.videoUrl) {
      toast.error('Please select a video to upload');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a video title');
      return;
    }

    setIsUploading(true);
    try {
      const uploadRequest: YouTubeUploadRequest = {
        videoUrl: selectedVideo.videoUrl,
        videoId: selectedVideo.id,
        title: title.trim(),
        description: description.trim() || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
        categoryId,
        privacyStatus,
        thumbnailUrl: thumbnailUrl || undefined,
        madeForKids,
        playlistIds: selectedPlaylistIds.length > 0 ? selectedPlaylistIds : undefined
      };

      const result = await youtubeService.uploadVideo(uploadRequest);

      toast.success('Video uploaded to YouTube successfully!');
      onSuccess?.(result);
      handleClose();
    } catch (error: any) {
      console.error('Error uploading to YouTube:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to upload video to YouTube');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedVideo(null);
    setTitle('');
    setDescription('');
    setTags('');
    setPrivacyStatus('private');
    setCategoryId('22');
    setThumbnailUrl(null);
    setMadeForKids(false);
    setSelectedPlaylistIds([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <Youtube className="w-8 h-8 text-red-500" />
              <div>
                <h2 className="text-2xl font-bold text-white">Upload to YouTube</h2>
                {channelInfo && (
                  <p className="text-sm text-gray-400">{channelInfo.title}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
              disabled={isUploading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Channel Info */}
          {isLoadingChannel ? (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <div className="animate-pulse text-gray-400">Loading channel info...</div>
            </div>
          ) : !channelInfo ? (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-300">
                YouTube account not connected. Please connect your YouTube account in settings.
              </p>
            </div>
          ) : null}

          {/* Video Selection */}
          <div className="mb-6">
            <VideoSelector
              selectedVideo={selectedVideo}
              onVideoSelect={setSelectedVideo}
            />
          </div>

          {/* Video Preview */}
          {selectedVideo && selectedVideo.videoUrl && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Video Preview
              </label>
              <video
                src={selectedVideo.videoUrl}
                className="w-full rounded-lg bg-black"
                controls
                preload="metadata"
                style={{ maxHeight: '300px' }}
              />
            </div>
          )}

          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title * <span className="text-gray-400">({title.length}/100)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.substring(0, 100))}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Enter video title..."
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description <span className="text-gray-400">({description.length}/5000)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.substring(0, 5000))}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={6}
              placeholder="Enter video description..."
              maxLength={5000}
            />
          </div>

          {/* Tags */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="tag1, tag2, tag3..."
            />
            <p className="text-xs text-gray-400 mt-1">Separate tags with commas</p>
          </div>

          {/* Privacy Status */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Privacy Status
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPrivacyStatus('private')}
                className={`p-3 rounded-lg border-2 transition-colors flex items-center justify-center space-x-2 ${
                  privacyStatus === 'private'
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Private</span>
              </button>
              <button
                onClick={() => setPrivacyStatus('unlisted')}
                className={`p-3 rounded-lg border-2 transition-colors flex items-center justify-center space-x-2 ${
                  privacyStatus === 'unlisted'
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Unlisted</span>
              </button>
              <button
                onClick={() => setPrivacyStatus('public')}
                className={`p-3 rounded-lg border-2 transition-colors flex items-center justify-center space-x-2 ${
                  privacyStatus === 'public'
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Public</span>
              </button>
            </div>
          </div>

          {/* Thumbnail */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Thumbnail (Optional)
            </label>
            <div className="space-y-3">
              {thumbnailUrl && (
                <div className="relative">
                  <img
                    src={thumbnailUrl}
                    alt="Thumbnail preview"
                    className="w-full h-48 object-cover rounded-lg border-2 border-gray-600"
                  />
                  <button
                    onClick={() => setThumbnailUrl(null)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <label className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 cursor-pointer text-center flex items-center justify-center space-x-2">
                  <Image className="w-4 h-4" />
                  <span>Upload Thumbnail</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailUpload}
                  />
                </label>
                <button
                  onClick={handleGenerateThumbnail}
                  disabled={isGeneratingThumbnail || !title.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 border border-blue-500 rounded-lg text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isGeneratingThumbnail ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate with AI</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Upload a custom thumbnail or generate one using AI. Recommended size: 1280x720px
              </p>
            </div>
          </div>

          {/* Playlists */}
          {playlists.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Add to Playlists (Optional)
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-600 rounded-lg p-2 bg-gray-700">
                {isLoadingPlaylists ? (
                  <div className="text-center text-gray-400 py-4">Loading playlists...</div>
                ) : (
                  playlists.map((playlist) => (
                    <label
                      key={playlist.id}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-600 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlaylistIds.includes(playlist.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPlaylistIds([...selectedPlaylistIds, playlist.id]);
                          } else {
                            setSelectedPlaylistIds(selectedPlaylistIds.filter(id => id !== playlist.id));
                          }
                        }}
                        className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-300">{playlist.title}</span>
                      <span className="text-xs text-gray-500">({playlist.itemCount} videos)</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Made for Kids */}
          <div className="mb-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={madeForKids}
                onChange={(e) => setMadeForKids(e.target.checked)}
                className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
              />
              <span className="text-sm text-gray-300">
                Made for Kids (COPPA compliance)
              </span>
            </label>
            <p className="text-xs text-gray-400 mt-1">
              Select this if your video is made for kids. This affects how YouTube handles your content.
            </p>
          </div>

          {/* Category */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="22">People & Blogs</option>
              <option value="1">Film & Animation</option>
              <option value="2">Autos & Vehicles</option>
              <option value="10">Music</option>
              <option value="15">Pets & Animals</option>
              <option value="17">Sports</option>
              <option value="19">Travel & Events</option>
              <option value="20">Gaming</option>
              <option value="23">Comedy</option>
              <option value="24">Entertainment</option>
              <option value="25">News & Politics</option>
              <option value="26">Howto & Style</option>
              <option value="27">Education</option>
              <option value="28">Science & Technology</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading || !selectedVideo || !title.trim() || !channelInfo}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload to YouTube
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubePostModal;

