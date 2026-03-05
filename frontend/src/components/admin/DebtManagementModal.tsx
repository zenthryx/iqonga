import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  MinusIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface User {
  id: number;
  username: string;
  email: string;
  credit_balance: number;
  debt_balance: number;
}

interface DebtManagementModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DebtManagementModal: React.FC<DebtManagementModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'debt' | 'credits'>('debt');
  
  // Debt management state
  const [debtAdjustmentType, setDebtAdjustmentType] = useState<'wipe' | 'reduce' | 'increase' | 'set'>('wipe');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtReason, setDebtReason] = useState('');
  
  // Credit management state
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [creditOperation, setCreditOperation] = useState<'add' | 'deduct'>('add');

  useEffect(() => {
    if (isOpen && user) {
      fetchUserDetails();
    }
  }, [isOpen, user]);

  const fetchUserDetails = async () => {
    try {
      const response = await apiService.get(`/admin/user/${user.id}/credits`);
      if (response.success) {
        setUserDetails(response.data);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const handleDebtAdjustment = async () => {
    if (!debtReason.trim()) {
      toast.error('Reason is required for debt adjustments');
      return;
    }

    if (debtAdjustmentType !== 'wipe' && (!debtAmount || isNaN(Number(debtAmount)) || Number(debtAmount) < 0)) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/admin/debt/adjust', {
        userId: user.id,
        adjustmentType: debtAdjustmentType,
        amount: debtAdjustmentType === 'wipe' ? 0 : Number(debtAmount),
        reason: debtReason
      });

      if (response.success) {
        toast.success('Debt adjusted successfully');
        onSuccess();
        onClose();
        resetDebtForm();
      } else {
        toast.error(response.error || 'Failed to adjust debt');
      }
    } catch (error: any) {
      console.error('Debt adjustment error:', error);
      toast.error(error.message || 'Failed to adjust debt');
    } finally {
      setLoading(false);
    }
  };

  const handleCreditAdjustment = async () => {
    if (!creditAmount || isNaN(Number(creditAmount)) || Number(creditAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!creditReason.trim()) {
      toast.error('Reason is required for credit adjustments');
      return;
    }

    setLoading(true);
    try {
      const endpoint = creditOperation === 'add' ? '/admin/credits/add' : '/admin/credits/deduct';
      const response = await apiService.post(endpoint, {
        userId: user.id,
        amount: Number(creditAmount),
        reason: creditReason
      });

      if (response.success) {
        toast.success(`Credits ${creditOperation === 'add' ? 'added' : 'deducted'} successfully`);
        onSuccess();
        onClose();
        resetCreditForm();
      } else {
        toast.error(response.error || `Failed to ${creditOperation} credits`);
      }
    } catch (error: any) {
      console.error('Credit adjustment error:', error);
      toast.error(error.message || `Failed to ${creditOperation} credits`);
    } finally {
      setLoading(false);
    }
  };

  const resetDebtForm = () => {
    setDebtAdjustmentType('wipe');
    setDebtAmount('');
    setDebtReason('');
  };

  const resetCreditForm = () => {
    setCreditAmount('');
    setCreditReason('');
    setCreditOperation('add');
  };

  const handleClose = () => {
    resetDebtForm();
    resetCreditForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-20">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Debt & Credit Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              Managing credits and debt for {user.username}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* User Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Current Credits</label>
              <div className="text-lg font-semibold text-green-600">
                {userDetails?.credits?.credit_balance?.toLocaleString() || user.credit_balance?.toLocaleString() || '0'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Current Debt</label>
              <div className="text-lg font-semibold text-red-600">
                {userDetails?.credits?.debt_balance?.toLocaleString() || user.debt_balance?.toLocaleString() || '0'}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('debt')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'debt'
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ExclamationTriangleIcon className="h-5 w-5 inline mr-2" />
            Debt Management
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'credits'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CreditCardIcon className="h-5 w-5 inline mr-2" />
            Credit Management
          </button>
        </div>

        {/* Debt Management Tab */}
        {activeTab === 'debt' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Debt Adjustment Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDebtAdjustmentType('wipe')}
                  className={`p-3 rounded-lg border text-sm font-medium ${
                    debtAdjustmentType === 'wipe'
                      ? 'bg-red-100 border-red-300 text-red-700'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <XMarkIcon className="h-5 w-5 mx-auto mb-1" />
                  Wipe All Debt
                </button>
                <button
                  onClick={() => setDebtAdjustmentType('reduce')}
                  className={`p-3 rounded-lg border text-sm font-medium ${
                    debtAdjustmentType === 'reduce'
                      ? 'bg-orange-100 border-orange-300 text-orange-700'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <MinusIcon className="h-5 w-5 mx-auto mb-1" />
                  Reduce Debt
                </button>
                <button
                  onClick={() => setDebtAdjustmentType('increase')}
                  className={`p-3 rounded-lg border text-sm font-medium ${
                    debtAdjustmentType === 'increase'
                      ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <PlusIcon className="h-5 w-5 mx-auto mb-1" />
                  Increase Debt
                </button>
                <button
                  onClick={() => setDebtAdjustmentType('set')}
                  className={`p-3 rounded-lg border text-sm font-medium ${
                    debtAdjustmentType === 'set'
                      ? 'bg-purple-100 border-purple-300 text-purple-700'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <CurrencyDollarIcon className="h-5 w-5 mx-auto mb-1" />
                  Set Debt Amount
                </button>
              </div>
            </div>

            {debtAdjustmentType !== 'wipe' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                  min="0"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Adjustment
              </label>
              <textarea
                value={debtReason}
                onChange={(e) => setDebtReason(e.target.value)}
                placeholder="Enter reason for debt adjustment..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDebtAdjustment}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Adjust Debt'}
              </button>
            </div>
          </div>
        )}

        {/* Credit Management Tab */}
        {activeTab === 'credits' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operation Type
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCreditOperation('add')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    creditOperation === 'add'
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <PlusIcon className="h-5 w-5 inline mr-2" />
                  Add Credits
                </button>
                <button
                  onClick={() => setCreditOperation('deduct')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    creditOperation === 'deduct'
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <MinusIcon className="h-5 w-5 inline mr-2" />
                  Deduct Credits
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Adjustment
              </label>
              <textarea
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="Enter reason for credit adjustment..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreditAdjustment}
                disabled={loading}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                  creditOperation === 'add'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading ? 'Processing...' : `${creditOperation === 'add' ? 'Add' : 'Deduct'} Credits`}
              </button>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        {userDetails?.recentTransactions && userDetails.recentTransactions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Transactions</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {userDetails.recentTransactions.slice(0, 5).map((transaction: any, index: number) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <div>
                    <span className="text-gray-600">{transaction.description}</span>
                  </div>
                  <div className={`font-medium ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebtManagementModal;
