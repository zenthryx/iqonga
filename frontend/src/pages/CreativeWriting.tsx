import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import ebookService, { EBookProject, EBookChapter } from '../services/ebookService';
import { toast } from 'react-hot-toast';
import { 
  BookOpen, 
  Download, 
  Save, 
  Sparkles, 
  PenTool,
  FileText,
  Book,
  FileEdit,
  CheckCircle,
  Loader,
  Plus,
  Trash2,
  X,
  FolderPlus,
  FolderOpen
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  personality_type: string;
  voice_tone: string;
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface GeneratedContent {
  id?: string;
  title: string;
  content: string;
  contentType: string;
  wordCount: number;
  chapters?: Chapter[];
  createdAt?: string;
  status?: 'draft' | 'published';
}

const CreativeWriting: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [contentType, setContentType] = useState('story');
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('fiction');
  const [targetWordCount, setTargetWordCount] = useState(2000);
  const [style, setStyle] = useState('narrative');
  const [targetAudience, setTargetAudience] = useState('');
  const [characters, setCharacters] = useState('');
  const [plotPoints, setPlotPoints] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<GeneratedContent[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  
  // eBook Project Management
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<EBookProject[]>([]);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [saveToProject, setSaveToProject] = useState(false);

  const contentTypes = [
    { id: 'story', label: 'Short Story', icon: BookOpen, description: 'Short fiction stories' },
    { id: 'book_chapter', label: 'Book Chapter', icon: Book, description: 'Individual book chapters' },
    { id: 'poem', label: 'Poem', icon: PenTool, description: 'Poetry and verses' },
    { id: 'children_book', label: 'Children\'s Book', icon: BookOpen, description: 'Children\'s stories' },
    { id: 'screenplay', label: 'Screenplay', icon: FileText, description: 'Scripts and screenplays' },
    { id: 'creative_nonfiction', label: 'Creative Nonfiction', icon: FileEdit, description: 'Creative nonfiction' }
  ];

  const genres = [
    'Fiction', 'Non-Fiction', 'Fantasy', 'Science Fiction', 'Mystery', 
    'Romance', 'Horror', 'Thriller', 'Historical', 'Literary', 'Young Adult',
    'Children', 'Poetry', 'Drama', 'Comedy'
  ];

  const styles = [
    { value: 'narrative', label: 'Narrative' },
    { value: 'descriptive', label: 'Descriptive' },
    { value: 'dialogue', label: 'Dialogue-Heavy' },
    { value: 'stream_of_consciousness', label: 'Stream of Consciousness' },
    { value: 'poetic', label: 'Poetic' },
    { value: 'minimalist', label: 'Minimalist' }
  ];

  useEffect(() => {
    fetchAgents();
    fetchDrafts();
    fetchTemplates();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await ebookService.getProjects({ limit: 50 });
      if (response.success && response.data) {
        setProjects(response.data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await apiService.get('/content-series/templates/list') as any;
      if (response.success && response.data) {
        setTemplates(response.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await apiService.get('/agents') as any;
      if (response.success && response.data) {
        setAgents(response.data);
        if (response.data.length > 0) {
          setSelectedAgent(response.data[0].id);
        }
      }
    } catch (error) {
      toast.error('Failed to fetch agents');
    }
  };

  const fetchDrafts = async () => {
    try {
      const response = await apiService.get('/content/creative/drafts') as any;
      if (response.success && response.data) {
        setSavedDrafts(response.data);
      }
    } catch (error) {
      // Drafts endpoint might not exist yet
    }
  };

  const handleGenerate = async () => {
    if (!selectedAgent) {
      toast.error('Please select an AI agent');
      return;
    }

    if (!topic.trim()) {
      toast.error('Please enter a topic or prompt');
      return;
    }

    setGenerating(true);
    try {
      const response = await apiService.post('/content/creative/generate', {
        agent_id: selectedAgent,
        content_type: contentType,
        topic: topic.trim(),
        title: title.trim() || undefined,
        genre: genre.toLowerCase(),
        target_word_count: targetWordCount,
        style,
        target_audience: targetAudience.trim() || undefined,
        characters: characters.trim() || undefined,
        plot_points: plotPoints.trim() || undefined,
        template_id: selectedTemplate || undefined
      });

      if (response.success) {
        setGeneratedContent({
          title: response.data.title || topic,
          content: response.data.content,
          contentType,
          wordCount: response.data.word_count || 0,
          chapters: response.data.chapters || []
        });
        toast.success('Content generated successfully!');
      } else {
        toast.error(response.error || 'Failed to generate content');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!generatedContent) {
      toast.error('No content to save');
      return;
    }

    // If saving to project, create/update chapter
    if (saveToProject && selectedProject) {
      try {
        const project = projects.find(p => p.id === selectedProject);
        if (!project) {
          toast.error('Selected project not found');
          return;
        }

        // Create chapter from generated content
        const chapterData = {
          title: generatedContent.title,
          content: currentChapter ? currentChapter.content : generatedContent.content,
          chapterNumber: undefined, // Auto-assign
          orderIndex: undefined // Auto-assign
        };

        const response = await ebookService.createChapter(selectedProject, chapterData);
        if (response.success) {
          toast.success('Chapter saved to project!');
          fetchProjects();
          // Update project status if needed
          if (project.status === 'draft') {
            await ebookService.updateProject(selectedProject, { status: 'in_progress' });
          }
        }
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to save chapter to project');
      }
      return;
    }

    // Otherwise, save as regular draft
    try {
      const response = await apiService.post('/content/creative/drafts', {
        title: generatedContent.title,
        content: generatedContent.content,
        content_type: contentType,
        word_count: generatedContent.wordCount,
        chapters: generatedContent.chapters || []
      });

      if (response.success) {
        toast.success('Draft saved successfully!');
        fetchDrafts();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save draft');
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) {
      toast.error('Project title is required');
      return;
    }

    try {
      const response = await ebookService.createProject({
        title: newProjectTitle.trim(),
        description: newProjectDescription.trim() || undefined,
        genre: genre || undefined,
        agentId: selectedAgent || undefined,
        language: 'en'
      });

      if (response.success && response.data) {
        toast.success('Project created successfully!');
        setSelectedProject(response.data.id);
        setSaveToProject(true);
        setShowCreateProject(false);
        setNewProjectTitle('');
        setNewProjectDescription('');
        fetchProjects();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create project');
    }
  };

  const handleExport = (format: 'pdf' | 'epub' | 'docx' | 'txt') => {
    if (!generatedContent) return;

    // For now, we'll export as text/markdown
    // Full PDF/EPUB export would require a backend service
    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'txt' || format === 'pdf' || format === 'epub' || format === 'docx') {
      // Simple text export for now
      content = `# ${generatedContent.title}\n\n${generatedContent.content}`;
      
      if (format === 'txt') {
        filename = `${generatedContent.title.replace(/\s+/g, '-')}.txt`;
        mimeType = 'text/plain';
      } else {
        // For PDF/EPUB/DOCX, we'd need backend conversion
        toast(`${format.toUpperCase()} export coming soon! Exporting as text for now.`, {
          icon: 'ℹ️',
          duration: 3000
        });
        filename = `${generatedContent.title.replace(/\s+/g, '-')}.txt`;
        mimeType = 'text/plain';
      }
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported as ${format.toUpperCase()}`);
  };

  const loadDraft = (draft: GeneratedContent) => {
    setGeneratedContent(draft);
    setContentType(draft.contentType);
    setTitle(draft.title);
    setShowDrafts(false);
    toast.success('Draft loaded');
  };

  const addChapter = () => {
    if (!generatedContent) return;
    
    const newChapter: Chapter = {
      id: Date.now().toString(),
      title: `Chapter ${(generatedContent.chapters?.length || 0) + 1}`,
      content: '',
      order: (generatedContent.chapters?.length || 0) + 1
    };

    setGeneratedContent({
      ...generatedContent,
      chapters: [...(generatedContent.chapters || []), newChapter]
    });
    setCurrentChapter(newChapter);
  };

  const updateChapter = (chapterId: string, updates: Partial<Chapter>) => {
    if (!generatedContent || !generatedContent.chapters) return;

    setGeneratedContent({
      ...generatedContent,
      chapters: generatedContent.chapters.map(ch =>
        ch.id === chapterId ? { ...ch, ...updates } : ch
      )
    });
  };

  const deleteChapter = (chapterId: string) => {
    if (!generatedContent || !generatedContent.chapters) return;

    setGeneratedContent({
      ...generatedContent,
      chapters: generatedContent.chapters.filter(ch => ch.id !== chapterId)
    });

    if (currentChapter?.id === chapterId) {
      setCurrentChapter(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <PenTool className="h-8 w-8 text-purple-400" />
              Creative Writing
            </h1>
            <p className="text-gray-400 mt-2">
              Write books, stories, poems, and more with AI
            </p>
          </div>
          {savedDrafts.length > 0 && (
            <button
              onClick={() => setShowDrafts(!showDrafts)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              {showDrafts ? 'Hide' : 'Show'} Drafts ({savedDrafts.length})
            </button>
          )}
        </div>

        {/* Drafts Panel */}
        {showDrafts && savedDrafts.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Saved Drafts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 cursor-pointer transition-colors"
                  onClick={() => loadDraft(draft)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-white truncate">{draft.title}</h4>
                    {draft.status === 'published' && (
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 ml-2" />
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{draft.contentType}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{draft.wordCount} words</span>
                    {draft.chapters && draft.chapters.length > 0 && (
                      <span>{draft.chapters.length} chapters</span>
                    )}
                    {draft.createdAt && (
                      <span>{new Date(draft.createdAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                Configuration
              </h2>

              {/* Agent Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  AI Agent *
                </label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select an agent...</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.personality_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Content Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Content Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {contentTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setContentType(type.id)}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          contentType === type.id
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                        }`}
                      >
                        <Icon className="h-5 w-5 mb-1 text-purple-400" />
                        <div className="text-sm font-medium">{type.label}</div>
                        <div className="text-xs text-gray-400 mt-1">{type.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Template Selection */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Content Template (Optional)
                  </label>
                  <button
                    onClick={() => setShowTemplates(true)}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    Browse Templates
                  </button>
                </div>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">None (Free-form)</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.framework_type})
                    </option>
                  ))}
                </select>
                {selectedTemplate && (
                  <p className="mt-1 text-xs text-gray-400">
                    {templates.find(t => t.id === selectedTemplate)?.description}
                  </p>
                )}
              </div>

              {/* Topic/Prompt */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Topic / Prompt *
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Describe what you want to write about..."
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Title (Optional) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Auto-generated if left empty"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Genre */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Genre
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {genres.map((g) => (
                    <option key={g.toLowerCase()} value={g.toLowerCase()}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Word Count */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Word Count: {targetWordCount}
                </label>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="100"
                  value={targetWordCount}
                  onChange={(e) => setTargetWordCount(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>500</span>
                  <span>5000</span>
                  <span>10000</span>
                </div>
              </div>

              {/* Style */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Writing Style
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {styles.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Audience */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Audience (Optional)
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., Young adults, Children 5-8"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Characters */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Characters (Optional)
                </label>
                <textarea
                  value={characters}
                  onChange={(e) => setCharacters(e.target.value)}
                  placeholder="Describe main characters (one per line)"
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Plot Points */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Plot Points (Optional)
                </label>
                <textarea
                  value={plotPoints}
                  onChange={(e) => setPlotPoints(e.target.value)}
                  placeholder="Key plot points or story structure (one per line)"
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Project Management */}
              <div className="mb-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <FolderOpen className="h-4 w-4" />
                    Save to eBook Project
                  </label>
                  <input
                    type="checkbox"
                    checked={saveToProject}
                    onChange={(e) => setSaveToProject(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500"
                  />
                </div>
                
                {saveToProject && (
                  <div className="space-y-2">
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select Project...</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.title} ({project.status})
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowCreateProject(true)}
                        className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                      >
                        <FolderPlus className="h-4 w-4" />
                        New Project
                      </button>
                      <button
                        onClick={() => setShowProjectSelector(true)}
                        className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm"
                      >
                        Browse
                      </button>
                    </div>
                    {selectedProject && (
                      <p className="text-xs text-gray-400">
                        Content will be saved as a new chapter in the selected project
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating || !selectedAgent || !topic.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate Content
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Panel - Generated Content */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-purple-400" />
                  Generated Content
                </h2>
                {generatedContent && (
                  <div className="flex items-center gap-2">
                    {contentType === 'book_chapter' && (
                      <button
                        onClick={addChapter}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Chapter
                      </button>
                    )}
                    <button
                      onClick={handleSaveDraft}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save Draft
                    </button>
                    <div className="relative group">
                      <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Export
                      </button>
                      <div className="absolute right-0 mt-2 w-40 bg-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <button
                          onClick={() => handleExport('txt')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-600 rounded-t-lg"
                        >
                          Text (.txt)
                        </button>
                        <button
                          onClick={() => handleExport('pdf')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-600"
                        >
                          PDF (.pdf)
                        </button>
                        <button
                          onClick={() => handleExport('epub')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-600"
                        >
                          EPUB (.epub)
                        </button>
                        <button
                          onClick={() => handleExport('docx')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-600 rounded-b-lg"
                        >
                          Word (.docx)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {generatedContent ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-700">
                    <h3 className="text-2xl font-bold">{generatedContent.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>{generatedContent.wordCount} words</span>
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                        {contentTypes.find(t => t.id === contentType)?.label}
                      </span>
                    </div>
                  </div>

                  {/* Chapters Navigation (for book chapters) */}
                  {generatedContent.chapters && generatedContent.chapters.length > 0 && (
                    <div className="mb-4 pb-4 border-b border-gray-700">
                      <div className="flex items-center gap-2 flex-wrap">
                        {generatedContent.chapters.map((chapter) => (
                          <button
                            key={chapter.id}
                            onClick={() => setCurrentChapter(chapter)}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                              currentChapter?.id === chapter.id
                                ? 'bg-purple-500 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {chapter.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content Display */}
                  <div className="prose prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                      {currentChapter ? currentChapter.content : generatedContent.content}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <PenTool className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Generated content will appear here</p>
                  <p className="text-sm mt-2">Configure your settings and click "Generate Content"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-purple-400" />
                Create New eBook Project
              </h3>
              <button onClick={() => setShowCreateProject(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Title *
                </label>
                <input
                  type="text"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="Enter project title..."
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Brief description of your eBook..."
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateProject(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectTitle.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Selector Modal */}
      {showProjectSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6 border border-gray-700 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-purple-400" />
                Select eBook Project
              </h3>
              <button onClick={() => setShowProjectSelector(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No projects yet</p>
                <button
                  onClick={() => {
                    setShowProjectSelector(false);
                    setShowCreateProject(true);
                  }}
                  className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                >
                  Create Your First Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project.id);
                      setShowProjectSelector(false);
                    }}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      selectedProject === project.id
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500 hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-semibold text-white mb-1">{project.title}</div>
                    {project.description && (
                      <div className="text-sm text-gray-400 mb-2 line-clamp-2">{project.description}</div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {project.genre && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                          {project.genre}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-xs ${
                        project.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                        project.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {project.status}
                      </span>
                      {project.chapter_count !== undefined && (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                          {project.chapter_count} chapters
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6 border border-gray-700 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-400" />
                Content Templates
              </h3>
              <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setShowTemplates(false);
                  }}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    selectedTemplate === template.id
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-600 bg-gray-700 hover:border-gray-500 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-semibold text-white mb-1">{template.name}</div>
                  <div className="text-sm text-gray-400 mb-2">{template.description}</div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                      {template.framework_type}
                    </span>
                    {template.category && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                        {template.category}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreativeWriting;

