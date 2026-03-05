import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon, StarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import SEO from '@/components/SEO';
import { useAuthStore } from '@/store/authStore';
import { useServicePricing } from '@/hooks/useServicePricing';
import { apiService } from '@/services/api';
import { useLanguage } from '../contexts/LanguageContext';

interface ServicePricing {
  service_key: string;
  service_name: string;
  category: string;
  credit_cost: number;
  billing_unit?: 'flat' | 'second' | 'minute';
  rate?: number;
  description?: string;
}

const Pricing: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { getPricing } = useServicePricing();
  const { t, language } = useLanguage();
  const [pricing, setPricing] = useState<ServicePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  
  useEffect(() => {
    fetchPricing();
  }, []);

  useEffect(() => {
    const loadTranslations = async () => {
      if (language === 'en') {
        setTranslations({});
        return;
      }

      try {
        const texts = [
          'Transparent USDC Pricing',
          'Pay-per-use pricing with stable USDC. No hidden fees, no monthly subscriptions.',
          'Pay only for what you use',
          'credits',
          'credits/second',
          'credits/minute',
          'USD',
          'Base cost:',
          'Billed per',
          'second',
          'minute',
          'No pricing available',
          'Pricing information is only available to authenticated users.',
          'Token Holder Rewards',
          'Monthly credit rewards for $ZTR token holders',
          'Tier 1: 1M ZTR',
          '1,000 credits/month',
          'Tier 2: 5M ZTR',
          '3,000 credits/month',
          'Tier 3: 10M ZTR',
          '8,000 credits/month'
        ];

        const translated = await Promise.all(texts.map(text => t(text, 'Pricing page')));
        const trans: Record<string, string> = {};
        texts.forEach((text, i) => {
          trans[text] = translated[i];
        });
        setTranslations(trans);
      } catch (error) {
        console.error('Translation error:', error);
      }
    };

    loadTranslations();
  }, [language, t]);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      // Try to fetch pricing (works for authenticated users)
      try {
        const response = await apiService.get('/content/pricing');
        if (response.success && response.data?.pricing) {
          setPricing(response.data.pricing);
        }
      } catch (err) {
        // If not authenticated, that's okay - we'll show static info
        console.log('Pricing not available for unauthenticated users');
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group pricing by category
  const groupedPricing = pricing.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, ServicePricing[]>);

  // Format price display
  const formatPrice = (service: ServicePricing) => {
    const cost = service.credit_cost || 0;
    const rate = service.rate || cost;
    const billingUnit = service.billing_unit || 'flat';
    const creditsText = translations['credits'] || 'credits';
    
    if (billingUnit === 'flat') {
      return `${cost} ${creditsText}`;
    } else if (billingUnit === 'second') {
      const perSecond = translations['credits/second'] || 'credits/second';
      return `${rate} ${perSecond}`;
    } else if (billingUnit === 'minute') {
      const perMinute = translations['credits/minute'] || 'credits/minute';
      return `${rate} ${perMinute}`;
    }
    return `${cost} ${creditsText}`;
  };

  // Convert credits to USD (1 credit = $0.01)
  const creditsToUSD = (credits: number) => {
    return (credits * 0.01).toFixed(2);
  };


  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 50%, #020617 100%)'
    }}>
      <SEO
        title="Pricing"
        description="Transparent pay-per-use pricing with USDC. No hidden fees. Pay only for AI content generation, agents, and platform features."
      />
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            {translations['Transparent USDC Pricing'] || 'Transparent USDC Pricing'}
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            {translations['Pay-per-use pricing with stable USDC. No hidden fees, no monthly subscriptions.'] || 
             'Pay-per-use pricing with stable USDC. No hidden fees, no monthly subscriptions.'}
          </p>
          <div className="inline-flex items-center bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2">
            <StarIcon className="h-5 w-5 text-green-400 mr-2" />
            <span className="text-green-300 font-medium">
              {translations['Pay only for what you use'] || 'Pay only for what you use'}
            </span>
          </div>
        </div>

        {/* Dynamic Pricing by Category */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">
              {translations['Loading pricing information...'] || 'Loading pricing information...'}
            </p>
          </div>
        ) : Object.keys(groupedPricing).length > 0 ? (
          Object.entries(groupedPricing).map(([category, services]) => (
            <div key={category} className="mb-16">
              <h3 className="text-2xl font-bold text-white mb-6 capitalize">
                {category} {translations['Services'] || 'Services'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => {
                  const priceText = formatPrice(service);
                  const cost = service.credit_cost || 0;
                  const usdPrice = creditsToUSD(cost);
                  const isDurationBased = service.billing_unit && service.billing_unit !== 'flat';
                  
                  return (
                    <div
                      key={service.service_key}
                      className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:border-blue-500/50 transition-colors"
                    >
                      <div className="mb-4">
                        <h4 className="text-lg font-bold text-white mb-2">{service.service_name}</h4>
                        <p className="text-sm text-gray-400 mb-4">{service.description || 'No description'}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-bold text-white">{priceText}</span>
                          {!isDurationBased && (
                            <span className="text-sm text-gray-400">
                              ${usdPrice} {translations['USD'] || 'USD'}
                            </span>
                          )}
                        </div>
                        {isDurationBased && service.billing_unit && (
                          <div className="text-xs text-gray-500">
                            {translations['Base cost:'] || 'Base cost:'} {cost} {translations['credits'] || 'credits'} (${usdPrice} {translations['USD'] || 'USD'})
                          </div>
                        )}
                        {isDurationBased && service.billing_unit && (
                          <div className="text-xs text-blue-400 mt-1">
                            {translations['Billed per'] || 'Billed per'} {service.billing_unit ? (translations[service.billing_unit] || service.billing_unit) : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
            <p className="text-gray-400">
              Pricing information will be displayed here. Please check back soon or contact support for details.
            </p>
          </div>
        )}

        {/* Transaction Fee Notice */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="text-lg font-semibold text-blue-300 mb-2">Transaction Fee Notice</h4>
              <p className="text-gray-300 text-sm mb-2">
                A 0.5% transaction fee payable in $ZTR tokens will be implemented in the future for all credit purchases and service transactions.
              </p>
              <p className="text-green-300 text-sm font-medium">
                ✅ Currently waived - No transaction fees apply at this time.
              </p>
            </div>
          </div>
        </div>

        {/* Credit System Explanation */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/20 p-8 mb-16">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            Credit System Explained
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">How Credits Work</h4>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Buy credits in bulk for better value</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Credits never expire</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Use credits for all platform activities</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Track usage in real-time</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Credit Packages</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-300">100 Credits</span>
                  <span className="text-white font-medium">$1.00 USDC</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-300">1,000 Credits</span>
                  <span className="text-white font-medium">$10.00 USDC</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-300">10,000 Credits</span>
                  <span className="text-white font-medium">$100.00 USDC</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <span className="text-gray-300">100,000 Credits</span>
                  <span className="text-green-400 font-medium">$1,000.00 USDC</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/20 p-8">
            <h3 className="text-2xl font-bold text-white mb-4">
              Need Help Getting Started?
            </h3>
            <p className="text-gray-300 mb-6">
              Join our community for support, tutorials, and updates on platform development.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://t.me/Zenthryx_ai"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Join Telegram Community
              </a>
              <Link
                to="/how-to"
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-lg font-semibold transition-colors border border-white/30"
              >
                View Tutorials
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
