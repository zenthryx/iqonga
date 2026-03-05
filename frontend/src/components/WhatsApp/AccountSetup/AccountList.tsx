import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Settings, Trash2, Power, PowerOff, Eye } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';
import { WhatsAppAccount } from '../../../types/whatsapp';
import toast from 'react-hot-toast';

const AccountList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => whatsappApi.getAccounts(),
    refetchInterval: 30000,
  });

  const disconnectMutation = useMutation({
    mutationFn: (accountId: string) => whatsappApi.disconnectAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      toast.success('Account disconnected successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to disconnect account');
    },
  });

  const accounts = (data as any)?.data?.accounts || [];
  const filteredAccounts = accounts.filter((account: WhatsAppAccount) =>
    account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.phone_number.includes(searchTerm)
  );

  const handleDisconnect = (accountId: string, accountName: string) => {
    if (window.confirm(`Are you sure you want to disconnect "${accountName}"?`)) {
      disconnectMutation.mutate(accountId);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-400 py-12">Loading accounts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-400 py-12">
          Error loading accounts. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">WhatsApp Accounts</h1>
        <Link
          to="/whatsapp/accounts/connect"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Connect Account
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-700 text-white rounded-lg px-4 py-2 flex-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          <select className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Accounts List */}
      {filteredAccounts.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
          <div className="text-gray-400 mb-4">
            {searchTerm ? 'No accounts found matching your search' : 'No accounts connected'}
          </div>
          {!searchTerm && (
            <Link
              to="/whatsapp/accounts/connect"
              className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Connect your first account
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAccounts.map((account: WhatsAppAccount) => (
            <div
              key={account.id}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-white">{account.account_name}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        account.status === 'active'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : account.status === 'inactive'
                          ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}
                    >
                      {account.status === 'active' ? '●' : '○'} {account.status}
                    </span>
                  </div>
                  <div className="text-gray-400 text-sm space-y-1">
                    <div>Phone: {account.phone_number}</div>
                    <div>WABA ID: {account.waba_id}</div>
                    <div>
                      Last sync:{' '}
                      {account.last_sync_at
                        ? new Date(account.last_sync_at).toLocaleString()
                        : 'Never'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/whatsapp/accounts/${account.id}`}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    View
                  </Link>
                  <button
                    onClick={() => handleDisconnect(account.id, account.account_name)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    disabled={disconnectMutation.isPending}
                  >
                    {account.status === 'active' ? (
                      <>
                        <PowerOff className="w-4 h-4" />
                        Disconnect
                      </>
                    ) : (
                      <>
                        <Power className="w-4 h-4" />
                        Connect
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AccountList;
