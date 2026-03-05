import React, { useState, useRef } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  Upload,
  FileText,
  File,
  Globe,
  X,
  Loader,
  CheckCircle,
  AlertCircle,
  FileDown,
  BookOpen,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

interface ImportWizardProps {
  projectId: string;
  onImportComplete: (chapters: any[]) => void;
  onClose: () => void;
}

type ImportSource = 'file' | 'url' | 'google_docs' | null;
type ImportStep = 'source' | 'upload' | 'preview' | 'processing';

interface ImportedContent {
  title: string;
  content: string;
  source: string;
  wordCount: number;
  metadata?: any;
}

type Chapter = {
  title: string;
  content: string;
};

const ImportWizard: React.FC<ImportWizardProps> = ({
  projectId,
  onImportComplete,
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState<ImportStep>('source');
  const [importSource, setImportSource] = useState<ImportSource>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [googleDocsUrl, setGoogleDocsUrl] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [importedContent, setImportedContent] = useState<ImportedContent | null>(null);
  const [processing, setProcessing] = useState(false);
  const [previewChapters, setPreviewChapters] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
        toast.error('Invalid file type. Please upload PDF, Word, or TXT files.');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit.');
        return;
      }

      setUploadedFile(file);
      setCurrentStep('processing');
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);

      const response = await apiService.post('/content/ebook/import/file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }) as any;

      if (response.success && response.data) {
        setImportedContent(response.data);
        // Split content into potential chapters
        const chapters = splitIntoChapters(response.data);
        setPreviewChapters(chapters);
        setCurrentStep('preview');
      } else {
        throw new Error(response.error || 'Import failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to import file');
      setCurrentStep('source');
    } finally {
      setProcessing(false);
    }
  };

  const handleUrlImport = async () => {
    if (!webUrl.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    setProcessing(true);
    try {
      const response = await apiService.post('/content/ebook/import/url', {
        url: webUrl,
        projectId
      }) as any;

      if (response.success && response.data) {
        setImportedContent(response.data);
        const chapters = splitIntoChapters(response.data);
        setPreviewChapters(chapters);
        setCurrentStep('preview');
      } else {
        throw new Error(response.error || 'Import failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to import from URL');
    } finally {
      setProcessing(false);
    }
  };

  const handleGoogleDocsImport = async () => {
    if (!googleDocsUrl.trim()) {
      toast.error('Please enter a valid Google Docs URL');
      return;
    }

    setProcessing(true);
    try {
      const response = await apiService.post('/content/ebook/import/google-docs', {
        url: googleDocsUrl,
        projectId
      }) as any;

      if (response.success && response.data) {
        setImportedContent(response.data);
        const chapters = splitIntoChapters(response.data);
        setPreviewChapters(chapters);
        setCurrentStep('preview');
      } else {
        throw new Error(response.error || 'Import failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to import from Google Docs');
    } finally {
      setProcessing(false);
    }
  };

  const splitIntoChapters = (content: ImportedContent): Array<{ title: string; content: string; wordCount: number }> => {
    // Simple chapter splitting - can be enhanced
    const text = content.content;
    const chapterMarkers = [
      /^Chapter \d+/i,
      /^Chapter [A-Z]+/i,
      /^\d+\./,
      /^#+\s+/,
      /^Part \d+/i
    ];

    const lines = text.split('\n');
    const chapters: Array<{ title: string; content: string; wordCount: number }> = [];
    let currentChapter: Chapter | null = null;

    // Use regular for loop instead of forEach to avoid closure issues
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isChapterStart = chapterMarkers.some(marker => marker.test(line.trim()));
      
      if (isChapterStart && line.trim().length < 100) {
        // Save previous chapter
        if (currentChapter !== null) {
          const trimmedContent = currentChapter.content.trim();
          if (trimmedContent) {
            chapters.push({
              title: currentChapter.title,
              content: trimmedContent,
              wordCount: trimmedContent.split(/\s+/).filter(Boolean).length
            });
          }
        }
        // Start new chapter
        currentChapter = {
          title: line.trim(),
          content: ''
        };
      } else {
        if (currentChapter !== null) {
          currentChapter.content += line + '\n';
        } else {
          // First chapter
          currentChapter = {
            title: content.title || 'Chapter 1',
            content: line + '\n'
          };
        }
      }
    }

    // Add last chapter
    if (currentChapter !== null) {
      const trimmedContent = currentChapter.content.trim();
      if (trimmedContent) {
        chapters.push({
          title: currentChapter.title,
          content: trimmedContent,
          wordCount: trimmedContent.split(/\s+/).filter(Boolean).length
        });
      }
    }

    // If no chapters found, create one
    if (chapters.length === 0) {
      chapters.push({
        title: content.title || 'Imported Content',
        content: content.content,
        wordCount: content.wordCount
      });
    }

    return chapters;
  };

  const handleConfirmImport = async () => {
    setProcessing(true);
    try {
      // Get current chapters to determine starting chapter number
      const currentChaptersResponse = await apiService.get(`/content/ebook/projects/${projectId}/chapters`) as any;
      const currentChapters = currentChaptersResponse.success ? currentChaptersResponse.data : [];
      const startChapterNumber = currentChapters.length > 0 
        ? Math.max(...currentChapters.map((c: any) => c.chapter_number)) + 1
        : 1;

      // Create chapters from preview
      const chapterPromises = previewChapters.map((chapter, index) =>
        apiService.post(`/content/ebook/projects/${projectId}/chapters`, {
          title: chapter.title,
          content: chapter.content,
          chapter_number: startChapterNumber + index
        })
      );

      await Promise.all(chapterPromises);
      toast.success(`Successfully imported ${previewChapters.length} chapter(s)`);
      onImportComplete(previewChapters);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create chapters');
    } finally {
      setProcessing(false);
    }
  };

  const renderSourceSelection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Select Import Source</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => {
            setImportSource('file');
            setCurrentStep('upload');
          }}
          className="p-6 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-purple-500 transition-all text-left"
        >
          <File className="w-8 h-8 text-purple-400 mb-3" />
          <h4 className="font-semibold mb-2">Upload File</h4>
          <p className="text-sm text-gray-400">PDF, Word, or TXT files</p>
        </button>

        <button
          onClick={() => {
            setImportSource('url');
            setCurrentStep('upload');
          }}
          className="p-6 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-purple-500 transition-all text-left"
        >
          <Globe className="w-8 h-8 text-purple-400 mb-3" />
          <h4 className="font-semibold mb-2">Import from URL</h4>
          <p className="text-sm text-gray-400">Web page or document URL</p>
        </button>

        <button
          onClick={() => {
            setImportSource('google_docs');
            setCurrentStep('upload');
          }}
          className="p-6 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-purple-500 transition-all text-left"
        >
          <FileText className="w-8 h-8 text-purple-400 mb-3" />
          <h4 className="font-semibold mb-2">Google Docs</h4>
          <p className="text-sm text-gray-400">Import from Google Docs</p>
        </button>
      </div>
    </div>
  );

  const renderUpload = () => (
    <div className="space-y-4">
      <button
        onClick={() => {
          setCurrentStep('source');
          setImportSource(null);
        }}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Source Selection
      </button>

      {importSource === 'file' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Upload File</h3>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 rounded-lg p-12 text-center cursor-pointer hover:border-purple-500 transition-colors"
          >
            <Upload className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-gray-500">
              PDF, Word (.doc, .docx), or TXT files (max 10MB)
            </p>
            {uploadedFile && (
              <div className="mt-4 p-3 bg-gray-800 rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <File className="w-5 h-5 text-purple-400" />
                  <span className="text-sm">{uploadedFile.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {importSource === 'url' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Import from URL</h3>
          <input
            type="url"
            value={webUrl}
            onChange={(e) => setWebUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="input-field w-full"
          />
          <button
            onClick={handleUrlImport}
            disabled={processing || !webUrl.trim()}
            className="btn-primary w-full"
          >
            {processing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                Import from URL
              </>
            )}
          </button>
        </div>
      )}

      {importSource === 'google_docs' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Import from Google Docs</h3>
          <input
            type="url"
            value={googleDocsUrl}
            onChange={(e) => setGoogleDocsUrl(e.target.value)}
            placeholder="https://docs.google.com/document/d/..."
            className="input-field w-full"
          />
          <p className="text-xs text-gray-400">
            Paste the Google Docs URL. The document must be publicly accessible or shared with the service account.
          </p>
          <button
            onClick={handleGoogleDocsImport}
            disabled={processing || !googleDocsUrl.trim()}
            className="btn-primary w-full"
          >
            {processing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Import from Google Docs
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Preview Import</h3>
        <button
          onClick={() => {
            setCurrentStep('source');
            setPreviewChapters([]);
            setImportedContent(null);
          }}
          className="text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 inline mr-1" />
          Back
        </button>
      </div>

      {importedContent && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="font-semibold">Import Successful</span>
          </div>
          <div className="text-sm text-gray-400 space-y-1">
            <p>Source: {importedContent.source}</p>
            <p>Total Words: {importedContent.wordCount.toLocaleString()}</p>
            <p>Chapters Detected: {previewChapters.length}</p>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {previewChapters.map((chapter, index) => (
          <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold">{chapter.title}</h4>
              <span className="text-xs text-gray-400">{chapter.wordCount} words</span>
            </div>
            <p className="text-sm text-gray-400 line-clamp-2">
              {chapter.content.substring(0, 200)}...
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-700">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirmImport}
          disabled={processing}
          className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Creating Chapters...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Import {previewChapters.length} Chapter(s)
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Import Content
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {currentStep === 'source' && renderSourceSelection()}
          {currentStep === 'upload' && renderUpload()}
          {currentStep === 'processing' && (
            <div className="text-center py-12">
              <Loader className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
              <p className="text-gray-400">Processing import...</p>
            </div>
          )}
          {currentStep === 'preview' && renderPreview()}
        </div>
      </div>
    </div>
  );
};

export default ImportWizard;

