import React from 'react';
import { Link } from 'react-router-dom';
import { Search, TrendingUp, AlertCircle, BarChart3, Sparkles, Bell, Hash, Tag, Filter, Download, Activity, Zap } from 'lucide-react';

const KeywordIntelligenceFeature: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-500/20 rounded-full mb-6">
            <Search className="h-10 w-10 text-teal-400" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Keyword & Hashtag Intelligence</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Research, monitor, and analyze keywords and hashtags across social media with AI-powered sentiment analysis, real-time alerts, and comprehensive analytics.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Hash className="h-8 w-8 text-teal-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Keyword & Hashtag Monitoring</h3>
            <p className="text-gray-300">
              Monitor keywords and hashtags on X/Twitter in real-time. Track mentions, sentiment, engagement, and trending topics.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Activity className="h-8 w-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">AI Sentiment Analysis</h3>
            <p className="text-gray-300">
              AI-powered sentiment classification (positive, negative, neutral). Track sentiment trends over time with visual charts and analytics.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Bell className="h-8 w-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Real-Time Alerts</h3>
            <p className="text-gray-300">
              Get instant alerts when sentiment shifts, mentions spike, or influencers post about your monitored keywords. Custom alert rules with multiple conditions.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <BarChart3 className="h-8 w-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Sentiment Charts</h3>
            <p className="text-gray-300">
              Visualize sentiment trends over time. Track how sentiment evolves for your monitored keywords and hashtags with interactive charts.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Filter className="h-8 w-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Advanced Filtering</h3>
            <p className="text-gray-300">
              Filter monitors by type, platform, status, and tags. Search across keywords, tags, and descriptions. Bulk operations for efficient management.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <TrendingUp className="h-8 w-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Influencer Tracking</h3>
            <p className="text-gray-300">
              Track influencer activity and mentions. Monitor specific influencer handles and analyze their sentiment and engagement with your keywords.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Sparkles className="h-8 w-8 text-pink-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Keyword Research</h3>
            <p className="text-gray-300">
              Research keywords and hashtags to discover trending topics, related keywords, competitor keywords, and suggested hashtags.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Tag className="h-8 w-8 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Collections & Workspaces</h3>
            <p className="text-gray-300">
              Organize your monitors into collections and workspaces. Group related keywords and hashtags for better management and analysis.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Zap className="h-8 w-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Real-Time Updates</h3>
            <p className="text-gray-300">
              Receive instant updates via WebSocket when monitors complete checks. No polling required - true real-time experience.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Download className="h-8 w-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">CSV Export</h3>
            <p className="text-gray-300">
              Export monitor data and sentiment snapshots to CSV for further analysis in Excel, Google Sheets, or data analysis tools.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <AlertCircle className="h-8 w-8 text-red-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Custom Alert Rules</h3>
            <p className="text-gray-300">
              Create custom alert rules with multiple conditions, AND/OR logic, and notification channels (in-app, email, webhook).
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <BarChart3 className="h-8 w-8 text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Usage Analytics</h3>
            <p className="text-gray-300">
              Track API usage, credits consumed, and operation costs. Monitor your usage patterns and optimize your monitoring strategy.
            </p>
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Brand Monitoring</h3>
              <p className="text-gray-300 mb-4">
                Monitor your brand name, products, and campaigns across social media. Track sentiment, identify trending topics, and respond to mentions in real-time.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Track brand mentions and sentiment</li>
                <li>• Monitor campaign hashtags</li>
                <li>• Identify trending topics</li>
                <li>• Respond to negative sentiment quickly</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Competitor Analysis</h3>
              <p className="text-gray-300 mb-4">
                Monitor competitor keywords and hashtags to understand their marketing strategies, audience sentiment, and trending topics.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Track competitor mentions</li>
                <li>• Analyze competitor sentiment</li>
                <li>• Identify competitor campaigns</li>
                <li>• Discover market opportunities</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Trend Research</h3>
              <p className="text-gray-300 mb-4">
                Research trending keywords and hashtags to discover new opportunities, understand market trends, and identify emerging topics.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Discover trending keywords</li>
                <li>• Find related keywords</li>
                <li>• Analyze hashtag performance</li>
                <li>• Identify emerging trends</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Content Strategy</h3>
              <p className="text-gray-300 mb-4">
                Use keyword intelligence to inform your content strategy. Identify high-performing keywords, track engagement, and optimize your content.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Identify high-performing keywords</li>
                <li>• Track content engagement</li>
                <li>• Optimize content strategy</li>
                <li>• Discover content opportunities</li>
              </ul>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-teal-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-teal-400">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Create Monitor</h3>
              <p className="text-gray-400 text-sm">
                Set up a monitor for your keyword or hashtag. Configure monitoring frequency, alert thresholds, and notification channels.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-teal-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-teal-400">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Automatic Monitoring</h3>
              <p className="text-gray-400 text-sm">
                Our scheduler automatically checks X/Twitter for mentions, analyzes sentiment, and tracks engagement metrics.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-teal-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-teal-400">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Real-Time Alerts</h3>
              <p className="text-gray-400 text-sm">
                Receive instant alerts when sentiment changes, mentions spike, or custom alert rules are triggered.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-teal-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-teal-400">4</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Analyze & Act</h3>
              <p className="text-gray-400 text-sm">
                View sentiment charts, analyze trends, export data, and take action based on insights.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Start monitoring keywords and hashtags today with AI-powered intelligence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Go to Dashboard
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

export default KeywordIntelligenceFeature;

