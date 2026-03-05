import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Target, MessageSquare, Layers, Hash, TrendingUp, CheckCircle, Sparkles, BarChart3 } from 'lucide-react';

const ContentBriefGeneratorFeature: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500/20 rounded-full mb-6">
            <FileText className="h-10 w-10 text-blue-400" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Content Brief Generator</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Generate strategic content briefs before creating content. Get comprehensive planning with target audience analysis, key messages, SEO keywords, and competitor insights.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Target className="h-8 w-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Target Audience Analysis</h3>
            <p className="text-gray-300">
              AI-powered audience profiling with demographics, interests, and pain points. Understand who you're creating content for.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <MessageSquare className="h-8 w-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Key Message Identification</h3>
            <p className="text-gray-300">
              Identify 3-5 prioritized key messages with rationale. Know exactly what to communicate and why.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Layers className="h-8 w-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Content Structure Outline</h3>
            <p className="text-gray-300">
              Get structured outlines with opening hooks, body points, and closing CTAs. Estimated length included.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Hash className="h-8 w-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">SEO Keyword Research</h3>
            <p className="text-gray-300">
              Integrated with Keyword Intelligence for relevant keywords. Primary and related keywords with sentiment data.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <TrendingUp className="h-8 w-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Competitor Analysis</h3>
            <p className="text-gray-300">
              Analyze competitor content themes, formats, engagement tactics, and identify opportunities.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <CheckCircle className="h-8 w-8 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Content Goals</h3>
            <p className="text-gray-300">
              Platform-specific content goals automatically defined. Align your content with strategic objectives.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Sparkles className="h-8 w-8 text-pink-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Tone Guidelines</h3>
            <p className="text-gray-300">
              Agent personality-aware tone guidelines. Language, voice, and platform-specific recommendations.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <BarChart3 className="h-8 w-8 text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Completeness Score</h3>
            <p className="text-gray-300">
              Get a completeness score (0-100%) showing how comprehensive your brief is. Improve your brief quality.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <FileText className="h-8 w-8 text-teal-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Save & Load Briefs</h3>
            <p className="text-gray-300">
              Save briefs for future reference. Load saved briefs to review or regenerate content based on strategic insights.
            </p>
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Strategic Content Planning</h3>
              <p className="text-gray-300 mb-4">
                Plan your content strategy before creation. Understand your audience, identify key messages, and structure your content effectively.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Define target audience before content creation</li>
                <li>• Identify key messages and priorities</li>
                <li>• Structure content for maximum impact</li>
                <li>• Align content with strategic goals</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">SEO-Optimized Content</h3>
              <p className="text-gray-300 mb-4">
                Create content that ranks well with integrated SEO keyword research from Keyword Intelligence.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Research relevant keywords before writing</li>
                <li>• Understand keyword sentiment</li>
                <li>• Identify trending topics</li>
                <li>• Optimize content for discoverability</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Competitive Advantage</h3>
              <p className="text-gray-300 mb-4">
                Analyze competitor content to identify opportunities and create differentiated content.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Understand competitor strategies</li>
                <li>• Identify content gaps</li>
                <li>• Discover engagement tactics that work</li>
                <li>• Create unique content angles</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Brand Consistency</h3>
              <p className="text-gray-300 mb-4">
                Ensure all content aligns with your brand voice and agent personality through tone guidelines.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Maintain consistent brand voice</li>
                <li>• Align with agent personality</li>
                <li>• Platform-specific tone adjustments</li>
                <li>• Professional content standards</li>
              </ul>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-400">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Enter Topic</h3>
              <p className="text-gray-400 text-sm">
                Enter your content topic and select platform. Optionally choose an AI agent for tone guidelines.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-400">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Generate Brief</h3>
              <p className="text-gray-400 text-sm">
                AI analyzes your topic and generates comprehensive brief with audience, messages, structure, and SEO keywords.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-400">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Review Brief</h3>
              <p className="text-gray-400 text-sm">
                Review all brief components: target audience, key messages, content structure, SEO keywords, and competitor insights.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-400">4</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Create Content</h3>
              <p className="text-gray-400 text-sm">
                Use the brief to generate content with AI Content Generator. Content will align with your strategic brief.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Plan Your Content?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Start creating strategic content briefs today and elevate your content quality.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/content-brief"
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Try Content Brief Generator
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

export default ContentBriefGeneratorFeature;

