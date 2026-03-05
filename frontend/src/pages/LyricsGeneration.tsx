import React, { useState } from 'react';
import { imageService, LyricsGenerationRequest, GeneratedLyrics } from '@/services/imageService';
import toast from 'react-hot-toast';
import { Music, Loader2, Sparkles, FileText, Copy, Check } from 'lucide-react';
import { useServicePricing } from '@/hooks/useServicePricing';

const LyricsGeneration: React.FC = () => {
  // Pricing hook
  const { getPricing } = useServicePricing();
  const lyricsPricing = getPricing('lyrics_generation');

  // Form state
  const [topic, setTopic] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('energetic');
  const [style, setStyle] = useState('pop');
  const [language, setLanguage] = useState('en');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [structure, setStructure] = useState<'auto' | 'verse-chorus' | 'verse-only' | 'free-form'>('auto');
  const [agentId, setAgentId] = useState('');
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLyrics, setGeneratedLyrics] = useState<GeneratedLyrics | null>(null);
  const [copied, setCopied] = useState(false);

  const genres = [
    'pop', 'rock', 'hip-hop', 'rap', 'electronic', 'jazz', 'classical', 
    'country', 'reggae', 'blues', 'folk', 'metal', 'r&b', 'soul', 'funk',
    'indie', 'alternative', 'punk', 'gospel', 'latin', 'world', 'ambient', 'afrobeat'
  ];

  const moods = [
    'energetic', 'happy', 'sad', 'romantic', 'melancholic', 'uplifting',
    'aggressive', 'peaceful', 'nostalgic', 'hopeful', 'dark', 'playful',
    'dramatic', 'intense', 'relaxed', 'motivational', 'emotional', 'epic'
  ];

  const styles = [
    'pop', 'rock', 'electronic', 'hip-hop', 'jazz', 'classical', 
    'ambient', 'country', 'reggae', 'blues', 'folk', 'metal', 'afrobeat'
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' }
  ];

  const handleGenerate = async () => {
    if (!topic && !genre) {
      toast.error('Please provide at least a topic or genre');
      return;
    }

    setIsGenerating(true);
    setGeneratedLyrics(null);
    setCopied(false);

    try {
      const request: LyricsGenerationRequest = {
        topic: topic || undefined,
        genre: genre || undefined,
        mood,
        style,
        language,
        length,
        structure,
        agentId: agentId || undefined
      };

      const response = await imageService.generateLyrics(request);

      if (response.success && response.data) {
        toast.success('Lyrics generated successfully!');
        setGeneratedLyrics(response.data);
      } else {
        toast.error(response.error || 'Failed to generate lyrics');
      }
    } catch (error: any) {
      console.error('Lyrics generation error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate lyrics';
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedLyrics?.lyrics) {
      navigator.clipboard.writeText(generatedLyrics.lyrics);
      setCopied(true);
      toast.success('Lyrics copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatLyrics = (lyrics: string) => {
    // Format lyrics with proper line breaks and sections
    return lyrics.split('\n').map((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return <br key={index} />;
      
      // Check if it's a section header (e.g., [Verse], [Chorus], [Bridge])
      if (trimmedLine.match(/^\[.*\]$/)) {
        return (
          <div key={index} className="mt-4 mb-2">
            <span className="text-purple-400 font-semibold text-lg">{trimmedLine}</span>
          </div>
        );
      }
      
      return (
        <div key={index} className="text-gray-300 leading-relaxed">
          {trimmedLine}
        </div>
      );
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center space-x-2">
          <Music className="w-8 h-8 text-purple-400" />
          <span>AI Lyrics Generation</span>
        </h1>
        <p className="text-gray-400 mt-1">
          Generate original song lyrics using AI. Create lyrics based on topic, genre, mood, and style.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generation Form */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-purple-400" />
            <span>Lyrics Parameters</span>
          </h2>

          <div className="space-y-4">
            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Topic/Theme (Optional)
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., love, adventure, success, friendship"
                className="input-field w-full"
                disabled={isGenerating}
              />
            </div>

            {/* Genre */}
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
                <option value="">Select genre (optional)</option>
                {genres.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Style */}
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
                {styles.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Mood */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mood
              </label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="input-field w-full"
                disabled={isGenerating}
              >
                {moods.map((m) => (
                  <option key={m} value={m}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="input-field w-full"
                disabled={isGenerating}
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Length */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Length
              </label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value as 'short' | 'medium' | 'long')}
                className="input-field w-full"
                disabled={isGenerating}
              >
                <option value="short">Short (2-3 verses, ~8-12 lines)</option>
                <option value="medium">Medium (3-4 verses, ~12-20 lines)</option>
                <option value="long">Long (4-5 verses, ~20-30 lines)</option>
              </select>
            </div>

            {/* Structure */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Structure
              </label>
              <select
                value={structure}
                onChange={(e) => setStructure(e.target.value as 'auto' | 'verse-chorus' | 'verse-only' | 'free-form')}
                className="input-field w-full"
                disabled={isGenerating}
              >
                <option value="auto">Auto (Recommended)</option>
                <option value="verse-chorus">Verse-Chorus (Traditional)</option>
                <option value="verse-only">Verse Only (No Chorus)</option>
                <option value="free-form">Free Form (No Structure)</option>
              </select>
            </div>

            {/* Agent ID (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Agent ID (Optional)
              </label>
              <input
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="Leave empty for general lyrics, or provide agent ID for personalized lyrics"
                className="input-field w-full"
                disabled={isGenerating}
              />
              <p className="text-xs text-gray-500 mt-1">
                If provided, lyrics will be generated based on the agent's personality and company knowledge.
              </p>
            </div>

            <button
              onClick={handleGenerate}
              className="btn-primary w-full flex items-center justify-center space-x-2"
              disabled={isGenerating || (!topic && !genre)}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating Lyrics...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Lyrics</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated Lyrics Display */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Music className="w-5 h-5 text-purple-400" />
              <span>Generated Lyrics</span>
            </span>
            {generatedLyrics && (
              <button
                onClick={handleCopy}
                className="flex items-center space-x-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </h2>

          {!generatedLyrics && !isGenerating && (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Generated lyrics will appear here</p>
            </div>
          )}

          {isGenerating && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
              <p className="text-gray-400">Generating your lyrics...</p>
            </div>
          )}

          {generatedLyrics && (
            <div className="space-y-4">
              {/* Title */}
              <div className="border-b border-gray-700 pb-3">
                <h3 className="text-2xl font-bold text-white mb-2">{generatedLyrics.title}</h3>
                <div className="flex flex-wrap gap-2 text-sm text-gray-400">
                  <span className="px-2 py-1 bg-gray-700 rounded">
                    Genre: {generatedLyrics.genre}
                  </span>
                  <span className="px-2 py-1 bg-gray-700 rounded">
                    Mood: {generatedLyrics.mood}
                  </span>
                  <span className="px-2 py-1 bg-gray-700 rounded">
                    Language: {languages.find(l => l.code === generatedLyrics.language)?.name || generatedLyrics.language}
                  </span>
                  <span className="px-2 py-1 bg-gray-700 rounded">
                    Structure: {generatedLyrics.structure}
                  </span>
                  <span className="px-2 py-1 bg-gray-700 rounded">
                    Lines: {generatedLyrics.lineCount}
                  </span>
                </div>
              </div>

              {/* Lyrics Content */}
              <div className="bg-gray-800/50 rounded-lg p-6 min-h-[400px] max-h-[600px] overflow-y-auto">
                <div className="whitespace-pre-line text-base">
                  {formatLyrics(generatedLyrics.lyrics)}
                </div>
              </div>

              {/* Reasoning */}
              {generatedLyrics.reasoning && (
                <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
                  <p className="text-sm text-purple-300 font-medium mb-2">AI Reasoning:</p>
                  <p className="text-sm text-gray-300">{generatedLyrics.reasoning}</p>
                </div>
              )}

              {/* Context Info */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700">
                <div className="flex items-center space-x-4">
                  {generatedLyrics.agent_aware && (
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      <span>Agent-Aware</span>
                    </span>
                  )}
                  {generatedLyrics.company_aware && (
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      <span>Company-Aware</span>
                    </span>
                  )}
                </div>
                <span>Cost: {lyricsPricing ? lyricsPricing.displayText : 'credits'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LyricsGeneration;

