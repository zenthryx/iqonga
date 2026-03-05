import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CalendarDays, 
  Brain, 
  Sparkles, 
  Shield, 
  Zap, 
  CheckCircle2,
  ArrowRight,
  Bell,
  Activity,
  Lightbulb,
  AlertTriangle,
  Clock,
  BarChart3,
  Mail,
  Users,
  Target
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const AICalendarProduct: React.FC = () => {
  const { t, language } = useLanguage();
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [featuresTranslated, setFeaturesTranslated] = useState<any[]>([]);
  const [useCasesTranslated, setUseCasesTranslated] = useState<any[]>([]);
  const [howItWorksTranslated, setHowItWorksTranslated] = useState<any[]>([]);
  const [phasesTranslated, setPhasesTranslated] = useState<any[]>([]);

  const featuresBase = [
    {
      icon: Brain,
      title: 'AI Meeting Prep',
      description: 'Get intelligent briefings before every meeting with context and insights',
      details: [
        'Meeting summary and context',
        'AI-generated discussion topics',
        'Suggested questions to ask',
        'Preparation checklist',
        'Email to yourself option'
      ],
      gradient: 'from-purple-600 to-pink-600'
    },
    {
      icon: Activity,
      title: 'Smart Scheduling',
      description: 'AI analyzes your calendar and suggests optimal meeting times',
      details: [
        'Conflict detection (overlaps, back-to-back)',
        'Travel time warnings',
        'Best time finder',
        'Pattern learning from history',
        'Meeting load balancing'
      ],
      gradient: 'from-cyan-600 to-blue-600'
    },
    {
      icon: BarChart3,
      title: 'Calendar Health Score',
      description: 'Real-time health metrics to optimize your schedule',
      details: [
        'Overall health score (0-100)',
        'Work-life balance score',
        'Focus time score',
        'Efficiency score',
        'Daily health snapshots'
      ],
      gradient: 'from-green-600 to-teal-600'
    },
    {
      icon: Bell,
      title: 'Automated Reminders',
      description: 'Never miss a meeting with smart email reminders',
      details: [
        'Pre-meeting reminders (customizable time)',
        'Daily digest of today\'s meetings',
        'Weekly preview of upcoming week',
        'AI Meeting Prep included in reminders',
        'Fully customizable settings'
      ],
      gradient: 'from-orange-600 to-red-600'
    },
    {
      icon: Lightbulb,
      title: 'AI Suggestions',
      description: 'Proactive recommendations to improve your calendar',
      details: [
        'Block focus time suggestions',
        'Meeting load reduction tips',
        'Buffer time recommendations',
        'Conflict resolution guidance',
        'Best practice insights'
      ],
      gradient: 'from-yellow-600 to-orange-600'
    },
    {
      icon: Shield,
      title: 'Secure OAuth Integration',
      description: 'Connect Google Calendar with secure OAuth 2.0 authentication',
      details: [
        'OAuth 2.0 authentication',
        'Encrypted token storage',
        'Automatic token refresh',
        'Easy disconnect anytime',
        'No passwords stored'
      ],
      gradient: 'from-gray-600 to-gray-800'
    }
  ];

  const useCasesBase = [
    {
      icon: '👔',
      title: 'Executives & Managers',
      description: 'Stay prepared for back-to-back meetings with AI briefings',
      benefit: 'Save 30 minutes of prep time per day'
    },
    {
      icon: '🚀',
      title: 'Sales Professionals',
      description: 'Never walk into a client meeting unprepared',
      benefit: 'Close more deals with better preparation'
    },
    {
      icon: '💼',
      title: 'Consultants',
      description: 'Manage complex schedules across multiple clients',
      benefit: 'Reduce scheduling conflicts by 90%'
    },
    {
      icon: '📊',
      title: 'Project Managers',
      description: 'Balance team meetings with deep focus time',
      benefit: 'Increase productivity with health insights'
    }
  ];

  const howItWorksBase = [
    {
      step: 1,
      title: 'Connect Google Calendar',
      description: 'Secure OAuth 2.0 connection in seconds',
      icon: CalendarDays
    },
    {
      step: 2,
      title: 'AI Analyzes Your Schedule',
      description: 'Pattern learning, conflict detection, health scoring',
      icon: Brain
    },
    {
      step: 3,
      title: 'Get Meeting Prep',
      description: 'AI generates briefings with context and topics',
      icon: Sparkles
    },
    {
      step: 4,
      title: 'Optimize & Automate',
      description: 'Smart suggestions and automated reminders',
      icon: Zap
    }
  ];

  const phasesBase = [
    {
      title: 'Phase 1: AI Meeting Prep',
      features: [
        'Meeting context analysis',
        'Discussion topic generation',
        'Suggested questions',
        'Preparation checklist',
        'Email briefing'
      ]
    },
    {
      title: 'Phase 2: Automated Reminders',
      features: [
        'Pre-meeting reminders',
        'Daily meeting digest',
        'Weekly preview',
        'Customizable timing',
        'Prep included'
      ]
    },
    {
      title: 'Phase 3: Smart Scheduling',
      features: [
        'Conflict detection',
        'Best time finder',
        'Pattern learning',
        'Travel warnings',
        'Load balancing'
      ]
    },
    {
      title: 'Phase 4: Health Insights',
      features: [
        'Calendar health score',
        'AI suggestions',
        'Balance metrics',
        'Focus time tracking',
        'Efficiency analysis'
      ]
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
        setPhasesTranslated(phasesBase);
        return;
      }

      try {
        // Collect all texts that need translation
        const allTexts: string[] = [];

        // Hero section texts
        const heroTexts = [
          '🤖 AI-Powered Meeting Assistant',
          'AI Calendar',
          'Never Walk Into a Meeting Unprepared',
          'Intelligent calendar management with AI meeting prep, smart scheduling, health insights, and automated reminders - all powered by advanced AI.',
          'Try AI Calendar',
          'View All Products',
          'Saved Per Day',
          'AI Features',
          'Conflict Reduction',
          'Secure OAuth',
          'Powerful Features',
          'Everything you need for intelligent calendar management',
          'How It Works',
          'Get started in minutes and experience AI-powered calendar management',
          'Complete AI Calendar Suite',
          'All 4 phases are now live and ready to use',
          'Who Benefits?',
          'AI Calendar is perfect for busy professionals who want to optimize their time',
          'Ready to Optimize Your Calendar?',
          'Join professionals using AI to never walk into a meeting unprepared.',
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

        // Phase texts
        phasesBase.forEach(phase => {
          if (!allTexts.includes(phase.title)) allTexts.push(phase.title);
          phase.features.forEach(f => {
            if (!allTexts.includes(f)) allTexts.push(f);
          });
        });

        // Batch translate ALL texts at once
        const { translationService } = await import('../../services/translationService');
        const translatedTexts = await translationService.translateBatch(allTexts, language, 'AI Calendar product page');

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

        // Reconstruct phases with translations
        const phasesTrans = phasesBase.map(phase => ({
          ...phase,
          title: trans[phase.title] || phase.title,
          features: phase.features.map(f => trans[f] || f)
        }));

        setFeaturesTranslated(featuresTrans);
        setUseCasesTranslated(useCasesTrans);
        setHowItWorksTranslated(howItWorksTrans);
        setPhasesTranslated(phasesTrans);
      } catch (error) {
        console.error('Translation error:', error);
        setFeaturesTranslated(featuresBase);
        setUseCasesTranslated(useCasesBase);
        setHowItWorksTranslated(howItWorksBase);
        setPhasesTranslated(phasesBase);
      }
    };

    loadTranslations();
  }, [language, t]);

  const features = featuresTranslated.length > 0 ? featuresTranslated : featuresBase;
  const useCases = useCasesTranslated.length > 0 ? useCasesTranslated : useCasesBase;
  const howItWorks = howItWorksTranslated.length > 0 ? howItWorksTranslated : howItWorksBase;
  const phases = phasesTranslated.length > 0 ? phasesTranslated : phasesBase;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-purple-900/10 to-pink-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block mb-4 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full border border-cyan-500/30">
              <span className="text-sm font-semibold text-cyan-300">🤖 AI-Powered Meeting Assistant</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              AI Calendar
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
                Never Walk Into a Meeting Unprepared
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Intelligent calendar management with AI meeting prep, smart scheduling, 
              health insights, and automated reminders - all powered by advanced AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/calendar"
                className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all flex items-center justify-center space-x-2"
              >
                <span>Try AI Calendar</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/products"
                className="bg-gray-700/50 hover:bg-gray-600/50 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all border border-gray-600"
              >
                View All Products
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-16">
            <div className="glass-card p-6 text-center">
              <div className="text-4xl font-bold text-cyan-400 mb-2">30min</div>
              <div className="text-gray-400">{translations['Saved Per Day'] || 'Saved Per Day'}</div>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">4</div>
              <div className="text-gray-400">{translations['AI Features'] || 'AI Features'}</div>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="text-4xl font-bold text-pink-400 mb-2">90%</div>
              <div className="text-gray-400">{translations['Conflict Reduction'] || 'Conflict Reduction'}</div>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">100%</div>
              <div className="text-gray-400">{translations['Secure OAuth'] || 'Secure OAuth'}</div>
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
              {translations['Everything you need for intelligent calendar management'] || 
               'Everything you need for intelligent calendar management'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature: any, index: number) => (
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
              {translations['Get started in minutes and experience AI-powered calendar management'] || 
               'Get started in minutes and experience AI-powered calendar management'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item: any, index: number) => (
              <div key={index} className="text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-600 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                    <item.icon className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
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

      {/* Phases */}
      <section className="py-20 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Complete AI Calendar Suite</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              All 4 phases are now live and ready to use
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {phases.map((phase: any, index: number) => (
              <div key={index} className="glass-card p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {phase.title}
                  </h3>
                  <span className="ml-auto px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
                    Live
                  </span>
                </div>
                <ul className="space-y-3">
                  {phase.features.map((feature: string, featureIndex: number) => (
                    <li key={featureIndex} className="flex items-center space-x-3 text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">{translations['Who Benefits?'] || 'Who Benefits?'}</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {translations['AI Calendar is perfect for busy professionals who want to optimize their time'] || 
               'AI Calendar is perfect for busy professionals who want to optimize their time'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {useCases.map((useCase: any, index: number) => (
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
                    <div className="flex items-center space-x-2 text-purple-400 font-semibold">
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
      <section className="py-20 bg-gradient-to-r from-cyan-900/20 via-purple-900/20 to-pink-900/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            {translations['Ready to Optimize Your Calendar?'] || 'Ready to Optimize Your Calendar?'}
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            {translations['Join professionals using AI to never walk into a meeting unprepared.'] || 
             'Join professionals using AI to never walk into a meeting unprepared.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/calendar"
              className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all"
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

export default AICalendarProduct;

