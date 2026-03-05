import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShoppingCart, 
  History, 
  Settings, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface CreditBalance {
  creditBalance: number;
  totalPurchased: number;
  totalUsed: number;
  debtBalance: number;
  autoRechargeEnabled: boolean;
  autoRechargeThreshold: number;
  autoRechargeAmount: number;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  priceSol: number;
  priceUsdc: number;
  sortOrder: number;
}

const CreditBalance: React.FC = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [autoRechargeSettings, setAutoRechargeSettings] = useState({
    enabled: false,
    threshold: 100,
    amount: 500
  });

  useEffect(() => {
    fetchCreditData();
  }, []);

  const fetchCreditData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/credits/balance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBalance(data.data);
        setAutoRechargeSettings({
          enabled: data.data.autoRechargeEnabled,
          threshold: data.data.autoRechargeThreshold,
          amount: data.data.autoRechargeAmount
        });
      }
    } catch (error) {
      console.error('Error fetching credit balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/credits/packages');
      if (response.ok) {
        const data = await response.json();
        // Deduplicate packages by ID to prevent duplicates
        const uniquePackages = (data.data || []).filter((pkg: CreditPackage, index: number, array: CreditPackage[]) => 
          array.findIndex(p => p.id === pkg.id) === index
        );
        setPackages(uniquePackages);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const purchaseCredits = async (_packageId: string, _paymentMethod?: string) => {
    // Payment methods (e.g. preferred blockchain) can be added in Settings later
    toast('Payment options can be configured in Settings when available.');
  };

  const updateAutoRecharge = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/credits/auto-recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(autoRechargeSettings)
      });

      if (response.ok) {
        await fetchCreditData();
        setShowSettingsModal(false);
        alert('Auto-recharge settings updated successfully!');
      } else {
        const error = await response.json();
        alert(`Update failed: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error('Error updating auto-recharge:', error);
      alert('Update failed. Please try again.');
    }
  };

  const openPurchaseModal = () => {
    setShowPurchaseModal(true);
    fetchPackages();
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading credits...</span>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <AlertCircle className="h-4 w-4" />
        <span>Failed to load credits</span>
      </div>
    );
  }

  return (
    <>
      {/* Credit Balance Display */}
      <div className="flex items-center space-x-4">
        {/* Balance */}
        <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-2 rounded-lg">
          <CreditCard className="h-4 w-4" />
          <span className="font-semibold">{balance.creditBalance.toLocaleString()} Credits</span>
        </div>

        {/* Debt Warning */}
        {balance.debtBalance > 0 && (
          <div className="flex items-center space-x-2 bg-red-500 text-white px-3 py-2 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="font-semibold">Debt: {balance.debtBalance.toLocaleString()}</span>
          </div>
        )}

        {/* Auto-recharge Status */}
        {balance.autoRechargeEnabled && (
          <div className="flex items-center space-x-2 bg-green-500 text-white px-3 py-2 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Auto-recharge ON</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => navigate('/credits')}
            className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Buy Credits</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center space-x-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
          >
            <History className="h-4 w-4" />
            <span>History</span>
          </button>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[10000] p-4 pt-20">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Purchase Credits</h2>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.map((pkg) => (
                <div key={pkg.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{pkg.name}</h3>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {pkg.totalCredits.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">credits</div>
                    </div>
                  </div>

                  {pkg.bonusCredits > 0 && (
                    <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm mb-2">
                      +{pkg.bonusCredits.toLocaleString()} bonus credits!
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <div className="text-lg font-semibold text-green-600">${pkg.priceUsdc} USDC</div>
                    </div>
                    <div className="text-sm text-gray-600">
                      ${(pkg.priceUsdc / pkg.totalCredits).toFixed(3)}/credit
                    </div>
                  </div>

                  <button
                    onClick={() => { if (purchasing !== pkg.id) purchaseCredits(pkg.id, 'USDC'); }}
                    disabled={purchasing === pkg.id}
                    className={`w-full py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-1 text-sm ${
                      purchasing === pkg.id ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {purchasing === pkg.id ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /><span>Processing...</span></>
                    ) : (
                      <><CreditCard className="h-3 w-3" /><span>Buy credits</span></>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-20">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Auto-Recharge Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="autoRechargeEnabled"
                  checked={autoRechargeSettings.enabled}
                  onChange={(e) => setAutoRechargeSettings({
                    ...autoRechargeSettings,
                    enabled: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoRechargeEnabled" className="text-sm font-medium text-gray-700">
                  Enable Auto-Recharge
                </label>
              </div>

              {autoRechargeSettings.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Recharge Threshold (credits)
                    </label>
                    <input
                      type="number"
                      value={autoRechargeSettings.threshold}
                      onChange={(e) => setAutoRechargeSettings({
                        ...autoRechargeSettings,
                        threshold: parseInt(e.target.value)
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Recharge Amount (credits)
                    </label>
                    <input
                      type="number"
                      value={autoRechargeSettings.amount}
                      onChange={(e) => setAutoRechargeSettings({
                        ...autoRechargeSettings,
                        amount: parseInt(e.target.value)
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                      min="1"
                    />
                  </div>
                </>
              )}

              <button
                onClick={updateAutoRecharge}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[10000] p-4 pt-20">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Credit History</h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <CreditHistory />
          </div>
        </div>
      )}
    </>
  );
};

// Credit History Component
const CreditHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/credits/transactions?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <ShoppingCart className="h-4 w-4 text-green-600" />;
      case 'deduct':
        return <TrendingUp className="h-4 w-4 text-red-600" />;
      case 'bonus':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'debt_repayment':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'bonus':
        return 'text-green-600';
      case 'deduct':
        return 'text-red-600';
      case 'debt_repayment':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No transactions yet
        </div>
      ) : (
        transactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              {getTransactionIcon(tx.transactionType)}
              <div>
                <div className="font-medium capitalize">
                  {tx.transactionType.replace('_', ' ')}
                </div>
                <div className="text-sm text-gray-600">
                  {tx.description}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(tx.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-semibold ${getTransactionColor(tx.transactionType)}`}>
                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                Balance: {tx.balanceAfter.toLocaleString()}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default CreditBalance;
