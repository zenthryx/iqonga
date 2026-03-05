import React from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Twitter, Linkedin, Instagram, Youtube, Mail, Facebook, Music, Hash, Quote } from 'lucide-react';

const ContentRepurposingFeature: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-6">
            <RefreshCw className="h-10 w-10 text-green-400" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Content Repurposing Engine</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Convert your content into multiple formats for different platforms automatically. Maximize your content's reach by repurposing it across all channels.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Twitter className="h-8 w-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Twitter Thread</h3>
            <p className="text-gray-300">
              Convert content into multi-tweet threads. Numbered tweets that build on each other for maximum engagement.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Linkedin className="h-8 w-8 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">LinkedIn Post</h3>
            <p className="text-gray-300">
              Professional LinkedIn format optimized for B2B engagement. Professional tone and structure for business audiences.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Instagram className="h-8 w-8 text-pink-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Instagram Carousel</h3>
            <p className="text-gray-300">
              Multi-slide carousel format perfect for Instagram. Visual-first content with engaging captions.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Youtube className="h-8 w-8 text-red-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">YouTube Script</h3>
            <p className="text-gray-300">
              Video script format with timestamps and scene descriptions. Ready for video production and narration.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Mail className="h-8 w-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Newsletter</h3>
            <p className="text-gray-300">
              Email newsletter format with subject lines and body structure. Perfect for email marketing campaigns.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Facebook className="h-8 w-8 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Facebook Post</h3>
            <p className="text-gray-300">
              Facebook-optimized format with engaging hooks and clear call-to-actions. Designed for maximum reach.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Music className="h-8 w-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">TikTok Script</h3>
            <p className="text-gray-300">
              Short-form video script format perfect for TikTok. Engaging, punchy content optimized for short attention spans.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Quote className="h-8 w-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Quote Extraction</h3>
            <p className="text-gray-300">
              Automatically extract key quotes from your content. Perfect for creating quote cards and highlight posts.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Hash className="h-8 w-8 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Hashtag Suggestions</h3>
            <p className="text-gray-300">
              Automatic hashtag suggestions for each platform. Optimize discoverability with relevant hashtags.
            </p>
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Cross-Platform Content</h3>
              <p className="text-gray-300 mb-4">
                Repurpose one piece of content across all your social media platforms. Maximize reach without creating new content.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• One blog post → 7 platform formats</li>
                <li>• Platform-specific optimization</li>
                <li>• Consistent messaging</li>
                <li>• Time-saving workflow</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Content Amplification</h3>
              <p className="text-gray-300 mb-4">
                Amplify your best-performing content by repurposing it in different formats. Reach new audiences on different platforms.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Repurpose viral content</li>
                <li>• Extend content lifespan</li>
                <li>• Reach new platform audiences</li>
                <li>• Maximize content ROI</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Multi-Channel Marketing</h3>
              <p className="text-gray-300 mb-4">
                Create coordinated marketing campaigns across all channels. Same message, optimized for each platform.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Coordinated campaign messaging</li>
                <li>• Platform-specific formats</li>
                <li>• Consistent brand voice</li>
                <li>• Unified marketing strategy</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Content Efficiency</h3>
              <p className="text-gray-300 mb-4">
                Get more value from your content creation. One piece of content becomes multiple pieces across platforms.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Reduce content creation time</li>
                <li>• Increase content output</li>
                <li>• Maintain quality across formats</li>
                <li>• Streamline content workflow</li>
              </ul>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-green-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-400">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Paste Source Content</h3>
              <p className="text-gray-400 text-sm">
                Paste your source content (blog post, tweet, article, etc.) and select the source format.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-400">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Select Target Formats</h3>
              <p className="text-gray-400 text-sm">
                Choose which formats you want: Twitter Thread, LinkedIn Post, Instagram Carousel, YouTube Script, Newsletter, Facebook Post, TikTok Script.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-400">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Enable Options</h3>
              <p className="text-gray-400 text-sm">
                Enable quote extraction and hashtag suggestions. Customize repurposing options for your needs.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-400">4</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Get Repurposed Content</h3>
              <p className="text-gray-400 text-sm">
                Receive all repurposed formats ready to use. Copy and paste directly to each platform.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Repurpose Your Content?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Maximize your content's reach by converting it into multiple platform formats.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/content-repurposing"
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Try Content Repurposing
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

export default ContentRepurposingFeature;

