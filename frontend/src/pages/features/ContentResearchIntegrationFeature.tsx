import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Globe, TrendingUp, CheckCircle, FileText, Target, Sparkles, BarChart3 } from 'lucide-react';

const ContentResearchIntegrationFeature: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-500/20 rounded-full mb-6">
            <Search className="h-10 w-10 text-indigo-400" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Content Research Integration</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Generate research-backed content with citations, trending topics, and fact-checking. Create authoritative content that your audience trusts.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Globe className="h-8 w-8 text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Web Search Integration</h3>
            <p className="text-gray-300">
              Automatic web search for relevant information about your topic. Get current, accurate data from multiple sources.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <TrendingUp className="h-8 w-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Trending Topics Discovery</h3>
            <p className="text-gray-300">
              Discover current trending topics related to your content. Stay relevant and engage with what's happening now.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <CheckCircle className="h-8 w-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Fact-Checking</h3>
            <p className="text-gray-300">
              AI-powered fact-checking ensures your content is accurate and trustworthy. Build credibility with verified information.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <FileText className="h-8 w-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Citation Generation</h3>
            <p className="text-gray-300">
              Automatic citation generation for sources. Include references in your content for transparency and credibility.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Target className="h-8 w-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Keyword Suggestions</h3>
            <p className="text-gray-300">
              Get SEO keyword suggestions based on research. Optimize your content for discoverability and search rankings.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <BarChart3 className="h-8 w-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Competitor Analysis</h3>
            <p className="text-gray-300">
              Analyze what competitors are doing. Understand market trends and identify content opportunities.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Sparkles className="h-8 w-8 text-pink-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Research Data Display</h3>
            <p className="text-gray-300">
              Research data displayed with generated content. See sources, citations, and trending topics used in content creation.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Search className="h-8 w-8 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Auto-Research Mode</h3>
            <p className="text-gray-300">
              Enable research mode with one checkbox. Research is performed automatically during content generation.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <FileText className="h-8 w-8 text-teal-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Authoritative Content</h3>
            <p className="text-gray-300">
              Create authoritative, well-researched content that builds trust. Back up claims with sources and citations.
            </p>
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Fact-Checked Content</h3>
              <p className="text-gray-300 mb-4">
                Create content backed by research and facts. Build credibility with accurate, verified information.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Automatic fact-checking</li>
                <li>• Source verification</li>
                <li>• Citation generation</li>
                <li>• Trustworthy content</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Trending Topic Content</h3>
              <p className="text-gray-300 mb-4">
                Create content around trending topics. Stay relevant and engage with current conversations.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Trending topic discovery</li>
                <li>• Current event integration</li>
                <li>• Real-time relevance</li>
                <li>• Engagement optimization</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">SEO-Optimized Research</h3>
              <p className="text-gray-300 mb-4">
                Research includes SEO keyword suggestions. Optimize content for search engines while maintaining accuracy.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Keyword research integration</li>
                <li>• SEO optimization</li>
                <li>• Search ranking improvement</li>
                <li>• Discoverability enhancement</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Competitive Intelligence</h3>
              <p className="text-gray-300 mb-4">
                Analyze competitor content to understand market trends and identify opportunities.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Competitor content analysis</li>
                <li>• Market trend identification</li>
                <li>• Content opportunity discovery</li>
                <li>• Strategic content planning</li>
              </ul>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-indigo-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-400">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Enable Research</h3>
              <p className="text-gray-400 text-sm">
                Check the "Research" checkbox in AI Content Generator. Research mode is now enabled for content generation.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-indigo-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-400">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Research Performed</h3>
              <p className="text-gray-400 text-sm">
                AI performs web search, discovers trending topics, suggests keywords, and analyzes competitors automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-indigo-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-400">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Content Generated</h3>
              <p className="text-gray-400 text-sm">
                Content is generated using research data. Facts are verified, citations included, and trending topics integrated.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-indigo-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-400">4</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Review Research Data</h3>
              <p className="text-gray-400 text-sm">
                Review research data displayed with content: sources, citations, trending topics, and keyword suggestions.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Create Research-Backed Content?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Generate authoritative content with citations, fact-checking, and trending topics.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/ai-content"
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Try Research Integration
            </Link>
            <Link
              to="/how-to"
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Learn How to Use
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentResearchIntegrationFeature;

