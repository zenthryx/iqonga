import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  PhotoIcon,
  SparklesIcon,
  PaintBrushIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const AIImageEditorFeature: React.FC = () => {
  const { t, language } = useLanguage();
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const features = [
    {
      title: 'AI Background Removal',
      description: 'Remove backgrounds from images with AI precision',
      icon: '🎯',
      credits: '~50 credits',
      details: [
        'Automatic subject detection',
        'Clean background removal',
        'Transparent PNG output',
        'High-quality results'
      ]
    },
    {
      title: 'AI Object Removal',
      description: 'Select and remove unwanted objects from images',
      icon: '✂️',
      credits: '~50 credits',
      details: [
        'Canvas-based area selection',
        'Precise object removal',
        'Natural inpainting',
        'Maintains image quality'
      ]
    },
    {
      title: 'AI Smart Filters',
      description: 'Apply professional style filters with AI',
      icon: '🎨',
      credits: '~30 credits',
      details: [
        'Vintage, Cinematic, Bold, Soft styles',
        'AI-enhanced filter application',
        'Maintains image quality',
        'Multiple style options'
      ]
    },
    {
      title: 'AI Image Upscaling',
      description: 'Enhance image resolution with AI upscaling',
      icon: '⬆️',
      credits: '~40 credits',
      details: [
        '2x, 3x, 4x upscaling options',
        'AI-enhanced detail recovery',
        'Reduced artifacts',
        'Improved sharpness'
      ]
    },
    {
      title: 'AI Retouching',
      description: 'Professional photo retouching with AI',
      icon: '✨',
      credits: '~60-80 credits',
      details: [
        'Skin smoothing',
        'Blemish removal',
        'Eye enhancement',
        'Teeth whitening',
        'Hair enhancement'
      ]
    },
    {
      title: 'AI Style Learning',
      description: 'AI learns your editing preferences',
      icon: '🧠',
      credits: '~100 credits',
      details: [
        'Learn from editing history',
        'Create style profiles',
        'Apply learned styles to new images',
        'Personalized editing experience'
      ]
    },
    {
      title: 'AI Logo Maker',
      description: 'Generate professional logos with AI',
      icon: '🎭',
      credits: '~150 credits',
      details: [
        'Text-to-logo generation',
        '8 style options (Modern, Classic, Minimalist, etc.)',
        '4 shape options (Square, Wide, Tall, Circle)',
        'High-quality logo output',
        'No image required to start'
      ]
    }
  ];

  const basicTools = [
    {
      title: 'Filters',
      description: 'Brightness, contrast, saturation, blur, grayscale, sepia'
    },
    {
      title: 'Resize',
      description: 'Adjust image dimensions with various fit options'
    },
    {
      title: 'Crop',
      description: 'Crop images to desired size and aspect ratio'
    },
    {
      title: 'Text Overlay',
      description: 'Add customizable text with fonts, colors, and positioning'
    },
    {
      title: 'Logo Overlay',
      description: 'Add company logos to images with positioning controls'
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
          'AI Image Editor',
          'Professional AI-powered image editing with advanced capabilities',
          'Get Started',
          'AI Tools',
          'Powerful AI-powered editing capabilities',
          'Basic Tools',
          'Traditional image editing tools',
          'Key Features',
          'Why Choose AI Image Editor?',
          'Access from Media Library or Image Editor page',
          'Select existing images or create new logos',
          'Real-time preview of edits',
          'Save edited images to Media Library',
          'All edits are stored in your Media Library for future use',
          'Try AI Image Editor Now',
          'Start editing your images with AI-powered tools',
          'Go to Image Editor'
        ];

        const { translationService } = await import('../../services/translationService');
        const translatedTexts = await translationService.translateBatch(allTexts, language, 'AI Image Editor Feature page');
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
              <PhotoIcon className="h-12 w-12 text-purple-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {translations['AI Image Editor'] || 'AI Image Editor'}
              </h1>
              <p className="text-xl text-gray-300">
                {translations['Professional AI-powered image editing with advanced capabilities'] || 
                 'Professional AI-powered image editing with advanced capabilities'}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link
              to="/image-editor"
              className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              {translations['Get Started'] || 'Get Started'}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* AI Tools Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
            <SparklesIcon className="h-8 w-8 text-purple-400" />
            {translations['AI Tools'] || 'AI Tools'}
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            {translations['Powerful AI-powered editing capabilities'] || 
             'Powerful AI-powered editing capabilities'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 transition-all"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 mb-4 text-sm">{feature.description}</p>
                <div className="mb-4">
                  <span className="text-xs text-purple-400 font-semibold">{feature.credits}</span>
                </div>
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

        {/* Basic Tools Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
            <PaintBrushIcon className="h-8 w-8 text-blue-400" />
            {translations['Basic Tools'] || 'Basic Tools'}
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            {translations['Traditional image editing tools'] || 
             'Traditional image editing tools'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {basicTools.map((tool, index) => (
              <div
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-2">{tool.title}</h3>
                <p className="text-gray-400 text-sm">{tool.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="mb-16 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-2xl p-8 border border-purple-500/20">
          <h2 className="text-3xl font-bold text-white mb-6">
            {translations['Why Choose AI Image Editor?'] || 'Why Choose AI Image Editor?'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Accessibility</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{translations['Access from Media Library or Image Editor page'] || 
                          'Access from Media Library or Image Editor page'}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{translations['Select existing images or create new logos'] || 
                          'Select existing images or create new logos'}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{translations['Real-time preview of edits'] || 
                          'Real-time preview of edits'}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{translations['Save edited images to Media Library'] || 
                          'Save edited images to Media Library'}</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Integration</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{translations['All edits are stored in your Media Library for future use'] || 
                          'All edits are stored in your Media Library for future use'}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Use edited images in Smart Ad Generator</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Use edited images in Smart Campaign Generator</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Seamless workflow integration</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-gray-800/50 rounded-2xl p-12 border border-gray-700">
          <h2 className="text-3xl font-bold text-white mb-4">
            {translations['Try AI Image Editor Now'] || 'Try AI Image Editor Now'}
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            {translations['Start editing your images with AI-powered tools'] || 
             'Start editing your images with AI-powered tools'}
          </p>
          <Link
            to="/image-editor"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold text-lg transition-all"
          >
            {translations['Go to Image Editor'] || 'Go to Image Editor'}
          </Link>
        </section>
      </div>
    </div>
  );
};

export default AIImageEditorFeature;

