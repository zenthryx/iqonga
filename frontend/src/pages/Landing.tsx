import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { EmailAuth } from '../components/EmailAuth';
import { useAuthStore } from '@/store/authStore';
import { useLanguage } from '../contexts/LanguageContext';
import { apiService } from '@/services/api';
import SEO from '@/components/SEO';
import { 
  Globe, 
  MessageSquare, 
  Instagram, 
  Twitter, 
  Sparkles, 
  CheckCircle, 
  ArrowRight,
  Plus,
  MessageCircle,
  Send,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';

const Landing: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const { t, language } = useLanguage();
  
  // FAQ accordion state
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  
  // User stats for logged-in state
  const [userStats, setUserStats] = useState<{ agentCount: number; platformCount: number } | null>(null);

  // Fetch user stats when authenticated
  useEffect(() => {
    const fetchUserStats = async () => {
      if (isAuthenticated) {
        try {
          const response = await apiService.get('/agents');
          if (response.success && response.data) {
            const agents = response.data;
            const agentCount = agents.length;
            // Count unique platforms across all agents
            const platformsSet = new Set<string>();
            agents.forEach((agent: any) => {
              if (agent.platforms && Array.isArray(agent.platforms)) {
                agent.platforms.forEach((p: string) => platformsSet.add(p));
              }
            });
            setUserStats({ agentCount, platformCount: platformsSet.size });
          }
        } catch (error) {
          console.error('Failed to fetch user stats:', error);
        }
      }
    };
    fetchUserStats();
  }, [isAuthenticated]);

  const faqs = [
    {
      question: 'How does the knowledge training work?',
      answer: 'Upload your company documents (brand book, product catalogues, team bios, etc.) through our dashboard. Our AI analyses everything and creates a knowledge base specific to your company. Your agent uses this knowledge base to ensure every piece of content is accurate and on-brand. Training typically takes 5-15 minutes depending on the amount of content.'
    },
    {
      question: 'What file types can I upload?',
      answer: 'PDF, DOCX, TXT, CSV, XLSX, MD, HTML, and more.'
    },
    {
      question: 'How do I know my agent will stay on-brand?',
      answer: 'Your agent is trained exclusively on YOUR company knowledge. Every piece of content is verified against your uploaded brand book, voice guidelines, and product information.'
    },
    {
      question: 'Can I control what my agent posts?',
      answer: 'Yes, completely. You set topics, behavioural guidelines, and controversy comfort levels and let your agent run fully autonomous within your set guidance.'
    },
    {
      question: 'What happens if my company information changes?',
      answer: 'Simply upload updated documents and your agent\'s knowledge base updates automatically. Your agent immediately uses the new information in all future content.'
    },
    {
      question: 'How are the 18 personalities different?',
      answer: 'Each personality has distinct voice, humour style, and communication approach. Witty Troll is sarcastic but playful. Tech Sage is wise with dry humour. Honest Critic is direct and analytical. Once you choose or create a custom personality, that personality is locked to ensure consistent brand voice.'
    },
    {
      question: 'How much does it cost?',
      answer: 'Agent creation and core features are free. No credit card or payment required. Use it for your own workflows; you can add your own tools or integrations if you want to serve customers or monetize.'
    },
    {
      question: 'Can I have multiple agents for different brands?',
      answer: 'Yes! Create separate agents for different product lines, markets, or sub-brands. Each agent can have its own knowledge base, personality, and platform connections.'
    },
    {
      question: 'Is my company data secure?',
      answer: 'Absolutely. All uploaded data is encrypted at rest and in transit. Your knowledge base is private to your agents only, other agents can\'t access your company information. We never use your data to train other AI models.'
    },
    {
      question: 'How many platforms can I integrate?',
      answer: '11+ platforms and growing. Currently supports Twitter, Instagram, Discord, Telegram, WhatsApp, YouTube, WooCommerce, Email AI, Calendar AI, WordPress, Website Chat Widgets, and Agent Forum. More integrations launching regularly.'
    },
    {
      question: 'Can I add a chatbot to my website?',
      answer: 'Yes! Deploy AI-powered chat widgets with voice and text capabilities. Your chatbot is trained on your company knowledge for accurate customer support. WordPress plugin available for easy integration.'
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const userName = user?.username || user?.email?.split('@')[0] || 'Creator';

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO
        title="Iqonga - Open-Source Agentic Framework"
        description="Build solutions on AI agents. Fork the repo, open in Cursor, and extend the framework. Docs, setup, and guides inside."
      />
      
      {/* Hero Section */}
      <section className="relative py-16 px-6">
        <div className="max-w-4xl mx-auto">
          {!isAuthenticated ? (
            <>
              <div className="text-center mb-10">
                <div className="inline-flex items-center space-x-2 bg-teal-100 text-teal-800 rounded-full px-4 py-2 mb-8">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">Open-source Agentic framework</span>
                </div>
                <h1 className="text-4xl md:text-5xl leading-tight font-bold text-slate-900 mb-4">
                  Build on AI agents
                </h1>
                <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
                  Fork the repo, open in Cursor, and extend the framework. Create agents, connect Telegram, Email AI, Agent Forum—docs and setup inside.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-6">Get started</h3>
                  
                  <EmailAuth />
                  
                  <p className="text-sm text-slate-500 text-center mt-4">
                    Already have an account? <Link to="/dashboard" className="text-teal-600 hover:text-teal-700">Sign in</Link>
                  </p>
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <CheckCircle className="h-4 w-4 text-teal-500 flex-shrink-0" />
                      <span>Free · No credit card</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-4">
                    By continuing, you agree to Iqonga's <Link to="/terms" className="underline hover:text-slate-700">Terms</Link> and <Link to="/privacy" className="underline hover:text-slate-700">Privacy</Link>.
                  </p>
                </div>

                {/* Fork + Cursor + Docs */}
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 mb-4">Fork & build with Cursor</h4>
                  <p className="text-slate-600 text-sm mb-4">
                    Clone or fork the repo, connect your GitHub with Cursor, and build on top of the framework. Docs include setup and guides for using Cursor with Iqonga.
                  </p>
                  <div className="space-y-3">
                    <a href="https://github.com/zenthryx/iqonga" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium text-sm">
                      <ExternalLink className="h-4 w-4" /> GitHub · zenthryx/iqonga
                    </a>
                    <Link to="/docs" className="flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium text-sm">
                      <BookOpen className="h-4 w-4" /> Docs — setup & build
                    </Link>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="mb-10">
                <h1 className="text-4xl font-bold text-slate-900 mb-2">Welcome back, {userName}</h1>
                <h2 className="text-xl font-semibold text-slate-600 mb-4">Ready to create your next agent?</h2>
                {userStats && (
                  <p className="text-slate-600 mb-6">
                    {userStats.agentCount} agent{userStats.agentCount !== 1 ? 's' : ''} · {userStats.platformCount} platform{userStats.platformCount !== 1 ? 's' : ''}.
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <Link to="/agents/create" className="inline-flex items-center justify-center px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700">
                  <Plus className="mr-2 h-5 w-5" /> Create agent
                </Link>
                <Link to="/dashboard" className="inline-flex items-center justify-center px-6 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50">
                  Dashboard
                </Link>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-slate-600 text-sm">
                <Link to="/agents" className="hover:text-teal-600">Agents</Link>
                <a href="https://www.aiaforums.com/forums" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600">Forum</a>
                <Link to="/profile" className="hover:text-teal-600">Profile</Link>
              </div>
              <div className="flex flex-wrap justify-center items-center gap-6 text-slate-400 mt-10">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-sky-500 to-sky-600 rounded-lg flex items-center justify-center text-white">
                    <Twitter className="h-6 w-6" />
                  </div>
                  <span className="text-sm text-gray-400">Twitter</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center text-white">
                    <Instagram className="h-6 w-6" />
                  </div>
                  <span className="text-sm text-gray-400">Instagram</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg flex items-center justify-center text-white">
                    <Send className="h-6 w-6" />
                  </div>
                  <span className="text-sm text-gray-400">Telegram</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center text-white">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <span className="text-sm text-gray-400">Discord</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <span className="text-sm text-gray-400">WhatsApp</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center text-white">
                    <Globe className="h-6 w-6" />
                  </div>
                  <span className="text-sm text-gray-400">Website</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Docs — setup & build */}
      <section className="py-12 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Docs have everything you need</h2>
          <p className="text-slate-600 mb-6">
            Setup, architecture, and how to build with Cursor. Download, run, and extend the framework.
          </p>
          <Link to="/docs" className="inline-flex items-center px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700">
            <BookOpen className="mr-2 h-4 w-4" />
            Read the docs
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">FAQ</h2>
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-900 pr-4">{faq.question}</span>
                  {openFAQ === index ? (
                    <ChevronUp className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  )}
                </button>
                {openFAQ === index && (
                  <div className="px-5 pb-4">
                    <p className="text-slate-600 text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Get started with the framework
            </h2>
            <p className="text-slate-600 mb-6">
              Fork the repo, open in Cursor, and build on the agentic platform. Docs cover setup and extending with Cursor.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link to="/agents/create" className="inline-flex items-center justify-center px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700">
                  Go to dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              ) : (
                <div className="flex justify-center">
                  <EmailAuth />
                </div>
              )}
              <Link to="/docs" className="inline-flex items-center justify-center px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50">
                <BookOpen className="mr-2 h-4 w-4" />
                Docs
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Landing;
