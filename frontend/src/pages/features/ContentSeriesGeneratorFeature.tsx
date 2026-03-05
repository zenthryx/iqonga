import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, Calendar, Sparkles, CheckCircle, ArrowRight, FileText, Target, Zap } from 'lucide-react';

const ContentSeriesGeneratorFeature: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-500/20 rounded-full mb-6">
            <Layers className="h-10 w-10 text-purple-400" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Content Series Generator</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Create multi-piece content campaigns with progression logic, templates, and content calendars. Build cohesive content series that tell a complete story.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Layers className="h-8 w-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Multi-Piece Campaigns</h3>
            <p className="text-gray-300">
              Create content series with multiple pieces that build on each other. Tell a complete story across multiple posts.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <FileText className="h-8 w-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Pre-Built Templates</h3>
            <p className="text-gray-300">
              Choose from proven templates: AIDA, PAS, StoryBrand, Before/After/Bridge, and more. Or create custom progression logic.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <ArrowRight className="h-8 w-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Content Progression</h3>
            <p className="text-gray-300">
              Each piece builds on the previous one with logical progression. Create content that guides your audience through a journey.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Calendar className="h-8 w-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Content Calendar</h3>
            <p className="text-gray-300">
              Visualize your series in the Content Calendar. See how pieces are distributed over time and ensure consistent posting.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Zap className="h-8 w-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Bulk Scheduling</h3>
            <p className="text-gray-300">
              Schedule entire series at once with frequency settings. Set start date and let the system calculate optimal posting times.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Target className="h-8 w-8 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Multi-Platform Support</h3>
            <p className="text-gray-300">
              Create series for Twitter, LinkedIn, Instagram, and more. Platform-specific optimization for each piece.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <CheckCircle className="h-8 w-8 text-pink-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Series Management</h3>
            <p className="text-gray-300">
              View all your series, edit individual pieces, track status, and manage your content campaigns from one place.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Sparkles className="h-8 w-8 text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Template Library</h3>
            <p className="text-gray-300">
              Access a library of proven content templates. Save custom templates for future use and share with your team.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <FileText className="h-8 w-8 text-teal-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Individual Editing</h3>
            <p className="text-gray-300">
              Edit each piece in the series individually. Maintain progression logic while customizing content for your needs.
            </p>
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Product Launch Campaigns</h3>
              <p className="text-gray-300 mb-4">
                Create multi-piece campaigns that introduce, explain, and promote your product. Guide your audience through the buyer's journey.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Awareness stage content</li>
                <li>• Consideration stage content</li>
                <li>• Decision stage content</li>
                <li>• Post-purchase engagement</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Educational Series</h3>
              <p className="text-gray-300 mb-4">
                Break down complex topics into digestible pieces. Create educational content that builds knowledge progressively.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Progressive learning content</li>
                <li>• Step-by-step guides</li>
                <li>• Tutorial series</li>
                <li>• Knowledge building</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Storytelling Campaigns</h3>
              <p className="text-gray-300 mb-4">
                Tell compelling stories across multiple posts. Use StoryBrand framework to create engaging narrative content.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Character development</li>
                <li>• Problem identification</li>
                <li>• Solution presentation</li>
                <li>• Call to action</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Content Calendars</h3>
              <p className="text-gray-300 mb-4">
                Plan your content calendar with cohesive series. Ensure consistent messaging and optimal posting frequency.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Weekly content themes</li>
                <li>• Monthly campaign planning</li>
                <li>• Consistent brand messaging</li>
                <li>• Strategic content distribution</li>
              </ul>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-purple-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-400">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Create Series</h3>
              <p className="text-gray-400 text-sm">
                Configure series settings: title, platform, frequency, start date. Select a template or create custom progression.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-400">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Generate Pieces</h3>
              <p className="text-gray-400 text-sm">
                AI generates all pieces in the series following the template's progression logic. Each piece builds on the previous.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-400">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Review & Edit</h3>
              <p className="text-gray-400 text-sm">
                Review all pieces, edit individual content, and ensure the series flows logically. Customize to match your brand.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-400">4</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Schedule Series</h3>
              <p className="text-gray-400 text-sm">
                Schedule the entire series at once. System calculates optimal posting times based on frequency and start date.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Create Content Series?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Build cohesive content campaigns with templates and progression logic.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/content-series"
              className="bg-purple-500 hover:bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Try Content Series Generator
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

export default ContentSeriesGeneratorFeature;

