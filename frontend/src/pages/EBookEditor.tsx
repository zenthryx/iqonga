import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ebookService, { EBookProject, EBookChapter } from '../services/ebookService';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../styles/ebook-editor.css';
import CoverDesigner from '../components/eBook/CoverDesigner';
import TOCPreview from '../components/eBook/TOCPreview';
import PlatformExport from '../components/eBook/PlatformExport';
import ImportWizard from '../components/eBook/ImportWizard';
import AudiobookGenerator from '../components/eBook/AudiobookGenerator';
import TranscriptionWizard from '../components/eBook/TranscriptionWizard';
import PageNumberingSettings from '../components/eBook/PageNumberingSettings';
import SharingPublishing from '../components/eBook/SharingPublishing';
import PageTemplateSelector from '../components/eBook/PageTemplateSelector';
import TemplateRenderer from '../components/eBook/TemplateRenderer';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Edit,
  Download,
  Share2,
  Image as ImageIcon,
  FileText,
  Settings,
  Eye,
  Loader,
  GripVertical,
  Copy,
  Headphones,
  Type,
  Layout,
  BookOpen,
  X,
  Upload,
  Globe,
  File,
  Book,
  List,
  Rocket,
  Hash
} from 'lucide-react';

const EBookEditor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<EBookProject | null>(null);
  const [chapters, setChapters] = useState<EBookChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<EBookChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Editing states
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Custom image handler with resizing support
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await apiService.post('/content/ebook/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }) as any;

        if (response.success && response.url) {
          const quill = (document.querySelector('.ql-editor') as any)?.__quill;
          if (quill) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', response.url, 'user');
            quill.setSelection(range.index + 1);
          }
        }
      } catch (error) {
        toast.error('Failed to upload image');
        console.error('Image upload error:', error);
      }
    };
  };

  // Quill editor modules configuration
  const quillModules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': [] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
        ['link', { 'image': imageHandler }, 'video'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['code-block'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  };

  const quillFormats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'color', 'background',
    'align',
    'code-block'
  ];
  
  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showCoverDesigner, setShowCoverDesigner] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPlatformExport, setShowPlatformExport] = useState(false);
  const [showTOCPreview, setShowTOCPreview] = useState(false);
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showAudiobookGenerator, setShowAudiobookGenerator] = useState(false);
  const [showTranscriptionWizard, setShowTranscriptionWizard] = useState(false);
  const [showPageNumbering, setShowPageNumbering] = useState(false);
  const [showSharing, setShowSharing] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  // Page view mode with pagination
  const [viewMode, setViewMode] = useState<'chapter' | 'page'>('chapter');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // New chapter form
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterContent, setNewChapterContent] = useState('');

  // AI Generation states
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [generatingChapters, setGeneratingChapters] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ chapter: number; total: number; message: string } | null>(null);
  const [generationStatus, setGenerationStatus] = useState<any>(null);
  const [showOutline, setShowOutline] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchChapters();
    }
  }, [projectId]);

  const fetchProject = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const response = await ebookService.getProject(projectId);
      if (response.success && response.data) {
        setProject(response.data);
        setEditingTitle(response.data.title);
      }
    } catch (error: any) {
      toast.error('Failed to load project');
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async () => {
    if (!projectId) return;
    
    try {
      const response = await ebookService.getChapters(projectId);
      if (response.success && response.data) {
        setChapters(response.data);
        if (response.data.length > 0 && !selectedChapter) {
          const firstChapter = response.data[0];
          setSelectedChapter(firstChapter);
          setEditingContent(firstChapter.content || '');
        } else if (selectedChapter) {
          // Update selected chapter with fresh data if it exists
          const updatedChapter = response.data.find(ch => ch.id === selectedChapter.id);
          if (updatedChapter) {
            setSelectedChapter(updatedChapter);
            // Only update editingContent if it matches the old content (user hasn't made changes)
            if (editingContent === selectedChapter.content) {
              setEditingContent(updatedChapter.content || '');
            }
          }
        }
      }
    } catch (error: any) {
      toast.error('Failed to load chapters');
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchGenerationStatus = async () => {
    if (!projectId) return;
    
    try {
      const response = await ebookService.getGenerationStatus(projectId);
      if (response.success && response.data) {
        setGenerationStatus(response.data);
        if (response.data.generationStatus === 'completed') {
          setGeneratingChapters(false);
          setGenerationProgress(null);
          toast.success('All chapters generated successfully!');
          fetchChapters();
        } else if (response.data.generationStatus === 'failed') {
          setGeneratingChapters(false);
          setGenerationProgress(null);
          toast.error('Chapter generation failed');
        }
      }
    } catch (error: any) {
      console.error('Error fetching generation status:', error);
    }
  };

  // Poll generation status if generation is in progress
  useEffect(() => {
    if (generatingChapters || generationStatus?.generationStatus === 'generating') {
      const interval = setInterval(() => {
        fetchGenerationStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [generatingChapters, generationStatus]);

  const handleGenerateOutline = async () => {
    if (!projectId || !project) return;

    const numberOfChapters = project.number_of_chapters || 5;
    const input = window.prompt(`Enter number of chapters for outline (default: ${numberOfChapters}):`, numberOfChapters.toString());
    const chapters = input ? parseInt(input) : numberOfChapters;

    if (!chapters || chapters < 1 || chapters > 50) {
      toast.error('Please enter a valid number between 1 and 50');
      return;
    }

    setGeneratingOutline(true);
    try {
      const response = await ebookService.generateOutline(projectId, chapters);
      if (response.success && response.data) {
        toast.success(`Outline generated! Used ${response.data.creditsUsed} credits.`);
        fetchProject(); // Refresh to get updated outline
        setShowOutline(true);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate outline');
    } finally {
      setGeneratingOutline(false);
    }
  };

  const handleGenerateAllChapters = async () => {
    if (!projectId || !project) return;

    if (!project.chapter_outline || (Array.isArray(project.chapter_outline) && project.chapter_outline.length === 0)) {
      toast.error('Please generate an outline first');
      return;
    }

    const outline = project.chapter_outline;
    const totalCost = outline.length * 15;
    const confirm = window.confirm(
      `Generate ${outline.length} chapters? This will cost ${totalCost} credits (${outline.length} chapters × 15 credits each).`
    );

    if (!confirm) return;

    setGeneratingChapters(true);
    setGenerationProgress({ chapter: 0, total: outline.length, message: 'Starting generation...' });
    
    try {
      const response = await ebookService.generateAllChapters(projectId);
      if (response.success && response.data) {
        toast.success('Chapter generation started! This may take a few minutes.');
        fetchGenerationStatus();
        // Status polling will handle updates
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start chapter generation');
      setGeneratingChapters(false);
      setGenerationProgress(null);
    }
  };

  const handleSaveChapter = async (silent = false) => {
    if (!selectedChapter || !projectId) return;

    setSaving(true);
    try {
      // Ensure content is valid
      const safeContent = editingContent || '';
      
      const response = await ebookService.updateChapter(selectedChapter.id, {
        title: selectedChapter.title,
        content: safeContent,
        page_template: selectedChapter.page_template,
        template_config: selectedChapter.template_config
      });

      if (response.success && response.data) {
        if (!silent) {
          toast.success('Chapter saved successfully!');
        }
        // Update selected chapter with saved data
        const updatedChapter = response.data;
        setSelectedChapter(updatedChapter);
        // Ensure editingContent matches saved content
        setEditingContent(updatedChapter.content || '');
        fetchChapters();
      }
    } catch (error: any) {
      if (!silent) {
        toast.error(error.response?.data?.error || 'Failed to save chapter');
      }
      console.error('Save chapter error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateSelect = async (templateId: string, templateConfig?: any) => {
    if (!selectedChapter || !projectId) return;

    try {
      const response = await ebookService.updateChapter(selectedChapter.id, {
        page_template: templateId,
        template_config: templateConfig || {}
      });

      if (response.success && response.data) {
        setSelectedChapter(response.data);
        toast.success(`Template "${templateId}" applied successfully!`);
        fetchChapters();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to apply template');
    }
  };

  const handleSaveProject = async () => {
    if (!project || !projectId) return;

    setSaving(true);
    try {
      const response = await ebookService.updateProject(projectId, {
        title: editingTitle
      });

      if (response.success && response.data) {
        toast.success('Project saved successfully!');
        setProject(response.data);
        setIsEditingTitle(false);
        fetchProject();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleAddChapter = async () => {
    if (!projectId || !newChapterContent.trim()) {
      toast.error('Chapter content is required');
      return;
    }

    try {
      const response = await ebookService.createChapter(projectId, {
        title: newChapterTitle.trim() || undefined,
        content: newChapterContent.trim()
      });

      if (response.success && response.data) {
        toast.success('Chapter added successfully!');
        setNewChapterTitle('');
        setNewChapterContent('');
        setShowAddChapter(false);
        fetchChapters();
        setSelectedChapter(response.data);
        setEditingContent(response.data.content);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add chapter');
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!window.confirm('Are you sure you want to delete this chapter?')) {
      return;
    }

    try {
      const response = await ebookService.deleteChapter(chapterId);
      if (response.success) {
        toast.success('Chapter deleted successfully');
        fetchChapters();
        if (selectedChapter?.id === chapterId) {
          if (chapters.length > 1) {
            const nextChapter = chapters.find(c => c.id !== chapterId);
            if (nextChapter) {
              setSelectedChapter(nextChapter);
              setEditingContent(nextChapter.content);
            } else {
              setSelectedChapter(null);
              setEditingContent('');
            }
          } else {
            setSelectedChapter(null);
            setEditingContent('');
          }
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete chapter');
    }
  };

  const handleSelectChapter = (chapter: EBookChapter) => {
    try {
      // Save current chapter if modified (async, don't wait)
      if (selectedChapter && editingContent !== selectedChapter.content) {
        handleSaveChapter(true); // Silent save
      }
      
      // Clear auto-save timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      
      // Reset template preview when switching chapters to avoid blank states
      setShowTemplatePreview(false);
      
      // Reset pagination
      setCurrentPage(1);
      
      // Ensure content is valid (not null/undefined)
      const safeContent = chapter.content || '';
      
      // Set chapter and content atomically to prevent blank states
      setSelectedChapter(chapter);
      setEditingContent(safeContent);
      
      // Recalculate pages if in page view
      if (viewMode === 'page' && safeContent) {
        const pages = calculatePages(safeContent);
        setTotalPages(pages);
      }
    } catch (error) {
      console.error('Error selecting chapter:', error);
      toast.error('Failed to load chapter. Please try again.');
      // Fallback: ensure we have a valid state
      setSelectedChapter(null);
      setEditingContent('');
    }
  };

  // Calculate total pages based on word count (approximately 250 words per page)
  const calculatePages = (content: string): number => {
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    const pages = Math.max(1, Math.ceil(wordCount / 250));
    return pages;
  };

  // Update pagination when content changes
  useEffect(() => {
    if (editingContent && viewMode === 'page') {
      const pages = calculatePages(editingContent);
      setTotalPages(pages);
      // Reset to page 1 if current page exceeds total
      if (currentPage > pages) {
        setCurrentPage(1);
      }
    } else if (viewMode === 'page' && selectedChapter) {
      // Recalculate when switching to page view
      const pages = calculatePages(editingContent || selectedChapter.content || '');
      setTotalPages(pages);
      setCurrentPage(1);
    }
  }, [editingContent, viewMode, selectedChapter]);

  // Reset to page 1 when switching view modes
  useEffect(() => {
    if (viewMode === 'page' && editingContent) {
      const pages = calculatePages(editingContent);
      setTotalPages(pages);
      setCurrentPage(1);
    } else if (viewMode === 'chapter') {
      setCurrentPage(1);
      setTotalPages(1);
    }
  }, [viewMode]);

  // Auto-save functionality with debounce
  const handleContentChange = (content: string) => {
    // Ensure content is always a string to prevent blank editor
    const safeContent = content || '';
    setEditingContent(safeContent);
    
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Set new timer for auto-save (3 seconds after user stops typing)
    autoSaveTimerRef.current = setTimeout(() => {
      if (selectedChapter && content !== selectedChapter.content) {
        handleSaveChapter(true); // Silent save
      }
    }, 3000);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Project Not Found</h2>
          <p className="text-gray-400 mb-6">The eBook project you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/ebook-creator')}
            className="btn-primary"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/ebook-creator')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              {isEditingTitle ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={handleSaveProject}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveProject();
                    }
                  }}
                  className="text-xl font-bold bg-gray-700 border border-gray-600 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              ) : (
                <h1
                  className="text-xl font-bold cursor-pointer hover:text-purple-400 transition-colors"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {project.title}
                </h1>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* AI Generation Buttons */}
              {(!project.chapter_outline || (Array.isArray(project.chapter_outline) && project.chapter_outline.length === 0)) && (
                <button
                  onClick={handleGenerateOutline}
                  disabled={generatingOutline}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 text-sm"
                  title="Generate Chapter Outline with AI"
                >
                  {generatingOutline ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  Generate Outline
                </button>
              )}
              {project.chapter_outline && Array.isArray(project.chapter_outline) && project.chapter_outline.length > 0 && chapters.length === 0 && (
                <button
                  onClick={handleGenerateAllChapters}
                  disabled={generatingChapters}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 text-sm"
                  title="Generate All Chapters with AI"
                >
                  {generatingChapters ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  Generate All Chapters
                </button>
              )}
              {generationProgress && (
                <div className="px-3 py-2 bg-blue-600 rounded-lg text-sm flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>{generationProgress.message} ({generationProgress.chapter}/{generationProgress.total})</span>
                </div>
              )}
              <button
                onClick={() => setShowImportWizard(true)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2 text-sm"
                title="Import Content"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button
                onClick={() => setShowTranscriptionWizard(true)}
                className="px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors flex items-center gap-2 text-sm"
                title="Transcribe Audio/Video"
              >
                <Type className="w-4 h-4" />
                Transcribe
              </button>
              <button
                onClick={() => setShowTOCPreview(true)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2 text-sm"
                title="Table of Contents"
              >
                <List className="w-4 h-4" />
                TOC
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTemplateSelector(true)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 text-sm"
                  title="Browse and apply page templates to this chapter"
                >
                  <Layout className="w-4 h-4" />
                  Templates
                </button>
                <button
                  onClick={() => setShowTemplatePreview(prev => !prev)}
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${showTemplatePreview ? 'bg-purple-700 hover:bg-purple-800' : 'bg-gray-700 hover:bg-gray-600'}`}
                  title="Toggle template preview"
                  disabled={!selectedChapter?.page_template}
                >
                  <Eye className="w-4 h-4" />
                  {showTemplatePreview ? 'Hide Preview' : 'Preview'}
                </button>
                <button
                  onClick={() => setViewMode(prev => prev === 'chapter' ? 'page' : 'chapter')}
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${viewMode === 'page' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                  title={viewMode === 'page' ? 'Switch to chapter view' : 'Switch to page view with pagination'}
                  disabled={!selectedChapter}
                >
                  <BookOpen className="w-4 h-4" />
                  {viewMode === 'page' ? 'Chapter View' : 'Page View'}
                </button>
              </div>
              <button
                onClick={() => setShowPageNumbering(true)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2 text-sm"
                title="Configure page numbering and placement"
              >
                <Hash className="w-4 h-4" />
                Page #
              </button>
              <button
                onClick={() => setShowSharing(true)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 text-sm"
                title="Share or publish this eBook"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => setShowCoverDesigner(true)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2 text-sm"
                title="Design or regenerate the cover"
              >
                <ImageIcon className="w-4 h-4" />
                Cover
              </button>
              <button
                onClick={() => setShowAudiobookGenerator(true)}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2 text-sm"
                title="Generate an audiobook version"
              >
                <Headphones className="w-4 h-4" />
                Audiobook
              </button>
              <button
                onClick={() => setShowPlatformExport(true)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 text-sm"
                title="Platform Export"
              >
                <Rocket className="w-4 h-4" />
                Publish
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2 text-sm"
                title="Export"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2 text-sm"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>
      {generationStatus?.generationStatus === 'generating' && (
        <div className="bg-blue-900 border-b border-blue-700 px-6 py-2 text-sm text-blue-100 flex items-center gap-3">
          <Loader className="w-4 h-4 animate-spin" />
          <span>
            Generating chapters... {generationStatus.generatedChapters || 0} / {generationStatus.totalChapters || '?'}
          </span>
        </div>
      )}

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar - Chapters List */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          {/* Chapter Outline Section */}
          {project.chapter_outline && Array.isArray(project.chapter_outline) && project.chapter_outline.length > 0 && (
            <div className="p-4 border-b border-gray-700 bg-purple-500/10">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-purple-300">Chapter Outline</h2>
                <button
                  onClick={() => setShowOutline(!showOutline)}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  {showOutline ? 'Hide' : 'Show'}
                </button>
              </div>
              {showOutline && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {project.chapter_outline.map((chapter: any, index: number) => (
                    <div key={index} className="text-xs bg-gray-700/50 p-2 rounded">
                      <div className="font-medium text-purple-300">Chapter {index + 1}: {chapter.title}</div>
                      {chapter.description && (
                        <div className="text-gray-400 mt-1">{chapter.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {chapters.length === 0 && (
                <button
                  onClick={handleGenerateAllChapters}
                  disabled={generatingChapters}
                  className="mt-3 w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {generatingChapters ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      Generate All Chapters
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-300">Chapters</h2>
              <button
                onClick={() => setShowAddChapter(true)}
                className="p-1.5 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                title="Add Chapter"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-gray-400">
              {chapters.length} chapter{chapters.length !== 1 ? 's' : ''} • {project.total_word_count || 0} words
            </div>
          </div>

          <div className="p-2 space-y-1">
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                onClick={() => handleSelectChapter(chapter)}
                className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                  selectedChapter?.id === chapter.id
                    ? 'bg-purple-600/20 border border-purple-500/50'
                    : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">Ch. {chapter.chapter_number}</span>
                      {chapter.title && (
                        <span className="text-sm font-medium text-white truncate">
                          {chapter.title}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {chapter.word_count.toLocaleString()} words
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChapter(chapter.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600/20 rounded transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
            ))}

            {chapters.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No chapters yet</p>
                {(!project.chapter_outline || (Array.isArray(project.chapter_outline) && project.chapter_outline.length === 0)) ? (
                  <div className="mt-3 space-y-2">
                    <button
                      onClick={handleGenerateOutline}
                      disabled={generatingOutline}
                      className="w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded text-sm flex items-center justify-center gap-2"
                    >
                      {generatingOutline ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          Generate Outline with AI
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowAddChapter(true)}
                      className="w-full px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                    >
                      Add Chapter Manually
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddChapter(true)}
                    className="mt-3 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm"
                  >
                    Add First Chapter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedChapter ? (
            <>
              {/* Chapter Header */}
              <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Chapter {selectedChapter.chapter_number}
                    {selectedChapter.title && `: ${selectedChapter.title}`}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedChapter.word_count.toLocaleString()} words
                  </p>
                </div>
                <button
                  onClick={() => handleSaveChapter()}
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>

              {/* Rich Text Editor */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Render based on view mode */}
                  {viewMode === 'page' ? (
                    // Page view: Show template renderer with pagination
                    <div className="bg-gray-800/60 border border-gray-700 rounded p-4">
                      <TemplateRenderer
                        chapter={{ ...selectedChapter, content: editingContent }}
                        template={{
                          template_structure: selectedChapter.template_config?.template_structure
                            || selectedChapter.template_config
                            || { sections: [{ type: 'text', width: '100%' }] }
                        }}
                        viewMode="page"
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(page) => setCurrentPage(page)}
                      />
                      <div className="mt-4 text-sm text-gray-400 flex items-center gap-2">
                        Page view mode. Switch to Chapter View to edit content.
                      </div>
                    </div>
                  ) : (
                    // Chapter view: Show template preview (if enabled) and editor
                    <>
                      {showTemplatePreview && selectedChapter?.page_template && selectedChapter.page_template !== 'standard' ? (
                        <div className="bg-gray-800/60 border border-gray-700 rounded p-4 mb-4">
                          <TemplateRenderer
                            chapter={{ ...selectedChapter, content: editingContent }}
                            template={{
                              template_structure: selectedChapter.template_config?.template_structure
                                || selectedChapter.template_config
                                || { sections: [{ type: 'text', width: '100%' }] }
                            }}
                            viewMode="chapter"
                          />
                          <div className="mt-4 text-sm text-gray-400 flex items-center gap-2">
                            Template preview on. Use the editor below to edit content; apply a different template anytime.
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4">
                        <ReactQuill
                          theme="snow"
                          value={editingContent || ''}
                          onChange={handleContentChange}
                          modules={quillModules}
                          formats={quillFormats}
                          placeholder="Start writing your chapter..."
                          style={{ 
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                          className="ebook-editor"
                          key={selectedChapter.id} // Force re-render when chapter changes
                        />
                      </div>
                    </>
                  )}
                </div>
                {/* Word count and auto-save indicator */}
                <div className="bg-gray-800 border-t border-gray-700 px-6 py-2 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-4">
                    <span>{editingContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
                    {saving && (
                      <span className="flex items-center gap-1">
                        <Loader className="w-3 h-3 animate-spin" />
                        Saving...
                      </span>
                    )}
                    {!saving && selectedChapter && editingContent !== selectedChapter.content && (
                      <span className="text-yellow-400">Unsaved changes</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleSaveChapter()}
                    disabled={saving}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded text-xs transition-colors"
                  >
                    Save Now
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Chapter Selected</h3>
                <p className="text-gray-400 mb-6">
                  {chapters.length === 0
                    ? (!project.chapter_outline || (Array.isArray(project.chapter_outline) && project.chapter_outline.length === 0))
                      ? 'Generate an outline or create your first chapter to get started'
                      : 'Chapters are being generated or select a chapter to edit'
                    : 'Select a chapter from the sidebar to start editing'}
                </p>
                {chapters.length === 0 && (
                  <div className="flex flex-col gap-3 items-center">
                    {(!project.chapter_outline || (Array.isArray(project.chapter_outline) && project.chapter_outline.length === 0)) ? (
                      <>
                        <button
                          onClick={handleGenerateOutline}
                          disabled={generatingOutline}
                          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                        >
                          {generatingOutline ? (
                            <>
                              <Loader className="w-5 h-5 animate-spin" />
                              Generating Outline...
                            </>
                          ) : (
                            <>
                              <FileText className="w-5 h-5" />
                              Generate Outline with AI
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setShowAddChapter(true)}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg inline-flex items-center gap-2"
                        >
                          <Plus className="w-5 h-5" />
                          Add Chapter Manually
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleGenerateAllChapters}
                        disabled={generatingChapters}
                        className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                      >
                        {generatingChapters ? (
                          <>
                            <Loader className="w-5 h-5 animate-spin" />
                            Generating Chapters...
                          </>
                        ) : (
                          <>
                            <Rocket className="w-5 h-5" />
                            Generate All Chapters
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Chapter Modal */}
      {showAddChapter && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-purple-400" />
                Add New Chapter
              </h3>
              <button
                onClick={() => {
                  setShowAddChapter(false);
                  setNewChapterTitle('');
                  setNewChapterContent('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Chapter Title (Optional)
                </label>
                <input
                  type="text"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="e.g., Introduction, Chapter 1, etc."
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Chapter Content *
                </label>
                <textarea
                  value={newChapterContent}
                  onChange={(e) => setNewChapterContent(e.target.value)}
                  placeholder="Start writing your chapter content..."
                  rows={12}
                  className="input-field w-full font-serif"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {newChapterContent.trim().split(/\s+/).filter(w => w).length} words
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    setShowAddChapter(false);
                    setNewChapterTitle('');
                    setNewChapterContent('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddChapter}
                  disabled={!newChapterContent.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  Add Chapter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal (Placeholder) */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Download className="h-5 w-5 text-purple-400" />
                Export eBook
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <button className="w-full p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left flex items-center gap-3 transition-colors">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="font-medium text-white">PDF</div>
                  <div className="text-xs text-gray-400">High-quality PDF format</div>
                </div>
              </button>
              <button className="w-full p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left flex items-center gap-3 transition-colors">
                <Book className="w-5 h-5 text-green-400" />
                <div>
                  <div className="font-medium text-white">ePub</div>
                  <div className="text-xs text-gray-400">eBook format for Kindle, iBooks</div>
                </div>
              </button>
              <button className="w-full p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left flex items-center gap-3 transition-colors">
                <Globe className="w-5 h-5 text-purple-400" />
                <div>
                  <div className="font-medium text-white">Flipbook HTML</div>
                  <div className="text-xs text-gray-400">Interactive HTML flipbook</div>
                </div>
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              Export functionality coming soon
            </p>
          </div>
        </div>
      )}

      {/* Cover Designer Modal */}
      {showCoverDesigner && project && (
        <CoverDesigner
          projectId={project.id}
          projectTitle={project.title}
          projectDescription={project.description || undefined}
          projectGenre={project.genre || undefined}
          currentCoverUrl={project.cover_image_url || undefined}
          onCoverGenerated={(coverUrl) => {
            setProject({ ...project, cover_image_url: coverUrl });
            setShowCoverDesigner(false);
          }}
          onClose={() => setShowCoverDesigner(false)}
        />
      )}

      {/* TOC Preview Modal */}
      {showTOCPreview && project && (
        <TOCPreview
          projectId={project.id}
          onClose={() => setShowTOCPreview(false)}
        />
      )}

      {/* Platform Export Modal */}
      {showPlatformExport && project && (
        <PlatformExport
          projectId={project.id}
          projectTitle={project.title}
          onClose={() => setShowPlatformExport(false)}
        />
      )}

      {/* Settings Modal (Placeholder) */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-400" />
                Project Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 h-5" />
              </button>
            </div>

            <div className="text-center py-12 text-gray-400">
              <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Settings panel coming soon</p>
            </div>
          </div>
        </div>
      )}

      {/* Import Wizard Modal */}
      {showImportWizard && projectId && (
        <ImportWizard
          projectId={projectId}
          onImportComplete={(importedChapters) => {
            // Refresh chapters after import
            fetchChapters();
            setShowImportWizard(false);
          }}
          onClose={() => setShowImportWizard(false)}
        />
      )}

      {/* Cover Designer Modal */}
      {showCoverDesigner && project && (
        <CoverDesigner
          projectId={project.id}
          projectTitle={project.title}
          projectDescription={project.description}
          projectGenre={project.genre}
          currentCoverUrl={project.cover_image_url}
          onCoverGenerated={(coverUrl) => {
            fetchProject();
            setShowCoverDesigner(false);
          }}
          onClose={() => setShowCoverDesigner(false)}
        />
      )}

      {/* TOC Preview Modal */}
      {showTOCPreview && projectId && (
        <TOCPreview
          projectId={projectId}
          onClose={() => setShowTOCPreview(false)}
        />
      )}

      {/* Platform Export Modal */}
      {showPlatformExport && project && (
        <PlatformExport
          projectId={project.id}
          projectTitle={project.title}
          onClose={() => setShowPlatformExport(false)}
        />
      )}

      {/* Audiobook Generator Modal */}
      {showAudiobookGenerator && project && (
        <AudiobookGenerator
          projectId={project.id}
          projectTitle={project.title}
          chapters={chapters.map(ch => ({
            id: ch.id,
            title: ch.title || 'Untitled Chapter',
            word_count: ch.word_count || 0
          }))}
          onClose={() => setShowAudiobookGenerator(false)}
        />
      )}

      {/* Transcription Wizard Modal */}
      {showTranscriptionWizard && project && (
        <TranscriptionWizard
          projectId={project.id}
          chapters={chapters.map(ch => ({
            id: ch.id,
            title: ch.title || 'Untitled Chapter',
            chapter_number: ch.chapter_number
          }))}
          onClose={() => setShowTranscriptionWizard(false)}
          onChapterAdded={() => {
            fetchChapters();
            setShowTranscriptionWizard(false);
          }}
        />
      )}

      {/* Page Numbering Settings Modal */}
      {showPageNumbering && project && (
        <PageNumberingSettings
          projectId={project.id}
          chapters={chapters.map(ch => ({
            id: ch.id,
            title: ch.title || 'Untitled Chapter',
            chapter_number: ch.chapter_number,
            word_count: ch.word_count || 0
          }))}
          onClose={() => setShowPageNumbering(false)}
          onSave={() => {
            // Refresh TOC if needed
            if (showTOCPreview) {
              // TOC will auto-refresh
            }
          }}
        />
      )}

      {/* Sharing & Publishing Modal */}
      {showSharing && project && (
        <SharingPublishing
          projectId={project.id}
          projectTitle={project.title}
          projectDescription={project.description}
          coverImageUrl={project.cover_image_url}
          onClose={() => setShowSharing(false)}
          onUpdate={() => {
            fetchProject();
          }}
        />
      )}

      {/* Page Template Selector Modal */}
      {showTemplateSelector && project && selectedChapter && (
        <PageTemplateSelector
          projectId={project.id}
          chapterId={selectedChapter.id}
          currentTemplate={selectedChapter.page_template || 'standard'}
          onTemplateSelect={handleTemplateSelect}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    </div>
  );
};

export default EBookEditor;

