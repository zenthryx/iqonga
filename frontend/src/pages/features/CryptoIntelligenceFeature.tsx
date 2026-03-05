import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, AlertCircle, BarChart3, Sparkles, Bell, Twitter, DollarSign, Activity } from 'lucide-react';

const CryptoIntelligenceFeature: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-yellow-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-500/20 rounded-full mb-6">
            <TrendingUp className="h-10 w-10 text-yellow-400" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Crypto Intelligence</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Real-time cryptocurrency market intelligence powered by X/Twitter data. Get sentiment analysis, trading signals, and automated content generation.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Twitter className="h-8 w-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">X/Twitter Monitoring</h3>
            <p className="text-gray-300">
              Monitor cryptocurrency discussions on X/Twitter in real-time. Track mentions, sentiment, and influencer activity.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Activity className="h-8 w-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Sentiment Analysis</h3>
            <p className="text-gray-300">
              AI-powered sentiment classification (bullish, bearish, neutral). Track sentiment trends over time with visual charts.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Bell className="h-8 w-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Trading Signals</h3>
            <p className="text-gray-300">
              Receive automated trading signals based on sentiment changes, mention spikes, and influencer activity.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <AlertCircle className="h-8 w-8 text-red-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Alert System</h3>
            <p className="text-gray-300">
              Get instant alerts when sentiment shifts, mentions spike, or influencers post about your monitored tokens.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <BarChart3 className="h-8 w-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Sentiment Charts</h3>
            <p className="text-gray-300">
              Visualize sentiment trends over time. Track how market sentiment evolves for your monitored cryptocurrencies.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Sparkles className="h-8 w-8 text-pink-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Content Generation</h3>
            <p className="text-gray-300">
              Automatically generate market analysis posts, alert graphics, and video summaries using AI.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <DollarSign className="h-8 w-8 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Multi-Token Monitoring</h3>
            <p className="text-gray-300">
              Monitor multiple cryptocurrencies simultaneously. Track BTC, ETH, SOL, and any custom tokens.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <TrendingUp className="h-8 w-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Influencer Tracking</h3>
            <p className="text-gray-300">
              Identify and track key influencers in the crypto space. Monitor their activity and impact on sentiment.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <BarChart3 className="h-8 w-8 text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Usage Analytics</h3>
            <p className="text-gray-300">
              Track your API usage and costs. Monitor credit consumption and optimize your monitoring strategy.
            </p>
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/20 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Crypto Traders</h3>
              <p className="text-gray-300">
                Get real-time sentiment analysis and trading signals to make informed decisions. Monitor market sentiment before making trades.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Crypto Projects</h3>
              <p className="text-gray-300">
                Monitor community sentiment around your token. Track mentions, identify influencers, and respond to market trends.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Content Creators</h3>
              <p className="text-gray-300">
                Generate market analysis content automatically. Create posts, graphics, and videos based on real-time market data.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Research & Analysis</h3>
              <p className="text-gray-300">
                Conduct market research with sentiment data. Analyze trends, identify patterns, and track market evolution.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/crypto-intelligence"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-semibold rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all duration-200 transform hover:scale-105"
          >
            <TrendingUp className="mr-2 h-5 w-5" />
            Start Monitoring
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CryptoIntelligenceFeature;

