import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const WordPressPlugin: React.FC = () => {
  const { t, language } = useLanguage();
  const [translations, setTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadTranslations = async () => {
      if (language === 'en') {
        setTranslations({});
        return;
      }

      try {
        const allTexts = [
          'WordPress',
          'Plugin',
          'Deploy AI-powered voice-enabled chatbots on your WordPress website with our easy-to-install plugin.',
          'Download Iqonga WordPress Plugin',
          'Features',
          'AI-powered chat functionality',
          'Voice chat with speech-to-text and text-to-speech',
          'Easy WordPress admin integration',
          'Customizable widget appearance',
          'Analytics and conversation tracking',
          'Mobile responsive design',
          'AI content generation (text, images, videos)',
          'Music and lyrics generation',
          'Avatar video creation with HeyGen',
          'WooCommerce integration for e-commerce sites',
          'Company knowledge base integration',
          'Multi-agent support',
          'Requirements',
          'WordPress 5.0 or higher',
          'PHP 7.4 or higher',
          'Iqonga account and API key',
          'Modern browser with microphone support',
          'Download Plugin (v1.0.0)',
          'View Documentation',
          'WooCommerce Integration',
          'Installation Guide',
          'Method 1: WordPress Admin',
          'Download the plugin ZIP file',
          'Go to WordPress Admin → Plugins → Add New',
          'Click "Upload Plugin" and select the ZIP file',
          'Click "Install Now" and then "Activate"',
          'Configure your API key in Iqonga → Settings',
          'Method 2: Manual Upload',
          'Download and extract the plugin ZIP file',
          'Upload the folder to',
          'Find "Iqonga AI Agent" and click "Activate"'
        ];

        const { translationService } = await import('../services/translationService');
        const translatedTexts = await translationService.translateBatch(allTexts, language, 'WordPress Plugin page');
        
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
    <>
      <section className="py-20 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            {translations['WordPress'] || 'WordPress'}
            <span className="text-green-400 block">{translations['Plugin'] || 'Plugin'}</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            {translations['Deploy AI-powered voice-enabled chatbots on your WordPress website with our easy-to-install plugin.'] || 
             'Deploy AI-powered voice-enabled chatbots on your WordPress website with our easy-to-install plugin.'}
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card p-8">
            <h2 className="text-3xl font-bold text-white mb-6">{translations['Download Ajentrix WordPress Plugin'] || 'Download Ajentrix WordPress Plugin'}</h2>
            
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">{translations['Features'] || 'Features'}</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>{translations['AI-powered chat functionality'] || 'AI-powered chat functionality'}</li>
                <li>{translations['Voice chat with speech-to-text and text-to-speech'] || 'Voice chat with speech-to-text and text-to-speech'}</li>
                <li>{translations['Easy WordPress admin integration'] || 'Easy WordPress admin integration'}</li>
                <li>{translations['Customizable widget appearance'] || 'Customizable widget appearance'}</li>
                <li>{translations['Analytics and conversation tracking'] || 'Analytics and conversation tracking'}</li>
                <li>{translations['Mobile responsive design'] || 'Mobile responsive design'}</li>
                <li>{translations['AI content generation (text, images, videos)'] || 'AI content generation (text, images, videos)'}</li>
                <li>{translations['Music and lyrics generation'] || 'Music and lyrics generation'}</li>
                <li>{translations['Avatar video creation with HeyGen'] || 'Avatar video creation with HeyGen'}</li>
                <li>{translations['WooCommerce integration for e-commerce sites'] || 'WooCommerce integration for e-commerce sites'}</li>
                <li>{translations['Company knowledge base integration'] || 'Company knowledge base integration'}</li>
                <li>{translations['Multi-agent support'] || 'Multi-agent support'}</li>
              </ul>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">{translations['Requirements'] || 'Requirements'}</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>{translations['WordPress 5.0 or higher'] || 'WordPress 5.0 or higher'}</li>
                <li>{translations['PHP 7.4 or higher'] || 'PHP 7.4 or higher'}</li>
                <li>{translations['Ajentrix account and API key'] || 'Ajentrix account and API key'}</li>
                <li>{translations['Modern browser with microphone support'] || 'Modern browser with microphone support'}</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/downloads/ajentrix-ai-agent.zip"
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors text-center"
                download
              >
                {translations['Download Plugin (v1.0.0)'] || 'Download Plugin (v1.0.0)'}
              </a>
              <a
                href="/wordpress-plugin-docs"
                className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors text-center"
              >
                {translations['View Documentation'] || 'View Documentation'}
              </a>
              <a
                href="/wordpress-plugin/woocommerce"
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors text-center"
              >
                {translations['WooCommerce Integration'] || 'WooCommerce Integration'}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-800/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">{translations['Installation Guide'] || 'Installation Guide'}</h2>
         
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">{translations['Method 1: WordPress Admin'] || 'Method 1: WordPress Admin'}</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-2">
                <li>{translations['Download the plugin ZIP file'] || 'Download the plugin ZIP file'}</li>
                <li>{translations['Go to WordPress Admin → Plugins → Add New'] || 'Go to WordPress Admin → Plugins → Add New'}</li>
                <li>{translations['Click "Upload Plugin" and select the ZIP file'] || 'Click "Upload Plugin" and select the ZIP file'}</li>
                <li>{translations['Click "Install Now" and then "Activate"'] || 'Click "Install Now" and then "Activate"'}</li>
                <li>{translations['Configure your API key in Ajentrix → Settings'] || 'Configure your API key in Ajentrix → Settings'}</li>
              </ol>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">{translations['Method 2: Manual Upload'] || 'Method 2: Manual Upload'}</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-2">
                <li>{translations['Download and extract the plugin ZIP file'] || 'Download and extract the plugin ZIP file'}</li>
                <li>{translations['Upload the folder to'] || 'Upload the folder to'} <code>/wp-content/plugins/</code></li>
                <li>{translations['Go to WordPress Admin → Plugins'] || 'Go to WordPress Admin → Plugins'}</li>
                <li>{translations['Find "Ajentrix AI Agent" and click "Activate"'] || 'Find "Ajentrix AI Agent" and click "Activate"'}</li>
                <li>{translations['Configure your API key in Ajentrix → Settings'] || 'Configure your API key in Ajentrix → Settings'}</li>
              </ol>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default WordPressPlugin;          