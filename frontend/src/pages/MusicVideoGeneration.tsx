import React, { useState, useEffect } from 'react';
import { imageService, MusicVideoGenerationRequest, GeneratedMusicVideo, GeneratedMusic } from '@/services/imageService';
import MusicVideoGallery from '@/components/Music/MusicVideoGallery';
import MusicGallery from '@/components/Music/MusicGallery';
import AvatarSelector from '@/components/Characters/AvatarSelector';
import toast from 'react-hot-toast';
import { Video, Music, Loader2, Sparkles, Play } from 'lucide-react';

const MusicVideoGeneration: React.FC = () => {
  // Form state
  const [selectedMusic, setSelectedMusic] = useState<GeneratedMusic | null>(null);
  const [avatarId, setAvatarId] = useState('');
  const [selectedLookId, setSelectedLookId] = useState<string | null>(null);
  const [avatarType, setAvatarType] = useState<'avatar' | 'talking_photo'>('avatar');
  const [script, setScript] = useState('');
  const [background, setBackground] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [resolution, setResolution] = useState<'auto' | '720p' | '1080p' | '4K'>('auto');
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedMusicVideo | null>(null);
  const [refreshGallery, setRefreshGallery] = useState(0);
  const [showMusicSelector, setShowMusicSelector] = useState(false);

  const handleGenerate = async () => {
    if (!selectedMusic) {
      toast.error('Please select a music track');
      return;
    }

    if (selectedMusic.status !== 'completed' || !selectedMusic.audioUrl) {
      toast.error('Selected music track is not ready. Please wait for it to complete.');
      return;
    }

    setIsGenerating(true);
    try {
      const request: MusicVideoGenerationRequest = {
        musicId: selectedMusic.id,
        provider: 'heygen', // Only HeyGen is supported
        avatarId: avatarId || undefined,
        avatarType,
        script: script || undefined,
        background: background || undefined,
        aspectRatio,
        resolution
      };

      const response = await imageService.generateMusicVideo(request);

      if (response.success && response.data) {
        toast.success('Music video generation started!');
        setGeneratedVideo(response.data);
        setRefreshGallery(prev => prev + 1); // Refresh gallery
        
        // Reset form
        setSelectedMusic(null);
        setAvatarId('');
        setSelectedLookId(null);
        setScript('');
        setBackground('');
      } else {
        toast.error(response.error || 'Failed to generate music video');
      }
    } catch (error: any) {
      console.error('Music video generation error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to generate music video';
      toast.error(errorMessage);
      
      // Show suggestions if available
      if (error.response?.data?.suggestions) {
        console.log('Suggestions:', error.response.data.suggestions);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center space-x-2">
          <Video className="w-8 h-8 text-purple-400" />
          <span>AI Music Video Generation</span>
        </h1>
        <p className="text-gray-400 mt-1">
          Create music videos with AI avatars using HeyGen. Select a music track and generate a video with lip-sync (up to 30 minutes).
        </p>
      </div>

      {/* Music Video Generation Form */}
      <div className="glass-card p-6">
        <div className="space-y-4">
          {/* Music Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Music Track <span className="text-red-400">*</span>
            </label>
            {!selectedMusic ? (
              <div>
                <button
                  onClick={() => setShowMusicSelector(!showMusicSelector)}
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white border-2 border-dashed border-gray-600 hover:border-purple-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Music className="w-5 h-5" />
                  <span>Click to select a music track</span>
                </button>
                {showMusicSelector && (
                  <div className="mt-4 max-h-96 overflow-y-auto">
                    <MusicGallery
                      onMusicSelect={(music) => {
                        setSelectedMusic(music);
                        setShowMusicSelector(false);
                      }}
                      showSelection={true}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-gray-700 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Music className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-white font-medium">{selectedMusic.prompt?.substring(0, 50)}...</p>
                    <p className="text-gray-400 text-sm">
                      {selectedMusic.style} • {selectedMusic.duration}s • {selectedMusic.provider}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMusic(null)}
                  className="px-3 py-1 text-sm text-gray-400 hover:text-white"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Avatar Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Avatar <span className="text-red-400">*</span>
            </label>
            <AvatarSelector
              selectedAvatarId={avatarId || undefined}
              selectedLookId={selectedLookId || undefined}
              onAvatarSelect={(id, lookId) => {
                setAvatarId(id || '');
                setSelectedLookId(lookId || null);
              }}
              showLooks={true}
              filterByType={null} // Show all avatar types
            />
            <p className="text-xs text-gray-400 mt-2">
              Select an avatar from your library. If you have multiple looks, choose a specific look.
            </p>
          </div>

          {/* Avatar Type Selection (for HeyGen API compatibility) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Avatar Type
            </label>
            <select
              value={avatarType}
              onChange={(e) => setAvatarType(e.target.value as 'avatar' | 'talking_photo')}
              className="input-field w-full"
              disabled={isGenerating}
            >
              <option value="avatar">Avatar</option>
              <option value="talking_photo">Talking Photo</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Select avatar type for HeyGen API. Use "Talking Photo" for photo-based avatars.
            </p>
          </div>

          {/* Script */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Script/Text (Optional)
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="input-field w-full h-24"
              placeholder="Optional text for the avatar to speak (if different from music lyrics)"
              disabled={isGenerating}
            />
          </div>

          {/* Background */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Background Image/Video URL (Optional)
            </label>
            <input
              type="text"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="input-field w-full"
              placeholder="URL to background image or video"
              disabled={isGenerating}
            />
          </div>

          {/* Aspect Ratio and Resolution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16' | '1:1')}
                className="input-field w-full"
                disabled={isGenerating}
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
                <option value="1:1">1:1 (Square)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Resolution (Optional)
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as 'auto' | '720p' | '1080p' | '4K')}
                className="input-field w-full"
                disabled={isGenerating}
              >
                <option value="auto">Auto (Use HeyGen Default)</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p (Requires Higher Plan)</option>
                <option value="4K">4K (Requires Higher Plan)</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Note: Higher resolutions may require a premium HeyGen subscription. Use "Auto" if you encounter resolution errors.
              </p>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedMusic}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Music Video...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Music Video</span>
              </>
            )}
          </button>

          {generatedVideo && (
            <div className="mt-4 p-4 bg-green-900/20 border border-green-500/50 rounded-lg">
              <p className="text-green-400 text-sm">
                ✅ Music video generation started! Video ID: {generatedVideo.id}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Status: {generatedVideo.status}. The video will appear in the gallery below when ready.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Music Video Gallery */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Video className="w-6 h-6 text-purple-400" />
          Generated Music Videos
        </h2>
        <MusicVideoGallery key={refreshGallery} />
      </div>
    </div>
  );
};

export default MusicVideoGeneration;

