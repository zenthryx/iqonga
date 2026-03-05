import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, Users, BarChart3, MessageSquare, Zap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const WordPressWooCommerce: React.FC = () => {
  const { t, language } = useLanguage();
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [featuresTranslated, setFeaturesTranslated] = useState<any[]>([]);
  const [useCasesTranslated, setUseCasesTranslated] = useState<any[]>([]);

  const featuresBase = [
    {
      icon: ShoppingCart,
      title: 'Product Knowledge Integration',
      description: 'Your AI agent automatically learns about your WooCommerce products, including descriptions, prices, categories, and inventory status.',
      color: 'blue'
    },
    {
      icon: MessageSquare,
      title: 'Intelligent Customer Support',
      description: 'AI-powered chat that answers product questions, provides recommendations, and helps customers find what they need.',
      color: 'green'
    },
    {
      icon: Package,
      title: 'Order Management',
      description: 'Customers can check order status, track shipments, and get updates on their purchases directly through the chat interface.',
      color: 'purple'
    },
    {
      icon: Users,
      title: 'Customer Insights',
      description: 'Track customer interactions, preferences, and frequently asked questions to improve your product offerings.',
      color: 'orange'
    },
    {
      icon: BarChart3,
      title: 'Sales Analytics',
      description: 'Get insights into how the AI agent influences sales, conversion rates, and customer engagement.',
      color: 'cyan'
    },
    {
      icon: Zap,
      title: 'Automated Recommendations',
      description: 'AI-powered product recommendations based on customer queries, browsing behavior, and purchase history.',
      color: 'yellow'
    }
  ];

  const useCasesBase = [
    {
      title: 'Product Discovery',
      description: 'Help customers find products by describing what they need in natural language. The AI understands context and suggests relevant items.',
      example: 'Customer: "I need a gift for my mom who loves gardening"\nAI: "Based on your description, here are some great gardening products..."'
    },
    {
      title: 'Order Assistance',
      description: 'Customers can ask about order status, shipping information, and return policies without leaving the chat.',
      example: 'Customer: "Where is my order #12345?"\nAI: "Your order is currently in transit and expected to arrive..."'
    },
    {
      title: 'Product Recommendations',
      description: 'Intelligent cross-selling and upselling based on customer needs and preferences.',
      example: 'Customer: "I\'m looking at this laptop"\nAI: "This laptop pairs well with these accessories..."'
    },
    {
      title: 'Inventory Queries',
      description: 'Real-time inventory checking and availability notifications for out-of-stock items.',
      example: 'Customer: "Is this product in stock?"\nAI: "Yes, we have 5 units available. Would you like to add it to your cart?"'
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: string } = {
      blue: 'border-blue-500/50 bg-blue-500/5',
      green: 'border-green-500/50 bg-green-500/5',
      purple: 'border-purple-500/50 bg-purple-500/5',
      orange: 'border-orange-500/50 bg-orange-500/5',
      cyan: 'border-cyan-500/50 bg-cyan-500/5',
      yellow: 'border-yellow-500/50 bg-yellow-500/5'
    };
    return colorMap[color] || 'border-gray-500/50 bg-gray-500/5';
  };

  const getIconColor = (color: string) => {
    const colorMap: { [key: string]: string } = {
      blue: 'text-blue-400',
      green: 'text-green-400',
      purple: 'text-purple-400',
      orange: 'text-orange-400',
      cyan: 'text-cyan-400',
      yellow: 'text-yellow-400'
    };
    return colorMap[color] || 'text-gray-400';
  };

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      if (language === 'en') {
        setTranslations({});
        setFeaturesTranslated(featuresBase);
        setUseCasesTranslated(useCasesBase);
        return;
      }

      try {
        // Collect all texts that need translation
        const allTexts: string[] = [];

        // Hero section texts
        const heroTexts = [
          'WordPress Plugin',
          'WooCommerce Integration',
          'Enhance your WooCommerce store with AI-powered customer support, product recommendations, and intelligent order management.',
          'Get WordPress Plugin',
          'View Documentation',
          'WooCommerce Features',
          'Powerful AI capabilities specifically designed for e-commerce stores',
          'Use Cases',
          'See how AI agents can transform your WooCommerce store',
          'Setup Instructions',
          'Install WordPress Plugin',
          'First, install the Iqonga WordPress Plugin from the',
          'WordPress Plugin page',
          'Enable WooCommerce Integration',
          'Go to WordPress Admin → Iqonga → Settings',
          'Navigate to the "Integrations" tab',
          'Enable "WooCommerce Integration"',
          'Configure product sync settings',
          'Configure Product Knowledge',
          'The AI agent will automatically sync with your WooCommerce products. You can customize which product information to include:',
          'Product descriptions and details',
          'Pricing and availability',
          'Product categories and tags',
          'Customer reviews and ratings',
          'Related products',
          'Customize AI Behavior',
          'Configure how your AI agent interacts with customers:',
          'Set conversation tone and style',
          'Enable/disable order management features',
          'Configure product recommendation settings',
          'Set up automated responses for common queries',
          'Benefits',
          'Why integrate AI agents with your WooCommerce store?',
          'Increased Sales',
          'AI-powered recommendations and instant customer support lead to higher conversion rates and average order values.',
          '24/7 Support',
          'Provide instant customer support around the clock without hiring additional staff or paying for expensive support services.',
          'Better Customer Experience',
          'Customers get immediate answers to their questions, personalized recommendations, and seamless order tracking.',
          'Ready to Enhance Your WooCommerce Store?',
          'Get started with the Iqonga WordPress Plugin and transform your e-commerce customer experience.',
          'Download Plugin',
          'Create AI Agent'
        ];
        heroTexts.forEach(text => {
          if (!allTexts.includes(text)) allTexts.push(text);
        });

        // Feature texts
        featuresBase.forEach(feature => {
          if (!allTexts.includes(feature.title)) allTexts.push(feature.title);
          if (!allTexts.includes(feature.description)) allTexts.push(feature.description);
        });

        // Use case texts
        useCasesBase.forEach(useCase => {
          if (!allTexts.includes(useCase.title)) allTexts.push(useCase.title);
          if (!allTexts.includes(useCase.description)) allTexts.push(useCase.description);
        });

        // Batch translate ALL texts at once
        const { translationService } = await import('../services/translationService');
        const translatedTexts = await translationService.translateBatch(allTexts, language, 'WordPress WooCommerce page');

        // Build translation map
        const trans: Record<string, string> = {};
        allTexts.forEach((text, i) => {
          trans[text] = translatedTexts[i];
        });
        setTranslations(trans);

        // Reconstruct features with translations
        const featuresTrans = featuresBase.map(feature => ({
          ...feature,
          title: trans[feature.title] || feature.title,
          description: trans[feature.description] || feature.description
        }));

        // Reconstruct use cases with translations
        const useCasesTrans = useCasesBase.map(useCase => ({
          ...useCase,
          title: trans[useCase.title] || useCase.title,
          description: trans[useCase.description] || useCase.description
        }));

        setFeaturesTranslated(featuresTrans);
        setUseCasesTranslated(useCasesTrans);
      } catch (error) {
        console.error('Translation error:', error);
        setFeaturesTranslated(featuresBase);
        setUseCasesTranslated(useCasesBase);
      }
    };

    loadTranslations();
  }, [language, t]);

  const features = featuresTranslated.length > 0 ? featuresTranslated : featuresBase;
  const useCases = useCasesTranslated.length > 0 ? useCasesTranslated : useCasesBase;

  return (
    <>
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            {translations['WordPress Plugin'] || 'WordPress Plugin'}
            <span className="text-green-400 block">{translations['WooCommerce Integration'] || 'WooCommerce Integration'}</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            {translations['Enhance your WooCommerce store with AI-powered customer support, product recommendations, and intelligent order management.'] || 
             'Enhance your WooCommerce store with AI-powered customer support, product recommendations, and intelligent order management.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/wordpress-plugin"
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              {translations['Get WordPress Plugin'] || 'Get WordPress Plugin'}
            </Link>
            <Link
              to="/wordpress-plugin-docs"
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              {translations['View Documentation'] || 'View Documentation'}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">{translations['WooCommerce Features'] || 'WooCommerce Features'}</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {translations['Powerful AI capabilities specifically designed for e-commerce stores'] || 
               'Powerful AI capabilities specifically designed for e-commerce stores'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={index}
                  className={`glass-card p-8 border ${getColorClasses(feature.color)} hover:scale-105 transition-transform duration-300`}
                >
                  <div className="mb-6">
                    <div className={`${getIconColor(feature.color)} mb-4`}>
                      <IconComponent className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">{translations['Use Cases'] || 'Use Cases'}</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {translations['See how AI agents can transform your WooCommerce store'] || 
               'See how AI agents can transform your WooCommerce store'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="glass-card p-8">
                <h3 className="text-xl font-bold text-white mb-4">
                  {useCase.title}
                </h3>
                <p className="text-gray-400 mb-4">
                  {useCase.description}
                </p>
                <div className="bg-gray-800/50 rounded-lg p-4 mt-4">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                    {useCase.example}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Setup Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card p-8">
            <h2 className="text-3xl font-bold text-white mb-6">{translations['Setup Instructions'] || 'Setup Instructions'}</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">1. {translations['Install WordPress Plugin'] || 'Install WordPress Plugin'}</h3>
                <p className="text-gray-300 mb-4">
                  {translations['First, install the Iqonga WordPress Plugin from the'] || 'First, install the Iqonga WordPress Plugin from the'}{' '}
                  <Link to="/wordpress-plugin" className="text-blue-400 hover:text-blue-300 underline">
                    {translations['WordPress Plugin page'] || 'WordPress Plugin page'}
                  </Link>.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-4">2. {translations['Enable WooCommerce Integration'] || 'Enable WooCommerce Integration'}</h3>
                <ol className="list-decimal list-inside text-gray-300 space-y-2 ml-4">
                  <li>{translations['Go to WordPress Admin → Iqonga → Settings'] || 'Go to WordPress Admin → Iqonga → Settings'}</li>
                  <li>{translations['Navigate to the "Integrations" tab'] || 'Navigate to the "Integrations" tab'}</li>
                  <li>{translations['Enable "WooCommerce Integration"'] || 'Enable "WooCommerce Integration"'}</li>
                  <li>{translations['Configure product sync settings'] || 'Configure product sync settings'}</li>
                </ol>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-4">3. {translations['Configure Product Knowledge'] || 'Configure Product Knowledge'}</h3>
                <p className="text-gray-300 mb-4">
                  {translations['The AI agent will automatically sync with your WooCommerce products. You can customize which product information to include:'] || 
                   'The AI agent will automatically sync with your WooCommerce products. You can customize which product information to include:'}
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>{translations['Product descriptions and details'] || 'Product descriptions and details'}</li>
                  <li>{translations['Pricing and availability'] || 'Pricing and availability'}</li>
                  <li>{translations['Product categories and tags'] || 'Product categories and tags'}</li>
                  <li>{translations['Customer reviews and ratings'] || 'Customer reviews and ratings'}</li>
                  <li>{translations['Related products'] || 'Related products'}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-4">4. {translations['Customize AI Behavior'] || 'Customize AI Behavior'}</h3>
                <p className="text-gray-300 mb-4">
                  {translations['Configure how your AI agent interacts with customers:'] || 
                   'Configure how your AI agent interacts with customers:'}
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>{translations['Set conversation tone and style'] || 'Set conversation tone and style'}</li>
                  <li>{translations['Enable/disable order management features'] || 'Enable/disable order management features'}</li>
                  <li>{translations['Configure product recommendation settings'] || 'Configure product recommendation settings'}</li>
                  <li>{translations['Set up automated responses for common queries'] || 'Set up automated responses for common queries'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">{translations['Benefits'] || 'Benefits'}</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {translations['Why integrate AI agents with your WooCommerce store?'] || 
               'Why integrate AI agents with your WooCommerce store?'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-6 text-center">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-bold text-white mb-3">{translations['Increased Sales'] || 'Increased Sales'}</h3>
              <p className="text-gray-400">
                {translations['AI-powered recommendations and instant customer support lead to higher conversion rates and average order values.'] || 
                 'AI-powered recommendations and instant customer support lead to higher conversion rates and average order values.'}
              </p>
            </div>

            <div className="glass-card p-6 text-center">
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="text-xl font-bold text-white mb-3">{translations['24/7 Support'] || '24/7 Support'}</h3>
              <p className="text-gray-400">
                {translations['Provide instant customer support around the clock without hiring additional staff or paying for expensive support services.'] || 
                 'Provide instant customer support around the clock without hiring additional staff or paying for expensive support services.'}
              </p>
            </div>

            <div className="glass-card p-6 text-center">
              <div className="text-4xl mb-4">💡</div>
              <h3 className="text-xl font-bold text-white mb-3">{translations['Better Customer Experience'] || 'Better Customer Experience'}</h3>
              <p className="text-gray-400">
                {translations['Customers get immediate answers to their questions, personalized recommendations, and seamless order tracking.'] || 
                 'Customers get immediate answers to their questions, personalized recommendations, and seamless order tracking.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-900/20 to-green-900/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            {translations['Ready to Enhance Your WooCommerce Store?'] || 'Ready to Enhance Your WooCommerce Store?'}
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            {translations['Get started with the Iqonga WordPress Plugin and transform your e-commerce customer experience.'] || 
             'Get started with the Iqonga WordPress Plugin and transform your e-commerce customer experience.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/wordpress-plugin"
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              {translations['Download Plugin'] || 'Download Plugin'}
            </Link>
            <Link
              to="/dashboard"
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              {translations['Create AI Agent'] || 'Create AI Agent'}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default WordPressWooCommerce;

