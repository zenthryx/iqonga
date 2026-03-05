import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import { SparklesIcon, DocumentTextIcon, ClockIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { FileText, X } from 'lucide-react';
import TelegramPostModal from '../components/Telegram/TelegramPostModal';
import ImageSelector from '../components/Images/ImageSelector';
import ContentOptimizationPanel from '../components/Content/ContentOptimizationPanel';

interface Agent {
  id: string;
  name: string;
  personality_type: string;
  voice_tone: string;
  platforms: string[];
}

interface GeneratedContent {
  content: string;
  original_prompt: string;
  model_used: string;
  generation_config: any;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  style: string;
  size: string;
  image_url: string;
  url?: string; // For backward compatibility
  ipfs_hash?: string;
  ipfs_uri?: string;
  metadata: any;
  status: string;
  created_at: string;
  agent_name?: string;
}

const AIContentGenerator: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [contentType, setContentType] = useState('tweet');
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('casual');
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [length, setLength] = useState('medium');
  const [context, setContext] = useState('');
  const [hashtags, setHashtags] = useState(true);
  const [emojis, setEmojis] = useState(true);
  const [variations, setVariations] = useState(false);
  const [variationCount, setVariationCount] = useState(3);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [selectedContentForTelegram, setSelectedContentForTelegram] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [enableResearch, setEnableResearch] = useState(false);
  const [researchData, setResearchData] = useState<any>(null);
  const [performancePredictions, setPerformancePredictions] = useState<any>(null);
  const [showPredictions, setShowPredictions] = useState(true);

  useEffect(() => {
    fetchAgents();
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
      } else if (response.success && response.agents) {
        // Fallback for backward compatibility
        setAgents(response.agents);
        if (response.agents.length > 0) {
          setSelectedAgent(response.agents[0].id);
        }
      }
    } catch (error) {
      toast.error('Failed to fetch agents');
    }
  };

  const handleGenerate = async () => {
    if (!selectedAgent) {
      toast.error('Please select an AI agent');
      return;
    }

    if (!topic.trim()) {
      toast.error('Please enter a topic for content generation');
      return;
    }

    setGenerating(true);
    try {
      const response = await apiService.post('/content/generate', {
        agent_id: selectedAgent,
        content_type: contentType,
        topic: topic.trim(),
        style,
        length,
        context: context.trim() || undefined,
        hashtags,
        emojis,
        variations,
        variation_count: variationCount,
        template_id: selectedTemplate || undefined,
        enable_research: enableResearch,
        research_options: {
          include_trending: true,
          include_keywords: true,
          include_competitor_analysis: false
        }
      });

      // 🔍 DEBUG LOGGING - Raw response from backend
      console.log('🔍 RAW BACKEND RESPONSE DEBUG:', {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : 'NO DATA',
        fullResponse: response,
        timestamp: new Date().toISOString()
      });

      if (response.success) {
        setGeneratedContent(response.data.content || []);
        
        // Store research data if available and predict performance
        const firstContent = response.data.content?.[0];
        const firstContentText = firstContent && typeof firstContent === 'object' ? firstContent.content : firstContent;
        
        // 🔍 DEBUG LOGGING - Generated content analysis
        console.log('🤖 FRONTEND CONTENT GENERATION DEBUG:', {
          agentId: selectedAgent,
          generatedContentCount: response.data.content ? response.data.content.length : 0,
          firstContentPreview: firstContentText ? firstContentText.substring(0, 100) + '...' : 'NO CONTENT',
          containsCompanyKeywords: firstContentText ? (
            firstContentText.toLowerCase().includes('zenthryx') || 
            firstContentText.toLowerCase().includes('trading') || 
            firstContentText.toLowerCase().includes('ai')
          ) : false,
          timestamp: new Date().toISOString()
        });
        if (firstContent?.research) {
          setResearchData(firstContent.research);
        } else if (firstContent?.generation_config?.research_backed) {
          setResearchData({
            research_id: firstContent.generation_config.research_id,
            citations: firstContent.generation_config.citations || []
          });
        } else {
          setResearchData(null);
        }
        
        // Predict performance for generated content
        if (firstContent) {
          try {
            const contentText = typeof firstContent === 'string' ? firstContent : firstContent.content;
            
            const predictionResponse = await apiService.post('/content/predict', {
              content: contentText,
              agent_id: selectedAgent,
              platform: 'twitter',
              content_type: contentType,
              has_media: !!selectedImage
            });
            
            if (predictionResponse.success) {
              setPerformancePredictions(predictionResponse.data);
            }
          } catch (predictionError) {
            console.error('Failed to predict performance:', predictionError);
            // Don't show error, just continue
          }
        }
        
        toast.success(`Generated ${response.data.content ? response.data.content.length : 0} content piece${response.data.content && response.data.content.length > 1 ? 's' : ''} successfully!`);
      }
    } catch (error: any) {
      // 🔍 DEBUG LOGGING - Error details
      console.error('❌ CONTENT GENERATION ERROR DEBUG:', {
        error: error,
        errorMessage: error?.message,
        errorResponse: error?.response?.data,
        timestamp: new Date().toISOString()
      });
      
      toast.error('Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  const handlePostToTwitter = async (content: string) => {
    if (!selectedAgent) {
      toast.error('Please select an AI agent');
      return;
    }

    // 🔍 DEBUG LOGGING - Frontend content tracking
    console.log('🐦 FRONTEND TWITTER POST DEBUG:', {
      agentId: selectedAgent,
      contentLength: content.length,
      contentPreview: content.substring(0, 100) + '...',
      containsCompanyKeywords: content.toLowerCase().includes('zenthryx') || content.toLowerCase().includes('trading') || content.toLowerCase().includes('ai'),
      isGenericContent: content.includes('Big things are happening') || content.includes('Stay tuned'),
      timestamp: new Date().toISOString()
    });

    try {
      const response = await apiService.post(`/agents/${selectedAgent}/post-to-twitter`, {
        content: content,  // ✅ Send the actual generated content
        agentId: selectedAgent,  // ✅ Include agent ID for tracking
        imageId: selectedImage?.id || null  // ✅ Include image if selected
      });

      if (response.success) {
        toast.success('Content posted to Twitter successfully!');
      }
    } catch (error) {
      toast.error('Failed to post to Twitter');
    }
  };

  const handlePostToTelegram = (content: string) => {
    if (!selectedAgent) {
      toast.error('Please select an AI agent');
      return;
    }

    setSelectedContentForTelegram(content);
    setIsTelegramModalOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Content copied to clipboard!');
  };

  const regenerateContent = () => {
    setGeneratedContent([]);
    handleGenerate();
  };

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <SparklesIcon className="h-8 w-8 text-green-500" />
            AI Content Generator
          </h1>
          <p className="text-gray-400 mt-2">
            Generate engaging content using your AI agent's unique personality and voice
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-blue-500" />
              Content Configuration
            </h2>

            <div className="space-y-6">
              {/* Agent Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  AI Agent
                </label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.personality_type})
                    </option>
                  ))}
                </select>
                {selectedAgentData && (
                  <div className="mt-2 p-3 bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-300">
                      <span className="font-medium">Personality:</span> {selectedAgentData.personality_type}
                    </p>
                    <p className="text-sm text-gray-300">
                      <span className="font-medium">Voice Tone:</span> {selectedAgentData.voice_tone}
                    </p>
                  </div>
                )}
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Content Type
                </label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="tweet">Tweet</option>
                  <option value="thread">Thread</option>
                  <option value="reply">Reply</option>
                  <option value="story">Story</option>
                  <option value="tip">Tip</option>
                </select>
              </div>

              {/* Topic */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Topic *
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., AI agents are the future, blockchain technology, etc."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Style and Length */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Style
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="enthusiastic">Enthusiastic</option>
                    <option value="thoughtful">Thoughtful</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Length
                  </label>
                  <select
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                </div>
              </div>

              {/* Context */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Additional Context (Optional)
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Add any additional context or specific instructions..."
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={hashtags}
                      onChange={(e) => setHashtags(e.target.checked)}
                      className="mr-2 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-300">Include hashtags</span>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={emojis}
                      onChange={(e) => setEmojis(e.target.checked)}
                      className="mr-2 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-300">Include emojis</span>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={variations}
                      onChange={(e) => setVariations(e.target.checked)}
                      className="mr-2 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-300">Generate variations</span>
                  </label>
                </div>

                {variations && (
                  <div className="ml-6">
                    <label className="block text-sm text-gray-300 mb-1">
                      Number of variations
                    </label>
                    <input
                      type="number"
                      value={variationCount}
                      onChange={(e) => setVariationCount(parseInt(e.target.value))}
                      min="2"
                      max="5"
                      className="w-20 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={enableResearch}
                      onChange={(e) => setEnableResearch(e.target.checked)}
                      className="mr-2 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-300">Enable Research (fact-checked, citations)</span>
                  </label>
                </div>
              </div>

              {/* Image Selection */}
              <ImageSelector
                selectedImage={selectedImage}
                onImageSelect={setSelectedImage}
                agentId={undefined}
              />

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating || !selectedAgent || !topic.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5" />
                    Generate Content
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Content Panel */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CheckIcon className="h-5 w-5 text-green-500" />
                Generated Content
              </h2>
              {generatedContent.length > 0 && (
                <button
                  onClick={regenerateContent}
                  className="text-green-400 hover:text-green-300 flex items-center gap-2 text-sm"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  Regenerate
                </button>
              )}
            </div>

            {generatedContent.length === 0 ? (
              <div className="text-center py-12">
                <SparklesIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">No content generated yet</h3>
                <p className="text-gray-500">
                  Configure your settings and click "Generate Content" to create AI-powered content
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Research Data Display */}
                {researchData && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-blue-300">🔍 Research-Backed Content</span>
                    </div>
                    {researchData.citations && researchData.citations.length > 0 && (
                      <div className="text-xs text-gray-400 mb-2">
                        <strong>Sources:</strong> {researchData.citations.length} citations
                      </div>
                    )}
                    {researchData.trending_hashtags && researchData.trending_hashtags.length > 0 && (
                      <div className="text-xs text-gray-400">
                        <strong>Trending:</strong> {researchData.trending_hashtags.slice(0, 3).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Performance Prediction Display */}
                {showPredictions && performancePredictions && (
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-purple-300">📊 Performance Prediction</span>
                      </div>
                      <button
                        onClick={() => setShowPredictions(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-700/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Engagement Score</div>
                        <div className="text-2xl font-bold text-purple-300">
                          {performancePredictions.engagement_score}%
                        </div>
                      </div>
                      <div className="bg-gray-700/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Viral Potential</div>
                        <div className={`text-lg font-semibold ${
                          performancePredictions.viral_potential?.category === 'high' ? 'text-green-400' :
                          performancePredictions.viral_potential?.category === 'medium' ? 'text-yellow-400' :
                          'text-gray-400'
                        }`}>
                          {performancePredictions.viral_potential?.label || 'Low'}
                        </div>
                      </div>
                      <div className="bg-gray-700/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Predicted Likes</div>
                        <div className="text-xl font-bold text-blue-300">
                          {performancePredictions.predictions?.predicted_likes || 0}
                        </div>
                      </div>
                      <div className="bg-gray-700/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Predicted Retweets</div>
                        <div className="text-xl font-bold text-green-300">
                          {performancePredictions.predictions?.predicted_retweets || 0}
                        </div>
                      </div>
                    </div>

                    {/* Optimization Suggestions */}
                    {performancePredictions.suggestions && performancePredictions.suggestions.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-semibold text-gray-300 mb-2">💡 Optimization Suggestions:</div>
                        <div className="space-y-2">
                          {performancePredictions.suggestions.slice(0, 3).map((suggestion: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-gray-400 bg-gray-700/30 rounded p-2">
                              <span className={`font-semibold ${
                                suggestion.priority === 'high' ? 'text-red-400' :
                                suggestion.priority === 'medium' ? 'text-yellow-400' :
                                'text-blue-400'
                              }`}>
                                {suggestion.impact}
                              </span>
                              <span>{suggestion.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Best Times to Post */}
                    {performancePredictions.best_times && performancePredictions.best_times.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-semibold text-gray-300 mb-2">⏰ Best Times to Post:</div>
                        <div className="flex flex-wrap gap-2">
                          {performancePredictions.best_times.slice(0, 3).map((time: any, idx: number) => (
                            <span key={idx} className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded">
                              {time.day} {time.hour}:00
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {generatedContent.map((content, index) => {
                  const contentText = typeof content === 'string' ? content : content.content;
                  return (
                    <div key={index} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-sm text-gray-400 bg-gray-600 px-2 py-1 rounded">
                          Variation {index + 1}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => copyToClipboard(contentText)}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            Copy
                          </button>
                          <button
                            onClick={() => handlePostToTwitter(contentText)}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            Post to Twitter
                          </button>
                          <button
                            onClick={() => handlePostToTelegram(contentText)}
                            className="text-blue-500 hover:text-blue-400 text-sm flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.61 7.59c-.12.56-.44.7-.89.44l-2.46-1.81-1.19 1.15c-.13.13-.24.24-.49.24l.18-2.56 4.57-4.13c.2-.18-.04-.28-.31-.1l-5.64 3.55-2.43-.76c-.53-.16-.54-.53.11-.79l9.46-3.65c.44-.16.83.1.69.79z"/>
                            </svg>
                            Post to Telegram
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-gray-600 rounded-lg p-3 mb-3">
                        <p className="text-white whitespace-pre-wrap">
                          {contentText}
                        </p>
                      </div>

                      {/* Real-time Optimization Panel */}
                      <ContentOptimizationPanel
                        content={contentText}
                        platform="twitter"
                        contentType={contentType}
                        agentId={selectedAgent}
                        onSuggestionApply={(suggestion) => {
                          const updatedContent = contentText + suggestion;
                          const updatedContents = [...generatedContent];
                          if (typeof content === 'string') {
                            updatedContents[index] = updatedContent as any;
                          } else {
                            updatedContents[index] = { ...content, content: updatedContent };
                          }
                          setGeneratedContent(updatedContents);
                        }}
                      />
                    
                      {typeof content === 'object' && content.model_used && (
                        <div className="text-xs text-gray-400 mt-2">
                          <span className="mr-3">Model: {content.model_used}</span>
                          <span>Generated at: {new Date().toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-yellow-400">💡 Content Generation Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <p className="mb-2"><strong>• Be specific with topics:</strong> Instead of "AI", try "AI agents in customer service"</p>
              <p className="mb-2"><strong>• Use context:</strong> Add background information for more relevant content</p>
              <p className="mb-2"><strong>• Experiment with styles:</strong> Try different voice tones for different audiences</p>
            </div>
            <div>
              <p className="mb-2"><strong>• Generate variations:</strong> Get multiple options to choose the best one</p>
              <p className="mb-2"><strong>• Combine with scheduling:</strong> Generate content and schedule it for later</p>
              <p className="mb-2"><strong>• Monitor performance:</strong> Track which content types perform best</p>
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Post Modal */}
      <TelegramPostModal
        isOpen={isTelegramModalOpen}
        onClose={() => {
          setIsTelegramModalOpen(false);
          setSelectedContentForTelegram('');
        }}
        agentId={selectedAgent}
        agentName={selectedAgentData?.name || 'AI Agent'}
        initialContent={selectedContentForTelegram}
        onSuccess={(result) => {
          console.log('Telegram post successful:', result);
          toast.success('Content posted to Telegram successfully!');
        }}
      />

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6 border border-gray-700 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
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
                      ? 'border-blue-500 bg-blue-500/20'
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

export default AIContentGenerator;
