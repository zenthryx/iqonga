import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  PencilIcon,
  SparklesIcon,
  BookOpenIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const CreativeWritingFeature: React.FC = () => {
  const { t, language } = useLanguage();
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const contentTypes = [
    {
      title: 'Short Stories',
      description: 'Short fiction stories',
      icon: <BookOpenIcon className="h-8 w-8" />
    },
    {
      title: 'Book Chapters',
      description: 'Individual book chapters with chapter management',
      icon: <BookOpenIcon className="h-8 w-8" />
    },
    {
      title: 'Poems',
      description: 'Poetry and verses',
      icon: <PencilIcon className="h-8 w-8" />
    },
    {
      title: 'Children\'s Books',
      description: 'Children\'s stories',
      icon: <BookOpenIcon className="h-8 w-8" />
    },
    {
      title: 'Screenplays',
      description: 'Scripts and screenplays',
      icon: <DocumentTextIcon className="h-8 w-8" />
    },
    {
      title: 'Creative Nonfiction',
      description: 'Creative nonfiction',
      icon: <PencilIcon className="h-8 w-8" />
    }
  ];

  const features = [
    'Genre selection (Fiction, Fantasy, Sci-Fi, Mystery, Romance, etc.)',
    'Writing style options (narrative, descriptive, dialogue-heavy, etc.)',
    'Target word count (500-10000 words)',
    'Character development',
    'Plot point integration',
    'Chapter management for books',
    'Export to multiple formats (TXT, PDF, EPUB, DOCX)',
    'Agent personality-driven writing'
  ];

  useEffect(() => {
    const loadTranslations = async () => {
      if (language === 'en') {
        setTranslations({});
        return;
      }

      try {
        const allTexts = [
          'Creative Writing Assistant',
          'Generate creative content including stories, books, poems, and screenplays with AI',
          'Get Started',
          'Content Types',
          'Key Features',
          'Why Choose Creative Writing Assistant?',
          'AI-powered creative writing',
          'Multiple genres and styles',
          'Chapter management for books',
          'Try Creative Writing Assistant Now',
          'Start creating creative content',
          'Go to Creative Writing Assistant'
        ];

        const { translationService } = await import('../../services/translationService');
        const translatedTexts = await translationService.translateBatch(allTexts, language, 'Creative Writing Feature page');
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
      <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-b border-gray-800">
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
              <PencilIcon className="h-12 w-12 text-purple-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {translations['Creative Writing Assistant'] || 'Creative Writing Assistant'}
              </h1>
              <p className="text-xl text-gray-300">
                {translations['Generate creative content including stories, books, poems, and screenplays with AI'] || 
                 'Generate creative content including stories, books, poems, and screenplays with AI'}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link
              to="/creative-writing"
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
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
        <section className="mb-16 bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-2xl p-8 border border-purple-500/20">
          <h2 className="text-3xl font-bold text-white mb-6">
            {translations['Why Choose Creative Writing Assistant?'] || 'Why Choose Creative Writing Assistant?'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Creativity</h3>
              <p className="text-gray-300">
                {translations['AI-powered creative writing'] || 
                 'AI-powered creative writing'}
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Variety</h3>
              <p className="text-gray-300">
                {translations['Multiple genres and styles'] || 
                 'Multiple genres and styles'}
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Structure</h3>
              <p className="text-gray-300">
                {translations['Chapter management for books'] || 
                 'Chapter management for books'}
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-gray-800/50 rounded-2xl p-12 border border-gray-700">
          <h2 className="text-3xl font-bold text-white mb-4">
            {translations['Try Creative Writing Assistant Now'] || 'Try Creative Writing Assistant Now'}
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            {translations['Start creating creative content'] || 
             'Start creating creative content'}
          </p>
          <Link
            to="/creative-writing"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold text-lg transition-all"
          >
            {translations['Go to Creative Writing Assistant'] || 'Go to Creative Writing Assistant'}
          </Link>
        </section>
      </div>
    </div>
  );
};

export default CreativeWritingFeature;

