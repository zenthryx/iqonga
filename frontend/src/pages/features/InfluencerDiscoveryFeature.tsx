import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, BarChart3, Target, TrendingUp, CheckCircle2, Sparkles, Heart } from 'lucide-react';

const InfluencerDiscoveryFeature: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-pink-500/20 rounded-full mb-6">
            <Users className="h-10 w-10 text-pink-400" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Influencer Discovery</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Find and connect with the right influencers for your brand. AI-powered matching, analytics, and campaign tracking.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Search className="h-8 w-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">AI-Powered Matching</h3>
            <p className="text-gray-300">
              Find influencers that match your brand values, target audience, and campaign goals using advanced AI algorithms.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <BarChart3 className="h-8 w-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Influencer Analytics</h3>
            <p className="text-gray-300">
              Comprehensive analytics including follower growth, engagement rates, audience demographics, and content performance.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Target className="h-8 w-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Audience Targeting</h3>
            <p className="text-gray-300">
              Filter influencers by niche, location, follower count, engagement rate, and audience demographics.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <TrendingUp className="h-8 w-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Campaign Tracking</h3>
            <p className="text-gray-300">
              Track influencer campaign performance in real-time. Monitor reach, engagement, conversions, and ROI.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <CheckCircle2 className="h-8 w-8 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Verification & Quality</h3>
            <p className="text-gray-300">
              Verify influencer authenticity and quality. Detect fake followers, bot activity, and engagement fraud.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Sparkles className="h-8 w-8 text-pink-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Content Analysis</h3>
            <p className="text-gray-300">
              Analyze influencer content style, posting frequency, and brand alignment. Ensure perfect brand fit.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Heart className="h-8 w-8 text-red-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Engagement Metrics</h3>
            <p className="text-gray-300">
              Track likes, comments, shares, and saves. Measure true engagement beyond just follower count.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Users className="h-8 w-8 text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Relationship Management</h3>
            <p className="text-gray-300">
              Manage influencer relationships, track communications, and maintain a database of your influencer network.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <BarChart3 className="h-8 w-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">ROI Reporting</h3>
            <p className="text-gray-300">
              Generate comprehensive ROI reports for influencer campaigns. Track conversions, sales, and brand awareness.
            </p>
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/20 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Brand Marketing</h3>
              <p className="text-gray-300">
                Find influencers that align with your brand values and target audience. Build authentic partnerships for brand awareness.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Product Launches</h3>
              <p className="text-gray-300">
                Identify influencers to promote new product launches. Track campaign performance and measure impact.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Event Promotion</h3>
              <p className="text-gray-300">
                Discover influencers to promote events, webinars, and conferences. Maximize reach and attendance.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Content Collaboration</h3>
              <p className="text-gray-300">
                Find content creators for collaborations. Analyze their style and audience to ensure perfect brand fit.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/influencer-discovery"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
          >
            <Users className="mr-2 h-5 w-5" />
            Discover Influencers
          </Link>
        </div>
      </div>
    </div>
  );
};

export default InfluencerDiscoveryFeature;

