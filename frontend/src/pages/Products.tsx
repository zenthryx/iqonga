import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, CalendarDays, Bot, Sparkles, ArrowRight } from 'lucide-react';

const Products: React.FC = () => {
  const products = [
    {
      id: 'smart-inbox',
      title: 'Smart Inbox',
      tagline: 'AI-Powered Email Assistant',
      description: 'Transform your email workflow with intelligent AI that reads, categorizes, and drafts replies automatically.',
      icon: Mail,
      gradient: 'from-blue-600 to-cyan-600',
      bgGradient: 'from-blue-900/20 to-cyan-900/20',
      features: [
        'AI Draft Replies in 4 Tones',
        'Auto Categorization & Priority',
        'Smart Spam Detection',
        'Email Summarization',
        'Gmail Integration'
      ],
      status: 'Live',
      link: '/products/smart-inbox'
    },
    {
      id: 'ai-calendar',
      title: 'AI Calendar',
      tagline: 'Intelligent Meeting Assistant',
      description: 'Optimize your schedule with AI-powered meeting prep, smart scheduling, and automated reminders.',
      icon: CalendarDays,
      gradient: 'from-cyan-600 to-purple-600',
      bgGradient: 'from-cyan-900/20 to-purple-900/20',
      features: [
        'AI Meeting Prep',
        'Smart Scheduling',
        'Calendar Health Score',
        'Automated Reminders',
        'Google Calendar Integration'
      ],
      status: 'Live',
      link: '/products/ai-calendar'
    },
    {
      id: 'ai-agents',
      title: 'AI Social Agents',
      tagline: 'Personality-Driven Bots',
      description: 'Create and deploy unique AI personalities across social media platforms with custom traits and behaviors.',
      icon: Bot,
      gradient: 'from-purple-600 to-pink-600',
      bgGradient: 'from-purple-900/20 to-pink-900/20',
      features: [
        'Custom Personalities',
        'Multi-Platform Deployment',
        'Personality-Driven Agents',
        'Engagement Analytics',
        'Twitter, Discord, Telegram'
      ],
      status: 'Live',
      link: '/agents'
    },
    {
      id: 'content-ai',
      title: 'Content AI',
      tagline: 'AI Content Generation',
      description: 'Generate high-quality content and images with AI for social media, blogs, and marketing campaigns.',
      icon: Sparkles,
      gradient: 'from-pink-600 to-orange-600',
      bgGradient: 'from-pink-900/20 to-orange-900/20',
      features: [
        'Social Media Posts',
        'Blog Articles',
        'Image Generation (DALL-E 3)',
        'SEO Optimization',
        'Brand Voice Training'
      ],
      status: 'Live',
      link: '/content-generator'
    }
  ];

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 50%, #020617 100%)'
    }}>
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-cyan-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-full border border-purple-500/30">
            <span className="text-sm font-semibold text-purple-300">AI-Powered Productivity Suite</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Meet the Products That
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
              Supercharge Your Workflow
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            From intelligent email management to smart calendar optimization and AI social agents - 
            discover the suite of AI tools designed to make you more productive.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all flex items-center justify-center space-x-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/features"
              className="bg-gray-700/50 hover:bg-gray-600/50 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all border border-gray-600"
            >
              View All Features
            </Link>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {products.map((product) => (
              <Link
                key={product.id}
                to={product.link}
                className="group relative"
              >
                <div className={`relative glass-card p-8 border border-white/10 bg-gradient-to-br ${product.bgGradient} hover:scale-105 transition-all duration-300 h-full`}>
                  {/* Status Badge */}
                  <div className="absolute top-6 right-6">
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
                      {product.status}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${product.gradient} flex items-center justify-center mb-6`}>
                    <product.icon className="h-8 w-8 text-white" />
                  </div>

                  {/* Content */}
                  <div className="mb-6">
                    <h3 className="text-3xl font-bold text-white mb-2">
                      {product.title}
                    </h3>
                    <p className={`text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r ${product.gradient} mb-4`}>
                      {product.tagline}
                    </p>
                    <p className="text-gray-300 text-base leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {product.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-3 text-sm text-gray-300">
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${product.gradient}`}></div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="flex items-center space-x-2 text-cyan-400 font-semibold group-hover:text-cyan-300 transition-colors">
                    <span>Learn More</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Iqonga Section */}
      <section className="py-20 bg-gradient-to-br from-gray-800/50 to-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose Iqonga?</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Built for professionals who demand intelligence, automation, and efficiency
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🧠</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI-First Design</h3>
              <p className="text-gray-400">
                Built from the ground up with AI at the core, not as an afterthought
              </p>
            </div>

            <div className="glass-card p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🔐</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Privacy & Security</h3>
              <p className="text-gray-400">
                OAuth 2.0, encrypted connections, and your data stays yours
              </p>
            </div>

            <div className="glass-card p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-600 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Seamless Integration</h3>
              <p className="text-gray-400">
                Works with tools you already use - Gmail, Google Calendar, and more
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-cyan-900/20 via-blue-900/20 to-purple-900/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of professionals using Iqonga to work smarter, not harder.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all"
            >
              Start Free Trial
            </Link>
            <Link
              to="/pricing"
              className="bg-gray-700/50 hover:bg-gray-600/50 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all border border-gray-600"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Products;

