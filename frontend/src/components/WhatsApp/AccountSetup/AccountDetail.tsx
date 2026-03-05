import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Edit, MessageSquare, Users, Send, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';

const AccountDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: accountData, isLoading } = useQuery({
    queryKey: ['whatsapp-account', id],
    queryFn: () => whatsappApi.getAccount(id!),
    enabled: !!id,
  });

  const account = (accountData as any)?.data?.account;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading account details...</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-6">
        <p className="text-gray-400">Account not found</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600/20 text-green-400';
      case 'inactive':
        return 'bg-gray-600/20 text-gray-400';
      case 'pending_verification':
        return 'bg-yellow-600/20 text-yellow-400';
      case 'suspended':
        return 'bg-red-600/20 text-red-400';
      default:
        return 'bg-gray-600/20 text-gray-400';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/whatsapp/accounts')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">{account.account_name || 'WhatsApp Account'}</h1>
            <p className="text-gray-400 text-sm mt-1">{account.phone_number}</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/whatsapp/accounts/${id}/edit`)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Edit className="w-4 h-4" />
          Edit Account
        </button>
      </div>

      {/* Status Card */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Account Status</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(account.status)}`}>
            {account.status?.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 text-sm mb-1">Phone Number</p>
            <p className="text-white font-medium">{account.phone_number}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">WABA ID</p>
            <p className="text-white font-medium font-mono text-sm">{account.waba_id}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Phone Number ID</p>
            <p className="text-white font-medium font-mono text-sm">{account.phone_number_id}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Webhook Status</p>
            <div className="flex items-center gap-2">
              {account.webhook_verified ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm">Verified</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm">Not Verified</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Total Messages</p>
            <MessageSquare className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white">-</p>
          <p className="text-sm text-gray-400 mt-1">All time</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Contacts</p>
            <Users className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white">-</p>
          <p className="text-sm text-gray-400 mt-1">Total contacts</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Sent Today</p>
            <Send className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white">-</p>
          <p className="text-sm text-gray-400 mt-1">Last 24 hours</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Delivery Rate</p>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white">-</p>
          <p className="text-sm text-gray-400 mt-1">Average</p>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 text-sm mb-1">Created At</p>
            <p className="text-white">
              {account.created_at ? new Date(account.created_at).toLocaleString() : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Last Updated</p>
            <p className="text-white">
              {account.updated_at ? new Date(account.updated_at).toLocaleString() : 'N/A'}
            </p>
          </div>
          {account.last_sync_at && (
            <div>
              <p className="text-gray-400 text-sm mb-1">Last Sync</p>
              <p className="text-white">{new Date(account.last_sync_at).toLocaleString()}</p>
            </div>
          )}
          {account.webhook_url && (
            <div>
              <p className="text-gray-400 text-sm mb-1">Webhook URL</p>
              <p className="text-white font-mono text-sm break-all">{account.webhook_url}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate(`/whatsapp/contacts?wabaId=${id}`)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            View Contacts
          </button>
          <button
            onClick={() => navigate(`/whatsapp/messages?wabaId=${id}`)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            View Messages
          </button>
          <button
            onClick={() => navigate(`/whatsapp/campaigns?wabaId=${id}`)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            View Campaigns
          </button>
          <button
            onClick={() => navigate(`/whatsapp/bots?wabaId=${id}`)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            View Bots
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountDetail;
