import React from 'react';
import { Link } from 'react-router-dom';
import {
  Video,
  MessageSquare,
  Mic,
  Cloud,
  Bot,
  Calendar,
  Mail,
  BarChart3,
  Users,
  Lock,
  Globe,
  Sparkles,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

const WebinarPlatformFeature: React.FC = () => {
  const features = [
    {
      icon: <Video className="w-6 h-6" />,
      title: 'HD Video & Audio',
      description: 'Professional-quality video conferencing powered by Daily.co with support for 200+ concurrent participants',
      details: [
        'WebRTC-based HD video streaming',
        'Crystal-clear audio quality',
        'Screen sharing capabilities',
        'Host controls (mute, kick, spotlight)',
        'Customizable video layouts',
        'Bandwidth optimization'
      ]
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: 'Real-Time Chat & Q&A',
      description: 'Engage with your audience through live chat, interactive Q&A sessions, and message moderation',
      details: [
        'Real-time message delivery',
        'Q&A management system',
        'Message reactions and replies',
        'Chat history and search',
        'Moderator tools',
        'Private host messaging'
      ]
    },
    {
      icon: <Mic className="w-6 h-6" />,
      title: 'Live Transcription',
      description: 'Real-time speech-to-text transcription in 20+ languages powered by Deepgram AI',
      details: [
        'Real-time transcription display',
        '20+ language support',
        'VTT/SRT caption generation',
        'Searchable transcripts',
        'Speaker identification',
        'Downloadable transcript files'
      ]
    },
    {
      icon: <Cloud className="w-6 h-6" />,
      title: 'Cloud Recording',
      description: 'Automatic cloud recording with secure storage and easy sharing capabilities',
      details: [
        'Automatic recording start/stop',
        'Cloud storage integration',
        'Recording playback player',
        'Download and share options',
        'Public/private access control',
        'Thumbnail generation'
      ]
    },
    {
      icon: <Bot className="w-6 h-6" />,
      title: 'AI-Powered Features',
      description: 'Leverage your Ajentrix AI agents for intelligent webinar moderation and assistance',
      details: [
        'AI chat moderation',
        'AI Q&A assistant with smart answers',
        'Post-webinar AI summaries',
        'Key points extraction',
        'Action items generation',
        'Sentiment analysis'
      ]
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Calendar Integration',
      description: 'Seamless integration with Google Calendar for automatic scheduling and reminders',
      details: [
        'Google Calendar sync',
        'Automatic event creation',
        '24-hour and 1-hour reminders',
        'Timezone handling',
        'Calendar invites',
        'Meeting links in events'
      ]
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: 'Email Notifications',
      description: 'Automated email notifications for registration, reminders, and post-webinar follow-ups',
      details: [
        'Registration confirmations',
        'Pre-webinar reminders',
        'Join link delivery',
        'Recording availability alerts',
        'Post-webinar summaries',
        'Customizable email templates'
      ]
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Advanced Analytics',
      description: 'Comprehensive analytics dashboard to measure engagement and webinar performance',
      details: [
        'Attendance tracking',
        'Watch time analytics',
        'Engagement metrics',
        'Chat activity monitoring',
        'Device and location data',
        'Recording view statistics'
      ]
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Registration System',
      description: 'Optional pre-registration for attendees with custom forms and approval workflows',
      details: [
        'Customizable registration forms',
        'Attendee approval system',
        'Registration limits',
        'Waiting list management',
        'Attendee data export',
        'Registration analytics'
      ]
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: 'Security & Privacy',
      description: 'Enterprise-grade security with password protection, waiting rooms, and host controls',
      details: [
        'Password-protected rooms',
        'Waiting room functionality',
        'Host-only controls',
        'Participant permissions',
        'Recording access controls',
        'Webhook signature verification'
      ]
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Multi-language Support',
      description: 'Host webinars in multiple languages with real-time translation capabilities',
      details: [
        '20+ supported languages',
        'Real-time transcription',
        'Multi-language chat',
        'Localized UI',
        'Translation-ready captions',
        'Global audience reach'
      ]
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: 'Interactive Features',
      description: 'Engage your audience with polls, surveys, and interactive elements (coming soon)',
      details: [
        'Live polls and surveys',
        'Real-time voting results',
        'Audience questions',
        'Upvoting system',
        'Breakout rooms (future)',
        'Whiteboard collaboration (future)'
      ]
    }
  ];

  const useCases = [
    {
      title: 'Corporate Training',
      description: 'Host internal training sessions with recording and AI-generated summaries for future reference',
      icon: '🎓'
    },
    {
      title: 'Product Launches',
      description: 'Showcase new products to large audiences with interactive Q&A and real-time feedback',
      icon: '🚀'
    },
    {
      title: 'Educational Webinars',
      description: 'Deliver educational content with live transcription and multilingual support',
      icon: '📚'
    },
    {
      title: 'Marketing Events',
      description: 'Run marketing webinars with analytics to measure engagement and ROI',
      icon: '📊'
    }
  ];

  const stats = [
    { label: 'Max Participants', value: '200+' },
    { label: 'Languages Supported', value: '20+' },
    { label: 'Video Quality', value: 'HD' },
    { label: 'Cost per Hour', value: '~$0.40' }
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-cyan-600/20" />
        <div className="relative bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-8 md:p-12">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-purple-500/20 p-3 rounded-xl">
              <Video className="w-8 h-8 text-purple-300" />
            </div>
            <div className="bg-yellow-500/20 px-3 py-1 rounded-full border border-yellow-500/30">
              <span className="text-yellow-300 text-sm font-medium">Coming Q1 2026</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            AI-Powered Webinar Platform
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl">
            Host professional webinars with HD video, real-time AI transcription, intelligent Q&A assistance, 
            and comprehensive analytics. Built specifically for the Ajentrix ecosystem.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/roadmap"
              className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              View Roadmap
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition-colors"
            >
              Get Notified
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* What Makes It Special */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
          <Sparkles className="w-6 h-6 mr-3 text-purple-400" />
          What Makes Our Webinar Platform Special
        </h2>
        <div className="grid md:grid-cols-2 gap-6 text-gray-300">
          <div className="space-y-3">
            <div className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">AI-First Design:</span> Leverage your existing AI agents for intelligent moderation, Q&A assistance, and post-webinar summaries.
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Deep Platform Integration:</span> Seamlessly integrates with Ajentrix's email, calendar, and social media features.
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Cost-Effective:</span> Only ~$0.40 per hour with generous free tiers (10K minutes/month on Daily.co).
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Professional Quality:</span> Powered by Daily.co (used by enterprise companies) and Deepgram AI for transcription.
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Scalable Architecture:</span> Microservice design that grows with your needs.
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Open Source Tools:</span> Built with FFmpeg, Bull Queue, and other battle-tested open source technologies.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-8">Complete Feature Set</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-all duration-300"
            >
              <div className="bg-purple-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-purple-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm mb-4">{feature.description}</p>
              <ul className="space-y-2">
                {feature.details.map((detail, idx) => (
                  <li key={idx} className="text-sm text-gray-300 flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Use Cases */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-4">Perfect For</h2>
        <p className="text-gray-400 mb-8">Our webinar platform is designed for various professional use cases</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-all duration-300"
            >
              <div className="text-4xl mb-4">{useCase.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{useCase.title}</h3>
              <p className="text-sm text-gray-400">{useCase.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-8">
        <h2 className="text-3xl font-bold text-white mb-8">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-purple-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-purple-300">1</span>
            </div>
            <h4 className="text-white font-semibold mb-2">Create Webinar</h4>
            <p className="text-sm text-gray-400">Set up your webinar with title, schedule, and settings</p>
          </div>
          <div className="text-center">
            <div className="bg-blue-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-300">2</span>
            </div>
            <h4 className="text-white font-semibold mb-2">Invite Attendees</h4>
            <p className="text-sm text-gray-400">Share registration link via email, calendar, or social media</p>
          </div>
          <div className="text-center">
            <div className="bg-cyan-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-cyan-300">3</span>
            </div>
            <h4 className="text-white font-semibold mb-2">Host Live</h4>
            <p className="text-sm text-gray-400">Start webinar with HD video, chat, and AI features</p>
          </div>
          <div className="text-center">
            <div className="bg-purple-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-purple-300">4</span>
            </div>
            <h4 className="text-white font-semibold mb-2">Review & Share</h4>
            <p className="text-sm text-gray-400">Get AI summary, analytics, and share recording</p>
          </div>
        </div>
      </div>

      {/* Technical Specifications */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-8">Technical Specifications</h2>
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Video & Audio</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>HD video quality (up to 1080p)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>200+ concurrent participants</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Screen sharing and presentation mode</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Adaptive bitrate for bandwidth optimization</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Platform Support</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Web browsers (Chrome, Firefox, Safari, Edge)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Mobile responsive design</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Cross-platform compatibility</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>No downloads or plugins required</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-8 md:p-12 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Be the First to Know</h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Our AI-powered webinar platform is launching in Q1 2026. Register your interest to get early access and exclusive launch pricing.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/contact"
            className="inline-flex items-center px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors text-lg"
          >
            Notify Me on Launch
            <Mail className="ml-2 w-5 h-5" />
          </Link>
          <Link
            to="/roadmap"
            className="inline-flex items-center px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition-colors text-lg"
          >
            View Full Roadmap
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WebinarPlatformFeature;

