import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ebookService, { EBookProject, EBookChapter } from '../services/ebookService';
import { toast } from 'react-hot-toast';
import {
  BookOpen,
  Loader,
  Download,
  Share2,
  Calendar,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EBookShare: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<EBookProject | null>(null);
  const [chapters, setChapters] = useState<EBookChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<EBookChapter | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchSharedProject();
    }
  }, [token]);

  const fetchSharedProject = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const response = await ebookService.getProjectByShareToken(token);
      
      if (response.success && response.data) {
        setProject(response.data);
        // Fetch chapters using share token
        if (token) {
          try {
            const chaptersResponse = await ebookService.getSharedProjectChapters(token);
            if (chaptersResponse.success && chaptersResponse.data) {
              setChapters(chaptersResponse.data);
              if (chaptersResponse.data.length > 0) {
                setSelectedChapter(chaptersResponse.data[0]);
              }
            }
          } catch (chapterError: any) {
            console.error('Could not fetch chapters:', chapterError);
            // Chapters might not be accessible, that's okay
          }
        }
      } else {
        setError('eBook not found or not publicly shared');
      }
    } catch (error: any) {
      console.error('Error fetching shared project:', error);
      setError(error.response?.data?.error || 'Failed to load shared eBook');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share && project) {
      navigator.share({
        title: project.title,
        text: project.description || '',
        url: window.location.href
      }).catch(() => {
        // Fallback to copy
        copyToClipboard();
      });
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">eBook Not Found</h2>
          <p className="text-gray-400 mb-6">
            {error || 'This eBook is not available or has been removed.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold">{project.title}</h1>
                {project.description && (
                  <p className="text-sm text-gray-400 mt-1">{project.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Chapters */}
          <div className="w-64 bg-gray-800 rounded-lg p-4 h-fit sticky top-24">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Chapters</h2>
            <div className="space-y-2">
              {chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => setSelectedChapter(chapter)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedChapter?.id === chapter.id
                      ? 'bg-purple-600/20 border border-purple-500/50'
                      : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">Ch. {chapter.chapter_number}</span>
                    {chapter.title && (
                      <span className="text-sm font-medium truncate">{chapter.title}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {chapter.word_count.toLocaleString()} words
                  </div>
                </button>
              ))}
            </div>
            {chapters.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No chapters available</p>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-gray-800 rounded-lg p-8">
            {selectedChapter ? (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">
                    Chapter {selectedChapter.chapter_number}
                    {selectedChapter.title && `: ${selectedChapter.title}`}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{selectedChapter.word_count.toLocaleString()} words</span>
                    {project.created_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedChapter.content }}
                />
              </div>
            ) : (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Chapter Selected</h3>
                <p className="text-gray-400">
                  {chapters.length === 0
                    ? 'This eBook has no chapters yet.'
                    : 'Select a chapter from the sidebar to view its content.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Project Info Footer */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">About This eBook</h3>
              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                {project.genre && (
                  <span>
                    <strong className="text-gray-300">Genre:</strong> {project.genre}
                  </span>
                )}
                {project.language && (
                  <span>
                    <strong className="text-gray-300">Language:</strong> {project.language.toUpperCase()}
                  </span>
                )}
                {project.chapter_count && (
                  <span>
                    <strong className="text-gray-300">Chapters:</strong> {project.chapter_count}
                  </span>
                )}
                {project.total_word_count && (
                  <span>
                    <strong className="text-gray-300">Words:</strong> {project.total_word_count.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400 mb-2">Created with</p>
              <p className="text-lg font-bold text-purple-400">Iqonga</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EBookShare;

