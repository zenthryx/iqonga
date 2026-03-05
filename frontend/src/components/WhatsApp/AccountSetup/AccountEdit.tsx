import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';

const AccountEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);

  const { data: accountData } = useQuery({
    queryKey: ['whatsapp-account', id],
    queryFn: () => whatsappApi.getAccount(id!),
    enabled: !!id,
  });

  const account = (accountData as any)?.data?.account;

  const [formData, setFormData] = useState({
    accessToken: '',
    appSecret: '',
    webhookUrl: account?.webhook_url || '',
    status: account?.status || 'active',
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => whatsappApi.updateAccount(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account', id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      navigate(`/whatsapp/accounts/${id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updateData: any = {};

    if (formData.accessToken) {
      updateData.accessToken = formData.accessToken;
    }
    if (formData.appSecret) {
      updateData.appSecret = formData.appSecret;
    }
    if (formData.webhookUrl !== account?.webhook_url) {
      updateData.webhookUrl = formData.webhookUrl;
    }
    if (formData.status !== account?.status) {
      updateData.status = formData.status;
    }

    if (Object.keys(updateData).length === 0) {
      alert('No changes to save');
      return;
    }

    updateMutation.mutate(updateData);
  };

  if (!account) {
    return (
      <div className="p-6">
        <p className="text-gray-400">Account not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/whatsapp/accounts/${id}`)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold text-white">Edit Account</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Info (Read-only) */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Phone Number</p>
              <p className="text-white">{account.phone_number}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">WABA ID</p>
              <p className="text-white font-mono text-sm">{account.waba_id}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Phone Number ID</p>
              <p className="text-white font-mono text-sm">{account.phone_number_id}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Current Status</p>
              <p className="text-white capitalize">{account.status}</p>
            </div>
          </div>
        </div>

        {/* Access Token */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Access Token</h2>
          <div className="relative">
            <input
              type={showAccessToken ? 'text' : 'password'}
              value={formData.accessToken}
              onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
              placeholder="Enter new access token (leave blank to keep current)"
              className="w-full bg-gray-700 text-white px-4 py-2 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowAccessToken(!showAccessToken)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showAccessToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Only enter a new token if you need to update it. Leave blank to keep the current token.
          </p>
        </div>

        {/* App Secret */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">App Secret</h2>
          <div className="relative">
            <input
              type={showAppSecret ? 'text' : 'password'}
              value={formData.appSecret}
              onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
              placeholder="Enter new app secret (leave blank to keep current)"
              className="w-full bg-gray-700 text-white px-4 py-2 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowAppSecret(!showAppSecret)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showAppSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Only enter a new secret if you need to update it. Leave blank to keep the current secret.
          </p>
        </div>

        {/* Webhook URL */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Webhook URL</h2>
          <input
            type="url"
            value={formData.webhookUrl}
            onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
            placeholder="https://your-domain.com/api/whatsapp/webhook"
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-gray-400 text-sm mt-2">
            The webhook URL where WhatsApp will send events. Must be publicly accessible.
          </p>
        </div>

        {/* Status */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Account Status</h2>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="suspended">Suspended</option>
          </select>
          <p className="text-gray-400 text-sm mt-2">
            Set account status. Inactive accounts cannot send messages.
          </p>
        </div>

        {/* Warning */}
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-semibold mb-1">Important</p>
              <p className="text-gray-300 text-sm">
                Changing the access token or app secret will affect all operations for this account.
                Make sure you have the correct credentials before updating.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(`/whatsapp/accounts/${id}`)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {updateMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AccountEdit;
