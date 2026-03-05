import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import {
  Sparkles,
  TrendingUp,
  Hash,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  BarChart3,
  Type,
  Loader
} from 'lucide-react';

interface OptimizationAnalysis {
  readability: {
    score: number;
    level: string;
    grade: number;
  };
  seo: {
    score: number;
    keyword_density: Record<string, string>;
    meta_suggestions: Array<{
      type: string;
      priority: string;
      message: string;
    }>;
  };
  engagement: {
    score: number;
    factors: Array<{ name: string; impact: string }>;
    suggestions: Array<{
      type: string;
      priority: string;
      message: string;
      impact: string;
    }>;
  };
  suggestions: Array<{
    type: string;
    priority: string;
    message: string;
    impact: string;
  }>;
  score: number;
  character_count: number;
  word_count: number;
  hashtags: Array<{ tag: string; position: number }>;
  hashtag_suggestions?: string[];
  tone_consistency?: {
    score: number;
    consistent: boolean;
    message: string;
  };
}

interface ContentOptimizationPanelProps {
  content: string;
  platform?: string;
  contentType?: string;
  agentId?: string;
  onSuggestionApply?: (suggestion: string) => void;
}

const ContentOptimizationPanel: React.FC<ContentOptimizationPanelProps> = ({
  content,
  platform = 'twitter',
  contentType = 'tweet',
  agentId,
  onSuggestionApply
}) => {
  const [analysis, setAnalysis] = useState<OptimizationAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const analyzeContent = useCallback(async (text: string) => {
    if (!text.trim() || text.length < 10) {
      setAnalysis(null);
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/content/optimize', {
        content: text,
        platform,
        content_type: contentType,
        agent_id: agentId
      });

      if (response.success) {
        setAnalysis(response.data);
      }
    } catch (error) {
      console.error('Optimization analysis failed:', error);
      // Don't show error, just silently fail
    } finally {
      setLoading(false);
    }
  }, [platform, contentType, agentId]);

  useEffect(() => {
    // Debounce analysis to avoid too many API calls
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      analyzeContent(content);
    }, 1000); // Wait 1 second after user stops typing

    setDebounceTimer(timer);

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [content, analyzeContent]);

  if (!content.trim() || content.length < 10) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-2 text-gray-400">
          <Lightbulb className="h-4 w-4" />
          <span className="text-sm">Start typing to see optimization suggestions</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader className="h-4 w-4 animate-spin" />
          <span className="text-sm">Analyzing content...</span>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-blue-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
      {/* Overall Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          <span className="font-semibold text-gray-300">Optimization Score</span>
        </div>
        <div className={`text-2xl font-bold ${getScoreColor(analysis.score)}`}>
          {analysis.score}%
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Readability</div>
          <div className={`text-lg font-semibold ${getScoreColor(analysis.readability.score)}`}>
            {analysis.readability.score}
          </div>
          <div className="text-xs text-gray-500">{analysis.readability.level}</div>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">SEO</div>
          <div className={`text-lg font-semibold ${getScoreColor(analysis.seo.score)}`}>
            {analysis.seo.score}
          </div>
          <div className="text-xs text-gray-500">Keywords: {Object.keys(analysis.seo.keyword_density).length}</div>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Engagement</div>
          <div className={`text-lg font-semibold ${getScoreColor(analysis.engagement.score)}`}>
            {analysis.engagement.score}
          </div>
          <div className="text-xs text-gray-500">{analysis.engagement.factors.length} factors</div>
        </div>
      </div>

      {/* Positive Factors */}
      {analysis.engagement.factors.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-sm font-semibold text-gray-300">Strengths</span>
          </div>
          <div className="space-y-1">
            {analysis.engagement.factors.map((factor, idx) => (
              <div key={idx} className="text-xs text-green-400 bg-green-500/10 rounded px-2 py-1">
                ✓ {factor.name} {factor.impact}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {analysis.suggestions && analysis.suggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-semibold text-gray-300">Suggestions</span>
          </div>
          <div className="space-y-2">
            {analysis.suggestions.slice(0, 5).map((suggestion, idx) => (
              <div
                key={idx}
                className="text-xs bg-gray-700/50 rounded p-2 border-l-2"
                style={{
                  borderLeftColor: suggestion.priority === 'high' ? '#ef4444' : suggestion.priority === 'medium' ? '#eab308' : '#3b82f6'
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className={`font-semibold mb-1 ${getPriorityColor(suggestion.priority)}`}>
                      {suggestion.impact} - {suggestion.type}
                    </div>
                    <div className="text-gray-300">{suggestion.message}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hashtag Suggestions */}
      {analysis.hashtag_suggestions && analysis.hashtag_suggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Hash className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold text-gray-300">Suggested Hashtags</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.hashtag_suggestions.map((hashtag, idx) => (
              <button
                key={idx}
                onClick={() => onSuggestionApply && onSuggestionApply(` ${hashtag}`)}
                className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-xs transition-colors"
              >
                {hashtag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tone Consistency */}
      {analysis.tone_consistency && (
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Tone Consistency</span>
            <span className={`text-xs font-semibold ${
              analysis.tone_consistency.consistent ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {analysis.tone_consistency.score}%
            </span>
          </div>
          <div className="text-xs text-gray-300">
            {analysis.tone_consistency.message}
          </div>
        </div>
      )}

      {/* Character/Word Count */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-700">
        <div className="flex items-center gap-4">
          <span>{analysis.character_count} characters</span>
          <span>{analysis.word_count} words</span>
          {analysis.hashtags.length > 0 && (
            <span>{analysis.hashtags.length} hashtags</span>
          )}
        </div>
        {platform === 'twitter' && (
          <span className={analysis.character_count > 280 ? 'text-red-400' : 'text-gray-400'}>
            {280 - analysis.character_count} remaining
          </span>
        )}
      </div>
    </div>
  );
};

export default ContentOptimizationPanel;

