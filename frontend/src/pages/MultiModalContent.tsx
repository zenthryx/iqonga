import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  FileText,
  CheckCircle,
  Loader,
  Download,
  Play,
  X,
  Settings,
  Zap
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  personality_type: string;
  voice_tone: string;
}

interface ContentPackage {
  package_id: string;
  text: {
    content: string;
    model_used: string;
  };
  image: {
    id: string;
    url: string;
    prompt: string;
  } | null;
  video: {
    id: string;
    url: string;
    script: string;
    duration: number;
  } | null;
  credits_used: number;
  errors: Array<{ type: string; error: string }>;
}

const MultiModalContent: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('casual');
  const [length, setLength] = useState('medium');
  const [contentType, setContentType] = useState('tweet');
  const [platform, setPlatform] = useState('twitter');
  
  // Multi-modal options
  const [includeImage, setIncludeImage] = useState(true);
  const [includeVideo, setIncludeVideo] = useState(false);
  const [imageStyle, setImageStyle] = useState('realistic');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [videoDuration, setVideoDuration] = useState(15);
  const [videoProvider, setVideoProvider] = useState('heygen');
  
  const [generating, setGenerating] = useState(false);
  const [generatedPackage, setGeneratedPackage] = useState<ContentPackage | null>(null);
  const [savedPackages, setSavedPackages] = useState<any[]>([]);
  const [showPackages, setShowPackages] = useState(false);

  useEffect(() => {
    fetchAgents();
    fetchPackages();
  }, []);

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

  const fetchPackages = async () => {
    try {
      const response = await apiService.get('/content/multimodal/packages') as any;
      if (response.success && response.data) {
        setSavedPackages(response.data);
      }
    } catch (error) {
      // Packages endpoint might not exist yet
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
    setGeneratedPackage(null);

    try {
      const response = await apiService.post('/content/multimodal/generate', {
        agent_id: selectedAgent,
        content_type: contentType,
        topic: topic.trim(),
        style,
        length,
        include_image: includeImage,
        include_video: includeVideo,
        image_style: imageStyle,
        image_size: imageSize,
        video_duration: videoDuration,
        video_provider: videoProvider,
        platform
      });

      if (response.success) {
        setGeneratedPackage(response.data.package);
        toast.success(`Content package generated! Used ${response.data.creditsUsed} credits`);
        fetchPackages();
      } else {
        toast.error(response.error || 'Failed to generate content package');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.response?.data?.error || 'Failed to generate content package');
    } finally {
      setGenerating(false);
    }
  };

  const handlePostToTwitter = async () => {
    if (!generatedPackage || !selectedAgent) {
      toast.error('No content package to post');
      return;
    }

    try {
      const response = await apiService.post(`/agents/${selectedAgent}/post-to-twitter`, {
        content: generatedPackage.text.content,
        agentId: selectedAgent,
        imageId: generatedPackage.image?.id || null
      });

      if (response.success) {
        toast.success('Content posted to Twitter successfully!');
      }
    } catch (error) {
      toast.error('Failed to post to Twitter');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Zap className="h-8 w-8 text-yellow-400" />
              Multi-Modal Content Generator
            </h1>
            <p className="text-gray-400 mt-2">
              Generate complete content packages: text + images + videos in one click
            </p>
          </div>
          {savedPackages.length > 0 && (
            <button
              onClick={() => setShowPackages(!showPackages)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              {showPackages ? 'Hide' : 'Show'} Packages ({savedPackages.length})
            </button>
          )}
        </div>

        {/* Saved Packages Panel */}
        {showPackages && savedPackages.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Saved Content Packages</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 cursor-pointer transition-colors"
                  onClick={() => {
                    if (pkg.metadata) {
                      const metadata = typeof pkg.metadata === 'string' 
                        ? JSON.parse(pkg.metadata)
                        : pkg.metadata;
                      setGeneratedPackage({
                        package_id: pkg.id,
                        text: metadata.text || { content: pkg.text_content, model_used: '' },
                        image: metadata.image || null,
                        video: metadata.video || null,
                        credits_used: pkg.credits_used || 0,
                        errors: []
                      });
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white truncate">
                      {pkg.text_content?.substring(0, 50)}...
                    </h4>
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 ml-2" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {pkg.metadata?.image && <ImageIcon className="h-4 w-4" />}
                    {pkg.metadata?.video && <Video className="h-4 w-4" />}
                    <span>{pkg.credits_used || 0} credits</span>
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
                <Settings className="h-5 w-5 text-yellow-400" />
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
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="">Select an agent...</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.personality_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Platform */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Platform
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="twitter">Twitter</option>
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>

              {/* Content Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Content Type
                </label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="tweet">Tweet</option>
                  <option value="thread">Thread</option>
                  <option value="post">Post</option>
                  <option value="story">Story</option>
                </select>
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
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              {/* Style and Length */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Style
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                </div>
              </div>

              {/* Multi-Modal Options */}
              <div className="border-t border-gray-700 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Media Options</h3>
                
                {/* Include Image */}
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <ImageIcon className="h-4 w-4" />
                    Include Image
                  </label>
                  <input
                    type="checkbox"
                    checked={includeImage}
                    onChange={(e) => setIncludeImage(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-yellow-500 focus:ring-yellow-500"
                  />
                </div>

                {includeImage && (
                  <div className="ml-6 mb-3 space-y-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Image Style</label>
                      <select
                        value={imageStyle}
                        onChange={(e) => setImageStyle(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                      >
                        <option value="realistic">Realistic</option>
                        <option value="digital_art">Digital Art</option>
                        <option value="illustration">Illustration</option>
                        <option value="photography">Photography</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Image Size</label>
                      <select
                        value={imageSize}
                        onChange={(e) => setImageSize(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                      >
                        <option value="1024x1024">1024x1024 (Square)</option>
                        <option value="1024x1792">1024x1792 (Portrait)</option>
                        <option value="1792x1024">1792x1024 (Landscape)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Include Video */}
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <Video className="h-4 w-4" />
                    Include Video
                  </label>
                  <input
                    type="checkbox"
                    checked={includeVideo}
                    onChange={(e) => setIncludeVideo(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-yellow-500 focus:ring-yellow-500"
                  />
                </div>

                {includeVideo && (
                  <div className="ml-6 mb-3 space-y-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Video Duration (seconds)</label>
                      <input
                        type="number"
                        min="5"
                        max="60"
                        value={videoDuration}
                        onChange={(e) => setVideoDuration(parseInt(e.target.value))}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Video Provider</label>
                      <select
                        value={videoProvider}
                        onChange={(e) => setVideoProvider(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                      >
                        <option value="heygen">HeyGen (Avatar)</option>
                        <option value="runwayml">RunwayML</option>
                        <option value="pika">Pika Labs</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating || !selectedAgent || !topic.trim()}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    Generating Package...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Generate Complete Package
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Panel - Generated Content */}
          <div className="lg:col-span-2 space-y-6">
            {generating && (
              <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                <Loader className="h-12 w-12 animate-spin text-yellow-400 mx-auto mb-4" />
                <p className="text-gray-300">Generating your complete content package...</p>
                <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
              </div>
            )}

            {!generating && !generatedPackage && (
              <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                <Sparkles className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No content package yet</h3>
                <p className="text-gray-500">Configure your options and click "Generate Complete Package" to get started</p>
              </div>
            )}

            {!generating && generatedPackage && (
              <div className="space-y-6">
                {/* Package Overview */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      Content Package Generated
                    </h2>
                    <div className="text-sm text-gray-400">
                      {generatedPackage.credits_used} credits used
                    </div>
                  </div>

                  {/* Errors */}
                  {generatedPackage.errors.length > 0 && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-sm text-red-400 font-semibold mb-1">Some components failed to generate:</p>
                      {generatedPackage.errors.map((error, idx) => (
                        <p key={idx} className="text-xs text-red-300">
                          {error.type}: {error.error}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Text Content */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-gray-300">Text Content</span>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="text-white whitespace-pre-wrap">{generatedPackage.text.content}</p>
                    </div>
                  </div>

                  {/* Image */}
                  {generatedPackage.image && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="h-4 w-4 text-green-400" />
                        <span className="text-sm font-medium text-gray-300">Generated Image</span>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4">
                        <img
                          src={generatedPackage.image.url}
                          alt={generatedPackage.image.prompt}
                          className="w-full rounded-lg"
                        />
                      </div>
                    </div>
                  )}

                  {/* Video */}
                  {generatedPackage.video && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Video className="h-4 w-4 text-purple-400" />
                        <span className="text-sm font-medium text-gray-300">Generated Video</span>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4">
                        {generatedPackage.video.url ? (
                          <video
                            src={generatedPackage.video.url}
                            controls
                            className="w-full rounded-lg"
                          />
                        ) : (
                          <div className="text-center py-8 text-gray-400">
                            <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Video is being generated...</p>
                            <p className="text-xs mt-1">This may take a few minutes</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
                    <button
                      onClick={handlePostToTwitter}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Post to Twitter
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPackage.text.content);
                        toast.success('Text copied to clipboard!');
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Copy Text
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiModalContent;

