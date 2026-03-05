import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Upload,
  Download,
  Headphones,
  Type,
  Hash,
  Share2,
  Image as ImageIcon,
  Video,
  Globe,
  FileCheck,
  Layers,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Code,
  BookMarked,
  PenTool
} from 'lucide-react';

const EBookCreatorFeature: React.FC = () => {
  const features = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: 'Rich Text Editor',
      description: 'Professional WYSIWYG editor with formatting options, styles, and real-time preview'
    },
    {
      icon: <Upload className="h-6 w-6" />,
      title: 'Multi-Source Import',
      description: 'Import from Word documents, PDFs, Google Docs, web URLs, or plain text files'
    },
    {
      icon: <Download className="h-6 w-6" />,
      title: 'Multiple Export Formats',
      description: 'Export to PDF, ePub, Flipbook HTML, Kindle, Apple Books, and Kobo formats'
    },
    {
      icon: <Headphones className="h-6 w-6" />,
      title: 'Audiobook Generation',
      description: 'Convert your eBook to professional audiobooks with multiple voice options and speed control'
    },
    {
      icon: <Type className="h-6 w-6" />,
      title: 'Audio/Video Transcription',
      description: 'Transcribe video and audio files to text and add directly to your eBook chapters'
    },
    {
      icon: <ImageIcon className="h-6 w-6" />,
      title: 'AI Cover Designer',
      description: 'Generate stunning eBook covers with AI, customizable styles, colors, and templates'
    },
    {
      icon: <Hash className="h-6 w-6" />,
      title: 'Page Numbering',
      description: 'Customizable page numbering with Arabic/Roman numerals, placement, and alignment options'
    },
    {
      icon: <Layers className="h-6 w-6" />,
      title: 'Table of Contents',
      description: 'Auto-generate professional table of contents with page numbers and chapter links'
    },
    {
      icon: <Share2 className="h-6 w-6" />,
      title: 'Sharing & Publishing',
      description: 'Share publicly or privately, embed on websites, and publish to major platforms'
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: 'Google Drive Integration',
      description: 'Save and access your eBooks directly from Google Drive with seamless integration'
    },
    {
      icon: <BookMarked className="h-6 w-6" />,
      title: 'Project Templates',
      description: 'Start with professional templates for fiction, business, children\'s books, and more'
    },
    {
      icon: <PenTool className="h-6 w-6" />,
      title: 'Unlimited Projects',
      description: 'Create as many eBook projects as you need with unlimited chapters and content'
    }
  ];

  const useCases = [
    {
      title: 'Authors & Writers',
      description: 'Create professional eBooks from your manuscripts with automated formatting, covers, and publishing',
      icon: '✍️'
    },
    {
      title: 'Business Professionals',
      description: 'Transform reports, guides, and documentation into polished eBooks for clients and stakeholders',
      icon: '💼'
    },
    {
      title: 'Content Creators',
      description: 'Repurpose video transcripts, blog posts, and social media content into comprehensive eBooks',
      icon: '🎬'
    },
    {
      title: 'Educators',
      description: 'Create educational materials, course books, and study guides with multimedia integration',
      icon: '📚'
    },
    {
      title: 'Marketers',
      description: 'Produce lead magnets, case studies, and marketing eBooks with professional design and distribution',
      icon: '📈'
    },
    {
      title: 'Publishers',
      description: 'Streamline the eBook creation workflow with batch processing, templates, and multi-format exports',
      icon: '🏢'
    }
  ];

  const pricing = [
    {
      action: 'Create Chapter',
      credits: 15,
      description: 'Generate new chapter content with AI'
    },
    {
      action: 'Edit with AI',
      credits: 10,
      description: 'AI-powered editing and refinement'
    },
    {
      action: 'Generate Cover',
      credits: 5,
      description: 'AI-generated eBook cover image'
    },
    {
      action: 'Transcribe Audio/Video',
      credits: 'Variable',
      description: 'Based on file size and duration'
    },
    {
      action: 'Generate Audiobook',
      credits: 'Variable',
      description: 'Based on content length'
    },
    {
      action: 'Export Formats',
      credits: 'Free',
      description: 'PDF, ePub, Flipbook exports are free'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-600/20 rounded-2xl mb-6">
              <BookOpen className="h-10 w-10 text-purple-400" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              eBook Creator
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Create professional eBooks from start to finish. Import content, generate covers, 
              add audiobooks, and publish to major platforms—all in one powerful platform.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/ebook-creator"
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/pricing"
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Everything You Need to Create eBooks
          </h2>
          <p className="text-gray-400 text-lg">
            Professional tools for authors, businesses, and content creators
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 transition-colors"
            >
              <div className="text-purple-400 mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Use Cases */}
      <div className="bg-gray-800/30 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Perfect For
            </h2>
            <p className="text-gray-400 text-lg">
              Whether you're an author, marketer, or educator
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((useCase, index) => (
              <div
                key={index}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
              >
                <div className="text-4xl mb-4">{useCase.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{useCase.title}</h3>
                <p className="text-gray-400">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-400 text-lg">
            Pay only for AI-powered features. Basic editing and exports are free.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8">
            <div className="space-y-4">
              {pricing.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700"
                >
                  <div>
                    <h4 className="text-white font-semibold">{item.action}</h4>
                    <p className="text-gray-400 text-sm">{item.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-purple-400 font-bold text-lg">
                      {item.credits === 'Free' ? 'Free' : `${item.credits} credits`}
                    </span>
                    {item.credits !== 'Free' && item.credits !== 'Variable' && (
                      <span className="text-gray-500 text-sm block">
                        ${(parseInt(item.credits.toString()) * 0.01).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm">
                <strong>Note:</strong> Free editing, adding your own images, and PDF/ePub/Flipbook downloads. 
                Only AI-powered functions require credits.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Create Your First eBook?
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            Join thousands of authors and creators using Ajentrix AI to publish professional eBooks
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/ebook-creator"
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              Start Creating
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/how-to"
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
            >
              Learn How
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EBookCreatorFeature;

