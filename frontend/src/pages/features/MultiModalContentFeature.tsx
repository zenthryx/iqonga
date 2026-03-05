import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, FileText, Image, Video, Twitter, Layers, Sparkles, CheckCircle } from 'lucide-react';

const MultiModalContentFeature: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-pink-500/20 rounded-full mb-6">
            <Zap className="h-10 w-10 text-pink-400" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Multi-Modal Content Creation</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Generate complete content packages with text, images, and videos together in one click. Create comprehensive, multi-media content for maximum engagement.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <FileText className="h-8 w-8 text-pink-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Text Generation</h3>
            <p className="text-gray-300">
              AI-powered text content generation with platform-specific optimization. Professional, engaging copy that matches your brand voice.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Image className="h-8 w-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Image Generation</h3>
            <p className="text-gray-300">
              DALL-E integration for high-quality images. Choose from multiple styles (Realistic, Artistic, Abstract) and sizes.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Video className="h-8 w-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Video Generation</h3>
            <p className="text-gray-300">
              HeyGen avatar videos with customizable duration (5s to 60s). Professional avatar videos that bring your content to life.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Twitter className="h-8 w-8 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">One-Click Posting</h3>
            <p className="text-gray-300">
              Post complete content packages directly to Twitter with one click. Text, image, and video all in one seamless action.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Layers className="h-8 w-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Platform Optimization</h3>
            <p className="text-gray-300">
              Content automatically optimized for your selected platform. Media formats and sizes adjusted for maximum engagement.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Sparkles className="h-8 w-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Content Package History</h3>
            <p className="text-gray-300">
              View and manage all your generated content packages. Access previous packages for reference or reposting.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <CheckCircle className="h-8 w-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Flexible Options</h3>
            <p className="text-gray-300">
              Choose which media types to include. Generate text only, text + image, text + video, or all three together.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Image className="h-8 w-8 text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Image Styles</h3>
            <p className="text-gray-300">
              Multiple image styles: Realistic, Artistic, Abstract, Minimalist, Vibrant. Choose the perfect style for your brand.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Video className="h-8 w-8 text-teal-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Video Options</h3>
            <p className="text-gray-300">
              Customize video duration (5s, 10s, 15s, 30s, 60s) and choose provider. Professional avatar videos with lip-sync.
            </p>
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Complete Social Media Posts</h3>
              <p className="text-gray-300 mb-4">
                Create complete social media posts with text, image, and video in one go. Perfect for Twitter, LinkedIn, and Instagram.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Generate all media types together</li>
                <li>• Platform-specific optimization</li>
                <li>• One-click posting to social media</li>
                <li>• Consistent brand messaging</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Product Launches</h3>
              <p className="text-gray-300 mb-4">
                Launch products with comprehensive content packages. Text descriptions, product images, and promotional videos.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Coordinated multi-media campaigns</li>
                <li>• Professional product visuals</li>
                <li>• Engaging video content</li>
                <li>• Consistent messaging across media</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Content Marketing</h3>
              <p className="text-gray-300 mb-4">
                Create comprehensive content packages for marketing campaigns. All media types aligned with your strategy.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Multi-media marketing content</li>
                <li>• Brand-consistent visuals</li>
                <li>• Professional video content</li>
                <li>• Streamlined content creation</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Time-Saving Workflow</h3>
              <p className="text-gray-300 mb-4">
                Save time by generating all content types together instead of creating them separately. One workflow, complete content.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Single generation process</li>
                <li>• Coordinated content creation</li>
                <li>• Reduced workflow steps</li>
                <li>• Faster time to publish</li>
              </ul>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-pink-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-pink-400">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Configure Package</h3>
              <p className="text-gray-400 text-sm">
                Select agent, platform, topic, and style. Enable image and/or video generation with your preferences.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-pink-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-pink-400">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Generate Content</h3>
              <p className="text-gray-400 text-sm">
                AI generates text, creates images with DALL-E, and produces videos with HeyGen - all in one process.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-pink-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-pink-400">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Preview Package</h3>
              <p className="text-gray-400 text-sm">
                Review your complete content package: text, image preview, and video. All components ready for use.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-pink-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-pink-400">4</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Post or Save</h3>
              <p className="text-gray-400 text-sm">
                Post directly to Twitter with one click, or save to your content package history for later use.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Create Complete Content?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Generate text, images, and videos together in one seamless workflow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/multimodal-content"
              className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Try Multi-Modal Content
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

export default MultiModalContentFeature;

