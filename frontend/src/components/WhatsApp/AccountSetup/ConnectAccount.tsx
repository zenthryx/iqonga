import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';
import { ConnectAccountForm } from '../../../types/whatsapp';
import toast from 'react-hot-toast';

const ConnectAccount: React.FC = () => {
  const navigate = useNavigate();
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState<ConnectAccountForm>({
    account_name: '',
    waba_id: '',
    phone_number_id: '',
    access_token: '',
  });

  const connectMutation = useMutation({
    mutationFn: (data: ConnectAccountForm) => whatsappApi.connectAccount(data),
    onSuccess: (response: any) => {
      toast.success('Account connected successfully!');
      navigate('/whatsapp/accounts');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to connect account');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.account_name || !formData.waba_id || !formData.phone_number_id || !formData.access_token) {
      toast.error('Please fill in all required fields');
      return;
    }

    connectMutation.mutate(formData);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formData.access_token);
    setCopied(true);
    toast.success('Token copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/whatsapp/accounts')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Accounts
      </button>

      <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
        <h1 className="text-3xl font-bold text-white mb-2">Connect WhatsApp Business Account</h1>
        <p className="text-gray-400 mb-8">
          Connect your WhatsApp Business Account to start sending messages and managing contacts.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white font-medium mb-2">
              Account Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              placeholder="My Business Account"
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
              required
            />
            <p className="text-gray-500 text-sm mt-1">A friendly name to identify this account</p>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">
              WABA ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.waba_id}
              onChange={(e) => setFormData({ ...formData, waba_id: e.target.value })}
              placeholder="123456789012345"
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
              required
            />
            <p className="text-gray-500 text-sm mt-1">Your WhatsApp Business Account ID from Meta Business Manager</p>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">
              Phone Number ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.phone_number_id}
              onChange={(e) => setFormData({ ...formData, phone_number_id: e.target.value })}
              placeholder="987654321098765"
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
              required
            />
            <p className="text-gray-500 text-sm mt-1">The Phone Number ID associated with your WABA</p>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">
              Access Token <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={formData.access_token}
                onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 pr-24 border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-2 hover:bg-gray-600 rounded transition-colors"
                  title="Copy token"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="p-2 hover:bg-gray-600 rounded transition-colors"
                  title={showToken ? 'Hide token' : 'Show token'}
                >
                  {showToken ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Your WhatsApp Business API access token. Keep this secure and never share it publicly.
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-blue-400 font-medium mb-2">Where to find these credentials:</h3>
            <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
              <li>Go to Meta Business Manager</li>
              <li>Navigate to WhatsApp → API Setup</li>
              <li>Copy your WABA ID and Phone Number ID</li>
              <li>Generate a temporary or permanent access token</li>
            </ul>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/whatsapp/accounts')}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={connectMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connectMutation.isPending ? 'Connecting...' : 'Connect Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConnectAccount;
