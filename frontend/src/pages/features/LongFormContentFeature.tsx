import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  DocumentTextIcon,
  SparklesIcon,
  BookOpenIcon,
  NewspaperIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  PencilIcon,
  ArrowLeftIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const LongFormContentFeature: React.FC = () => {
  const { t, language } = useLanguage();
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const contentTypes = [
    {
      title: 'Blog Posts',
      description: 'SEO-optimized blog articles',
      icon: <BookOpenIcon className="h-8 w-8" />
    },
    {
      title: 'Newsletters',
      description: 'Email newsletters and updates',
      icon: <EnvelopeIcon className="h-8 w-8" />
    },
    {
      title: 'Substack Articles',
      description: 'Substack-style long-form content',
      icon: <NewspaperIcon className="h-8 w-8" />
    },
    {
      title: 'Medium Articles',
      description: 'Medium publication articles',
      icon: <GlobeAltIcon className="h-8 w-8" />
    },
    {
      title: 'Press Releases',
      description: 'Official press releases',
      icon: <DocumentTextIcon className="h-8 w-8" />
    },
    {
      title: 'Whitepapers',
      description: 'In-depth research documents',
      icon: <PencilIcon className="h-8 w-8" />
    },
    {
      title: 'Case Studies',
      description: 'Detailed case studies',
      icon: <BookOpenIcon className="h-8 w-8" />
    },
    {
      title: 'General Articles',
      description: 'General long-form articles',
      icon: <DocumentTextIcon className="h-8 w-8" />
    }
  ];

  const features = [
    'Target word count control (500-5000 words)',
    'Multiple tone options (Professional, Casual, Friendly, etc.)',
    'SEO optimization',
    'Target audience specification',
    'Key points integration',
    'Draft saving and management',
    'Export to Markdown, HTML, TXT',
    'Agent personality-driven content'
  ];

  useEffect(() => {
    const loadTranslations = async () => {
      if (language === 'en') {
        setTranslations({});
        return;
      }

      try {
        const allTexts = [
          'Long-Form Content Generator',
          'Create comprehensive long-form content including blogs, newsletters, articles, and whitepapers with AI',
          'Get Started',
          'Content Types',
          'Key Features',
          'Why Choose Long-Form Content Generator?',
          'High-quality, SEO-optimized content',
          'Multiple content types for various needs',
          'Agent personality-driven writing',
          'Try Long-Form Content Generator Now',
          'Start creating comprehensive long-form content',
          'Go to Long-Form Content Generator'
        ];

        const { translationService } = await import('../../services/translationService');
        const translatedTexts = await translationService.translateBatch(allTexts, language, 'Long-Form Content Feature page');
        const trans: Record<string, string> = {};
        allTexts.forEach((text, i) => {
          trans[text] = translatedTexts[i];
        });
        setTranslations(trans);
      } catch (error) {
        console.error('Translation error:', error);
      }
    };

    loadTranslations();
  }, [language, t]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            to="/features"
            className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Features
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-purple-500/20 p-4 rounded-xl">
              <DocumentTextIcon className="h-12 w-12 text-purple-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {translations['Long-Form Content Generator'] || 'Long-Form Content Generator'}
              </h1>
              <p className="text-xl text-gray-300">
                {translations['Create comprehensive long-form content including blogs, newsletters, articles, and whitepapers with AI'] || 
                 'Create comprehensive long-form content including blogs, newsletters, articles, and whitepapers with AI'}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link
              to="/long-form-content"
              className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              {translations['Get Started'] || 'Get Started'}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Content Types */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">
            {translations['Content Types'] || 'Content Types'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {contentTypes.map((type, index) => (
              <div
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 transition-all text-center"
              >
                <div className="text-purple-400 mb-4 flex justify-center">{type.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{type.title}</h3>
                <p className="text-gray-400 text-sm">{type.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">
            {translations['Key Features'] || 'Key Features'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 flex items-start"
              >
                <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="mb-16 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-2xl p-8 border border-purple-500/20">
          <h2 className="text-3xl font-bold text-white mb-6">
            {translations['Why Choose Long-Form Content Generator?'] || 'Why Choose Long-Form Content Generator?'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Quality</h3>
              <p className="text-gray-300">
                {translations['High-quality, SEO-optimized content'] || 
                 'High-quality, SEO-optimized content'}
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Variety</h3>
              <p className="text-gray-300">
                {translations['Multiple content types for various needs'] || 
                 'Multiple content types for various needs'}
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Personality</h3>
              <p className="text-gray-300">
                {translations['Agent personality-driven writing'] || 
                 'Agent personality-driven writing'}
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-gray-800/50 rounded-2xl p-12 border border-gray-700">
          <h2 className="text-3xl font-bold text-white mb-4">
            {translations['Try Long-Form Content Generator Now'] || 'Try Long-Form Content Generator Now'}
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            {translations['Start creating comprehensive long-form content'] || 
             'Start creating comprehensive long-form content'}
          </p>
          <Link
            to="/long-form-content"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold text-lg transition-all"
          >
            {translations['Go to Long-Form Content Generator'] || 'Go to Long-Form Content Generator'}
          </Link>
        </section>
      </div>
    </div>
  );
};

export default LongFormContentFeature;

