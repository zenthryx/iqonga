import React, { useState, useEffect } from 'react';
import { imageService } from '@/services/imageService';
import VideoGallery from '@/components/Videos/VideoGallery';
import toast from 'react-hot-toast';
import { Video, User, Music, Languages, Loader2 } from 'lucide-react';
import { useServicePricing } from '@/hooks/useServicePricing';

type TabType = 'text-to-avatar' | 'audio-lip-sync' | 'video-translation';

interface HeyGenVideoRequest {
  script: string;
  avatarId?: string;
  voiceId?: string;
  background?: string;
  aspectRatio?: string;
  resolution?: string;
}

const HeyGenAvatarVideos: React.FC = () => {
  // Pricing hooks
  const { getPricing } = useServicePricing();
  const textToAvatarPricing = getPricing('heygen_text_to_avatar');
  const audioLipSyncPricing = getPricing('heygen_audio_lip_sync');
  
  const [activeTab, setActiveTab] = useState<TabType>('text-to-avatar');
  
  // Text-to-Avatar state
  const [script, setScript] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [background, setBackground] = useState('');
  
  // Audio Lip-Sync state
  const [audioUrl, setAudioUrl] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioAvatarId, setAudioAvatarId] = useState<string | null>(null);
  
  // Video Translation state
  const [sourceVideoUrl, setSourceVideoUrl] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translationMode, setTranslationMode] = useState<'fast' | 'quality'>('quality');
  
  // Common state
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableAvatars, setAvailableAvatars] = useState<any[]>([]);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [refreshGallery, setRefreshGallery] = useState(0);

  // Load available avatars
  const loadAvatars = async () => {
    setLoadingAvatars(true);
    try {
      const response = await imageService.getHeyGenAvatars();
      if (response.success && response.data) {
        setAvailableAvatars(response.data);
        toast.success(`Loaded ${response.data.length} avatars`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load avatars');
    } finally {
      setLoadingAvatars(false);
    }
  };

  // Load available voices
  const loadVoices = async () => {
    setLoadingVoices(true);
    try {
      const response = await imageService.getHeyGenVoices();
      if (response.success && response.data) {
        setAvailableVoices(response.data);
        toast.success(`Loaded ${response.data.length} voices`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load voices');
    } finally {
      setLoadingVoices(false);
    }
  };

  // Handle audio file upload
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file');
      return;
    }

    setAudioFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      // For now, we'll need to upload to server first
      // TODO: Handle file upload
      toast.success('Audio file selected');
    };
  };

  // Generate text-to-avatar video
  const handleTextToAvatar = async () => {
    if (!script.trim()) {
      toast.error('Please enter a script');
      return;
    }

    if (script.length > 1500) {
      toast.error('Script exceeds 1,500 character limit');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await imageService.generateHeyGenTextToAvatar({
        script,
        avatarId: selectedAvatarId || undefined,
        voiceId: selectedVoiceId || undefined,
        aspectRatio,
        background: background || undefined
      });
      
      if (response.success && response.data) {
        toast.success('Avatar video generation started!');
        setRefreshGallery(prev => prev + 1);
      } else {
        toast.error(response.error || 'Failed to generate avatar video');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate avatar video');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate audio lip-sync video
  const handleAudioLipSync = async () => {
    if (!audioFile && !audioUrl.trim()) {
      toast.error('Please upload an audio file or provide an audio URL');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await imageService.generateHeyGenAudioLipSync({
        audioFile: audioFile || undefined,
        audioUrl: audioUrl || undefined,
        avatarId: audioAvatarId || undefined,
        aspectRatio
      });
      
      if (response.success && response.data) {
        toast.success('Audio lip-sync video generation started!');
        setRefreshGallery(prev => prev + 1);
        // Reset form
        setAudioFile(null);
        setAudioUrl('');
      } else {
        toast.error(response.error || 'Failed to generate audio lip-sync video');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate audio lip-sync video');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate video translation
  const handleVideoTranslation = async () => {
    if (!sourceVideoUrl.trim()) {
      toast.error('Please provide a source video URL');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await imageService.translateHeyGenVideo({
        videoUrl: sourceVideoUrl,
        targetLanguage,
        mode: translationMode
      });
      
      if (response.success && response.data) {
        if (response.data.note) {
          toast(response.data.note, { icon: 'ℹ️', duration: 5000 });
        } else {
          toast.success('Video translation started!');
        }
        setRefreshGallery(prev => prev + 1);
      } else {
        toast.error(response.error || 'Failed to translate video');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to translate video');
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-load avatars and voices on mount
  useEffect(() => {
    const loadInitialData = async () => {
      if (availableAvatars.length === 0 && !loadingAvatars) {
        await loadAvatars();
      }
      if (availableVoices.length === 0 && !loadingVoices) {
        await loadVoices();
      }
    };
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">HeyGen Avatar Videos</h1>
        <p className="text-gray-400 mt-1">
          Create professional avatar videos with AI-powered lip-sync, text-to-speech, and video translation
        </p>
      </div>

      {/* Tabs */}
      <div className="glass-card p-6">
        <div className="flex space-x-2 border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('text-to-avatar')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'text-to-avatar'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Text to Avatar
          </button>
          <button
            onClick={() => setActiveTab('audio-lip-sync')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'audio-lip-sync'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Music className="w-4 h-4 inline mr-2" />
            Audio Lip-Sync
          </button>
          <button
            onClick={() => setActiveTab('video-translation')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'video-translation'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Languages className="w-4 h-4 inline mr-2" />
            Video Translation
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'text-to-avatar' && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong>Text to Avatar:</strong> Create videos with AI avatars speaking your script with automatic lip-sync. 
                Perfect for explainer videos, product demos, and training content.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Script *
              </label>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="input-field w-full h-32"
                placeholder="Enter the script for the avatar to speak (e.g., 'Welcome to our product demo. Today we'll show you...')"
              />
              <p className="text-xs text-gray-400 mt-1">
                Maximum 1,500 characters. The avatar will speak this text with natural lip-sync.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Avatar (Optional)
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedAvatarId || ''}
                    onChange={(e) => setSelectedAvatarId(e.target.value || null)}
                    className="input-field flex-1"
                  >
                    <option value="">Auto-select (default avatar)</option>
                    {availableAvatars.map((avatar) => (
                      <option key={avatar.avatar_id || avatar.id} value={avatar.avatar_id || avatar.id}>
                        {avatar.avatar_name || avatar.name || avatar.avatar_id}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={loadAvatars}
                    disabled={loadingAvatars}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                  >
                    {loadingAvatars ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load Avatars'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Voice (Optional)
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedVoiceId || ''}
                    onChange={(e) => setSelectedVoiceId(e.target.value || null)}
                    className="input-field flex-1"
                  >
                    <option value="">Auto-select (default English voice)</option>
                    {availableVoices.map((voice) => (
                      <option key={voice.voice_id || voice.id} value={voice.voice_id || voice.id}>
                        {voice.voice_name || voice.name || voice.voice_id} ({voice.locale || voice.language || 'en'})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={loadVoices}
                    disabled={loadingVoices}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                  >
                    {loadingVoices ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load Voices'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Aspect Ratio
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="16:9">16:9 (Widescreen)</option>
                  <option value="9:16">9:16 (Vertical)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="4:3">4:3 (Standard)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Background (Optional - Image URL)
                </label>
                <input
                  type="text"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="input-field w-full"
                  placeholder="https://example.com/background.jpg"
                />
              </div>
            </div>

            <button
              onClick={handleTextToAvatar}
              disabled={isGenerating || !script.trim()}
              className="btn-primary w-full"
            >
              {isGenerating ? 'Generating Avatar Video...' : `🎬 Generate Avatar Video (${textToAvatarPricing ? textToAvatarPricing.displayText : 'credits'})`}
            </button>
          </div>
        )}

        {activeTab === 'audio-lip-sync' && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong>Audio Lip-Sync:</strong> Create avatar videos with perfect lip-sync to your audio track. 
                Ideal for music videos, voiceovers, and synchronized presentations.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Audio File or URL *
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="input-field w-full"
                />
                <p className="text-xs text-gray-400">Or provide a URL:</p>
                <input
                  type="text"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  className="input-field w-full"
                  placeholder="https://example.com/audio.mp3"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Avatar (Optional)
              </label>
              <div className="flex gap-2">
                <select
                  value={audioAvatarId || ''}
                  onChange={(e) => setAudioAvatarId(e.target.value || null)}
                  className="input-field flex-1"
                >
                  <option value="">Auto-select (default avatar)</option>
                  {availableAvatars.map((avatar) => (
                    <option key={avatar.avatar_id || avatar.id} value={avatar.avatar_id || avatar.id}>
                      {avatar.avatar_name || avatar.name || avatar.avatar_id}
                    </option>
                  ))}
                </select>
                <button
                  onClick={loadAvatars}
                  disabled={loadingAvatars}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                >
                  {loadingAvatars ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load Avatars'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="input-field w-full"
              >
                <option value="16:9">16:9 (Widescreen)</option>
                <option value="9:16">9:16 (Vertical)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="4:3">4:3 (Standard)</option>
              </select>
            </div>

            <button
              onClick={handleAudioLipSync}
              disabled={isGenerating || (!audioFile && !audioUrl.trim())}
              className="btn-primary w-full"
            >
              {isGenerating ? 'Generating Lip-Sync Video...' : `🎬 Generate Lip-Sync Video (${audioLipSyncPricing ? audioLipSyncPricing.displayText : 'credits'})`}
            </button>
          </div>
        )}

        {activeTab === 'video-translation' && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong>Video Translation:</strong> Translate existing videos with synchronized lip movement. 
                Supports Fast mode (3 credits/min) and Quality mode (6 credits/min) for natural, context-aware lip-sync.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Source Video URL *
              </label>
              <input
                type="text"
                value={sourceVideoUrl}
                onChange={(e) => setSourceVideoUrl(e.target.value)}
                className="input-field w-full"
                placeholder="https://example.com/video.mp4 or /uploads/videos/..."
              />
              <p className="text-xs text-gray-400 mt-1">
                Provide a publicly accessible video URL or path to an existing video
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Language
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="zh">Chinese</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Translation Mode
                </label>
                <select
                  value={translationMode}
                  onChange={(e) => setTranslationMode(e.target.value as 'fast' | 'quality')}
                  className="input-field w-full"
                >
                  <option value="fast">Fast (3 credits/min)</option>
                  <option value="quality">Quality (6 credits/min)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Quality mode provides more natural, context-aware lip-sync
                </p>
              </div>
            </div>

            <button
              onClick={handleVideoTranslation}
              disabled={isGenerating || !sourceVideoUrl.trim()}
              className="btn-primary w-full"
            >
              {isGenerating ? 'Translating Video...' : '🌍 Translate Video'}
            </button>
          </div>
        )}
      </div>

      {/* Generated Videos Gallery */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Generated Avatar Videos</h2>
        </div>
        <VideoGallery 
          key={`gallery-${refreshGallery}`}
          onVideoSelect={(video) => {
            // Handle video selection
          }}
        />
      </div>
    </div>
  );
};

export default HeyGenAvatarVideos;

