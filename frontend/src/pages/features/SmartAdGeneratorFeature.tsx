import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  MegaphoneIcon,
  SparklesIcon,
  PhotoIcon,
  VideoCameraIcon,
  ShoppingBagIcon,
  PaintBrushIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const SmartAdGeneratorFeature: React.FC = () => {
  const { t, language } = useLanguage();
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const features = [
    {
      title: 'Multi-Platform Support',
      description: 'Generate ads for Facebook, Instagram, Twitter, and LinkedIn',
      icon: <MegaphoneIcon className="h-8 w-8" />,
      details: [
        'Platform-specific aspect ratios',
        'Optimized ad formats',
        'Preview mockups for each platform',
        'Direct scheduling to platforms'
      ]
    },
    {
      title: 'Multiple Image Providers',
      description: 'Choose from DALL-E, Gemini, or Stability AI',
      icon: <PhotoIcon className="h-8 w-8" />,
      details: [
        'DALL-E 3 for high-quality images',
        'Google Gemini (Imagen) for alternative styles',
        'Stability AI (SD3) for creative options',
        'Automatic fallback if provider fails'
      ]
    },
    {
      title: 'Video Generation',
      description: 'Create video ads with Runway, Veo, or Pika',
      icon: <VideoCameraIcon className="h-8 w-8" />,
      details: [
        'Text-to-video generation',
        'Scene extension',
        'Multiple video providers',
        'Platform-optimized video formats'
      ]
    },
    {
      title: 'UGC Avatar Videos',
      description: 'Create testimonial videos with HeyGen avatars',
      icon: <SparklesIcon className="h-8 w-8" />,
      details: [
        'AI avatar testimonial videos',
        'Custom scripts',
        'Multiple avatar options',
        'Status polling and updates'
      ]
    },
    {
      title: 'Product Catalog Integration',
      description: 'Import products from Shopify or WooCommerce',
      icon: <ShoppingBagIcon className="h-8 w-8" />,
      details: [
        'Shopify product sync',
        'WooCommerce integration',
        'Product image import',
        'Service-based business support'
      ]
    },
    {
      title: 'Brand Kit Integration',
      description: 'Use your brand colors, fonts, and logos',
      icon: <PaintBrushIcon className="h-8 w-8" />,
      details: [
        'Brand color integration',
        'Custom fonts',
        'Logo overlay',
        'Brand consistency'
      ]
    },
    {
      title: 'Text Overlay Editor',
      description: 'Add and customize text on ad images',
      icon: <SparklesIcon className="h-8 w-8" />,
      details: [
        'Customizable text styling',
        'Text presets',
        'Logo overlay',
        'Undo/redo functionality'
      ]
    },
    {
      title: 'Advanced Features',
      description: 'Regenerate, translate, and export ads',
      icon: <ArrowPathIcon className="h-8 w-8" />,
      details: [
        'Regenerate image only',
        'Regenerate copy only',
        'Multi-language translation',
        'Export as ZIP files'
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
          'Smart Ad Generator',
          'AI-driven ad creation with multi-platform support and brand integration',
          'Get Started',
          'Key Features',
          'Why Choose Smart Ad Generator?',
          'Generate professional ads in minutes',
          'Multi-platform support for maximum reach',
          'Brand consistency across all ads',
          'Variant-based pricing for cost efficiency',
          'Try Smart Ad Generator Now',
          'Start creating AI-powered ads for your campaigns',
          'Go to Smart Ad Generator'
        ];

        const { translationService } = await import('../../services/translationService');
        const translatedTexts = await translationService.translateBatch(allTexts, language, 'Smart Ad Generator Feature page');
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
      <div className="bg-gradient-to-r from-orange-900/20 to-purple-900/20 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            to="/features"
            className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Features
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-orange-500/20 p-4 rounded-xl">
              <MegaphoneIcon className="h-12 w-12 text-orange-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {translations['Smart Ad Generator'] || 'Smart Ad Generator'}
              </h1>
              <p className="text-xl text-gray-300">
                {translations['AI-driven ad creation with multi-platform support and brand integration'] || 
                 'AI-driven ad creation with multi-platform support and brand integration'}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link
              to="/smart-ads"
              className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-orange-500/50 transition-all"
              >
                <div className="text-orange-400 mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 mb-4 text-sm">{feature.description}</p>
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

        {/* Why Choose Section */}
        <section className="mb-16 bg-gradient-to-r from-orange-900/20 to-purple-900/20 rounded-2xl p-8 border border-orange-500/20">
          <h2 className="text-3xl font-bold text-white mb-6">
            {translations['Why Choose Smart Ad Generator?'] || 'Why Choose Smart Ad Generator?'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Speed</h3>
              <p className="text-gray-300">
                {translations['Generate professional ads in minutes'] || 
                 'Generate professional ads in minutes'}
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Reach</h3>
              <p className="text-gray-300">
                {translations['Multi-platform support for maximum reach'] || 
                 'Multi-platform support for maximum reach'}
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Consistency</h3>
              <p className="text-gray-300">
                {translations['Brand consistency across all ads'] || 
                 'Brand consistency across all ads'}
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Note */}
        <section className="mb-16 bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Pricing</h3>
          <p className="text-gray-300 mb-4">
            {translations['Variant-based pricing for cost efficiency'] || 
             'Variant-based pricing for cost efficiency'}
          </p>
          <ul className="space-y-2 text-gray-300">
            <li>• Pay per platform, per variant</li>
            <li>• Additional costs for video and UGC</li>
            <li>• See <Link to="/pricing" className="text-orange-400 hover:text-orange-300 underline">Pricing page</Link> for current rates</li>
          </ul>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-gray-800/50 rounded-2xl p-12 border border-gray-700">
          <h2 className="text-3xl font-bold text-white mb-4">
            {translations['Try Smart Ad Generator Now'] || 'Try Smart Ad Generator Now'}
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            {translations['Start creating AI-powered ads for your campaigns'] || 
             'Start creating AI-powered ads for your campaigns'}
          </p>
          <Link
            to="/smart-ads"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-orange-600 to-purple-600 hover:from-orange-700 hover:to-purple-700 text-white rounded-lg font-semibold text-lg transition-all"
          >
            {translations['Go to Smart Ad Generator'] || 'Go to Smart Ad Generator'}
          </Link>
        </section>
      </div>
    </div>
  );
};

export default SmartAdGeneratorFeature;

