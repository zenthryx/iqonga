import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  FileText,
  Target,
  MessageSquare,
  Layers,
  Hash,
  TrendingUp,
  CheckCircle,
  Sparkles,
  Save,
  Download,
  Eye,
  X,
  Loader
} from 'lucide-react';

interface ContentBrief {
  topic: string;
  platform: string;
  content_type: string;
  target_audience: {
    primary: string;
    demographics?: string;
    interests?: string[];
    pain_points?: string[];
    source: string;
  };
  key_messages: Array<{
    message: string;
    priority: string;
    rationale: string;
  }>;
  content_structure: {
    opening: string;
    body: string[];
    closing: string;
    estimated_length: number;
  };
  seo_keywords: {
    primary: string;
    related: Array<{
      keyword: string;
      platform?: string;
      sentiment?: number;
      mentions?: number;
    }>;
    source: string;
  };
  competitor_analysis: {
    common_themes: string[];
    content_formats: string[];
    engagement_tactics: string[];
    gaps: string[];
  };
  content_goals: string[];
  tone_guidelines: {
    language: string;
    voice: string;
    avoid: string;
    platform_note?: string;
  };
  call_to_action: {
    suggestions: string[];
    recommended: string;
  };
  best_practices: string[];
  completeness_score: number;
}

const ContentBriefGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('twitter');
  const [contentType, setContentType] = useState('tweet');
  const [targetAudience, setTargetAudience] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [agents, setAgents] = useState<any[]>([]);
  const [brief, setBrief] = useState<ContentBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedBriefs, setSavedBriefs] = useState<any[]>([]);
  const [showSavedBriefs, setShowSavedBriefs] = useState(false);

  useEffect(() => {
    fetchAgents();
    fetchSavedBriefs();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await apiService.get('/agents') as any;
      if (response.success && response.data) {
        setAgents(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const fetchSavedBriefs = async () => {
    try {
      const response = await apiService.get('/content/brief') as any;
      if (response.success) {
        setSavedBriefs(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch saved briefs:', error);
    }
  };

  const handleGenerateBrief = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/content/brief', {
        topic: topic.trim(),
        platform,
        content_type: contentType,
        target_audience: targetAudience || null,
        goals: goals.length > 0 ? goals : [],
        agent_id: selectedAgent || null,
        save: false
      });

      if (response.success) {
        setBrief(response.data);
        toast.success('Content brief generated successfully!');
      } else {
        toast.error('Failed to generate brief');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate content brief');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBrief = async () => {
    if (!brief) return;

    try {
      const response = await apiService.post('/content/brief', {
        topic: brief.topic,
        platform: brief.platform,
        content_type: brief.content_type,
        target_audience: brief.target_audience?.primary || null,
        goals: brief.content_goals,
        agent_id: selectedAgent || null,
        save: true
      });

      if (response.success) {
        toast.success('Brief saved successfully!');
        await fetchSavedBriefs();
      }
    } catch (error: any) {
      toast.error('Failed to save brief');
    }
  };

  const handleLoadBrief = (savedBrief: any) => {
    const briefData = savedBrief.brief_data || savedBrief;
    setBrief(briefData);
    setTopic(briefData.topic);
    setPlatform(briefData.platform);
    setContentType(briefData.content_type);
    setShowSavedBriefs(false);
    toast.success('Brief loaded');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-400" />
              Content Brief Generator
            </h1>
            <p className="text-gray-400 mt-2">
              Generate strategic content briefs before creating content
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSavedBriefs(!showSavedBriefs)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Saved Briefs
            </button>
          </div>
        </div>

        {/* Saved Briefs Modal */}
        {showSavedBriefs && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Saved Briefs</h3>
                <button
                  onClick={() => setShowSavedBriefs(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedBriefs.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No saved briefs</p>
                ) : (
                  savedBriefs.map((savedBrief) => {
                    const briefData = savedBrief.brief_data || savedBrief;
                    return (
                      <div
                        key={savedBrief.id}
                        onClick={() => handleLoadBrief(savedBrief)}
                        className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{briefData.topic}</h4>
                            <p className="text-sm text-gray-400">
                              {briefData.platform} • {briefData.content_type}
                            </p>
                          </div>
                          <div className="text-sm text-gray-400">
                            {new Date(savedBrief.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-400" />
                Brief Configuration
              </h2>

              <div className="space-y-4">
                {/* Topic */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Topic *
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., AI agents, blockchain technology"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Platform */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Platform
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="twitter">Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>

                {/* Content Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Content Type
                  </label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="tweet">Tweet</option>
                    <option value="thread">Thread</option>
                    <option value="post">Post</option>
                    <option value="story">Story</option>
                  </select>
                </div>

                {/* Agent Selection */}
                {agents.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      AI Agent (Optional)
                    </label>
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">None</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Target Audience */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Target Audience (Optional)
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., Tech professionals, Entrepreneurs"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateBrief}
                  disabled={loading || !topic.trim()}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate Brief
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Brief Display */}
          <div className="lg:col-span-2 space-y-6">
            {brief ? (
              <>
                {/* Brief Header */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold">{brief.topic}</h2>
                      <p className="text-gray-400 mt-1">
                        {brief.platform} • {brief.content_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Completeness</div>
                        <div className={`text-2xl font-bold ${
                          brief.completeness_score >= 80 ? 'text-green-400' :
                          brief.completeness_score >= 60 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {brief.completeness_score}%
                        </div>
                      </div>
                      <button
                        onClick={handleSaveBrief}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </button>
                    </div>
                  </div>
                </div>

                {/* Target Audience */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-400" />
                    Target Audience
                  </h3>
                  <div className="space-y-2">
                    <p className="text-gray-300">{brief.target_audience.primary}</p>
                    {brief.target_audience.demographics && (
                      <p className="text-sm text-gray-400">
                        <strong>Demographics:</strong> {brief.target_audience.demographics}
                      </p>
                    )}
                    {brief.target_audience.interests && brief.target_audience.interests.length > 0 && (
                      <div className="text-sm text-gray-400">
                        <strong>Interests:</strong> {brief.target_audience.interests.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Messages */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-400" />
                    Key Messages
                  </h3>
                  <div className="space-y-3">
                    {brief.key_messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${getPriorityColor(msg.priority)}`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-semibold">{msg.message}</span>
                          <span className="text-xs capitalize px-2 py-1 rounded bg-gray-700">
                            {msg.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{msg.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content Structure */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-400" />
                    Content Structure
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-300 mb-1">Opening</div>
                      <p className="text-gray-400">{brief.content_structure.opening}</p>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-300 mb-1">Body Points</div>
                      <ul className="list-disc list-inside space-y-1 text-gray-400">
                        {brief.content_structure.body.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-300 mb-1">Closing</div>
                      <p className="text-gray-400">{brief.content_structure.closing}</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      Estimated length: ~{brief.content_structure.estimated_length} characters
                    </div>
                  </div>
                </div>

                {/* SEO Keywords */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Hash className="h-5 w-5 text-blue-400" />
                    SEO Keywords
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-semibold text-gray-300">Primary: </span>
                      <span className="text-blue-400">{brief.seo_keywords.primary}</span>
                    </div>
                    {brief.seo_keywords.related.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-gray-300 mb-2">Related Keywords:</div>
                        <div className="flex flex-wrap gap-2">
                          {brief.seo_keywords.related.map((kw, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm"
                            >
                              {kw.keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Competitor Analysis */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                    Competitor Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-300 mb-2">Common Themes</div>
                      <ul className="list-disc list-inside space-y-1 text-gray-400 text-sm">
                        {brief.competitor_analysis.common_themes.map((theme, idx) => (
                          <li key={idx}>{theme}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-300 mb-2">Content Formats</div>
                      <ul className="list-disc list-inside space-y-1 text-gray-400 text-sm">
                        {brief.competitor_analysis.content_formats.map((format, idx) => (
                          <li key={idx}>{format}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-300 mb-2">Engagement Tactics</div>
                      <ul className="list-disc list-inside space-y-1 text-gray-400 text-sm">
                        {brief.competitor_analysis.engagement_tactics.map((tactic, idx) => (
                          <li key={idx}>{tactic}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-300 mb-2">Opportunities</div>
                      <ul className="list-disc list-inside space-y-1 text-green-400 text-sm">
                        {brief.competitor_analysis.gaps.map((gap, idx) => (
                          <li key={idx}>{gap}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Content Goals */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-400" />
                    Content Goals
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    {brief.content_goals.map((goal, idx) => (
                      <li key={idx}>{goal}</li>
                    ))}
                  </ul>
                </div>

                {/* Tone Guidelines */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4">Tone Guidelines</h3>
                  <div className="space-y-2 text-gray-300">
                    <p><strong>Language:</strong> {brief.tone_guidelines.language}</p>
                    <p><strong>Voice:</strong> {brief.tone_guidelines.voice}</p>
                    <p><strong>Avoid:</strong> {brief.tone_guidelines.avoid}</p>
                    {brief.tone_guidelines.platform_note && (
                      <p className="text-sm text-gray-400">
                        <strong>Platform Note:</strong> {brief.tone_guidelines.platform_note}
                      </p>
                    )}
                  </div>
                </div>

                {/* Call to Action */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4">Call to Action</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Recommended</div>
                      <div className="text-green-400 font-semibold">{brief.call_to_action.recommended}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Other Suggestions</div>
                      <ul className="list-disc list-inside space-y-1 text-gray-300">
                        {brief.call_to_action.suggestions.slice(1).map((cta, idx) => (
                          <li key={idx}>{cta}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Best Practices */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4">Best Practices</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    {brief.best_practices.map((practice, idx) => (
                      <li key={idx}>{practice}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
                <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Brief Generated</h3>
                <p className="text-gray-500">
                  Enter a topic and click "Generate Brief" to create a strategic content brief
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentBriefGenerator;

