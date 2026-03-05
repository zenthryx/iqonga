import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import ImageGallery from '../Images/ImageGallery';
import VideoSelector from '../Videos/VideoSelector';
import { GeneratedVideo } from '@/services/imageService';

interface TelegramGroup {
  id: string;
  chat_id: number;
  title: string;
  chat_type: string;
  bot_username: string;
  is_active: boolean;
}

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

interface TelegramPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  initialContent?: string;
  onSuccess?: (result: any) => void;
}

const TelegramPostModal: React.FC<TelegramPostModalProps> = ({
  isOpen,
  onClose,
  agentId,
  agentName,
  initialContent = '',
  onSuccess
}) => {
  const [groups, setGroups] = useState<TelegramGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [content, setContent] = useState(initialContent);
  const [contentType, setContentType] = useState('message');
  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<GeneratedVideo | null>(null);
  const [showImageGallery, setShowImageGallery] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchGroups();
      setContent(initialContent);
    }
  }, [isOpen, initialContent]);

  const fetchGroups = async () => {
    setIsLoadingGroups(true);
    try {
      const response = await fetch('/api/telegram/groups', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(data.data?.groups || []);
      } else {
        toast.error('Failed to load Telegram groups');
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load Telegram groups');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const handlePost = async () => {
    if (!selectedGroupId) {
      toast.error('Please select a Telegram group');
      return;
    }

    if (!content.trim()) {
      toast.error('Please enter content to post');
      return;
    }

    setIsPosting(true);
    try {
      const selectedGroup = groups.find(g => g.id === selectedGroupId);
      if (!selectedGroup) {
        toast.error('Selected group not found');
        return;
      }

      const response = await fetch(`/api/agents/${agentId}/post-to-telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          content: content.trim(),
          chatId: selectedGroup.chat_id,
          contentType: contentType,
          imageId: selectedImage?.id || null,
          videoId: selectedVideo?.id || null
        })
      });

      const result = await response.json();

      if (response.ok) {
        if (result.queued) {
          toast.success('Message queued due to rate limit. It will be posted automatically.');
        } else {
          toast.success('Message posted to Telegram successfully!');
        }
        
        onSuccess?.(result);
        onClose();
      } else {
        toast.error(result.error || 'Failed to post to Telegram');
      }
    } catch (error) {
      console.error('Error posting to Telegram:', error);
      toast.error('Failed to post to Telegram');
    } finally {
      setIsPosting(false);
    }
  };

  const handleClose = () => {
    setSelectedGroupId('');
    setContent('');
    setContentType('message');
    setSelectedImage(null);
    setSelectedVideo(null);
    setShowImageGallery(false);
    onClose();
  };

  const handleImageSelect = (image: GeneratedImage) => {
    setSelectedImage(image);
    setShowImageGallery(false);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Post to Telegram</h2>
              <p className="text-gray-300">Post content using {agentName}</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Group Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Telegram Group *
              </label>
              {isLoadingGroups ? (
                <div className="flex items-center justify-center p-4 border border-gray-600 rounded-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                  <span className="ml-2 text-gray-300">Loading groups...</span>
                </div>
              ) : groups.length === 0 ? (
                <div className="p-4 border border-gray-600 rounded-lg text-center text-gray-300">
                  <p>No Telegram groups connected</p>
                  <p className="text-sm mt-1">
                    <a href="/telegram" className="text-blue-400 hover:underline">
                      Connect a Telegram group first
                    </a>
                  </p>
                </div>
              ) : (
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a group...</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.title} (@{group.bot_username}) - {group.chat_type}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Content Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="message">Message</option>
                <option value="announcement">Announcement</option>
                <option value="update">Update</option>
                <option value="promotion">Promotion</option>
              </select>
            </div>

            {/* Image Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                <div className="space-y-2">
                  <button
                    onClick={() => setShowImageGallery(true)}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Select from Generated Images</span>
                  </button>
                </div>
              )}
            </div>

            {/* Video Selection */}
            <VideoSelector
              selectedVideo={selectedVideo}
              onVideoSelect={setSelectedVideo}
              agentId={agentId}
            />

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Content *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your message content..."
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={6}
                maxLength={4096}
              />
              <div className="text-right text-sm text-gray-400 mt-1">
                {content.length}/4096 characters
              </div>
            </div>

            {/* Preview */}
            {selectedGroupId && content && (
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium text-white mb-2">Preview</h4>
                <div className="bg-gray-600 p-3 rounded border border-gray-500">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {agentName.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-2">
                      <div className="font-medium text-sm text-white">{agentName}</div>
                      <div className="text-xs text-gray-300">
                        {groups.find(g => g.id === selectedGroupId)?.title}
                      </div>
                    </div>
                  </div>
                  {selectedImage && (
                    <div className="mb-3">
                      <img
                        src={selectedImage.image_url || selectedImage.url}
                        alt={selectedImage.prompt}
                        className="max-w-full h-auto rounded-lg"
                      />
                    </div>
                  )}
                  {selectedVideo && selectedVideo.videoUrl && (
                    <div className="mb-3">
                      <video
                        src={selectedVideo.videoUrl}
                        className="max-w-full h-auto rounded-lg"
                        controls
                        preload="metadata"
                      />
                    </div>
                  )}
                  <div className="text-sm text-gray-100 whitespace-pre-wrap">{content}</div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-8">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
              disabled={isPosting}
            >
              Cancel
            </button>
            <button
              onClick={handlePost}
              disabled={isPosting || !selectedGroupId || !content.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isPosting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Posting...
                </>
              ) : (
                'Post to Telegram'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Image Gallery Modal */}
      {showImageGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Select Image</h3>
                <button
                  onClick={() => setShowImageGallery(false)}
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
                agentId={undefined}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelegramPostModal;
