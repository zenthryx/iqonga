import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Twitter,
  MessageSquare,
  Globe,
  Instagram,
  Music,
  Sparkles,
  Video,
  Mail,
  Calendar,
  ShoppingBag,
  CheckCircle,
  ArrowRight,
  X,
  ExternalLink,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Integration {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  category: 'social' | 'productivity' | 'ecommerce' | 'content' | 'communication';
  color: string;
  href: string;
  status: 'available' | 'coming_soon' | 'beta';
  features: string[];
  setupSteps?: string[];
}

const integrations: Integration[] = [
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: <Twitter className="h-8 w-8" />,
    description: 'Automated posting and engagement on Twitter/X',
    category: 'social',
    color: 'from-sky-500 to-sky-600',
    href: '/company',
    status: 'available',
    features: ['Automated posting', 'Engagement tracking', 'Analytics', 'Scheduling'],
    setupSteps: [
      'Go to Company Settings',
      'Click "Connect Twitter"',
      'Authorize Ajentrix AI',
      'Start posting!'
    ]
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: <MessageSquare className="h-8 w-8" />,
    description: 'Deploy AI bots to your Discord servers',
    category: 'communication',
    color: 'from-indigo-500 to-indigo-600',
    href: '/discord',
    status: 'available',
    features: ['Server bots', 'Channel learning', 'Auto responses', 'Slash commands'],
    setupSteps: [
      'Go to Discord Integration',
      'Create a new bot',
      'Invite bot to your server',
      'Configure bot settings'
    ]
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    icon: <Globe className="h-8 w-8" />,
    description: 'AI chat widgets and voice chat for your website',
    category: 'communication',
    color: 'from-blue-500 to-blue-600',
    href: '/api-keys',
    status: 'available',
    features: ['Chat widgets', 'Voice interactions', 'Multi-language', 'Custom branding'],
    setupSteps: [
      'Get your API key',
      'Install WordPress plugin',
      'Configure widget settings',
      'Add to your site'
    ]
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: <Instagram className="h-8 w-8" />,
    description: 'Business account publishing and automation',
    category: 'social',
    color: 'from-pink-500 to-pink-600',
    href: '/instagram',
    status: 'available',
    features: ['Auto publishing', 'Content scheduling', 'Analytics', 'Engagement monitoring']
  },
  {
    id: 'music',
    name: 'Music Generation',
    icon: <Music className="h-8 w-8" />,
    description: 'AI-powered music and lyrics creation',
    category: 'content',
    color: 'from-purple-500 to-purple-600',
    href: '/music-generation',
    status: 'available',
    features: ['Text-to-music', 'Lyrics generation', 'Music videos', 'Multi-language']
  },
  {
    id: 'images',
    name: 'Image Generation',
    icon: <Sparkles className="h-8 w-8" />,
    description: 'Create stunning images with AI',
    category: 'content',
    color: 'from-green-500 to-green-600',
    href: '/image-generation',
    status: 'available',
    features: ['DALL-E 3', 'Custom prompts', 'Multiple styles', 'High resolution']
  },
  {
    id: 'videos',
    name: 'Video Generation',
    icon: <Video className="h-8 w-8" />,
    description: 'AI video creation and editing',
    category: 'content',
    color: 'from-red-500 to-red-600',
    href: '/video-generation',
    status: 'available',
    features: ['Text-to-video', 'Multiple providers', 'Custom styles', 'HD quality']
  },
  {
    id: 'email',
    name: 'Email AI',
    icon: <Mail className="h-8 w-8" />,
    description: 'Smart inbox and email management',
    category: 'productivity',
    color: 'from-cyan-500 to-cyan-600',
    href: '/products/smart-inbox',
    status: 'available',
    features: ['AI replies', 'Email categorization', 'Smart spam detection', 'Summarization']
  },
  {
    id: 'calendar',
    name: 'Calendar AI',
    icon: <Calendar className="h-8 w-8" />,
    description: 'AI calendar assistant and meeting prep',
    category: 'productivity',
    color: 'from-orange-500 to-orange-600',
    href: '/products/ai-calendar',
    status: 'available',
    features: ['Meeting prep', 'Smart scheduling', 'Health score', 'Automated reminders']
  },
  {
    id: 'shopify',
    name: 'Shopify',
    icon: <ShoppingBag className="h-8 w-8" />,
    description: 'E-commerce integration and automation',
    category: 'ecommerce',
    color: 'from-emerald-500 to-emerald-600',
    href: '/shopify',
    status: 'coming_soon',
    features: ['Product sync', 'Order management', 'Customer insights', 'AI recommendations']
  }
];

