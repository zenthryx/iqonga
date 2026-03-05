import React, { useState } from 'react';
import { Search, TrendingUp, Hash, Tag, Save, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { keywordIntelligenceService, KeywordResearch } from '../../services/keywordIntelligenceService';

const ResearchTool: React.FC = () => {
  const [query, setQuery] = useState('');
  const [researchType, setResearchType] = useState('trending');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<KeywordResearch | null>(null);
  const [savedResearch, setSavedResearch] = useState<KeywordResearch[]>([]);

  const handleResearch = async () => {
    if (!query.trim()) {
      toast.error('Please enter a keyword or hashtag');
      return;
    }

    setLoading(true);
    try {
      const response = await keywordIntelligenceService.researchKeyword(query, researchType);
      if (response.data) {
        setResults(response.data);
        toast.success('Research completed!');
      }
    } catch (error: any) {
      toast.error('Research failed: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadSavedResearch = async () => {
    try {
      const response = await keywordIntelligenceService.getSavedResearch();
      if (response.data) {
        setSavedResearch(response.data);
      }
    } catch (error: any) {
      toast.error('Failed to load saved research');
    }
  };

  React.useEffect(() => {
    loadSavedResearch();
  }, []);

  return (
    <div className="space-y-6">
      {/* Research Form */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Research Keyword or Hashtag</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Keyword or Hashtag
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleResearch()}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., AI, #artificialintelligence"
              />
              <button
                onClick={handleResearch}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Research
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Research Type
            </label>
            <select
              value={researchType}
              onChange={(e) => setResearchType(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="trending">Trending Analysis</option>
              <option value="related">Related Keywords</option>
              <option value="competitor">Competitor Analysis</option>
              <option value="suggestion">Keyword Suggestions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Research Results</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                {results.search_volume ? `${results.search_volume} mentions` : 'No volume data'}
              </span>
              {results.competition_level && (
                <span className={`px-2 py-1 text-xs rounded ${
                  results.competition_level === 'high' ? 'bg-red-500/20 text-red-400' :
                  results.competition_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {results.competition_level} competition
                </span>
              )}
            </div>
          </div>

          {results.trending_keywords && results.trending_keywords.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trending Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {results.trending_keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {results.related_keywords && results.related_keywords.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Related Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {results.related_keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {results.suggested_hashtags && results.suggested_hashtags.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Suggested Hashtags
              </h3>
              <div className="flex flex-wrap gap-2">
                {results.suggested_hashtags.map((hashtag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm"
                  >
                    {hashtag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {results.trend_direction && (
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className={`h-5 w-5 ${
                  results.trend_direction === 'rising' ? 'text-green-400' :
                  results.trend_direction === 'falling' ? 'text-red-400' :
                  'text-gray-400'
                }`} />
                <span className="text-sm text-gray-300">
                  Trend: <span className="font-medium capitalize">{results.trend_direction}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saved Research */}
      {savedResearch.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Save className="h-5 w-5" />
            Saved Research
          </h2>
          <div className="space-y-2">
            {savedResearch.map((research) => (
              <div
                key={research.id}
                className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{research.query}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {research.research_type} • {new Date(research.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchTool;

