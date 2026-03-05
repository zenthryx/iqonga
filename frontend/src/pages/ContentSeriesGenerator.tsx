import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  Sparkles,
  Calendar,
  FileText,
  Play,
  CheckCircle,
  Clock,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Copy,
  Zap,
  Layers,
  TrendingUp,
  BookOpen,
  Lightbulb,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Agent {
  id: string;
  name: string;
  personality_type: string;
}

interface ContentSeries {
  id: string;
  title: string;
  description: string;
  series_type: string;
  topic: string;
  total_pieces: number;
  status: string;
  generation_progress: number;
  created_at: string;
  pieces?: ContentPiece[];
}

interface ContentPiece {
  id: string;
  piece_number: number;
  platform: string;
  content_type: string;
  content_text: string;
  status: string;
  scheduled_time?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  framework_type: string;
  category: string;
}

const ContentSeriesGenerator: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [series, setSeries] = useState<ContentSeries[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<ContentSeries | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    agent_id: '',
    series_type: 'educational',
    theme: '',
    topic: '',
    total_pieces: 7,
    platforms: ['twitter'] as string[],
    content_types: ['tweet'] as string[],
    progression_type: 'linear',
    start_date: '',
    frequency: 'daily',
    timezone: 'UTC',
    auto_schedule: false,
    template_id: '',
  });

  useEffect(() => {
    fetchAgents();
    fetchSeries();
    fetchTemplates();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await apiService.get('/agents') as any;
      if (response.success && response.data) {
        setAgents(response.data);
        if (response.data.length > 0 && !formData.agent_id) {
          setFormData(prev => ({ ...prev, agent_id: response.data[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchSeries = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/content-series') as any;
      if (response.success && response.data) {
        setSeries(response.data);
      }
    } catch (error) {
      console.error('Error fetching series:', error);
      toast.error('Failed to load content series');
    } finally {
      setLoading(false);
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

  const handleCreateSeries = async () => {
    if (!formData.title || !formData.topic || !formData.agent_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await apiService.post('/content-series', formData) as any;
      if (response.success) {
        toast.success('Content series created!');
        setShowCreateModal(false);
        fetchSeries();
        // Reset form
        setFormData({
          title: '',
          description: '',
          agent_id: agents[0]?.id || '',
          series_type: 'educational',
          theme: '',
          topic: '',
          total_pieces: 7,
          platforms: ['twitter'],
          content_types: ['tweet'],
          progression_type: 'linear',
          start_date: '',
          frequency: 'daily',
          timezone: 'UTC',
          auto_schedule: false,
          template_id: '',
        });
      }
    } catch (error: any) {
      console.error('Error creating series:', error);
      toast.error(error?.message || 'Failed to create content series');
    }
  };

  const handleGenerateSeries = async (seriesId: string) => {
    try {
      setGenerating(seriesId);
      const response = await apiService.post(`/content-series/${seriesId}/generate`) as any;
      if (response.success) {
        toast.success('Series generation started! This may take a few minutes.');
        // Poll for updates
        pollSeriesStatus(seriesId);
      }
    } catch (error: any) {
      console.error('Error generating series:', error);
      toast.error(error?.message || 'Failed to start series generation');
      setGenerating(null);
    }
  };

  const pollSeriesStatus = async (seriesId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const response = await apiService.get(`/content-series/${seriesId}`) as any;
        if (response.success && response.data) {
          const series = response.data;
          if (series.status === 'ready' || series.status === 'failed') {
            clearInterval(interval);
            setGenerating(null);
            fetchSeries();
            if (series.status === 'ready') {
              toast.success('Series generation completed!');
            }
          }
        }
      } catch (error) {
        console.error('Error polling series status:', error);
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setGenerating(null);
        toast.error('Generation timeout. Please refresh to check status.');
      }
    }, 5000); // Poll every 5 seconds
  };

  const handleViewSeries = async (seriesId: string) => {
    try {
      const response = await apiService.get(`/content-series/${seriesId}`) as any;
      if (response.success && response.data) {
        setSelectedSeries(response.data);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load series details');
    }
  };

  const handleScheduleSeries = async (seriesId: string) => {
    try {
      const response = await apiService.post(`/content-series/${seriesId}/schedule`, {
        startDate: formData.start_date || new Date().toISOString().split('T')[0],
        frequency: formData.frequency,
        timezone: formData.timezone,
      }) as any;
      if (response.success) {
        toast.success('Series scheduled successfully!');
        fetchSeries();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to schedule series');
    }
  };

  const seriesTypes = [
    { value: 'educational', label: 'Educational Series', icon: BookOpen, description: 'Progressive learning content' },
    { value: 'product_launch', label: 'Product Launch', icon: Target, description: 'Product announcement campaign' },
    { value: 'thought_leadership', label: 'Thought Leadership', icon: Lightbulb, description: 'Expert insights and opinions' },
    { value: 'narrative', label: 'Narrative Series', icon: FileText, description: 'Story-driven content progression' },
    { value: 'custom', label: 'Custom', icon: Layers, description: 'Custom series structure' },
  ];

  const progressionTypes = [
    { value: 'linear', label: 'Linear', description: 'Part 1, Part 2, Part 3...' },
    { value: 'thematic', label: 'Thematic', description: 'Different aspects each piece' },
    { value: 'narrative', label: 'Narrative', description: 'Story progression' },
    { value: 'educational', label: 'Educational', description: 'Basics → Intermediate → Advanced' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-400" />
            Content Series Generator
          </h1>
          <p className="text-gray-400 mt-1">
            Create multi-piece content campaigns and series that build on each other
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <FileText className="h-4 w-4" />
            Templates
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Series
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start">
          <Sparkles className="h-5 w-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-300 mb-1">Content Series Benefits</p>
            <p className="text-sm text-gray-400">
              Generate 5-30 related content pieces around a single topic. Each piece builds on the previous one,
              creating a cohesive narrative or educational progression. Auto-schedule across multiple platforms.
            </p>
          </div>
        </div>
      </div>

      {/* Series List */}
      {series.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No content series yet</h3>
          <p className="text-gray-500 mb-4">Create your first content series to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            Create Series
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {series.map((s) => (
            <div key={s.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">{s.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2">{s.description || s.topic}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white capitalize">{s.series_type.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Pieces:</span>
                  <span className="text-white">{s.total_pieces}</span>
                </div>
                {s.status === 'generating' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Progress:</span>
                      <span className="text-white">{s.generation_progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${s.generation_progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {s.status === 'draft' && (
                  <button
                    onClick={() => handleGenerateSeries(s.id)}
                    disabled={generating === s.id}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50"
                  >
                    {generating === s.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    Generate
                  </button>
                )}
                {s.status === 'ready' && (
                  <>
                    <button
                      onClick={() => handleViewSeries(s.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleScheduleSeries(s.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                    >
                      <Calendar className="h-4 w-4" />
                      Schedule
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleViewSeries(s.id)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Series Modal */}
      {showCreateModal && (
        <CreateSeriesModal
          formData={formData}
          setFormData={setFormData}
          agents={agents}
          templates={templates}
          seriesTypes={seriesTypes}
          progressionTypes={progressionTypes}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSeries}
        />
      )}

      {/* View Series Modal */}
      {selectedSeries && (
        <ViewSeriesModal
          series={selectedSeries}
          onClose={() => setSelectedSeries(null)}
          onSchedule={() => handleScheduleSeries(selectedSeries.id)}
        />
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <TemplatesModal
          templates={templates}
          onClose={() => setShowTemplates(false)}
          onSelect={(template) => {
            setFormData(prev => ({ ...prev, template_id: template.id }));
            setShowTemplates(false);
            setShowCreateModal(true);
          }}
        />
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    draft: { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', icon: FileText },
    generating: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: Loader2 },
    ready: { color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: CheckCircle },
    scheduled: { color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: Calendar },
    active: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: Play },
    completed: { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', icon: CheckCircle },
    paused: { color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: Clock },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded border text-xs ${config.color}`}>
      <Icon className="h-3 w-3" />
      <span className="capitalize">{status}</span>
    </div>
  );
};

const CreateSeriesModal = ({
  formData,
  setFormData,
  agents,
  templates,
  seriesTypes,
  progressionTypes,
  onClose,
  onSubmit,
}: {
  formData: any;
  setFormData: any;
  agents: Agent[];
  templates: Template[];
  seriesTypes: any[];
  progressionTypes: any[];
  onClose: () => void;
  onSubmit: () => void;
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl p-6 border border-gray-700 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-400" />
            Create Content Series
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Series Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., AI Agents 101 Series"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the series..."
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Agent Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              AI Agent *
            </label>
            <select
              value={formData.agent_id}
              onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.personality_type})
                </option>
              ))}
            </select>
          </div>

          {/* Series Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Series Type *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {seriesTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setFormData({ ...formData, series_type: type.value })}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      formData.series_type === type.value
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <Icon className="h-5 w-5 text-blue-400 mb-2" />
                    <div className="text-sm font-medium text-white">{type.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{type.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Main Topic *
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="e.g., AI agents in customer service, blockchain technology"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Number of Pieces
              </label>
              <input
                type="number"
                min="3"
                max="30"
                value={formData.total_pieces}
                onChange={(e) => setFormData({ ...formData, total_pieces: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Progression Type
              </label>
              <select
                value={formData.progression_type}
                onChange={(e) => setFormData({ ...formData, progression_type: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {progressionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scheduling */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Frequency
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto_schedule"
              checked={formData.auto_schedule}
              onChange={(e) => setFormData({ ...formData, auto_schedule: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="auto_schedule" className="text-sm text-gray-300">
              Auto-schedule pieces after generation
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Series
          </button>
        </div>
      </div>
    </div>
  );
};

const ViewSeriesModal = ({
  series,
  onClose,
  onSchedule,
}: {
  series: ContentSeries;
  onClose: () => void;
  onSchedule: () => void;
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6 border border-gray-700 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{series.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {series.pieces && series.pieces.length > 0 ? (
            series.pieces.map((piece) => (
              <div key={piece.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                      Piece {piece.piece_number}
                    </span>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                      {piece.platform}
                    </span>
                    <StatusBadge status={piece.status} />
                  </div>
                </div>
                <p className="text-white text-sm mt-2 whitespace-pre-wrap">{piece.content_text}</p>
                {piece.scheduled_time && (
                  <div className="mt-2 text-xs text-gray-400">
                    Scheduled: {new Date(piece.scheduled_time).toLocaleString()}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">No pieces generated yet</div>
          )}
        </div>

        {series.status === 'ready' && (
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-700">
            <button
              onClick={onSchedule}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Schedule All
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TemplatesModal = ({
  templates,
  onClose,
  onSelect,
}: {
  templates: Template[];
  onClose: () => void;
  onSelect: (template: Template) => void;
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6 border border-gray-700 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Content Templates</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 hover:border-blue-500 text-left transition-colors"
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
  );
};

export default ContentSeriesGenerator;

