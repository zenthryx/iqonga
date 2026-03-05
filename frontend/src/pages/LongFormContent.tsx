import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FileText, 
  Download, 
  Save, 
  Sparkles, 
  BookOpen, 
  Newspaper,
  Mail,
  Globe,
  FileEdit,
  CheckCircle,
  XCircle,
  Loader,
  X
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  personality_type: string;
  voice_tone: string;
}

interface GeneratedContent {
  id?: string;
  title: string;
  content: string;
  contentType: string;
  wordCount: number;
  createdAt?: string;
  status?: 'draft' | 'published';
}

const LongFormContent: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [contentType, setContentType] = useState('blog');
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [targetWordCount, setTargetWordCount] = useState(1000);
  const [tone, setTone] = useState('professional');
  const [includeSEO, setIncludeSEO] = useState(true);
  const [targetAudience, setTargetAudience] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<GeneratedContent[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const contentTypes = [
    { id: 'blog', label: 'Blog Post', icon: BookOpen, description: 'SEO-optimized blog articles' },
    { id: 'newsletter', label: 'Newsletter', icon: Mail, description: 'Email newsletters and updates' },
    { id: 'substack', label: 'Substack Article', icon: Newspaper, description: 'Substack-style long-form content' },
    { id: 'medium', label: 'Medium Article', icon: Globe, description: 'Medium publication articles' },
    { id: 'press_release', label: 'Press Release', icon: FileText, description: 'Official press releases' },
    { id: 'whitepaper', label: 'Whitepaper', icon: FileEdit, description: 'In-depth research documents' },
    { id: 'case_study', label: 'Case Study', icon: BookOpen, description: 'Detailed case studies' },
    { id: 'article', label: 'General Article', icon: FileText, description: 'General long-form articles' }
  ];

  const toneOptions = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'authoritative', label: 'Authoritative' },
    { value: 'conversational', label: 'Conversational' },
    { value: 'academic', label: 'Academic' },
    { value: 'journalistic', label: 'Journalistic' }
  ];

  useEffect(() => {
    fetchAgents();
    fetchDrafts();
    fetchTemplates();
  }, []);

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
      const response = await apiService.get('/content/long-form/drafts') as any;
      if (response.success && response.data) {
        setSavedDrafts(response.data);
      }
    } catch (error) {
      // Drafts endpoint might not exist yet, that's okay
    }
  };

  const handleGenerate = async () => {
    if (!selectedAgent) {
      toast.error('Please select an AI agent');
      return;
    }

    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setGenerating(true);
    try {
      const response = await apiService.post('/content/long-form/generate', {
        agent_id: selectedAgent,
        content_type: contentType,
        topic: topic.trim(),
        title: title.trim() || undefined,
        target_word_count: targetWordCount,
        tone,
        include_seo: includeSEO,
        target_audience: targetAudience.trim() || undefined,
        key_points: keyPoints.trim() || undefined,
        template_id: selectedTemplate || undefined
      });

      if (response.success) {
        setGeneratedContent({
          title: response.data.title || topic,
          content: response.data.content,
          contentType,
          wordCount: response.data.word_count || 0
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

    try {
      const response = await apiService.post('/content/long-form/drafts', {
        title: generatedContent.title,
        content: generatedContent.content,
        content_type: contentType,
        word_count: generatedContent.wordCount
      });

      if (response.success) {
        toast.success('Draft saved successfully!');
        fetchDrafts();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save draft');
    }
  };

  const handleExport = (format: 'markdown' | 'html' | 'txt') => {
    if (!generatedContent) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'markdown') {
      content = `# ${generatedContent.title}\n\n${generatedContent.content}`;
      filename = `${generatedContent.title.replace(/\s+/g, '-')}.md`;
      mimeType = 'text/markdown';
    } else if (format === 'html') {
      content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${generatedContent.title}</title>
</head>
<body>
  <article>
    <h1>${generatedContent.title}</h1>
    <div>${generatedContent.content.replace(/\n/g, '<br>')}</div>
  </article>
</body>
</html>`;
      filename = `${generatedContent.title.replace(/\s+/g, '-')}.html`;
      mimeType = 'text/html';
    } else {
      content = `${generatedContent.title}\n\n${generatedContent.content}`;
      filename = `${generatedContent.title.replace(/\s+/g, '-')}.txt`;
      mimeType = 'text/plain';
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

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="h-8 w-8 text-purple-400" />
              Long-form Content Generator
            </h1>
            <p className="text-gray-400 mt-2">
              Create blogs, newsletters, articles, and more with AI
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

              {/* Topic */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Topic *
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What should this content be about?"
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

              {/* Target Word Count */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Word Count: {targetWordCount}
                </label>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="100"
                  value={targetWordCount}
                  onChange={(e) => setTargetWordCount(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>500</span>
                  <span>2500</span>
                  <span>5000</span>
                </div>
              </div>

              {/* Tone */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {toneOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
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
                  placeholder="e.g., Small business owners, Tech enthusiasts"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Key Points */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Key Points (Optional)
                </label>
                <textarea
                  value={keyPoints}
                  onChange={(e) => setKeyPoints(e.target.value)}
                  placeholder="List main points to cover (one per line)"
                  rows={4}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* SEO Toggle */}
              <div className="mb-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSEO}
                    onChange={(e) => setIncludeSEO(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-300">Include SEO optimization</span>
                </label>
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
                  <FileText className="h-5 w-5 text-purple-400" />
                  Generated Content
                </h2>
                {generatedContent && (
                  <div className="flex items-center gap-2">
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
                          onClick={() => handleExport('markdown')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-600 rounded-t-lg"
                        >
                          Markdown (.md)
                        </button>
                        <button
                          onClick={() => handleExport('html')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-600"
                        >
                          HTML (.html)
                        </button>
                        <button
                          onClick={() => handleExport('txt')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-600 rounded-b-lg"
                        >
                          Plain Text (.txt)
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
                  <div className="prose prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                      {generatedContent.content}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Generated content will appear here</p>
                  <p className="text-sm mt-2">Configure your settings and click "Generate Content"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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

export default LongFormContent;

