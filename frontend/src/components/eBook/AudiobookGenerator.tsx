import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  Headphones,
  X,
  Play,
  Pause,
  Download,
  Loader,
  CheckCircle,
  AlertCircle,
  Volume2,
  Gauge,
  RefreshCw,
  Clock,
  Settings
} from 'lucide-react';

interface AudiobookGeneratorProps {
  projectId: string;
  projectTitle: string;
  chapters: Array<{ id: string; title: string; word_count: number }>;
  onClose: () => void;
}

interface Audiobook {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  total_chapters: number;
  total_duration_seconds?: number;
  credits_used: number;
  audio_file_url?: string;
  metadata?: {
    voice?: string;
    speed?: number;
  };
  created_at: string;
}

const VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Balanced, versatile voice' },
  { id: 'echo', name: 'Echo', description: 'Clear, confident voice' },
  { id: 'fable', name: 'Fable', description: 'Warm, expressive voice' },
  { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative voice' },
  { id: 'nova', name: 'Nova', description: 'Energetic, youthful voice' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft, gentle voice' }
];

const AudiobookGenerator: React.FC<AudiobookGeneratorProps> = ({
  projectId,
  projectTitle,
  chapters,
  onClose
}) => {
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [speed, setSpeed] = useState(1.0);
  const [generating, setGenerating] = useState(false);
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAudiobook, setCurrentAudiobook] = useState<Audiobook | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

  useEffect(() => {
    fetchAudiobooks();
    calculateEstimatedCost();
  }, [chapters, selectedVoice, speed]);

  useEffect(() => {
    // Poll for status if there's a processing audiobook
    if (currentAudiobook && currentAudiobook.status === 'processing') {
      const interval = setInterval(() => {
        fetchAudiobooks();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [currentAudiobook]);

  const fetchAudiobooks = async () => {
    try {
      const response = await apiService.get(
        `/content/ebook/projects/${projectId}/audiobook`
      ) as any;
      
      if (response.success && response.data) {
        setAudiobooks(response.data);
        // Set current audiobook (most recent)
        if (response.data.length > 0) {
          setCurrentAudiobook(response.data[0]);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch audiobooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimatedCost = async () => {
    try {
      const totalWords = chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);
      // Rough estimate: 1 credit per 100 words (adjust based on your pricing)
      const estimate = Math.ceil(totalWords / 100);
      setEstimatedCost(estimate);
    } catch (error) {
      console.error('Failed to calculate cost:', error);
    }
  };

  const handleGenerate = async () => {
    if (chapters.length === 0) {
      toast.error('No chapters available to generate audiobook');
      return;
    }

    setGenerating(true);
    try {
      const response = await apiService.post(
        `/content/ebook/projects/${projectId}/audiobook`,
        {
          voice: selectedVoice,
          speed: speed,
          regenerate: false
        }
      ) as any;

      if (response.success) {
        toast.success('Audiobook generation started! This may take a few minutes.');
        await fetchAudiobooks();
        // Start polling for status
      } else {
        if (response.error === 'Insufficient credits') {
          toast.error(`Insufficient credits. Required: ${response.requiredCredits || estimatedCost}`);
        } else {
          toast.error(response.error || 'Failed to generate audiobook');
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate audiobook');
      console.error('Audiobook generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerate audiobook? This will use additional credits.')) {
      return;
    }

    setGenerating(true);
    try {
      const response = await apiService.post(
        `/content/ebook/projects/${projectId}/audiobook`,
        {
          voice: selectedVoice,
          speed: speed,
          regenerate: true
        }
      ) as any;

      if (response.success) {
        toast.success('Audiobook regeneration started!');
        await fetchAudiobooks();
      } else {
        toast.error(response.error || 'Failed to regenerate audiobook');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to regenerate audiobook');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (audiobook: Audiobook) => {
    if (audiobook.audio_file_url) {
      window.open(audiobook.audio_file_url, '_blank');
    } else {
      toast.error('Audio file not available');
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-400/20';
      case 'processing':
        return 'text-blue-400 bg-blue-400/20';
      case 'failed':
        return 'text-red-400 bg-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <Loader className="h-4 w-4 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6 border border-gray-700 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Headphones className="h-5 w-5 text-purple-400" />
            Generate Audiobook
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-8 w-8 text-purple-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Generation Settings */}
            <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Generation Settings
              </h4>

              {/* Voice Selection */}
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-2 flex items-center gap-2">
                  <Volume2 className="h-3 w-3" />
                  Voice
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {VOICES.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice.id)}
                      className={`p-3 rounded-lg border transition-colors text-left ${
                        selectedVoice === voice.id
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium text-white text-sm">{voice.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{voice.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed Control */}
              <div>
                <label className="block text-xs text-gray-400 mb-2 flex items-center gap-2">
                  <Gauge className="h-3 w-3" />
                  Speed: {speed}x
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <span className="text-sm text-gray-300 w-12 text-right">{speed}x</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5x</span>
                  <span>1.0x</span>
                  <span>2.0x</span>
                </div>
              </div>

              {/* Project Info */}
              <div className="mt-4 pt-4 border-t border-gray-600">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Chapters:</span>
                  <span className="text-white">{chapters.length}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Total Words:</span>
                  <span className="text-white">
                    {chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0).toLocaleString()}
                  </span>
                </div>
                {estimatedCost && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-400">Estimated Cost:</span>
                    <span className="text-purple-400">{estimatedCost} credits</span>
                  </div>
                )}
              </div>
            </div>

            {/* Generate Button */}
            {(!currentAudiobook || currentAudiobook.status !== 'processing') && (
              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={generating || chapters.length === 0}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Headphones className="h-4 w-4" />
                      <span>Generate Audiobook</span>
                    </>
                  )}
                </button>
                {currentAudiobook && currentAudiobook.status === 'completed' && (
                  <button
                    onClick={handleRegenerate}
                    disabled={generating}
                    className="px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Regenerate</span>
                  </button>
                )}
              </div>
            )}

            {/* Current Audiobook Status */}
            {currentAudiobook && (
              <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Current Audiobook
                  </h4>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(currentAudiobook.status)}`}>
                    {getStatusIcon(currentAudiobook.status)}
                    {currentAudiobook.status.charAt(0).toUpperCase() + currentAudiobook.status.slice(1)}
                  </span>
                </div>

                {currentAudiobook.status === 'processing' && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-400">Generating audiobook...</span>
                      <span className="text-gray-300">This may take a few minutes</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Chapters</div>
                    <div className="text-white font-medium">{currentAudiobook.total_chapters}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Duration</div>
                    <div className="text-white font-medium">
                      {formatDuration(currentAudiobook.total_duration_seconds)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Credits Used</div>
                    <div className="text-white font-medium">{currentAudiobook.credits_used}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Voice</div>
                    <div className="text-white font-medium capitalize">
                      {currentAudiobook.metadata?.voice || 'N/A'}
                    </div>
                  </div>
                </div>

                {currentAudiobook.status === 'completed' && currentAudiobook.audio_file_url && (
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <div className="flex items-center gap-2 mb-3">
                      <audio
                        controls
                        src={currentAudiobook.audio_file_url}
                        className="flex-1"
                        onPlay={() => setPlayingAudio(currentAudiobook.id)}
                        onPause={() => setPlayingAudio(null)}
                      />
                    </div>
                    <button
                      onClick={() => handleDownload(currentAudiobook)}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Audiobook</span>
                    </button>
                  </div>
                )}

                {currentAudiobook.status === 'failed' && (
                  <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400">
                      Generation failed. Please try regenerating the audiobook.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Previous Audiobooks */}
            {audiobooks.length > 1 && (
              <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <h4 className="text-sm font-medium text-white mb-3">Previous Versions</h4>
                <div className="space-y-2">
                  {audiobooks.slice(1).map((audiobook) => (
                    <div
                      key={audiobook.id}
                      className="p-3 bg-gray-800 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(audiobook.status)}`}>
                          {getStatusIcon(audiobook.status)}
                          {audiobook.status}
                        </span>
                        <div className="text-sm text-gray-300">
                          {new Date(audiobook.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDuration(audiobook.total_duration_seconds)} • {audiobook.credits_used} credits
                        </div>
                      </div>
                      {audiobook.status === 'completed' && audiobook.audio_file_url && (
                        <button
                          onClick={() => handleDownload(audiobook)}
                          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Download className="h-3 w-3" />
                          <span className="text-xs">Download</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AudiobookGenerator;

