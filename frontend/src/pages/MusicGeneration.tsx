import React, { useState } from 'react';
import { imageService, MusicGenerationRequest, GeneratedMusic } from '@/services/imageService';
import MusicGallery from '@/components/Music/MusicGallery';
import toast from 'react-hot-toast';
import { Music, Loader2, Sparkles } from 'lucide-react';
import { useServicePricing } from '@/hooks/useServicePricing';

const MusicGeneration: React.FC = () => {
  // Pricing hook
  const { getPricing } = useServicePricing();
  const musicPricing = getPricing('music_generation');

  // Form state
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(30);
  const [style, setStyle] = useState('pop');
  const [genre, setGenre] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [tempo, setTempo] = useState<number | null>(null);
  const [mood, setMood] = useState('');
  const [provider, setProvider] = useState<'musicgpt' | 'musicapi' | 'stability' | 'sunoapi' | null>(null);
  const [voiceType, setVoiceType] = useState('');
  const [language, setLanguage] = useState('');
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMusic, setGeneratedMusic] = useState<GeneratedMusic | null>(null);
  const [refreshGallery, setRefreshGallery] = useState(0);

  const styles = [
    'pop', 'rock', 'electronic', 'hip-hop', 'jazz', 'classical', 
    'ambient', 'country', 'reggae', 'blues', 'folk', 'metal',
    'afrobeat', 'world', 'gospel'
  ];

  const genres = [
    'pop', 'rock', 'electronic', 'hip-hop', 'jazz', 'classical',
    'ambient', 'country', 'reggae', 'blues', 'folk', 'metal',
    'dance', 'indie', 'alternative', 'r&b', 'soul', 'funk',
    'afrobeat', 'world', 'gospel'
  ];

  const moods = [
    'happy', 'energetic', 'calm', 'melancholic', 'uplifting',
    'dramatic', 'peaceful', 'intense', 'romantic', 'nostalgic'
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a music description');
      return;
    }

    setIsGenerating(true);
    try {
      const request: MusicGenerationRequest = {
        prompt: prompt.trim(),
        duration: parseInt(duration.toString()),
        style,
        genre: genre || undefined,
        instrumental,
        lyrics: lyrics || undefined,
        tempo: tempo || undefined,
        mood: mood || undefined,
        provider: provider || undefined,
        voiceType: voiceType || undefined,
        language: language || undefined
      };

      const response = await imageService.generateMusic(request);

      if (response.success && response.data) {
        toast.success('Music generated successfully!');
        setGeneratedMusic(response.data);
        setRefreshGallery(prev => prev + 1); // Refresh gallery
      } else {
        toast.error(response.error || 'Failed to generate music');
      }
    } catch (error: any) {
      console.error('Music generation error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate music';
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
          <Music className="w-8 h-8 text-green-400" />
          <span>AI Music Generation</span>
        </h1>
        <p className="text-gray-400 mt-1">
          Create original music tracks with AI-powered generation using MusicGPT, MusicAPI.ai, Stability Audio, and sunoapi.org
        </p>
      </div>

      {/* Music Generation Form */}
      <div className="glass-card p-6">
        <div className="space-y-4">
          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Music Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="input-field w-full h-24"
              placeholder="Describe the music you want to generate... (e.g., 'Upbeat electronic dance music with synthesizers and a driving bassline')"
              disabled={isGenerating}
            />
          </div>

          {/* Duration and Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Duration (seconds)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Math.max(10, Math.min(120, parseInt(e.target.value) || 30)))}
                className="input-field w-full"
                min="10"
                max="120"
                disabled={isGenerating}
              />
              <p className="text-xs text-gray-500 mt-1">10-120 seconds</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Style
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="input-field w-full"
                disabled={isGenerating}
              >
                {styles.map(s => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Genre and Mood */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Genre (Optional)
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="input-field w-full"
                disabled={isGenerating}
              >
                <option value="">Auto-detect</option>
                {genres.map(g => (
                  <option key={g} value={g} className="capitalize">{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mood (Optional)
              </label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="input-field w-full"
                disabled={isGenerating}
              >
                <option value="">Auto-detect</option>
                {moods.map(m => (
                  <option key={m} value={m} className="capitalize">{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tempo and Instrumental */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tempo (BPM) - Optional
              </label>
              <input
                type="number"
                value={tempo || ''}
                onChange={(e) => setTempo(e.target.value ? parseInt(e.target.value) : null)}
                className="input-field w-full"
                placeholder="e.g., 120"
                min="60"
                max="200"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type
              </label>
              <div className="flex items-center space-x-4 mt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={instrumental}
                    onChange={(e) => setInstrumental(e.target.checked)}
                    className="w-4 h-4 text-green-400 bg-gray-700 border-gray-600 rounded focus:ring-green-400"
                    disabled={isGenerating}
                  />
                  <span className="text-gray-300">Instrumental Only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Voice Type and Language (only show if not instrumental) */}
          {!instrumental && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Voice Type (Optional)
                </label>
                <select
                  value={voiceType}
                  onChange={(e) => setVoiceType(e.target.value)}
                  className="input-field w-full"
                  disabled={isGenerating}
                >
                  <option value="">Auto (let AI decide)</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="neutral">Neutral / Androgynous</option>
                  <option value="male-deep">Male - Deep Voice</option>
                  <option value="male-tenor">Male - Tenor</option>
                  <option value="male-baritone">Male - Baritone</option>
                  <option value="female-soprano">Female - Soprano</option>
                  <option value="female-alto">Female - Alto</option>
                  <option value="female-mezzo">Female - Mezzo-Soprano</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Language (Optional)
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="input-field w-full"
                  disabled={isGenerating}
                >
                  <option value="">Auto (English)</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="zh">Chinese (Mandarin)</option>
                  <option value="ar">Arabic</option>
                  <option value="hi">Hindi</option>
                  <option value="ru">Russian</option>
                  <option value="nl">Dutch</option>
                  <option value="sv">Swedish</option>
                  <option value="pl">Polish</option>
                  <option value="tr">Turkish</option>
                  <option value="vi">Vietnamese</option>
                  <option value="th">Thai</option>
                </select>
              </div>
            </div>
          )}

          {/* Lyrics */}
          {!instrumental && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lyrics (Optional)
              </label>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                className="input-field w-full h-32"
                placeholder="Enter lyrics for the song (if you want vocals)..."
                disabled={isGenerating}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for AI-generated lyrics or instrumental track
              </p>
            </div>
          )}

          {/* Provider Selection (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Provider (Optional - Auto-selects if not specified)
            </label>
            <select
              value={provider || ''}
              onChange={(e) => setProvider(e.target.value ? e.target.value as any : null)}
              className="input-field w-full"
              disabled={isGenerating}
            >
              <option value="">Auto-select (MusicGPT → MusicAPI → Stability → sunoapi)</option>
              <option value="musicgpt">MusicGPT (Primary - Advanced AI music generation)</option>
              <option value="musicapi">MusicAPI.ai (Secondary - Full songs with vocals)</option>
              <option value="stability">Stability Audio (Tertiary - Instrumental)</option>
              <option value="sunoapi">sunoapi.org (Fallback - Fast streaming)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              The system will automatically try providers in priority order if one fails
            </p>
          </div>

          {/* Generate Button */}
          <div className="pt-4">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating Music...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Music</span>
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Cost: {musicPricing ? musicPricing.displayText : 'Loading...'} per generation
            </p>
          </div>
        </div>
      </div>

      {/* Generated Music Preview */}
      {generatedMusic && generatedMusic.audioUrl && (
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Generated Music</h2>
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-medium">{generatedMusic.prompt}</h3>
                <span className="text-xs text-gray-400 capitalize">{generatedMusic.provider}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400 mb-4">
                {generatedMusic.style && (
                  <span className="px-2 py-1 bg-gray-700 rounded">{generatedMusic.style}</span>
                )}
                {generatedMusic.genre && (
                  <span className="px-2 py-1 bg-gray-700 rounded">{generatedMusic.genre}</span>
                )}
                <span>{generatedMusic.duration}s</span>
              </div>
              <audio
                controls
                className="w-full"
                src={generatedMusic.audioUrl.startsWith('http') 
                  ? generatedMusic.audioUrl 
                  : `${process.env.REACT_APP_API_URL || 'https://www.iqonga.org'}${generatedMusic.audioUrl}`}
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        </div>
      )}

      {/* Generated Music Gallery */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Your Generated Music</h2>
        </div>
        <MusicGallery 
          key={`gallery-${refreshGallery}`}
          onMusicSelect={(music) => {
            setGeneratedMusic(music);
            toast.success('Music track selected');
          }}
        />
      </div>
    </div>
  );
};

export default MusicGeneration;

