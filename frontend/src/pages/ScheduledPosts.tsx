import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  CalendarIcon, 
  ClockIcon, 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  EyeIcon,
  SparklesIcon,
  DocumentTextIcon,
  LightBulbIcon,
  PhotoIcon,
  FilmIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { imageService } from '../services/imageService';

interface ScheduledPostContentConfig {
  include_hashtags?: boolean;
  include_mentions?: boolean;
  tone?: string;
  focus_on_company?: boolean;
  auto_generate_image?: boolean;
  image_prompt_hint?: string;
}

interface ScheduledPost {
  id: string;
  agent: {
    id: string;
    name: string;
    personality_type: string;
    avatar_url?: string;
  };
  platform: string;
  content_type: string;
  content_text?: string;
  content_config?: ScheduledPostContentConfig;
  media_urls?: string[];
  scheduled_time: string;
  timezone: string;
  frequency: string;
  status: string;
  next_run: string;
  run_count: number;
  max_runs: number;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  personality_type: string;
  platforms: string[];
}

const ScheduledPosts: React.FC = () => {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    agent_id: '',
    platform: 'twitter',
    content_type: 'tweet',
    content_text: '',
    media_urls: [] as string[],
    scheduled_time: '',
    timezone: 'UTC',
    frequency: 'once',
    max_runs: 1,
    telegram_chat_id: '',
    content_config: {
      include_hashtags: true,
      include_mentions: false,
      tone: 'professional',
      focus_on_company: true,
      auto_generate_image: false,
      image_prompt_hint: ''
    }
  });

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [telegramGroups, setTelegramGroups] = useState<any[]>([]);
  const [imagePrompt, setImagePrompt] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');

  useEffect(() => {
    fetchScheduledPosts();
    fetchAgents();
    fetchTelegramGroups();
  }, []);

  const fetchScheduledPosts = async () => {
    try {
      const response = await apiService.get('/scheduled-posts');
      if (response.success) {
        setScheduledPosts(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch scheduled posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await apiService.get('/agents') as any;
      if (response.success && response.data) {
        setAgents(response.data);
      } else if (response.success && response.agents) {
        // Fallback for backward compatibility
        setAgents(response.agents);
      }
    } catch (error) {
      toast.error('Failed to fetch agents');
    }
  };

  const fetchTelegramGroups = async () => {
    try {
      const response = await fetch('/api/telegram/groups', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Telegram groups:', data.data?.groups); // Debug log
        setTelegramGroups(data.data?.groups || []);
      }
    } catch (error) {
      console.error('Failed to fetch Telegram groups:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.platform === 'telegram' && !formData.telegram_chat_id) {
      toast.error('Please select a Telegram group');
      return;
    }
    
    try {
      if (editingPost) {
        await apiService.put(`/scheduled-posts/${editingPost.id}`, formData);
        toast.success('Scheduled post updated successfully');
      } else {
        await apiService.post('/scheduled-posts', formData);
        toast.success('Scheduled post created successfully');
      }
      
      setShowCreateModal(false);
      setEditingPost(null);
      resetForm();
      fetchScheduledPosts();
    } catch (error) {
      toast.error('Failed to save scheduled post');
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled post?')) return;
    
    try {
      await apiService.delete(`/scheduled-posts/${postId}`);
      toast.success('Scheduled post deleted successfully');
      fetchScheduledPosts();
    } catch (error) {
      toast.error('Failed to delete scheduled post');
    }
  };

  const pausePost = async (id: string) => {
    try {
      await apiService.post(`/scheduled-posts/${id}/pause`);
      toast.success('Scheduled post paused successfully');
      fetchScheduledPosts();
    } catch (error) {
      toast.error('Failed to pause scheduled post');
    }
  };

  const resumePost = async (id: string) => {
    try {
      await apiService.post(`/scheduled-posts/${id}/resume`);
      toast.success('Scheduled post resumed successfully');
      fetchScheduledPosts();
    } catch (error) {
      toast.error('Failed to resume scheduled post');
    }
  };

  const resetForm = () => {
    setFormData({
      agent_id: '',
      platform: 'twitter',
      content_type: 'tweet',
      content_text: '',
      media_urls: [],
      scheduled_time: '',
      timezone: 'UTC',
      frequency: 'once',
      max_runs: 1,
      telegram_chat_id: '',
      content_config: {
        include_hashtags: true,
        include_mentions: false,
        tone: 'professional',
        focus_on_company: true,
        auto_generate_image: false,
        image_prompt_hint: ''
      }
    });
    setShowPreview(false);
    setShowSuggestions(false);
    setSuggestions([]);
    setImagePrompt('');
    setVideoPrompt('');
    setMediaUrlInput('');
  };

  const openEditModal = (post: ScheduledPost) => {
    setEditingPost(post);
    setFormData({
      agent_id: post.agent.id,
      platform: post.platform,
      content_type: post.content_type,
      content_text: post.content_text || '',
      media_urls: post.media_urls || [],
      scheduled_time: new Date(post.scheduled_time).toISOString().slice(0, 16),
      timezone: post.timezone || 'UTC',
      frequency: post.frequency,
      max_runs: post.max_runs,
      telegram_chat_id: (post as any).telegram_chat_id || '',
      content_config: {
        include_hashtags: post.content_config?.include_hashtags !== false,
        include_mentions: post.content_config?.include_mentions === true,
        tone: post.content_config?.tone || 'professional',
        focus_on_company: post.content_config?.focus_on_company !== false,
        auto_generate_image: post.content_config?.auto_generate_image === true,
        image_prompt_hint: post.content_config?.image_prompt_hint || ''
      }
    });
    setShowCreateModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'running': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'once': return 'One Time';
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return frequency;
    }
  };

  // Content templates for quick selection
  const contentTemplates = [
    {
      name: 'Company Update',
      content: 'Exciting news from our team! We\'ve been working hard to bring you the latest updates and improvements. Stay tuned for more details! 🚀',
      type: 'tweet'
    },
    {
      name: 'Industry Insight',
      content: 'The landscape is evolving rapidly. Here\'s what we\'re seeing and how it might impact our industry. What are your thoughts? 🤔',
      type: 'tweet'
    },
    {
      name: 'Product Highlight',
      content: 'Did you know? Our latest feature helps you [specific benefit]. It\'s designed to make your workflow more efficient and productive! 💡',
      type: 'tweet'
    },
    {
      name: 'Customer Success',
      content: 'Nothing makes us happier than seeing our customers succeed! Here\'s a great example of how [product] is making a difference. 🎉',
      type: 'tweet'
    },
    {
      name: 'Tips & Tricks',
      content: 'Pro tip: [specific tip related to your industry/product]. This simple trick can save you time and improve your results! ✨',
      type: 'tweet'
    }
  ];

  // Generate content suggestions
  const generateSuggestions = async () => {
    if (!formData.agent_id) {
      toast.error('Please select an agent first');
      return;
    }

    setIsGeneratingSuggestions(true);
    try {
      const response = await apiService.post('/content/generate-suggestions', {
        agent_id: formData.agent_id,
        content_type: formData.content_type,
        platform: formData.platform,
        count: 3
      });

      console.log('AI Suggestions Response:', response);

      if (response.success) {
        // Extract suggestions from response
        const responseData = response.data || response;
        const suggestions = responseData.suggestions || [];
        setSuggestions(suggestions);
        setShowSuggestions(true);
        
        if (suggestions.length > 0) {
          toast.success(`Generated ${suggestions.length} suggestions`);
        } else {
          toast.error('No suggestions generated');
        }
      } else {
        toast.error('Failed to generate suggestions');
      }
    } catch (error) {
      toast.error('Failed to generate suggestions');
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Apply content template
  const applyTemplate = (template: any) => {
    setFormData({
      ...formData,
      content_text: template.content
    });
    toast.success(`Applied ${template.name} template`);
  };

  // Generate image and add to media
  const handleGenerateImage = async () => {
    const prompt = imagePrompt.trim() || formData.content_text?.trim() || 'Professional social media image, engaging and high quality';
    if (!prompt && !imagePrompt.trim()) {
      toast.error('Enter an image prompt or add content first');
      return;
    }
    setIsGeneratingImage(true);
    try {
      const response = await imageService.generateImage({
        prompt: prompt.slice(0, 500),
        style: (formData.content_config?.tone as any) === 'casual' ? 'artistic' : 'photographic',
        size: '1024x1024',
        n: 1
      });
      const data = response.data as any;
      const url = Array.isArray(data) ? data[0]?.url : data?.url;
      if (url) {
        setFormData(prev => ({ ...prev, media_urls: [...(prev.media_urls || []), url] }));
        toast.success('Image generated and added to post');
        setImagePrompt('');
      } else {
        toast.error('Image generated but no URL returned');
      }
    } catch (err: any) {
      if (!err?._handledByInterceptor) toast.error(err?.response?.data?.message || 'Failed to generate image');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Generate video and add to media (may take 1–2 min)
  const handleGenerateVideo = async () => {
    const prompt = videoPrompt.trim() || formData.content_text?.trim() || 'Short engaging social video';
    if (!prompt && !videoPrompt.trim()) {
      toast.error('Enter a video prompt or add content first');
      return;
    }
    setIsGeneratingVideo(true);
    try {
      const response = await imageService.generateVideo({
        prompt: prompt.slice(0, 500),
        duration: 5,
        style: 'cinematic',
        generateActualVideo: true
      });
      const data = response.data as any;
      const url = data?.videoUrl || data?.url;
      if (url) {
        setFormData(prev => ({ ...prev, media_urls: [...(prev.media_urls || []), url] }));
        toast.success('Video generated and added to post');
        setVideoPrompt('');
      } else if (data?.id) {
        toast.success('Video is generating (1–2 min). Add the video URL from Media Library when ready.');
      } else {
        toast.error('Video generation started but URL not yet available');
      }
    } catch (err: any) {
      if (!err?._handledByInterceptor) toast.error(err?.response?.data?.message || 'Failed to generate video');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const addMediaUrl = () => {
    const url = mediaUrlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setFormData(prev => ({ ...prev, media_urls: [...(prev.media_urls || []), url] }));
    setMediaUrlInput('');
    toast.success('Media URL added');
  };

  const removeMediaUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      media_urls: (prev.media_urls || []).filter((_, i) => i !== index)
    }));
  };

  // Get character count for Twitter
  const getCharacterCount = () => {
    return formData.content_text.length;
  };

  // Get remaining characters
  const getRemainingCharacters = () => {
    return 280 - formData.content_text.length;
  };

  // Check if content is valid (Twitter: max 280 chars; empty is valid – AI generates at publish time)
  const isContentValid = () => {
    if (formData.platform === 'twitter') {
      return formData.content_text.length <= 280;
    }
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Scheduled Posts</h1>
            <p className="text-gray-400 mt-2">Manage your AI agent's automated content schedule</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Schedule New Post
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-400">Total Scheduled</p>
                <p className="text-2xl font-bold text-white">{scheduledPosts.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-400">Active</p>
                <p className="text-2xl font-bold text-white">
                  {scheduledPosts.filter(p => p.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">T</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Twitter Posts</p>
                <p className="text-2xl font-bold text-white">
                  {scheduledPosts.filter(p => p.platform === 'twitter').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.61 7.59c-.12.56-.44.7-.89.44l-2.46-1.81-1.19 1.15c-.13.13-.24.24-.49.24l.18-2.56 4.57-4.13c.2-.18-.04-.28-.31-.1l-5.64 3.55-2.43-.76c-.53-.16-.54-.53.11-.79l9.46-3.65c.44-.16.83.1.69.79z"/>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Telegram Posts</p>
                <p className="text-2xl font-bold text-white">
                  {scheduledPosts.filter(p => p.platform === 'telegram').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">R</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Recurring</p>
                <p className="text-2xl font-bold text-white">
                  {scheduledPosts.filter(p => p.frequency !== 'once').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scheduled Posts List */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6">Upcoming Posts</h2>
          
          {scheduledPosts.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No scheduled posts</h3>
              <p className="text-gray-500 mb-4">Get started by scheduling your first automated post</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                Schedule Your First Post
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledPosts.map((post) => (
                <div key={post.id} className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {post.agent.name.charAt(0)}
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-white">{post.agent.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}>
                          {post.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                        <span className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {new Date(post.scheduled_time).toLocaleString()}
                        </span>
                        <span className="flex items-center">
                          <div className="h-3 w-3 bg-blue-500 rounded-full mr-1"></div>
                          {post.platform}
                        </span>
                        {(post.media_urls?.length ?? 0) > 0 && (
                          <span className="flex items-center text-purple-300" title="Has media">
                            <PhotoIcon className="h-4 w-4 mr-0.5" />
                            {post.media_urls!.length}
                          </span>
                        )}
                        <span>{getFrequencyLabel(post.frequency)}</span>
                        {post.frequency !== 'once' && (
                          <span className="text-yellow-400">
                            {post.run_count}/{post.max_runs || '∞'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(post)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    
                    {/* Pause/Resume Button */}
                    {post.status === 'active' ? (
                      <button
                        onClick={() => pausePost(post.id)}
                        className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Pause post"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    ) : post.status === 'paused' ? (
                      <button
                        onClick={() => resumePost(post.id)}
                        className="p-2 text-green-400 hover:text-green-300 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Resume post"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 0118 0z" />
                        </svg>
                      </button>
                    ) : null}
                    
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {editingPost ? 'Edit Scheduled Post' : 'Schedule New Post'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPost(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Configuration */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Basic Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      AI Agent *
                    </label>
                    <select
                      value={formData.agent_id}
                      onChange={(e) => setFormData({...formData, agent_id: e.target.value})}
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select an agent</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.personality_type})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Platform
                    </label>
                    <select
                      value={formData.platform}
                      onChange={(e) => setFormData({...formData, platform: e.target.value, content_type: e.target.value === 'telegram' ? 'message' : 'tweet'})}
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="twitter">Twitter</option>
                      <option value="telegram">Telegram</option>
                    </select>
                  </div>

                  {/* Telegram Group Selection */}
                  {formData.platform === 'telegram' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Telegram Group *
                      </label>
                      {telegramGroups.length === 0 ? (
                        <div className="p-3 border border-gray-500 rounded-lg text-center text-gray-400">
                          <p>No Telegram groups connected</p>
                          <p className="text-sm mt-1">
                            <a href="/telegram" className="text-blue-400 hover:underline">
                              Connect a Telegram group first
                            </a>
                          </p>
                        </div>
                      ) : (() => {
                        // Filter groups by selected agent if an agent is selected
                        const filteredGroups = formData.agent_id 
                          ? telegramGroups.filter(g => g.agent_id === formData.agent_id)
                          : telegramGroups;
                        
                        return (
                          <>
                            <select
                              value={formData.telegram_chat_id}
                              onChange={(e) => {
                                const selectedChatId = e.target.value;
                                // Find the selected group and auto-select its agent
                                const selectedGroup = telegramGroups.find(g => g.chat_id === selectedChatId);
                                if (selectedGroup && selectedGroup.agent_id) {
                                  setFormData({
                                    ...formData, 
                                    telegram_chat_id: selectedChatId,
                                    agent_id: selectedGroup.agent_id
                                  });
                                } else {
                                  setFormData({...formData, telegram_chat_id: selectedChatId});
                                }
                              }}
                              className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                              <option value="">Select a Telegram group...</option>
                              {filteredGroups.map((group) => (
                                <option key={group.id} value={group.chat_id}>
                                  {group.title} (@{group.bot_username}) - {group.chat_type}
                                </option>
                              ))}
                            </select>
                            {formData.agent_id && filteredGroups.length === 0 && (
                              <p className="mt-1 text-xs text-yellow-400">
                                No Telegram groups connected for this agent. <a href="/telegram" className="underline">Connect one</a>
                              </p>
                            )}
                            {formData.agent_id && filteredGroups.length > 0 && (
                              <p className="mt-1 text-xs text-gray-400">
                                Showing {filteredGroups.length} group(s) for selected agent
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Content Type
                    </label>
                    <select
                      value={formData.content_type}
                      onChange={(e) => setFormData({...formData, content_type: e.target.value})}
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {formData.platform === 'twitter' ? (
                        <>
                          <option value="tweet">Tweet</option>
                          <option value="image_post">Image Post</option>
                          <option value="video_post">Video Post</option>
                          <option value="thread">Thread</option>
                          <option value="reply">Reply</option>
                          <option value="story">Story</option>
                          <option value="tip">Tip</option>
                        </>
                      ) : (
                        <>
                          <option value="message">Message</option>
                          <option value="announcement">Announcement</option>
                          <option value="update">Update</option>
                          <option value="promotion">Promotion</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Timezone
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Scheduling Configuration */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  Scheduling
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Scheduled Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.scheduled_time}
                      onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Frequency
                    </label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="once">One Time</option>
                      <option value="hourly">Every Hour</option>
                      <option value="every_4_hours">Every 4 Hours</option>
                      <option value="every_6_hours">Every 6 Hours</option>
                      <option value="every_12_hours">Every 12 Hours</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Runs
                    </label>
                    <input
                      type="number"
                      value={formData.max_runs}
                      onChange={(e) => setFormData({...formData, max_runs: Math.max(0, parseInt(e.target.value) || 0)})}
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-400 mt-1">Set to 0 for unlimited runs</p>
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <DocumentTextIcon className="h-5 w-5 mr-2" />
                    Content
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={generateSuggestions}
                      disabled={isGeneratingSuggestions}
                      className="flex items-center px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      <SparklesIcon className="h-4 w-4 mr-1" />
                      {isGeneratingSuggestions ? 'Generating...' : 'AI Suggestions'}
                    </button>
                  </div>
                </div>

                {/* Quick Templates */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quick Templates
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {contentTemplates.map((template, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition-colors"
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Media: Image & Video generation */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                    <PhotoIcon className="h-4 w-4 mr-1" />
                    Images &amp; Video
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Add AI-generated images or videos, or paste a media URL. Twitter: up to 4 images or 1 video. Telegram: one image or video with caption.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <input
                      type="text"
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Image prompt (or leave empty to use post content)"
                      className="flex-1 min-w-[200px] bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage}
                      className="flex items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      <PhotoIcon className="h-4 w-4 mr-1" />
                      {isGeneratingImage ? 'Generating...' : 'Generate image'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <input
                      type="text"
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      placeholder="Video prompt (or leave empty to use post content)"
                      className="flex-1 min-w-[200px] bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateVideo}
                      disabled={isGeneratingVideo}
                      className="flex items-center px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      <FilmIcon className="h-4 w-4 mr-1" />
                      {isGeneratingVideo ? 'Generating...' : 'Generate video'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <input
                      type="url"
                      value={mediaUrlInput}
                      onChange={(e) => setMediaUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMediaUrl())}
                      placeholder="Paste image or video URL"
                      className="flex-1 min-w-[200px] bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      type="button"
                      onClick={addMediaUrl}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm"
                    >
                      Add URL
                    </button>
                  </div>
                  {(formData.media_urls?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.media_urls.map((url, idx) => (
                        <div key={idx} className="relative group">
                          {/\.(mp4|webm|mov|gif)(\?|$)/i.test(url) ? (
                            <div className="w-20 h-20 bg-gray-600 rounded-lg flex items-center justify-center">
                              <FilmIcon className="h-8 w-8 text-gray-400" />
                            </div>
                          ) : (
                            <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeMediaUrl(idx)}
                            className="absolute -top-1 -right-1 p-0.5 bg-red-600 hover:bg-red-700 rounded-full text-white"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Content (Optional - AI will generate if empty)
                  </label>
                  <textarea
                    value={formData.content_text}
                    onChange={(e) => setFormData({...formData, content_text: e.target.value})}
                    rows={4}
                    className={`w-full bg-gray-600 border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      isContentValid() ? 'border-gray-500' : 'border-red-500'
                    }`}
                    placeholder="Leave empty to let AI generate content based on agent personality..."
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className={`text-sm ${formData.platform === 'twitter' && getCharacterCount() > 280 ? 'text-red-400' : 'text-gray-400'}`}>
                      {formData.platform === 'twitter' ? `${getCharacterCount()}/280 characters` : `${getCharacterCount()} characters`}
                    </span>
                    {formData.platform === 'twitter' && getCharacterCount() > 280 && (
                      <span className="text-sm text-red-400">Content too long for Twitter</span>
                    )}
                  </div>
                </div>

                {/* Content Configuration */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tone
                    </label>
                    <select
                      value={formData.content_config.tone}
                      onChange={(e) => setFormData({
                        ...formData,
                        content_config: { ...formData.content_config, tone: e.target.value }
                      })}
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="friendly">Friendly</option>
                      <option value="enthusiastic">Enthusiastic</option>
                      <option value="informative">Informative</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.content_config.include_hashtags}
                        onChange={(e) => setFormData({
                          ...formData,
                          content_config: { ...formData.content_config, include_hashtags: e.target.checked }
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-300">Include hashtags</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.content_config.focus_on_company}
                        onChange={(e) => setFormData({
                          ...formData,
                          content_config: { ...formData.content_config, focus_on_company: e.target.checked }
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-300">Focus on company</span>
                    </label>
                  </div>
                </div>
                {/* When post runs (automated): agent generates content and optionally image */}
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <p className="text-sm font-medium text-gray-300 mb-2">When post runs (automated)</p>
                  <p className="text-xs text-gray-400 mb-3">
                    The agent will generate post content from your company details and knowledge base. You can also have an image generated automatically at publish time.
                  </p>
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.content_config.auto_generate_image === true}
                      onChange={(e) => setFormData({
                        ...formData,
                        content_config: { ...formData.content_config, auto_generate_image: e.target.checked }
                      })}
                      className="mt-1 mr-2"
                    />
                    <span className="text-sm text-gray-300">
                      Auto-generate image when post runs (uses company context and post content; credits apply)
                    </span>
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      value={formData.content_config.image_prompt_hint || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        content_config: { ...formData.content_config, image_prompt_hint: e.target.value }
                      })}
                      placeholder="Image prompt hint (optional – e.g. 'product shot', 'team photo')"
                      className="w-full mt-1 bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* AI Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <LightBulbIcon className="h-5 w-5 mr-2" />
                    AI Suggestions
                  </h3>
                  <div className="space-y-3">
                    {suggestions.map((suggestion, index) => (
                      <div key={index} className="bg-gray-600 rounded-lg p-3">
                        <p className="text-white mb-2">{suggestion}</p>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, content_text: suggestion})}
                          className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors"
                        >
                          Use This
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              {showPreview && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <EyeIcon className="h-5 w-5 mr-2" />
                    Preview
                  </h3>
                  <div className="bg-gray-600 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {agents.find(a => a.id === formData.agent_id)?.name.charAt(0) || 'A'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {agents.find(a => a.id === formData.agent_id)?.name || 'AI Agent'}
                        </p>
                        <p className="text-sm text-gray-400">
                          {formData.scheduled_time ? new Date(formData.scheduled_time).toLocaleString() : 'Scheduled time'}
                        </p>
                      </div>
                    </div>
                    {(formData.media_urls?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {formData.media_urls.map((url, i) =>
                          /\.(mp4|webm|mov|gif)(\?|$)/i.test(url) ? (
                            <div key={i} className="w-16 h-16 bg-gray-500 rounded flex items-center justify-center">
                              <FilmIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          ) : (
                            <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded" />
                          )
                        )}
                      </div>
                    )}
                    <p className="text-white">
                      {formData.content_text || (formData.media_urls?.length ? 'Caption for media' : 'AI will generate content based on agent personality and company information...')}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPost(null);
                    resetForm();
                  }}
                  className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isContentValid()}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingPost ? 'Update Post' : 'Schedule Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledPosts;
