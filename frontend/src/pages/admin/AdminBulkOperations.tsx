import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  ArrowPathIcon,
  UserGroupIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const AdminBulkOperations: React.FC = () => {
  const [operation, setOperation] = useState('credits');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleBulkOperation = async () => {
    if (!amount || !reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/admin/bulk-operations', {
        operation,
        user_ids: selectedUsers,
        amount: parseInt(amount),
        reason
      });

      if (response.success) {
        setResult(response.data);
        toast.success(`Bulk operation completed: ${response.data.successful} successful, ${response.data.failed} failed`);
        // Reset form
        setAmount('');
        setReason('');
        setSelectedUsers([]);
      } else {
        toast.error(response.error || 'Bulk operation failed');
      }
    } catch (error: any) {
      console.error('Bulk operation error:', error);
      toast.error(error.message || 'Bulk operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Bulk Operations</h1>
        <p className="text-gray-400 mt-1">Perform bulk actions on multiple users</p>
      </div>

      {/* Operation Selection */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Select Operation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setOperation('credits')}
            className={`p-4 rounded-lg border-2 transition-colors ${
              operation === 'credits'
                ? 'border-blue-500 bg-blue-500/20'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
          >
            <CreditCardIcon className="h-8 w-8 mx-auto mb-2 text-blue-400" />
            <div className="text-sm font-medium text-white">Add Credits</div>
          </button>
          
          <button
            onClick={() => setOperation('suspend')}
            className={`p-4 rounded-lg border-2 transition-colors ${
              operation === 'suspend'
                ? 'border-red-500 bg-red-500/20'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
          >
            <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2 text-red-400" />
            <div className="text-sm font-medium text-white">Suspend Users</div>
          </button>
          
          <button
            onClick={() => setOperation('activate')}
            className={`p-4 rounded-lg border-2 transition-colors ${
              operation === 'activate'
                ? 'border-green-500 bg-green-500/20'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
          >
            <CheckCircleIcon className="h-8 w-8 mx-auto mb-2 text-green-400" />
            <div className="text-sm font-medium text-white">Activate Users</div>
          </button>
        </div>
      </div>

      {/* User Selection */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Select Users</h3>
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2">
            Enter user IDs (comma-separated) or use the user management page to select users
          </p>
          <textarea
            value={selectedUsers.join(', ')}
            onChange={(e) => setSelectedUsers(e.target.value.split(',').map(id => id.trim()).filter(Boolean))}
            placeholder="Enter user IDs separated by commas (e.g., 1, 2, 3)"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>
        <div className="text-sm text-gray-400">
          Selected: {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Operation Details */}
      {(operation === 'credits') && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Credit Adjustment</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter credit amount"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason (Required)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for bulk credit adjustment..."
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {(operation === 'suspend' || operation === 'activate') && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {operation === 'suspend' ? 'Suspend Users' : 'Activate Users'}
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason (Required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Enter reason for ${operation === 'suspend' ? 'suspending' : 'activating'} users...`}
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Execute Button */}
      <div className="flex justify-end">
        <button
          onClick={handleBulkOperation}
          disabled={loading || selectedUsers.length === 0 || !reason}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
            operation === 'suspend'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : operation === 'activate'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <>
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <UserGroupIcon className="h-5 w-5" />
              Execute Bulk Operation
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Operation Results</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-400">Total</p>
              <p className="text-2xl font-bold text-white">{result.total || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Successful</p>
              <p className="text-2xl font-bold text-green-400">{result.successful || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Failed</p>
              <p className="text-2xl font-bold text-red-400">{result.failed || 0}</p>
            </div>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-red-400 mb-2">Errors:</p>
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                {result.errors.slice(0, 5).map((error: string, index: number) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminBulkOperations;

