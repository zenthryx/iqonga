import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  CalendarDaysIcon,
  SparklesIcon,
  ChartBarIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const SmartCampaignGeneratorFeature: React.FC = () => {
  const { t, language } = useLanguage();
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const features = [
    {
      title: 'Campaign Strategy',
      description: 'AI-generated comprehensive campaign strategy',
      icon: <SparklesIcon className="h-8 w-8" />,
      details: [
        'Goal-based strategy generation',
        'Target audience analysis',
        'Platform recommendations',
        'Content themes and messaging'
      ]
    },
    {
      title: 'Content Calendar',
      description: 'Automated content calendar creation',
      icon: <CalendarDaysIcon className="h-8 w-8" />,
      details: [
        'Optimal posting schedule',
        'Platform-specific timing',
        'Content themes per post',
        'Editable calendar entries'
      ]
    },
    {
      title: 'Automated Ad Generation',
      description: 'Generate ads for each scheduled post',
      icon: <ArrowPathIcon className="h-8 w-8" />,
      details: [
        'Brand-consistent ads',
        'Platform-specific formats',
        'Multiple variants',
        'Automatic generation'
      ]
    },
    {
      title: 'Campaign Management',
      description: 'Edit, pause, and manage campaigns',
      icon: <ChartBarIcon className="h-8 w-8" />,
      details: [
        'View all campaigns',
        'Edit strategy and calendar',
        'Pause and resume',
        'Performance tracking'
      ]
    }
  ];

  useEffect(() => {
    const loadTranslations = async () => {
      if (language === 'en') {
        setTranslations({});
        return;
      }

      try {
        const allTexts = [
          'Smart Campaign Generator',
          'AI-driven campaign strategy, content calendar, and automated ad generation',
          'Get Started',
          'Key Features',
          'Why Choose Smart Campaign Generator?',
          'Complete campaign automation',
          'AI-powered strategy and planning',
          'Brand consistency across all content',
          'Try Smart Campaign Generator Now',
          'Start creating comprehensive marketing campaigns',
          'Go to Smart Campaign Generator'
        ];

        const { translationService } = await import('../../services/translationService');
        const translatedTexts = await translationService.translateBatch(allTexts, language, 'Smart Campaign Generator Feature page');
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
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            to="/features"
            className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Features
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-500/20 p-4 rounded-xl">
              <CalendarDaysIcon className="h-12 w-12 text-blue-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {translations['Smart Campaign Generator'] || 'Smart Campaign Generator'}
              </h1>
              <p className="text-xl text-gray-300">
                {translations['AI-driven campaign strategy, content calendar, and automated ad generation'] || 
                 'AI-driven campaign strategy, content calendar, and automated ad generation'}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link
              to="/smart-campaigns"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              {translations['Get Started'] || 'Get Started'}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Features Grid */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">
            {translations['Key Features'] || 'Key Features'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all"
              >
                <div className="text-blue-400 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start">
                      <CheckCircleIcon className="h-4 w-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow Section */}
        <section className="mb-16 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl p-8 border border-blue-500/20">
          <h2 className="text-3xl font-bold text-white mb-6">How It Works</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-500/20 p-3 rounded-lg flex-shrink-0">
                <span className="text-2xl font-bold text-blue-400">1</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Create Campaign</h3>
                <p className="text-gray-300">
                  Enter campaign details, goals, and duration. AI generates a comprehensive strategy.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-blue-500/20 p-3 rounded-lg flex-shrink-0">
                <span className="text-2xl font-bold text-blue-400">2</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Review Calendar</h3>
                <p className="text-gray-300">
                  Review and edit the generated content calendar with optimal posting times.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-blue-500/20 p-3 rounded-lg flex-shrink-0">
                <span className="text-2xl font-bold text-blue-400">3</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Generate Ads</h3>
                <p className="text-gray-300">
                  Automatically generate ads for each scheduled post with brand consistency.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-blue-500/20 p-3 rounded-lg flex-shrink-0">
                <span className="text-2xl font-bold text-blue-400">4</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Schedule & Track</h3>
                <p className="text-gray-300">
                  Schedule posts directly to platforms and track campaign performance.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="mb-16 bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
          <h2 className="text-3xl font-bold text-white mb-6">
            {translations['Why Choose Smart Campaign Generator?'] || 'Why Choose Smart Campaign Generator?'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Automation</h3>
              <p className="text-gray-300">
                {translations['Complete campaign automation'] || 
                 'Complete campaign automation'}
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Intelligence</h3>
              <p className="text-gray-300">
                {translations['AI-powered strategy and planning'] || 
                 'AI-powered strategy and planning'}
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Consistency</h3>
              <p className="text-gray-300">
                {translations['Brand consistency across all content'] || 
                 'Brand consistency across all content'}
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-gray-800/50 rounded-2xl p-12 border border-gray-700">
          <h2 className="text-3xl font-bold text-white mb-4">
            {translations['Try Smart Campaign Generator Now'] || 'Try Smart Campaign Generator Now'}
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            {translations['Start creating comprehensive marketing campaigns'] || 
             'Start creating comprehensive marketing campaigns'}
          </p>
          <Link
            to="/smart-campaigns"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold text-lg transition-all"
          >
            {translations['Go to Smart Campaign Generator'] || 'Go to Smart Campaign Generator'}
          </Link>
        </section>
      </div>
    </div>
  );
};

export default SmartCampaignGeneratorFeature;

