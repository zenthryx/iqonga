import React, { useState, useRef } from 'react';
import { apiService } from '../../services/api';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  FileText,
  X,
  Upload,
  Loader,
  CheckCircle,
  AlertCircle,
  Globe,
  File,
  Video,
  Music,
  Edit,
  Plus,
  Download,
  Languages,
  Clock,
  Play,
  Pause
} from 'lucide-react';

interface TranscriptionWizardProps {
  projectId: string;
  chapters: Array<{ id: string; title: string; chapter_number: number }>;
  onClose: () => void;
  onChapterAdded?: () => void;
}

type TranscriptionSource = 'file' | 'url' | null;
type TranscriptionStep = 'source' | 'upload' | 'transcribing' | 'edit' | 'complete';

interface TranscriptionResult {
  id: string;
  text: string;
  wordCount: number;
  creditsUsed: number;
  language?: string;
  duration?: number;
}

const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm'];

const TranscriptionWizard: React.FC<TranscriptionWizardProps> = ({
  projectId,
  chapters,
  onClose,
  onChapterAdded
}) => {
  const [currentStep, setCurrentStep] = useState<TranscriptionStep>('source');
  const [sourceType, setSourceType] = useState<TranscriptionSource>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [editedText, setEditedText] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [language, setLanguage] = useState('auto');
  const [chapterTitle, setChapterTitle] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [addAsNewChapter, setAddAsNewChapter] = useState(true);
  const [addingChapter, setAddingChapter] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'link'
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isValidVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);
    const isValidAudio = SUPPORTED_AUDIO_TYPES.includes(file.type);

    if (!isValidVideo && !isValidAudio) {
      toast.error('Unsupported file type. Please upload a video or audio file.');
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 100MB limit. Please use a smaller file.');
      return;
    }

    setSelectedFile(file);
    setCurrentStep('upload');
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setTranscribing(true);
    setCurrentStep('transcribing');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (language !== 'auto') {
        formData.append('language', language);
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Use axios directly for file upload with progress tracking
      const token = localStorage.getItem('authToken');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://ajentrix.com/api';
      
      const response = await axios.post(
        `${API_BASE_URL}/content/ebook/transcribe`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
          onUploadProgress: (progressEvent: any) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(Math.min(percentCompleted, 90));
            }
          }
        }
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      const responseData = response.data as any;

      if (responseData.success && responseData.transcription) {
        const result: TranscriptionResult = {
          id: responseData.transcription.id,
          text: responseData.transcription.text,
          wordCount: responseData.transcription.wordCount,
          creditsUsed: responseData.transcription.creditsUsed,
          language: responseData.transcription.language,
          duration: responseData.transcription.duration
        };
        setTranscriptionResult(result);
        setEditedText(result.text);
        setCurrentStep('edit');
        toast.success('Transcription completed successfully!');
      } else {
        throw new Error(responseData.error || 'Transcription failed');
      }
    } catch (error: any) {
      console.error('Transcription error:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to transcribe file');
      setCurrentStep('upload');
    } finally {
      setTranscribing(false);
    }
  };

  const handleUrlTranscribe = async () => {
    if (!videoUrl.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    setTranscribing(true);
    setCurrentStep('transcribing');
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await apiService.post(
        '/content/ebook/transcribe/url',
        {
          url: videoUrl,
          language: language !== 'auto' ? language : undefined
        }
      ) as any;

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success && response.transcription) {
        const result: TranscriptionResult = {
          id: response.transcription.id,
          text: response.transcription.text,
          wordCount: response.transcription.wordCount,
          creditsUsed: response.transcription.creditsUsed,
          language: response.transcription.language,
          duration: response.transcription.duration
        };
        setTranscriptionResult(result);
        setEditedText(result.text);
        setCurrentStep('edit');
        toast.success('Transcription completed successfully!');
      } else {
        throw new Error(response.error || 'Transcription failed');
      }
    } catch (error: any) {
      console.error('Transcription error:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to transcribe from URL');
      setCurrentStep('source');
    } finally {
      setTranscribing(false);
    }
  };

  const handleAddAsChapter = async () => {
    if (!editedText.trim()) {
      toast.error('Please enter chapter content');
      return;
    }

    if (addAsNewChapter && !chapterTitle.trim()) {
      toast.error('Please enter a chapter title');
      return;
    }

    setAddingChapter(true);
    try {
      if (addAsNewChapter) {
        // Add as new chapter
        const nextChapterNumber = chapters.length > 0
          ? Math.max(...chapters.map(ch => ch.chapter_number)) + 1
          : 1;

        await apiService.post(`/content/ebook/projects/${projectId}/chapters`, {
          title: chapterTitle,
          content: editedText,
          chapter_number: nextChapterNumber
        });

        toast.success('Chapter added successfully!');
      } else if (selectedChapterId) {
        // Append to existing chapter
        const selectedChapter = chapters.find(ch => ch.id === selectedChapterId);
        if (selectedChapter) {
          // Get current chapter content
          const chapterResponse = await apiService.get(
            `/content/ebook/projects/${projectId}/chapters/${selectedChapterId}`
          ) as any;
          
          const currentContent = chapterResponse.data?.content || '';
          const updatedContent = currentContent + '\n\n' + editedText;

          await apiService.put(
            `/content/ebook/projects/${projectId}/chapters/${selectedChapterId}`,
            {
              content: updatedContent
            }
          );

          toast.success('Content added to chapter successfully!');
        }
      }

      setCurrentStep('complete');
      if (onChapterAdded) {
        onChapterAdded();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add chapter');
      console.error('Add chapter error:', error);
    } finally {
      setAddingChapter(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (file: File) => {
    if (SUPPORTED_VIDEO_TYPES.includes(file.type)) {
      return Video;
    }
    return Music;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'source':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">Select Source</h4>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setSourceType('file');
                    setCurrentStep('upload');
                  }}
                  className="p-6 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left border-2 border-transparent hover:border-purple-500"
                >
                  <File className="h-8 w-8 text-blue-400 mb-3" />
                  <div className="font-semibold text-white mb-1">Upload File</div>
                  <div className="text-xs text-gray-400">
                    Video or audio file (MP4, MP3, WAV, etc.)
                  </div>
                </button>
                <button
                  onClick={() => setSourceType('url')}
                  className="p-6 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left border-2 border-transparent hover:border-purple-500"
                >
                  <Globe className="h-8 w-8 text-green-400 mb-3" />
                  <div className="font-semibold text-white mb-1">From URL</div>
                  <div className="text-xs text-gray-400">
                    Transcribe from video/audio URL
                  </div>
                </button>
              </div>
            </div>

            {sourceType === 'url' && (
              <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                <label className="block text-xs text-gray-400 mb-2">Video/Audio URL</label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="input-field w-full"
                />
                <button
                  onClick={handleUrlTranscribe}
                  disabled={!videoUrl.trim() || transcribing}
                  className="mt-3 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {transcribing ? 'Transcribing...' : 'Transcribe from URL'}
                </button>
              </div>
            )}

            {/* Language Selection */}
            <div className="mt-4">
              <label className="block text-xs text-gray-400 mb-2 flex items-center gap-2">
                <Languages className="h-3 w-3" />
                Language (Optional)
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="input-field w-full"
              >
                <option value="auto">Auto-detect</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
              </select>
            </div>
          </div>
        );

      case 'upload':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">Upload File</h4>
              
              {selectedFile ? (
                <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = getFileIcon(selectedFile);
                      return <Icon className="h-8 w-8 text-blue-400" />;
                    })()}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{selectedFile.name}</div>
                      <div className="text-xs text-gray-400">
                        {formatFileSize(selectedFile.size)} • {selectedFile.type}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-purple-500 transition-colors"
                >
                  <Upload className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <div className="text-white font-medium mb-2">Click to upload or drag and drop</div>
                  <div className="text-xs text-gray-400">
                    Video (MP4, MOV, AVI, WEBM) or Audio (MP3, WAV, M4A, OGG)
                  </div>
                  <div className="text-xs text-gray-500 mt-2">Max file size: 100MB</div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {selectedFile && (
              <button
                onClick={handleFileUpload}
                disabled={transcribing}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {transcribing ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Transcribing...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    <span>Start Transcription</span>
                  </>
                )}
              </button>
            )}
          </div>
        );

      case 'transcribing':
        return (
          <div className="text-center py-12">
            <Loader className="h-12 w-12 text-purple-400 animate-spin mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-white mb-2">Transcribing...</h4>
            <p className="text-gray-400 mb-6">This may take a few minutes depending on file size</p>
            
            <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
              <div
                className="bg-purple-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-400">{uploadProgress}% complete</p>
          </div>
        );

      case 'edit':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit Transcription
              </h4>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTimestamps}
                    onChange={(e) => setShowTimestamps(e.target.checked)}
                    className="w-3 h-3"
                  />
                  <Clock className="h-3 w-3" />
                  Show Timestamps
                </label>
                {transcriptionResult && (
                  <div className="text-xs text-gray-400">
                    {transcriptionResult.wordCount.toLocaleString()} words • {transcriptionResult.creditsUsed} credits
                  </div>
                )}
              </div>
            </div>

            <div className="border border-gray-600 rounded-lg overflow-hidden">
              <ReactQuill
                theme="snow"
                value={editedText}
                onChange={setEditedText}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Edit transcribed text..."
                style={{
                  backgroundColor: '#1f2937',
                  color: '#fff'
                }}
                className="transcription-editor"
              />
            </div>

            {/* Add as Chapter Section */}
            <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <h5 className="text-sm font-medium text-white mb-3">Add to eBook</h5>
              
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={addAsNewChapter}
                    onChange={() => setAddAsNewChapter(true)}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm text-gray-300">Add as new chapter</span>
                </label>
                
                {addAsNewChapter && (
                  <input
                    type="text"
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    placeholder="Chapter title"
                    className="input-field w-full text-sm"
                  />
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!addAsNewChapter}
                    onChange={() => setAddAsNewChapter(false)}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm text-gray-300">Append to existing chapter</span>
                </label>

                {!addAsNewChapter && (
                  <select
                    value={selectedChapterId || ''}
                    onChange={(e) => setSelectedChapterId(e.target.value || null)}
                    className="input-field w-full text-sm"
                  >
                    <option value="">Select chapter...</option>
                    {chapters.map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>
                        {chapter.chapter_number}. {chapter.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                onClick={handleAddAsChapter}
                disabled={addingChapter || !editedText.trim() || (addAsNewChapter && !chapterTitle.trim()) || (!addAsNewChapter && !selectedChapterId)}
                className="mt-4 w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {addingChapter ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Add to eBook</span>
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-white mb-2">Chapter Added Successfully!</h4>
            <p className="text-gray-400 mb-6">
              {addAsNewChapter ? 'Your new chapter has been added to the eBook.' : 'Content has been added to the selected chapter.'}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6 border border-gray-700 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-400" />
            Transcribe Audio/Video
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={transcribing}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Steps */}
        {currentStep !== 'complete' && (
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-700">
            {['source', 'upload', 'transcribing', 'edit'].map((step, index) => {
              const stepNames = ['Source', 'Upload', 'Transcribing', 'Edit'];
              const isActive = currentStep === step;
              const isCompleted = ['source', 'upload', 'transcribing', 'edit'].indexOf(currentStep) > index;
              
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-purple-600 text-white'
                          : isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                    </div>
                    <div className={`text-xs mt-2 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      {stepNames[index]}
                    </div>
                  </div>
                  {index < 3 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        isCompleted ? 'bg-green-600' : 'bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        {currentStep !== 'complete' && currentStep !== 'transcribing' && (
          <div className="flex justify-between mt-6 pt-6 border-t border-gray-700">
            <button
              onClick={() => {
                if (currentStep === 'edit') {
                  setCurrentStep('source');
                  setSelectedFile(null);
                  setVideoUrl('');
                  setTranscriptionResult(null);
                  setEditedText('');
                } else if (currentStep === 'upload') {
                  setCurrentStep('source');
                  setSelectedFile(null);
                } else {
                  onClose();
                }
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              {currentStep === 'source' ? 'Cancel' : 'Back'}
            </button>
            {currentStep === 'edit' && transcriptionResult && (
              <button
                onClick={() => {
                  // Download transcription as text file
                  const blob = new Blob([editedText], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `transcription-${transcriptionResult.id}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Text
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptionWizard;

