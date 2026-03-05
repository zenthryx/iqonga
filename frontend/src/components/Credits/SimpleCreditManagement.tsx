import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface CreditPackage {
  id: number;
  name: string;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  priceSol: number;
  priceUsdc: number;
  paymentMethod?: string;
}

interface CreditBalance {
  creditBalance: number;
  totalPurchased: number;
  totalUsed: number;
  debtBalance: number;
  autoRechargeEnabled: boolean;
}

const PAYMENT_UNAVAILABLE_MSG = 'Credit purchases are not available in Iqonga v1. You can add a billing add-on in the Marketplace when available.';

const SimpleCreditManagement: React.FC = () => {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCreditData();
  }, []);

  const fetchCreditData = async () => {
    try {
      setLoading(true);
      setError(null);

      const balanceResponse = await fetch('/api/credits/balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalance(balanceData.data);
      }

      const packagesResponse = await fetch('/api/credits/packages');
      if (packagesResponse.ok) {
        const packagesData = await packagesResponse.json();
        const allPackages = packagesData.data || [];
        const uniquePackages = allPackages.filter((pkg: CreditPackage, index: number, array: CreditPackage[]) =>
          array.findIndex(p => p.id === pkg.id && p.name === pkg.name) === index
        );
        setPackages(uniquePackages);
      }
    } catch (err) {
      setError('Failed to load credit data');
      console.error('Error fetching credit data:', err);
    } finally {
      setLoading(false);
    }
  };

  const onPurchaseClick = () => {
    toast(PAYMENT_UNAVAILABLE_MSG);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading credit data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load credit data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchCreditData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Credit Management</h1>
          <p className="text-gray-600">View your credits. Purchases can be enabled via add-ons in the Marketplace.</p>
        </div>

        {balance && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Balance</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{balance.creditBalance}</div>
                <div className="text-sm text-gray-500">Available Credits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{balance.totalPurchased}</div>
                <div className="text-sm text-gray-500">Total Purchased</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{balance.totalUsed}</div>
                <div className="text-sm text-gray-500">Total Used</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{balance.debtBalance}</div>
                <div className="text-sm text-gray-500">Debt Balance</div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Credit Packages</h2>
          {packages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <div key={pkg.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{pkg.name}</h3>
                    <div className="text-3xl font-bold text-blue-600 mb-1">{pkg.totalCredits}</div>
                    <div className="text-sm text-gray-500 mb-4">credits</div>
                    {pkg.bonusCredits > 0 && (
                      <div className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full mb-4">
                        +{pkg.bonusCredits} bonus credits
                      </div>
                    )}
                    <div className="text-lg font-semibold text-gray-700 mb-4">
                      ${pkg.priceUsdc} USDC
                    </div>
                    <button
                      onClick={onPurchaseClick}
                      className="w-full py-2 px-3 rounded-md bg-gray-200 text-gray-600 cursor-not-allowed text-sm"
                      disabled
                      title={PAYMENT_UNAVAILABLE_MSG}
                    >
                      Purchase not available in v1
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No credit packages configured.</p>
            </div>
          )}
          <p className="text-sm text-gray-500 mt-6">
            {PAYMENT_UNAVAILABLE_MSG}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimpleCreditManagement;
