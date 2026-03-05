import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, BarChart3, Clock, Target, Zap, CheckCircle, Sparkles, Activity } from 'lucide-react';

const ContentPerformancePredictionFeature: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-500/20 rounded-full mb-6">
            <TrendingUp className="h-10 w-10 text-teal-400" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Content Performance Prediction</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Predict content performance before posting with engagement scores, viral potential, and best time to post recommendations. Optimize your content for maximum impact.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <BarChart3 className="h-8 w-8 text-teal-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Engagement Score</h3>
            <p className="text-gray-300">
              Overall engagement score (0-100%) predicting how well your content will perform. Based on content, agent, and platform analysis.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Zap className="h-8 w-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Viral Potential</h3>
            <p className="text-gray-300">
              Assessment of viral potential (High/Medium/Low). Identify content with high shareability and engagement potential.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Activity className="h-8 w-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Predicted Metrics</h3>
            <p className="text-gray-300">
              Estimated likes, retweets, replies, and impressions. Get realistic expectations for content performance.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Clock className="h-8 w-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Best Time to Post</h3>
            <p className="text-gray-300">
              Optimal day and hour (UTC) for posting. Based on historical performance data and audience activity patterns.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Target className="h-8 w-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Audience Match</h3>
            <p className="text-gray-300">
              Analysis of how well content matches your agent's audience. Ensure content resonates with your followers.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Sparkles className="h-8 w-8 text-pink-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Optimization Suggestions</h3>
            <p className="text-gray-300">
              Actionable suggestions to improve performance with impact percentages. Know exactly what to change and why.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <CheckCircle className="h-8 w-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Historical Integration</h3>
            <p className="text-gray-300">
              Predictions based on historical performance data. Learn from past content to predict future success.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <TrendingUp className="h-8 w-8 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Agent-Specific Predictions</h3>
            <p className="text-gray-300">
              Predictions tailored to your agent's personality and audience. Account for agent-specific performance patterns.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <BarChart3 className="h-8 w-8 text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Real-Time Predictions</h3>
            <p className="text-gray-300">
              Get predictions as you type. See how changes affect performance score in real-time.
            </p>
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Content Optimization</h3>
              <p className="text-gray-300 mb-4">
                Optimize content before posting. Get suggestions to improve engagement score and maximize performance.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Pre-posting optimization</li>
                <li>• Impact-based suggestions</li>
                <li>• Performance score improvement</li>
                <li>• Engagement maximization</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Timing Optimization</h3>
              <p className="text-gray-300 mb-4">
                Post at optimal times for maximum engagement. Get best time to post recommendations based on data.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Optimal posting time</li>
                <li>• Day and hour recommendations</li>
                <li>• Audience activity patterns</li>
                <li>• Engagement maximization</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Viral Content Identification</h3>
              <p className="text-gray-300 mb-4">
                Identify content with high viral potential. Focus efforts on content most likely to go viral.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Viral potential assessment</li>
                <li>• High-performing content identification</li>
                <li>• Shareability prediction</li>
                <li>• Engagement forecasting</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Performance Expectations</h3>
              <p className="text-gray-300 mb-4">
                Set realistic expectations for content performance. Know what metrics to expect before posting.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Predicted likes and retweets</li>
                <li>• Engagement estimates</li>
                <li>• Performance benchmarks</li>
                <li>• Goal setting</li>
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
              <h3 className="text-lg font-semibold text-white mb-2">Generate Content</h3>
              <p className="text-gray-400 text-sm">
                Generate content using AI Content Generator. Predictions are calculated automatically after content generation.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-teal-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-teal-400">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Analysis</h3>
              <p className="text-gray-400 text-sm">
                AI analyzes content, agent personality, platform, and historical data to predict performance.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-teal-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-teal-400">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Review Predictions</h3>
              <p className="text-gray-400 text-sm">
                Review engagement score, viral potential, predicted metrics, best time to post, and optimization suggestions.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-teal-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-teal-400">4</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Optimize & Post</h3>
              <p className="text-gray-400 text-sm">
                Apply optimization suggestions to improve score. Schedule post at recommended time for maximum engagement.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Predict Performance?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Optimize your content for maximum engagement with AI-powered performance predictions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/ai-content"
              className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Try Performance Prediction
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

export default ContentPerformancePredictionFeature;