interface IntegrationOnboardingProps {
  onClose?: () => void;
  categoryFilter?: string;
}

const IntegrationOnboarding: React.FC<IntegrationOnboardingProps> = ({ 
  onClose, 
  categoryFilter 
}) => {
  const navigate = useNavigate();
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);

  const filteredIntegrations = categoryFilter
    ? integrations.filter(i => i.category === categoryFilter)
    : integrations;

  const categories = [
    { id: 'all', name: 'All Integrations', count: integrations.length },
    { id: 'social', name: 'Social Media', count: integrations.filter(i => i.category === 'social').length },
    { id: 'productivity', name: 'Productivity', count: integrations.filter(i => i.category === 'productivity').length },
    { id: 'content', name: 'Content Creation', count: integrations.filter(i => i.category === 'content').length },
    { id: 'communication', name: 'Communication', count: integrations.filter(i => i.category === 'communication').length },
    { id: 'ecommerce', name: 'E-commerce', count: integrations.filter(i => i.category === 'ecommerce').length }
  ];

  const handleIntegrationClick = (integration: Integration) => {
    if (integration.status === 'coming_soon') {
      toast('This integration is coming soon!', { icon: '🚀' });
      return;
    }
    setSelectedIntegration(integration);
    setCurrentStep(0);
  };

  const handleConnect = () => {
    if (!selectedIntegration) return;
    
    setIsConnecting(true);
    // Navigate to the integration page
    setTimeout(() => {
      navigate(selectedIntegration.href);
      if (onClose) onClose();
    }, 500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Available</span>;
      case 'beta':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">Beta</span>;
      case 'coming_soon':
        return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs">Coming Soon</span>;
      default:
        return null;
    }
  };

  if (selectedIntegration) {
    return (
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 bg-gradient-to-r ${selectedIntegration.color} rounded-lg flex items-center justify-center text-white`}>
                {selectedIntegration.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedIntegration.name}</h2>
                <p className="text-gray-400">{selectedIntegration.description}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedIntegration(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Features</h3>
              <div className="grid grid-cols-2 gap-2">
                {selectedIntegration.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-gray-300">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedIntegration.setupSteps && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Setup Steps</h3>
                <ol className="space-y-2">
                  {selectedIntegration.setupSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start space-x-3 text-gray-300">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="flex space-x-3 pt-4 border-t border-gray-700">
              <button
                onClick={handleConnect}
                disabled={isConnecting || selectedIntegration.status !== 'available'}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                  selectedIntegration.status === 'available'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isConnecting ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Connecting...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center space-x-2">
                    <span>Connect {selectedIntegration.name}</span>
                    <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </button>
              <button
                onClick={() => setSelectedIntegration(null)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Connect New Integration</h2>
            <p className="text-gray-400">Choose an integration to connect to your Ajentrix AI account</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => {
                  if (category.id === 'all') {
                    // Reset filter
                  }
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  (!categoryFilter && category.id === 'all') || categoryFilter === category.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>

          {/* Integration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map(integration => (
              <div
                key={integration.id}
                onClick={() => handleIntegrationClick(integration)}
                className={`glass-card p-6 hover:bg-white/10 transition-all duration-200 cursor-pointer group ${
                  integration.status === 'coming_soon' ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${integration.color} rounded-lg flex items-center justify-center text-white`}>
                    {integration.icon}
                  </div>
                  {getStatusBadge(integration.status)}
                </div>

                <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors mb-2">
                  {integration.name}
                </h3>
                <p className="text-sm text-gray-400 mb-4">{integration.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 capitalize">{integration.category}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationOnboarding;

