import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon, QuestionMarkCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../contexts/LanguageContext';
import SEO from '@/components/SEO';

const FAQ: React.FC = () => {
  const { t, language } = useLanguage();
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [faqCategoriesTranslated, setFaqCategoriesTranslated] = useState<any[]>([]);

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const faqCategoriesBase = [
    {
      id: 'general',
      title: 'General Questions',
      items: [
        {
          id: 'what-is-iqonga',
          question: 'What is Iqonga?',
          answer: 'Iqonga is an open-source Agentic framework. Users and businesses build solutions based on AI agents—content, support bots, internal tools, and more. Create agents, connect channels (Telegram, Email AI, social platforms, Agent Forum), schedule content, and extend the framework or list solutions in the marketplace.'
        },
        {
          id: 'how-it-works',
          question: 'How does Iqonga work?',
          answer: 'You create AI agents with personalities and knowledge, connect them to channels (e.g. Telegram, Email AI, social accounts), and optionally schedule content. Agents use your company knowledge base and can participate in the AI Agent forum (AIAForums.com). The framework is open source so you can self-host or extend it.'
        },
        {
          id: 'blockchain-benefits',
          question: 'Is Iqonga open source?',
          answer: 'Yes. Iqonga is an open-source Agentic framework. You can run your own instance, inspect the code, extend the platform, and build solutions on top of it. Developers can also list and sell solutions in the marketplace.'
        },
        {
          id: 'target-audience',
          question: 'Who is Iqonga for?',
          answer: 'Iqonga is for developers, businesses, and creators who want to build solutions with AI agents—from content and support automation to custom workflows. Use the framework as-is or extend it; no lock-in.'
        }
      ]
    },
    {
      id: 'getting-started',
      title: 'Getting Started',
      items: [
        {
          id: 'wallet-requirements',
          question: 'Do I need a wallet to use Iqonga?',
          answer: 'No. Sign in with your email (magic code). Agent creation and core features are free. No wallet or payment is required to get started.'
        },
        {
          id: 'first-steps',
          question: 'What are the first steps to get started?',
          answer: '1. Sign up with your email (you’ll get a one-time code to log in). 2. Create your first AI agent (personality, voice, topics). 3. Connect channels (e.g. Telegram, Email AI) from the dashboard. 4. Optionally enable Agent Forum so your agent can join AIAForums.com. 5. Use scheduled content or deploy your agent. See the Documentation for architecture and building on the framework.'
        },
        {
          id: 'credit-system',
          question: 'Is Iqonga free?',
          answer: 'The framework is open source. Agent creation and core features are free to use. You can self-host or use the hosted app. Additional paid services may be offered separately; see the Documentation for details.'
        },
        {
          id: 'free-trial',
          question: 'Is there a free trial available?',
          answer: 'Yes! New users receive free credits to try out the platform. This allows you to create your first agent and generate some content to experience the platform\'s capabilities before committing to a paid plan.'
        }
      ]
    },
    {
      id: 'ai-agents',
      title: 'AI Agents',
      items: [
        {
          id: 'personality-types',
          question: 'What personality types are available for AI agents?',
          answer: 'Iqonga offers four distinct personality types: 1) Witty Troll - sarcastic and humorous, perfect for entertainment content, 2) Tech Sage - knowledgeable and analytical, ideal for educational content, 3) Hype Beast - energetic and motivational, great for marketing, and 4) Honest Critic - balanced and objective, perfect for reviews and analysis.'
        },
        {
          id: 'agent-evolution',
          question: 'How do AI agents evolve?',
          answer: 'AI agents evolve based on their performance metrics and engagement rates. There are four evolution levels: Novice (starting level), Advanced (improved capabilities), Expert (high-level features), and Legendary (maximum performance with unique abilities). As your agent performs better and gains more engagement, it progresses through these levels, unlocking new features and improved capabilities.'
        },
        {
          id: 'agent-customization',
          question: 'Can I customize my AI agents?',
          answer: 'Yes! You can customize various aspects of your AI agents including their personality traits, content preferences, posting frequency, tone of voice, expertise areas, and target audience. You can also update these settings at any time to refine your agent\'s behavior.'
        },
        {
          id: 'multiple-agents',
          question: 'Can I have multiple AI agents?',
          answer: 'Absolutely! You can create and manage multiple AI agents, each with different personalities and purposes. This allows you to have specialized agents for different types of content, platforms, or audiences. Each agent operates independently and can be customized for specific use cases.'
        },
        {
          id: 'agent-performance',
          question: 'How can I track my agent\'s performance?',
          answer: 'Iqonga provides comprehensive analytics including engagement metrics (likes, shares, comments), reach and impressions, follower growth, content performance analysis, optimal posting times, and evolution progress. You can view detailed reports and insights to understand how well your agents are performing.'
        }
      ]
    },
    {
      id: 'content-generation',
      title: 'Content Generation',
      items: [
        {
          id: 'content-types',
          question: 'What types of content can AI agents generate?',
          answer: 'AI agents can generate various types of content including social media posts (Twitter, Instagram, LinkedIn), blog articles, marketing copy, product descriptions, educational content, tutorials, reviews, and promotional materials. The content is tailored to your agent\'s personality and your specified requirements.'
        },
        {
          id: 'content-quality',
          question: 'How do you ensure content quality?',
          answer: 'Iqonga uses advanced AI models with built-in safety filters and quality controls. All content goes through toxicity filtering, brand safety checks, and quality scoring. You can also set content guidelines and preferences to ensure the generated content aligns with your brand voice and standards.'
        },
        {
          id: 'content-scheduling',
          question: 'Can I schedule content in advance?',
          answer: 'Yes! Iqonga includes a comprehensive scheduling system that allows you to plan and schedule content in advance. You can set optimal posting times, create content calendars, and maintain a queue of ready-to-post content for consistent publishing across multiple platforms.'
        },
        {
          id: 'image-generation',
          question: 'Can AI agents generate images?',
          answer: 'Yes! Iqonga includes AI-powered image generation capabilities using DALL-E. You can create custom images to accompany your content using text descriptions and style preferences. The system offers various style options including professional, creative, minimalist, and brand-specific styles.'
        },
        {
          id: 'video-generation',
          question: 'Can AI agents generate videos?',
          answer: 'Yes! Iqonga supports multiple video generation options: 1) Veo Video Generation (Google) - Text-to-video with per-second pricing, 2) Runway - Video generation and extension, 3) HeyGen Avatar Videos - Professional avatar videos with text-to-speech and audio lip-sync, 4) HeyGen Video Translation - Translate videos with lip-sync in various languages. Pricing varies by service and duration.'
        },
        {
          id: 'music-generation',
          question: 'Can AI agents generate music and lyrics?',
          answer: 'Yes! Iqonga includes music and lyrics generation capabilities. You can generate original music tracks with multiple providers, create song lyrics based on topics and genres, and even create music videos with AI avatars and lip-sync. All music generation is pay-as-you-go with dynamic pricing.'
        },
        {
          id: 'content-editing',
          question: 'Can I edit AI-generated content?',
          answer: 'Absolutely! All AI-generated content can be reviewed and edited before publishing. You can modify the text, adjust the tone, add or remove elements, and customize the content to perfectly match your needs before scheduling or publishing it.'
        }
      ]
    },
    {
      id: 'platform-integration',
      title: 'Platform Integration',
      items: [
        {
          id: 'supported-platforms',
          question: 'Which social media platforms are supported?',
          answer: 'Iqonga currently supports Twitter, Instagram, and LinkedIn. We\'re continuously working to add support for additional platforms including Facebook, TikTok, YouTube, and more. Each platform integration includes platform-specific optimizations and features.'
        },
        {
          id: 'api-connections',
          question: 'How do I connect my social media accounts?',
          answer: 'You can connect your social media accounts through secure OAuth connections. The platform will guide you through the authorization process for each platform. Your credentials are never stored on our servers - we only receive permission tokens that allow us to post on your behalf.'
        },
        {
          id: 'cross-platform-posting',
          question: 'Can I post to multiple platforms simultaneously?',
          answer: 'Yes! Iqonga allows you to post the same content to multiple platforms simultaneously, or customize content for each platform while maintaining your core message. This saves time and ensures consistent messaging across all your social media channels.'
        },
        {
          id: 'platform-analytics',
          question: 'Do you provide platform-specific analytics?',
          answer: 'Yes! Iqonga provides detailed analytics for each connected platform, including platform-specific metrics like Instagram Stories performance, Twitter engagement rates, LinkedIn professional reach, and more. You can view analytics for individual platforms or get a comprehensive cross-platform overview.'
        }
      ]
    },
    {
      id: 'billing-pricing',
      title: 'Billing & Pricing',
      items: [
        {
          id: 'pricing-plans',
          question: 'What are the available pricing plans?',
          answer: 'Iqonga uses a pay-as-you-go credit system with dynamic pricing. Agent creation is FREE. All other services (content generation, image/video/music creation, Smart Inbox, AI Calendar) use credits with pricing that can be flat-rate, per-second, or per-minute depending on the service. See the Pricing page for current rates. You can purchase credits as needed with USDC, $ZTR tokens (receive 20% bonus credits when paying with $ZTR), or traditional payment methods. We also offer $ZTR token holder rewards for monthly credit distributions.'
        },
        {
          id: 'payment-methods',
          question: 'What payment methods do you accept?',
          answer: 'We accept various payment methods including credit/debit cards, PayPal, bank transfers, and cryptocurrencies (USDC, $ZTR tokens, SOL, Bitcoin, Ethereum). Pay with $ZTR tokens to receive 20% bonus credits on all purchases! All payments are processed securely through our payment partners, and cryptocurrency payments are processed directly on the blockchain.'
        },
        {
          id: 'credit-expiration',
          question: 'Do credits expire?',
          answer: 'Credits purchased as part of monthly plans expire at the end of each billing cycle if unused. However, pay-as-you-go credits and any unused credits from higher-tier plans can roll over to the next month. We recommend using your credits regularly to maximize value.'
        },
        {
          id: 'refund-policy',
          question: 'What is your refund policy?',
          answer: 'We offer a 30-day money-back guarantee for new subscribers. If you\'re not satisfied with Iqonga within the first 30 days, you can request a full refund. Refunds for unused credits are handled on a case-by-case basis. Contact our support team for assistance with refund requests.'
        },
        {
          id: 'enterprise-pricing',
          question: 'Do you offer custom enterprise pricing?',
          answer: 'Yes! For large organizations with specific needs, we offer custom enterprise solutions with tailored pricing, dedicated support, custom integrations, and advanced features. Contact our sales team to discuss your requirements and get a custom quote.'
        }
      ]
    },
    {
      id: 'technical',
      title: 'Technical Support',
      items: [
        {
          id: 'system-requirements',
          question: 'What are the system requirements?',
          answer: 'Iqonga is a web-based platform that works on any modern browser (Chrome, Firefox, Safari, Edge). You need a stable internet connection and a Solana-compatible wallet. The platform is optimized for desktop and mobile devices, with responsive design for all screen sizes.'
        },
        {
          id: 'wallet-issues',
          question: 'What should I do if my wallet won\'t connect?',
          answer: 'If your wallet won\'t connect, try these steps: 1) Ensure your wallet extension is installed and updated, 2) Refresh the page and try reconnecting, 3) Check that you\'re on the correct network (Solana Mainnet), 4) Clear your browser cache and cookies, 5) Try using a different browser or incognito mode. If issues persist, contact our support team.'
        },
        {
          id: 'transaction-failures',
          question: 'Is my data backed up?',
          answer: 'Yes! Your agent data, content, and settings are backed up on our secure servers. You can export or manage your agents from the dashboard at any time.'
        },
        {
          id: 'api-access',
          question: 'Do you provide API access?',
          answer: 'API access is available for Enterprise customers and can be requested for Professional customers. Our API allows you to integrate Iqonga with your existing systems, automate workflows, and build custom applications. Contact our sales team to discuss API access options.'
        }
      ]
    },
    {
      id: 'security-privacy',
      title: 'Security & Privacy',
      items: [
        {
          id: 'data-security',
          question: 'How is my data protected?',
          answer: 'Iqonga employs multiple layers of security including end-to-end encryption, secure data transmission protocols, and blockchain-based data integrity verification. Your private keys are never stored on our servers - they remain in your wallet. We also implement regular security audits and follow industry best practices for data protection.'
        },
        {
          id: 'privacy-policy',
          question: 'What data do you collect and how is it used?',
          answer: 'We collect minimal data necessary to provide our services, including your wallet address (for authentication), agent configurations, and content preferences. We never access your private keys or personal data beyond what\'s necessary for platform functionality. All data usage is transparent and detailed in our privacy policy.'
        },
        {
          id: 'wallet-security',
          question: 'How can I keep my wallet secure?',
          answer: 'To keep your wallet secure: 1) Never share your private keys or seed phrases, 2) Use hardware wallets for large amounts, 3) Enable two-factor authentication where available, 4) Keep your wallet software updated, 5) Be cautious of phishing attempts, 6) Verify transaction details before confirming. Iqonga never asks for your private keys.'
        },
        {
          id: 'content-privacy',
          question: 'Is my content private?',
          answer: 'Your content is private and only accessible to you unless you choose to publish it. We don\'t share your unpublished content with third parties. Published content follows the privacy settings of the platforms where it\'s posted. You maintain full control over your content and can delete it at any time.'
        }
      ]
    },
    {
      id: 'productivity-tools',
      title: 'Productivity Tools',
      items: [
        {
          id: 'smart-inbox',
          question: 'What is Smart Inbox?',
          answer: 'Smart Inbox is an AI-powered email management tool that integrates with Gmail. It provides automatic email categorization, AI-generated draft replies in 4 tones (professional, friendly, brief, detailed), email summarization, smart spam detection, and full email management (reply, forward, delete, compose). It uses secure OAuth 2.0 authentication and pay-as-you-go pricing. See the Smart Inbox product page for details.'
        },
        {
          id: 'ai-calendar',
          question: 'What is AI Calendar?',
          answer: 'AI Calendar integrates with Google Calendar to provide intelligent scheduling, AI-powered meeting preparation, smart insights, automated reminders, and full event management. Features include calendar health scoring, conflict detection, optimal meeting time suggestions, and comprehensive meeting prep with discussion topics, suggested questions, and attendee context. Uses pay-as-you-go pricing. See the AI Calendar product page for details.'
        },
        {
          id: 'gmail-integration',
          question: 'How secure is the Gmail integration?',
          answer: 'Smart Inbox uses OAuth 2.0 authentication - we never store your Gmail password. Only permission tokens are stored (encrypted), and you can disconnect anytime. Your emails are processed securely and never shared with third parties. All data transmission is encrypted.'
        },
        {
          id: 'calendar-integration',
          question: 'How does the Google Calendar integration work?',
          answer: 'AI Calendar connects to your Google Calendar via secure OAuth 2.0. Once connected, you can view, create, edit, and delete events directly from Iqonga. The integration syncs in real-time and provides AI-powered insights to optimize your schedule. You maintain full control and can disconnect anytime.'
        }
      ]
    },
    {
      id: 'wordpress-integration',
      title: 'WordPress & WooCommerce',
      items: [
        {
          id: 'wordpress-plugin',
          question: 'What is the Iqonga WordPress Plugin?',
          answer: 'The Iqonga WordPress Plugin allows you to deploy AI-powered chatbots on your WordPress website. Features include voice-enabled chat (speech-to-text, text-to-speech), AI content generation, customizable widget, company knowledge base integration, and WooCommerce integration for e-commerce support. The plugin is free to download and install. See the WordPress Plugin page for installation instructions.'
        },
        {
          id: 'woocommerce-integration',
          question: 'How does WooCommerce integration work?',
          answer: 'The WooCommerce integration syncs your products, customers, and orders to Iqonga, giving your AI agents access to product information, pricing, inventory, and customer purchase history. Agents can answer product questions, provide recommendations, check order status, and track shipments. Sync products and orders from WordPress admin to keep your AI agents up-to-date.'
        },
        {
          id: 'wordpress-setup',
          question: 'How do I set up the WordPress plugin?',
          answer: '1) Download the plugin from the WordPress Plugin page, 2) Install and activate it in your WordPress admin, 3) Configure your Iqonga API credentials, 4) Customize the chat widget appearance, 5) Sync your products and orders (for WooCommerce), 6) Upload company knowledge documents. The plugin will then power your website chatbot with AI agents.'
        }
      ]
    },
    {
      id: 'company-knowledge',
      title: 'Company Knowledge Base',
      items: [
        {
          id: 'knowledge-base',
          question: 'What is the Company Knowledge Base?',
          answer: 'The Company Knowledge Base allows you to train your AI agents with comprehensive information about your business. You can upload company profiles, products/services, knowledge documents (PDF, DOCX, TXT, MD), team member information, achievements, and Web3 project details. This information helps agents provide accurate, context-aware responses to customers.'
        },
        {
          id: 'web3-details',
          question: 'What are Web3 Details?',
          answer: 'Web3 Details is a comprehensive section for blockchain projects to provide tokenomics, smart contract addresses, governance models, security audits, trading information, community metrics, partnerships, and roadmap details. This helps AI agents accurately represent Web3 projects to the community. Available for all users, not just blockchain projects.'
        },
        {
          id: 'document-upload',
          question: 'What document types can I upload?',
          answer: 'You can upload PDF, DOCX, DOC, TXT, and Markdown (.md) files. Documents are automatically processed and summarized by AI, making the information available to your agents. Maximum file size is 5MB per file, with up to 10 files per upload.'
        }
      ]
    },
    {
      id: 'token-rewards',
      title: 'Token Holder Rewards',
      items: [
        {
          id: 'ztr-rewards',
          question: 'What are $ZTR Token Holder Rewards?',
          answer: '$ZTR Token Holder Rewards is a monthly credit reward program for users who hold $ZTR tokens. Rewards are tiered based on token balance (e.g., 1M+ $ZTR, 5M+ $ZTR, 10M+ $ZTR). Credits are automatically distributed monthly to eligible holders. Anti-gaming measures ensure fair distribution based on average balance and minimum holding periods.'
        },
        {
          id: 'reward-eligibility',
          question: 'How do I become eligible for token rewards?',
          answer: 'Hold $ZTR tokens in a Solana wallet connected to your Iqonga account. Your token balance is tracked daily through snapshots. To qualify for monthly rewards, you must maintain the minimum balance for the tier and meet the minimum holding period requirements. Rewards are calculated based on your average balance over the month.'
        },
        {
          id: 'reward-distribution',
          question: 'When are rewards distributed?',
          answer: 'Rewards are calculated and distributed monthly. Daily snapshots track your token balance, and at the end of each month, eligible holders receive credits directly to their Iqonga account. You can check your reward status and history in the admin dashboard (for admins) or contact support for your reward information.'
        }
      ]
    },
    {
      id: 'pricing-updates',
      title: 'Pricing & Credits',
      items: [
        {
          id: 'dynamic-pricing',
          question: 'How does dynamic pricing work?',
          answer: 'Iqonga uses dynamic pricing that can be adjusted by administrators. Pricing can be flat-rate (one-time cost), per-second (for services like Veo video generation), or per-minute (for services like HeyGen video translation). All pricing is displayed on the Pricing page and is calculated automatically based on service type and duration.'
        },
        {
          id: 'agent-creation-cost',
          question: 'How much does it cost to create an AI agent?',
          answer: 'Agent creation is currently FREE! This allows users to test the platform and create agents without cost. You only pay for content generation and other services your agents use. Check the Pricing page for current rates on all services.'
        },
        {
          id: 'debt-limit',
          question: 'What is the debt limit?',
          answer: 'Users can accumulate debt up to 200 credits when their balance is insufficient. Once the debt limit is reached, you must purchase credits or repay debt before using more services. This prevents uncontrolled debt accumulation while allowing flexibility for active users.'
        },
        {
          id: 'credit-purchase',
          question: 'How do I purchase credits?',
          answer: 'You can purchase credits through the dashboard using USDC, $ZTR tokens (with 20% bonus credits), or traditional payment methods (credit cards, PayPal, etc.). Credits are added immediately to your account. You can also set up auto-recharge to automatically purchase credits when your balance is low.'
        }
      ]
    }
  ];

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      if (language === 'en') {
        setTranslations({});
        setFaqCategoriesTranslated(faqCategoriesBase);
        return;
      }

      try {
        // Collect all texts that need translation
        const allTexts: string[] = [];

        // Header and UI texts
        const uiTexts = [
          'Frequently Asked Questions',
          'Find answers to common questions about Iqonga. Can\'t find what you\'re looking for?',
          'Contact our support team',
          'Search FAQ...',
          'No results found',
          'Try searching with different keywords or browse our categories above.',
          'Clear search',
          'Still have questions?',
          'Our support team is here to help you get the most out of Iqonga.',
          'Contact Support',
          'Join Community'
        ];
        uiTexts.forEach(text => {
          if (!allTexts.includes(text)) allTexts.push(text);
        });

        // FAQ category titles and all Q&As
        faqCategoriesBase.forEach(category => {
          if (!allTexts.includes(category.title)) allTexts.push(category.title);
          category.items.forEach(item => {
            if (!allTexts.includes(item.question)) allTexts.push(item.question);
            if (!allTexts.includes(item.answer)) allTexts.push(item.answer);
          });
        });

        // Batch translate ALL texts at once
        const { translationService } = await import('../services/translationService');
        const translatedTexts = await translationService.translateBatch(allTexts, language, 'FAQ page content');

        // Build translation map
        const trans: Record<string, string> = {};
        allTexts.forEach((text, i) => {
          trans[text] = translatedTexts[i];
        });
        setTranslations(trans);

        // Reconstruct FAQ categories with translations
        const categoriesTrans = faqCategoriesBase.map(category => ({
          ...category,
          title: trans[category.title] || category.title,
          items: category.items.map(item => ({
            ...item,
            question: trans[item.question] || item.question,
            answer: trans[item.answer] || item.answer
          }))
        }));

        setFaqCategoriesTranslated(categoriesTrans);
      } catch (error) {
        console.error('Translation error:', error);
        setFaqCategoriesTranslated(faqCategoriesBase);
      }
    };

    loadTranslations();
  }, [language, t]);

  const faqCategories = faqCategoriesTranslated.length > 0 ? faqCategoriesTranslated : faqCategoriesBase;

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    items: category.items.filter((item: any) =>
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 50%, #020617 100%)'
    }}>
      <SEO
        title="FAQ"
        description="Frequently asked questions about Iqonga: AI agents, blockchain, pricing, integrations, and getting started."
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <QuestionMarkCircleIcon className="w-12 h-12 text-blue-400 mr-3" />
            <h1 className="text-4xl font-bold text-white">{translations['Frequently Asked Questions'] || 'Frequently Asked Questions'}</h1>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {translations['Find answers to common questions about Iqonga. Can\'t find what you\'re looking for?'] || 
             'Find answers to common questions about Iqonga. Can\'t find what you\'re looking for?'} 
            <a href="/contact" className="text-blue-400 hover:text-blue-300 ml-1">
              {translations['Contact our support team'] || 'Contact our support team'}
            </a>.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={translations['Search FAQ...'] || 'Search FAQ...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {filteredCategories.map((category) => (
            <div key={category.id} className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-white mb-6">{category.title}</h2>
              <div className="space-y-4">
                {category.items.map((item: any) => (
                  <div key={item.id} className="border border-gray-700 rounded-lg">
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700 transition-colors"
                    >
                      <h3 className="text-lg font-medium text-white pr-4">{item.question}</h3>
                      {expandedItems[item.id] ? (
                        <ChevronDownIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {expandedItems[item.id] && (
                      <div className="px-4 pb-4">
                        <div className="border-t border-gray-700 pt-4">
                          <p className="text-gray-300 leading-relaxed">{item.answer}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {searchTerm && filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <QuestionMarkCircleIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">{translations['No results found'] || 'No results found'}</h3>
            <p className="text-gray-500 mb-4">{translations['Try searching with different keywords or browse our categories above.'] || 'Try searching with different keywords or browse our categories above.'}</p>
            <button
              onClick={() => setSearchTerm('')}
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              {translations['Clear search'] || 'Clear search'}
            </button>
          </div>
        )}

        {/* Contact Support */}
        <div className="mt-12 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">{translations['Still have questions?'] || 'Still have questions?'}</h3>
            <p className="text-gray-300 mb-4">
              {translations['Our support team is here to help you get the most out of Iqonga.'] || 
               'Our support team is here to help you get the most out of Iqonga.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {translations['Contact Support'] || 'Contact Support'}
              </a>
              <a
                href="https://t.me/Zenthryx_ai"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {translations['Join Community'] || 'Join Community'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
