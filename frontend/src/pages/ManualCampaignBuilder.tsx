import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  CalendarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowLeftIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';

interface CampaignPost {
  id?: string;
  platform: string;
  format: string;
  scheduledTime: string;
  contentText?: string;
  contentConfig?: any;
  status: string;
  smartAdId?: string;
}

interface ManualCampaign {
  id?: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  platforms: string[];
  posts?: CampaignPost[];
  metadata?: any;
}

const ManualCampaignBuilder: React.FC = () => {
  const [campaigns, setCampaigns] = useState<ManualCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<ManualCampaign | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState<CampaignPost | null>(null);
  const [availableAds, setAvailableAds] = useState<any[]>([]);
  const [showAIAssist, setShowAIAssist] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  // Form state
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  // Post form state
  const [postPlatform, setPostPlatform] = useState('facebook');
  const [postFormat, setPostFormat] = useState('feed');
  const [postScheduledTime, setPostScheduledTime] = useState('');
  const [postContentText, setPostContentText] = useState('');
  const [postSelectedAdId, setPostSelectedAdId] = useState<string>('');

  const platforms = [
    { id: 'facebook', name: 'Facebook', formats: ['feed', 'story', 'reel'] },
    { id: 'instagram', name: 'Instagram', formats: ['feed', 'story', 'reel'] },
    { id: 'twitter', name: 'Twitter', formats: ['tweet', 'thread'] },
    { id: 'linkedin', name: 'LinkedIn', formats: ['post', 'article'] },
    { id: 'tiktok', name: 'TikTok', formats: ['video'] },
    { id: 'youtube', name: 'YouTube', formats: ['short', 'video'] }
  ];

  useEffect(() => {
    loadCampaigns();
    loadAvailableAds();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/manual-campaigns');
      if (response.success) {
        setCampaigns(response.data || []);
      }
    } catch (error: any) {
      toast.error('Failed to load campaigns: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableAds = async () => {
    try {
      const response = await apiService.get('/smart-ads/history');
      if (response.success) {
        setAvailableAds(response.data || []);
      }
    } catch (error) {
      // Silently fail - ads are optional
    }
  };

  const loadCampaign = async (id: string) => {
    try {
      setLoading(true);
      const response = await apiService.get(`/manual-campaigns/${id}`);
      if (response.success) {
        setSelectedCampaign(response.data);
        setCampaignName(response.data.name);
        setCampaignDescription(response.data.description || '');
        setStartDate(response.data.start_date || '');
        setEndDate(response.data.end_date || '');
        setSelectedPlatforms(Array.isArray(response.data.platforms) ? response.data.platforms : []);
        setIsEditing(true);
      }
    } catch (error: any) {
      toast.error('Failed to load campaign: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = () => {
    setSelectedCampaign(null);
    setIsCreating(true);
    setIsEditing(false);
    setCampaignName('');
    setCampaignDescription('');
    setStartDate('');
    setEndDate('');
    setSelectedPlatforms([]);
  };

  const handleSaveCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error('Campaign name is required');
      return;
    }

    try {
      setLoading(true);
      if (selectedCampaign?.id) {
        // Update existing
        const response = await apiService.put(`/manual-campaigns/${selectedCampaign.id}`, {
          name: campaignName,
          description: campaignDescription,
          startDate,
          endDate,
          platforms: selectedPlatforms,
          status: selectedCampaign.status
        });
        if (response.success) {
          toast.success('Campaign updated successfully');
          await loadCampaigns();
          setIsCreating(false);
          setIsEditing(false);
        }
      } else {
        // Create new
        const response = await apiService.post('/manual-campaigns', {
          name: campaignName,
          description: campaignDescription,
          startDate,
          endDate,
          platforms: selectedPlatforms
        });
        if (response.success) {
          toast.success('Campaign created successfully');
          await loadCampaigns();
          await loadCampaign(response.data.id);
          setIsCreating(false);
        }
      }
    } catch (error: any) {
      toast.error('Failed to save campaign: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddPost = () => {
    setEditingPost(null);
    setPostPlatform('facebook');
    setPostFormat('feed');
    setPostScheduledTime('');
    setPostContentText('');
    setPostSelectedAdId('');
    setShowPostModal(true);
  };

  const handleEditPost = (post: CampaignPost) => {
    setEditingPost(post);
    setPostPlatform(post.platform);
    setPostFormat(post.format);
    setPostScheduledTime(post.scheduledTime);
    setPostContentText(post.contentText || '');
    setPostSelectedAdId(post.smartAdId || '');
    setShowPostModal(true);
  };

  const handleSavePost = async () => {
    if (!selectedCampaign?.id) {
      toast.error('Please save the campaign first');
      return;
    }

    if (!postScheduledTime) {
      toast.error('Scheduled time is required');
      return;
    }

    try {
      setLoading(true);
      const postData = {
        platform: postPlatform,
        format: postFormat,
        scheduledTime: postScheduledTime,
        contentText: postContentText,
        contentConfig: {},
        smartAdId: postSelectedAdId || null
      };

      if (editingPost?.id) {
        // Update existing post
        const response = await apiService.put(
          `/manual-campaigns/${selectedCampaign.id}/posts/${editingPost.id}`,
          postData
        );
        if (response.success) {
          toast.success('Post updated successfully');
          await loadCampaign(selectedCampaign.id);
          setShowPostModal(false);
        }
      } else {
        // Create new post
        const response = await apiService.post(
          `/manual-campaigns/${selectedCampaign.id}/posts`,
          postData
        );
        if (response.success) {
          toast.success('Post added successfully');
          await loadCampaign(selectedCampaign.id);
          setShowPostModal(false);
        }
      }
    } catch (error: any) {
      toast.error('Failed to save post: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!selectedCampaign?.id) return;
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      setLoading(true);
      const response = await apiService.delete(
        `/manual-campaigns/${selectedCampaign.id}/posts/${postId}`
      );
      if (response.success) {
        toast.success('Post deleted successfully');
        await loadCampaign(selectedCampaign.id);
      }
    } catch (error: any) {
      toast.error('Failed to delete post: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerateContent = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    try {
      setLoading(true);
      // Call AI service to generate content
      const response = await apiService.post('/ai-content/generate', {
        prompt: aiPrompt,
        type: 'social_media_post',
        platforms: selectedPlatforms
      });

      if (response.success && response.data) {
        setPostContentText(response.data.content || '');
        toast.success('AI content generated!');
        setShowAIAssist(false);
      }
    } catch (error: any) {
      toast.error('Failed to generate AI content: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isCreating || isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(false);
                    setSelectedCampaign(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {isEditing ? 'Edit Campaign' : 'Create Manual Campaign'}
                </h1>
              </div>
              <button
                onClick={handleSaveCampaign}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                <CheckCircleIcon className="h-5 w-5" />
                Save Campaign
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Summer Product Launch"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={selectedCampaign?.status || 'draft'}
                  onChange={(e) => {
                    if (selectedCampaign) {
                      setSelectedCampaign({ ...selectedCampaign, status: e.target.value });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={campaignDescription}
                  onChange={(e) => setCampaignDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your campaign goals and strategy..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 mb-3">
                  Platforms
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {platforms.map((platform) => (
                    <label
                      key={platform.id}
                      className="flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{
                        borderColor: selectedPlatforms.includes(platform.id)
                          ? '#3b82f6'
                          : '#e5e7eb'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes(platform.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPlatforms([...selectedPlatforms, platform.id]);
                          } else {
                            setSelectedPlatforms(
                              selectedPlatforms.filter((p) => p !== platform.id)
                            );
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="font-medium">{platform.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {selectedCampaign?.id && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Campaign Posts</h2>
                  <button
                    onClick={handleAddPost}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add Post
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedCampaign.posts && selectedCampaign.posts.length > 0 ? (
                    selectedCampaign.posts.map((post) => (
                      <div
                        key={post.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                              {post.platform}
                            </span>
                            <span className="text-sm text-gray-600">{post.format}</span>
                            <ClockIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {formatDate(post.scheduledTime)}
                            </span>
                            {post.status === 'draft' && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                                Draft
                              </span>
                            )}
                          </div>
                          {post.contentText && (
                            <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                              {post.contentText}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditPost(post)}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <PencilIcon className="h-5 w-5 text-blue-600" />
                          </button>
                          <button
                            onClick={() => post.id && handleDeletePost(post.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <TrashIcon className="h-5 w-5 text-red-600" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No posts yet. Click "Add Post" to get started.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Post Modal */}
        {showPostModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {editingPost ? 'Edit Post' : 'Add Post'}
                </h2>
                <button
                  onClick={() => setShowPostModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Platform *
                    </label>
                    <select
                      value={postPlatform}
                      onChange={(e) => {
                        setPostPlatform(e.target.value);
                        const platform = platforms.find((p) => p.id === e.target.value);
                        if (platform && platform.formats.length > 0) {
                          setPostFormat(platform.formats[0]);
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {platforms.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Format *
                    </label>
                    <select
                      value={postFormat}
                      onChange={(e) => setPostFormat(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {platforms
                        .find((p) => p.id === postPlatform)
                        ?.formats.map((f) => (
                          <option key={f} value={f}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={postScheduledTime}
                    onChange={(e) => setPostScheduledTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Use Existing Ad (Optional)
                  </label>
                  <select
                    value={postSelectedAdId}
                    onChange={(e) => setPostSelectedAdId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None - Create new content</option>
                    {availableAds.map((ad) => (
                      <option key={ad.id} value={ad.id}>
                        {ad.platforms?.join(', ') || 'Ad'} - {ad.headline || 'No headline'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Content Text
                    </label>
                    <button
                      onClick={() => setShowAIAssist(!showAIAssist)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <SparklesIcon className="h-4 w-4" />
                      AI Assist
                    </button>
                  </div>
                  {showAIAssist && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                      <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Describe what you want to post..."
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg mb-2"
                      />
                      <button
                        onClick={handleAIGenerateContent}
                        disabled={loading}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        Generate with AI
                      </button>
                    </div>
                  )}
                  <textarea
                    value={postContentText}
                    onChange={(e) => setPostContentText(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your post content..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowPostModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePost}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {editingPost ? 'Update' : 'Add'} Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Manual Campaign Builder
            </h1>
            <p className="text-gray-600">
              Create and manage campaigns manually with full control and AI assistance
            </p>
          </div>
          <button
            onClick={handleCreateCampaign}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
          >
            <PlusIcon className="h-5 w-5" />
            Create Campaign
          </button>
        </div>

        {loading && campaigns.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No campaigns yet</h2>
            <p className="text-gray-500 mb-6">
              Create your first manual campaign to get started
            </p>
            <button
              onClick={handleCreateCampaign}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => campaign.id && loadCampaign(campaign.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">{campaign.name}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      campaign.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : campaign.status === 'scheduled'
                        ? 'bg-blue-100 text-blue-700'
                        : campaign.status === 'completed'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {campaign.status}
                  </span>
                </div>

                {campaign.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {campaign.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  {campaign.startDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Start: {new Date(campaign.startDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {campaign.platforms && campaign.platforms.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {campaign.platforms.map((platform) => (
                        <span
                          key={platform}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-500">
                    {campaign.posts?.length || 0} posts
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (campaign.id) loadCampaign(campaign.id);
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Edit →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualCampaignBuilder;

