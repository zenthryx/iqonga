import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, BarChart3, Type, Hash, CheckCircle, Lightbulb, TrendingUp, Target } from 'lucide-react';

const ContentOptimizationAssistantFeature: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-yellow-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-500/20 rounded-full mb-6">
            <Sparkles className="h-10 w-10 text-yellow-400" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Content Optimization Assistant</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Real-time content optimization with readability scoring, SEO suggestions, and engagement tips. Improve your content as you type with AI-powered insights.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <BarChart3 className="h-8 w-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Overall Optimization Score</h3>
            <p className="text-gray-300">
              Get a comprehensive score (0-100%) combining readability, SEO, and engagement factors. Know how optimized your content is.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Type className="h-8 w-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Readability Scoring</h3>
            <p className="text-gray-300">
              Flesch Reading Ease score with grade level. Ensure your content is accessible and easy to read for your audience.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <TrendingUp className="h-8 w-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">SEO Analysis</h3>
            <p className="text-gray-300">
              Keyword density analysis and meta suggestions. Optimize your content for search engines and discoverability.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Target className="h-8 w-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Engagement Optimization</h3>
            <p className="text-gray-300">
              Character count optimization, hashtag suggestions, mention recommendations, question prompts, and CTA suggestions.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Hash className="h-8 w-8 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Hashtag Suggestions</h3>
            <p className="text-gray-300">
              Integrated with Keyword Intelligence for relevant hashtag suggestions. One-click insertion into your content.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <CheckCircle className="h-8 w-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Tone Consistency</h3>
            <p className="text-gray-300">
              Check if your content matches your agent's personality and voice tone. Maintain brand consistency.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Lightbulb className="h-8 w-8 text-pink-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Prioritized Suggestions</h3>
            <p className="text-gray-300">
              Get suggestions ranked by priority (high/medium/low) with impact percentages. Focus on what matters most.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Sparkles className="h-8 w-8 text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Real-Time Analysis</h3>
            <p className="text-gray-300">
              Analysis updates as you type (1 second debounce). Get instant feedback without interrupting your workflow.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <BarChart3 className="h-8 w-8 text-teal-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Metrics Dashboard</h3>
            <p className="text-gray-300">
              View readability, SEO, and engagement scores at a glance. See character/word count and platform limits.
            </p>
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Content Quality Improvement</h3>
              <p className="text-gray-300 mb-4">
                Improve content quality in real-time. Get suggestions for readability, SEO, and engagement as you write.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Real-time optimization feedback</li>
                <li>• Prioritized improvement suggestions</li>
                <li>• Impact-based recommendations</li>
                <li>• Quality score tracking</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">SEO Optimization</h3>
              <p className="text-gray-300 mb-4">
                Optimize content for search engines with keyword density analysis and SEO suggestions.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Keyword density tracking</li>
                <li>• SEO score improvement</li>
                <li>• Meta description suggestions</li>
                <li>• Search engine optimization</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Engagement Maximization</h3>
              <p className="text-gray-300 mb-4">
                Maximize engagement with character count optimization, hashtag suggestions, and CTA recommendations.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Optimal character count</li>
                <li>• Hashtag recommendations</li>
                <li>• Question prompts for replies</li>
                <li>• Call-to-action suggestions</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Brand Consistency</h3>
              <p className="text-gray-300 mb-4">
                Ensure all content matches your brand voice and agent personality with tone consistency checking.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Tone consistency scoring</li>
                <li>• Agent personality alignment</li>
                <li>• Brand voice matching</li>
                <li>• Consistency recommendations</li>
              </ul>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-yellow-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-yellow-400">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Start Typing</h3>
              <p className="text-gray-400 text-sm">
                Begin typing your content. The optimization panel appears automatically when content length exceeds 10 characters.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-yellow-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-yellow-400">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Real-Time Analysis</h3>
              <p className="text-gray-400 text-sm">
                After 1 second of no typing, AI analyzes your content for readability, SEO, and engagement factors.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-yellow-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-yellow-400">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Review Suggestions</h3>
              <p className="text-gray-400 text-sm">
                Review optimization score, suggestions, and hashtag recommendations. See impact percentages for each suggestion.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-yellow-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-yellow-400">4</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Apply Improvements</h3>
              <p className="text-gray-400 text-sm">
                Click hashtag suggestions to insert them. Follow prioritized suggestions to improve your content score.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Optimize Your Content?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Get real-time optimization suggestions as you create content.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/ai-content"
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Try Content Optimization
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

export default ContentOptimizationAssistantFeature;

