import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface PricingInfo {
  cost: number;
  billing_unit: 'flat' | 'second' | 'minute';
  rate?: number;
  displayText: string;
}

interface ServicePricing {
  service_key: string;
  service_name: string;
  category: string;
  credit_cost: number;
  billing_unit?: 'flat' | 'second' | 'minute';
  rate?: number;
  description?: string;
}

/**
 * Hook to fetch and use dynamic service pricing
 */
export const useServicePricing = () => {
  const [pricing, setPricing] = useState<Record<string, ServicePricing>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use public pricing endpoint (requires auth but not admin)
      const response = await apiService.get('/content/pricing');
      
      if (response.success && response.data?.pricing) {
        const pricingMap: Record<string, ServicePricing> = {};
        response.data.pricing.forEach((service: ServicePricing) => {
          pricingMap[service.service_key] = service;
        });
        setPricing(pricingMap);
      } else {
        setError('Failed to load pricing');
      }
    } catch (err: any) {
      console.error('Error fetching pricing:', err);
      setError(err.message || 'Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get pricing info for a specific service
   */
  const getPricing = (serviceKey: string): PricingInfo | null => {
    const service = pricing[serviceKey];
    if (!service) return null;

    const billingUnit = service.billing_unit || 'flat';
    const cost = service.credit_cost || 0;
    const rate = service.rate || cost;

    let displayText = '';
    if (billingUnit === 'flat') {
      displayText = `${cost} credits`;
    } else if (billingUnit === 'second') {
      displayText = `${rate} credits/second`;
    } else if (billingUnit === 'minute') {
      displayText = `${rate} credits/minute`;
    }

    return {
      cost,
      billing_unit: billingUnit,
      rate,
      displayText
    };
  };

  /**
   * Get display text for a service (e.g., "300 credits" or "20 credits/second")
   */
  const getDisplayText = (serviceKey: string, fallback: string = 'credits'): string => {
    const pricingInfo = getPricing(serviceKey);
    if (!pricingInfo) return fallback;
    return pricingInfo.displayText;
  };

  /**
   * Calculate cost for duration-based services
   */
  const calculateCost = (serviceKey: string, durationInSeconds: number = 0): number => {
    const pricingInfo = getPricing(serviceKey);
    if (!pricingInfo) return 0;

    if (pricingInfo.billing_unit === 'flat') {
      return Math.ceil(pricingInfo.cost);
    } else if (pricingInfo.billing_unit === 'second') {
      return Math.ceil((pricingInfo.rate || 0) * durationInSeconds);
    } else if (pricingInfo.billing_unit === 'minute') {
      return Math.ceil((pricingInfo.rate || 0) * Math.ceil(durationInSeconds / 60));
    }
    return Math.ceil(pricingInfo.cost);
  };

  return {
    pricing,
    loading,
    error,
    getPricing,
    getDisplayText,
    calculateCost,
    refresh: fetchPricing
  };
};

