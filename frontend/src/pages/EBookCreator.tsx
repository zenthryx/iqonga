import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ebookService, { EBookProject, EBookChapter } from '../services/ebookService';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  BookOpen,
  Plus,
  FolderOpen,
  Download,
  Upload,
  Image as ImageIcon,
  FileText,
  Video,
  Music,
  Settings,
  Eye,
  Edit,
  Trash2,
  Copy,
  Share2,
  Loader,
  Search,
  Filter,
  X,
  FileDown,
  FileUp,
  Globe,
  File,
  Book,
  Headphones,
  Type,
  Layout
} from 'lucide-react';

const EBookCreator: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<EBookProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [genreFilter, setGenreFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<EBookProject | null>(null);
  const [showProjectDetails, setShowProjectDetails] = useState(false);

  // Create project form
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectGenre, setNewProjectGenre] = useState('');
  const [newProjectLanguage, setNewProjectLanguage] = useState('en');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [agents, setAgents] = useState<any[]>([]);
  const [numberOfChapters, setNumberOfChapters] = useState<number>(5);
  const [targetWordCount, setTargetWordCount] = useState<number>(2000);
  const [wordCountType, setWordCountType] = useState<'total' | 'per_chapter'>('per_chapter');
  const [writingStyle, setWritingStyle] = useState<string>('');
  const [autoGenerateChapters, setAutoGenerateChapters] = useState<boolean>(false);

  const genres = [
    'Fiction', 'Non-Fiction', 'Fantasy', 'Science Fiction', 'Mystery',
    'Romance', 'Horror', 'Thriller', 'Historical', 'Literary', 'Young Adult',
    'Children', 'Business', 'Self-Help', 'Educational', 'Biography'
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'sw', name: 'Swahili' },
    { code: 'rw', name: 'Kinyarwanda' },
    { code: 'yo', name: 'Yoruba' },
    { code: 'ig', name: 'Igbo' },
    { code: 'ha', name: 'Hausa' },
    { code: 'xh', name: 'Xhosa' },
    { code: 'zu', name: 'Zulu' }
  ];

  useEffect(() => {
    fetchProjects();
    fetchAgents();
  }, [searchQuery, statusFilter, genreFilter]);

  const fetchAgents = async () => {
    try {
      const response = await apiService.get('/agents') as any;
      if (response.success && response.data) {
        setAgents(response.data);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await ebookService.getProjects({
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        genre: genreFilter || undefined,
        limit: 50
      });

      if (response.success && response.data) {
        setProjects(response.data.projects || []);
      }
    } catch (error: any) {
      toast.error('Failed to load projects');
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
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
        genre: newProjectGenre || undefined,
        language: newProjectLanguage,
        agentId: selectedAgent || undefined,
        numberOfChapters: autoGenerateChapters ? numberOfChapters : undefined,
        targetWordCount: autoGenerateChapters ? targetWordCount : undefined,
        wordCountType: autoGenerateChapters ? wordCountType : undefined,
        writingStyle: writingStyle || undefined,
        autoGenerateChapters: autoGenerateChapters
      });

      if (response.success && response.data) {
        toast.success('Project created successfully!');
        setShowCreateModal(false);
        setNewProjectTitle('');
        setNewProjectDescription('');
        setNewProjectGenre('');
        setSelectedAgent('');
        setNumberOfChapters(5);
        setTargetWordCount(2000);
        setWordCountType('per_chapter');
        setWritingStyle('');
        setAutoGenerateChapters(false);
        fetchProjects();
        // Navigate to project editor
        navigate(`/ebook-editor/${response.data.id}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create project');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await ebookService.deleteProject(projectId);
      if (response.success) {
        toast.success('Project deleted successfully');
        fetchProjects();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete project');
    }
  };

  const handleCloneProject = async (projectId: string) => {
    try {
      const response = await ebookService.cloneProject(projectId);
      if (response.success && response.data) {
        toast.success('Project cloned successfully!');
        fetchProjects();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to clone project');
    }
  };

  const handleShareProject = async (project: EBookProject) => {
    try {
      // Update visibility to unlisted for sharing
      const updates: any = {};
      if (project.visibility === 'private') {
        updates.visibility = 'unlisted';
        await ebookService.updateProject(project.id, updates);
      }

      const shareUrl = `${window.location.origin}/ebook/${project.share_token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch (error: any) {
      toast.error('Failed to generate share link');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'published': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-purple-400" />
              eBook Creator
            </h1>
            <p className="text-gray-400 mt-2">
              Create, manage, and publish professional eBooks with AI assistance
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>New eBook Project</span>
          </button>
        </div>

        {/* Filters */}
        <div className="glass-card p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="published">Published</option>
            </select>
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Genres</option>
              {genres.map((g) => (
                <option key={g} value={g.toLowerCase()}>{g}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setGenreFilter('');
              }}
              className="btn-secondary flex items-center justify-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Clear Filters</span>
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No eBook Projects Yet</h3>
            <p className="text-gray-400 mb-6">
              Create your first eBook project to get started
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="glass-card p-6 hover:border-purple-500/50 transition-all cursor-pointer group"
                onClick={() => navigate(`/ebook-editor/${project.id}`)}
              >
                {/* Cover Image or Placeholder */}
                <div className="aspect-[3/4] bg-gray-800 rounded-lg mb-4 overflow-hidden relative">
                  {project.cover_image_url ? (
                    <img
                      src={project.cover_image_url}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-gray-600" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium border ${getStatusColor(project.status)}`}>
                    {project.status.replace('_', ' ')}
                  </div>

                  {/* Action Buttons (on hover) */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/ebook-editor/${project.id}`);
                        }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareProject(project);
                        }}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                        title="Share"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloneProject(project.id);
                        }}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                        title="Clone"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Project Info */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">
                    {project.title}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-3">
                      {project.genre && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                          {project.genre}
                        </span>
                      )}
                      {project.chapter_count !== undefined && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {project.chapter_count} chapters
                        </span>
                      )}
                    </div>
                    {project.total_word_count !== undefined && project.total_word_count > 0 && (
                      <span>{project.total_word_count.toLocaleString()} words</span>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    Updated {new Date(project.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Project Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 border border-gray-700 my-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus className="h-5 w-5 text-purple-400" />
                  Create New eBook Project
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewProjectTitle('');
                    setNewProjectDescription('');
                    setNewProjectGenre('');
                    setSelectedAgent('');
                    setNumberOfChapters(5);
                    setTargetWordCount(2000);
                    setWordCountType('per_chapter');
                    setWritingStyle('');
                    setAutoGenerateChapters(false);
                  }}
                  className="text-gray-400 hover:text-white"
                >
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
                    placeholder="Enter your eBook title..."
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Brief description of your eBook..."
                    rows={3}
                    className="input-field w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Genre
                    </label>
                    <select
                      value={newProjectGenre}
                      onChange={(e) => setNewProjectGenre(e.target.value)}
                      className="input-field w-full"
                    >
                      <option value="">Select Genre...</option>
                      {genres.map((g) => (
                        <option key={g} value={g.toLowerCase()}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Language
                    </label>
                    <select
                      value={newProjectLanguage}
                      onChange={(e) => setNewProjectLanguage(e.target.value)}
                      className="input-field w-full"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    AI Agent (Optional)
                  </label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="">No Agent (Manual Writing)</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Select an AI agent to help generate content with its personality
                  </p>
                </div>

                {/* AI Generation Options */}
                <div className="pt-4 border-t border-gray-700 space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoGenerate"
                      checked={autoGenerateChapters}
                      onChange={(e) => setAutoGenerateChapters(e.target.checked)}
                      className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="autoGenerate" className="text-sm font-medium text-gray-300">
                      Auto-generate chapters with AI
                    </label>
                  </div>

                  {autoGenerateChapters && (
                    <div className="space-y-4 pl-6 border-l-2 border-purple-500/30">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Number of Chapters *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={numberOfChapters}
                            onChange={(e) => setNumberOfChapters(parseInt(e.target.value) || 5)}
                            className="input-field w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Target Word Count *
                          </label>
                          <input
                            type="number"
                            min="500"
                            value={targetWordCount}
                            onChange={(e) => setTargetWordCount(parseInt(e.target.value) || 2000)}
                            className="input-field w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Word Count Type
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="wordCountType"
                              value="per_chapter"
                              checked={wordCountType === 'per_chapter'}
                              onChange={(e) => setWordCountType(e.target.value as 'per_chapter')}
                              className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600"
                            />
                            <span className="text-sm text-gray-300">Per Chapter</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="wordCountType"
                              value="total"
                              checked={wordCountType === 'total'}
                              onChange={(e) => setWordCountType(e.target.value as 'total')}
                              className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600"
                            />
                            <span className="text-sm text-gray-300">Total (entire book)</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Writing Style
                        </label>
                        <select
                          value={writingStyle}
                          onChange={(e) => setWritingStyle(e.target.value)}
                          className="input-field w-full"
                        >
                          <option value="">Select Style...</option>
                          <option value="professional">Professional</option>
                          <option value="casual">Casual</option>
                          <option value="academic">Academic</option>
                          <option value="creative">Creative</option>
                          <option value="conversational">Conversational</option>
                          <option value="technical">Technical</option>
                          <option value="narrative">Narrative</option>
                        </select>
                      </div>

                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                        <p className="text-xs text-purple-300">
                          <strong>Note:</strong> AI generation will cost {numberOfChapters * 15} credits 
                          ({numberOfChapters} chapters × 15 credits each). 
                          An outline will be generated first (10 credits), then all chapters.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewProjectTitle('');
                      setNewProjectDescription('');
                      setNewProjectGenre('');
                      setSelectedAgent('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectTitle.trim()}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Project
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EBookCreator;

