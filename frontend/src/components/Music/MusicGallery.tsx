import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { imageService, GeneratedMusic } from '@/services/imageService';
import { getUploadsBaseUrl } from '@/utils/domain';
import { Play, Pause, Download, Music, Clock } from 'lucide-react';

interface MusicGalleryProps {
  onMusicSelect?: (music: GeneratedMusic) => void;
  showSelection?: boolean;
  agentId?: string;
}

const MusicGallery: React.FC<MusicGalleryProps> = ({ 
  onMusicSelect, 
  showSelection = false, 
  agentId
}) => {
  const [music, setMusic] = useState<GeneratedMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchMusic();
  }, [agentId]);

  useEffect(() => {
    // Cleanup audio elements on unmount
    return () => {
      audioElements.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  const fetchMusic = async (pageNum = 1) => {
    try {
      setLoading(true);
      console.log('MusicGallery: Fetching music, page:', pageNum);
      const response = await imageService.getGeneratedMusic({
        page: pageNum,
        limit: 12,
        agentId: agentId
      });
      
      console.log('MusicGallery: API Response:', response);
      
      if (response.success && response.data) {
        const musicList = response.data.music || [];
        console.log('MusicGallery: Received', musicList.length, 'tracks');
        
        if (pageNum === 1) {
          setMusic(musicList);
        } else {
          setMusic(prev => [...prev, ...musicList]);
        }
        setHasMore(pageNum < response.data.pagination.totalPages);
      } else {
        console.error('MusicGallery API Error:', response);
        if (!response.success) {
          toast.error(response.error || 'Failed to load music');
        }
      }
    } catch (error: any) {
      console.error('Error fetching music:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || error.message || 'Failed to load music');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMusic(nextPage);
  };

  const handleMusicClick = (track: GeneratedMusic) => {
    if (showSelection) {
      setSelectedMusic(track.id);
      onMusicSelect?.(track);
    } else if (onMusicSelect) {
      onMusicSelect(track);
    }
  };

  const handlePlayPause = (track: GeneratedMusic, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if audioUrl exists
    if (!track.audioUrl) {
      toast.error('Audio file is not available yet. The music may still be processing.');
      return;
    }
    
    const audioUrl = track.audioUrl.startsWith('http') 
      ? track.audioUrl 
      : `${getUploadsBaseUrl()}${track.audioUrl.startsWith('/') ? '' : '/'}${track.audioUrl}`;

    let audio = audioElements.get(track.id);
    
    if (!audio) {
      audio = new Audio(audioUrl);
      audio.crossOrigin = 'anonymous'; // Enable CORS for audio playback
      audio.addEventListener('ended', () => {
        setPlayingId(null);
      });
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        toast.error('Failed to play audio. The file may not be available.');
        setPlayingId(null);
      });
      setAudioElements(prev => new Map(prev).set(track.id, audio!));
    }

    if (playingId === track.id) {
      // Pause current track
      audio.pause();
      setPlayingId(null);
    } else {
      // Stop any other playing track
      audioElements.forEach((a, id) => {
        if (id !== track.id) {
          a.pause();
          a.currentTime = 0;
        }
      });
      
      // Play selected track
      audio.play().catch((error) => {
        console.error('Error playing audio:', error);
        toast.error('Failed to play audio. Please try again.');
        setPlayingId(null);
      });
      setPlayingId(track.id);
    }
  };

  const handleDownload = async (track: GeneratedMusic, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if audioUrl exists
    if (!track.audioUrl) {
      toast.error('Audio file is not available yet. The music may still be processing.');
      return;
    }
    
    try {
      const audioUrl = track.audioUrl.startsWith('http') 
        ? track.audioUrl 
        : `${getUploadsBaseUrl()}${track.audioUrl.startsWith('/') ? '' : '/'}${track.audioUrl}`;
      
      const response = await fetch(audioUrl, {
        mode: 'cors',
        credentials: 'omit'
      });
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `music_${track.id}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Music downloaded successfully');
    } catch (error) {
      console.error('Error downloading music:', error);
      toast.error('Failed to download music. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && music.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
      </div>
    );
  }

  if (music.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">No music generated yet</p>
        <p className="text-gray-500 text-sm mt-2">Generate your first track to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {music.map((track) => {
          const isPlaying = playingId === track.id;
          const isSelected = selectedMusic === track.id;
          
          return (
            <div
              key={track.id}
              onClick={() => handleMusicClick(track)}
              className={`
                glass-card p-4 cursor-pointer transition-all
                ${isSelected ? 'ring-2 ring-green-400' : 'hover:bg-gray-800'}
              `}
            >
              <div className="flex items-start space-x-4">
                {/* Play/Pause Button */}
                <button
                  onClick={(e) => handlePlayPause(track, e)}
                  disabled={!track.audioUrl || track.status === 'processing' || track.status === 'pending'}
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    !track.audioUrl || track.status === 'processing' || track.status === 'pending'
                      ? 'bg-gray-600 cursor-not-allowed opacity-50'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                  title={!track.audioUrl || track.status === 'processing' || track.status === 'pending' 
                    ? 'Music is still processing' 
                    : isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </button>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">
                    {track.prompt || 'Untitled Track'}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1 text-sm text-gray-400">
                    {track.style && (
                      <span className="px-2 py-0.5 bg-gray-700 rounded text-xs">
                        {track.style}
                      </span>
                    )}
                    {track.genre && (
                      <span className="px-2 py-0.5 bg-gray-700 rounded text-xs">
                        {track.genre}
                      </span>
                    )}
                    {track.instrumental && (
                      <span className="px-2 py-0.5 bg-blue-600 rounded text-xs">
                        Instrumental
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(track.duration)}</span>
                    </div>
                    {track.provider && (
                      <span className="capitalize">{track.provider}</span>
                    )}
                  </div>
                  {track.agent_name && (
                    <p className="text-xs text-gray-500 mt-1">
                      Agent: {track.agent_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(track.createdAt || track.created_at || '')}
                  </p>
                </div>

                {/* Download Button */}
                <button
                  onClick={(e) => handleDownload(track, e)}
                  disabled={!track.audioUrl || track.status === 'processing' || track.status === 'pending'}
                  className={`flex-shrink-0 p-2 transition-colors ${
                    !track.audioUrl || track.status === 'processing' || track.status === 'pending'
                      ? 'text-gray-600 cursor-not-allowed opacity-50'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title={!track.audioUrl || track.status === 'processing' || track.status === 'pending' 
                    ? 'Music is still processing' 
                    : 'Download'}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MusicGallery;

