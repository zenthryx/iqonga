import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  UserIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  SparklesIcon,
  XMarkIcon,
  HeartIcon,
  EyeIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import {
  StarIcon as StarIconSolid,
  HeartIcon as HeartIconSolid
} from '@heroicons/react/24/solid';

interface Influencer {
  id: string;
  platform: string;
  username: string;
  display_name?: string;
  profile_image_url?: string;
  bio?: string;
  follower_count: number;
  engagement_rate: number;
  authenticity_score: number;
  brand_safety_score: number;
  verified: boolean;
  categories: string[];
  tags: string[];
  relevanceScore?: number;
}

const InfluencerDiscovery: React.FC = () => {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTopics, setSearchTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);
  const [savedInfluencers, setSavedInfluencers] = useState<Set<string>>(new Set());
  const [popularTopics, setPopularTopics] = useState<{ topic: string; count: number }[]>([]);

  // Filter states
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [minFollowers, setMinFollowers] = useState('');
  const [maxFollowers, setMaxFollowers] = useState('');
  const [minEngagementRate, setMinEngagementRate] = useState('');
  const [minBrandSafetyScore, setMinBrandSafetyScore] = useState('70');
  const [minAuthenticityScore, setMinAuthenticityScore] = useState('60');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const platforms = [
    { id: 'instagram', name: 'Instagram' },
    { id: 'tiktok', name: 'TikTok' },
    { id: 'youtube', name: 'YouTube' },
    { id: 'twitter', name: 'Twitter' },
    { id: 'facebook', name: 'Facebook' }
  ];

  useEffect(() => {
    loadPopularTopics();
    loadSavedInfluencers();
  }, []);

  const loadPopularTopics = async () => {
    try {
      const response = await apiService.get('/influencers/topics/popular');
      if (response.success) {
        setPopularTopics(response.data || []);
      }
    } catch (error) {
      // Silently fail
    }
  };

  const loadSavedInfluencers = async () => {
    try {
      const response = await apiService.get('/influencers/saved/list');
      if (response.success) {
        const saved = new Set<string>((response.data || []).map((inf: Influencer) => inf.id));
        setSavedInfluencers(saved);
      }
    } catch (error) {
      // Silently fail
    }
  };

  const handleSearch = async () => {
    if (searchTopics.length === 0 && selectedPlatforms.length === 0) {
      toast.error('Please enter at least one topic or select a platform');
      return;
    }

    try {
      setLoading(true);
      const params: any = {};
      
      if (searchTopics.length > 0) {
        params.topics = searchTopics.join(',');
      }
      if (selectedPlatforms.length > 0) {
        params.platforms = selectedPlatforms.join(',');
      }
      if (minFollowers) params.minFollowers = minFollowers;
      if (maxFollowers) params.maxFollowers = maxFollowers;
      if (minEngagementRate) params.minEngagementRate = minEngagementRate;
      if (minBrandSafetyScore) params.minBrandSafetyScore = minBrandSafetyScore;
      if (minAuthenticityScore) params.minAuthenticityScore = minAuthenticityScore;
      if (verifiedOnly) params.verified = 'true';

      const response = await apiService.get('/influencers/discover', { params });
      if (response.success) {
        setInfluencers(response.data || []);
        if (response.data.length === 0) {
          toast('No influencers found matching your criteria', { icon: 'ℹ️' });
        }
      }
    } catch (error: any) {
      toast.error('Failed to search influencers: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddTopic = () => {
    if (topicInput.trim() && !searchTopics.includes(topicInput.trim())) {
      setSearchTopics([...searchTopics, topicInput.trim()]);
      setTopicInput('');
    }
  };

  const handleRemoveTopic = (topic: string) => {
    setSearchTopics(searchTopics.filter((t) => t !== topic));
  };

  const handleSaveInfluencer = async (influencerId: string) => {
    try {
      if (savedInfluencers.has(influencerId)) {
        // Remove from saved
        await apiService.delete(`/influencers/${influencerId}/save`);
        setSavedInfluencers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(influencerId);
          return newSet;
        });
        toast.success('Removed from favorites');
      } else {
        // Add to saved
        await apiService.post(`/influencers/${influencerId}/save`, {});
        setSavedInfluencers((prev) => new Set(prev).add(influencerId));
        toast.success('Saved to favorites');
      }
    } catch (error: any) {
      toast.error('Failed to save influencer: ' + (error.message || 'Unknown error'));
    }
  };

  const handleAnalyzeInfluencer = async (influencerId: string) => {
    try {
      toast.loading('Analyzing influencer...');
      const response = await apiService.post(`/influencers/${influencerId}/analyze`, {});
      if (response.success) {
        toast.dismiss();
        toast.success('Analysis complete! Scores updated.');
        // Refresh influencer data
        handleSearch();
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error('Failed to analyze influencer: ' + (error.message || 'Unknown error'));
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Influencer Discovery
          </h1>
          <p className="text-gray-600">
            Discover brand-safe, authentic creators by topic - powered by AI
          </p>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="space-y-4">
            {/* Topic Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Topics
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTopic()}
                  placeholder="e.g., fitness, technology, fashion..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleAddTopic}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Add
                </button>
              </div>
              {searchTopics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {searchTopics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                    >
                      {topic}
                      <button
                        onClick={() => handleRemoveTopic(topic)}
                        className="hover:text-purple-900"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Popular Topics */}
            {popularTopics.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Popular Topics
                </label>
                <div className="flex flex-wrap gap-2">
                  {popularTopics.slice(0, 10).map((item) => (
                    <button
                      key={item.topic}
                      onClick={() => {
                        if (!searchTopics.includes(item.topic)) {
                          setSearchTopics([...searchTopics, item.topic]);
                        }
                      }}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                    >
                      {item.topic} ({item.count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filters Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
              >
                <FunnelIcon className="h-5 w-5" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-5 w-5" />
                    Search Influencers
                  </>
                )}
              </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platforms
                  </label>
                  <div className="space-y-2">
                    {platforms.map((platform) => (
                      <label key={platform.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedPlatforms.includes(platform.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlatforms([...selectedPlatforms, platform.id]);
                            } else {
                              setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform.id));
                            }
                          }}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span>{platform.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Followers Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={minFollowers}
                      onChange={(e) => setMinFollowers(e.target.value)}
                      placeholder="Min"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      value={maxFollowers}
                      onChange={(e) => setMaxFollowers(e.target.value)}
                      placeholder="Max"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Engagement Rate (%)
                  </label>
                  <input
                    type="number"
                    value={minEngagementRate}
                    onChange={(e) => setMinEngagementRate(e.target.value)}
                    placeholder="e.g., 2.5"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Brand Safety Score
                  </label>
                  <input
                    type="number"
                    value={minBrandSafetyScore}
                    onChange={(e) => setMinBrandSafetyScore(e.target.value)}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Authenticity Score
                  </label>
                  <input
                    type="number"
                    value={minAuthenticityScore}
                    onChange={(e) => setMinAuthenticityScore(e.target.value)}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={(e) => setVerifiedOnly(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Verified Only</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {influencers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {influencers.map((influencer) => (
              <div
                key={influencer.id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {influencer.profile_image_url ? (
                      <img
                        src={influencer.profile_image_url}
                        alt={influencer.username}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                        <UserIcon className="h-8 w-8 text-purple-600" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800">
                          {influencer.display_name || influencer.username}
                        </h3>
                        {influencer.verified && (
                          <span className="text-blue-500">✓</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">@{influencer.username}</p>
                      <p className="text-xs text-gray-400 capitalize">{influencer.platform}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSaveInfluencer(influencer.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {savedInfluencers.has(influencer.id) ? (
                      <HeartIconSolid className="h-5 w-5 text-red-500" />
                    ) : (
                      <HeartIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>

                {influencer.bio && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{influencer.bio}</p>
                )}

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Followers</span>
                    <span className="font-semibold">{formatNumber(influencer.follower_count)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Engagement Rate</span>
                    <span className="font-semibold text-green-600">
                      {influencer.engagement_rate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Brand Safety</span>
                        <span className={`font-semibold px-2 py-1 rounded ${getScoreColor(influencer.brand_safety_score)}`}>
                          {influencer.brand_safety_score.toFixed(0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Authenticity</span>
                        <span className={`font-semibold px-2 py-1 rounded ${getScoreColor(influencer.authenticity_score)}`}>
                          {influencer.authenticity_score.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {influencer.categories && influencer.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {influencer.categories.slice(0, 3).map((category) => (
                      <span
                        key={category}
                        className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}

                {influencer.relevanceScore !== undefined && (
                  <div className="mb-4 p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-700">Topic Relevance</span>
                      <span className="font-semibold text-blue-900">
                        {influencer.relevanceScore}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedInfluencer(influencer)}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    <EyeIcon className="h-4 w-4 inline mr-1" />
                    View Details
                  </button>
                  <button
                    onClick={() => handleAnalyzeInfluencer(influencer.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    title="Re-analyze with AI"
                  >
                    <SparklesIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && influencers.length === 0 && searchTopics.length === 0 && selectedPlatforms.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <MagnifyingGlassIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Start Your Search</h2>
            <p className="text-gray-500">
              Enter topics or select platforms to discover brand-safe, authentic influencers
            </p>
          </div>
        )}
      </div>

      {/* Influencer Detail Modal */}
      {selectedInfluencer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Influencer Details</h2>
              <button
                onClick={() => setSelectedInfluencer(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {/* Add detailed influencer view here */}
              <p className="text-gray-600">Detailed view coming soon...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfluencerDiscovery;

