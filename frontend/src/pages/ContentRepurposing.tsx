import React, { useState } from 'react';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  RefreshCw,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Mail,
  Facebook,
  Music,
  FileText,
  Copy,
  Download,
  CheckCircle,
  Loader,
  Quote
} from 'lucide-react';

const ContentRepurposing: React.FC = () => {
  const [sourceContent, setSourceContent] = useState('');
  const [sourceFormat, setSourceFormat] = useState('blog_post');
  const [targetFormats, setTargetFormats] = useState<string[]>(['twitter_thread', 'linkedin_post', 'instagram_carousel']);
  const [includeQuotes, setIncludeQuotes] = useState(true);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [repurposing, setRepurposing] = useState(false);
  const [repurposedContent, setRepurposedContent] = useState<any>(null);

  const formatOptions = [
    { value: 'blog_post', label: 'Blog Post', icon: FileText },
    { value: 'article', label: 'Article', icon: FileText },
    { value: 'tweet', label: 'Tweet', icon: Twitter },
    { value: 'video_script', label: 'Video Script', icon: Youtube }
  ];

  const targetFormatOptions = [
    { value: 'twitter_thread', label: 'Twitter Thread', icon: Twitter, color: 'text-blue-400' },
    { value: 'linkedin_post', label: 'LinkedIn Post', icon: Linkedin, color: 'text-blue-500' },
    { value: 'instagram_carousel', label: 'Instagram Carousel', icon: Instagram, color: 'text-pink-400' },
    { value: 'youtube_script', label: 'YouTube Script', icon: Youtube, color: 'text-red-400' },
    { value: 'newsletter', label: 'Newsletter', icon: Mail, color: 'text-yellow-400' },
    { value: 'facebook_post', label: 'Facebook Post', icon: Facebook, color: 'text-blue-600' },
    { value: 'tiktok_script', label: 'TikTok Script', icon: Music, color: 'text-black' }
  ];

  const handleRepurpose = async () => {
    if (!sourceContent.trim()) {
      toast.error('Please enter content to repurpose');
      return;
    }

    if (targetFormats.length === 0) {
      toast.error('Please select at least one target format');
      return;
    }

    setRepurposing(true);
    setRepurposedContent(null);

    try {
      const response = await apiService.post('/content/repurpose', {
        content: sourceContent.trim(),
        source_format: sourceFormat,
        target_formats: targetFormats,
        include_quotes: includeQuotes,
        include_hashtags: includeHashtags
      });

      if (response.success) {
        setRepurposedContent(response.data);
        toast.success(`Content repurposed successfully! Used ${response.data.creditsUsed || 50} credits`);
      } else {
        toast.error(response.error || 'Failed to repurpose content');
      }
    } catch (error: any) {
      console.error('Repurposing error:', error);
      toast.error(error.response?.data?.error || 'Failed to repurpose content');
    } finally {
      setRepurposing(false);
    }
  };

  const toggleTargetFormat = (format: string) => {
    if (targetFormats.includes(format)) {
      setTargetFormats(targetFormats.filter(f => f !== format));
    } else {
      setTargetFormats([...targetFormats, format]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const renderRepurposedContent = (format: string, data: any) => {
    if (!data || data.error) {
      return (
        <div className="text-red-400 text-sm">
          {data?.error || 'Failed to generate'}
        </div>
      );
    }

    switch (format) {
      case 'twitter_thread':
        return (
          <div className="space-y-3">
            <div className="text-sm text-gray-400 mb-2">
              {data.thread_count || data.tweets?.length || 0} tweets
            </div>
            {data.tweets && data.tweets.map((tweet: any, idx: number) => (
              <div key={idx} className="bg-gray-700 rounded-lg p-3 border-l-4 border-blue-400">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs text-gray-400">Tweet {tweet.number}/{tweet.total}</span>
                  <button
                    onClick={() => copyToClipboard(tweet.with_indicator || tweet.content)}
                    className="text-blue-400 hover:text-blue-300 text-xs"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-white text-sm">{tweet.content}</p>
              </div>
            ))}
          </div>
        );

      case 'linkedin_post':
        return (
          <div className="space-y-2">
            <div className="text-sm text-gray-400 mb-2">
              {data.character_count} characters • ~{data.estimated_read_time} min read
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-white whitespace-pre-wrap">{data.content}</p>
            </div>
            <button
              onClick={() => copyToClipboard(data.content)}
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
            >
              <Copy className="h-3 w-3" />
              Copy Post
            </button>
          </div>
        );

      case 'instagram_carousel':
        return (
          <div className="space-y-3">
            <div className="text-sm text-gray-400 mb-2">
              {data.slide_count || data.slides?.length || 0} slides
            </div>
            {data.slides && data.slides.map((slide: any, idx: number) => (
              <div key={idx} className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-lg p-3 border border-pink-500/20">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs text-gray-400">Slide {slide.number}</span>
                  <button
                    onClick={() => copyToClipboard(slide.content)}
                    className="text-pink-400 hover:text-pink-300 text-xs"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-white text-sm mb-1">{slide.content}</p>
                {slide.visual_suggestion && (
                  <p className="text-xs text-gray-400 italic">{slide.visual_suggestion}</p>
                )}
              </div>
            ))}
          </div>
        );

      case 'youtube_script':
        return (
          <div className="space-y-2">
            <div className="text-sm text-gray-400 mb-2">
              Estimated duration: {data.estimated_duration}
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <pre className="text-white text-sm whitespace-pre-wrap font-sans">{data.content}</pre>
            </div>
            {data.sections && data.sections.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-gray-300 mb-2">Script Sections:</div>
                {data.sections.map((section: any, idx: number) => (
                  <div key={idx} className="bg-gray-700/50 rounded p-2 mb-2">
                    <div className="font-semibold text-yellow-400">{section.name}</div>
                    {section.timing && <div className="text-xs text-gray-400">{section.timing}</div>}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => copyToClipboard(data.content)}
              className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
            >
              <Copy className="h-3 w-3" />
              Copy Script
            </button>
          </div>
        );

      case 'newsletter':
        return (
          <div className="space-y-2">
            {data.subject_line && (
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Subject Line:</div>
                <div className="text-white font-semibold">{data.subject_line}</div>
              </div>
            )}
            <div className="bg-gray-700 rounded-lg p-4">
              <pre className="text-white text-sm whitespace-pre-wrap font-sans">{data.content}</pre>
            </div>
            <div className="text-sm text-gray-400">
              ~{data.estimated_read_time} min read
            </div>
            <button
              onClick={() => copyToClipboard(data.content)}
              className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1"
            >
              <Copy className="h-3 w-3" />
              Copy Newsletter
            </button>
          </div>
        );

      case 'facebook_post':
        return (
          <div className="space-y-2">
            <div className="text-sm text-gray-400 mb-2">
              {data.character_count} characters
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-white whitespace-pre-wrap">{data.content}</p>
            </div>
            <button
              onClick={() => copyToClipboard(data.content)}
              className="text-blue-600 hover:text-blue-500 text-sm flex items-center gap-1"
            >
              <Copy className="h-3 w-3" />
              Copy Post
            </button>
          </div>
        );

      case 'tiktok_script':
        return (
          <div className="space-y-2">
            <div className="text-sm text-gray-400 mb-2">
              {data.estimated_duration} • {data.word_count} words
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <pre className="text-white text-sm whitespace-pre-wrap font-sans">{data.content}</pre>
            </div>
            <button
              onClick={() => copyToClipboard(data.content)}
              className="text-black hover:text-gray-800 text-sm flex items-center gap-1"
            >
              <Copy className="h-3 w-3" />
              Copy Script
            </button>
          </div>
        );

      default:
        return (
          <div className="bg-gray-700 rounded-lg p-4">
            <pre className="text-white text-sm whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <RefreshCw className="h-8 w-8 text-green-400" />
            Content Repurposing Engine
          </h1>
          <p className="text-gray-400 mt-2">
            Convert one piece of content into multiple platform-specific formats automatically
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Input */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Source Content</h2>

              {/* Source Format */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Source Format
                </label>
                <select
                  value={sourceFormat}
                  onChange={(e) => setSourceFormat(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {formatOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Content */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Content to Repurpose *
                </label>
                <textarea
                  value={sourceContent}
                  onChange={(e) => setSourceContent(e.target.value)}
                  placeholder="Paste your blog post, article, or other content here..."
                  rows={12}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
                <div className="text-xs text-gray-400 mt-1">
                  {sourceContent.length} characters
                </div>
              </div>

              {/* Target Formats */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Formats *
                </label>
                <div className="space-y-2">
                  {targetFormatOptions.map(option => {
                    const Icon = option.icon;
                    const isSelected = targetFormats.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => toggleTargetFormat(option.value)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-green-500/20 border-green-500 text-green-300'
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${isSelected ? option.color : 'text-gray-400'}`} />
                        <span className="flex-1 text-left">{option.label}</span>
                        {isSelected && <CheckCircle className="h-5 w-5 text-green-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeQuotes}
                    onChange={(e) => setIncludeQuotes(e.target.checked)}
                    className="mr-2 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-300">Extract key quotes</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeHashtags}
                    onChange={(e) => setIncludeHashtags(e.target.checked)}
                    className="mr-2 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-300">Include hashtags</span>
                </label>
              </div>

              {/* Repurpose Button */}
              <button
                onClick={handleRepurpose}
                disabled={repurposing || !sourceContent.trim() || targetFormats.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {repurposing ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    Repurposing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5" />
                    Repurpose Content
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Panel - Output */}
          <div className="lg:col-span-2 space-y-6">
            {repurposing && (
              <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                <Loader className="h-12 w-12 animate-spin text-green-400 mx-auto mb-4" />
                <p className="text-gray-300">Repurposing your content...</p>
                <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
              </div>
            )}

            {!repurposing && !repurposedContent && (
              <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                <RefreshCw className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No repurposed content yet</h3>
                <p className="text-gray-500">
                  Enter your content and select target formats, then click "Repurpose Content"
                </p>
              </div>
            )}

            {!repurposing && repurposedContent && (
              <div className="space-y-6">
                {/* Quotes */}
                {repurposedContent.quotes && repurposedContent.quotes.length > 0 && (
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div className="flex items-center gap-2 mb-4">
                      <Quote className="h-5 w-5 text-yellow-400" />
                      <h3 className="text-lg font-semibold">Key Quotes</h3>
                    </div>
                    <div className="space-y-3">
                      {repurposedContent.quotes.map((quote: any) => (
                        <div key={quote.id} className="bg-gray-700 rounded-lg p-4 border-l-4 border-yellow-400">
                          <p className="text-white italic">"{quote.text}"</p>
                          <div className="text-xs text-gray-400 mt-2">
                            {quote.character_count} characters
                          </div>
                          <button
                            onClick={() => copyToClipboard(quote.text)}
                            className="mt-2 text-yellow-400 hover:text-yellow-300 text-xs flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            Copy Quote
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Repurposed Content by Format */}
                {Object.entries(repurposedContent.repurposed_content || {}).map(([format, data]: [string, any]) => {
                  const formatOption = targetFormatOptions.find(opt => opt.value === format);
                  const Icon = formatOption?.icon || FileText;
                  
                  return (
                    <div key={format} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <div className="flex items-center gap-3 mb-4">
                        <Icon className={`h-6 w-6 ${formatOption?.color || 'text-gray-400'}`} />
                        <h3 className="text-lg font-semibold">{formatOption?.label || format}</h3>
                      </div>
                      {renderRepurposedContent(format, data)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentRepurposing;

