import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Mail, 
  Brain, 
  Sparkles, 
  Shield, 
  Zap, 
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Tag,
  AlertTriangle,
  FileText,
  Send,
  Forward,
  Trash2,
  PenSquare
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const SmartInboxProduct: React.FC = () => {
  const { t, language } = useLanguage();
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [featuresTranslated, setFeaturesTranslated] = useState<any[]>([]);
  const [useCasesTranslated, setUseCasesTranslated] = useState<any[]>([]);
  const [howItWorksTranslated, setHowItWorksTranslated] = useState<any[]>([]);

  const featuresBase = [
    {
      icon: Brain,
      title: 'AI Draft Replies',
      description: 'Generate intelligent email responses in 4 different tones instantly',
      details: [
        'Professional tone for business emails',
        'Friendly tone for casual communication',
        'Casual tone for informal communication',
        'Formal tone for official correspondence'
      ],
      gradient: 'from-blue-600 to-cyan-600'
    },
    {
      icon: Tag,
      title: 'Auto Categorization',
      description: 'Emails automatically sorted by priority and category',
      details: [
        'Priority detection (High, Medium, Low)',
        'Sentiment analysis (Positive, Neutral, Negative)',
        'Category labels (Work, Personal, Marketing, etc.)',
        'Smart filtering and search',
        'Unified inbox for multiple email accounts'
      ],
      gradient: 'from-purple-600 to-pink-600'
    },
    {
      icon: AlertTriangle,
      title: 'Smart Spam Detection',
      description: 'AI-powered spam and phishing detection keeps your inbox clean',
      details: [
        'Real-time spam analysis',
        'Phishing attempt detection',
        'Suspicious link warnings',
        'Confidence score for each email'
      ],
      gradient: 'from-orange-600 to-red-600'
    },
    {
      icon: FileText,
      title: 'Email Summarization',
      description: 'Get instant summaries with key points and action items',
      details: [
        'One-sentence summary of each email',
        'Bullet-point key takeaways',
        'Extracted action items',
        'Thread-level insights'
      ],
      gradient: 'from-green-600 to-teal-600'
    },
    {
      icon: Send,
      title: 'Full Email Actions',
      description: 'Complete email management with Reply, Forward, Delete, and Compose',
      details: [
        'Quick reply with AI suggestions',
        'Forward with custom message',
        'Delete or archive emails',
        'Compose new emails with AI assistance'
      ],
      gradient: 'from-cyan-600 to-blue-600'
    },
    {
      icon: Shield,
      title: 'Secure OAuth Integration',
      description: 'Connect your Gmail with secure OAuth 2.0 - no passwords stored',
      details: [
        'OAuth 2.0 authentication',
        'Encrypted token storage',
        'Automatic token refresh',
        'Easy disconnect anytime'
      ],
      gradient: 'from-gray-600 to-gray-800'
    }
  ];

  const useCasesBase = [
    {
      icon: '💼',
      title: 'Business Professionals',
      description: 'Handle client emails faster with AI-generated professional responses',
      benefit: 'Save 2-3 hours per day on email management'
    },
    {
      icon: '👔',
      title: 'Executives',
      description: 'Quick email triage with priority detection and summaries',
      benefit: 'Never miss important emails again'
    },
    {
      icon: '🚀',
      title: 'Entrepreneurs',
      description: 'Manage multiple inboxes with AI-powered efficiency',
      benefit: 'Focus on growing your business, not inbox zero'
    },
    {
      icon: '📚',
      title: 'Students & Researchers',
      description: 'Organize academic emails and correspondence efficiently',
      benefit: 'Stay organized with auto-categorization'
    }
  ];

  const howItWorksBase = [
    {
      step: 1,
      title: 'Connect Your Gmail',
      description: 'Secure OAuth 2.0 connection in seconds',
      icon: Mail
    },
    {
      step: 2,
      title: 'AI Analyzes Your Inbox',
      description: 'Automatic categorization, priority detection, and spam filtering',
      icon: Brain
    },
    {
      step: 3,
      title: 'Get AI Suggestions',
      description: 'Draft replies, summaries, and action items for each email',
      icon: Sparkles
    },
    {
      step: 4,
      title: 'Take Action Fast',
      description: 'Reply, forward, delete, or compose with one click',
      icon: Zap
    }
  ];

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      if (language === 'en') {
        setTranslations({});
        setFeaturesTranslated(featuresBase);
        setUseCasesTranslated(useCasesBase);
        setHowItWorksTranslated(howItWorksBase);
        return;
      }

      try {
        // Collect all texts that need translation
        const allTexts: string[] = [];

        // Hero section texts
        const heroTexts = [
          '✨ AI-Powered Email Assistant',
          'Smart Inbox',
          'Your Email, Supercharged with AI',
          'Transform your email workflow with intelligent AI that reads, categorizes, drafts replies, and helps you achieve inbox zero faster than ever before.',
          'Try Smart Inbox',
          'View All Products',
          'Time Saved on Email',
          'AI Response Tones',
          'Secure OAuth 2.0',
          'Powerful Features',
          'Everything you need for intelligent email management',
          'How It Works',
          'Get started in minutes and experience AI-powered email management',
          'Who Benefits?',
          'Smart Inbox is perfect for anyone who wants to work smarter, not harder',
          'Ready to Transform Your Inbox?',
          'Join professionals using AI to achieve inbox zero faster than ever.',
          'Get Started Now',
          'View Dashboard'
        ];
        heroTexts.forEach(text => {
          if (!allTexts.includes(text)) allTexts.push(text);
        });

        // Feature texts
        featuresBase.forEach(feature => {
          if (!allTexts.includes(feature.title)) allTexts.push(feature.title);
          if (!allTexts.includes(feature.description)) allTexts.push(feature.description);
          feature.details.forEach(d => {
            if (!allTexts.includes(d)) allTexts.push(d);
          });
        });

        // Use case texts
        useCasesBase.forEach(useCase => {
          if (!allTexts.includes(useCase.title)) allTexts.push(useCase.title);
          if (!allTexts.includes(useCase.description)) allTexts.push(useCase.description);
          if (!allTexts.includes(useCase.benefit)) allTexts.push(useCase.benefit);
        });

        // How it works texts
        howItWorksBase.forEach(item => {
          if (!allTexts.includes(item.title)) allTexts.push(item.title);
          if (!allTexts.includes(item.description)) allTexts.push(item.description);
        });

        // Batch translate ALL texts at once
        const { translationService } = await import('../../services/translationService');
        const translatedTexts = await translationService.translateBatch(allTexts, language, 'Smart Inbox product page');

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
          description: trans[feature.description] || feature.description,
          details: feature.details.map(d => trans[d] || d)
        }));

        // Reconstruct use cases with translations
        const useCasesTrans = useCasesBase.map(useCase => ({
          ...useCase,
          title: trans[useCase.title] || useCase.title,
          description: trans[useCase.description] || useCase.description,
          benefit: trans[useCase.benefit] || useCase.benefit
        }));

        // Reconstruct how it works with translations
        const howItWorksTrans = howItWorksBase.map(item => ({
          ...item,
          title: trans[item.title] || item.title,
          description: trans[item.description] || item.description
        }));

        setFeaturesTranslated(featuresTrans);
        setUseCasesTranslated(useCasesTrans);
        setHowItWorksTranslated(howItWorksTrans);
      } catch (error) {
        console.error('Translation error:', error);
        setFeaturesTranslated(featuresBase);
        setUseCasesTranslated(useCasesBase);
        setHowItWorksTranslated(howItWorksBase);
      }
    };

    loadTranslations();
  }, [language, t]);

  const features = featuresTranslated.length > 0 ? featuresTranslated : featuresBase;
  const useCases = useCasesTranslated.length > 0 ? useCasesTranslated : useCasesBase;
  const howItWorks = howItWorksTranslated.length > 0 ? howItWorksTranslated : howItWorksBase;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-cyan-900/10 to-purple-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block mb-4 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-500/30">
              <span className="text-sm font-semibold text-blue-300">{translations['✨ AI-Powered Email Assistant'] || '✨ AI-Powered Email Assistant'}</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              {translations['Smart Inbox'] || 'Smart Inbox'}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                {translations['Your Email, Supercharged with AI'] || 'Your Email, Supercharged with AI'}
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              {translations['Transform your email workflow with intelligent AI that reads, categorizes, drafts replies, and helps you achieve inbox zero faster than ever before.'] || 
               'Transform your email workflow with intelligent AI that reads, categorizes, drafts replies, and helps you achieve inbox zero faster than ever before.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/smart-inbox"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all flex items-center justify-center space-x-2"
              >
                <span>{translations['Try Smart Inbox'] || 'Try Smart Inbox'}</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/products"
                className="bg-gray-700/50 hover:bg-gray-600/50 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all border border-gray-600"
              >
                {translations['View All Products'] || 'View All Products'}
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="glass-card p-6 text-center">
              <div className="text-4xl font-bold text-cyan-400 mb-2">85%</div>
              <div className="text-gray-400">{translations['Time Saved on Email'] || 'Time Saved on Email'}</div>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">4</div>
              <div className="text-gray-400">{translations['AI Response Tones'] || 'AI Response Tones'}</div>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">100%</div>
              <div className="text-gray-400">{translations['Secure OAuth 2.0'] || 'Secure OAuth 2.0'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">{translations['Powerful Features'] || 'Powerful Features'}</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {translations['Everything you need for intelligent email management'] || 
               'Everything you need for intelligent email management'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="glass-card p-8 hover:scale-105 transition-transform duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400 mb-4">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.details.map((detail: string, detailIndex: number) => (
                    <li key={detailIndex} className="flex items-start space-x-2 text-sm text-gray-300">
                      <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">{translations['How It Works'] || 'How It Works'}</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {translations['Get started in minutes and experience AI-powered email management'] || 
               'Get started in minutes and experience AI-powered email management'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <div key={index} className="text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center mx-auto">
                    <item.icon className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">{translations['Who Benefits?'] || 'Who Benefits?'}</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {translations['Smart Inbox is perfect for anyone who wants to work smarter, not harder'] || 
               'Smart Inbox is perfect for anyone who wants to work smarter, not harder'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="glass-card p-8">
                <div className="flex items-start space-x-4">
                  <div className="text-5xl">{useCase.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-3">
                      {useCase.title}
                    </h3>
                    <p className="text-gray-400 mb-4">
                      {useCase.description}
                    </p>
                    <div className="flex items-center space-x-2 text-cyan-400 font-semibold">
                      <Zap className="h-4 w-4" />
                      <span>{useCase.benefit}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900/20 via-cyan-900/20 to-purple-900/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            {translations['Ready to Transform Your Inbox?'] || 'Ready to Transform Your Inbox?'}
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            {translations['Join professionals using AI to achieve inbox zero faster than ever.'] || 
             'Join professionals using AI to achieve inbox zero faster than ever.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/smart-inbox"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all"
            >
              {translations['Get Started Now'] || 'Get Started Now'}
            </Link>
            <Link
              to="/dashboard"
              className="bg-gray-700/50 hover:bg-gray-600/50 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all border border-gray-600"
            >
              {translations['View Dashboard'] || 'View Dashboard'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SmartInboxProduct;

