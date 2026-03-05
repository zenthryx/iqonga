import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, RefreshCw, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';

const WebhookSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('');

  const { data: accountsData } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => whatsappApi.getAccounts(),
  });

  const accounts = (accountsData as any)?.data?.accounts || [];

  const updateMutation = useMutation({
    mutationFn: ({ accountId, webhookUrl }: { accountId: string; webhookUrl: string }) =>
      whatsappApi.updateAccount(accountId, { webhookUrl } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      alert('Webhook URL updated successfully');
    },
  });

  const handleUpdateWebhook = (accountId: string) => {
    if (!webhookUrl) {
      alert('Please enter a webhook URL');
      return;
    }
    updateMutation.mutate({ accountId, webhookUrl });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const webhookEndpoint = `${window.location.origin}/api/whatsapp/webhook`;
  const defaultVerifyToken = process.env.REACT_APP_WHATSAPP_VERIFY_TOKEN || 'your_verify_token_here';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Webhook Settings</h1>
        <p className="text-gray-400 text-sm mt-2">
          Configure webhooks to receive real-time updates from WhatsApp Business API
        </p>
      </div>

      {/* Webhook Information */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Webhook Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Webhook Endpoint URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookEndpoint}
                readOnly
                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg font-mono text-sm"
              />
              <button
                onClick={() => copyToClipboard(webhookEndpoint)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Use this URL when configuring your webhook in Meta Business Suite
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Verify Token
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={verifyToken || defaultVerifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                placeholder="Enter verify token"
                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg font-mono text-sm"
              />
              <button
                onClick={() => copyToClipboard(verifyToken || defaultVerifyToken)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              This token must match the one configured in your Meta Business Suite webhook settings
            </p>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
          <ExternalLink className="w-5 h-5" />
          Setup Instructions
        </h3>
        <ol className="space-y-3 text-gray-300 text-sm list-decimal list-inside">
          <li>Go to Meta Business Suite → WhatsApp → Configuration → Webhooks</li>
          <li>Click "Edit" or "Add Webhook"</li>
          <li>Enter the Webhook Endpoint URL shown above</li>
          <li>Enter the Verify Token (must match the token above)</li>
          <li>Select the webhook fields you want to subscribe to:
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
              <li>messages - Incoming messages</li>
              <li>message_status - Message delivery status</li>
              <li>messaging_handovers - Handover events</li>
            </ul>
          </li>
          <li>Click "Verify and Save"</li>
        </ol>
      </div>

      {/* Account Webhook Status */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Account Webhook Status</h2>
        {accounts.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No WhatsApp accounts connected</p>
        ) : (
          <div className="space-y-4">
            {accounts.map((account: any) => (
              <div key={account.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-white font-medium">{account.account_name || 'Unnamed Account'}</p>
                    <p className="text-gray-400 text-sm">{account.phone_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {account.webhook_verified ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 text-sm">Verified</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                        <span className="text-yellow-400 text-sm">Not Verified</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Webhook URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={account.webhook_url || webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder={webhookEndpoint}
                        className="flex-1 bg-gray-600 text-white px-3 py-2 rounded text-sm font-mono"
                      />
                      <button
                        onClick={() => handleUpdateWebhook(account.id)}
                        disabled={updateMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {updateMutation.isPending ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Update
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {account.webhook_url && (
                    <p className="text-gray-400 text-xs">
                      Current: {account.webhook_url}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhook Events */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Webhook Events</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div>
              <p className="text-white font-medium">Messages</p>
              <p className="text-gray-400 text-sm">Incoming messages from contacts</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div>
              <p className="text-white font-medium">Message Status</p>
              <p className="text-gray-400 text-sm">Delivery and read receipts</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div>
              <p className="text-white font-medium">Campaign Updates</p>
              <p className="text-gray-400 text-sm">Campaign sending status updates</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebhookSettings;
