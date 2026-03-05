import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  CreditCardIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface Transaction {
  id: string;
  user_id: number;
  username: string;
  transaction_type: 'purchase' | 'deduct' | 'refund' | 'bonus' | 'debt_repayment';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference_id?: string;
  created_at: string;
}

const AdminCreditTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await apiService.get('/admin/credit-transactions');
      if (response.success) {
        setTransactions(response.data.transactions || []);
        setStats(response.data.stats || null);
      } else {
        toast.error('Failed to load transactions');
      }
    } catch (error: any) {
      console.error('Transactions error:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || transaction.transaction_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'text-green-400 bg-green-500/20';
      case 'deduct': return 'text-red-400 bg-red-500/20';
      case 'refund': return 'text-blue-400 bg-blue-500/20';
      case 'bonus': return 'text-yellow-400 bg-yellow-500/20';
      case 'debt_repayment': return 'text-purple-400 bg-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Credit Transactions</h1>
        <p className="text-gray-400 mt-1">Monitor all credit operations across the platform</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-sm font-medium text-gray-400">Total Transactions</p>
            <p className="text-2xl font-bold text-white">{stats.total_transactions || 0}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-sm font-medium text-gray-400">Total Purchased</p>
            <p className="text-2xl font-bold text-green-400">+{stats.total_purchased?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-sm font-medium text-gray-400">Total Deducted</p>
            <p className="text-2xl font-bold text-red-400">-{stats.total_deducted?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-sm font-medium text-gray-400">Net Credits</p>
            <p className="text-2xl font-bold text-white">
              {((stats.total_purchased || 0) - (stats.total_deducted || 0)).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by user or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="purchase">Purchases</option>
              <option value="deduct">Deductions</option>
              <option value="refund">Refunds</option>
              <option value="bonus">Bonuses</option>
              <option value="debt_repayment">Debt Repayments</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(transaction.transaction_type)}`}>
                      {transaction.transaction_type === 'purchase' && <ArrowUpIcon className="h-3 w-3 mr-1" />}
                      {transaction.transaction_type === 'deduct' && <ArrowDownIcon className="h-3 w-3 mr-1" />}
                      {transaction.transaction_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <div className="text-sm text-gray-300">{transaction.username || `User ${transaction.user_id}`}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${
                      transaction.transaction_type === 'purchase' || transaction.transaction_type === 'refund' || transaction.transaction_type === 'bonus'
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}>
                      {transaction.transaction_type === 'purchase' || transaction.transaction_type === 'refund' || transaction.transaction_type === 'bonus' ? '+' : '-'}
                      {Math.abs(transaction.amount).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">
                      {transaction.balance_before.toLocaleString()} → {transaction.balance_after.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300 max-w-md truncate">
                      {transaction.description || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400 font-mono">
                      {transaction.reference_id ? transaction.reference_id.slice(0, 8) + '...' : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">
                      {formatDate(transaction.created_at)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12">
          <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No transactions found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
};

export default AdminCreditTransactions;

